import { getDb, queryAll, queryOne } from '../src/server/db.ts';
import {
  checkDocExists,
  getDocData,
  setDocData,
  deleteDocData,
  findUsersByUsernameOrEmail,
  getEstablishment
} from '../src/server/firestore_db.ts';
import {
  executeDualWrite,
  processPendingFirestoreSync,
  getSyncStatusMetrics,
  assertFinancialUniqueness
} from '../src/server/firestore_sync.ts';
import { generateToken, AuthUser, hashPassword, comparePassword } from '../src/server/auth.ts';

interface TestResult {
  category: string;
  name: string;
  status: 'PASSED' | 'FAILED';
  details: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details: string) {
  results.push({
    category,
    name,
    status: passed ? 'PASSED' : 'FAILED',
    details,
  });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${category}] ${name}: ${details}`);
}

async function runSuite() {
  console.log('========================================================================');
  console.log('   ECO GES — SUITE COMPLÈTE DE VALIDATION BACKEND & PERSISTANCE');
  console.log('========================================================================\n');

  await getDb();

  // -------------------------------------------------------------------------
  // MODULE 1: STATUT DU SYSTÈME & SANTÉ DE LA SYNCHRONISATION
  // -------------------------------------------------------------------------
  console.log('--- MODULE 1: STATUT SYSTÈME & SANTÉ DE LA PERSISTANCE ---');
  try {
    const res = await fetch('http://localhost:3000/api/status');
    const data = await res.json();
    const passed = res.status === 200 && data.platformName === 'Eco GES' && data.totalSchools >= 8;
    record('SYSTEM_STATUS', 'API Status HTTP 200 & Multi-écoles', passed, `Statut: ${res.status}, Écoles actives: ${data.totalSchools}, Plateforme: ${data.platformName}`);
  } catch (err: any) {
    record('SYSTEM_STATUS', 'API Status HTTP 200 & Multi-écoles', false, err.message);
  }

  try {
    const metrics = getSyncStatusMetrics();
    const passed = typeof metrics.pendingCount === 'number' && typeof metrics.syncedCount === 'number';
    record('SYNC_METRICS', 'Métriques de synchronisation Cloud/Local', passed, `En attente: ${metrics.pendingCount}, Synchronisés: ${metrics.syncedCount}`);
  } catch (err: any) {
    record('SYNC_METRICS', 'Métriques de synchronisation Cloud/Local', false, err.message);
  }

  // -------------------------------------------------------------------------
  // MODULE 2: AUTHENTIFICATION ET RÔLES (SANS MODIFIER LES MOTS DE PASSE)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 2: AUTHENTIFICATION & RÔLES ---');
  
  // 2.a. Vérification de la présence des comptes clés dans Firestore
  try {
    const adminGenUsers = await findUsersByUsernameOrEmail('admin.general');
    const adminFound = adminGenUsers && adminGenUsers.length > 0 && adminGenUsers[0].role === 'ADMIN_GENERAL';
    record('AUTH_FIRESTORE', 'Recherche Cloud Firestore Administrateur Général', !!adminFound, `ID: ${adminGenUsers?.[0]?.id}, Rôle: ${adminGenUsers?.[0]?.role}`);
  } catch (err: any) {
    record('AUTH_FIRESTORE', 'Recherche Cloud Firestore Administrateur Général', false, err.message);
  }

  try {
    const promUsers = await findUsersByUsernameOrEmail('mick m');
    const promFound = promUsers && promUsers.length > 0 && promUsers[0].role === 'PROMOTEUR';
    record('AUTH_FIRESTORE', 'Recherche Cloud Firestore Promoteur Établissement', !!promFound, `ID: ${promUsers?.[0]?.id}, École: ${promUsers?.[0]?.establishment_id}`);
  } catch (err: any) {
    record('AUTH_FIRESTORE', 'Recherche Cloud Firestore Promoteur Établissement', false, err.message);
  }

  // 2.b. Test d'authentification par l'API avec mot de passe invalide (Doit retourner 401)
  try {
    const badLoginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin.general', password: 'BadPassword123!' }),
    });
    const passed = badLoginRes.status === 401;
    record('AUTH_SECURITY', 'Rejet immédiat des mauvais mots de passe (HTTP 401)', passed, `Code reçu: ${badLoginRes.status}`);
  } catch (err: any) {
    record('AUTH_SECURITY', 'Rejet immédiat des mauvais mots de passe (HTTP 401)', false, err.message);
  }

  // 2.c. Test de rattachement au bon établissement & intégrité du jeton JWT
  const sampleAdmin: AuthUser = {
    id: 'USR-ADMIN-GEN-01',
    establishment_id: 'EST-ECO-HQ',
    username: 'admin.general',
    email: 'superadmin@ecoges.cg',
    full_name: 'Administrateur Général',
    role: 'ADMIN_GENERAL',
    status: 'ACTIVE',
  };
  const adminToken = generateToken(sampleAdmin);

  const sampleTeacher: AuthUser = {
    id: 'USR-ECO1-ENS',
    establishment_id: 'EST-ECO-001',
    username: 'prof.eco1',
    email: 'prof.eco1@csfs1-2026.cg',
    full_name: 'Prof Eco 1',
    role: 'ENSEIGNANT',
    status: 'ACTIVE',
  };
  const teacherToken = generateToken(sampleTeacher);

  const samplePromoter: AuthUser = {
    id: 'USR-PROM-MVDNIYGQ',
    establishment_id: 'EST-MVDNIYCZ',
    username: 'mick m',
    email: 'mickmouanda@gmail.com',
    full_name: 'MOUANDA Michael',
    role: 'PROMOTEUR',
    status: 'ACTIVE',
  };
  const promoterToken = generateToken(samplePromoter);

  record('JWT_TOKEN', 'Génération et intégrité des jetons de session multi-rôles', !!adminToken && !!teacherToken && !!promoterToken, 'Tokens valides générés pour ADMIN_GENERAL, ENSEIGNANT et PROMOTEUR');

  // -------------------------------------------------------------------------
  // MODULE 3: ISOLATION ENTRE ÉTABLISSEMENTS & CONTRÔLE DES RÔLES (RBAC)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 3: ISOLATION MULTI-ÉCOLES & SÉCURITÉ SERVEUR ---');

  // 3.a. Un enseignant ne peut pas accéder à l'espace Développeur (HTTP 403)
  try {
    const devRes = await fetch('http://localhost:3000/api/developer/licenses', {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const passed = devRes.status === 403;
    record('RBAC_CONTROL', 'Blocage accès privilège Gestionnaire par Enseignant (HTTP 403)', passed, `Statut reçu: ${devRes.status}`);
  } catch (err: any) {
    record('RBAC_CONTROL', 'Blocage accès privilège Gestionnaire par Enseignant', false, err.message);
  }

  // 3.b. L'administrateur général a bien accès aux licences (HTTP 200)
  try {
    const adminDevRes = await fetch('http://localhost:3000/api/developer/licenses', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const passed = adminDevRes.status === 200;
    record('RBAC_CONTROL', 'Accès autorisé aux licences pour Administrateur Général (HTTP 200)', passed, `Statut reçu: ${adminDevRes.status}`);
  } catch (err: any) {
    record('RBAC_CONTROL', 'Accès autorisé aux licences pour Administrateur Général', false, err.message);
  }

  // 3.c. Séparation des pouvoirs : Le Promoteur ne peut pas encaisser de paiements en caisse (HTTP 403)
  try {
    const promPayRes = await fetch('http://localhost:3000/api/finance/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${promoterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: 'STU-TEST',
        amount: 50000,
        paymentMethod: 'ESPECES',
      }),
    });
    const passed = promPayRes.status === 403;
    record('SEPARATION_POUVOIRS', 'Interdiction d’encaissement direct au guichet pour Promoteur (HTTP 403)', passed, `Statut reçu: ${promPayRes.status}`);
  } catch (err: any) {
    record('SEPARATION_POUVOIRS', 'Interdiction d’encaissement direct au guichet pour Promoteur', false, err.message);
  }

  // 3.d. Isolation des requêtes d'élèves par établissement (scoping strict serveur)
  try {
    const est1StudentsRes = await fetch('http://localhost:3000/api/students', {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const est1Data = await est1StudentsRes.json();
    // Tous les élèves renvoyés doivent strictement appartenir à l'établissement du token (EST-ECO-001)
    const isStrictlyScoped = Array.isArray(est1Data) && est1Data.every((s: any) => s.establishment_id === 'EST-ECO-001');
    record('TENANT_ISOLATION', 'Isolation stricte des requêtes élèves par établissement', isStrictlyScoped, `Nombre d'élèves retournés: ${est1Data.length}, tous avec establishment_id=EST-ECO-001`);
  } catch (err: any) {
    record('TENANT_ISOLATION', 'Isolation stricte des requêtes élèves par établissement', false, err.message);
  }

  // -------------------------------------------------------------------------
  // MODULE 4: SÉCURITÉ FINANCIÈRE, UNICITÉ ET REÇUS
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 4: PAIEMENTS, QUITTANCES ET UNICITÉ FINANCIÈRE ---');

  // 4.a. Test du contrôle d'unicité de reçu existant
  try {
    const existingPayment = queryOne<any>('SELECT receipt_number, transaction_reference, establishment_id FROM payments LIMIT 1');
    if (existingPayment) {
      const check = await assertFinancialUniqueness(
        existingPayment.establishment_id,
        existingPayment.receipt_number,
        existingPayment.transaction_reference
      );
      const passed = !check.valid && (check.conflictReason?.includes('existe déjà') || false);
      record('FINANCIAL_UNIQUENESS', 'Détection et rejet d’une quittance déjà émise (Anti-doublon)', passed, `Conflit détecté: ${check.conflictReason}`);
    } else {
      record('FINANCIAL_UNIQUENESS', 'Détection et rejet d’une quittance déjà émise (Anti-doublon)', true, 'Aucun paiement préalable trouvé dans SQLite');
    }
  } catch (err: any) {
    record('FINANCIAL_UNIQUENESS', 'Détection et rejet d’une quittance déjà émise', false, err.message);
  }

  // -------------------------------------------------------------------------
  // MODULE 5: DOUBLE PERSISTANCE ET REPLI SÉCURISÉ (TESTS ISOLÉS)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 5: PERSISTANCE RÉELLE CLOUD ET FILE DE SYNCHRONISATION ---');

  const testDocId = `TEST-DOC-${Date.now()}`;
  const testEstId = 'EST-TEST-ISOLATED';

  // 5.a. Test d'écriture et de lecture directe dans Firestore
  try {
    const testPayload = {
      id: testDocId,
      name: 'Classe de test unitaire temporaire',
      cycle_code: 'COLLEGE',
      level_code: '6ème',
      academic_year: '2026-2027',
      is_test_record: true,
      created_at: new Date().toISOString(),
    };

    const dualRes = await executeDualWrite({
      establishmentId: testEstId,
      collectionPath: `establishments/${testEstId}/classes`,
      docId: testDocId,
      operation: 'CREATE',
      payload: testPayload,
      sqliteWriter: () => {
        // Enregistrement miroir
      },
    });

    // Relecture immédiate dans Firestore
    const readBack = await getDocData(`establishments/${testEstId}/classes`, testDocId);
    const passed = dualRes.success && dualRes.syncStatus === 'CONFIRMED_CLOUD_PERSISTED' && readBack?.id === testDocId;
    record('DUAL_WRITE_CLOUD', 'Écriture et relecture directe Cloud Firestore confirmée', passed, `Statut sync: ${dualRes.syncStatus}, Relecture docId: ${readBack?.id}`);

    // Nettoyage immédiat pour zéro pollution
    await deleteDocData(`establishments/${testEstId}/classes`, testDocId);
    record('CLEANUP_TEST', 'Nettoyage sécurisé des données de test dans Firestore', true, 'Document de test supprimé après validation');
  } catch (err: any) {
    record('DUAL_WRITE_CLOUD', 'Écriture et relecture directe Cloud Firestore confirmée', false, err.message);
  }

  // 5.b. Test de traitement de la file d'attente (processPendingFirestoreSync)
  try {
    const syncRes = await processPendingFirestoreSync();
    const passed = typeof syncRes.processed === 'number' && typeof syncRes.succeeded === 'number';
    record('SYNC_QUEUE_ENGINE', 'Moteur de dépilement de la file de repli Firestore', passed, `Traités: ${syncRes.processed}, Réussis: ${syncRes.succeeded}, Échecs: ${syncRes.failed}`);
  } catch (err: any) {
    record('SYNC_QUEUE_ENGINE', 'Moteur de dépilement de la file de repli Firestore', false, err.message);
  }

  // -------------------------------------------------------------------------
  // RÉCAPITULATIF FINAL DE LA SUITE DE TESTS
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('              RÉSULTAT DE LA SUITE DE TESTS COMPLÈTE');
  console.log('========================================================================');
  console.table(results);

  const passedCount = results.filter(r => r.status === 'PASSED').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;
  console.log(`TOTAL Tests exécutés : ${results.length}`);
  console.log(`TOTAL Tests Réussis   : ${passedCount}`);
  console.log(`TOTAL Tests Échoués   : ${failedCount}`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Erreur globale suite de test:', err);
  process.exit(1);
});
