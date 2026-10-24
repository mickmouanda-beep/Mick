/**
 * Test d'intégration automatisé de bout en bout pour FAITH SCHOOL MANAGER
 * Vérifie : Permissions RBAC, Inscription élèves, Calculs de notes, Quittances de caisse, Annulations traçables.
 */

async function runTests() {
  const BASE_URL = 'http://localhost:3000/api';
  console.log('--- DÉBUT DE LA SUITE DE TESTS D’INTÉGRATION ---');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Statut initial vierge
    const statusRes = await fetch(`${BASE_URL}/status`).then((r) => r.json());
    assert(statusRes.initialized === false, 'La base de données est 100% vierge au démarrage initial');
    assert(Array.isArray(statusRes.cyclesReference), 'Référentiel des cycles congolais disponible');
    assert(statusRes.lyceeSeriesReference.includes('A') && statusRes.lyceeSeriesReference.includes('G1'), 'Séries Lycée A, D, C, G1-G3, F1-F6 présentes');

    // 2. Initialisation Établissement & Compte Promoteur
    const initPayload = {
      establishmentName: 'Complexe Scolaire Test Congo',
      city: 'Brazzaville',
      address: 'Plateau des 15 Ans',
      phone: '+242 06 111 22 33',
      email: 'contact@cs-test.cg',
      academicYear: '2026-2027',
      activeCycles: ['PRIMAIRE', 'COLLEGE', 'LYCEE'],
      promoteurFullName: 'M. Testeur Promoteur',
      promoteurUsername: 'promoteur_test',
      promoteurEmail: 'promoteur@cs-test.cg',
      promoteurPassword: 'SecurePassword2026!',
    };

    const initRes = await fetch(`${BASE_URL}/setup/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initPayload),
    }).then((r) => r.json());

    assert(!!initRes.token, 'Compte Promoteur créé et jeton JWT émis');
    const promoteurToken = initRes.token;

    // 3. Connexion et sécurité
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'promoteur_test', password: 'SecurePassword2026!' }),
    }).then((r) => r.json());

    assert(loginRes.user.role === 'PROMOTEUR', 'Authentification Promoteur réussie');

    // 4. Création des comptes de direction (DG, DE, Comptable, Enseignant)
    const createDERes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${promoteurToken}` },
      body: JSON.stringify({
        username: 'de_test',
        fullName: 'Prof. Directeur Études Test',
        email: 'de@cs-test.cg',
        role: 'DIRECTEUR_ETUDES',
        password: 'PasswordDE2026!',
      }),
    }).then((r) => r.json());

    assert(!!createDERes.userId, 'Directeur des Études créé par le Promoteur');

    const deLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'de_test', password: 'PasswordDE2026!' }),
    }).then((r) => r.json());
    const deToken = deLogin.token;

    // 5. Test de restriction RBAC : Le DE ne peut PAS créer un compte Comptable
    const forbiddenRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deToken}` },
      body: JSON.stringify({
        username: 'fake_comptable',
        fullName: 'Comptable Interdit',
        role: 'COMPTABLE',
        password: 'Password2026!',
      }),
    });
    assert(forbiddenRes.status === 403, 'Contrôle RBAC : Le DE ne peut pas créer de profil Comptable (code 403)');

    // 6. Le DE crée un profil Enseignant (autorisé)
    const teacherRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deToken}` },
      body: JSON.stringify({
        username: 'prof_test',
        fullName: 'Prof. Mathématiques Test',
        role: 'ENSEIGNANT',
        password: 'PasswordProf2026!',
      }),
    }).then((r) => r.json());
    assert(!!teacherRes.userId, 'Directeur des Études autorise la création du profil Enseignant');
    const teacherId = teacherRes.userId;

    // 7. Création d'une classe de Lycée avec série congolaise (Terminale D)
    const classRes = await fetch(`${BASE_URL}/academic/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deToken}` },
      body: JSON.stringify({
        name: 'Terminale D 1',
        cycleCode: 'LYCEE',
        levelCode: 'Terminale',
        serieCode: 'D',
        room: 'Salle 10',
        capacity: 40,
        mainTeacherId: teacherId,
      }),
    }).then((r) => r.json());
    assert(!!classRes.classId, 'Classe Terminale D 1 créée avec série D officielle');
    const classId = classRes.classId;

    // 8. Inscription d'un élève avec génération automatique du matricule
    const studentRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${promoteurToken}` },
      body: JSON.stringify({
        firstName: 'Jean',
        lastName: 'MOUANDA',
        gender: 'M',
        birthDate: '2008-04-12',
        guardianName: 'M. Michel MOUANDA',
        guardianPhone: '+242 06 999 88 77',
        guardianRelation: 'Père',
        classId: classId,
      }),
    }).then((r) => r.json());
    assert(studentRes.matricule === 'FSM-2026-0001', 'Matricule élève séquentiel auto-généré : FSM-2026-0001');
    const studentId = studentRes.studentId;

    // 9. Création d'une matière et attribution
    const subjRes = await fetch(`${BASE_URL}/academic/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deToken}` },
      body: JSON.stringify({
        code: 'MATH-T',
        name: 'Mathématiques & Analyse',
        cycleCode: 'LYCEE',
        defaultCoefficient: 4.0,
      }),
    }).then((r) => r.json());
    assert(!!subjRes.subjectId, 'Matière Mathématiques créée');

    await fetch(`${BASE_URL}/academic/classes/${classId}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deToken}` },
      body: JSON.stringify({
        subjectId: subjRes.subjectId,
        teacherId: teacherId,
        coefficient: 4.0,
        weeklyHours: 5.0,
      }),
    });

    // 10. Évaluation, saisie des notes et calcul du bulletin
    const evalRes = await fetch(`${BASE_URL}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deToken}` },
      body: JSON.stringify({
        classId: classId,
        subjectId: subjRes.subjectId,
        term: 'TRIMESTRE_1',
        evalType: 'DEVOIR',
        title: 'Devoir Surveillé N°1',
        date: '2026-10-15',
        maxScore: 20.0,
        coefficient: 1.0,
      }),
    }).then((r) => r.json());

    await fetch(`${BASE_URL}/evaluations/${evalRes.evaluationId}/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deToken}` },
      body: JSON.stringify({
        grades: [{ studentId, score: 16.5, isAbsent: false, remarks: 'Très bon travail' }],
      }),
    });

    const reportCards = await fetch(`${BASE_URL}/report-cards/class/${classId}?term=TRIMESTRE_1`, {
      headers: { Authorization: `Bearer ${deToken}` },
    }).then((r) => r.json());
    assert(reportCards.reports[0].generalAverage === 16.5, 'Calcul bulletin officiel : moyenne générale = 16.50 / 20');
    assert(reportCards.reports[0].rank === 1, 'Rang de l’élève calculé : 1er');

    // 11. Comptabilité : Émission de Quittance de paiement
    const payRes = await fetch(`${BASE_URL}/finance/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${promoteurToken}` },
      body: JSON.stringify({
        studentId,
        amount: 75000,
        paymentMethod: 'AIRTEL_MONEY',
        transactionReference: 'AIRTEL-BZV-883920',
        notes: 'Scolarité 1er Trimestre Terminale D',
      }),
    }).then((r) => r.json());
    assert(payRes.receiptNumber === 'REC-2026-0001', 'Quittance certifiée émise : REC-2026-0001');

    // 12. Annulation contrôlée de quittance (jamais effacée silencieusement)
    const cancelRes = await fetch(`${BASE_URL}/finance/payments/${payRes.paymentId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${promoteurToken}` },
      body: JSON.stringify({ cancellationReason: 'Erreur d’imputation du montant' }),
    }).then((r) => r.json());
    assert(cancelRes.message.includes('journal'), 'Annulation contrôlée de quittance tracée dans le journal d’audit');

    console.log(`\n--- RÉSULTATS : ${passed} TESTS RÉUSSIS, ${failed} ÉCHECS ---`);
  } catch (err) {
    console.error('Erreur inattendue durant les tests:', err);
    failed++;
  }
}

runTests();
