import { queryAll, getDb } from './db.ts';
import { db } from './firestore_db.ts';

export interface TableMappingDef {
  tableName: string;
  destinationType: 'ROOT' | 'SUBCOLLECTION' | 'NONE';
  firestorePathPattern: string;
  hasRule: boolean;
  notes: string;
}

export const MIGRATION_TABLE_MAPPINGS: TableMappingDef[] = [
  // 1. Établissements (racine)
  {
    tableName: 'establishments',
    destinationType: 'ROOT',
    firestorePathPattern: '/establishments/{id}',
    hasRule: true,
    notes: 'Entité racine principale multi-établissements.',
  },
  // 2. Utilisateurs (racine globale & miroir établissement)
  {
    tableName: 'users',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/users/{id} & /users/{id}',
    hasRule: true,
    notes: 'Utilisateurs synchronisés sous leur établissement et au niveau racine pour authentification.',
  },
  // 3. Référentiels et collections racine globales
  {
    tableName: 'creation_authorizations',
    destinationType: 'ROOT',
    firestorePathPattern: '/creation_authorizations/{id}',
    hasRule: true,
    notes: 'Codes d’activation souverains (Espace Développeur).',
  },
  {
    tableName: 'commercial_formulas',
    destinationType: 'ROOT',
    firestorePathPattern: '/commercial_formulas/{id}',
    hasRule: true,
    notes: 'Catalogue des formules commerciales de la plateforme.',
  },
  {
    tableName: 'subscriptions',
    destinationType: 'ROOT',
    firestorePathPattern: '/subscriptions/{id}',
    hasRule: true,
    notes: 'Licences et abonnements par établissement.',
  },
  {
    tableName: 'license_renewals',
    destinationType: 'ROOT',
    firestorePathPattern: '/license_renewals/{id}',
    hasRule: true,
    notes: 'Historique des renouvellements de licences.',
  },
  {
    tableName: 'pedagogical_references',
    destinationType: 'ROOT',
    firestorePathPattern: '/pedagogical_references/{id}',
    hasRule: true,
    notes: 'Programmes et référentiels officiels du Congo-Brazzaville.',
  },

  // 4. Sous-collections d’établissement
  {
    tableName: 'classes',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/classes/{id}',
    hasRule: true,
    notes: 'Classes scolaires rattachées à l’établissement.',
  },
  {
    tableName: 'students',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/students/{id}',
    hasRule: true,
    notes: 'Élèves inscrits dans l’établissement.',
  },
  {
    tableName: 'subjects',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/subjects/{id}',
    hasRule: true,
    notes: 'Matières enseignées par classe ou cycle.',
  },
  {
    tableName: 'class_subjects',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/class_subjects/{id}',
    hasRule: true,
    notes: 'Affectation des matières et enseignants par classe (rattaché via classes.establishment_id).',
  },
  {
    tableName: 'payments',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/payments/{id}',
    hasRule: true,
    notes: 'Quittances financières et encaissements.',
  },
  {
    tableName: 'fee_structures',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/fee_structures/{id}',
    hasRule: true,
    notes: 'Grille tarifaire et échéanciers scolaires.',
  },
  {
    tableName: 'school_tariff_plans',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/school_tariff_plans/{id}',
    hasRule: true,
    notes: 'Plans tarifaires annuels fixés par le Promoteur.',
  },
  {
    tableName: 'evaluations',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/evaluations/{id}',
    hasRule: true,
    notes: 'Devoirs, compositions et évaluations programmées.',
  },
  {
    tableName: 'grades',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/grades/{id}',
    hasRule: true,
    notes: 'Notes individuelles des élèves (rattaché via evaluations.establishment_id).',
  },
  {
    tableName: 'student_attendances',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/student_attendances/{id}',
    hasRule: true,
    notes: 'Appels et registre des présences élèves.',
  },
  {
    tableName: 'teacher_attendances',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/teacher_attendances/{id}',
    hasRule: true,
    notes: 'Émargement et pointage horaire des enseignants.',
  },
  {
    tableName: 'disciplinary_incidents',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/disciplinary_incidents/{id}',
    hasRule: true,
    notes: 'Incidents disciplinaires et sanctions.',
  },
  {
    tableName: 'payroll_records',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/payroll_records/{id}',
    hasRule: true,
    notes: 'Bulletins de paie et salaires des enseignants et personnels.',
  },
  {
    tableName: 'lesson_logs',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/lesson_logs/{id}',
    hasRule: true,
    notes: 'Cahier de texte officiel (21 champs normalisés).',
  },
  {
    tableName: 'lesson_observations',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/lesson_observations/{id}',
    hasRule: true,
    notes: 'Visites et observations pédagogiques de la Direction des Études.',
  },
  {
    tableName: 'administrative_decisions',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/administrative_decisions/{id}',
    hasRule: true,
    notes: 'Décisions et demandes administratives soumises à la Direction.',
  },
  {
    tableName: 'complaints',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/complaints/{id}',
    hasRule: true,
    notes: 'Réclamations et signalements de la communauté scolaire.',
  },
  {
    tableName: 'school_announcements',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/school_announcements/{id}',
    hasRule: true,
    notes: 'Annonces officielles et circulaires de l’établissement.',
  },
  {
    tableName: 'parent_students',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/parent_students/{id}',
    hasRule: true,
    notes: 'Liaisons parents-élèves (rattaché via students.establishment_id).',
  },
  {
    tableName: 'absence_justifications',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/absence_justifications/{id}',
    hasRule: true,
    notes: 'Justificatifs d’absence transmis par les parents ou élèves.',
  },
  {
    tableName: 'staff_attendance_rules',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/staff_attendance_rules/{id}',
    hasRule: true,
    notes: 'Règles et barèmes horaires de pointage du personnel.',
  },
  {
    tableName: 'staff_salary_parameters',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/staff_salary_parameters/{id}',
    hasRule: true,
    notes: 'Paramètres de rémunération individuelle du personnel.',
  },
  {
    tableName: 'teacher_schedules',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/teacher_schedules/{id}',
    hasRule: true,
    notes: 'Créneaux des emplois du temps hebdomadaires.',
  },
  {
    tableName: 'teacher_course_logs',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/teacher_course_logs/{id}',
    hasRule: true,
    notes: 'Journal des cours et avancement pédagogique.',
  },
  {
    tableName: 'student_documents',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/student_documents/{id}',
    hasRule: true,
    notes: 'Pièces d’identité et certificats des élèves (rattaché via students.establishment_id).',
  },
  {
    tableName: 'expenses',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/expenses/{id}',
    hasRule: true,
    notes: 'Dépenses et décaissements opérationnels de l’établissement.',
  },
  {
    tableName: 'cash_injections',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/cash_injections/{id}',
    hasRule: true,
    notes: 'Apports en trésorerie et injections de fonds du Promoteur.',
  },
  {
    tableName: 'audit_logs',
    destinationType: 'SUBCOLLECTION',
    firestorePathPattern: '/establishments/{establishment_id}/audit_logs/{id}',
    hasRule: true,
    notes: 'Journal d’audit et de traçabilité des actions utilisateurs.',
  },

  // 5. TABLE TECHNIQUE LOCALE (Ignorée volontairement)
  {
    tableName: 'firestore_sync_queue',
    destinationType: 'NONE',
    firestorePathPattern: 'NON MIGRÉE (ignorée volontairement)',
    hasRule: false,
    notes: 'File d’attente technique de l’ancien système. Conservée dans SQLite uniquement (ignorée volontairement).',
  },
];

export interface DeductionBreakdown {
  direct: number;
  viaClass: number;
  viaTeacher: number;
  viaOther: number;
  missing: number;
}

export interface TableMigrationStat {
  tableName: string;
  destinationType: 'ROOT' | 'SUBCOLLECTION' | 'NONE';
  firestorePathPattern: string;
  sourceCount: number;
  alreadyExistingCount: number;
  toCreateCount: number;
  destinationCountAfter?: number;
  discrepancy?: number;
  errorCount: number;
  errors?: string[];
  deductionBreakdown?: DeductionBreakdown;
  status: 'PENDING' | 'SIMULATED' | 'MIGRATED' | 'NO_DESTINATION' | 'IGNORED' | 'MISSING_ESTABLISHMENT' | 'ERROR';
}

export interface MigrationReport {
  mode: 'SIMULATION' | 'EXECUTION';
  timestamp: string;
  totalTables: number;
  totalSourceRows: number;
  totalToCreate: number;
  totalAlreadyExisting: number;
  totalErrors: number;
  tablesWithoutDestination: string[];
  results: TableMigrationStat[];
  discrepancies: { tableName: string; source: number; destination: number; diff: number }[];
}

/**
 * Nettoie une ligne SQLite pour Firestore (parsage JSON si nécessaire, pas de mots de passe journalisés).
 */
function sanitizeRowForFirestore(row: any): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) {
      clean[k] = null;
    } else if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try {
        clean[k] = JSON.parse(v);
      } catch {
        clean[k] = v;
      }
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Exécute ou simule la migration de SQLite vers Cloud Firestore.
 * Idempotente, par lots de 400 écritures maximum, avec identifiants déterministes.
 */
export async function runSqliteToFirestoreMigration(
  dryRun: boolean,
  targetTableName?: string
): Promise<MigrationReport> {
  await getDb();
  console.log(`[Migration] Début ${dryRun ? 'SIMULATION' : 'EXÉCUTION'} SQLite -> Firestore... (Cible: ${targetTableName || 'TOUTES TABLES'})`);
  const reportResults: TableMigrationStat[] = [];
  const tablesWithoutDestination: string[] = [];

  let grandTotalSource = 0;
  let grandTotalToCreate = 0;
  let grandTotalExisting = 0;
  let grandTotalErrors = 0;

  // Pré-chargement des tables de liaison nécessaires pour les tables sans establishment_id direct
  const classEstMap = new Map<string, string>();
  try {
    const classRows = queryAll<{ id: string; establishment_id: string }>('SELECT id, establishment_id FROM classes');
    classRows.forEach((r) => classEstMap.set(r.id, r.establishment_id));
  } catch {}

  const userEstMap = new Map<string, string>();
  try {
    const userRows = queryAll<{ id: string; establishment_id: string }>('SELECT id, establishment_id FROM users');
    userRows.forEach((r) => userEstMap.set(r.id, r.establishment_id));
  } catch {}

  const evalEstMap = new Map<string, string>();
  try {
    const evalRows = queryAll<{ id: string; establishment_id: string }>('SELECT id, establishment_id FROM evaluations');
    evalRows.forEach((r) => evalEstMap.set(r.id, r.establishment_id));
  } catch {}

  const stuEstMap = new Map<string, string>();
  try {
    const stuRows = queryAll<{ id: string; establishment_id: string }>('SELECT id, establishment_id FROM students');
    stuRows.forEach((r) => stuEstMap.set(r.id, r.establishment_id));
  } catch {}

  // Établissement par défaut si aucun raccordement n'est trouvé
  const estRowsAll = queryAll<{ id: string }>('SELECT id FROM establishments');
  const defaultEstId = estRowsAll[0]?.id || 'EST-SHARED';

  const tablesToMigrate = targetTableName
    ? MIGRATION_TABLE_MAPPINGS.filter((m) => m.tableName === targetTableName)
    : MIGRATION_TABLE_MAPPINGS;

  for (const mapping of tablesToMigrate) {
    const tableName = mapping.tableName;

    // Table technique locale explicitement ignorée selon instruction utilisateur
    if (tableName === 'firestore_sync_queue') {
      let count = 0;
      try {
        count = queryAll<{ count: number }>(`SELECT COUNT(*) as count FROM "${tableName}"`)[0]?.count || 0;
      } catch {}
      reportResults.push({
        tableName,
        destinationType: 'NONE',
        firestorePathPattern: mapping.firestorePathPattern,
        sourceCount: count,
        alreadyExistingCount: 0,
        toCreateCount: 0,
        errorCount: 0,
        status: 'IGNORED',
      });
      continue;
    }

    // Si une autre table n'a aucune destination définie, la signaler sans l'ignorer
    if (mapping.destinationType === 'NONE') {
      let count = 0;
      try {
        count = queryAll<{ count: number }>(`SELECT COUNT(*) as count FROM "${tableName}"`)[0]?.count || 0;
      } catch {}
      tablesWithoutDestination.push(tableName);
      reportResults.push({
        tableName,
        destinationType: 'NONE',
        firestorePathPattern: mapping.firestorePathPattern,
        sourceCount: count,
        alreadyExistingCount: 0,
        toCreateCount: 0,
        errorCount: 0,
        status: 'NO_DESTINATION',
      });
      continue;
    }

    let rows: any[] = [];
    try {
      rows = queryAll<any>(`SELECT * FROM "${tableName}"`);
    } catch (err: any) {
      console.error(`[Migration] Erreur lecture table SQLite ${tableName}:`, err.message);
      reportResults.push({
        tableName,
        destinationType: mapping.destinationType,
        firestorePathPattern: mapping.firestorePathPattern,
        sourceCount: 0,
        alreadyExistingCount: 0,
        toCreateCount: 0,
        errorCount: 1,
        errors: [err.message],
        status: 'ERROR',
      });
      continue;
    }

    const sourceCount = rows.length;
    grandTotalSource += sourceCount;

    let existingCount = 0;
    let toCreateCount = 0;
    let errorCount = 0;
    let directCount = 0;
    let viaClassCount = 0;
    let viaTeacherCount = 0;
    let viaOtherCount = 0;
    let missingEstCount = 0;

    const errors: string[] = [];
    const pendingWrites: { docRef: any; data: any }[] = [];
    const targetEstIdsForTable = new Set<string>();

    for (const row of rows) {
      const docId = String(row.id || '');
      if (!docId) {
        errorCount++;
        errors.push(`Ligne sans id dans ${tableName}`);
        continue;
      }

      // Résolution du chemin Firestore
      let targetCollectionPath = '';
      if (mapping.destinationType === 'ROOT') {
        targetCollectionPath = tableName;
        directCount++;
      } else {
        let estId: string | undefined = undefined;

        // 1. Directement sur la ligne SQLite
        if (row.establishment_id) {
          estId = row.establishment_id;
          directCount++;
        }
        // 2. Via la classe (class_id)
        else if (row.class_id && classEstMap.has(row.class_id)) {
          estId = classEstMap.get(row.class_id);
          viaClassCount++;
        }
        // 3. Via l'enseignant / utilisateur (teacher_id / user_id / created_by / author_id)
        else if (row.teacher_id && userEstMap.has(row.teacher_id)) {
          estId = userEstMap.get(row.teacher_id);
          viaTeacherCount++;
        } else if (row.user_id && userEstMap.has(row.user_id)) {
          estId = userEstMap.get(row.user_id);
          viaTeacherCount++;
        } else if (row.created_by && userEstMap.has(row.created_by)) {
          estId = userEstMap.get(row.created_by);
          viaTeacherCount++;
        } else if (row.author_id && userEstMap.has(row.author_id)) {
          estId = userEstMap.get(row.author_id);
          viaTeacherCount++;
        }
        // 4. Via d'autres relations (evaluation_id, student_id)
        else if (row.evaluation_id && evalEstMap.has(row.evaluation_id)) {
          estId = evalEstMap.get(row.evaluation_id);
          viaOtherCount++;
        } else if (row.student_id && stuEstMap.has(row.student_id)) {
          estId = stuEstMap.get(row.student_id);
          viaOtherCount++;
        }

        // BANNISSEMENT TOTAL DES ÉTABLISSEMENTS FICTIFS :
        // Si aucun établissement ne peut être déduit, ne créer aucun établissement fictif, ne pas écrire le document, et signaler l'erreur.
        if (!estId) {
          missingEstCount++;
          errorCount++;
          errors.push(`Ligne id=${docId} : Établissement manquant (impossible de déduire l'établissement)`);
          continue;
        }

        targetEstIdsForTable.add(estId);
        targetCollectionPath = `establishments/${estId}/${tableName}`;
      }

      const docRef = db.collection(targetCollectionPath).doc(docId);

      try {
        const snap = await docRef.get();
        if (snap.exists) {
          existingCount++;
        } else {
          toCreateCount++;
          if (!dryRun) {
            const cleanData = sanitizeRowForFirestore(row);
            pendingWrites.push({ docRef, data: cleanData });

            // Pour la table users, miroir dans la collection racine /users/{id}
            if (tableName === 'users') {
              const rootUserRef = db.collection('users').doc(docId);
              pendingWrites.push({ docRef: rootUserRef, data: cleanData });
            }
          }
        }
      } catch (checkErr: any) {
        errorCount++;
        errors.push(`Erreur vérification doc ${docId}: ${checkErr.message}`);
      }
    }

    grandTotalExisting += existingCount;
    grandTotalToCreate += toCreateCount;
    grandTotalErrors += errorCount;

    // Si exécution réelle : écriture par lots de 400 maximum
    if (!dryRun && pendingWrites.length > 0) {
      const BATCH_SIZE = 400;
      for (let i = 0; i < pendingWrites.length; i += BATCH_SIZE) {
        const chunk = pendingWrites.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const item of chunk) {
          batch.set(item.docRef, item.data, { merge: false });
        }
        try {
          await batch.commit();
        } catch (batchErr: any) {
          errorCount += chunk.length;
          errors.push(`Échec lot écriture Firestore (${chunk.length} docs): ${batchErr.message}`);
        }
      }
    }

    // Si exécution réelle : relecture de Firestore pour vérification finale
    let destinationCountAfter: number | undefined = undefined;
    let discrepancy: number | undefined = undefined;

    if (!dryRun) {
      try {
        if (mapping.destinationType === 'ROOT') {
          const snap = await db.collection(tableName).get();
          destinationCountAfter = snap.size;
        } else {
          // Pour les sous-collections : comptage agrégé sur tous les établissements cibles
          const estIdsToQuery = new Set<string>(estRowsAll.map((e) => e.id));
          targetEstIdsForTable.forEach((id) => estIdsToQuery.add(id));

          let subTotal = 0;
          for (const estId of estIdsToQuery) {
            try {
              const sSnap = await db.collection(`establishments/${estId}/${tableName}`).get();
              subTotal += sSnap.size;
            } catch (snapErr: any) {
              errors.push(`Erreur relecture subcollection establishments/${estId}/${tableName}: ${snapErr.message}`);
            }
          }
          destinationCountAfter = subTotal;
        }
        discrepancy = sourceCount - (destinationCountAfter || 0);
      } catch (countErr: any) {
        errors.push(`Erreur relecture finale Firestore: ${countErr.message}`);
      }
    }

    const deductionBreakdown: DeductionBreakdown = {
      direct: directCount,
      viaClass: viaClassCount,
      viaTeacher: viaTeacherCount,
      viaOther: viaOtherCount,
      missing: missingEstCount,
    };

    let itemStatus: TableMigrationStat['status'] = dryRun ? 'SIMULATED' : 'MIGRATED';
    if (missingEstCount > 0) {
      itemStatus = 'MISSING_ESTABLISHMENT';
    } else if (errorCount > 0) {
      itemStatus = 'ERROR';
    }

    reportResults.push({
      tableName,
      destinationType: mapping.destinationType,
      firestorePathPattern: mapping.firestorePathPattern,
      sourceCount,
      alreadyExistingCount: existingCount,
      toCreateCount,
      destinationCountAfter,
      discrepancy,
      errorCount,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      deductionBreakdown,
      status: itemStatus,
    });
  }

  const discrepancies = reportResults
    .filter((r) => r.destinationCountAfter !== undefined && r.discrepancy !== undefined && r.discrepancy !== 0)
    .map((r) => ({
      tableName: r.tableName,
      source: r.sourceCount,
      destination: r.destinationCountAfter || 0,
      diff: r.discrepancy || 0,
    }));

  console.log(`[Migration] Fin ${dryRun ? 'SIMULATION' : 'EXÉCUTION'}. Source: ${grandTotalSource}, À créer: ${grandTotalToCreate}, Déjà présents: ${grandTotalExisting}, Erreurs: ${grandTotalErrors}`);

  return {
    mode: dryRun ? 'SIMULATION' : 'EXECUTION',
    timestamp: new Date().toISOString(),
    totalTables: reportResults.length,
    totalSourceRows: grandTotalSource,
    totalToCreate: grandTotalToCreate,
    totalAlreadyExisting: grandTotalExisting,
    totalErrors: grandTotalErrors,
    tablesWithoutDestination,
    results: reportResults,
    discrepancies,
  };
}
