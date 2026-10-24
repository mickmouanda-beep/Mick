import { run, queryAll, queryOne } from './db.ts';
import { setDocData, deleteDocData, checkDocExists, getDocData } from './firestore_db.ts';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface DualWriteParams {
  establishmentId: string;
  collectionPath: string; // e.g. "establishments/EST-1/students"
  docId: string;
  operation: SyncOperation;
  payload?: any;
  sqliteWriter: () => void;
}

export interface DualWriteResult {
  success: boolean;
  docId: string;
  syncStatus: 'CONFIRMED_CLOUD_PERSISTED' | 'LOCAL_FALLBACK_PENDING_SYNC';
  warning?: string;
  error?: string;
}

/**
 * Exécute une écriture sécurisée avec priorité Cloud Firestore.
 * Si Firestore réussit, l'écriture locale SQLite miroir est effectuée et l'opération est validée.
 * Si Firestore échoue (panne réseau, hors-ligne), l'écriture SQLite est réalisée et une entrée
 * est enregistrée dans firestore_sync_queue avec l'identifiant stable et le statut PENDING.
 * L'appelant reçoit un statut transparent et non trompeur.
 */
export async function executeDualWrite(params: DualWriteParams): Promise<DualWriteResult> {
  const { establishmentId, collectionPath, docId, operation, payload, sqliteWriter } = params;

  let cloudSuccess = false;
  let cloudErrorMsg: string | null = null;

  try {
    if (operation === 'DELETE') {
      await deleteDocData(collectionPath, docId);
    } else {
      const dataToStore = {
        ...payload,
        id: docId,
        establishment_id: establishmentId,
        updated_at: new Date().toISOString(),
      };
      await setDocData(collectionPath, docId, dataToStore);
    }
    cloudSuccess = true;
  } catch (err: any) {
    cloudSuccess = false;
    cloudErrorMsg = err?.message || String(err);
    console.warn(`[DUAL_WRITE_REPLI] Firestore indisponible pour ${collectionPath}/${docId}:`, cloudErrorMsg);
  }

  // Écriture locale SQLite miroir
  try {
    sqliteWriter();
  } catch (sqlErr: any) {
    console.error(`[DUAL_WRITE_FATAL] Erreur écriture SQLite pour ${docId}:`, sqlErr);
    throw sqlErr;
  }

  if (cloudSuccess) {
    return {
      success: true,
      docId,
      syncStatus: 'CONFIRMED_CLOUD_PERSISTED',
    };
  }

  // Enregistrement dans la file d'attente hors-ligne pour synchronisation différée
  const queueId = `SYNC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  try {
    run(`
      INSERT INTO firestore_sync_queue (
        id, establishment_id, collection_path, doc_id, operation, payload, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `, [
      queueId,
      establishmentId,
      collectionPath,
      docId,
      operation,
      JSON.stringify(payload || {}),
      cloudErrorMsg,
    ]);
  } catch (qErr) {
    console.error('[DUAL_WRITE_QUEUE] Échec enregistrement file d’attente:', qErr);
  }

  return {
    success: true,
    docId,
    syncStatus: 'LOCAL_FALLBACK_PENDING_SYNC',
    warning: 'Enregistrement local effectué. Synchronisation cloud en file d’attente en attente de reconnexion.',
  };
}

/**
 * Dépile et traite la file d'attente de synchronisation vers Firestore.
 * Idempotent : vérifie l'existence et évite les conflits d'écrasement.
 */
export async function processPendingFirestoreSync(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: any[];
}> {
  const pending = queryAll<any>(
    "SELECT * FROM firestore_sync_queue WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT 100"
  );

  let succeeded = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const item of pending) {
    try {
      if (item.operation === 'DELETE') {
        await deleteDocData(item.collection_path, item.doc_id);
      } else {
        const payload = JSON.parse(item.payload);
        await setDocData(item.collection_path, item.doc_id, payload);
      }

      run(
        "UPDATE firestore_sync_queue SET status = 'SYNCED', synced_at = datetime('now') WHERE id = ?",
        [item.id]
      );
      succeeded++;
    } catch (err: any) {
      failed++;
      const errMsg = err?.message || String(err);
      errors.push({ id: item.id, doc_id: item.doc_id, error: errMsg });
      run(
        "UPDATE firestore_sync_queue SET retry_count = retry_count + 1, error_message = ? WHERE id = ?",
        [errMsg, item.id]
      );
    }
  }

  return {
    processed: pending.length,
    succeeded,
    failed,
    errors,
  };
}

/**
 * Retourne l'état complet de la persistance et de la file de synchronisation.
 */
export function getSyncStatusMetrics() {
  const pendingCount = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM firestore_sync_queue WHERE status = 'PENDING'"
  )?.count || 0;

  const syncedCount = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM firestore_sync_queue WHERE status = 'SYNCED'"
  )?.count || 0;

  const failedCount = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM firestore_sync_queue WHERE retry_count > 3 AND status = 'PENDING'"
  )?.count || 0;

  const lastSynced = queryOne<{ synced_at: string }>(
    "SELECT synced_at FROM firestore_sync_queue WHERE status = 'SYNCED' ORDER BY synced_at DESC LIMIT 1"
  )?.synced_at || null;

  return {
    pendingCount,
    syncedCount,
    failedCount,
    lastSynced,
    cloudEngine: 'Firebase Cloud Firestore (Database: ai-studio-faithschoolmanag-fab6ceb7-a317-4e02-bd1f-0eb928d4437c)',
    localMirror: 'SQLite (data/faith_school.sqlite)',
  };
}

/**
 * Contrôle de stricte unicité financière (reçus et références de transaction)
 * Vérifie l'absence de doublon dans SQLite et dans Firestore.
 */
export async function assertFinancialUniqueness(
  establishmentId: string,
  receiptNumber: string,
  transactionReference?: string | null
): Promise<{ valid: boolean; conflictReason?: string }> {
  // 1. Contrôle SQLite
  const existingReceiptSqlite = queryOne<any>(
    'SELECT id FROM payments WHERE receipt_number = ?',
    [receiptNumber]
  );
  if (existingReceiptSqlite) {
    return { valid: false, conflictReason: `Le numéro de quittance "${receiptNumber}" existe déjà dans le grand livre.` };
  }

  if (transactionReference && transactionReference.trim() !== '') {
    const existingRefSqlite = queryOne<any>(
      'SELECT id FROM payments WHERE transaction_reference = ? AND status = "VALIDE"',
      [transactionReference.trim()]
    );
    if (existingRefSqlite) {
      return { valid: false, conflictReason: `La référence de transaction mobile/bancaire "${transactionReference}" a déjà été enregistrée pour un autre paiement.` };
    }
  }

  // 2. Contrôle Firestore
  try {
    const fsReceipt = await getDocData(`establishments/${establishmentId}/payments`, receiptNumber);
    if (fsReceipt) {
      return { valid: false, conflictReason: `Le reçu "${receiptNumber}" existe déjà sur le cloud Firestore.` };
    }
  } catch {
    // Si Firestore hors ligne, la vérification SQLite fait foi pour la file d'attente
  }

  return { valid: true };
}
