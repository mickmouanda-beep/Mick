import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { MONTANT_MIN, MONTANT_MAX, OFFICIAL_CYCLES, OFFICIAL_LYCEE_SERIES, CONGO_SERIES_CATALOG, CONGO_COLLEGE_CATALOG } from '../constants.ts';
import { getDefaultTemplateConfig, DocumentType } from '../types/documentTemplates.ts';
import {
  authenticateToken,
  requireRole,
  hashPassword,
  comparePassword,
  generateToken,
  checkRateLimit,
  recordLoginAttempt,
  logAudit,
  AuthenticatedRequest,
  UserRole,
  jwt,
  JWT_SECRET,
  AuthUser
} from './auth.ts';
import { populateDemoData } from './seed.ts';
import {
  registerSchool,
  registerSchoolDirectAdmin,
  isSchoolCodeAvailable,
  ensureMultiSchoolTestEnvironments,
  verifyCreationAuthorizationCode,
  createAuthorizationCode,
  revokeAuthorizationCode,
  getDeveloperMetrics,
  getDeveloperEstablishments,
  getDeveloperLicenses,
  renewEstablishmentLicense,
  updateEstablishmentLicenseFormula,
  changeEstablishmentStatus,
  deleteEstablishmentPermanently,
  getRegisteredPromoters,
  searchPromotersNetwork,
} from './multiSchool.ts';
import {
  getEstablishment,
  setEstablishment,
  listEstablishments,
  getStudent,
  setStudent,
  listStudents,
  getGlobalUser,
  setTenantUser,
  listTenantUsers,
  findUsersByUsernameOrEmail,
  listClasses,
  setClass,
  listSubjects,
  setSubject,
  listClassSubjects,
  listPayments,
  setPayment,
  listTariffs,
  listExpenses,
  listFundInjections,
  listEvaluations,
  setEvaluation,
  listGrades,
  setGrade,
  listStudentAttendances,
  setStudentAttendance,
  listTeacherCheckins,
  listPayrollRecords,
  setPayrollRecord,
  listLessonLogs,
  setLessonLog,
  listSchedules,
  listDisciplinaryIncidents,
  listParentStudents,
  getSubscription,
  setSubscription,
  logFirestoreAudit,
  listGuardians,
  getGuardian,
  setGuardian,
  queryGuardiansByPhone,
  normalizePhone,
  listSubcollectionDocs,
  getSubcollectionDoc,
  getDocData,
  setDocData,
  updateDocData,
  deleteDocData,
  listTenantDocs,
  listDocs,
  queryDocs,
  db,
  firebaseProjectId,
  listCurriculumPrograms,
  getCurriculumProgram,
  setCurriculumProgram,
  deleteCurriculumProgramDoc,
  listStudentCourseAttendances,
  setStudentCourseAttendance,
  formatAcademicYearForMatricule,
  generateNextStudentMatricule,
} from './firestore_db.ts';
import {
  executeDualWrite,
  processPendingFirestoreSync,
  getSyncStatusMetrics,
  assertFinancialUniqueness
} from './firestore_sync.ts';
import {
  MIGRATION_TABLE_MAPPINGS,
  runSqliteToFirestoreMigration
} from './firestore_migration.ts';

const api = Router();

// Middleware global de contrôle des droits pour le rôle ELEVE (Accès 100% lecture seule côté serveur)
api.use((req: any, res: any, next: any) => {
  if (req.user && req.user.role === 'ELEVE') {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return res.status(403).json({ error: 'Les élèves ont un accès en lecture seule uniquement.' });
    }
  }
  next();
});

// ==========================================
// 0. DIAGNOSTIC FIRESTORE
// ==========================================

api.get('/firestore/ping', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const gcpProjectId = firebaseProjectId;

  try {
    const docRef = db.collection('_tests').doc('ping');
    const testData = {
      pingTime: new Date().toISOString(),
      user: req.user?.username || 'unknown',
      role: req.user?.role || 'unknown',
      status: 'SUCCESS',
      projectId: gcpProjectId,
      database: '(default)',
      message: 'Document _tests/ping vérifié et actif dans Cloud Firestore.'
    };
    
    // Attempt write
    await docRef.set(testData, { merge: true });
    
    // Attempt read back
    const snap = await docRef.get();
    const readData = snap.exists ? snap.data() : null;

    res.json({
      success: true,
      timestamp: testData.pingTime,
      message: `Connexion à Firestore et test d’écriture/lecture sur _tests/ping réussis avec succès sur le projet ${gcpProjectId} (base: (default)).`,
      written: testData,
      read: readData,
      gcpProjectId,
      firestoreDatabaseId: '(default)',
      status: 'VERIFIED_IN_FIRESTORE'
    });
  } catch (error: any) {
    const serializedError = JSON.stringify(error, Object.getOwnPropertyNames(error));
    console.error('[Firestore Admin Ping Error Serialized]:', serializedError);

    let parsedMessage = error?.message || String(error);
    try {
      if (typeof parsedMessage === 'string' && parsedMessage.startsWith('{')) {
        const parsed = JSON.parse(parsedMessage);
        parsedMessage = parsed.error || parsedMessage;
      }
    } catch {}

    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        code: error?.code || 'FIRESTORE_ERROR',
        message: parsedMessage,
        details: error?.details || null,
        stack: error?.stack || null,
        fullSerializedError: serializedError
      },
      gcpProjectId,
      firestoreDatabaseId: '(default)'
    });
  }
});




// ==========================================
// 1. STATUT SYSTÈME, SYNCHRONISATION & MULTI-ÉTABLISSEMENTS
// ==========================================

api.get('/sync/status', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = getSyncStatusMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erreur lors de la récupération des métriques de sync.' });
  }
});

api.post('/sync/process', authenticateToken, requireRole(['ADMIN_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await processPendingFirestoreSync();
    res.json({ message: 'Traitement de la file d’attente terminé.', ...result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erreur lors du traitement de la file de sync.' });
  }
});

api.get('/migration/mapping', authenticateToken, requireRole(['ADMIN_GENERAL']), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    mappings: MIGRATION_TABLE_MAPPINGS,
    count: MIGRATION_TABLE_MAPPINGS.length,
  });
});

api.post('/migration/run', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dryRun, targetTableName } = req.body;
    const report = await runSqliteToFirestoreMigration(Boolean(dryRun), targetTableName);
    res.json(report);
  } catch (error: any) {
    console.error('Erreur migration Firestore:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l’exécution de la migration.' });
  }
});

api.get('/status', async (req: Request, res: Response) => {
  try {
    // Vérification active de la disponibilité de Firestore
    let databaseAvailable = true;
    let databaseError: string | null = null;
    let databaseErrorDetails: any = null;
    try {
      await db.collection('_tests').doc('ping').get();
    } catch (fsErr: any) {
      databaseAvailable = false;
      const fullSerialized = JSON.stringify(fsErr, Object.getOwnPropertyNames(fsErr));
      console.error('[STATUS_FIRESTORE_INACCESSIBLE] Base de données Firestore inaccessible:', fullSerialized);
      databaseError = fsErr?.message || String(fsErr);
      databaseErrorDetails = fullSerialized;
    }

    const allEsts = await listEstablishments();
    const totalSchools = (allEsts || []).filter(e => e.code !== "ECO-HQ").length;
    const initialized = totalSchools > 0;

    // Ne JAMAIS exposer ou précharger un établissement pour un visiteur non connecté.
    let userEstablishment: any = null;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded?.establishment_id) {
          let est: any = null;
          try {
            est = await getEstablishment(decoded.establishment_id);
          } catch (estErr: any) {
            console.error('[STATUS] Erreur chargement établissement Firestore:', JSON.stringify(estErr, Object.getOwnPropertyNames(estErr)));
          }
          
          if (est) {
            if (typeof est.active_cycles === 'string') {
              try {
                est.active_cycles = JSON.parse(est.active_cycles);
              } catch {
                est.active_cycles = [];
              }
            }
            userEstablishment = est;
          }
        }
      } catch {
        // Jeton invalide ou expiré
        userEstablishment = null;
      }
    }

    res.json({
      initialized,
      totalSchools,
      establishment: userEstablishment,
      platformName: 'Eco GES',
      cyclesReference: OFFICIAL_CYCLES,
      lyceeSeriesReference: OFFICIAL_LYCEE_SERIES,
      databaseAvailable,
      databaseError,
      databaseErrorDetails,
    });
  } catch (error: any) {
    console.error('Erreur /api/status:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification du statut système.' });
  }
});

api.post('/setup/initialize', async (req: Request, res: Response) => {
  try {

    const allEsts = await listEstablishments();
    if ((allEsts?.length || 0) > 0) {
      return res.status(400).json({ error: "L'application a déjà été initialisée." });
    }

    const {
      establishmentName,
      city,
      address,
      phone,
      email,
      academicYear,
      activeCycles,
      promoteurFullName,
      promoteurUsername,
      promoteurEmail,
      promoteurPassword,
      promoteurPhone,
    } = req.body;

    // Validation stricte
    if (!establishmentName || !city || !academicYear || !promoteurFullName || !promoteurUsername || !promoteurPassword) {
      return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires.' });
    }

    if (promoteurPassword.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe du promoteur doit contenir au moins 8 caractères.' });
    }

    const establishmentId = `EST-${Date.now().toString(36).toUpperCase()}`;
    const code = establishmentName
      .trim()
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 6) + '-' + new Date().getFullYear();

    const cyclesJson = JSON.stringify(Array.isArray(activeCycles) && activeCycles.length > 0
      ? activeCycles
      : ['PRE_SCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE']);

    // Créer établissement
    await setEstablishment(establishmentId, {
      id: establishmentId, 
      name: establishmentName, 
      code, 
      country: 'Congo-Brazzaville', 
      city, 
      address: address || '', 
      phone: phone || '', 
      email: email || '', 
      academic_year: academicYear, 
      currency: 'FCFA', 
      active_cycles: Array.isArray(activeCycles) && activeCycles.length > 0 ? activeCycles : ['PRE_SCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE']
    });

    // Hachage sécurisé du mot de passe
    const passwordHash = await hashPassword(promoteurPassword);
    const promoteurId = `USR-PROM-${Date.now().toString(36).toUpperCase()}`;

    // Créer compte Promoteur
    await setTenantUser(establishmentId, {
      id: promoteurId, 
      establishment_id: establishmentId, 
      username: promoteurUsername.trim().toLowerCase(), 
      email: promoteurEmail || null, 
      password_hash: passwordHash, 
      full_name: promoteurFullName, 
      phone: promoteurPhone || null, 
      role: 'PROMOTEUR', 
      status: 'ACTIVE'
    });

    await setSubscription(establishmentId, {
      id: `SUB-${Date.now().toString(36)}`,
      establishment_id: establishmentId,
      plan_name: 'STANDARD',
      status: 'ACTIVE',
      max_students: 500,
      max_users: 50,
      expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
    });

    // Journal d'audit
    logAudit(establishmentId, promoteurId, promoteurFullName, 'INITIALISATION', 'SYSTEM', establishmentId, {
      establishmentName,
      academicYear,
    });

    const userObj = {
      id: promoteurId,
      establishment_id: establishmentId,
      username: promoteurUsername.trim().toLowerCase(),
      email: promoteurEmail || null,
      full_name: promoteurFullName,
      role: 'PROMOTEUR' as UserRole,
      status: 'ACTIVE' as const,
    };

    const token = generateToken(userObj);

    res.json({
      message: 'Établissement et compte Promoteur configurés avec succès.',
      token,
      user: userObj,
      establishment: {
        id: establishmentId,
        name: establishmentName,
        code,
        academic_year: academicYear,
        currency: 'FCFA',
      },
    });
  } catch (error: any) {
    console.error('Erreur /api/setup/initialize:', error);
    res.status(500).json({ error: error.message || "Erreur lors de l'initialisation." });
  }
});

// Initialiser les données de test (uniquement sur demande explicite et autorisation technique)
api.post('/setup/seed-demo', async (req: Request, res: Response) => {
  try {
    const DEV_PASSKEY = process.env.ECO_DEV_KEY || 'EcoDev2026!';
    const providedDevKey = (req.headers['x-eco-dev-key'] as string) || req.body.devKey;
    let isAuthorized = false;

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const caller = await getGlobalUser(decoded.id);
        if (caller && (caller.role === 'ADMIN_GENERAL' || caller.role === 'PROMOTEUR')) {
          isAuthorized = true;
        }
      } catch {}
    }

    if (providedDevKey && providedDevKey === DEV_PASSKEY) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Accès refusé. Cette fonctionnalité est réservée aux administrateurs techniques autorisés." });
    }


    await populateDemoData();
    res.json({ message: "Données d'évaluation et de test chargées avec succès." });
  } catch (error: any) {
    console.error('Erreur /api/setup/seed-demo:', error);
    res.status(500).json({ error: "Échec du chargement des données de test." });
  }
});

// ==========================================
// 2. AUTHENTIFICATION & SESSIONS
// ==========================================

api.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password, establishmentCode, establishmentId } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!username || !password) {
      return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
    }

    const rateKey = `${clientIp}_${username.toLowerCase()}`;
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Trop de tentatives de connexion infructueuses. Veuillez patienter ${rateCheck.remainingMinutes} minute(s).`,
      });
    }

    // 1. Déterminer l'établissement
    let targetEstablishmentId: string | null = establishmentId || null;
    if (!targetEstablishmentId && establishmentCode) {
      const cleanCode = establishmentCode.trim().toUpperCase();
      const allFsEsts = await listEstablishments();
      const fsEst = (allFsEsts || []).find((e: any) => e.code && e.code.toUpperCase() === cleanCode);
      if (fsEst) {
        targetEstablishmentId = fsEst.id;
      }
    }

    if (establishmentCode && !targetEstablishmentId) {
       recordLoginAttempt(rateKey, false);
       return res.status(401).json({ error: "Code d'établissement, identifiant ou mot de passe incorrect." });
    }

    // 2. Si aucun code/ID d'établissement n'est fourni, vérifier s'il s'agit du compte Développeur / App Manager (ADMIN_GENERAL)
    if (!targetEstablishmentId) {
      const globalAdmins = await findUsersByUsernameOrEmail(username, undefined);
      const isDevAdmin = globalAdmins.some((u: any) => u.role === 'ADMIN_GENERAL');
      if (!isDevAdmin) {
        return res.status(400).json({ error: "Le code d'établissement est obligatoire pour se connecter." });
      }
    }

    // 3. Recherche des utilisateurs STRICTEMENT DANS CET ÉTABLISSEMENT
    const potentialUsers = await findUsersByUsernameOrEmail(username, targetEstablishmentId || undefined);

    if (potentialUsers.length === 0) {
      recordLoginAttempt(rateKey, false);
      return res.status(401).json({ error: "Code d'établissement, identifiant ou mot de passe incorrect." });
    }

    // 4. Vérifier le mot de passe
    const validUsers: any[] = [];
    for (const u of potentialUsers) {
      const match = await comparePassword(password, u.password_hash);
      if (match) {
        const estData = await getEstablishment(u.establishment_id);
        validUsers.push({
          ...u,
          establishment_name: estData?.name || '',
          establishment_code: estData?.code || '',
          establishment_city: estData?.city || '',
          academic_year: estData?.academic_year || '2026-2027',
          currency: estData?.currency || 'FCFA',
          active_cycles: estData?.active_cycles || [],
          logo_url: estData?.logo_url || null,
        });
      }
    }

    if (validUsers.length === 0) {
      recordLoginAttempt(rateKey, false);
      return res.status(401).json({ error: "Code d'établissement, identifiant ou mot de passe incorrect." });
    }

    const user = validUsers[0];

    if (user.status === 'PENDING_ACTIVATION' || user.is_activated === false) {
      return res.status(403).json({ error: "Ce compte n'est pas encore activé. Contactez l'administration." });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Ce compte a été suspendu par la direction.' });
    }

    // Réinitialiser le compteur de tentatives
    recordLoginAttempt(rateKey, true);

    const authUser: AuthUser & { must_change_password?: boolean } = {
      id: user.id,
      establishment_id: user.establishment_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      student_id: user.student_id || null,
      must_change_password: !!user.must_change_password,
    };

    const token = generateToken(authUser);
    logAudit(user.establishment_id, user.id, user.full_name, 'CONNEXION', 'USER', user.id, null, clientIp);

    let activeCycles = [];
    try {
      activeCycles = typeof user.active_cycles === 'string' ? JSON.parse(user.active_cycles) : user.active_cycles;
    } catch {
      activeCycles = [];
    }

    res.json({
      token,
      user: authUser,
      must_change_password: !!user.must_change_password,
      establishment: {
        id: user.establishment_id,
        name: user.establishment_name,
        code: user.establishment_code,
        city: user.establishment_city,
        academic_year: user.academic_year,
        currency: user.currency,
        active_cycles: activeCycles,
        logo_url: user.logo_url || null,
      },
    });
  } catch (error: any) {
    console.error('Erreur /api/auth/login:', error);
    res.status(500).json({ error: 'Erreur lors de la tentative de connexion.' });
  }
});

// Activation de compte par code à usage unique (Parent ou Élève)
api.post('/auth/activate-account', async (req: Request, res: Response) => {
  try {
    const { code, password, accountType } = req.body;
    if (!code || !password) {
      return res.status(400).json({ error: 'Code d\'activation et nouveau mot de passe requis.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 8 caractères.' });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Chercher l'utilisateur avec ce code d'activation
    const allUsers = await listDocs<any>('users');
    let targetUser = (allUsers || []).find((u: any) => u.activation_code === cleanCode);

    // 2. Si pas trouvé dans users, chercher dans students
    let targetStudent: any = null;
    if (!targetUser) {
      const allStudents = await listDocs<any>('students');
      targetStudent = (allStudents || []).find(
        (s: any) => s.parent_activation_code === cleanCode || s.student_activation_code === cleanCode
      );
    }

    if (!targetUser && !targetStudent) {
      return res.status(400).json({ error: 'Code d\'activation invalide ou introuvable.' });
    }

    const expiresAtStr = targetUser?.activation_code_expires_at || 
      (targetStudent?.parent_activation_code === cleanCode ? targetStudent?.parent_activation_code_expires_at : targetStudent?.student_activation_code_expires_at);

    if (expiresAtStr && new Date() > new Date(expiresAtStr)) {
      return res.status(400).json({ error: 'Ce code d\'activation a expiré (durée de validité : 7 jours). Demandez un nouveau code à l\'administration.' });
    }

    const passHash = await hashPassword(password);
    const estId = targetUser?.establishment_id || targetStudent?.establishment_id;

    if (targetUser) {
      const updatedUser = {
        ...targetUser,
        password_hash: passHash,
        status: 'ACTIVE',
        is_activated: true,
        must_change_password: false,
        activation_code: null,
        activation_code_expires_at: null,
        updated_at: new Date().toISOString(),
      };
      await setTenantUser(estId, updatedUser);
      logAudit(estId, updatedUser.id, updatedUser.full_name, 'ACTIVATION_COMPTE', 'USER', updatedUser.id);
    } else if (targetStudent) {
      const isParentCode = targetStudent.parent_activation_code === cleanCode;
      const role = isParentCode ? 'PARENT' : 'ELEVE';
      const username = isParentCode ? normalizePhone(targetStudent.guardian_phone) || targetStudent.guardian_phone : targetStudent.matricule;
      const fullName = isParentCode ? targetStudent.guardian_name : `${targetStudent.first_name} ${targetStudent.last_name}`;
      const userId = `USR-${role}-${Date.now().toString(36).toUpperCase()}`;

      const userDoc = {
        id: userId,
        establishment_id: estId,
        username: username.toLowerCase(),
        full_name: fullName,
        password_hash: passHash,
        role,
        status: 'ACTIVE',
        is_activated: true,
        must_change_password: false,
        student_id: isParentCode ? null : targetStudent.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await setTenantUser(estId, userDoc);

      const updatedStudent = {
        ...targetStudent,
        ...(isParentCode
          ? { parent_activated: true, parent_activation_code: null }
          : { student_activated: true, student_activation_code: null }),
        updated_at: new Date().toISOString(),
      };
      await setStudent(estId, updatedStudent);

      logAudit(estId, userId, fullName, 'ACTIVATION_COMPTE', 'USER', userId);
    }

    res.json({ message: 'Compte activé avec succès ! Vous pouvez maintenant vous connecter avec vos identifiants.' });
  } catch (error: any) {
    console.error('Erreur activation compte:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'activation du compte.' });
  }
});

// Changement rapide de profil de test / démonstration multi-écoles (Sécurisé pour administrateur technique)
api.post('/auth/demo-switch', async (req: Request, res: Response) => {
  try {
    // SÉCURITÉ RENFORCÉE : Protéger le switch de démonstration
    const DEV_PASSKEY = process.env.ECO_DEV_KEY || 'EcoDev2026!';
    const providedDevKey = (req.headers['x-eco-dev-key'] as string) || req.body.devKey;
    let isAuthorized = false;

    // 1. Autoriser si le client a un jeton actif d'Administrateur Général ou Promoteur
    const authHeader = req.headers.authorization;
    const callerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (callerToken) {
      try {
        const decoded = jwt.verify(callerToken, JWT_SECRET) as any;
        const caller = await getDocData('users', decoded.id);
        if (caller && (caller.role === 'ADMIN_GENERAL' || caller.role === 'PROMOTEUR')) {
          isAuthorized = true;
        }
      } catch {}
    }

    // 2. Autoriser si la clé secrète développeur / technique est fournie
    if (providedDevKey && providedDevKey === DEV_PASSKEY) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Accès refusé. Cette fonctionnalité de test est protégée et strictement réservée aux administrateurs techniques autorisés.",
      });
    }

    const { username, role, establishmentCode } = req.body;

    // Déterminer l'établissement ciblé
    let est: any = null;
    const allEsts = await listEstablishments();
    if (establishmentCode) {
      est = allEsts.find((e: any) => e.code?.toUpperCase() === establishmentCode.trim().toUpperCase());
    }

    // Interdiction stricte : le rôle Développeur souverain ne peut jamais être usurpé
    if (username === 'admin.general' || role === 'ADMIN_GENERAL') {
      return res.status(403).json({ error: "Accès refusé. Le profil Développeur / ADMIN_GENERAL ne peut pas être usurpé sans authentification." });
    }

    // Auto-détection par suffixe dans le username
    if (!est && typeof username === 'string') {
      if (username.includes('.eco1')) {
        est = allEsts.find((e: any) => e.code === 'ECO-001');
      } else if (username.includes('.eco2')) {
        est = allEsts.find((e: any) => e.code === 'ECO-002');
      }
    }

    // Fallback par défaut sur ECO-001 pour l'expérience multi-écoles
    if (!est) {
      est = allEsts.find((e: any) => e.code === 'ECO-001') ||
            allEsts.find((e: any) => e.code !== 'ECO-HQ') ||
            allEsts[0];
    }

    if (!est) {
      return res.status(400).json({ error: "Aucun établissement n'est configuré." });
    }

    const targetKey = (username || '').toLowerCase().trim();

    // 1. Chercher par username dans l'établissement
    let user = (await listTenantUsers(est.id)).find((u: any) => u.username?.toLowerCase() === targetKey);

    // 2. Si non trouvé par username, chercher un utilisateur actif avec ce rôle
    if (!user && role) {
      user = (await listTenantUsers(est.id)).find((u: any) => u.role === role && u.status === "ACTIVE");
    }

    if (!user) {
      // Fallback : premier utilisateur de l'école
      user = (await listTenantUsers(est.id))[0];
    }

    if (!user) {
      return res.status(404).json({ error: `Compte de test introuvable pour "${username}" dans l'établissement ${est.name}.` });
    }

    const authUser: AuthUser = {
      id: user.id,
      establishment_id: user.establishment_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      student_id: user.student_id || null,
    };

    const token = generateToken(authUser);

    let activeCycles = [];
    try {
      activeCycles = typeof est.active_cycles === 'string' ? JSON.parse(est.active_cycles) : est.active_cycles;
    } catch {
      activeCycles = [];
    }

    res.json({
      token,
      user: authUser,
      establishment: {
        id: est.id,
        name: est.name,
        code: est.code,
        city: est.city,
        academic_year: est.academic_year,
        currency: est.currency || 'FCFA',
        active_cycles: activeCycles,
        logo_url: est.logo_url || null,
      },
    });
  } catch (error: any) {
    console.error('Erreur /api/auth/demo-switch:', error);
    res.status(500).json({ error: error.message || 'Erreur lors du changement de profil démo.' });
  }
});

// ==========================================
// 2.1 GESTION MULTI-ÉTABLISSEMENTS & INSCRIPTION
// ==========================================

// Inscription d'une nouvelle école
api.post('/establishments/register', async (req: Request, res: Response) => {
  try {
    // SÉCURITÉ SERVEUR : Un utilisateur connecté avec un rôle scolaire (notamment Promoteur)
    // ne peut pas créer d'autres écoles depuis son compte
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const currentUser = await getDocData('users', decoded.id);
        if (currentUser && currentUser.role !== 'ADMIN_GENERAL') {
          return res.status(403).json({
            error: "Action non autorisée. La création d'établissements et la gestion multi-écoles sont strictement réservées au Gestionnaire d'application."
          });
        }
      } catch {
        // Token non valide
      }
    }

    const result = await registerSchool(req.body);
    res.json({
      message: 'Établissement inscrit avec succès ! Bienvenue sur la plateforme Eco GES.',
      ...result,
    });
  } catch (error: any) {
    console.error('Erreur /api/establishments/register:', error);
    res.status(400).json({ error: error.message || "Erreur lors de l'inscription de l'établissement." });
  }
});

// Vérification en direct de la disponibilité d'un code école (ex: ECO-001)
api.get('/establishments/check-code/:code', async (req: Request, res: Response) => {
  try {
    const available = await isSchoolCodeAvailable(req.params.code);
    res.json({ code: req.params.code.trim().toUpperCase(), available });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la vérification du code établissement.' });
  }
});

// Vérification en direct d'un code d'autorisation Développeur (ex: ECO-AUTH-XXXX-XXXX-XXXX)
api.get('/establishments/verify-auth-code/:code', async (req: Request, res: Response) => {
  try {

    const result = await verifyCreationAuthorizationCode(req.params.code);
    if (!result.valid) {
      return res.status(400).json({ valid: false, error: result.error });
    }
    res.json({ valid: true, authorization: result.authorization });
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message || "Erreur lors de la vérification du code d'autorisation." });
  }
});

// Liste des établissements (Gestionnaire d'application = complet ; Promoteur/Utilisateur connecté = STRICTEMENT son établissement ; Public = actif pour sélection)
// Liste des établissements depuis Cloud Firestore
api.get('/establishments', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    let currentUser: AuthUser | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        // Décodage du token sans requête SQLite
        currentUser = decoded as AuthUser;
      } catch {
        // Token non valide ou expiré
      }
    }

    // 1. Gestionnaire d'application souverain (ADMIN_GENERAL / DEVELOPER) : Liste complète de toutes les écoles depuis Firestore
    const isSuperAdmin = currentUser?.role && ['ADMIN_GENERAL', 'SUPER_ADMIN', 'DEVELOPER'].includes(currentUser.role);
    if (isSuperAdmin) {
      const allEsts = await listEstablishments();
      const fullList = await Promise.all(
        (allEsts || []).map(async (e: any) => {
          let stus: any[] = [];
          let users: any[] = [];
          let classes: any[] = [];
          let sub: any = null;
          try {
            [stus, users, classes, sub] = await Promise.all([
              listSubcollectionDocs(e.id, 'students').catch(() => []),
              listSubcollectionDocs(e.id, 'users').catch(() => []),
              listSubcollectionDocs(e.id, 'classes').catch(() => []),
              getSubscription(e.id).catch(() => null),
            ]);
          } catch {}

          return {
            ...e,
            student_count: (stus || []).length,
            teacher_count: (users || []).filter((u: any) => u.role === 'ENSEIGNANT').length,
            class_count: (classes || []).length,
            plan_name: sub?.plan_name || sub?.formula_name || 'STANDARD',
            subscription_status: sub?.status || 'ACTIVE',
          };
        })
      );
      fullList.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return res.json(fullList);
    }

    // 2. Utilisateur connecté (notamment PROMOTEUR) : Isolation absolue sur son établissement
    if (currentUser && currentUser.establishment_id) {
      const myEst = await getEstablishment(currentUser.establishment_id);
      return res.json(myEst ? [myEst] : []);
    }

    // 3. Répertoire public résumé depuis Firestore pour sélection d'école à la connexion
    const allEsts = await listEstablishments();
    const publicDirectory = (allEsts || [])
      .filter((e: any) => e.code !== 'ECO-HQ' && e.status !== 'INACTIVE')
      .map((e: any) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        city: e.city,
        country: e.country || 'Congo-Brazzaville',
        academic_year: e.academic_year || '2026-2027',
        motto: e.motto || null,
        logo_url: e.logo_url || null,
      }));
    publicDirectory.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json(publicDirectory);
  } catch (error: any) {
    console.error('Erreur /api/establishments Firestore:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des établissements.' });
  }
});

// Consultation d'un établissement depuis Firestore avec isolation multi-établissements
api.get('/establishments/firestore/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user!.role !== 'ADMIN_GENERAL' && req.user!.establishment_id !== id) {
      return res.status(403).json({ error: "Accès refusé. Isolation multi-établissements active." });
    }
    const firestoreEst = await getEstablishment(id);
    if (firestoreEst) {
      return res.json({ source: 'firestore', establishment: firestoreEst });
    }
    return res.status(404).json({ error: 'Établissement introuvable dans Firestore.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erreur lors de la lecture de l'établissement." });
  }
});

// Basculement d'école réservé à l'ADMIN_GENERAL (Super-Admin switcher)
api.post('/establishments/switch', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN_GENERAL') {
      return res.status(403).json({ error: "Action réservée à l'Administrateur Général Eco GES." });
    }
    const { targetEstablishmentId } = req.body;
    const targetEst = await getEstablishment(targetEstablishmentId);
    if (!targetEst) {
      return res.status(404).json({ error: 'Établissement introuvable dans Firestore.' });
    }

    const updatedUser: AuthUser = {
      ...req.user!,
      establishment_id: targetEst.id,
    };
    const token = generateToken(updatedUser);

    let activeCycles = [];
    try {
      activeCycles = typeof targetEst.active_cycles === 'string' ? JSON.parse(targetEst.active_cycles) : targetEst.active_cycles || [];
    } catch {
      activeCycles = [];
    }

    res.json({
      token,
      user: updatedUser,
      establishment: {
        id: targetEst.id,
        name: targetEst.name,
        code: targetEst.code,
        city: targetEst.city,
        academic_year: targetEst.academic_year,
        currency: targetEst.currency || 'FCFA',
        active_cycles: activeCycles,
        logo_url: targetEst.logo_url || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors du changement d'établissement." });
  }
});

api.get('/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const est: any = await getEstablishment(req.user!.establishment_id);
    if (est && typeof est.active_cycles === 'string') {
      try {
        est.active_cycles = JSON.parse(est.active_cycles);
      } catch {
        est.active_cycles = [];
      }
    }

    res.json({
      user: req.user,
      establishment: est || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors de la récupération des informations utilisateur." });
  }
});

api.post('/auth/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 8 caractères.' });
    }

    const user = await getGlobalUser(req.user!.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const match = await comparePassword(currentPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    await setTenantUser(req.user!.establishment_id, { 
      ...user, 
      password_hash: newHash, 
      updated_at: new Date().toISOString() 
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'MODIFICATION_MOT_DE_PASSE', 'USER', req.user!.id);

    res.json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe.' });
  }
});

// ==========================================
// 2.2 ESPACE DÉVELOPPEUR & CONSOLE CENTRALE ECO GES
// ==========================================

// Vérification de l'état d'initialisation du premier compte développeur
api.get('/developer/bootstrap-status', async (req: Request, res: Response) => {
  try {

    const users = await listDocs<any>('users');
    const adminCount = users.filter(u => u.role === 'ADMIN_GENERAL').length;
    res.json({
      initialized: adminCount > 0,
      adminCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la vérification du statut développeur.' });
  }
});

// Initialisation sécurisée du premier compte développeur (procédure unique et protégée)
api.post('/developer/bootstrap', async (req: Request, res: Response) => {
  try {

    const users2 = await listDocs<any>('users');
    const adminCount = users2.filter(u => u.role === 'ADMIN_GENERAL').length;
    if (adminCount > 0) {
      return res.status(403).json({
        error: "Le compte Développeur principal est déjà initialisé. L'accès à cette procédure est désormais verrouillé.",
      });
    }

    const { username, password, fullName, email, phone } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({ error: "Le nom d'utilisateur, le mot de passe et le nom complet sont obligatoires." });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "L'identifiant doit comporter au moins 3 caractères." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe développeur doit comporter au moins 8 caractères." });
    }

    // Assurer l'existence de l'établissement central ECO-HQ
    let platformHq = await getEstablishment('EST-ECO-HQ');
    if (!platformHq) {
      await setEstablishment('EST-ECO-HQ', {
        id: 'EST-ECO-HQ',
        name: 'Plateforme Centrale Eco GES',
        code: 'ECO-HQ',
        country: 'Congo-Brazzaville',
        city: 'Brazzaville',
        address: 'Direction des Opérations Eco GES',
        phone: '+242 06 999 00 00',
        email: 'direction@ecoges.cg',
        motto: 'Excellence Scolaire & Numérique',
        academic_year: '2026-2027',
        currency: 'FCFA',
        active_cycles: ['PRE_SCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'],
        status: 'ACTIVE'
      });
    }

    const adminId = `USR-DEV-${Date.now().toString(36).toUpperCase()}`;
    const passwordHash = await hashPassword(password);

    await setTenantUser('EST-ECO-HQ', {
        id: adminId,
        establishment_id: 'EST-ECO-HQ',
        username: cleanUsername,
        email: email?.trim() || 'developpeur@ecoges.cg',
        password_hash: passwordHash,
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        role: 'ADMIN_GENERAL',
        status: 'ACTIVE'
    });

    logAudit('EST-ECO-HQ', adminId, fullName.trim(), 'INITIALISATION_PREMIER_DEVELOPPEUR', 'SYSTEM', adminId, {
      username: cleanUsername,
      email: email || null,
      date: new Date().toISOString(),
    });

    const authUser: AuthUser = {
      id: adminId,
      establishment_id: 'EST-ECO-HQ',
      username: cleanUsername,
      email: email?.trim() || null,
      full_name: fullName.trim(),
      role: 'ADMIN_GENERAL',
      status: 'ACTIVE',
    };

    const token = generateToken(authUser);

    res.json({
      message: 'Compte Développeur initialisé avec succès ! Bienvenue sur votre console centrale.',
      token,
      user: authUser,
    });
  } catch (error: any) {
    console.error('Erreur bootstrap développeur:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'initialisation du compte développeur.' });
  }
});

// Statistiques globales en temps réel
api.get('/developer/metrics', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getDeveloperMetrics();
    res.json(stats);
  } catch (error: any) {
    console.error('Erreur /api/developer/metrics:', error);
    res.status(500).json({ error: error.message || 'Erreur lors du calcul des statistiques développeur.' });
  }
});

// Liste de tous les établissements avec filtres (recherche, statut, ville)
api.get('/developer/establishments', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status, city } = req.query;
    const ests = await getDeveloperEstablishments({
      search: search as string,
      status: status as string,
      city: city as string,
    });
    res.json(ests);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des établissements.' });
  }
});

// Création directe d'un établissement par le Gestionnaire d'application (ADMIN_GENERAL)
api.post('/developer/establishments', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {

    const result = await registerSchoolDirectAdmin(req.body, req.user!.id, req.user!.full_name);
    res.json({
      message: 'Nouvel établissement créé avec succès dans le réseau Eco GES.',
      establishment: result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erreur lors de la création de l'établissement." });
  }
});

// Activer, Suspendre ou Désactiver un établissement
api.put('/developer/establishments/:id/status', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, reason } = req.body;
    if (!status || !['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status)) {
      return res.status(400).json({ error: 'Statut demandé invalide (doit être ACTIVE, SUSPENDED ou DELETED).' });
    }
    const updated = await changeEstablishmentStatus(
      req.params.id,
      status,
      reason,
      req.user!.full_name || 'Développeur Eco GES'
    );
    res.json({
      message: `Statut de l'établissement mis à jour vers "${status}".`,
      establishment: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour du statut.' });
  }
});

// Suppression définitive sécurisée (avec code de confirmation de sécurité)
api.delete('/developer/establishments/:id', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { confirmationCode } = req.body;
    if (confirmationCode !== 'SUPPRIMER-DEFINITIVEMENT') {
      return res.status(400).json({ error: 'Code de confirmation de sécurité incorrect. Veuillez saisir explicitement "SUPPRIMER-DEFINITIVEMENT".' });
    }
    await deleteEstablishmentPermanently(req.params.id, req.user!.full_name || 'Développeur Eco GES');
    res.json({ message: "L'établissement et toutes ses données associées ont été supprimés définitivement de la plateforme." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la suppression définitive.' });
  }
});

// Liste de tous les codes d'autorisation de création générés
api.get('/developer/authorizations', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {

    const auths = await listDocs('creation_authorizations');
    auths.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(auths);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des codes.' });
  }
});

// Génération d'un nouveau code d'autorisation unique
api.post('/developer/authorizations', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {

    const { promoter_name, promoter_email, promoter_phone, notes, validityDays } = req.body;
    const newAuth = await createAuthorizationCode({
      promoter_name,
      promoter_email,
      promoter_phone,
      notes,
      validityDays: validityDays ? parseInt(validityDays, 10) : undefined,
      created_by_user_id: req.user!.id,
      created_by_name: req.user!.full_name,
    });

    logAudit(
      'EST-ECO-HQ',
      req.user!.id,
      req.user!.full_name,
      'GENERATION_CODE_AUTORISATION',
      'AUTHORIZATION',
      newAuth.id,
      { code: newAuth.code, promoteur: promoter_name, validiteJours: validityDays }
    );

    res.json({
      message: "Code d'autorisation unique généré avec succès.",
      authorization: newAuth,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erreur lors de la génération du code d'autorisation." });
  }
});

// Révocation d'un code d'autorisation non encore utilisé
api.put('/developer/authorizations/:id/revoke', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {

    const { reason } = req.body;
    const revoked = await revokeAuthorizationCode(
      req.params.id,
      req.user!.full_name || 'Développeur Eco GES',
      reason
    );
    logAudit(
      'EST-ECO-HQ',
      req.user!.id,
      req.user!.full_name,
      'REVOCATION_CODE_AUTORISATION',
      'AUTHORIZATION',
      req.params.id,
      { code: revoked.code, reason }
    );
    res.json({
      message: "Code d'autorisation révoqué avec succès.",
      authorization: revoked,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erreur lors de la révocation du code.' });
  }
});

// Liste des promoteurs et leurs écoles respectives
api.get('/developer/promoters', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const promoters = await getRegisteredPromoters();
    res.json(promoters);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des promoteurs.' });
  }
});

// Recherche avancée des promoteurs (Assistance et Récupération)
api.get('/developer/promoters/search', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = req.query.query as string;
    const promoters = await searchPromotersNetwork(query);
    res.json(promoters);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la recherche des promoteurs.' });
  }
});

// Récupération sécurisée de l'identifiant promoteur
api.post('/developer/promoters/recover-username', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { promoterUserId } = req.body;
    if (!promoterUserId) {
      return res.status(400).json({ error: "ID du promoteur requis." });
    }
    const promoter = await getGlobalUser(promoterUserId);
    if (!promoter || promoter.role !== 'PROMOTEUR') {
      return res.status(404).json({ error: "Compte promoteur introuvable." });
    }
    const est = await getEstablishment(promoter.establishment_id);

    logAudit(
      promoter.establishment_id,
      req.user!.id,
      req.user!.full_name,
      'RECUPERATION_IDENTIFIANT_PROMOTEUR',
      'USER',
      promoter.id,
      { username: promoter.username, establishmentName: est?.name || '' }
    );

    res.json({
      success: true,
      username: promoter.username,
      full_name: promoter.full_name,
      email: promoter.email,
      phone: promoter.phone,
      establishment_name: est?.name || '',
      establishment_code: est?.code || '',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erreur lors de la récupération de l'identifiant." });
  }
});

// Réinitialisation sécurisée du mot de passe promoteur par le Gestionnaire
api.post('/developer/promoters/reset-password', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { promoterUserId, newPassword, notes } = req.body;
    if (!promoterUserId || !newPassword) {
      return res.status(400).json({ error: "ID du promoteur et nouveau mot de passe requis." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
    }

    const promoter = await getGlobalUser(promoterUserId);
    if (!promoter || promoter.role !== 'PROMOTEUR') {
      return res.status(404).json({ error: "Compte promoteur introuvable." });
    }
    const est = await getEstablishment(promoter.establishment_id);

    const passwordHash = await hashPassword(newPassword);
    await setTenantUser(promoter.establishment_id, {
      ...promoter,
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    });

    logAudit(
      promoter.establishment_id,
      req.user!.id,
      req.user!.full_name,
      'REINITIALISATION_MOT_DE_PASSE_PROMOTEUR',
      'USER',
      promoter.id,
      { username: promoter.username, establishmentName: est?.name || '', notes: notes || 'Réinitialisation administrative' }
    );

    res.json({
      success: true,
      message: `Le mot de passe du promoteur "${promoter.full_name}" pour l'établissement "${est?.name || ''}" a été réinitialisé avec succès.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erreur lors de la réinitialisation du mot de passe." });
  }
});

// Journal d'audit centralisé pour le Développeur
api.get('/developer/audit-logs', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let logs: any[] = [];
    try {
      logs = await listDocs('audit_logs_firestore');
    } catch {}
    if (!logs || logs.length === 0) {
      try {
        logs = await listDocs('audit_logs');
      } catch {}
    }
    const allEsts = await listEstablishments();
    const estMap = new Map((allEsts || []).map((e: any) => [e.id, e]));
    const formattedLogs = (logs || []).map((l: any) => ({
      ...l,
      establishment_name: estMap.get(l.establishment_id)?.name || 'Eco GES HQ',
      establishment_code: estMap.get(l.establishment_id)?.code || 'ECO-HQ',
    }));
    formattedLogs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json(formattedLogs.slice(0, 250));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des journaux d\'audit.' });
  }
});

// ==========================================
// 2.3 GESTION COMMERCIALE DES LICENCES & FORMULES
// ==========================================

// Liste complète des licences d'exploitation
api.get('/developer/licenses', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const licenses = await getDeveloperLicenses();
    res.json(licenses);
  } catch (error: any) {
    console.error('Erreur /api/developer/licenses:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des licences.' });
  }
});

// Référentiel des formules commerciales
api.get('/developer/formulas', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let formulas: any[] = [];
    try {
      formulas = await listDocs('commercial_formulas');
    } catch {}
    if (!formulas || formulas.length === 0) {
      formulas = [
        {
          id: 'FORM-EXCELLENCE',
          name: 'Formule Excellence — Illimité',
          subtitle: 'Pour grands groupes scolaires et complexes d\'envergure',
          max_students: 1500,
          max_staff: 150,
          duration_months: 12,
          price_fcfa: 0,
          modules_included: ['TOUS_LES_MODULES', 'MULTI_CYCLES', 'PAIE_AVANCEE', 'SUPPORT_DEDIE'],
          is_active: 1
        },
        {
          id: 'FORM-PACK-MOYEN',
          name: 'Formule Pack Moyen',
          subtitle: 'Pour collèges et lycées de taille intermédiaire',
          max_students: 700,
          max_staff: 80,
          duration_months: 12,
          price_fcfa: 0,
          modules_included: ['PEDAGOGIE', 'FINANCE', 'CAHIER_TEXTE', 'BULLETINS', 'DISCIPLINE'],
          is_active: 1
        },
        {
          id: 'FORM-START',
          name: 'Formule Start',
          subtitle: 'Pour écoles primaires ou établissements en lancement',
          max_students: 400,
          max_staff: 50,
          duration_months: 12,
          price_fcfa: 0,
          modules_included: ['GESTION_ELEVES', 'FINANCES_BASE', 'BULLETINS'],
          is_active: 1
        }
      ];
    }
    res.json(formulas.map((f: any) => {
      if (typeof f.modules_included === 'string') {
        try {
          f.modules_included = JSON.parse(f.modules_included);
        } catch {
          f.modules_included = [];
        }
      }
      return f;
    }));
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des formules commerciales.' });
  }
});

// Modification de la formule commerciale et des plafonds d'une école
api.put('/developer/licenses/:id/formula', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { formula, notes } = req.body;
    if (!formula || !['EXCELLENCE', 'PACK_MOYEN', 'START'].includes(formula)) {
      return res.status(400).json({ error: 'Formule demandée invalide (EXCELLENCE, PACK_MOYEN, ou START).' });
    }
    const updated = await updateEstablishmentLicenseFormula(
      req.params.id,
      formula,
      req.user!.full_name || "Gestionnaire d'application",
      notes
    );
    res.json({
      message: `Formule de licence mise à jour vers "${updated.formula_name}".`,
      license: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour de la formule.' });
  }
});

// Renouvellement de la licence (+12 mois, +6 mois, etc.)
api.post('/developer/licenses/:id/renew', authenticateToken, requireRole(['ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const duration = req.body.durationMonths ? parseInt(req.body.durationMonths, 10) : 12;
    const result = await renewEstablishmentLicense(
      req.params.id,
      duration,
      req.user!.full_name || "Gestionnaire d'application",
      req.body.notes
    );
    res.json({
      message: `Licence renouvelée avec succès pour ${duration} mois supplémentaires. Nouvelle échéance : ${result.newExpiresAt}.`,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors du renouvellement de la licence.' });
  }
});

// ==========================================
// 3. PARAMÈTRES & GESTION DE L'ÉTABLISSEMENT
// ==========================================

api.get('/establishment/settings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const est: any = await getEstablishment(req.user!.establishment_id);
    if (!est) return res.status(404).json({ error: 'Établissement introuvable.' });
    if (typeof est.active_cycles === 'string') {
      try {
        est.active_cycles = JSON.parse(est.active_cycles);
      } catch {
        est.active_cycles = [];
      }
    }
    const subscription = await getSubscription(req.user!.establishment_id);
    res.json({ establishment: est, subscription });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur chargement paramètres.' });
  }
});

api.put('/establishment/settings', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, city, address, phone, email, motto, academicYear, activeCycles, logo_url } = req.body;
    const est: any = (await getEstablishment(req.user!.establishment_id)) || {};
    const updatedEst = {
      ...est,
      name,
      city,
      address,
      phone,
      email,
      motto,
      academic_year: academicYear,
      active_cycles: activeCycles || [],
      ...(logo_url !== undefined ? { logo_url: logo_url || null } : {}),
      updated_at: new Date().toISOString()
    };
    await setEstablishment(req.user!.establishment_id, updatedEst);

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'MODIFICATION_PARAMETRES_ECOLE', 'ESTABLISHMENT', req.user!.establishment_id, {
      name,
      academicYear,
    });

    res.json({ message: "Paramètres de l'établissement mis à jour avec succès." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour.' });
  }
});

// ==========================================
// 3.B. MODÈLES DE DOCUMENTS PERSONNALISABLES (ISOLATION STRICTE PAR ÉCOLE DANS FIRESTORE)
// ==========================================

// Récupération de la configuration du modèle pour un document donné
api.get('/document-templates/:docType', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const docType = req.params.docType as DocumentType;

    const validDocTypes: DocumentType[] = [
      'bulletin',
      'quittance',
      'fiche_paie',
      'situation_financiere',
      'certificat_scolarite',
      'liste_presence',
      'fiche_individuelle',
    ];

    if (!validDocTypes.includes(docType)) {
      return res.status(400).json({ error: `Type de document "${docType}" non pris en charge.` });
    }

    // Lecture directe et isolée dans Firestore pour cette école
    const storedConfig = await getSubcollectionDoc<any>(estId, 'document_templates', docType);

    if (storedConfig) {
      return res.json(storedConfig);
    }

    // Si aucun modèle n'a encore été configuré, générer les valeurs par défaut
    // basées UNIQUEMENT sur l'établissement actuel (jamais une autre école)
    const est = await getEstablishment(estId);
    const defaultConfig = getDefaultTemplateConfig(docType, est);

    res.json(defaultConfig);
  } catch (error: any) {
    console.error('Erreur /api/document-templates GET:', error);
    res.status(500).json({ error: error.message || 'Erreur lors du chargement du modèle de document.' });
  }
});

// Enregistrement de la personnalisation d'un modèle (STRICTEMENT RÉSERVÉ AU PROMOTEUR)
api.put('/document-templates/:docType', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Règle 9 : Seul le Promoteur peut modifier les modèles (erreur 403 pour tous les autres)
    if (req.user!.role !== 'PROMOTEUR') {
      return res.status(403).json({
        error: "Accès refusé (403) : Seul le Promoteur de l'établissement est habilité à modifier les modèles de documents officiels.",
      });
    }

    const estId = req.user!.establishment_id;
    const docType = req.params.docType as DocumentType;
    const incomingConfig = req.body;

    const validDocTypes: DocumentType[] = [
      'bulletin',
      'quittance',
      'fiche_paie',
      'situation_financiere',
      'certificat_scolarite',
      'liste_presence',
      'fiche_individuelle',
    ];

    if (!validDocTypes.includes(docType)) {
      return res.status(400).json({ error: `Type de document "${docType}" non pris en charge.` });
    }

    if (!incomingConfig || !incomingConfig.modelId) {
      return res.status(400).json({ error: 'Données de configuration du modèle incomplètes.' });
    }

    // Récupérer la version actuelle pour incrémenter
    const existing = await getSubcollectionDoc<any>(estId, 'document_templates', docType);
    const newVersion = (existing?.version || 1) + 1;
    const nowIso = new Date().toISOString();

    const configToSave = {
      ...incomingConfig,
      docType,
      version: newVersion,
      updatedAt: nowIso,
      updatedBy: req.user!.id,
    };

    // Stockage isolé dans Firestore: establishments/{estId}/document_templates/{docType}
    await setDocData(`establishments/${estId}/document_templates`, docType, configToSave);

    logAudit(
      estId,
      req.user!.id,
      req.user!.full_name,
      'MODIFICATION_MODELE_DOCUMENT',
      'DOCUMENT_TEMPLATE',
      docType,
      {
        docType,
        modelId: configToSave.modelId,
        version: newVersion,
        font: configToSave.styling?.fontFamily,
        primaryColor: configToSave.styling?.primaryColor,
      }
    );

    res.json({
      message: `Modèle pour "${docType}" enregistré avec succès (version ${newVersion}).`,
      config: configToSave,
    });
  } catch (error: any) {
    console.error('Erreur /api/document-templates PUT:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l’enregistrement du modèle.' });
  }
});

api.get('/audit-logs', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let logs = await listSubcollectionDocs(req.user!.establishment_id, 'audit_logs');
    if (!logs || logs.length === 0) {
      const allLogs = await listDocs('audit_logs_firestore');
      logs = (allLogs || []).filter((l: any) => l.establishment_id === req.user!.establishment_id);
    }
    logs.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json(logs.slice(0, 200));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des journaux d\'audit.' });
  }
});

// ==========================================
// 4. GESTION DES UTILISATEURS & PERSONNELS
// ==========================================

api.get('/users', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    let users = await listSubcollectionDocs<any>(estId, 'users');
    if (!users || users.length === 0) {
      const rootUsers = await listDocs<any>('users');
      users = (rootUsers || []).filter((u: any) => u.establishment_id === estId);
    }

    if (req.user!.role === 'DIRECTEUR_ETUDES') {
      users = (users || []).filter((u: any) => u.role === 'ENSEIGNANT');
      users.sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || ''));
    } else {
      users.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
    }

    const cleanList = users.map((u: any) => ({
      id: u.id,
      username: u.username,
      email: u.email || null,
      full_name: u.full_name,
      phone: u.phone || null,
      role: u.role,
      status: u.status || 'ACTIVE',
      created_at: u.created_at || null,
    }));

    res.json(cleanList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des utilisateurs.' });
  }
});

api.post('/users', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, email, password, fullName, phone, role } = req.body;

    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    // Interdiction formelle de créer ou d'usurper le rôle Développeur / ADMIN_GENERAL
    const ALLOWED_SCHOOL_ROLES = [
      'PROMOTEUR',
      'DIRECTEUR_GENERAL',
      'DIRECTEUR_ETUDES',
      'GESTIONNAIRE',
      'COMPTABLE',
      'SURVEILLANT',
      'ENSEIGNANT',
      'ELEVE',
      'PARENT',
    ];
    if (role === 'ADMIN_GENERAL' || !ALLOWED_SCHOOL_ROLES.includes(role)) {
      return res.status(403).json({
        error: "Action non autorisée. Le rôle Développeur / ADMIN_GENERAL est souverain et ne peut pas être créé au sein d'un établissement.",
      });
    }

    const estId = req.user!.establishment_id;

    // 1. Contrôle strict du plafond de membres du personnel selon la licence active dans Firestore
    const sub = await getSubscription(estId);
    const existingUsers = await listTenantUsers(estId);

    if (sub && !['ELEVE', 'PARENT'].includes(role)) {
      if (sub.status === 'SUSPENDED') {
        return res.status(403).json({ error: "La licence de cet établissement est suspendue. Impossible d'ajouter de nouveaux collaborateurs." });
      }
      const staffCount = (existingUsers || []).filter((u: any) => !['ELEVE', 'PARENT'].includes(u.role)).length;
      if (staffCount >= (sub.max_users || 150)) {
        return res.status(403).json({
          error: `Plafond de membres du personnel atteint pour la ${sub.formula_name || 'licence'} (${staffCount} / ${sub.max_users} personnels). Veuillez contacter le Gestionnaire d'application pour passer à une formule supérieure.`
        });
      }
    }

    // 2. Contrôle strict des permissions de création de compte
    if (req.user!.role === 'DIRECTEUR_ETUDES' && !['ENSEIGNANT', 'ELEVE', 'PARENT'].includes(role)) {
      return res.status(403).json({ error: 'Le Directeur des Études ne peut créer que des profils Enseignant, Élève ou Parent.' });
    }

    if (role === 'PROMOTEUR' && req.user!.role !== 'PROMOTEUR') {
      return res.status(403).json({ error: 'Seul un Promoteur peut créer un autre compte Promoteur.' });
    }

    // 3. Vérifier unicité du nom d'utilisateur dans cet établissement (Firestore)
    const cleanUsername = username.trim().toLowerCase();
    const existing = (existingUsers || []).find(
      (u: any) => (u.username || '').trim().toLowerCase() === cleanUsername
    );
    if (existing) {
      return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé dans cet établissement." });
    }

    const id = `USR-${role.slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
    const passHash = await hashPassword(password);

    const userDoc = {
      id,
      establishment_id: estId,
      username: cleanUsername,
      email: email ? email.trim().toLowerCase() : null,
      password_hash: passHash,
      full_name: fullName.trim(),
      phone: phone ? phone.trim() : null,
      role,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. Écriture obligatoire et confirmée dans Cloud Firestore
    await setTenantUser(estId, userDoc);

    // 5. Journal d'audit dans Firestore
    logAudit(estId, req.user!.id, req.user!.full_name, 'CREATION_COMPTE', 'USER', id, {
      username: cleanUsername,
      role,
      fullName: userDoc.full_name,
    });

    res.status(201).json({ message: 'Compte utilisateur créé avec succès.', userId: id, user: { id, username: cleanUsername, role, full_name: userDoc.full_name } });
  } catch (error: any) {
    console.error('Erreur création utilisateur Firestore:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la création du compte.' });
  }
});

api.put('/users/:id/status', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const targetUserId = req.params.id;
    const estId = req.user!.establishment_id;

    if (!['PROMOTEUR', 'DIRECTEUR_GENERAL'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Seuls le Promoteur et le Directeur Général peuvent réinitialiser un mot de passe ou désactiver un compte.' });
    }

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }

    const targetUser = await getDocData('users', targetUserId) || await getSubcollectionDoc(estId, 'users', targetUserId);
    if (!targetUser || targetUser.establishment_id !== estId) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    // On ne peut pas suspendre son propre compte
    if (targetUser.id === req.user!.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas suspendre votre propre compte.' });
    }

    const updatedUser = {
      ...targetUser,
      status,
      updated_at: new Date().toISOString(),
    };

    await setTenantUser(estId, updatedUser);

    logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_STATUT_COMPTE', 'USER', targetUserId, {
      status,
      targetUsername: targetUser.username,
    });

    res.json({ message: `Compte ${status === 'ACTIVE' ? 'activé' : 'suspendu'} avec succès.` });
  } catch (error: any) {
    console.error('Erreur statut utilisateur Firestore:', error);
    res.status(500).json({ error: error.message || 'Erreur lors du changement de statut.' });
  }
});

api.post('/users/:id/reset-password', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const estId = req.user!.establishment_id;

    if (!['PROMOTEUR', 'DIRECTEUR_GENERAL'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Seuls le Promoteur et le Directeur Général peuvent réinitialiser un mot de passe ou désactiver un compte.' });
    }

    const targetUser = await getDocData('users', targetUserId) || await getSubcollectionDoc(estId, 'users', targetUserId);
    if (!targetUser || targetUser.establishment_id !== estId) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const tempPassword = req.body.newPassword && req.body.newPassword.length >= 8
      ? req.body.newPassword
      : 'Eco' + Math.floor(100000 + Math.random() * 900000) + '!';

    const newHash = await hashPassword(tempPassword);
    const updatedUser = {
      ...targetUser,
      password_hash: newHash,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    };

    await setTenantUser(estId, updatedUser);

    logAudit(estId, req.user!.id, req.user!.full_name, 'REINITIALISATION_MOT_DE_PASSE', 'USER', targetUserId, {
      targetUsername: targetUser.username,
    });

    res.json({
      message: 'Mot de passe réinitialisé avec succès.',
      temporaryPassword: tempPassword,
      must_change_password: true,
    });
  } catch (error: any) {
    console.error('Erreur réinitialisation mot de passe Firestore:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la réinitialisation du mot de passe.' });
  }
});

// ==========================================
// 5. CYCLES, CLASSES, SÉRIES & MATIÈRES
// ==========================================

api.get('/academic/classes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [rawClasses, rawUsers, rawStudents] = await Promise.all([
      listSubcollectionDocs<any>(estId, 'classes'),
      listSubcollectionDocs<any>(estId, 'users'),
      listSubcollectionDocs<any>(estId, 'students'),
    ]);

    const userMap = new Map<string, string>();
    (rawUsers || []).forEach((u: any) => {
      if (u.id && u.full_name) userMap.set(u.id, u.full_name);
    });

    const studentCountMap = new Map<string, number>();
    (rawStudents || []).forEach((s: any) => {
      if (s.class_id && s.status !== 'ARCHIVE') {
        studentCountMap.set(s.class_id, (studentCountMap.get(s.class_id) || 0) + 1);
      }
    });

    const classes = (rawClasses || []).map((c: any) => ({
      ...c,
      main_teacher_name: c.main_teacher_id ? userMap.get(c.main_teacher_id) || null : null,
      student_count: studentCountMap.get(c.id) || 0,
    }));

    classes.sort((a, b) => {
      const cycleDiff = (a.cycle_code || '').localeCompare(b.cycle_code || '');
      if (cycleDiff !== 0) return cycleDiff;
      const levelDiff = (a.level_code || '').localeCompare(b.level_code || '');
      if (levelDiff !== 0) return levelDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    res.json(classes);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des classes.' });
  }
});

api.post('/academic/classes', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, cycleCode, levelCode, serieCode, section, room, capacity, mainTeacherId } = req.body;

    if (!cycleCode || !levelCode) {
      return res.status(400).json({ error: 'Cycle et niveau requis.' });
    }

    const trimmedSection = section ? String(section).trim() : null;
    const constructedName = `${levelCode}${serieCode ? ' ' + serieCode : ''}${trimmedSection ? ' ' + trimmedSection : ''}`.trim();
    const finalName = (name && String(name).trim()) || constructedName;

    // Récupérer l'année scolaire de l'établissement depuis Firestore
    const est: any = await getEstablishment(req.user!.establishment_id);
    const academicYear = est?.academic_year || '2026-2027';

    // Vérifier les doublons de classe dans Firestore pour la même année scolaire
    const existingClasses = await listSubcollectionDocs<any>(req.user!.establishment_id, 'classes');
    const existing = (existingClasses || []).find(
      (c: any) => c.academic_year === academicYear &&
        (c.name || '').trim().toLowerCase() === finalName.toLowerCase() &&
        (c.section || '').trim().toLowerCase() === (trimmedSection || '').toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ error: `La section ou classe "${finalName}" existe déjà pour l'année scolaire ${academicYear}.` });
    }

    // Validation des séries lycée
    let validatedSerie = null;
    if (cycleCode === 'LYCEE' && serieCode) {
      if (!OFFICIAL_LYCEE_SERIES.includes(serieCode)) {
        return res.status(400).json({ error: `La série ${serieCode} n'est pas reconnue au Congo-Brazzaville.` });
      }
      validatedSerie = serieCode;
    }

    const id = `CLS-${Date.now().toString(36).toUpperCase()}`;

    const classPayload = {
      id,
      establishment_id: req.user!.establishment_id,
      academic_year: academicYear,
      name: finalName,
      cycle_code: cycleCode,
      level_code: levelCode,
      serie_code: validatedSerie,
      section: trimmedSection,
      room: room || null,
      capacity: capacity || 40,
      main_teacher_id: mainTeacherId || null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/classes`,
      docId: id,
      operation: 'CREATE',
      payload: classPayload,
      sqliteWriter: () => {}
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'CREATION_CLASSE', 'CLASS', id, {
      name: finalName,
      section: trimmedSection,
      cycleCode,
      levelCode,
      serieCode: validatedSerie,
      syncStatus: dualResult.syncStatus,
    });

    res.json({ message: 'Classe créée avec succès.', classId: id, syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la création de la classe.' });
  }
});

api.put('/academic/classes/:id', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, section, room, capacity, mainTeacherId, status } = req.body;
    const trimmedSection = section !== undefined ? (section ? String(section).trim() : null) : undefined;

    const payload: any = {
      room: room || null,
      capacity: capacity || 40,
      main_teacher_id: mainTeacherId || null,
      status: status || 'ACTIVE',
      updated_at: new Date().toISOString(),
    };
    if (name) payload.name = String(name).trim();
    if (trimmedSection !== undefined) payload.section = trimmedSection;

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/classes`,
      docId: req.params.id,
      operation: 'UPDATE',
      payload,
      sqliteWriter: () => {}
    });

    res.json({ message: 'Classe mise à jour avec succès.', syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la modification de la classe.' });
  }
});

api.delete('/academic/classes/:id', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const students = await listSubcollectionDocs<any>(estId, 'students');
    const studentCount = (students || []).filter((s: any) => s.class_id === req.params.id).length;

    if (studentCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer cette classe car ${studentCount} élève(s) y sont actuellement rattaché(s). Veuillez d'abord les réaffecter.`,
      });
    }

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/classes`,
      docId: req.params.id,
      operation: 'DELETE',
      sqliteWriter: () => {}
    });

    res.json({ message: 'Classe supprimée avec succès.', syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la classe.' });
  }
});

// Référentiel des matières
api.get('/academic/subjects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const subjects = await listSubcollectionDocs<any>(estId, 'subjects');
    (subjects || []).sort((a: any, b: any) => {
      const cycleDiff = (a.cycle_code || '').localeCompare(b.cycle_code || '');
      if (cycleDiff !== 0) return cycleDiff;
      return (a.name || '').localeCompare(b.name || '');
    });
    res.json(subjects || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des matières.' });
  }
});

api.post('/academic/subjects', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name, cycleCode, defaultCoefficient } = req.body;
    if (!code || !name || !cycleCode) {
      return res.status(400).json({ error: 'Code, nom et cycle requis.' });
    }

    const estId = req.user!.establishment_id;
    const cleanCode = code.trim().toUpperCase();

    const existingList = await listSubcollectionDocs<any>(estId, 'subjects');
    const existing = (existingList || []).find((s: any) => (s.code || '').trim().toUpperCase() === cleanCode);
    if (existing) {
      return res.status(400).json({ error: `Une matière avec le code "${cleanCode}" existe déjà.` });
    }

    const id = `SUB-${cleanCode}-${Date.now().toString(36).toUpperCase()}`;
    const subjectPayload = {
      id,
      establishment_id: estId,
      schoolId: estId,
      code: cleanCode,
      name: name.trim(),
      cycle_code: cycleCode,
      default_coefficient: Number(defaultCoefficient) || 1.0,
      status: 'ACTIF',
      created_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/subjects`, id, subjectPayload);
    logAudit(estId, req.user!.id, req.user!.full_name, 'CREATION_MATIERE', 'ACADEMIC', id, { code: cleanCode, name: name.trim() });

    res.json({ message: 'Matière ajoutée avec succès.', subjectId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la création de la matière.' });
  }
});

api.get('/academic/classes/:id/subjects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const classId = req.params.id;

    const [rawClassSubjects, rawSubjects, rawUsers] = await Promise.all([
      listSubcollectionDocs<any>(estId, 'class_subjects'),
      listSubcollectionDocs<any>(estId, 'subjects'),
      listSubcollectionDocs<any>(estId, 'users'),
    ]);

    const subjectMap = new Map<string, any>();
    (rawSubjects || []).forEach((s: any) => {
      if (s.id) subjectMap.set(s.id, s);
    });

    const userMap = new Map<string, string>();
    (rawUsers || []).forEach((u: any) => {
      if (u.id && u.full_name) userMap.set(u.id, u.full_name);
    });

    const filtered = (rawClassSubjects || []).filter((cs: any) => cs.class_id === classId);

    const list = filtered.map((cs: any) => {
      const sub = subjectMap.get(cs.subject_id) || {};
      return {
        class_subject_id: cs.id,
        coefficient: cs.coefficient || 1.0,
        weekly_hours: cs.weekly_hours || 2.0,
        subject_id: cs.subject_id,
        code: sub.code || '',
        subject_name: sub.name || '',
        cycle_code: sub.cycle_code || '',
        teacher_id: cs.teacher_id || null,
        teacher_name: cs.teacher_id ? userMap.get(cs.teacher_id) || null : null,
      };
    });

    list.sort((a: any, b: any) => (a.subject_name || '').localeCompare(b.subject_name || ''));

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des matières attribuées.' });
  }
});

api.post('/academic/classes/:id/subjects', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subjectId, teacherId, coefficient, weeklyHours } = req.body;
    const classId = req.params.id;

    if (!subjectId) return res.status(400).json({ error: 'Matière requise.' });

    // Vérifier si une affectation existe déjà pour cette classe et cette matière dans Firestore
    const allClassSubjects = await listTenantDocs<any>(req.user!.establishment_id, 'class_subjects').catch(() => []);
    const existing = (allClassSubjects || []).find((cs: any) => cs.class_id === classId && cs.subject_id === subjectId);
    const id = existing?.id || `CS-${Date.now().toString(36).toUpperCase()}`;
    const op = existing ? 'UPDATE' : 'CREATE';

    const payload = {
      id,
      establishment_id: req.user!.establishment_id,
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId || null,
      coefficient: coefficient !== undefined ? Number(coefficient) : 1.0,
      weekly_hours: weeklyHours !== undefined ? Number(weeklyHours) : 2.0,
      updated_at: new Date().toISOString(),
    };

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/class_subjects`,
      docId: id,
      operation: op,
      payload,
      sqliteWriter: () => {}
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'AFFECTATION_MATIERE_CLASSE', 'CLASS_SUBJECT', id, {
      classId,
      subjectId,
      teacherId,
      syncStatus: dualResult.syncStatus,
    });

    res.json({ message: 'Matière et enseignant configurés avec succès pour cette classe.', syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    console.error('Erreur attribution matière:', error);
    res.status(500).json({ error: error.message || "Erreur lors de l'attribution de la matière." });
  }
});

// ==========================================
// 5.b. RÉFÉRENTIEL NATIONAL CONGO-BRAZZAVILLE (PARTIE I)
// ==========================================

api.get('/academic/pedagogical-references', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = CONGO_SERIES_CATALOG.map((s) => ({
      id: `REF-${s.code}`,
      serie_code: s.code,
      specialty_name: s.name,
      category: s.category,
      description: s.description,
      subjects_json: JSON.stringify(s.subjects),
    }));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement du référentiel national.' });
  }
});

api.post('/academic/pedagogical-references/import-to-school', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { referenceId, cycleCode } = req.body;
    const estId = req.user!.establishment_id;

    let candidateSubjects: { code: string; name: string; defaultCoef: number; cycleCode: string }[] = [];

    // 1. Extraction des matières selon referenceId
    if (referenceId && referenceId !== 'ALL' && referenceId !== 'REF-ALL' && referenceId !== 'REF-ALL-COL') {
      const cleanRef = referenceId.replace('REF-', '').replace('COL-', '').trim().toUpperCase();

      // Recherche dans la série Lycée
      const serie = CONGO_SERIES_CATALOG.find((s) => s.code.toUpperCase() === cleanRef);
      if (serie) {
        for (const sub of serie.subjects) {
          candidateSubjects.push({
            code: sub.code,
            name: sub.name,
            defaultCoef: sub.defaultCoef || 2.0,
            cycleCode: 'LYCEE',
          });
        }
      }

      // Recherche dans les classes du Collège
      const colClass = CONGO_COLLEGE_CATALOG.find((c) => c.code.toUpperCase() === cleanRef);
      if (colClass) {
        for (const sub of colClass.subjects) {
          candidateSubjects.push({
            code: sub.code,
            name: sub.name,
            defaultCoef: sub.defaultCoef || 2.0,
            cycleCode: 'COLLEGE',
          });
        }
      }
    }

    // 2. Si aucune matière spécifique trouvée ou si import global demandé
    if (candidateSubjects.length === 0) {
      const targetCycle = cycleCode || 'LYCEE';
      if (targetCycle === 'COLLEGE') {
        for (const colClass of CONGO_COLLEGE_CATALOG) {
          for (const sub of colClass.subjects) {
            candidateSubjects.push({
              code: sub.code,
              name: sub.name,
              defaultCoef: sub.defaultCoef || 2.0,
              cycleCode: 'COLLEGE',
            });
          }
        }
      } else if (targetCycle === 'LYCEE') {
        for (const serie of CONGO_SERIES_CATALOG) {
          for (const sub of serie.subjects) {
            candidateSubjects.push({
              code: sub.code,
              name: sub.name,
              defaultCoef: sub.defaultCoef || 2.0,
              cycleCode: 'LYCEE',
            });
          }
        }
      } else {
        // Tous les cycles
        for (const serie of CONGO_SERIES_CATALOG) {
          for (const sub of serie.subjects) {
            candidateSubjects.push({
              code: sub.code,
              name: sub.name,
              defaultCoef: sub.defaultCoef || 2.0,
              cycleCode: 'LYCEE',
            });
          }
        }
        for (const colClass of CONGO_COLLEGE_CATALOG) {
          for (const sub of colClass.subjects) {
            candidateSubjects.push({
              code: sub.code,
              name: sub.name,
              defaultCoef: sub.defaultCoef || 2.0,
              cycleCode: 'COLLEGE',
            });
          }
        }
      }
    }

    // 3. Déduplication des matières candidates par code
    const uniqueCandidatesMap = new Map<string, typeof candidateSubjects[0]>();
    for (const item of candidateSubjects) {
      const key = item.code.trim().toUpperCase();
      if (!uniqueCandidatesMap.has(key)) {
        uniqueCandidatesMap.set(key, item);
      }
    }
    const uniqueCandidates = Array.from(uniqueCandidatesMap.values());

    // 4. Lecture des matières existantes dans Firestore pour cet établissement
    const existingSubjects = await listSubcollectionDocs<any>(estId, 'subjects');
    const existingCodes = new Set((existingSubjects || []).map((s: any) => (s.code || '').trim().toUpperCase()));

    // 5. Utilisation d'un Batch Firestore pour écriture atomique sans aucun reste de SQLite
    const batch = db.batch();
    let writtenCount = 0;

    for (const sub of uniqueCandidates) {
      const cleanCode = sub.code.trim().toUpperCase();
      if (existingCodes.has(cleanCode)) {
        continue; // Évite les doublons si réimport
      }

      const id = `SUB-${cleanCode}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const docRef = db.collection(`establishments/${estId}/subjects`).doc(id);

      const payload = {
        id,
        establishment_id: estId,
        schoolId: estId,
        code: cleanCode,
        name: sub.name.trim(),
        cycle_code: sub.cycleCode || cycleCode || 'LYCEE',
        default_coefficient: Number(sub.defaultCoef || 2.0),
        status: 'ACTIF',
        created_at: new Date().toISOString(),
      };

      batch.set(docRef, payload, { merge: true });
      existingCodes.add(cleanCode);
      writtenCount++;
    }

    // 6. Ne renvoie "succès" qu'après le commit effectif dans Firestore
    if (writtenCount > 0) {
      await batch.commit();
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'IMPORT_REFERENTIEL_NATIONAL', 'ACADEMIC', referenceId || 'ALL', { importedCount: writtenCount });

    res.json({
      message: writtenCount > 0
        ? `${writtenCount} matière(s) nationale(s) importée(s) avec succès.`
        : `Toutes les matières sélectionnées existent déjà dans le répertoire d'établissement (${existingSubjects.length} matière(s) au total).`,
      count: writtenCount,
    });
  } catch (error: any) {
    console.error('Erreur import matières nationales:', error);
    res.status(500).json({ error: error.message || "Erreur lors de l'importation du référentiel national." });
  }
});

// ==========================================
// 6. GESTION COMPLÈTE DES ÉLÈVES
// ==========================================

api.get('/students', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { classId, status, search } = req.query;

    const [rawStudents, rawClasses, rawClassSubjects] = await Promise.all([
      listSubcollectionDocs<any>(estId, 'students'),
      listSubcollectionDocs<any>(estId, 'classes'),
      listSubcollectionDocs<any>(estId, 'class_subjects'),
    ]);

    const classMap = new Map<string, any>();
    (rawClasses || []).forEach((c: any) => {
      if (c.id) classMap.set(c.id, c);
    });

    let allowedClassIds: Set<string> | null = null;
    if (req.user!.role === 'ENSEIGNANT') {
      allowedClassIds = new Set<string>();
      (rawClassSubjects || []).forEach((cs: any) => {
        if (cs.teacher_id === req.user!.id && cs.class_id) {
          allowedClassIds!.add(cs.class_id);
        }
      });
      (rawClasses || []).forEach((c: any) => {
        if (c.main_teacher_id === req.user!.id && c.id) {
          allowedClassIds!.add(c.id);
        }
      });
    }

    let students = (rawStudents || []).map((s: any) => {
      const cls = classMap.get(s.class_id) || {};
      return {
        ...s,
        class_name: cls.name || null,
        level_code: cls.level_code || null,
        cycle_code: cls.cycle_code || null,
        serie_code: cls.serie_code || null,
      };
    });

    if (allowedClassIds !== null) {
      students = students.filter((s: any) => s.class_id && allowedClassIds!.has(s.class_id));
    }

    if (classId) {
      students = students.filter((s: any) => s.class_id === classId);
    }

    if (status) {
      students = students.filter((s: any) => s.status === status);
    } else {
      students = students.filter((s: any) => s.status !== 'ARCHIVE');
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      students = students.filter((s: any) =>
        (s.first_name && s.first_name.toLowerCase().includes(q)) ||
        (s.last_name && s.last_name.toLowerCase().includes(q)) ||
        (s.post_name && s.post_name.toLowerCase().includes(q)) ||
        (s.matricule && s.matricule.toLowerCase().includes(q)) ||
        (s.guardian_name && s.guardian_name.toLowerCase().includes(q)) ||
        (s.guardian_phone && s.guardian_phone.includes(q))
      );
    }

    students.sort((a: any, b: any) => {
      const lastDiff = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastDiff !== 0) return lastDiff;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });

    res.json(students);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des élèves.' });
  }
});

api.get('/students/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const studentId = req.params.id;

    const rawStudent = await getSubcollectionDoc<any>(estId, 'students', studentId);
    if (!rawStudent) {
      return res.status(404).json({ error: 'Élève introuvable dans Firestore.' });
    }

    const [rawClasses, payments, attendances, incidents, feeStructures, tariffPlans] = await Promise.all([
      listSubcollectionDocs<any>(estId, 'classes'),
      listSubcollectionDocs<any>(estId, 'payments'),
      listSubcollectionDocs<any>(estId, 'student_attendances'),
      listSubcollectionDocs<any>(estId, 'disciplinary_incidents'),
      listSubcollectionDocs<any>(estId, 'fee_structures'),
      listSubcollectionDocs<any>(estId, 'school_tariff_plans'),
    ]);

    const cls = (rawClasses || []).find((c: any) => c.id === rawStudent.class_id) || {};
    const student = {
      ...rawStudent,
      class_name: cls.name || null,
      level_code: cls.level_code || null,
      cycle_code: cls.cycle_code || null,
      serie_code: cls.serie_code || null,
    };

    const studentPayments = (payments || [])
      .filter((p: any) => p.student_id === studentId)
      .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));

    const studentAttendances = (attendances || [])
      .filter((a: any) => a.student_id === studentId)
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 30);

    const studentIncidents = (incidents || [])
      .filter((i: any) => i.student_id === studentId)
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

    const clsObj = student.class_id ? (rawClasses || []).find((c: any) => c.id === student.class_id) : null;
    const finSummary = computeStudentFinancialSummary(
      student,
      clsObj,
      feeStructures,
      tariffPlans,
      studentPayments
    );

    res.json({
      student,
      payments: studentPayments,
      attendances: studentAttendances,
      incidents: studentIncidents,
      financialSituation: finSummary,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors du chargement de la fiche élève.' });
  }
});

export async function linkOrUpdateGuardianAndParent(
  estId: string,
  studentId: string,
  guardianData: {
    name: string;
    phone: string;
    email?: string | null;
    relation?: string | null;
    address?: string | null;
  }
) {
  const normPhone = normalizePhone(guardianData.phone || '');
  const cleanEmail = guardianData.email ? guardianData.email.trim().toLowerCase() : null;
  const guardianName = (guardianData.name || '').trim();

  // 1. Chercher un tuteur existant dans Firestore STRICTEMENT DANS CET ÉTABLISSEMENT
  const rawGuardians = await listTenantDocs<any>(estId, 'guardians').catch(() => []);
  let matchingG = (rawGuardians || []).find((g: any) =>
    g.establishment_id === estId && (
      (normPhone && normalizePhone(g.phone) === normPhone) ||
      (cleanEmail && (g.email || '').trim().toLowerCase() === cleanEmail)
    )
  );

  let guardianId: string;
  let guardianStudentIds: string[] = [];

  if (matchingG) {
    guardianId = matchingG.id;
    guardianStudentIds = Array.isArray(matchingG.studentIds) ? [...matchingG.studentIds] : [];
    if (!guardianStudentIds.includes(studentId)) {
      guardianStudentIds.push(studentId);
    }
  } else {
    guardianId = `GRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    guardianStudentIds = [studentId];
  }

  // 2. Chercher ou créer le compte utilisateur Parent (role = PARENT) STRICTEMENT DANS CET ÉTABLISSEMENT
  const rawUsers = await listTenantUsers(estId).catch(() => []);
  let parentUser = (rawUsers || []).find((u: any) =>
    u.establishment_id === estId &&
    u.role === 'PARENT' && (
      (normPhone && normalizePhone(u.phone || u.username) === normPhone) ||
      (cleanEmail && (u.email || '').trim().toLowerCase() === cleanEmail) ||
      (matchingG && matchingG.userId === u.id)
    )
  );

  let tempPassword = '';
  let isNewParent = false;

  if (!parentUser) {
    isNewParent = true;
    tempPassword = 'Parent2026!';
    const passHash = await hashPassword(tempPassword);
    const parentUserId = `USR-PAR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    parentUser = {
      id: parentUserId,
      establishment_id: estId,
      username: (normPhone || cleanEmail || `parent_${Date.now()}`).toLowerCase(),
      full_name: guardianName || 'Tuteur Légal',
      phone: normPhone || guardianData.phone,
      email: cleanEmail || null,
      role: 'PARENT',
      studentIds: [studentId],
      status: 'ACTIVE',
      password_hash: passHash,
      must_change_password: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await setTenantUser(estId, parentUser);
  } else {
    // Parent existant dans cet établissement : ajouter l'élève sans doublons
    const pStudentIds: string[] = Array.isArray(parentUser.studentIds) ? [...parentUser.studentIds] : [];
    if (!pStudentIds.includes(studentId)) {
      pStudentIds.push(studentId);
      parentUser = {
        ...parentUser,
        establishment_id: estId,
        studentIds: pStudentIds,
        updated_at: new Date().toISOString(),
      };
      await setTenantUser(estId, parentUser);
    }
  }

  // 3. Mettre à jour la fiche tuteur avec userId et studentIds
  const guardianPayload = {
    id: guardianId,
    establishment_id: estId,
    name: guardianName || parentUser.full_name,
    phone: normPhone || guardianData.phone,
    email: cleanEmail || null,
    address: guardianData.address || null,
    userId: parentUser.id,
    studentIds: guardianStudentIds,
    created_at: matchingG ? matchingG.created_at || new Date().toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await setGuardian(estId, guardianId, guardianPayload);

  // 4. Mettre à jour la fiche élève avec guardianIds et parent_user_id
  const existingStudent = await getStudent(estId, studentId);
  if (existingStudent) {
    const sGIds: string[] = Array.isArray(existingStudent.guardianIds) ? [...existingStudent.guardianIds] : [];
    if (!sGIds.includes(guardianId)) sGIds.push(guardianId);

    const updatedStudent = {
      ...existingStudent,
      establishment_id: estId,
      guardianIds: sGIds,
      parent_user_id: parentUser.id,
      guardian_name: guardianName || existingStudent.guardian_name,
      guardian_phone: normPhone || existingStudent.guardian_phone,
      guardian_email: cleanEmail || existingStudent.guardian_email || null,
      parent_activated: true,
      updated_at: new Date().toISOString(),
    };
    await setStudent(estId, updatedStudent);
  }

  return {
    guardianId,
    parentUserId: parentUser.id,
    parentUser,
    isNewParent,
    tempPassword,
  };
}

export async function getAuthorizedChildIdsForParent(
  estId: string,
  parentUserId: string,
  userPhone?: string,
  userEmail?: string
): Promise<string[]> {
  const userPhoneNorm = userPhone ? normalizePhone(userPhone) : '';
  const parentEmail = userEmail ? userEmail.trim().toLowerCase() : '';

  const [rawGuardians, rawStudents, rawUsers] = await Promise.all([
    listTenantDocs<any>(estId, 'guardians').catch(() => []),
    listTenantDocs<any>(estId, 'students').catch(() => []),
    listTenantUsers(estId).catch(() => []),
  ]);

  const parentUser = (rawUsers || []).find((u: any) => u.id === parentUserId && u.establishment_id === estId);
  const guardianDocs = (rawGuardians || []).filter(
    (g: any) => g.establishment_id === estId && (
      g.userId === parentUserId ||
      (userPhoneNorm && normalizePhone(g.phone) === userPhoneNorm) ||
      (parentEmail && (g.email || '').trim().toLowerCase() === parentEmail)
    )
  );

  const childIdSet = new Set<string>();

  // 1. studentIds du compte utilisateur Parent
  const userStudentIds = (parentUser as any)?.studentIds;
  if (Array.isArray(userStudentIds)) {
    userStudentIds.forEach((sid: string) => childIdSet.add(sid));
  }

  // 2. studentIds des fiches tuteurs
  guardianDocs.forEach((g: any) => {
    if (Array.isArray(g.studentIds)) {
      g.studentIds.forEach((sid: string) => childIdSet.add(sid));
    }
  });

  // 3. Liaison Firestore parent_students
  try {
    const parentStudents = await listTenantDocs<any>(estId, 'parent_students').catch(() => []);
    (parentStudents || []).filter((ps: any) => ps.establishment_id === estId && ps.parent_user_id === parentUserId).forEach((r: any) => childIdSet.add(r.student_id));
  } catch {}

  // 4. Élèves dont le champ parent_user_id, téléphone, email ou guardianIds correspond
  (rawStudents || []).forEach((s: any) => {
    if (s.establishment_id !== estId) return;
    const matchParentUser = s.parent_user_id === parentUserId;
    const matchPhone = userPhoneNorm && normalizePhone(s.guardian_phone) === userPhoneNorm;
    const matchEmail = parentEmail && (s.guardian_email || '').trim().toLowerCase() === parentEmail;
    const matchGuardianId = guardianDocs.some((g: any) => Array.isArray(s.guardianIds) && s.guardianIds.includes(g.id));

    if (matchParentUser || matchPhone || matchEmail || matchGuardianId) {
      childIdSet.add(s.id);
    }
  });

  return Array.from(childIdSet);
}

// Fonction utilitaire pour créer et lier automatiquement les comptes d'accès Élève et Tuteur
async function provisionAccountsForStudent(estId: string, studentId: string) {
  const student = await getStudent(estId, studentId);
  if (!student) throw new Error("Dossier élève introuvable.");

  const existingUsers = (await listTenantUsers(estId)) || [];
  const tenantUsers = existingUsers.filter((u: any) => u.establishment_id === estId);
  const normGuardianPhone = normalizePhone(student.guardian_phone || '');
  const cleanGuardianEmail = (student.guardian_email || '').trim().toLowerCase();

  // 1. Compte Élève (Nom d'utilisateur = Matricule)
  const cleanMatricule = (student.matricule || '').trim().toLowerCase();
  let studentUser = tenantUsers.find((u: any) =>
    (u.student_id && u.student_id === studentId) ||
    (u.role === 'ELEVE' && (u.username || '').trim().toLowerCase() === cleanMatricule)
  );

  let studentTempPass: string | null = null;
  if (!studentUser) {
    studentTempPass = 'Eleve2026!';
    const passHash = await hashPassword(studentTempPass);
    const userId = `USR-ELE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    studentUser = {
      id: userId,
      establishment_id: estId,
      username: cleanMatricule,
      full_name: `${student.first_name} ${student.last_name}`,
      role: 'ELEVE',
      student_id: studentId,
      status: 'ACTIVE',
      password_hash: passHash,
      must_change_password: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await setTenantUser(estId, studentUser);
  } else {
    if (!studentUser.student_id) {
      studentUser = { ...studentUser, establishment_id: estId, student_id: studentId, updated_at: new Date().toISOString() };
      await setTenantUser(estId, studentUser);
    }
  }

  // 2. Compte Parent / Tuteur
  // Recherche d'un tuteur déjà existant STRICTEMENT DANS CET ÉTABLISSEMENT pour éviter tout doublon inter-écoles
  let parentUser = tenantUsers.find((u: any) => {
    if (u.role !== 'PARENT' || u.establishment_id !== estId) return false;
    const uPhoneNorm = normalizePhone(u.phone || u.username || '');
    const uEmail = (u.email || '').trim().toLowerCase();

    const matchPhone = normGuardianPhone && uPhoneNorm && (uPhoneNorm === normGuardianPhone || uPhoneNorm.endsWith(normGuardianPhone) || normGuardianPhone.endsWith(uPhoneNorm));
    const matchEmail = cleanGuardianEmail && uEmail && (uEmail === cleanGuardianEmail);
    const matchStudentArray = Array.isArray(u.studentIds) && u.studentIds.includes(studentId);

    return matchPhone || matchEmail || matchStudentArray;
  });

  let parentTempPass: string | null = null;
  let isNewParentAccount = false;

  if (!parentUser) {
    isNewParentAccount = true;
    parentTempPass = 'Parent2026!';
    const passHash = await hashPassword(parentTempPass);
    const userId = `USR-PAR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const parentUsername = normGuardianPhone || cleanGuardianEmail || `${student.matricule}_parent`;

    parentUser = {
      id: userId,
      establishment_id: estId,
      username: parentUsername.toLowerCase(),
      full_name: student.guardian_name,
      phone: student.guardian_phone || null,
      email: student.guardian_email || null,
      role: 'PARENT',
      studentIds: [studentId],
      status: 'ACTIVE',
      password_hash: passHash,
      must_change_password: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await setTenantUser(estId, parentUser);
  } else {
    // Parent déjà existant dans cette école : lier ce nouvel enfant à la liste de ses enfants
    const existingStudentIds: string[] = Array.isArray(parentUser.studentIds) ? parentUser.studentIds : [];
    if (!existingStudentIds.includes(studentId)) {
      const updatedStudentIds = [...existingStudentIds, studentId];
      parentUser = {
        ...parentUser,
        establishment_id: estId,
        studentIds: updatedStudentIds,
        updated_at: new Date().toISOString(),
      };
      await setTenantUser(estId, parentUser);
    }
  }

  // Association dans la collection Firestore parent_students
  try {
    const psId = `PS-${parentUser.id}-${studentId}`;
    await setDocData(`establishments/${estId}/parent_students`, psId, {
      id: psId,
      establishment_id: estId,
      parent_user_id: parentUser.id,
      student_id: studentId,
      relationship: student.guardian_relation || 'Parent',
      created_at: new Date().toISOString()
    });
  } catch {}

  // Synchronisation avec la fiche tuteur dans la collection guardians de cet établissement
  let linkedGuardianIds: string[] = Array.isArray(student.guardianIds) ? [...student.guardianIds] : [];
  try {
    const rawGuardians = await listTenantDocs<any>(estId, 'guardians');
    const matchingG = (rawGuardians || []).find((g: any) =>
      g.establishment_id === estId && (
        (normGuardianPhone && normalizePhone(g.phone) === normGuardianPhone) ||
        (cleanGuardianEmail && (g.email || '').trim().toLowerCase() === cleanGuardianEmail) ||
        (student.guardianIds && Array.isArray(student.guardianIds) && student.guardianIds.includes(g.id))
      )
    );

    if (matchingG) {
      const gStudentIds = Array.isArray(matchingG.studentIds) ? matchingG.studentIds : [];
      if (!gStudentIds.includes(studentId) || matchingG.userId !== parentUser.id) {
        const newStudentIds = Array.from(new Set([...gStudentIds, studentId]));
        await setGuardian(estId, matchingG.id, {
          ...matchingG,
          establishment_id: estId,
          userId: parentUser.id,
          studentIds: newStudentIds,
          updated_at: new Date().toISOString(),
        });
      }
      if (!linkedGuardianIds.includes(matchingG.id)) {
        linkedGuardianIds.push(matchingG.id);
      }
    }
  } catch (gErr) {
    console.warn('Erreur lors de la synchronisation de la fiche tuteur:', gErr);
  }

  // Mettre à jour l'élève avec les liaisons utilisateur & gardien
  const updatedStudent = {
    ...student,
    establishment_id: estId,
    user_id: studentUser.id,
    parent_user_id: parentUser.id,
    guardianIds: linkedGuardianIds,
    parent_activated: true,
    student_activated: true,
    updated_at: new Date().toISOString(),
  };
  await setStudent(estId, updatedStudent);

  return {
    studentAccount: {
      username: studentUser.username,
      fullName: studentUser.full_name,
      role: 'ELEVE',
      temporaryPassword: studentTempPass || '•••••••• (Mot de passe existant conservé)',
      isNew: !!studentTempPass,
    },
    parentAccount: {
      username: parentUser.username || parentUser.phone || parentUser.email,
      fullName: parentUser.full_name,
      phone: parentUser.phone,
      email: parentUser.email,
      role: 'PARENT',
      temporaryPassword: parentTempPass || '•••••••• (Compte tuteur de cet établissement conservé)',
      isNew: isNewParentAccount,
      linkedStudentsCount: (parentUser.studentIds || [studentId]).length,
    },
  };
}

api.post('/students', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // SÉPARATION STRICTE DES POUVOIRS (Prompt Maître Unique Eco GES)
    // Le Promoteur définit la politique et supervise mais ne peut pas effectuer d'inscriptions opérationnelles directes
    if (req.user!.role === 'PROMOTEUR') {
      return res.status(403).json({
        error: "Séparation des pouvoirs : Le Promoteur supervise l'établissement et définit la politique tarifaire, mais ne peut pas inscrire directement des élèves. Cette opération opérationnelle relève exclusivement du secrétariat, de la surveillance ou de la direction des études."
      });
    }

    const {
      firstName,
      lastName,
      postName,
      gender,
      birthDate,
      birthPlace,
      address,
      guardianName,
      guardianPhone,
      guardianEmail,
      guardianRelation,
      classId,
      notes,
      photoData,
    } = req.body;

    if (!firstName || !lastName || !gender || !birthDate || !guardianName || !guardianPhone) {
      return res.status(400).json({ error: 'Veuillez renseigner les informations obligatoires de l’élève et du responsable.' });
    }

    const estId = req.user!.establishment_id;
    const est: any = await getEstablishment(estId);
    const academicYear = est?.academic_year || '2026-2027';

    // Contrôle strict du plafond d'effectif élèves selon la licence active
    const sub = await getSubscription(estId);
    const existingStudents = await listStudents(estId);
    const activeStudentCount = (existingStudents || []).filter((s: any) => s.status !== 'ARCHIVE' && s.status !== 'ARCHIVED').length;

    if (sub) {
      if (sub.status === 'SUSPENDED') {
        return res.status(403).json({ error: "La licence de cet établissement est suspendue. Impossible d'inscrire de nouveaux élèves." });
      }
      if (activeStudentCount >= (sub.max_students || 1500)) {
        return res.status(403).json({
          error: `Plafond d'élèves atteint pour la ${sub.formula_name || 'licence active'} (${activeStudentCount} / ${sub.max_students} élèves). Veuillez contacter le Gestionnaire d'application pour passer à une formule supérieure.`
        });
      }
    }

    // Génération automatique du matricule unique pour l'établissement via transaction Firestore (CODEECOLE-ANNÉESCOLAIRE-NUMÉRO)
    const schoolCode = est?.code || 'ECO';
    const matricule = await generateNextStudentMatricule(estId, schoolCode, academicYear);

    const studentId = `STU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Persistance dans Cloud Firestore
    const studentPayload = {
      id: studentId,
      establishment_id: estId,
      matricule,
      first_name: firstName.trim(),
      last_name: lastName.trim().toUpperCase(),
      post_name: postName ? postName.trim() : null,
      gender,
      birth_date: birthDate,
      birth_place: birthPlace || null,
      address: address || null,
      guardian_name: guardianName.trim(),
      guardian_phone: normalizePhone(guardianPhone) || guardianPhone.trim(),
      guardian_email: guardianEmail || null,
      guardian_relation: guardianRelation || 'Parent',
      guardianIds: [],
      is_financial_responsible: true,
      parent_activated: true,
      student_activated: true,
      class_id: classId || null,
      academic_year: academicYear,
      status: 'INSCRIT',
      notes: notes || null,
      photo_data: photoData || null,
      enrollment_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setStudent(estId, studentPayload);

    // 1. Liaison automatique centralisée du Tuteur et du Compte Parent
    const guardianLinkResult = await linkOrUpdateGuardianAndParent(estId, studentId, {
      name: guardianName,
      phone: guardianPhone,
      email: guardianEmail,
      relation: guardianRelation,
      address,
    });

    // 2. Création / Activation des comptes d'accès Élève et Parent
    let accountsInfo: any = null;
    try {
      accountsInfo = await provisionAccountsForStudent(estId, studentId);
    } catch (accErr) {
      console.warn('Erreur lors de la création automatique des comptes d accès:', accErr);
    }

    // 3. Vérification automatique post-inscription
    let warning: string | null = null;
    try {
      const repairCheck = await executeParentStudentLinksRepair(estId, false);
      if (repairCheck.unlinkedCount > 0) {
        warning = `Avertissement : ${repairCheck.unlinkedCount} élève(s) dans l'établissement restent sans liaison tuteur validée.`;
      }
    } catch (rErr) {
      console.warn('Erreur vérification automatique post-inscription:', rErr);
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'INSCRIPTION_ELEVE', 'STUDENT', studentId, {
      matricule,
      name: `${lastName} ${firstName}`,
      classId,
      guardianId: guardianLinkResult.guardianId,
    });

    res.json({
      message: 'Élève inscrit avec succès.',
      studentId,
      matricule,
      guardianId: guardianLinkResult.guardianId,
      accounts: accountsInfo,
      warning,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erreur lors de l'inscription de l'élève." });
  }
});

// Endpoint pour générer ou récupérer à tout moment les identifiants de comptes d'accès
api.post('/students/:id/provision-accounts', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE', 'SURVEILLANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const studentId = req.params.id;
    const accounts = await provisionAccountsForStudent(estId, studentId);
    res.json({
      message: 'Comptes d accès élève et tuteur configurés avec succès.',
      accounts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la configuration des comptes d accès.' });
  }
});

// Génération de code d'activation à usage unique pour Parent ou Élève (Valable 7 jours)
api.post('/students/:id/activation-code', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'SURVEILLANT', 'GESTIONNAIRE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const studentId = req.params.id;
    const { accountType } = req.body; // 'PARENT' | 'ELEVE'

    const student = await getStudent(estId, studentId);
    if (!student || student.establishment_id !== estId) {
      return res.status(404).json({ error: 'Élève introuvable.' });
    }

    const code = 'ACT-' + Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const est: any = await getEstablishment(estId);
    const estName = est?.name || 'Établissement Scolaire';

    if (accountType === 'ELEVE') {
      const updatedStudent = {
        ...student,
        student_activation_code: code,
        student_activation_code_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      };
      await setStudent(estId, updatedStudent);

      const shareText = `Bonjour ${student.first_name}, voici ton code d'activation pour accéder à l'application ${estName} : ${code} (Valable 7 jours). Connecte-toi avec ton matricule ${student.matricule}.`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

      logAudit(estId, req.user!.id, req.user!.full_name, 'GENERATION_CODE_ACTIVATION_ELEVE', 'STUDENT', studentId, { code });

      return res.json({
        message: 'Code d\'activation élève généré avec succès.',
        code,
        expiresAt,
        shareText,
        whatsappUrl,
        accountType: 'ELEVE',
        matricule: student.matricule,
      });
    } else {
      const updatedStudent = {
        ...student,
        parent_activation_code: code,
        parent_activation_code_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      };
      await setStudent(estId, updatedStudent);

      const shareText = `Bonjour M./Mme ${student.guardian_name}, voici votre code d'activation parent pour l'établissement ${estName} : ${code} (Valable 7 jours). Il permet de suivre la scolarité de ${student.first_name} ${student.last_name}.`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

      logAudit(estId, req.user!.id, req.user!.full_name, 'GENERATION_CODE_ACTIVATION_PARENT', 'STUDENT', studentId, { code });

      return res.json({
        message: 'Code d\'activation parent généré avec succès.',
        code,
        expiresAt,
        shareText,
        whatsappUrl,
        accountType: 'PARENT',
        guardianName: student.guardian_name,
        guardianPhone: student.guardian_phone,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la génération du code d\'activation.' });
  }
});

export async function executeParentStudentLinksRepair(estId: string, dryRun: boolean) {
  const students = await listTenantDocs<any>(estId, 'students').catch(() => []);
  const guardians = await listTenantDocs<any>(estId, 'guardians').catch(() => []);
  const users = await listTenantUsers(estId).catch(() => []);

  const parentUsers = (users || []).filter((u: any) => u.establishment_id === estId && u.role === 'PARENT');
  const report: any[] = [];
  let repairedCount = 0;
  let unlinkedCount = 0;

  for (const student of students) {
    if (student.establishment_id && student.establishment_id !== estId) continue;
    const phoneNorm = normalizePhone(student.guardian_phone || '');
    const emailNorm = (student.guardian_email || '').trim().toLowerCase();

    // 1. Trouver la fiche tuteur correspondante DANS CET ÉTABLISSEMENT
    let matchingGuardian = (guardians || []).find((g: any) =>
      g.establishment_id === estId && (
        (phoneNorm && normalizePhone(g.phone) === phoneNorm) ||
        (emailNorm && (g.email || '').trim().toLowerCase() === emailNorm) ||
        (student.guardianIds && Array.isArray(student.guardianIds) && student.guardianIds.includes(g.id))
      )
    );

    // 2. Trouver le compte utilisateur parent correspondant DANS CET ÉTABLISSEMENT
    let matchingParentUser = parentUsers.find((u: any) =>
      u.establishment_id === estId && (
        u.id === student.parent_user_id ||
        (phoneNorm && normalizePhone(u.phone || u.username) === phoneNorm) ||
        (emailNorm && (u.email || '').trim().toLowerCase() === emailNorm) ||
        (Array.isArray(u.studentIds) && u.studentIds.includes(student.id))
      )
    );

    const changes: string[] = [];

    // Si l'élève avait un parent_user_id d'un autre établissement, le nettoyer
    if (student.parent_user_id && !matchingParentUser) {
      const isExternalUser = (users || []).some((u: any) => u.id === student.parent_user_id && u.establishment_id !== estId);
      if (isExternalUser) {
        changes.push(`Suppression de la liaison inter-écoles erronée vers l'utilisateur parent [${student.parent_user_id}]`);
      }
    }

    if (matchingGuardian) {
      // Vérification guardianIds sur l'élève
      const studentGIds = Array.isArray(student.guardianIds) ? [...student.guardianIds] : [];
      if (!studentGIds.includes(matchingGuardian.id)) {
        studentGIds.push(matchingGuardian.id);
        changes.push(`Ajout guardianIds [${matchingGuardian.id}] sur la fiche élève`);
      }

      // Vérification studentIds sur le tuteur
      const gStudentIds = Array.isArray(matchingGuardian.studentIds) ? [...matchingGuardian.studentIds] : [];
      if (!gStudentIds.includes(student.id)) {
        gStudentIds.push(student.id);
        changes.push(`Ajout élève [${student.id}] dans la fiche tuteur ${matchingGuardian.id}`);
      }

      // Vérification userId sur le tuteur
      let newGUserId = matchingGuardian.userId;
      if (matchingParentUser && matchingGuardian.userId !== matchingParentUser.id) {
        newGUserId = matchingParentUser.id;
        changes.push(`Liaison userId [${matchingParentUser.id}] sur la fiche tuteur ${matchingGuardian.id}`);
      }

      if (!dryRun && changes.length > 0) {
        await setGuardian(estId, matchingGuardian.id, {
          ...matchingGuardian,
          establishment_id: estId,
          userId: newGUserId,
          studentIds: gStudentIds,
          updated_at: new Date().toISOString(),
        });

        await setStudent(estId, {
          ...student,
          establishment_id: estId,
          guardianIds: studentGIds,
          parent_user_id: matchingParentUser ? matchingParentUser.id : (student.parent_user_id && matchingParentUser ? student.parent_user_id : null),
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      unlinkedCount++;
    }

    if (matchingParentUser) {
      const pStudentIds = Array.isArray(matchingParentUser.studentIds) ? [...matchingParentUser.studentIds] : [];
      if (!pStudentIds.includes(student.id)) {
        pStudentIds.push(student.id);
        changes.push(`Ajout élève [${student.id}] dans le compte parent ${matchingParentUser.id}`);
        if (!dryRun) {
          await setTenantUser(estId, {
            ...matchingParentUser,
            establishment_id: estId,
            studentIds: pStudentIds,
            updated_at: new Date().toISOString(),
          });
        }
      }

      if (!dryRun && (!student.parent_user_id || student.parent_user_id !== matchingParentUser.id)) {
        await setStudent(estId, {
          ...student,
          establishment_id: estId,
          parent_user_id: matchingParentUser.id,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (changes.length > 0) {
      repairedCount++;
      report.push({
        studentId: student.id,
        matricule: student.matricule,
        studentName: `${student.first_name} ${student.last_name}`,
        guardianName: matchingGuardian?.name || student.guardian_name,
        changes,
      });
    }
  }

  return {
    dryRun,
    totalStudents: students.length,
    repairedCount,
    unlinkedCount,
    report,
  };
}

// Endpoint de réparation administrative des liaisons parents-élèves
api.post('/academic/repair-parent-student-links', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { dryRun } = req.body; // true = rapport seul, false = exécution effective

    const result = await executeParentStudentLinksRepair(estId, !!dryRun);

    if (!dryRun) {
      logAudit(estId, req.user!.id, req.user!.full_name, 'REPARATION_LIAISONS_PARENTS_ELEVES', 'SYSTEM', estId, {
        repairedCount: result.repairedCount,
      });
    }

    res.json({
      message: dryRun
        ? `Analyse terminée (Dry-Run) : ${result.repairedCount} liaison(s) à corriger identifiée(s).`
        : `Réparation appliquée avec succès : ${result.repairedCount} liaison(s) corrigée(s) dans Firestore.`,
      ...result,
    });
  } catch (error: any) {
    console.error('Erreur réparation liaisons parents-élèves:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la réparation des liaisons.' });
  }
});

export interface MatriculeMigrationReportItem {
  studentId: string;
  studentName: string;
  establishmentId: string;
  establishmentName: string;
  schoolCode: string;
  oldMatricule: string;
  newMatricule: string;
  academicYear: string;
}

export async function runStudentMatriculeMigration(dryRun: boolean = false): Promise<MatriculeMigrationReportItem[]> {
  const allEsts = await listEstablishments();
  const report: MatriculeMigrationReportItem[] = [];

  for (const est of allEsts) {
    if (!est || !est.id || est.code === 'ECO-HQ') continue;

    const estId = est.id;
    const schoolCode = est.code || 'ECO';

    // Lecture des élèves
    const rawStudents = await listSubcollectionDocs<any>(estId, 'students').catch(() => []);
    const rootStudents = await queryDocs<any>('students', 'establishment_id', '==', estId).catch(() => []);
    const studentMap = new Map<string, any>();
    for (const s of [...rawStudents, ...rootStudents]) {
      if (s && s.id) studentMap.set(s.id, s);
    }
    const students = Array.from(studentMap.values());

    // Lecture des utilisateurs de cet établissement
    const rawTenantUsers = await listTenantUsers(estId).catch(() => []);

    // Filtrer les élèves au format obsolète
    const legacyStudents = students.filter((s: any) => {
      const mat = (s.matricule || '').trim();
      if (!mat) return true;
      const cleanSchoolCodePattern = schoolCode.replace(/[^A-Z0-9-]/gi, '');
      const isNewPattern = new RegExp(`^${cleanSchoolCodePattern}-\\d{4}\\/\\d{2}-\\d{4}$`, 'i').test(mat);
      return !isNewPattern;
    });

    if (legacyStudents.length === 0) continue;

    // Trier les élèves par date d'inscription / création
    legacyStudents.sort((a, b) => (a.created_at || a.enrollment_date || a.id || '').localeCompare(b.created_at || b.enrollment_date || b.id || ''));

    for (const student of legacyStudents) {
      const oldMatricule = student.matricule || 'SANS_MATRICULE';
      const academicYear = student.academic_year || est.academic_year || '2026-2027';

      let newMatricule = '';
      if (dryRun) {
        const formattedYear = formatAcademicYearForMatricule(academicYear);
        newMatricule = `${schoolCode}-${formattedYear}-PREVIEW`;
      } else {
        newMatricule = await generateNextStudentMatricule(estId, schoolCode, academicYear);
      }

      report.push({
        studentId: student.id,
        studentName: `${student.last_name || ''} ${student.first_name || ''}`.trim(),
        establishmentId: estId,
        establishmentName: est.name || '',
        schoolCode,
        oldMatricule,
        newMatricule,
        academicYear,
      });

      if (!dryRun) {
        // 1. Mise à jour de la fiche élève
        const updatedStudent = {
          ...student,
          establishment_id: estId,
          matricule: newMatricule,
          updated_at: new Date().toISOString(),
        };
        await setStudent(estId, updatedStudent);

        // 2. Mise à jour du compte de connexion utilisateur élève
        const oldCleanMat = oldMatricule.trim().toLowerCase();
        const newCleanMat = newMatricule.trim().toLowerCase();

        const studentUsers = rawTenantUsers.filter((u: any) =>
          u.role === 'ELEVE' && (
            (u.student_id && u.student_id === student.id) ||
            (u.username && u.username.trim().toLowerCase() === oldCleanMat)
          )
        );

        for (const uDoc of studentUsers) {
          const updatedUser = {
            ...uDoc,
            establishment_id: estId,
            username: newCleanMat,
            student_id: student.id,
            updated_at: new Date().toISOString(),
          };
          await setTenantUser(estId, updatedUser);
        }
      }
    }
  }

  return report;
}

api.post('/students/migrate-matricules', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dryRun } = req.body;
    const report = await runStudentMatriculeMigration(!!dryRun);
    res.json({
      message: dryRun
        ? `Migration des matricules analysée (Dry-Run) : ${report.length} élève(s) à migrer.`
        : `Migration des matricules terminée avec succès : ${report.length} élève(s) migré(s).`,
      count: report.length,
      report,
    });
  } catch (error: any) {
    console.error('Erreur migration des matricules:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la migration des matricules.' });
  }
});

api.post('/migration/run-matricules', authenticateToken, requireRole(['ADMIN_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dryRun } = req.body;
    const report = await runStudentMatriculeMigration(!!dryRun);
    res.json({
      message: `Migration des matricules terminée. ${report.length} élève(s) migré(s).`,
      count: report.length,
      report,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la migration des matricules.' });
  }
});


api.put('/students/:id', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const existing = await getStudent(estId, req.params.id);
    if (!existing || existing.establishment_id !== estId) {
      return res.status(404).json({ error: 'Élève introuvable.' });
    }

    const {
      firstName,
      lastName,
      postName,
      gender,
      birthDate,
      birthPlace,
      address,
      guardianName,
      guardianPhone,
      guardianEmail,
      guardianRelation,
      classId,
      status,
      notes,
      photoData,
    } = req.body;

    const updated = {
      ...existing,
      first_name: firstName !== undefined ? firstName.trim() : existing.first_name,
      last_name: lastName !== undefined ? lastName.trim().toUpperCase() : existing.last_name,
      post_name: postName !== undefined ? (postName ? postName.trim() : null) : existing.post_name,
      gender: gender !== undefined ? gender : existing.gender,
      birth_date: birthDate !== undefined ? birthDate : existing.birth_date,
      birth_place: birthPlace !== undefined ? birthPlace : existing.birth_place,
      address: address !== undefined ? address : existing.address,
      guardian_name: guardianName !== undefined ? guardianName.trim() : existing.guardian_name,
      guardian_phone: guardianPhone !== undefined ? guardianPhone.trim() : existing.guardian_phone,
      guardian_email: guardianEmail !== undefined ? (guardianEmail ? guardianEmail.trim() : null) : existing.guardian_email,
      guardian_relation: guardianRelation !== undefined ? guardianRelation : existing.guardian_relation,
      class_id: classId !== undefined ? classId : existing.class_id,
      status: status !== undefined ? status : existing.status,
      notes: notes !== undefined ? notes : existing.notes,
      photo_data: photoData || existing.photo_data || null,
      updated_at: new Date().toISOString(),
    };

    await setStudent(estId, updated);

    // Synchronisation automatique des liaisons tuteur et compte parent
    if (updated.guardian_phone || updated.guardian_email) {
      try {
        await linkOrUpdateGuardianAndParent(estId, req.params.id, {
          name: updated.guardian_name,
          phone: updated.guardian_phone,
          email: updated.guardian_email,
          relation: updated.guardian_relation,
          address: updated.address,
        });
      } catch (lErr) {
        console.warn('Erreur lors de la mise à jour des liaisons tuteur:', lErr);
      }
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_ELEVE', 'STUDENT', req.params.id);

    res.json({ message: 'Dossier élève mis à jour.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour.' });
  }
});

api.post('/students/:id/transfer', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'GESTIONNAIRE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const existing = await getStudent(estId, req.params.id);
    if (!existing || existing.establishment_id !== estId) {
      return res.status(404).json({ error: 'Élève introuvable.' });
    }

    const { reason, destinationSchool } = req.body;
    const updated = {
      ...existing,
      status: 'TRANSFERE',
      transfer_reason: `Transféré vers : ${destinationSchool || 'Autre établissement'}. Motif : ${reason || 'Non précisé'}`,
      class_id: null,
      updated_at: new Date().toISOString(),
    };

    await setStudent(estId, updated);

    logAudit(estId, req.user!.id, req.user!.full_name, 'TRANSFERT_ELEVE', 'STUDENT', req.params.id, {
      destinationSchool,
      reason,
    });

    res.json({ message: 'Transfert de l’élève enregistré avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors du transfert de l’élève.' });
  }
});

api.delete('/students/:id', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'GESTIONNAIRE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const student = await getStudent(estId, req.params.id);
    if (!student || student.establishment_id !== estId) {
      return res.status(404).json({ error: 'Élève introuvable.' });
    }

    const updated = {
      ...student,
      status: 'ARCHIVE',
      updated_at: new Date().toISOString(),
    };

    await setStudent(estId, updated);

    logAudit(estId, req.user!.id, req.user!.full_name, 'ARCHIVAGE_ELEVE', 'STUDENT', req.params.id, {
      matricule: student.matricule,
      name: `${student.last_name} ${student.first_name}`,
    });

    res.json({ message: 'Élève archivé avec traçabilité complète.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’archivage.' });
  }
});

// ==========================================
// 7. ENSEIGNANTS, HEURES & EMPLOIS DU TEMPS
// ==========================================

api.get('/teachers', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [users, classSubjects, subjects, classes, courseLogs] = await Promise.all([
      listTenantUsers(estId),
      listClassSubjects(estId),
      listSubjects(estId),
      listClasses(estId),
      listLessonLogs(estId),
    ]);

    const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
    const classMap = new Map((classes || []).map((c: any) => [c.id, c]));

    const teachers = (users || []).filter((u: any) => u.role === 'ENSEIGNANT');

    const formatted = teachers.map((u: any) => {
      const myCS = (classSubjects || []).filter((cs: any) => cs.teacher_id === u.id);
      const myLogs = (courseLogs || []).filter((l: any) => l.teacher_id === u.id);

      const assignedSubjectNames = Array.from(new Set(myCS.map((cs: any) => subjectMap.get(cs.subject_id)).filter(Boolean))).join(',');
      const assignedClasses = myCS.map((cs: any) => classMap.get(cs.class_id)).filter(Boolean);
      const assignedClassNames = Array.from(new Set(assignedClasses.map((c: any) => c.name))).join(',');
      const assignedCycles = Array.from(new Set(assignedClasses.map((c: any) => c.cycle_code))).filter(Boolean).join(',');
      const classesCount = new Set(myCS.map((cs: any) => cs.class_id)).size;
      const totalWeeklyHours = myCS.reduce((acc: number, curr: any) => acc + (Number(curr.weekly_hours) || 0), 0);
      const totalHoursDone = myLogs.reduce((acc: number, curr: any) => acc + (Number(curr.hours_done) || 0), 0);

      let lastName = u.last_name;
      let firstName = u.first_name;
      if (!lastName || !firstName) {
        const parts = (u.full_name || '').trim().split(' ');
        lastName = parts[0] || 'Enseignant';
        firstName = parts.slice(1).join(' ') || parts[0] || '';
      }

      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        first_name: firstName,
        last_name: lastName,
        email: u.email || null,
        phone: u.phone || null,
        status: u.status || 'ACTIVE',
        assigned_subjects: assignedSubjectNames || null,
        assigned_classes: assignedClassNames || null,
        assigned_cycles: assignedCycles || null,
        classes_count: classesCount,
        total_weekly_hours: totalWeeklyHours,
        total_hours_done: totalHoursDone,
      };
    });

    formatted.sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || ''));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des enseignants.' });
  }
});

// Affectation directe d'une matière et d'une classe à un enseignant
api.post('/teachers/:id/assignments', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teacherId = req.params.id;
    const { classId, subjectId, coefficient, weeklyHours } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({ error: 'Classe et matière obligatoires.' });
    }

    const allClassSubjects = await listTenantDocs<any>(req.user!.establishment_id, 'class_subjects').catch(() => []);
    const existing = (allClassSubjects || []).find((cs: any) => cs.class_id === classId && cs.subject_id === subjectId);
    const id = existing?.id || `CS-${Date.now().toString(36).toUpperCase()}`;
    const op = existing ? 'UPDATE' : 'CREATE';

    const payload = {
      id,
      establishment_id: req.user!.establishment_id,
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId,
      coefficient: coefficient !== undefined ? Number(coefficient) : 1.0,
      weekly_hours: weeklyHours !== undefined ? Number(weeklyHours) : 2.0,
      updated_at: new Date().toISOString(),
    };

    await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/class_subjects`,
      docId: id,
      operation: op,
      payload,
      sqliteWriter: () => {}
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'AFFECTATION_ENSEIGNANT', 'CLASS_SUBJECT', id, {
      teacherId,
      classId,
      subjectId,
    });

    res.json({ message: 'Affectation de matière et classe enregistrée avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’affectation.' });
  }
});

// Retrait d'une affectation d'enseignant
api.delete('/teachers/:id/assignments/:classSubjectId', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classSubjectId } = req.params;
    const estId = req.user!.establishment_id;
    await updateDocData(`establishments/${estId}/class_subjects`, classSubjectId, {
      teacher_id: null,
      updated_at: new Date().toISOString(),
    });
    res.json({ message: 'Affectation retirée avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du retrait de l’affectation.' });
  }
});

// ==========================================
// EMPLOIS DU TEMPS DES COURS (MULTI-RÔLES & SÉCURISÉ)
// ==========================================

api.get('/academic/schedules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, teacherId, dayOfWeek, status, studentId } = req.query;
    const userRole = req.user!.role;
    const estId = req.user!.establishment_id;
    const isManager = ['DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'ADMIN_GENERAL'].includes(userRole);

    const [rawSchedules, classes, subjects, users, students, parentRels] = await Promise.all([
      listSchedules(estId),
      listClasses(estId),
      listSubjects(estId),
      listTenantUsers(estId),
      listStudents(estId),
      listParentStudents(estId),
    ]);

    const classMap = new Map((classes || []).map((c: any) => [c.id, c]));
    const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s]));
    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    let schedules = (rawSchedules || []).map((ts: any) => {
      const cls = classMap.get(ts.class_id);
      const sub = subjectMap.get(ts.subject_id);
      const u = userMap.get(ts.teacher_id);
      return {
        ...ts,
        class_name: cls?.name || null,
        cycle_code: cls?.cycle_code || null,
        level_code: cls?.level_code || null,
        serie_code: cls?.serie_code || null,
        subject_name: sub?.name || null,
        subject_code: sub?.code || null,
        teacher_name: u?.full_name || null,
        teacher_username: u?.username || null,
        is_published: ts.is_published !== undefined ? ts.is_published : 1,
      };
    });

    if (!isManager) {
      schedules = schedules.filter((s: any) => Number(s.is_published) === 1);
    } else if (status === 'PUBLISHED') {
      schedules = schedules.filter((s: any) => Number(s.is_published) === 1);
    } else if (status === 'DRAFT') {
      schedules = schedules.filter((s: any) => Number(s.is_published) === 0);
    }

    if (userRole === 'ENSEIGNANT') {
      if (teacherId && String(teacherId) !== String(req.user!.id)) {
        return res.status(403).json({ error: "Accès refusé : Seuls vos propres créneaux d'emploi du temps sont accessibles." });
      }
      schedules = schedules.filter((s: any) => String(s.teacher_id) === String(req.user!.id));
    } else if (userRole === 'ELEVE') {
      const myStu = (students || []).find((s: any) => s.id === (req.user!.student_id || req.user!.id) || s.matricule === req.user!.username);
      if (myStu && myStu.class_id) {
        schedules = schedules.filter((s: any) => s.class_id === myStu.class_id);
      } else {
        return res.json([]);
      }
    } else if (userRole === 'PARENT') {
      let targetChildId = studentId as string;
      if (!targetChildId) {
        const firstRel = (parentRels || []).find((p: any) => p.parent_user_id === req.user!.id);
        if (firstRel) targetChildId = firstRel.student_id;
      }
      if (targetChildId) {
        const child = (students || []).find((s: any) => s.id === targetChildId);
        if (child && child.class_id) {
          schedules = schedules.filter((s: any) => s.class_id === child.class_id);
        } else {
          return res.json([]);
        }
      } else {
        return res.json([]);
      }
    } else {
      if (classId) schedules = schedules.filter((s: any) => s.class_id === classId);
      if (teacherId) schedules = schedules.filter((s: any) => s.teacher_id === teacherId);
    }

    if (dayOfWeek) {
      schedules = schedules.filter((s: any) => Number(s.day_of_week) === Number(dayOfWeek));
    }

    schedules.sort((a: any, b: any) => {
      const dayDiff = (Number(a.day_of_week) || 0) - (Number(b.day_of_week) || 0);
      if (dayDiff !== 0) return dayDiff;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des emplois du temps.' });
  }
});

// Journal d'audit des emplois du temps (100% Cloud Firestore)
api.get('/academic/schedules/audits', authenticateToken, requireRole(['DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const allAudits = await listSubcollectionDocs<any>(estId, 'audit_logs').catch(() => []);
    const audits = (allAudits || [])
      .filter((a: any) => a.entity_type === 'SCHEDULE')
      .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 60);
    res.json(audits);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération du journal d’audit des emplois du temps.' });
  }
});

// Création d'un créneau (STRICTEMENT RÉSERVÉ au Directeur Général et au Directeur des Études - 100% Firestore)
api.post('/academic/schedules', authenticateToken, requireRole(['DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, teacherId, subjectId, dayOfWeek, startTime, endTime, room, isPublished } = req.body;

    if (!classId || !teacherId || !subjectId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ error: 'Classe, enseignant, matière, jour et créneau horaire obligatoires.' });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ error: 'L’heure de début doit être strictement antérieure à l’heure de fin.' });
    }

    const estId = req.user!.establishment_id;
    const day = Number(dayOfWeek);

    const [allSchedules, allClasses, allSubjects, allUsers] = await Promise.all([
      listSchedules(estId),
      listClasses(estId),
      listSubjects(estId),
      listTenantUsers(estId)
    ]);
    const classMap = new Map((allClasses || []).map((c: any) => [c.id, c.name]));
    const subjectMap = new Map((allSubjects || []).map((s: any) => [s.id, s.name]));
    const userMap = new Map((allUsers || []).map((u: any) => [u.id, u.full_name]));

    const isOverlap = (ts: any) => Number(ts.day_of_week) === day && !(ts.end_time <= startTime || ts.start_time >= endTime);

    // 1. Détection de conflit enseignant
    const teacherConflict = (allSchedules || []).find((ts: any) => ts.teacher_id === teacherId && isOverlap(ts));
    if (teacherConflict) {
      return res.status(409).json({
        error: `Conflit enseignant : Cet enseignant est déjà programmé pour le cours de "${subjectMap.get(teacherConflict.subject_id) || 'Matière'}" en "${classMap.get(teacherConflict.class_id) || 'Classe'}" le même jour de ${teacherConflict.start_time} à ${teacherConflict.end_time}.`,
        conflictType: 'TEACHER',
      });
    }

    // 2. Détection de conflit classe
    const classConflict = (allSchedules || []).find((ts: any) => ts.class_id === classId && isOverlap(ts));
    if (classConflict) {
      return res.status(409).json({
        error: `Conflit de classe : Cette classe a déjà un cours de "${subjectMap.get(classConflict.subject_id) || 'Matière'}" avec ${userMap.get(classConflict.teacher_id) || 'Enseignant'} de ${classConflict.start_time} à ${classConflict.end_time}.`,
        conflictType: 'CLASS',
      });
    }

    // 3. Détection de conflit de salle (si une salle est spécifiée)
    if (room && typeof room === 'string' && room.trim().length > 0) {
      const roomClean = room.trim().toLowerCase();
      const roomConflict = (allSchedules || []).find((ts: any) => ts.room && ts.room.trim().toLowerCase() === roomClean && isOverlap(ts));
      if (roomConflict) {
        return res.status(409).json({
          error: `Conflit de salle : La salle "${room.trim()}" est déjà réservée par le cours de "${subjectMap.get(roomConflict.subject_id) || 'Matière'}" (${classMap.get(roomConflict.class_id) || 'Classe'} avec ${userMap.get(roomConflict.teacher_id) || 'Enseignant'}) de ${roomConflict.start_time} à ${roomConflict.end_time}.`,
          conflictType: 'ROOM',
        });
      }
    }

    const id = `SCH-${Date.now().toString(36).toUpperCase()}`;
    const pubVal = isPublished === false ? 0 : 1;
    const nowIso = new Date().toISOString();

    const payload = {
      id,
      establishment_id: estId,
      class_id: classId,
      teacher_id: teacherId,
      subject_id: subjectId,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      room: room ? room.trim() : null,
      is_published: pubVal,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await executeDualWrite({
      establishmentId: estId,
      collectionPath: `establishments/${estId}/teacher_schedules`,
      docId: id,
      operation: 'CREATE',
      payload,
      sqliteWriter: () => {}
    });

    logAudit(estId, req.user!.id, req.user!.full_name, 'CREATION_CRENEAU_HORAIRE', 'SCHEDULE', id, {
      classId,
      teacherId,
      subjectId,
      day,
      startTime,
      endTime,
      room: payload.room,
      isPublished: pubVal === 1,
    });

    res.json({ message: 'Créneau horaire ajouté avec succès.', scheduleId: id, schedule: payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la création du créneau horaire.' });
  }
});

// Modification d'un créneau (STRICTEMENT RÉSERVÉ au Directeur Général et au Directeur des Études - 100% Firestore)
api.put('/academic/schedules/:id', authenticateToken, requireRole(['DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { classId, teacherId, subjectId, dayOfWeek, startTime, endTime, room, isPublished } = req.body;
    const estId = req.user!.establishment_id;

    const allSchedules = await listSchedules(estId);
    const existing = (allSchedules || []).find((s: any) => s.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Créneau horaire introuvable.' });
    }

    const cId = classId || existing.class_id;
    const tId = teacherId || existing.teacher_id;
    const sId = subjectId || existing.subject_id;
    const day = dayOfWeek !== undefined ? Number(dayOfWeek) : existing.day_of_week;
    const sTime = startTime || existing.start_time;
    const eTime = endTime || existing.end_time;
    const rm = room !== undefined ? (room ? room.trim() : null) : existing.room;
    const pubVal = isPublished !== undefined ? (isPublished ? 1 : 0) : (existing.is_published ?? 1);

    if (sTime >= eTime) {
      return res.status(400).json({ error: 'L’heure de début doit être strictement antérieure à l’heure de fin.' });
    }

    const [allClasses, allSubjects, allUsers] = await Promise.all([
      listClasses(estId),
      listSubjects(estId),
      listTenantUsers(estId)
    ]);
    const classMap = new Map((allClasses || []).map((c: any) => [c.id, c.name]));
    const subjectMap = new Map((allSubjects || []).map((s: any) => [s.id, s.name]));
    const userMap = new Map((allUsers || []).map((u: any) => [u.id, u.full_name]));

    const isOverlap = (ts: any) => ts.id !== id && Number(ts.day_of_week) === day && !(ts.end_time <= sTime || ts.start_time >= eTime);

    // 1. Détection conflit enseignant
    const teacherConflict = (allSchedules || []).find((ts: any) => ts.teacher_id === tId && isOverlap(ts));
    if (teacherConflict) {
      return res.status(409).json({
        error: `Conflit enseignant : Cet enseignant est déjà programmé pour le cours de "${subjectMap.get(teacherConflict.subject_id) || 'Matière'}" en "${classMap.get(teacherConflict.class_id) || 'Classe'}" de ${teacherConflict.start_time} à ${teacherConflict.end_time}.`,
        conflictType: 'TEACHER',
      });
    }

    // 2. Détection conflit classe
    const classConflict = (allSchedules || []).find((ts: any) => ts.class_id === cId && isOverlap(ts));
    if (classConflict) {
      return res.status(409).json({
        error: `Conflit de classe : Cette classe a déjà un cours de "${subjectMap.get(classConflict.subject_id) || 'Matière'}" avec ${userMap.get(classConflict.teacher_id) || 'Enseignant'} de ${classConflict.start_time} à ${classConflict.end_time}.`,
        conflictType: 'CLASS',
      });
    }

    // 3. Détection conflit de salle
    if (rm && rm.length > 0) {
      const roomClean = rm.trim().toLowerCase();
      const roomConflict = (allSchedules || []).find((ts: any) => ts.room && ts.room.trim().toLowerCase() === roomClean && isOverlap(ts));
      if (roomConflict) {
        return res.status(409).json({
          error: `Conflit de salle : La salle "${rm}" est déjà réservée par le cours de "${subjectMap.get(roomConflict.subject_id) || 'Matière'}" (${classMap.get(roomConflict.class_id) || 'Classe'}) de ${roomConflict.start_time} à ${roomConflict.end_time}.`,
          conflictType: 'ROOM',
        });
      }
    }

    const nowIso = new Date().toISOString();
    const payload = {
      id,
      establishment_id: estId,
      class_id: cId,
      teacher_id: tId,
      subject_id: sId,
      day_of_week: day,
      start_time: sTime,
      end_time: eTime,
      room: rm,
      is_published: pubVal,
      updated_at: nowIso,
    };

    await executeDualWrite({
      establishmentId: estId,
      collectionPath: `establishments/${estId}/teacher_schedules`,
      docId: id,
      operation: 'UPDATE',
      payload,
      sqliteWriter: () => {}
    });

    logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_CRENEAU_HORAIRE', 'SCHEDULE', id, {
      classId: cId,
      teacherId: tId,
      day,
      sTime,
      eTime,
      room: rm,
      isPublished: pubVal === 1,
    });

    res.json({ message: 'Créneau horaire mis à jour avec succès.', schedule: payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la modification du créneau.' });
  }
});

// Publication ou mise en brouillon des emplois du temps (DG et DE - 100% Firestore)
api.post('/academic/schedules/publish', authenticateToken, requireRole(['DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, isPublished } = req.body;
    const estId = req.user!.establishment_id;
    const pubVal = isPublished === false ? 0 : 1;
    const nowIso = new Date().toISOString();

    const allSchedules = await listSchedules(estId);
    const affected = (allSchedules || []).filter((s: any) => !classId || s.class_id === classId);

    for (const item of affected) {
      await updateDocData(`establishments/${estId}/teacher_schedules`, item.id, {
        is_published: pubVal,
        updated_at: nowIso
      });
    }

    const action = pubVal === 1 ? 'PUBLICATION_EMPLOI_TEMPS' : 'DEPUBLICATION_EMPLOI_TEMPS';
    logAudit(estId, req.user!.id, req.user!.full_name, action, 'SCHEDULE', classId || 'ALL', {
      classId: classId || 'ALL_CLASSES',
      isPublished: pubVal === 1,
      affectedCount: affected.length,
    });

    res.json({
      message: pubVal === 1
        ? 'Emploi du temps publié avec succès ! Il est désormais consultable par les enseignants, élèves, parents et surveillants.'
        : 'Emploi du temps basculé en statut Brouillon. Seuls le DG et le DE peuvent désormais le consulter.',
      affectedCount: affected.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la publication de l’emploi du temps.' });
  }
});

// Suppression d'un créneau (STRICTEMENT RÉSERVÉ au Directeur Général et au Directeur des Études - 100% Firestore)
api.delete('/academic/schedules/:id', authenticateToken, requireRole(['DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const estId = req.user!.establishment_id;

    await deleteDocData(`establishments/${estId}/teacher_schedules`, id);

    logAudit(estId, req.user!.id, req.user!.full_name, 'SUPPRESSION_CRENEAU_HORAIRE', 'SCHEDULE', id);
    res.json({ message: 'Créneau supprimé de l’emploi du temps.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la suppression du créneau.' });
  }
});

api.get('/teachers/my-assignments', authenticateToken, requireRole(['ENSEIGNANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [allClassSubjects, allClasses, allSubjects] = await Promise.all([
      listClassSubjects(estId),
      listClasses(estId),
      listSubjects(estId)
    ]);

    const classMap = new Map((allClasses || []).map((c: any) => [c.id, c]));
    const subjectMap = new Map((allSubjects || []).map((s: any) => [s.id, s]));

    const myAssignments = (allClassSubjects || [])
      .filter((cs: any) => cs.teacher_id === req.user!.id)
      .map((cs: any) => {
        const cls = classMap.get(cs.class_id) || {};
        const subj = subjectMap.get(cs.subject_id) || {};
        return {
          class_id: cs.class_id,
          class_name: cls.name || 'Classe',
          level_code: cls.level_code || null,
          cycle_code: cls.cycle_code || null,
          serie_code: cls.serie_code || null,
          subject_id: cs.subject_id,
          subject_name: subj.name || cs.subject_name || 'Matière',
          subject_code: subj.code || cs.subject_code || '',
          coefficient: cs.coefficient !== undefined ? Number(cs.coefficient) : 1.0,
          weekly_hours: cs.weekly_hours !== undefined ? Number(cs.weekly_hours) : 2.0
        };
      })
      .sort((a: any, b: any) => (a.class_name || '').localeCompare(b.class_name || '') || (a.subject_name || '').localeCompare(b.subject_name || ''));

    res.json(myAssignments);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors du chargement des affectations.' });
  }
});

api.get('/teachers/course-logs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [rawLogs, users, classes, subjects] = await Promise.all([
      listLessonLogs(estId),
      listTenantUsers(estId),
      listClasses(estId),
      listSubjects(estId),
    ]);

    const userMap = new Map((users || []).map((u: any) => [u.id, u.full_name]));
    const classMap = new Map((classes || []).map((c: any) => [c.id, c.name]));
    const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));

    let logs = (rawLogs || []).map((l: any) => ({
      ...l,
      teacher_name: userMap.get(l.teacher_id) || null,
      class_name: classMap.get(l.class_id) || null,
      subject_name: subjectMap.get(l.subject_id) || null,
    }));

    if (req.user!.role === 'ENSEIGNANT') {
      logs = logs.filter((l: any) => l.teacher_id === req.user!.id);
    }

    logs.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    res.json(logs.slice(0, 100));
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des cahiers de textes.' });
  }
});

api.post('/teachers/course-logs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId, classId, subjectId, date, hoursDone, status, topic, remarks } = req.body;
    const actualTeacherId = req.user!.role === 'ENSEIGNANT' ? req.user!.id : (teacherId || req.user!.id);

    if (!classId || !subjectId || !date || hoursDone === undefined) {
      return res.status(400).json({ error: 'Classe, matière, date et heures requises.' });
    }

    const estId = req.user!.establishment_id;
    const id = `LOG-H-${Date.now().toString(36).toUpperCase()}`;

    const payload = {
      id,
      establishment_id: estId,
      teacher_id: actualTeacherId,
      class_id: classId,
      subject_id: subjectId,
      date,
      hours_done: Number(hoursDone),
      status: status || 'EFFECTUE',
      topic: topic || null,
      remarks: remarks || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await setDocData(`establishments/${estId}/teacher_course_logs`, id, payload);

    res.json({ message: 'Heures de cours enregistrées avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’enregistrement.' });
  }
});

// ==========================================
// 8. NOTES, ÉVALUATIONS & BULLETINS
// ==========================================

api.get('/evaluations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, subjectId, term } = req.query;
    const estId = req.user!.establishment_id;

    const [rawEvals, classes, subjects, users, grades, students, classSubjects] = await Promise.all([
      listEvaluations(estId),
      listClasses(estId),
      listSubjects(estId),
      listTenantUsers(estId),
      listGrades(estId),
      listStudents(estId),
      listClassSubjects(estId),
    ]);

    const classMap = new Map((classes || []).map((c: any) => [c.id, c.name]));
    const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s]));
    const userMap = new Map((users || []).map((u: any) => [u.id, u.full_name]));

    // Teacher subject assignments
    const teacherSubjectIds = new Set(
      (classSubjects || []).filter((cs: any) => cs.teacher_id === req.user!.id).map((cs: any) => cs.subject_id)
    );

    let evals = (rawEvals || []).map((e: any) => {
      const sub = subjectMap.get(e.subject_id);
      const evalGrades = (grades || []).filter((g: any) => g.evaluation_id === e.id);
      const classStudents = (students || []).filter((stu: any) => stu.class_id === e.class_id && stu.status !== 'ARCHIVE');

      return {
        ...e,
        class_name: classMap.get(e.class_id) || null,
        subject_name: sub?.name || null,
        subject_code: sub?.code || null,
        created_by_name: userMap.get(e.created_by) || null,
        graded_students_count: evalGrades.length,
        total_students_count: classStudents.length,
      };
    });

    if (req.user!.role === 'ENSEIGNANT') {
      evals = evals.filter((e: any) => e.created_by === req.user!.id || teacherSubjectIds.has(e.subject_id));
    }

    if (classId) evals = evals.filter((e: any) => e.class_id === classId);
    if (subjectId) evals = evals.filter((e: any) => e.subject_id === subjectId);
    if (term) evals = evals.filter((e: any) => e.term === term);

    evals.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

    res.json(evals);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des évaluations.' });
  }
});

api.post('/evaluations', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'ENSEIGNANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, subjectId, term, evalType, title, date, maxScore, coefficient } = req.body;

    if (!classId || !subjectId || !term || !evalType || !title || !date) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être renseignés.' });
    }

    const est: any = await getEstablishment(req.user!.establishment_id);
    const academicYear = est?.academic_year || '2026-2027';

    const id = `EVAL-${Date.now().toString(36).toUpperCase()}`;

    // Persistance directe et unique dans Cloud Firestore
    const evalPayload = {
      id,
      establishment_id: req.user!.establishment_id,
      class_id: classId,
      subject_id: subjectId,
      academic_year: academicYear,
      term,
      eval_type: evalType,
      title: title.trim(),
      date,
      max_score: maxScore || 20.0,
      coefficient: coefficient || 1.0,
      is_locked: 0,
      created_by: req.user!.id,
      created_at: new Date().toISOString(),
    };
    await setEvaluation(req.user!.establishment_id, evalPayload);

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'CREATION_EVALUATION', 'EVALUATION', id, {
      title,
      classId,
      term,
      evalType,
    });

    res.json({ message: 'Évaluation créée avec succès.', evaluationId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la création de l’évaluation.' });
  }
});

api.get('/evaluations/:id/grades', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [allEvals, classes, subjects, students, grades] = await Promise.all([
      listEvaluations(estId),
      listClasses(estId),
      listSubjects(estId),
      listStudents(estId),
      listGrades(estId),
    ]);

    const evalDoc = (allEvals || []).find((e: any) => e.id === req.params.id);
    if (!evalDoc) return res.status(404).json({ error: 'Évaluation introuvable.' });

    const cls = (classes || []).find((c: any) => c.id === evalDoc.class_id);
    const sub = (subjects || []).find((s: any) => s.id === evalDoc.subject_id);

    const evalItem = {
      ...evalDoc,
      class_name: cls?.name || null,
      subject_name: sub?.name || null,
    };

    const evalGradesMap = new Map(
      (grades || []).filter((g: any) => g.evaluation_id === evalDoc.id).map((g: any) => [g.student_id, g])
    );

    const classStudents = (students || [])
      .filter((s: any) => s.class_id === evalDoc.class_id && s.status !== 'ARCHIVE')
      .map((s: any) => {
        const g = evalGradesMap.get(s.id);
        return {
          student_id: s.id,
          matricule: s.matricule,
          first_name: s.first_name,
          last_name: s.last_name,
          post_name: s.post_name || null,
          grade_id: g?.id || null,
          score: g ? g.score : null,
          is_absent: g ? g.is_absent : 0,
          remarks: g ? g.remarks : null,
        };
      });

    classStudents.sort((a: any, b: any) => {
      const lastDiff = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastDiff !== 0) return lastDiff;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });

    res.json({ evaluation: evalItem, students: classStudents });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des notes de l’évaluation.' });
  }
});

api.post('/evaluations/:id/grades', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { grades } = req.body; // array of { studentId, score, isAbsent, remarks }
    const estId = req.user!.establishment_id;

    const [allEvals, allGrades] = await Promise.all([
      listEvaluations(estId),
      listGrades(estId),
    ]);

    const evalItem = (allEvals || []).find((e: any) => e.id === req.params.id);
    if (!evalItem) return res.status(404).json({ error: 'Évaluation introuvable.' });

    if (evalItem.is_locked === 1 && req.user!.role !== 'DIRECTEUR_ETUDES') {
      return res.status(403).json({ error: 'Cette évaluation est verrouillée. Seul le Directeur des Études peut la modifier.' });
    }

    if (!Array.isArray(grades)) {
      return res.status(400).json({ error: 'Format de notes invalide.' });
    }

    for (const g of grades) {
      const score = g.isAbsent ? null : (g.score !== undefined && g.score !== null && g.score !== '' ? Number(g.score) : null);
      const isAbsent = g.isAbsent ? 1 : 0;
      const remarks = g.remarks || null;

      const existingGrade = (allGrades || []).find((gr: any) => gr.evaluation_id === evalItem.id && gr.student_id === g.studentId);
      const targetGradeId = existingGrade?.id || `GRD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      await setGrade(estId, {
        id: targetGradeId,
        establishment_id: estId,
        evaluation_id: evalItem.id,
        student_id: g.studentId,
        score,
        is_absent: isAbsent,
        remarks,
        updated_by: req.user!.id,
        updated_at: new Date().toISOString(),
      });
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'SAISIE_NOTES', 'EVALUATION', evalItem.id, {
      count: grades.length,
    });

    res.json({ message: 'Notes enregistrées avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la sauvegarde des notes.' });
  }
});

api.post('/evaluations/:id/lock', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { isLocked } = req.body;
    const lockVal = isLocked ? 1 : 0;
    const estId = req.user!.establishment_id;

    await updateDocData(`establishments/${estId}/evaluations`, req.params.id, {
      is_locked: lockVal,
      updated_at: new Date().toISOString()
    });

    logAudit(estId, req.user!.id, req.user!.full_name, lockVal ? 'VERROUILLAGE_EVALUATION' : 'DEVERROUILLAGE_EVALUATION', 'EVALUATION', req.params.id);

    res.json({ message: `Évaluation ${lockVal ? 'verrouillée' : 'déverrouillée'} avec succès.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du verrouillage.' });
  }
});

// Calcul officiel des bulletins de notes (avec moyennes, coefficients, rangs et décisions du conseil - 100% Firestore)
api.get('/report-cards/class/:classId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const term = (req.query.term as string) || 'TRIMESTRE_1';
    const estId = req.user!.establishment_id;

    const [allClasses, establishment, allStudents, allClassSubjects, allSubjects, allUsers, allEvals, allGrades] = await Promise.all([
      listClasses(estId),
      getEstablishment(estId),
      listStudents(estId),
      listClassSubjects(estId),
      listSubjects(estId),
      listTenantUsers(estId),
      listEvaluations(estId),
      listGrades(estId)
    ]);

    const userMap = new Map((allUsers || []).map((u: any) => [u.id, u.full_name]));
    const targetClass = (allClasses || []).find((c: any) => c.id === classId);
    if (!targetClass) return res.status(404).json({ error: 'Classe introuvable.' });

    const cls = {
      ...targetClass,
      main_teacher_name: targetClass.main_teacher_id ? userMap.get(targetClass.main_teacher_id) || null : null
    };

    // Élèves de la classe
    const students = (allStudents || [])
      .filter((s: any) => s.class_id === classId && s.status !== 'ARCHIVE' && s.status !== 'ARCHIVED')
      .sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || '') || (a.first_name || '').localeCompare(b.first_name || ''));

    // Matières et coefficients de la classe
    const subjectMap = new Map((allSubjects || []).map((s: any) => [s.id, s]));
    const subjects = (allClassSubjects || [])
      .filter((cs: any) => cs.class_id === classId)
      .map((cs: any) => {
        const s = subjectMap.get(cs.subject_id) || {};
        return {
          id: cs.id,
          coefficient: cs.coefficient !== undefined ? Number(cs.coefficient) : 1,
          weekly_hours: cs.weekly_hours !== undefined ? Number(cs.weekly_hours) : 2,
          subject_id: cs.subject_id,
          subject_name: s.name || cs.subject_name || 'Matière',
          subject_code: s.code || cs.subject_code || '',
          teacher_name: cs.teacher_id ? userMap.get(cs.teacher_id) || null : null
        };
      })
      .sort((a: any, b: any) => (a.subject_name || '').localeCompare(b.subject_name || ''));

    // Évaluations du trimestre pour cette classe
    const evaluations = (allEvals || []).filter((e: any) => e.class_id === classId && e.term === term);

    // Map des notes pour accès direct rapide
    const gradeMap = new Map<string, any>();
    (allGrades || []).forEach((g: any) => {
      gradeMap.set(`${g.evaluation_id}_${g.student_id}`, g);
    });

    const studentReports: any[] = [];
    for (const student of students) {
      const subjectGrades: any[] = [];
      let totalWeightedScore = 0;
      let totalCoefficients = 0;

      for (const subj of subjects) {
        const subjEvals = evaluations.filter((e: any) => e.subject_id === subj.subject_id);
        let subjTotal = 0;
        let subjEvalWeightSum = 0;

        for (const ev of subjEvals) {
          const g = gradeMap.get(`${ev.id}_${student.id}`);
          if (g && !g.is_absent && g.score !== null && g.score !== undefined) {
            const maxScore = ev.max_score || 20;
            const evalCoeff = ev.coefficient || 1;
            const normalizedScore = (Number(g.score) / maxScore) * 20;
            subjTotal += normalizedScore * evalCoeff;
            subjEvalWeightSum += evalCoeff;
          }
        }

        const subjectAverage = subjEvalWeightSum > 0 ? Number((subjTotal / subjEvalWeightSum).toFixed(2)) : null;
        const weightedScore = subjectAverage !== null ? Number((subjectAverage * subj.coefficient).toFixed(2)) : null;

        if (subjectAverage !== null) {
          totalWeightedScore += weightedScore!;
          totalCoefficients += subj.coefficient;
        }

        subjectGrades.push({
          subjectId: subj.subject_id,
          subjectCode: subj.subject_code,
          subjectName: subj.subject_name,
          teacherName: subj.teacher_name,
          coefficient: subj.coefficient,
          average: subjectAverage,
          weightedScore,
          evalCount: subjEvals.length,
        });
      }

      const generalAverage = totalCoefficients > 0 ? Number((totalWeightedScore / totalCoefficients).toFixed(2)) : null;

      let appreciation = 'Travail insuffisant';
      if (generalAverage !== null) {
        if (generalAverage >= 16) appreciation = 'Excellent travail - Félicitations du conseil';
        else if (generalAverage >= 14) appreciation = 'Très bon travail - Tableau d’honneur';
        else if (generalAverage >= 12) appreciation = 'Bon travail - Encouragements';
        else if (generalAverage >= 10) appreciation = 'Travail passable';
        else if (generalAverage >= 8) appreciation = 'Insuffisant - Doit fournir des efforts';
        else appreciation = 'Très insuffisant - Risque de redoublement';
      }

      studentReports.push({
        student,
        subjectGrades,
        totalWeightedScore: Number(totalWeightedScore.toFixed(2)),
        totalCoefficients,
        generalAverage,
        appreciation,
        rank: 0,
      });
    }

    const sorted = [...studentReports].sort((a, b) => (b.generalAverage || 0) - (a.generalAverage || 0));
    sorted.forEach((item, idx) => {
      item.rank = item.generalAverage !== null ? idx + 1 : '-';
    });

    const classAverage =
      studentReports.filter((s) => s.generalAverage !== null).length > 0
        ? Number(
            (
              studentReports.filter((s) => s.generalAverage !== null).reduce((acc, curr) => acc + curr.generalAverage, 0) /
              studentReports.filter((s) => s.generalAverage !== null).length
            ).toFixed(2)
          )
        : null;

    res.json({
      class: cls,
      establishment,
      term,
      classAverage,
      totalStudents: students.length,
      reports: studentReports,
    });
  } catch (error: any) {
    console.error('Erreur /api/report-cards:', error);
    res.status(500).json({ error: error.message || 'Erreur lors du calcul des bulletins.' });
  }
});

// Publication officielle des bulletins trimestriels dans Firestore (Directeur des Études / Direction)
api.post('/report-cards/publish', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'GESTIONNAIRE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { classId, term, reports, academicYear } = req.body;

    if (!classId || !term || !Array.isArray(reports)) {
      return res.status(400).json({ error: 'Classe, trimestre et données de bulletins obligatoires.' });
    }

    const year = academicYear || '2026-2027';
    let publishedCount = 0;

    // Règle 6 : Figer la version et les réglages du modèle au moment de l'émission
    let templateConfig = await getSubcollectionDoc<any>(estId, 'document_templates', 'bulletin');
    if (!templateConfig) {
      const est = await getEstablishment(estId);
      templateConfig = getDefaultTemplateConfig('bulletin', est);
    }

    for (const r of reports) {
      const studentId = r.student?.id || r.studentId;
      if (!studentId) continue;

      const bulletinId = `BUL-${studentId}-${term}`;
      const payload = {
        id: bulletinId,
        establishment_id: estId,
        student_id: studentId,
        class_id: classId,
        academic_year: year,
        term,
        termLabel: term === 'TRIMESTRE_1' ? '1er Trimestre' : term === 'TRIMESTRE_2' ? '2ème Trimestre' : '3ème Trimestre',
        generalAverage: r.generalAverage !== undefined && r.generalAverage !== null ? Number(r.generalAverage) : null,
        overall_average: r.generalAverage !== undefined && r.generalAverage !== null ? Number(r.generalAverage) : null,
        rank: r.rank || 1,
        totalStudentsInClass: reports.length,
        status: 'PUBLIE',
        is_published: 1,
        directorRemarks: r.appreciation || 'Travail satisfaisant.',
        mention: (r.generalAverage >= 16) ? 'Félicitations' : (r.generalAverage >= 14) ? 'Tableau d\'Honneur' : (r.generalAverage >= 12) ? 'Encouragements' : 'Passable',
        termAverages: r.subjectGrades || [],
        template_snapshot: templateConfig,
        published_at: new Date().toISOString(),
        published_by: req.user!.id,
      };

      await setDocData(`establishments/${estId}/bulletins`, bulletinId, payload);
      publishedCount++;
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'PUBLICATION_BULLETINS', 'REPORT_CARDS', classId, {
      term,
      publishedCount,
    });

    res.json({
      message: `${publishedCount} bulletin(s) officiel(s) publié(s) avec succès dans Firestore.`,
      count: publishedCount,
    });
  } catch (error: any) {
    console.error('Erreur publication bulletins Firestore:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la publication des bulletins.' });
  }
});

// ==========================================
// 9. ASSIDUITÉ, PRÉSENCES & DISCIPLINE
// ==========================================

api.get('/attendance', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ error: 'Classe et date requises.' });
    }

    const estId = req.user!.establishment_id;
    const [students, attendances] = await Promise.all([
      listStudents(estId),
      listStudentAttendances(estId),
    ]);

    const attMap = new Map(
      (attendances || []).filter((a: any) => a.date === date).map((a: any) => [a.student_id, a])
    );

    const classStudents = (students || [])
      .filter((s: any) => s.class_id === classId && s.status !== 'ARCHIVE')
      .map((s: any) => {
        const sa = attMap.get(s.id);
        return {
          student_id: s.id,
          matricule: s.matricule,
          first_name: s.first_name,
          last_name: s.last_name,
          gender: s.gender,
          attendance_id: sa?.id || null,
          status: sa?.status || null,
          actual_arrival_time: sa?.actual_arrival_time || sa?.actualArrivalTime || null,
          actual_departure_time: sa?.actual_departure_time || sa?.actualDepartureTime || null,
          is_justified: sa?.is_justified || 0,
          justification_reason: sa?.justification_reason || null,
        };
      });

    classStudents.sort((a: any, b: any) => {
      const lastDiff = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastDiff !== 0) return lastDiff;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });

    res.json(classStudents);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des présences.' });
  }
});

api.post('/attendance', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ENSEIGNANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, date, records } = req.body; // array of { studentId / student_id, status, actualArrivalTime, actualDepartureTime, isJustified, justificationReason }

    if (!classId || !date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Données d’appel invalides.' });
    }

    const existingAttendances = await listStudentAttendances(req.user!.establishment_id).catch(() => []);
    const attMap = new Map((existingAttendances || []).filter((a: any) => a.date === date).map((a: any) => [a.student_id, a]));

    for (const r of records) {
      const studentId = r.studentId || r.student_id;
      if (!studentId) continue;

      const status = r.status || 'PRESENT';
      const actualArr = r.actualArrivalTime || r.actual_arrival_time || null;
      const actualDep = r.actualDepartureTime || r.actual_departure_time || null;
      const isJustified = (r.isJustified !== undefined ? r.isJustified : r.is_justified) ? 1 : 0;
      const justificationReason = r.justificationReason !== undefined ? r.justificationReason : (r.justification_reason || null);

      const existing = attMap.get(studentId);
      const targetId = existing?.id || `ATT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const op = existing ? 'UPDATE' : 'CREATE';

      const attPayload = {
        id: targetId,
        establishment_id: req.user!.establishment_id,
        student_id: studentId,
        class_id: classId,
        date,
        status,
        actual_arrival_time: actualArr,
        actual_departure_time: actualDep,
        is_justified: isJustified,
        justification_reason: justificationReason,
        recorded_by: req.user!.id,
        updated_at: new Date().toISOString(),
      };

      await executeDualWrite({
        establishmentId: req.user!.establishment_id,
        collectionPath: `establishments/${req.user!.establishment_id}/student_attendances`,
        docId: targetId,
        operation: op,
        payload: attPayload,
        sqliteWriter: () => {}
      });
    }

    res.json({ message: 'Appel journalier enregistré avec succès.' });
  } catch (error: any) {
    console.error('Erreur enregistrement appel:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l’enregistrement de l’appel.' });
  }
});

// Appel par cours / séance (Compte Enseignant, Surveillant, Direction)
api.get('/attendance/course-rollcall', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, date, scheduleId, sessionType } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ error: 'Classe et date requises.' });
    }

    const estId = req.user!.establishment_id;
    const allCourseAttendances = await listStudentCourseAttendances(estId).catch(() => []);

    let filtered = (allCourseAttendances || []).filter((ca: any) =>
      ca.class_id === classId && ca.date === String(date)
    );

    if (scheduleId) {
      filtered = filtered.filter((ca: any) => ca.schedule_id === String(scheduleId));
    }
    if (sessionType) {
      filtered = filtered.filter((ca: any) => ca.session_type === String(sessionType));
    }

    res.json(filtered);
  } catch (error: any) {
    console.error('Erreur /api/attendance/course-rollcall GET:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des présences au cours.' });
  }
});

api.post('/attendance/course-rollcall', authenticateToken, requireRole(['ENSEIGNANT', 'SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { classId, date, scheduleId, sessionType, records, editReason } = req.body;

    if (!classId || !date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Classe, date et enregistrements d\'appel obligatoires.' });
    }

    // Contrôle strict des permissions : un enseignant ne peut faire l'appel que pour ses propres cours/classes
    if (req.user!.role === 'ENSEIGNANT') {
      let isAssigned = false;
      if (scheduleId) {
        const schedules = await listSchedules(estId).catch(() => []);
        const sched = (schedules || []).find((s: any) => s.id === scheduleId);
        if (sched && sched.teacher_id === req.user!.id) {
          isAssigned = true;
        }
      }
      if (!isAssigned) {
        const classSubjects = await listClassSubjects(estId).catch(() => []);
        const isClassTeacher = (classSubjects || []).some((cs: any) => cs.class_id === classId && cs.teacher_id === req.user!.id);
        if (isClassTeacher) isAssigned = true;
      }

      if (!isAssigned) {
        return res.status(403).json({ error: 'Accès refusé (403) : Un enseignant ne peut faire l\'appel que pour ses propres cours et classes attribuées.' });
      }
    }

    // Restriction : Un appel ne peut être fait que pour le jour même (today). Modification ultérieure exige un motif.
    const todayStr = new Date().toISOString().split('T')[0];
    if (date !== todayStr && (!editReason || !editReason.trim())) {
      return res.status(400).json({ error: 'L\'appel pour une date antérieure exige l\'indication d\'un motif de modification tracée.' });
    }

    let scheduleInfo: any = null;
    if (scheduleId) {
      const schedules = await listSchedules(estId).catch(() => []);
      scheduleInfo = (schedules || []).find((s: any) => s.id === scheduleId);
    }

    const savedRecords: any[] = [];

    for (const r of records) {
      const studentId = r.studentId || r.student_id;
      if (!studentId) continue;

      const docKey = `CA-${studentId}-${date}-${scheduleId || sessionType || 'SESSION'}`;
      const existing = await getDocData(`establishments/${estId}/student_course_attendances`, docKey).catch(() => null);

      const previousStatus = existing?.status || 'NON_RENSEIGNE';
      const history = existing?.edit_history ? [...existing.edit_history] : [];

      if (date !== todayStr || editReason) {
        history.push({
          edited_by: req.user!.full_name || req.user!.username,
          edited_at: new Date().toISOString(),
          previous_status: previousStatus,
          edit_reason: editReason || 'Modification post-appel',
        });
      }

      const payload = {
        id: docKey,
        establishment_id: estId,
        student_id: studentId,
        class_id: classId,
        subject_id: scheduleInfo?.subject_id || r.subjectId || null,
        subject_name: scheduleInfo?.subject_name || r.subjectName || null,
        schedule_id: scheduleId || null,
        session_type: sessionType || (scheduleId ? 'COURS' : 'MATIN'),
        date,
        start_time: scheduleInfo?.start_time || null,
        end_time: scheduleInfo?.end_time || null,
        status: r.status || 'PRESENT',
        motif_category: r.motifCategory || r.motif_category || null,
        motif: r.motif ? String(r.motif).trim() : null,
        teacher_id: req.user!.id,
        teacher_name: req.user!.full_name,
        edit_history: history,
        updated_at: new Date().toISOString(),
      };

      await setStudentCourseAttendance(estId, docKey, payload);
      savedRecords.push(payload);
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'APPEL_COURS_ELEVES', 'STUDENT_COURSE_ATTENDANCE', classId, {
      date,
      scheduleId,
      sessionType,
      recordsCount: savedRecords.length,
    });

    res.json({ message: 'Appel de présence enregistré avec succès dans Firestore.', count: savedRecords.length });
  } catch (error: any) {
    console.error('Erreur /api/attendance/course-rollcall POST:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'enregistrement de l\'appel de cours.' });
  }
});

// Alertes de présence & discordances (Surveillant, DE, DG, Promoteur)
api.get('/attendance/alerts', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const [rawStudents, rawClasses, rawDailyAtt, rawCourseAtt, rawSchedules] = await Promise.all([
      listStudents(estId).catch(() => []),
      listClasses(estId).catch(() => []),
      listStudentAttendances(estId).catch(() => []),
      listStudentCourseAttendances(estId).catch(() => []),
      listSchedules(estId).catch(() => []),
    ]);

    const studentMap = new Map((rawStudents || []).map((s: any) => [s.id, s]));
    const classMap = new Map((rawClasses || []).map((c: any) => [c.id, c]));

    const dailyMap = new Map(
      (rawDailyAtt || []).filter((a: any) => a.date === targetDate).map((a: any) => [a.student_id, a])
    );

    const alerts: any[] = [];

    // 1. Détection des absences suspectes / élèves partis
    const dayCourseAtts = (rawCourseAtt || []).filter((ca: any) => ca.date === targetDate);

    for (const ca of dayCourseAtts) {
      if (ca.status === 'ABSENT') {
        const student = studentMap.get(ca.student_id);
        const dailyAtt = dailyMap.get(ca.student_id);

        const isPresentInSchool = dailyAtt && (dailyAtt.status === 'PRESENT' || dailyAtt.actual_arrival_time || dailyAtt.actualArrivalTime);
        if (isPresentInSchool) {
          const departureTime = dailyAtt.actual_departure_time || dailyAtt.actualDepartureTime || '';
          const courseStartTime = ca.start_time || '00:00';

          const cls = classMap.get(ca.class_id);

          if (departureTime && departureTime <= courseStartTime) {
            alerts.push({
              id: `ALT-LEFT-${ca.id}`,
              type: 'STUDENT_LEFT',
              student_id: ca.student_id,
              student_name: student ? `${student.first_name} ${student.last_name}` : 'Élève',
              matricule: student?.matricule || 'N/A',
              class_id: ca.class_id,
              class_name: cls?.name || 'Classe',
              subject_name: ca.subject_name || 'Cours',
              schedule_id: ca.schedule_id,
              teacher_name: ca.teacher_name || 'Enseignant',
              start_time: ca.start_time,
              end_time: ca.end_time,
              message: "Élève parti de l'établissement",
              details: `Parti à ${departureTime} (cours de ${ca.subject_name || 'matière'} prévu à ${ca.start_time || ''})`,
            });
          } else {
            alerts.push({
              id: `ALT-SUSP-${ca.id}`,
              type: 'SUSPICIOUS_ABSENCE',
              student_id: ca.student_id,
              student_name: student ? `${student.first_name} ${student.last_name}` : 'Élève',
              matricule: student?.matricule || 'N/A',
              class_id: ca.class_id,
              class_name: cls?.name || 'Classe',
              subject_name: ca.subject_name || 'Cours',
              schedule_id: ca.schedule_id,
              teacher_name: ca.teacher_name || 'Enseignant',
              start_time: ca.start_time,
              end_time: ca.end_time,
              message: `Élève présent dans l'établissement mais absent au cours de ${ca.subject_name || 'matière'}`,
              details: `Prévu de ${ca.start_time || ''} à ${ca.end_time || ''}. Motif enseignant : ${ca.motif || 'Aucun'}`,
            });
          }
        }
      }
    }

    // 2. Détection des cours de l'emploi du temps sans appel effectué
    const targetDateObj = new Date(targetDate);
    // 1: Lundi ... 7: Dimanche
    let dayOfWeek = targetDateObj.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const publishedTodaySchedules = (rawSchedules || []).filter(
      (s: any) => Number(s.day_of_week) === dayOfWeek && (s.is_published === undefined || Number(s.is_published) === 1 || s.is_published === true)
    );

    const completedScheduleIds = new Set(dayCourseAtts.map((ca: any) => ca.schedule_id).filter(Boolean));

    for (const sched of publishedTodaySchedules) {
      if (!completedScheduleIds.has(sched.id)) {
        const cls = classMap.get(sched.class_id);
        alerts.push({
          id: `ALT-MISSING-${sched.id}-${targetDate}`,
          type: 'MISSING_ROLL_CALL',
          class_id: sched.class_id,
          class_name: cls?.name || sched.class_name || 'Classe',
          subject_name: sched.subject_name || 'Matière',
          schedule_id: sched.id,
          teacher_name: sched.teacher_name || 'Enseignant',
          start_time: sched.start_time,
          end_time: sched.end_time,
          message: `Cours de l'emploi du temps sans appel fait : ${sched.subject_name || 'Matière'} en ${cls?.name || 'Classe'}`,
          details: `Enseignant chargé: ${sched.teacher_name || 'Non assigné'} (${sched.start_time} - ${sched.end_time})`,
        });
      }
    }

    res.json(alerts);
  } catch (error: any) {
    console.error('Erreur /api/attendance/alerts:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des alertes d\'assiduité.' });
  }
});

api.get('/discipline', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [incidents, students, classes, users] = await Promise.all([
      listDisciplinaryIncidents(estId),
      listStudents(estId),
      listClasses(estId),
      listTenantUsers(estId),
    ]);

    const studentMap = new Map((students || []).map((s: any) => [s.id, s]));
    const classMap = new Map((classes || []).map((c: any) => [c.id, c.name]));
    const userMap = new Map((users || []).map((u: any) => [u.id, u.full_name]));

    const enriched = (incidents || []).map((di: any) => {
      const stu = studentMap.get(di.student_id);
      const clsName = stu?.class_id ? classMap.get(stu.class_id) : null;
      return {
        ...di,
        matricule: stu?.matricule || null,
        first_name: stu?.first_name || null,
        last_name: stu?.last_name || null,
        class_name: clsName,
        recorded_by_name: userMap.get(di.recorded_by) || null,
      };
    });

    enriched.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    res.json(enriched.slice(0, 100));
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement de la discipline.' });
  }
});

api.post('/discipline', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      studentId,
      date,
      time,
      incidentType,
      motif,
      description,
      supportingDoc,
      sanction,
      justificationStatus,
      observation,
      actionTaken,
      assignedTo,
      status,
    } = req.body;

    if (!studentId || !date || !incidentType || !description) {
      return res.status(400).json({ error: 'Élève, date, type d’incident et description requis.' });
    }

    const id = `INC-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      id,
      establishment_id: req.user!.establishment_id,
      student_id: studentId,
      date,
      time: time || null,
      incident_type: incidentType,
      motif: motif || null,
      description,
      supporting_doc: supportingDoc || null,
      sanction: sanction || null,
      recorded_by: req.user!.id,
      justification_status: justificationStatus || 'NON_JUSTIFIE',
      observation: observation || null,
      action_taken: actionTaken || null,
      assigned_to: assignedTo || null,
      status: status || 'SIGNOLE',
      created_at: new Date().toISOString(),
    };

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/disciplinary_incidents`,
      docId: id,
      operation: 'CREATE',
      payload,
      sqliteWriter: () => {}
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'SIGNALEMENT_DISCIPLINAIRE', 'INCIDENT', id, {
      studentId,
      incidentType,
      sanction,
      syncStatus: dualResult.syncStatus,
    });

    res.json({ message: 'Incident disciplinaire enregistré.', incidentId: id, syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de l’enregistrement de l’incident.' });
  }
});

api.put('/discipline/:id', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      sanction,
      actionTaken,
      assignedTo,
      status,
      justificationStatus,
      observation,
      motif,
      supportingDoc,
    } = req.body;

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/disciplinary_incidents`,
      docId: req.params.id,
      operation: 'UPDATE',
      payload: {
        sanction,
        action_taken: actionTaken,
        assigned_to: assignedTo,
        status,
        justification_status: justificationStatus,
        observation,
        motif,
        supporting_doc: supportingDoc,
      },
      sqliteWriter: () => {}
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'MODIFICATION_DISCIPLINE', 'INCIDENT', req.params.id, {
      status,
      actionTaken,
      syncStatus: dualResult.syncStatus,
    });

    res.json({ message: 'Dossier disciplinaire mis à jour.', syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du dossier disciplinaire.' });
  }
});

// ==========================================
// 10. COMPTABILITÉ & PAIEMENTS SCOLAIRES
// ==========================================

// --- GRILLES TARIFAIRES PROMOTEUR (PARTIE II) ---

api.get('/tariffs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [tariffs, classes] = await Promise.all([
      listTariffs(estId),
      listClasses(estId),
    ]);

    const classMap = new Map((classes || []).map((c: any) => [c.id, c.name]));

    const enriched = (tariffs || []).map((t: any) => ({
      ...t,
      class_name: t.class_id ? classMap.get(t.class_id) || null : null,
    }));

    enriched.sort((a: any, b: any) => {
      const cDiff = (a.cycle_code || '').localeCompare(b.cycle_code || '');
      if (cDiff !== 0) return cDiff;
      const lDiff = (a.level_code || '').localeCompare(b.level_code || '');
      if (lDiff !== 0) return lDiff;
      return (b.created_at || b.updated_at || '').localeCompare(a.created_at || a.updated_at || '');
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des grilles tarifaires.' });
  }
});

api.post('/tariffs', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      academicYear,
      cycleCode,
      levelCode,
      classId,
      inscriptionNewFee,
      reinscriptionFee,
      monthlyTuition,
      monthsCount,
      paymentSchedule,
      trimester1Fee,
      trimester2Fee,
      trimester3Fee,
      annexFees,
      annexFeesDetails,
    } = req.body;

    if (!cycleCode) {
      return res.status(400).json({ error: 'Cycle obligatoire pour la grille tarifaire.' });
    }

    const est = await getEstablishment(req.user!.establishment_id);
    const year = academicYear || est?.academic_year || '2026-2027';

    const inscNew = Number(inscriptionNewFee || 0);
    const reinsc = Number(reinscriptionFee || 0);
    const monthly = Number(monthlyTuition || 0);
    const months = Number(monthsCount || 9);
    const annex = Number(annexFees || 0);

    const totalNew = inscNew + (monthly * months) + annex;
    const totalOld = reinsc + (monthly * months) + annex;

    const id = `TRF-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      id,
      establishment_id: req.user!.establishment_id,
      academic_year: year,
      cycle_code: cycleCode,
      level_code: levelCode || null,
      class_id: classId || null,
      inscription_new_fee: inscNew,
      reinscription_fee: reinsc,
      monthly_tuition: monthly,
      months_count: months,
      payment_schedule: paymentSchedule || 'MENSUEL',
      trimester_1_fee: Number(trimester1Fee || 0),
      trimester_2_fee: Number(trimester2Fee || 0),
      trimester_3_fee: Number(trimester3Fee || 0),
      annex_fees: annex,
      annex_fees_details: annexFeesDetails || null,
      annual_total_new: totalNew,
      annual_total_old: totalOld,
      is_active: 1,
      updated_by: req.user!.id,
      created_at: new Date().toISOString(),
    };

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/school_tariff_plans`,
      docId: id,
      operation: 'CREATE',
      payload,
      sqliteWriter: () => {}
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'CONFIGURATION_TARIF', 'TARIFF', id, {
      cycleCode,
      levelCode,
      annualTotalNew: totalNew,
      syncStatus: dualResult.syncStatus,
    });

    res.json({ message: 'Grille tarifaire paramétrée avec succès par le Promoteur.', tariffId: id, syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la configuration tarifaire.' });
  }
});

api.put('/tariffs/:id', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const existing = await getDocData(`establishments/${estId}/school_tariff_plans`, req.params.id);
    const {
      inscriptionNewFee,
      reinscriptionFee,
      monthlyTuition,
      monthsCount,
      paymentSchedule,
      trimester1Fee,
      trimester2Fee,
      trimester3Fee,
      annexFees,
      annexFeesDetails,
      isActive,
    } = req.body;

    const inscNew = Number(inscriptionNewFee !== undefined ? inscriptionNewFee : existing?.inscription_new_fee || 0);
    const reinsc = Number(reinscriptionFee !== undefined ? reinscriptionFee : existing?.reinscription_fee || 0);
    const monthly = Number(monthlyTuition !== undefined ? monthlyTuition : existing?.monthly_tuition || 0);
    const months = Number(monthsCount !== undefined ? monthsCount : existing?.months_count || 9);
    const annex = Number(annexFees !== undefined ? annexFees : existing?.annex_fees || 0);

    const totalNew = inscNew + (monthly * months) + annex;
    const totalOld = reinsc + (monthly * months) + annex;

    const dualResult = await executeDualWrite({
      establishmentId: estId,
      collectionPath: `establishments/${estId}/school_tariff_plans`,
      docId: req.params.id,
      operation: 'UPDATE',
      payload: {
        inscription_new_fee: inscNew,
        reinscription_fee: reinsc,
        monthly_tuition: monthly,
        months_count: months,
        payment_schedule: paymentSchedule || existing?.payment_schedule || 'MENSUEL',
        trimester_1_fee: Number(trimester1Fee !== undefined ? trimester1Fee : existing?.trimester_1_fee || 0),
        trimester_2_fee: Number(trimester2Fee !== undefined ? trimester2Fee : existing?.trimester_2_fee || 0),
        trimester_3_fee: Number(trimester3Fee !== undefined ? trimester3Fee : existing?.trimester_3_fee || 0),
        annex_fees: annex,
        annex_fees_details: annexFeesDetails !== undefined ? annexFeesDetails : existing?.annex_fees_details || null,
        annual_total_new: totalNew,
        annual_total_old: totalOld,
        is_active: isActive !== undefined ? (isActive ? 1 : 0) : existing?.is_active ?? 1,
        updated_by: req.user!.id,
      },
      sqliteWriter: () => {}
    });

    logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_TARIF', 'TARIFF', req.params.id, {
      annualTotalNew: totalNew,
      syncStatus: dualResult.syncStatus,
    });

    res.json({ message: 'Grille tarifaire mise à jour avec succès.', syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour tarifaire.' });
  }
});

api.delete('/tariffs/:id', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/school_tariff_plans`,
      docId: req.params.id,
      operation: 'DELETE',
      sqliteWriter: () => {}
    });

    res.json({ message: 'Grille tarifaire supprimée.', syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la grille tarifaire.' });
  }
});

api.get('/finance/fee-structures', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const fees = await listTenantDocs<any>(estId, 'fee_structures');
    fees.sort((a: any, b: any) => {
      const cDiff = (a.cycle_code || '').localeCompare(b.cycle_code || '');
      if (cDiff !== 0) return cDiff;
      const lDiff = (a.level_code || '').localeCompare(b.level_code || '');
      if (lDiff !== 0) return lDiff;
      return (a.name || '').localeCompare(b.name || '');
    });
    res.json(fees);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des structures de frais.' });
  }
});

// Helper normalisation et correspondance classe / niveau pour la grille tarifaire
function normalizeLevelCode(val?: string | null): string {
  if (!val) return '';
  let s = val.toLowerCase().replace(/è|é|ê/g, 'e').trim();
  s = s.replace(/[^a-z0-9]/g, '');
  if (s.startsWith('terminale') || s.startsWith('tle') || s === 'ta' || s === 'tc' || s === 'td' || s === 'tg') {
    if (s.includes('a') || s === 'ta') return 'ta';
    if (s.includes('c') || s === 'tc') return 'tc';
    if (s.includes('d') || s === 'td') return 'td';
    if (s.includes('g') || s === 'tg') return 'tg';
    return 'tle';
  }
  if (s === '3' || s === '3e' || s === '3eme' || s === '3ème' || s.startsWith('trois')) return '3eme';
  if (s === '4' || s === '4e' || s === '4eme' || s === '4ème' || s.startsWith('quatre')) return '4eme';
  if (s === '5' || s === '5e' || s === '5eme' || s === '5ème' || s.startsWith('cinq')) return '5eme';
  if (s === '6' || s === '6e' || s === '6eme' || s === '6ème' || s.startsWith('six')) return '6eme';
  if (s.startsWith('2nd') || s.startsWith('2de') || s.startsWith('seconde')) return '2nde';
  if (s.startsWith('1er') || s.startsWith('1re') || s.startsWith('1ere') || s.startsWith('premiere')) return '1ere';
  return s;
}

function matchesFeeToStudent(fee: any, cls: any, student: any): boolean {
  // 1. Filtrage strict par classe spécifique si précisé
  if (fee.class_id && cls && fee.class_id === cls.id) return true;
  if (fee.class_name && cls && normalizeLevelCode(fee.class_name) === normalizeLevelCode(cls.name)) return true;

  const stuLevel = normalizeLevelCode(cls?.level_code || student?.level_code || cls?.name || student?.class_name);
  const feeLevel = normalizeLevelCode(fee.level_code || fee.level);

  // 2. Correspondance de niveau (ex: 3e vs 3ème vs 3eme, 6e vs 6ème, T/A vs Terminale A)
  if (feeLevel && stuLevel) {
    if (feeLevel === stuLevel) return true;
    if (feeLevel.replace('eme', 'e') === stuLevel.replace('eme', 'e')) return true;
    if (feeLevel.replace('e', '') === stuLevel.replace('e', '')) return true;
  }

  // 3. Correspondance de cycle (si pas de niveau restreint sur le frais)
  const stuCycle = cls?.cycle_code || student?.cycle_code;
  if (fee.cycle_code && stuCycle && !fee.level_code && !fee.class_id) {
    if (fee.cycle_code === stuCycle) return true;
  }

  // 4. Frais global à tout l'établissement
  if (!fee.class_id && !fee.level_code && !fee.cycle_code) return true;

  return false;
}

function calculateFeeExigible(fee: any): number {
  const periodicity = fee.periodicity || (fee.fee_type === 'FRAIS_MENSUELS' ? 'MENSUEL' : 'UNIQUE');
  const unitAmt = Number(fee.amount) || 0;
  if (periodicity === 'MENSUEL') {
    const months = fee.months_count ? Number(fee.months_count) : 9;
    return unitAmt * months;
  }
  if (periodicity === 'TRIMESTRIEL') {
    const trimesters = fee.trimesters_count ? Number(fee.trimesters_count) : 3;
    return unitAmt * trimesters;
  }
  return unitAmt;
}

export function computeStudentFinancialSummary(
  student: any,
  cls: any,
  feeStructures: any[],
  tariffs: any[],
  payments: any[]
) {
  const levelCode = cls?.level_code || student?.level_code || cls?.name || student?.class_name;
  const cycleCode = cls?.cycle_code || student?.cycle_code;

  // 1. Structure de frais applicables
  const applicableFees = (feeStructures || [])
    .filter((f: any) => matchesFeeToStudent(f, cls, student))
    .filter((f: any) => {
      if (student?.status === 'REINSCRIT' && (f.fee_type === 'INSCRIPTION' || f.fee_type === 'FRAIS_INSCRIPTION')) return false;
      if (student?.status === 'INSCRIT' && (f.fee_type === 'REINSCRIPTION' || f.fee_type === 'FRAIS_REINSCRIPTION')) return false;
      return true;
    });

  let totalDue = applicableFees.reduce((acc: number, curr: any) => acc + calculateFeeExigible(curr), 0);

  // 2. Grille tarifaire globale par défaut si aucun frais spécifique
  if (totalDue === 0 && (tariffs || []).length > 0) {
    const normStuLevel = normalizeLevelCode(levelCode);
    const activeTariffs = (tariffs || []).filter((tp: any) => {
      const tpLevelNorm = normalizeLevelCode(tp.level_code || tp.level);
      if (tpLevelNorm && normStuLevel && tpLevelNorm === normStuLevel) return true;
      if (tp.cycle_code && cycleCode && tp.cycle_code === cycleCode) return true;
      return false;
    });

    activeTariffs.sort((a: any, b: any) => {
      const aL = normalizeLevelCode(a.level_code || a.level) === normStuLevel;
      const bL = normalizeLevelCode(b.level_code || b.level) === normStuLevel;
      if (aL && !bL) return -1;
      if (!aL && bL) return 1;
      return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
    });

    const tp = activeTariffs[0] || (tariffs || [])[0];
    if (tp) {
      totalDue = (student?.status === 'REINSCRIT' ? tp.annual_total_old : tp.annual_total_new) || tp.annual_total_new || tp.annual_total || 0;
    }
  }

  // 3. Paiements validés
  const studentPayments = (payments || [])
    .filter((p: any) => p.student_id === student?.id && (p.status === 'VALIDE' || p.status === 'COMPLETED' || !p.status))
    .map((p: any) => ({
      ...p,
      payment_date: p.payment_date || (p.created_at ? p.created_at.split('T')[0] : '—'),
      amount: Number(p.amount || 0),
    }))
    .sort((a: any, b: any) => (b.payment_date || b.created_at || '').localeCompare(a.payment_date || a.created_at || ''));

  const totalPaid = studentPayments.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
  const balance = Math.max(0, totalDue - totalPaid);

  return {
    totalDue,
    totalPaid,
    balance,
    totalFeesDue: totalDue,
    totalFeesPaid: totalPaid,
    payments: studentPayments,
    applicableFees,
  };
}

// 9 mois scolaires officiels (République du Congo : Octobre à Juin)
const ACADEMIC_MONTHS = [
  { id: '10', name: 'Octobre', month_num: 10, year: 2026, order: 1 },
  { id: '11', name: 'Novembre', month_num: 11, year: 2026, order: 2 },
  { id: '12', name: 'Décembre', month_num: 12, year: 2026, order: 3 },
  { id: '01', name: 'Janvier', month_num: 1, year: 2027, order: 4 },
  { id: '02', name: 'Février', month_num: 2, year: 2027, order: 5 },
  { id: '03', name: 'Mars', month_num: 3, year: 2027, order: 6 },
  { id: '04', name: 'Avril', month_num: 4, year: 2027, order: 7 },
  { id: '05', name: 'Mai', month_num: 5, year: 2027, order: 8 },
  { id: '06', name: 'Juin', month_num: 6, year: 2027, order: 9 },
];

api.post('/finance/fee-structures', authenticateToken, requireRole(['COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { feeType, name, amount, cycleCode, levelCode, classId, className, periodicity, monthsCount, dueDate } = req.body;
    if (!feeType || !name || amount === undefined) {
      return res.status(400).json({ error: 'Type, libellé et montant requis.' });
    }

    const estId = req.user!.establishment_id;
    const est = await getEstablishment(estId);
    const academicYear = est?.academic_year || '2026-2027';

    const pType = periodicity || (feeType === 'FRAIS_MENSUELS' ? 'MENSUEL' : 'UNIQUE');
    const mCount = pType === 'MENSUEL' ? (monthsCount ? Number(monthsCount) : 9) : null;

    const id = `FEE-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      id,
      establishment_id: estId,
      academic_year: academicYear,
      cycle_code: cycleCode || null,
      level_code: levelCode || null,
      class_id: classId || null,
      class_name: className || null,
      fee_type: feeType,
      name: name.trim(),
      amount: Number(amount),
      periodicity: pType,
      months_count: mCount,
      due_date: dueDate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/fee_structures`, id, payload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'CREATION_TARIF', 'FEE_STRUCTURE', id, {
      name: payload.name,
      amount: payload.amount,
      periodicity: payload.periodicity,
      level_code: payload.level_code,
    });

    res.json({ message: 'Grille tarifaire mise à jour.', feeId: id, fee: payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’enregistrement du tarif.' });
  }
});

api.put('/finance/fee-structures/:id', authenticateToken, requireRole(['COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const estId = req.user!.establishment_id;
    const { feeType, name, amount, cycleCode, levelCode, classId, className, periodicity, monthsCount, dueDate } = req.body;

    const existing = await getSubcollectionDoc<any>(estId, 'fee_structures', id);
    if (!existing) {
      return res.status(404).json({ error: 'Tarif introuvable.' });
    }

    const pType = periodicity !== undefined ? periodicity : (existing.periodicity || (feeType === 'FRAIS_MENSUELS' ? 'MENSUEL' : 'UNIQUE'));
    const mCount = pType === 'MENSUEL' ? (monthsCount !== undefined ? Number(monthsCount) : (existing.months_count || 9)) : null;

    const payload = {
      ...existing,
      fee_type: feeType || existing.fee_type,
      name: name !== undefined ? name.trim() : existing.name,
      amount: amount !== undefined ? Number(amount) : existing.amount,
      periodicity: pType,
      months_count: mCount,
      cycle_code: cycleCode !== undefined ? cycleCode : existing.cycle_code,
      level_code: levelCode !== undefined ? levelCode : existing.level_code,
      class_id: classId !== undefined ? classId : existing.class_id,
      class_name: className !== undefined ? className : existing.class_name,
      due_date: dueDate !== undefined ? dueDate : existing.due_date,
      updated_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/fee_structures`, id, payload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_TARIF', 'FEE_STRUCTURE', id, {
      name: payload.name,
      oldAmount: existing.amount,
      newAmount: payload.amount,
      periodicity: payload.periodicity,
    });

    res.json({ message: 'Tarif mis à jour avec succès.', fee: payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la modification du tarif.' });
  }
});

api.delete('/finance/fee-structures/:id', authenticateToken, requireRole(['COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const estId = req.user!.establishment_id;

    await deleteDocData(`establishments/${estId}/fee_structures`, id);

    logAudit(estId, req.user!.id, req.user!.full_name, 'SUPPRESSION_TARIF', 'FEE_STRUCTURE', id);

    res.json({ message: 'Ligne tarifaire supprimée avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la suppression du tarif.' });
  }
});

// Consultation dynamique du statut tarifaire d'un élève pour pré-remplissage automatique en caisse
api.get('/finance/student-fee-status/:studentId', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const estId = req.user!.establishment_id;
    const cleanId = String(studentId || '').trim();

    const [allStudents, classes, feeStructures, existingPayments] = await Promise.all([
      listStudents(estId),
      listClasses(estId),
      listTenantDocs<any>(estId, 'fee_structures'),
      listPayments(estId),
    ]);

    let student = (allStudents || []).find((s: any) =>
      s.id === cleanId ||
      s.matricule === cleanId ||
      (s.id && String(s.id).toLowerCase() === cleanId.toLowerCase()) ||
      (s.matricule && String(s.matricule).toLowerCase() === cleanId.toLowerCase())
    );

    if (!student && cleanId) {
      try {
        student = await getStudent(estId, cleanId);
      } catch {}
    }

    if (!student) {
      return res.status(404).json({ error: 'Élève introuvable.' });
    }

    const classMap = new Map((classes || []).map((c: any) => [c.id, c]));
    const cls = student.class_id ? classMap.get(student.class_id) : null;
    const className = cls?.name || student.class_name || null;
    const levelCode = cls?.level_code || student.level_code || null;
    const cycleCode = cls?.cycle_code || student.cycle_code || null;

    // Filtrer les frais applicables selon la classe/niveau de l'élève
    const rawApplicable = (feeStructures || []).filter((f: any) => matchesFeeToStudent(f, cls, student));

    // Filtrer selon inscription vs réinscription
    const isReinscrit = student.status === 'REINSCRIT';
    const applicableFees = rawApplicable.filter((f: any) => {
      if (isReinscrit && f.fee_type === 'INSCRIPTION') return false;
      if (!isReinscrit && f.fee_type === 'REINSCRIPTION') return false;
      return true;
    });

    const validPayments = (existingPayments || []).filter((p: any) =>
      p.status === 'VALIDE' && (p.student_id === student.id || p.matricule === student.matricule)
    );

    // Calcul détaillé par ligne de frais
    const feesResult = applicableFees.map((fee: any) => {
      const periodicity = fee.periodicity || (fee.fee_type === 'FRAIS_MENSUELS' ? 'MENSUEL' : 'UNIQUE');
      const unitAmount = Number(fee.amount) || 0;
      const totalExigible = calculateFeeExigible(fee);

      // Paiements matchés pour ce frais (par fee_structure_id ou payment_type)
      const matchingPayments = validPayments.filter((p: any) => {
        if (p.fee_structure_id && p.fee_structure_id === fee.id) return true;
        if (p.payment_type && p.payment_type === fee.fee_type) return true;
        if (fee.fee_type === 'FRAIS_MENSUELS' && (p.payment_type === 'FRAIS_MENSUELS' || p.payment_type === 'SCOLARITE')) return true;
        if (fee.fee_type === 'INSCRIPTION' && p.payment_type === 'INSCRIPTION') return true;
        if (fee.fee_type === 'REINSCRIPTION' && p.payment_type === 'REINSCRIPTION') return true;
        if (fee.fee_type === 'AUTRES_FRAIS' && p.payment_type === 'AUTRES_FRAIS') return true;
        return false;
      });

      const alreadyPaid = matchingPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const balance = Math.max(0, totalExigible - alreadyPaid);
      const isSettled = totalExigible > 0 && balance === 0;

      // Pour les frais mensuels : calcul du statut détaillé des 9 mois
      let monthsSchedule: any[] | null = null;
      if (periodicity === 'MENSUEL') {
        const paidMonthNames = new Set<string>();
        matchingPayments.forEach((p: any) => {
          if (Array.isArray(p.months_paid)) {
            p.months_paid.forEach((m: string) => paidMonthNames.add(m));
          }
        });

        // Nombre de mois couverts par le montant total versé
        const coveredMonthsCount = unitAmount > 0 ? Math.floor(alreadyPaid / unitAmount) : 0;

        monthsSchedule = ACADEMIC_MONTHS.map((m, idx) => {
          const isExplicitlyPaid = paidMonthNames.has(m.name) || paidMonthNames.has(`${m.name} ${m.year}`);
          const isCoveredByIndex = idx < coveredMonthsCount;
          const isPaid = isExplicitlyPaid || isCoveredByIndex;

          let status: 'REGLE' | 'EN_RETARD' | 'A_VENIR' = 'A_VENIR';
          if (isPaid) {
            status = 'REGLE';
          } else {
            // Mois passé ou courant (Octobre 2026) -> EN_RETARD
            // Mois futurs (Novembre 2026 à Juin 2027) -> A_VENIR
            if (idx === 0) {
              status = 'EN_RETARD';
            } else {
              status = 'A_VENIR';
            }
          }

          return {
            id: m.id,
            name: m.name,
            year: m.year,
            label: `${m.name} ${m.year}`,
            amount: unitAmount,
            is_paid: isPaid,
            status,
          };
        });
      }

      return {
        id: fee.id,
        name: fee.name,
        fee_type: fee.fee_type,
        periodicity,
        unit_amount: unitAmount,
        months_count: fee.months_count || (periodicity === 'MENSUEL' ? 9 : null),
        total_exigible: totalExigible,
        already_paid: alreadyPaid,
        balance,
        is_settled: isSettled,
        months_schedule: monthsSchedule,
      };
    });

    const totalDue = feesResult.reduce((acc, f) => acc + f.total_exigible, 0);
    const totalPaid = validPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const balanceTotal = Math.max(0, totalDue - totalPaid);

    res.json({
      student: {
        id: student.id,
        matricule: student.matricule,
        first_name: student.first_name,
        last_name: student.last_name,
        class_id: student.class_id || cls?.id || null,
        class_name: className,
        level_code: levelCode,
        cycle_code: cycleCode,
        status: student.status || 'INSCRIT',
        guardian_name: student.guardian_name || null,
        guardian_phone: student.guardian_phone || null,
      },
      has_schedule: feesResult.length > 0,
      message: feesResult.length === 0 ? 'Aucun tarif configuré pour cette classe. Saisie manuelle activée.' : null,
      total_due: totalDue,
      total_paid: totalPaid,
      total_balance: balanceTotal,
      fees: feesResult,
      payments: validPayments,
    });
  } catch (error: any) {
    console.error('Erreur /finance/student-fee-status:', error);
    res.status(500).json({ error: error.message || 'Erreur lors du calcul du statut financier de l’élève.' });
  }
});

api.get('/finance/student-balances', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [students, classes, payments, feeStructures, tariffs] = await Promise.all([
      listStudents(estId),
      listClasses(estId),
      listPayments(estId),
      listTenantDocs<any>(estId, 'fee_structures'),
      listTariffs(estId),
    ]);

    const classMap = new Map((classes || []).map((c: any) => [c.id, c]));
    const validPayments = (payments || []).filter((p: any) => p.status === 'VALIDE');

    const paidByStudent = new Map<string, number>();
    for (const p of validPayments) {
      if (p.student_id) {
        paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) || 0) + (Number(p.amount) || 0));
      }
    }

    const activeStudents = (students || []).filter((s: any) => s.status !== 'ARCHIVE');

    const result = activeStudents.map((stu: any) => {
      const cls = stu.class_id ? classMap.get(stu.class_id) : null;
      const levelCode = cls?.level_code || stu.level_code;
      const cycleCode = cls?.cycle_code || stu.cycle_code;

      const applicableFees = (feeStructures || [])
        .filter((f: any) => matchesFeeToStudent(f, cls, stu))
        .filter((f: any) => {
          if (stu.status === 'REINSCRIT' && f.fee_type === 'INSCRIPTION') return false;
          if (stu.status === 'INSCRIT' && f.fee_type === 'REINSCRIPTION') return false;
          return true;
        });

      let totalDue = applicableFees.reduce((acc: number, curr: any) => acc + calculateFeeExigible(curr), 0);

      if (totalDue === 0 && (tariffs || []).length > 0) {
        const tp = (tariffs || []).find((t: any) => t.cycle_code === cycleCode || t.level_code === levelCode) || tariffs[0];
        if (tp) {
          totalDue = (stu.status === 'REINSCRIT' ? tp.annual_total_old : tp.annual_total_new) || 0;
        }
      }

      const totalPaid = paidByStudent.get(stu.id) || 0;
      const balance = Math.max(0, totalDue - totalPaid);

      let paymentStatus = 'IMPAYE';
      if (totalDue === 0) paymentStatus = 'EXONERE';
      else if (balance === 0 && totalPaid > 0) paymentStatus = 'SOLDE';
      else if (totalPaid > 0) paymentStatus = 'PARTIEL';

      return {
        id: stu.id,
        matricule: stu.matricule,
        first_name: stu.first_name,
        last_name: stu.last_name,
        guardian_name: stu.guardian_name,
        guardian_phone: stu.guardian_phone,
        class_name: cls?.name || null,
        level_code: levelCode || null,
        cycle_code: cycleCode || null,
        total_paid: totalPaid,
        totalDue,
        balance,
        paymentStatus,
      };
    });

    result.sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || ''));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du calcul des soldes élèves.' });
  }
});

api.get('/finance/payments', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'PARENT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [rawPayments, students, classes, feeStructures, tariffPlans] = await Promise.all([
      listPayments(estId),
      listStudents(estId),
      listClasses(estId),
      listTenantDocs<any>(estId, 'fee_structures'),
      listTariffs(estId),
    ]);

    const studentMap = new Map((students || []).map((s: any) => [s.id, s]));
    const classMap = new Map((classes || []).map((c: any) => [c.id, c]));

    let payments = (rawPayments || []).map((p: any) => {
      const stu = studentMap.get(p.student_id);
      const cls = stu?.class_id ? classMap.get(stu.class_id) : null;
      return {
        ...p,
        matricule: p.matricule || stu?.matricule || null,
        first_name: p.first_name || stu?.first_name || null,
        last_name: p.last_name || stu?.last_name || null,
        guardian_name: stu?.guardian_name || null,
        class_name: p.class_name || cls?.name || null,
        level_code: cls?.level_code || null,
        cycle_code: cls?.cycle_code || null,
      };
    });

    if (req.user!.role === 'PARENT' && req.user!.student_id) {
      payments = payments.filter((p: any) => p.student_id === req.user!.student_id);
    }

    payments.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
    payments = payments.slice(0, 300);

    const activeTariffs = (tariffPlans || []).filter((t: any) => t.is_active !== 0);

    const enriched = payments.map((p: any) => {
      const stu = studentMap.get(p.student_id);
      const cls = stu?.class_id ? classMap.get(stu.class_id) : null;
      const fees = (feeStructures || [])
        .filter((f: any) => matchesFeeToStudent(f, cls, stu))
        .filter((f: any) => {
          if (stu?.status === 'REINSCRIT' && f.fee_type === 'INSCRIPTION') return false;
          if (stu?.status === 'INSCRIT' && f.fee_type === 'REINSCRIPTION') return false;
          return true;
        });

      let totalDue = fees.reduce((acc: number, curr: any) => acc + calculateFeeExigible(curr), 0);
      if (totalDue === 0 && activeTariffs.length > 0) {
        const tp = activeTariffs.find((t: any) => t.cycle_code === p.cycle_code || t.level_code === p.level_code) || activeTariffs[0];
        if (tp) totalDue = tp.annual_total_new || 0;
      }

      return {
        ...p,
        payer_name: p.payer_name || p.guardian_name || null,
        total_due: p.total_due !== undefined ? p.total_due : totalDue,
        reprint_count: p.reprint_count || 0,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des paiements.' });
  }
});

api.post('/finance/payments', authenticateToken, requireRole(['GESTIONNAIRE', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // SÉPARATION STRICTE DES POUVOIRS
    if (req.user!.role === 'PROMOTEUR') {
      return res.status(403).json({
        error: "Séparation des pouvoirs : Le Promoteur supervise les finances et configure les grilles tarifaires, mais ne peut pas encaisser de paiements directement en caisse. Cette opération est réservée au Gestionnaire / Secrétaire de caisse."
      });
    }

    if (req.user!.role === 'COMPTABLE') {
      return res.status(403).json({
        error: "Accès refusé : Le comptable gère les états financiers et les dépenses, mais ne peut pas encaisser directement les versements des élèves au guichet. Cette opération est réservée au Gestionnaire / Secrétaire de caisse."
      });
    }

    const {
      studentId,
      amount,
      paymentMethod,
      transactionReference,
      notes,
      paymentType,
      payerName,
      feeStructureId,
      selectedMonths,
      originalTariffAmount,
      modificationReason,
    } = req.body;

    const actualPaymentType = paymentType || 'FRAIS_MENSUELS';

    const numAmount = Number(amount);
    if (!studentId || isNaN(numAmount) || numAmount < MONTANT_MIN || numAmount > MONTANT_MAX || !paymentMethod) {
      return res.status(400).json({ error: `Le montant doit être compris entre ${MONTANT_MIN} F et ${MONTANT_MAX.toLocaleString('fr-FR')} F.` });
    }

    const estId = req.user!.establishment_id;

    // 1. Recherche de l'élève dans Firestore
    const [allStudents, classes, existingPayments, feeStructures, tariffs] = await Promise.all([
      listStudents(estId),
      listClasses(estId),
      listPayments(estId),
      listTenantDocs<any>(estId, 'fee_structures'),
      listTariffs(estId),
    ]);

    const cleanId = String(studentId || '').trim();
    let student = (allStudents || []).find((s: any) =>
      s.id === cleanId ||
      s.matricule === cleanId ||
      (s.id && String(s.id).toLowerCase() === cleanId.toLowerCase()) ||
      (s.matricule && String(s.matricule).toLowerCase() === cleanId.toLowerCase())
    );

    if (!student && cleanId) {
      try {
        student = await getStudent(estId, cleanId);
      } catch {}
    }

    if (!student) {
      return res.status(404).json({ error: 'Élève introuvable.' });
    }

    const classMap = new Map((classes || []).map((c: any) => [c.id, c]));
    const cls = student.class_id ? classMap.get(student.class_id) : null;
    const className = cls?.name || student.class_name || null;
    const levelCode = cls?.level_code || student.level_code;
    const cycleCode = cls?.cycle_code || student.cycle_code;

    // 2. Calcul du solde de l'élève basé sur la grille tarifaire de sa classe
    const applicableFees = (feeStructures || [])
      .filter((f: any) => matchesFeeToStudent(f, cls, student))
      .filter((f: any) => {
        if (student.status === 'REINSCRIT' && f.fee_type === 'INSCRIPTION') return false;
        if (student.status === 'INSCRIT' && f.fee_type === 'REINSCRIPTION') return false;
        return true;
      });

    let totalDue = applicableFees.reduce((acc: number, curr: any) => acc + calculateFeeExigible(curr), 0);

    if (totalDue === 0 && (tariffs || []).length > 0) {
      const activeTariffs = (tariffs || []).filter((t: any) => t.is_active !== 0);
      const tp = activeTariffs.find((t: any) => t.cycle_code === cycleCode || t.level_code === levelCode) || activeTariffs[0];
      if (tp) {
        totalDue = (student.status === 'REINSCRIT' ? tp.annual_total_old : tp.annual_total_new) || 0;
      }
    }

    const validPayments = (existingPayments || []).filter((p: any) =>
      p.status === 'VALIDE' && (p.student_id === student.id || p.matricule === student.matricule)
    );
    const totalAlreadyPaid = validPayments.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
    const balanceBefore = Math.max(0, totalDue - totalAlreadyPaid);

    // Contrôle si grille tarifaire configurée
    if (totalDue > 0 && numAmount > balanceBefore) {
      return res.status(400).json({
        error: `Le versement (${numAmount.toLocaleString('fr-FR')} F CFA) dépasse le solde restant dû (${balanceBefore.toLocaleString('fr-FR')} F CFA).`
      });
    }

    const newTotalPaid = totalAlreadyPaid + numAmount;
    const balanceAfter = Math.max(0, totalDue > 0 ? (totalDue - newTotalPaid) : 0);

    // Détection de dérogation / modification manuelle de tarif par rapport à la grille
    const origAmtNum = originalTariffAmount !== undefined && originalTariffAmount !== null && !isNaN(Number(originalTariffAmount))
      ? Number(originalTariffAmount)
      : null;
    const isModified = origAmtNum !== null && origAmtNum > 0 && origAmtNum !== numAmount;
    const modReason = modificationReason ? String(modificationReason).trim() : null;

    // 3. Génération du numéro de quittance séquentiel unique
    const est = await getEstablishment(estId);
    const year = est?.academic_year ? est.academic_year.substring(0, 4) : new Date().getFullYear().toString();
    let seqPay = (existingPayments || []).length + 1;
    let receiptNumber = `QT-${year}-${seqPay.toString().padStart(6, '0')}`;
    let attemptsPay = 0;

    const receiptSet = new Set((existingPayments || []).map((p: any) => p.receipt_number));
    while (receiptSet.has(receiptNumber) && attemptsPay < 1000) {
      attemptsPay++;
      receiptNumber = `QT-${year}-${(seqPay + attemptsPay).toString().padStart(6, '0')}`;
    }

    const id = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Contrôle strict d'unicité de la référence de transaction
    if (transactionReference && transactionReference.trim()) {
      const cleanRef = transactionReference.trim();
      const duplicateRef = (existingPayments || []).find((p: any) => p.transaction_reference === cleanRef && p.status === 'VALIDE');
      if (duplicateRef) {
        return res.status(409).json({ error: `La référence de transaction "${cleanRef}" a déjà été enregistrée pour la quittance ${duplicateRef.receipt_number}.` });
      }
    }

    const payerNameVal = (payerName && payerName.trim()) ? payerName.trim() : (student.guardian_name || null);
    const nowIso = new Date().toISOString();

    // Règle 6 : Figer la version et les réglages du modèle au moment de l'émission de la quittance
    let receiptTemplateConfig = await getSubcollectionDoc<any>(estId, 'document_templates', 'quittance');
    if (!receiptTemplateConfig) {
      receiptTemplateConfig = getDefaultTemplateConfig('quittance', est);
    }

    const paymentPayload = {
      id,
      establishment_id: estId,
      receipt_number: receiptNumber,
      student_id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      matricule: student.matricule,
      class_name: className,
      level_code: levelCode || null,
      cycle_code: cycleCode || null,
      payment_type: actualPaymentType,
      amount: numAmount,
      payment_method: paymentMethod,
      transaction_reference: transactionReference?.trim() || null,
      notes: notes?.trim() || null,
      payer_name: payerNameVal,
      cashier_id: req.user!.id,
      cashier_name: req.user!.full_name,
      status: 'VALIDE',
      reprint_count: 0,
      total_due: totalDue,
      total_paid_to_date: newTotalPaid,
      balance_after: balanceAfter,
      fee_structure_id: feeStructureId || null,
      tariff_modified: isModified,
      original_tariff_amount: isModified ? origAmtNum : null,
      modified_amount: isModified ? numAmount : null,
      modification_reason: isModified ? modReason : null,
      months_paid: Array.isArray(selectedMonths) && selectedMonths.length > 0 ? selectedMonths : null,
      template_snapshot: receiptTemplateConfig,
      created_at: nowIso,
    };

    // 4. Écriture directe dans Firestore (avec confirmation par await)
    await setPayment(id, paymentPayload);
    await setDocData(`establishments/${estId}/payments`, id, paymentPayload);

    // Audit standard de l'encaissement
    logAudit(estId, req.user!.id, req.user!.full_name, 'ENCAISSEMENT_PAIEMENT', 'PAYMENT', id, {
      receiptNumber,
      amount: numAmount,
      studentMatricule: student.matricule,
      payerName: payerNameVal,
      paymentMethod,
    });

    // Audit spécifique si modification du tarif proposé par la grille (Exigence 4)
    if (isModified) {
      logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_MONTANT_GRILLE_TARIFAIRE', 'PAYMENT', id, {
        receiptNumber,
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentMatricule: student.matricule,
        className,
        feeType: actualPaymentType,
        feeStructureId: feeStructureId || null,
        originalTariffAmount: origAmtNum,
        modifiedAmount: numAmount,
        difference: numAmount - origAmtNum!,
        modificationReason: modReason || 'Non spécifié (acompte, remise ou arrangement)',
        cashierName: req.user!.full_name,
        cashierId: req.user!.id,
        date: nowIso,
      });
    }

    let warningMsg: string | null = null;
    if (totalDue === 0) {
      warningMsg = "Encaissement effectué pour un élève sans grille tarifaire ou exonéré.";
    }

    // Confirmation d'écriture
    res.json({
      message: 'Paiement enregistré avec succès.',
      paymentId: id,
      receiptNumber,
      payment: paymentPayload,
      warning: warningMsg,
    });
  } catch (error: any) {
    console.error('Erreur encaissement versement:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l’encaissement.' });
  }
});

// Traçabilité des impressions et réimpressions de quittance (avec mention DUPLICATA)
api.post('/finance/payments/:id/log-print', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'ADMIN_GENERAL', 'PARENT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const payments = await listPayments(estId);
    let payment = (payments || []).find((p: any) => p.id === req.params.id);

    if (!payment) {
      payment = await getDocData(`establishments/${estId}/payments`, req.params.id);
    }

    if (!payment) return res.status(404).json({ error: 'Quittance introuvable.' });

    if (req.user!.role === 'PARENT' && req.user!.student_id !== payment.student_id) {
      return res.status(403).json({ error: 'Vous ne pouvez consulter que les quittances de votre enfant.' });
    }

    const currentCount = Number(payment.reprint_count || 0);
    const newCount = currentCount + 1;
    const nowIso = new Date().toISOString();
    const isReprint = currentCount > 0;
    const action = isReprint ? 'QUITTANCE_REIMPRESSION' : 'QUITTANCE_IMPRESSION';

    const updatedPayment = {
      ...payment,
      reprint_count: newCount,
      last_reprinted_at: nowIso,
    };

    await setPayment(req.params.id, updatedPayment);
    await setDocData(`establishments/${estId}/payments`, req.params.id, updatedPayment);

    logAudit(estId, req.user!.id, req.user!.full_name, action, 'PAYMENT', req.params.id, {
      receiptNumber: payment.receipt_number,
      amount: payment.amount,
      reprintCount: newCount,
      isReprint,
      timestamp: nowIso
    });

    res.json({
      success: true,
      reprintCount: newCount,
      isDuplicata: isReprint,
      lastReprintedAt: nowIso
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’enregistrement de l’impression.' });
  }
});

api.post('/finance/payments/:id/cancel', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { cancellationReason } = req.body;
    if (!cancellationReason || !cancellationReason.trim()) {
      return res.status(400).json({ error: 'Un motif officiel d’annulation est obligatoire.' });
    }

    const estId = req.user!.establishment_id;
    const payments = await listPayments(estId);
    let payment = (payments || []).find((p: any) => p.id === req.params.id);

    if (!payment) {
      payment = await getDocData(`establishments/${estId}/payments`, req.params.id);
    }

    if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });

    if (payment.status === 'ANNULE') {
      return res.status(400).json({ error: 'Cette quittance est déjà marquée comme ANNULÉE.' });
    }

    const nowIso = new Date().toISOString();
    const updatedPayload = {
      ...payment,
      status: 'ANNULE',
      cancellation_reason: cancellationReason.trim(),
      cancelled_by: req.user!.full_name,
      cancelled_by_id: req.user!.id,
      updated_at: nowIso,
    };

    await setPayment(req.params.id, updatedPayload);
    await setDocData(`establishments/${estId}/payments`, req.params.id, updatedPayload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'ANNULATION_PAIEMENT', 'PAYMENT', req.params.id, {
      receiptNumber: payment.receipt_number,
      amount: payment.amount,
      reason: cancellationReason.trim(),
    });

    res.json({ message: 'Quittance annulée avec traçabilité dans le journal d’audit.', payment: updatedPayload });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’annulation de la quittance.' });
  }
});

api.get('/finance/expenses', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const rawExpenses = await listExpenses(estId);
    const expenses = (rawExpenses || []);
    expenses.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json(expenses.slice(0, 100));
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des dépenses.' });
  }
});

api.post('/finance/expenses', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, description, amount, paymentMethod, beneficiary } = req.body;
    if (!category || !description || !amount || !beneficiary) {
      return res.status(400).json({ error: 'Catégorie, description, montant et bénéficiaire requis.' });
    }

    const estId = req.user!.establishment_id;
    const existingExpenses = await listExpenses(estId);
    let expSeq = (existingExpenses || []).length + 1;
    const expenseNumber = `DEP-${new Date().getFullYear()}-${expSeq.toString().padStart(4, '0')}`;
    const id = `EXP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const payload = {
      id,
      establishment_id: estId,
      schoolId: estId,
      expense_number: expenseNumber,
      category,
      description: description.trim(),
      amount: Number(amount),
      payment_method: paymentMethod || 'ESPECES',
      beneficiary: beneficiary.trim(),
      author_id: req.user!.id,
      author_name: req.user!.full_name,
      created_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/expenses`, id, payload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'SORTIE_DE_CAISSE', 'EXPENSE', id, {
      expenseNumber,
      amount: Number(amount),
      beneficiary,
    });

    res.json({ message: 'Dépense enregistrée avec succès.', expenseNumber, expense: payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’enregistrement de la dépense.' });
  }
});

// --- RENFORCEMENT ET APPORTS DE CAISSE (ENTRÉES NON-SCOLAIRES) ---

api.get('/finance/cash-injections', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const rawInjections = await listFundInjections(estId);
    const list = (rawInjections || []);
    list.sort((a: any, b: any) => (b.date || b.created_at || '').localeCompare(a.date || a.created_at || ''));
    res.json(list.slice(0, 100));
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des renforcements de caisse.' });
  }
});

api.post('/finance/cash-injections', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, providerName, paymentMethod, notes, reason, date } = req.body;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Montant supérieur à 0 FCFA requis.' });
    }

    const estId = req.user!.establishment_id;
    const existingInjections = await listFundInjections(estId);
    let seq = (existingInjections || []).length + 1;
    const injectionNumber = `APP-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;

    const id = `INJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const nowIso = new Date().toISOString();
    const dateVal = date || nowIso;
    const providerNameVal = (providerName && providerName.trim()) ? providerName.trim() : req.user!.full_name;
    const reasonVal = (reason || notes || 'Renforcement de caisse').trim();

    const payload = {
      id,
      establishment_id: estId,
      schoolId: estId,
      injection_number: injectionNumber,
      amount: numAmount,
      date: dateVal,
      reason: reasonVal,
      provider_name: providerNameVal,
      payment_method: paymentMethod || 'ESPECES',
      notes: notes?.trim() || reasonVal || null,
      createdBy: req.user!.full_name,
      author_id: req.user!.id,
      author_name: req.user!.full_name,
      created_at: nowIso,
    };

    // Écriture directe dans Firestore pour cash_reinforcements et fund_injections
    await setDocData(`establishments/${estId}/cash_reinforcements`, id, payload);
    await setDocData(`establishments/${estId}/fund_injections`, id, payload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'RENFORCEMENT_DE_CAISSE', 'CASH_INJECTION', id, {
      injectionNumber,
      amount: numAmount,
      providerName: providerNameVal,
      reason: reasonVal,
    });

    res.json({ message: 'Renforcement de caisse enregistré avec succès.', injectionNumber, reinforcement: payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’enregistrement du renforcement de caisse.' });
  }
});

api.get('/finance/summary', authenticateToken, requireRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [payments, injections, expenses] = await Promise.all([
      listPayments(estId),
      listFundInjections(estId),
      listExpenses(estId),
    ]);

    const paymentsSum = (payments || [])
      .filter((p: any) => (p.status === 'VALIDE' || p.status === 'CONFIRMED' || !p.status) && p.status !== 'ANNULE')
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    const injectionsSum = (injections || [])
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    const expensesSum = (expenses || [])
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    // Solde net en caisse = recettes + renforcements - dépenses.
    // Les "Total Recettes" ne doivent pas inclure les renforcements.
    const totalCollected = paymentsSum;
    const totalExpenses = expensesSum;
    const cashBalance = paymentsSum + injectionsSum - expensesSum;

    res.json({
      totalCollected,
      totalInjections: injectionsSum,
      totalExpenses,
      cashBalance,
      currency: 'FCFA',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du calcul du résumé financier.' });
  }
});

// ==========================================
// 11. TABLEAUX DE BORD DYNAMIQUES PAR RÔLE
// ==========================================

api.get('/dashboard/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const role = req.user!.role;

    // 1. Classes de l'établissement (même collection Firestore que l'écran des classes)
    const [subClasses, rootClasses] = await Promise.all([
      listSubcollectionDocs<any>(estId, 'classes').catch(() => []),
      queryDocs<any>('classes', 'establishment_id', '==', estId).catch(() => []),
    ]);
    const classMap = new Map<string, any>();
    for (const c of [...(subClasses || []), ...(rootClasses || [])]) {
      if (c && c.id) classMap.set(c.id, c);
    }
    const allClasses = Array.from(classMap.values());
    // Filtre des classes ouvertes : statut != ARCHIVE/ARCHIVED
    const openClasses = allClasses.filter((c: any) => c.status !== 'ARCHIVE' && c.status !== 'ARCHIVED');
    const totalClasses = openClasses.length;

    // 2. Élèves de l'établissement (Firestore)
    const [subStudents, rootStudents] = await Promise.all([
      listSubcollectionDocs<any>(estId, 'students').catch(() => []),
      queryDocs<any>('students', 'establishment_id', '==', estId).catch(() => []),
    ]);
    const studentMap = new Map<string, any>();
    for (const s of [...(subStudents || []), ...(rootStudents || [])]) {
      if (s && s.id) studentMap.set(s.id, s);
    }
    const allStudents = Array.from(studentMap.values());
    const activeStudents = allStudents.filter((s: any) => s.status !== 'ARCHIVE' && s.status !== 'ARCHIVED');
    const totalStudents = activeStudents.length;

    // 3. Personnel & Enseignants (Firestore)
    const allUsers = await listTenantUsers(estId).catch(() => []);
    const teachers = (allUsers || []).filter((u: any) => u.role === 'ENSEIGNANT' && u.status === 'ACTIVE');
    const totalTeachers = teachers.length;

    // 4. Finances (accessible Promoteur, DG, Comptable, Gestionnaire, Admin)
    let financialStats = null;
    if (['PROMOTEUR', 'DIRECTEUR_GENERAL', 'COMPTABLE', 'GESTIONNAIRE', 'ADMIN_GENERAL'].includes(role)) {
      const [payments, expenses, injections] = await Promise.all([
        listPayments(estId).catch(() => []),
        listExpenses(estId).catch(() => []),
        listFundInjections(estId).catch(() => []),
      ]);

      const validPayments = (payments || []).filter(
        (p: any) => (p.status === 'VALIDE' || p.status === 'CONFIRMED' || !p.status) && p.status !== 'ANNULE'
      );

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const monthStr = todayStr.substring(0, 7);
      const yearStr = todayStr.substring(0, 4);

      let todayCollected = 0;
      let monthCollected = 0;
      let yearCollected = 0;
      let totalCollected = 0;

      for (const p of validPayments) {
        const amt = Number(p.amount) || 0;
        totalCollected += amt;

        const pDate = (p.created_at || p.date || '').split('T')[0];
        if (pDate === todayStr) {
          todayCollected += amt;
        }
        if (pDate.startsWith(monthStr)) {
          monthCollected += amt;
        }
        if (pDate.startsWith(yearStr)) {
          yearCollected += amt;
        }
      }

      const sumExpenses = (expenses || []).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
      const sumInjections = (injections || []).reduce((acc: number, i: any) => acc + (Number(i.amount) || 0), 0);

      financialStats = {
        totalCollected,
        todayCollected,
        monthCollected,
        yearCollected,
        totalInjections: sumInjections,
        totalExpenses: sumExpenses,
        netCash: totalCollected + sumInjections - sumExpenses,
      };
    }

    // 5. Assiduité du jour (Firestore)
    const today = new Date().toISOString().split('T')[0];
    const attendances = await listStudentAttendances(estId).catch(() => []);
    const todayAttendances = (attendances || []).filter((a: any) => (a.date || '').startsWith(today));
    const todayAbsences = todayAttendances.filter((a: any) => a.status === 'ABSENT').length;
    const todayLates = todayAttendances.filter((a: any) => a.status === 'RETARD').length;
    const todayPresents = todayAttendances.filter((a: any) => a.status === 'PRESENT').length;

    // 6. Répartition par classe pour classesOverview
    const classStudentStats = new Map<string, { total: number; boys: number; girls: number }>();
    activeStudents.forEach((s: any) => {
      if (s.class_id) {
        const cur = classStudentStats.get(s.class_id) || { total: 0, boys: 0, girls: 0 };
        cur.total += 1;
        const g = (s.gender || s.sexe || '').toUpperCase();
        if (g === 'M') cur.boys += 1;
        if (g === 'F') cur.girls += 1;
        classStudentStats.set(s.class_id, cur);
      }
    });

    const classesOverview = openClasses.map((c: any) => {
      const counts = classStudentStats.get(c.id) || { total: 0, boys: 0, girls: 0 };
      const cap = Number(c.capacity) || 40;
      return {
        id: c.id,
        name: c.name,
        cycle_code: c.cycle_code,
        level_code: c.level_code,
        serie_code: c.serie_code || null,
        capacity: cap,
        room: c.room || null,
        student_count: counts.total,
        boys_count: counts.boys,
        girls_count: counts.girls,
        available_places: Math.max(0, cap - counts.total),
      };
    });
    classesOverview.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    // 7. Répartition par cycle
    const cycleCounts: Record<string, number> = {};
    activeStudents.forEach((s: any) => {
      const cls = s.class_id ? classMap.get(s.class_id) : null;
      const cycle = cls?.cycle_code || 'AUTRE';
      cycleCounts[cycle] = (cycleCounts[cycle] || 0) + 1;
    });
    const cycleDistribution = Object.entries(cycleCounts).map(([cycle_code, count]) => ({
      cycle_code,
      count,
    }));

    // 8. Discipline & Présences
    const incidents = await listDisciplinaryIncidents(estId).catch(() => []);
    const disciplineOverview = {
      totalIncidents: (incidents || []).length,
    };
    const attendanceOverview = {
      presents: todayPresents,
      absents: todayAbsences,
      lates: todayLates,
    };

    // 9. Paie (Promoteur, DG, Comptable)
    let payrollOverview: any = null;
    if (['PROMOTEUR', 'DIRECTEUR_GENERAL', 'COMPTABLE'].includes(role)) {
      const payrollRecords = await listPayrollRecords(estId).catch(() => []);
      const totalGross = (payrollRecords || []).reduce((acc: number, p: any) => acc + (Number(p.gross_amount) || 0), 0);
      const totalNet = (payrollRecords || []).reduce((acc: number, p: any) => acc + (Number(p.net_amount) || 0), 0);
      const totalPaid = (payrollRecords || [])
        .filter((p: any) => p.status === 'PAYE')
        .reduce((acc: number, p: any) => acc + (Number(p.net_amount) || 0), 0);
      const countPending = (payrollRecords || []).filter((p: any) => p.status === 'EN_ATTENTE_VALIDATION').length;
      const activeStaff = (allUsers || []).filter((u: any) => u.status === 'ACTIVE' && !['ELEVE', 'PARENT'].includes(u.role)).length;
      payrollOverview = {
        totalGross,
        totalNet,
        totalPaid,
        totalPendingValidation: countPending,
        totalStaff: activeStaff,
      };
    }

    // 10. Décisions administratives (Promoteur, DG)
    let decisionsOverview: any = null;
    if (['PROMOTEUR', 'DIRECTEUR_GENERAL'].includes(role)) {
      const decDocs = await listTenantDocs<any>(estId, 'administrative_decisions').catch(() => []);
      const total = (decDocs || []).length;
      const pending = (decDocs || []).filter((d: any) => d.decision === 'EN_ATTENTE').length;
      const approved = (decDocs || []).filter((d: any) => d.decision === 'APPROUVE').length;
      decisionsOverview = { total, pending, approved };
    }

    // 11. Données spécifiques pour Enseignant
    let teacherSpecific: any = null;
    if (role === 'ENSEIGNANT') {
      const [csList, teacherAtts, teacherLessons, teacherEvals, complaintsList] = await Promise.all([
        listClassSubjects(estId).catch(() => []),
        listTeacherCheckins(estId).catch(() => []),
        listLessonLogs(estId).catch(() => []),
        listEvaluations(estId).catch(() => []),
        listTenantDocs<any>(estId, 'complaints').catch(() => []),
      ]);

      const myClassSubjects = (csList || []).filter((cs: any) => cs.teacher_id === req.user!.id);
      const assignedClassIds = new Set(myClassSubjects.map((cs: any) => cs.class_id));
      const myClasses = openClasses
        .filter((c: any) => assignedClassIds.has(c.id))
        .map((c: any) => ({
          ...c,
          student_count: (classStudentStats.get(c.id) || { total: 0 }).total,
        }));

      const mySubjects = myClassSubjects.map((cs: any) => ({
        id: cs.subject_id,
        name: cs.subject_name || cs.name || '',
        code: cs.subject_code || cs.code || '',
      }));

      const myAttendances = (teacherAtts || [])
        .filter((ta: any) => ta.teacher_id === req.user!.id)
        .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 10);

      const schedHours = (teacherAtts || [])
        .filter((ta: any) => ta.teacher_id === req.user!.id)
        .reduce((acc: number, curr: any) => acc + (Number(curr.scheduled_hours) || 0), 0);
      const doneHours = (teacherAtts || [])
        .filter((ta: any) => ta.teacher_id === req.user!.id)
        .reduce((acc: number, curr: any) => acc + (Number(curr.hours_done) || 0), 0);
      const pendingConfirm = (teacherAtts || [])
        .filter((ta: any) => ta.teacher_id === req.user!.id && ta.validation_status === 'EN_ATTENTE').length;

      const myLessons = (teacherLessons || []).filter((ll: any) => ll.teacher_id === req.user!.id);
      const completedLessons = myLessons.filter((ll: any) => ll.status === 'VUE_TERMINEE').length;
      const inProgressLessons = myLessons.filter((ll: any) => ['EN_COURS', 'A_REVOIR', 'NON_TERMINEE'].includes(ll.status)).length;

      const myEvals = (teacherEvals || []).filter((ev: any) => ev.created_by === req.user!.id || ev.teacher_id === req.user!.id);
      const myComplaints = (complaintsList || []).filter(
        (comp: any) => comp.author_id === req.user!.id || (comp.concerned_person || '').includes(req.user!.full_name)
      );

      teacherSpecific = {
        assignedClassesCount: myClasses.length,
        classesList: myClasses,
        subjectsList: mySubjects,
        recentAttendances: myAttendances,
        scheduledHours: schedHours,
        hoursTaught: doneHours,
        pointagesToConfirmCount: pendingConfirm,
        completedLessonsCount: completedLessons,
        pendingLessonsCount: inProgressLessons,
        totalLessonsCount: myLessons.length,
        evaluationsToPrepareCount: myEvals.filter((ev: any) => !ev.is_locked).length,
        pendingGradesCount: 0,
        receivedObservations: [],
        complaintsCount: myComplaints.length,
        activeComplaints: myComplaints,
      };
    }

    // Inscriptions / Réinscriptions
    const newStudents = activeStudents.filter((s: any) => s.status === 'INSCRIT' || !s.status).length;
    const reEnrolled = activeStudents.filter((s: any) => s.status === 'REINSCRIT').length;

    res.json({
      role,
      totalStudents,
      totalClasses,
      totalTeachers,
      financialStats,
      todayAbsences,
      todayLates,
      teacherSpecific,
      cycleDistribution,
      classesOverview,
      disciplineOverview,
      payrollOverview,
      decisionsOverview,
      attendanceOverview,
      registrations: {
        newStudents,
        reEnrolled,
      },
    });
  } catch (error: any) {
    console.error('Erreur /dashboard/stats Firestore:', error);
    res.status(500).json({ error: error.message || 'Erreur lors du calcul des statistiques.' });
  }
});

// ==========================================
// 12. GESTION DE LA PAIE & SALAIRES (COMPTABLE, PROMOTEUR, DG)
// ==========================================

// --- PARAMÈTRES DE RÉMUNÉRATION (RÉSERVÉ AU PROMOTEUR) ---

api.get('/staff-salary-parameters', authenticateToken, requireRole(['PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [users, params] = await Promise.all([
      listTenantUsers(estId),
      listTenantDocs<any>(estId, 'staff_salary_parameters'),
    ]);

    const activeStaff = (users || []).filter(
      (u: any) => u.status === 'ACTIVE' && !['ELEVE', 'PARENT'].includes(u.role)
    );

    const paramsMap = new Map((params || []).map((p: any) => [p.user_id, p]));

    const result = activeStaff.map((u: any, idx: number) => {
      const sp = paramsMap.get(u.id) || {};
      const uniqueEmployeeCode = sp.employee_code && sp.employee_code !== 'EMP-CONGO'
        ? sp.employee_code
        : (u.employee_code && u.employee_code !== 'EMP-CONGO'
            ? u.employee_code
            : `EMP-${String(idx + 1).padStart(3, '0')}`);
      
      const isConfigured = Boolean(sp.is_configured || (sp.base_salary !== undefined && sp.base_salary !== null) || (sp.hourly_rate !== undefined && sp.hourly_rate !== null) || (sp.college_hourly_rate !== undefined && sp.college_hourly_rate !== null));

      return {
        user_id: u.id,
        full_name: u.full_name,
        username: u.username,
        role: u.role,
        phone: u.phone || null,
        id: sp.id || `SAL-${u.id}`,
        employee_code: uniqueEmployeeCode,
        is_configured: isConfigured,
        contract_type: sp.contract_type || null,
        start_date: sp.start_date || null,
        duration_end_date: sp.duration_end_date || null,
        wage_type: sp.wage_type || null,
        base_salary: sp.base_salary !== undefined ? sp.base_salary : null,
        hourly_rate: sp.hourly_rate !== undefined ? sp.hourly_rate : null,
        college_hourly_rate: sp.college_hourly_rate !== undefined ? sp.college_hourly_rate : null,
        lycee_hourly_rate: sp.lycee_hourly_rate !== undefined ? sp.lycee_hourly_rate : null,
        transport_allowance: sp.transport_allowance !== undefined ? sp.transport_allowance : null,
        responsibility_bonus: sp.responsibility_bonus !== undefined ? sp.responsibility_bonus : null,
        seniority_bonus: sp.seniority_bonus !== undefined ? sp.seniority_bonus : null,
        other_bonuses: sp.other_bonuses !== undefined ? sp.other_bonuses : null,
        overtime_rate: sp.overtime_rate !== undefined ? sp.overtime_rate : null,
        teaching_category: sp.teaching_category || null,
        teaching_level: sp.teaching_level || null,
        observations: sp.observations || '',
        active: sp.active !== undefined ? sp.active : 1,
        updated_at: sp.updated_at || null,
      };
    });

    result.sort((a: any, b: any) => {
      const rDiff = (a.role || '').localeCompare(b.role || '');
      if (rDiff !== 0) return rDiff;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des paramètres de rémunération.' });
  }
});

api.put('/staff-salary-parameters/:userId', authenticateToken, requireRole(['PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const estId = req.user!.establishment_id;
    const {
      contractType,
      startDate,
      durationEndDate,
      wageType,
      baseSalary,
      hourlyRate,
      collegeHourlyRate,
      lyceeHourlyRate,
      transportAllowance,
      responsibilityBonus,
      seniorityBonus,
      otherBonuses,
      overtimeRate,
      teachingCategory,
      teachingLevel,
      observations,
      active,
    } = req.body;

    const user = (await listTenantUsers(estId)).find((u: any) => u.id === userId);
    if (!user) return res.status(404).json({ error: 'Membre du personnel introuvable.' });

    const id = `SAL-${userId}`;
    const payload = {
      id,
      establishment_id: estId,
      user_id: userId,
      full_name: user.full_name,
      role: user.role,
      is_configured: true,
      contract_type: contractType || 'CDI',
      start_date: startDate || null,
      duration_end_date: durationEndDate || null,
      wage_type: wageType || (user.role === 'ENSEIGNANT' ? 'HORAIRE' : 'MENSUEL_FIXE'),
      base_salary: baseSalary !== undefined && baseSalary !== null && baseSalary !== '' ? Number(baseSalary) : null,
      hourly_rate: hourlyRate !== undefined && hourlyRate !== null && hourlyRate !== '' ? Number(hourlyRate) : null,
      college_hourly_rate: collegeHourlyRate !== undefined && collegeHourlyRate !== null && collegeHourlyRate !== '' ? Number(collegeHourlyRate) : null,
      lycee_hourly_rate: lyceeHourlyRate !== undefined && lyceeHourlyRate !== null && lyceeHourlyRate !== '' ? Number(lyceeHourlyRate) : null,
      transport_allowance: transportAllowance !== undefined && transportAllowance !== null && transportAllowance !== '' ? Number(transportAllowance) : null,
      responsibility_bonus: responsibilityBonus !== undefined && responsibilityBonus !== null && responsibilityBonus !== '' ? Number(responsibilityBonus) : null,
      seniority_bonus: seniorityBonus !== undefined && seniorityBonus !== null && seniorityBonus !== '' ? Number(seniorityBonus) : null,
      other_bonuses: otherBonuses !== undefined && otherBonuses !== null && otherBonuses !== '' ? Number(otherBonuses) : null,
      overtime_rate: overtimeRate !== undefined && overtimeRate !== null && overtimeRate !== '' ? Number(overtimeRate) : null,
      teaching_category: teachingCategory || null,
      teaching_level: teachingLevel || null,
      observations: observations ? String(observations).trim() : '',
      active: active !== undefined ? (active ? 1 : 0) : 1,
      updated_by: req.user!.id,
      updated_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/staff_salary_parameters`, id, payload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_PARAMETRE_SALAIRE', 'SALARY', userId, {
      wageType,
      contractType,
      baseSalary,
      hourlyRate,
    });

    res.json({ message: 'Contrat et rémunération enregistrés avec succès par le Promoteur.', parameter: payload });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du contrat et des rémunérations.' });
  }
});

// --- MOTEUR DE CALCUL AUTOMATIQUE DE LA PAIE (UTILISE LES CONTRATS CONFIGURÉS) ---
api.post('/finance/payroll/auto-calculate', authenticateToken, requireRole(['COMPTABLE', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period, department } = req.body;
    if (!period) return res.status(400).json({ error: 'Période (YYYY-MM) obligatoire.' });

    const estId = req.user!.establishment_id;

    // 1. Récupérer tous les membres du personnel, leurs contrats et pointages depuis Firestore (source unique de vérité)
    const [users, params, attendances, existingRecords, classes] = await Promise.all([
      listTenantUsers(estId),
      listTenantDocs<any>(estId, 'staff_salary_parameters'),
      listTeacherCheckins(estId).catch(() => []),
      listPayrollRecords(estId).catch(() => []),
      listClasses(estId).catch(() => []),
    ]);

    const paramsMap = new Map((params || []).map((p: any) => [p.user_id, p]));
    const existingMap = new Map((existingRecords || []).filter((r: any) => r.period === period).map((r: any) => [r.user_id, r]));
    const classMap = new Map((classes || []).map((c: any) => [c.id, c]));

    let eligibleStaff = (users || []).filter(
      (u: any) => u.status === 'ACTIVE' && !['ELEVE', 'PARENT'].includes(u.role)
    );

    if (department && department !== 'ALL') {
      if (department === 'ENSEIGNEMENT') {
        eligibleStaff = eligibleStaff.filter((u: any) => u.role === 'ENSEIGNANT');
      } else {
        eligibleStaff = eligibleStaff.filter((u: any) => u.role !== 'ENSEIGNANT');
      }
    }

    let calculatedCount = 0;
    const unconfiguredStaff: string[] = [];

    for (const staff of eligibleStaff) {
      const sp = paramsMap.get(staff.id);

      // Si le contrat n'a pas été configuré par le promoteur -> Alerte "Contrat non configuré"
      if (!sp || !sp.is_configured) {
        unconfiguredStaff.push(staff.full_name);
        continue;
      }

      const empCode = sp.employee_code || (staff.username ? `EMP-${staff.username.toUpperCase()}` : `EMP-${staff.id.slice(-4)}`);
      const dept = staff.role === 'ENSEIGNANT' ? 'ENSEIGNEMENT' : 'ADMINISTRATION';
      const jobTitle = staff.role === 'ENSEIGNANT' ? 'Professeur' : staff.role;
      const contractType = sp.contract_type || 'CDI';
      const wageType = sp.wage_type || (staff.role === 'ENSEIGNANT' ? 'HORAIRE' : 'MENSUEL_FIXE');

      // Si le bulletin est déjà VALIDE ou PAYE -> Ne JAMAIS modifier
      const existingSlip = existingMap.get(staff.id);
      if (existingSlip && (existingSlip.status === 'PAYE' || existingSlip.status === 'VALIDE')) {
        continue;
      }

      // Calcul des pointages du mois depuis Firestore (Source unique)
      const monthAttendances = (attendances || []).filter(
        (a: any) => a.teacher_id === staff.id && (a.date || '').startsWith(period)
      );

      let collegeHours = 0;
      let lyceeHours = 0;
      let totalTaughtHours = 0;
      let totalOvertimeHours = 0;

      for (const att of monthAttendances) {
        if (att.is_absent !== 1 && att.is_absent !== true) {
          const hours = Number(att.taught_hours !== undefined ? att.taught_hours : (att.hours_done || 0));
          totalTaughtHours += hours;

          // Ventilation des heures par cycle (Collège vs Lycée)
          let isLycee = false;
          if (att.class_ids) {
            const cls = classMap.get(att.class_ids);
            if (cls) {
              const cCycle = (cls.cycle_code || '').toUpperCase();
              const cLevel = (cls.level_code || cls.name || '').toLowerCase();
              if (cCycle === 'LYCEE' || cLevel.includes('2nde') || cLevel.includes('1ere') || cLevel.includes('terminale') || cLevel.includes('tle')) {
                isLycee = true;
              }
            }
          }

          if (isLycee) {
            lyceeHours += hours;
          } else {
            collegeHours += hours;
          }

          if (att.hours_done > att.scheduled_hours) {
            totalOvertimeHours += Number(att.hours_done - att.scheduled_hours);
          }
        }
      }

      let base = 0;
      let colRate = 0;
      let lycRate = 0;

      if (wageType === 'HORAIRE' || staff.role === 'ENSEIGNANT') {
        colRate = Number(sp.college_hourly_rate || sp.hourly_rate || 0);
        lycRate = Number(sp.lycee_hourly_rate || sp.hourly_rate || 0);

        if (sp.teaching_category === 'LYCEE_ONLY') {
          base = (collegeHours + lyceeHours) * lycRate;
          lyceeHours = collegeHours + lyceeHours;
          collegeHours = 0;
        } else if (sp.teaching_category === 'COLLEGE_ONLY') {
          base = (collegeHours + lyceeHours) * colRate;
          collegeHours = collegeHours + lyceeHours;
          lyceeHours = 0;
        } else {
          // COLLEGE_AND_LYCEE ou défaut
          if (collegeHours > 0 || lyceeHours > 0) {
            base = (collegeHours * colRate) + (lyceeHours * lycRate);
          } else {
            const defaultRate = Number(sp.hourly_rate || colRate || lycRate || 0);
            base = totalTaughtHours * defaultRate;
          }
        }
      } else {
        base = Number(sp.base_salary || 0);
      }

      // Primes saisies dans la fiche
      const transport = Number(sp.transport_allowance || 0);
      const resp = Number(sp.responsibility_bonus || 0);
      const sen = Number(sp.seniority_bonus || 0);
      const other = Number(sp.other_bonuses || 0);
      const bonuses = transport + resp + sen + other;

      const otRate = Number(sp.overtime_rate || 0);
      const overtimeAmount = totalOvertimeHours * otRate;

      const advances = Number(existingSlip?.advances || 0);
      const deductions = Number(existingSlip?.deductions || 0);

      const gross = base + bonuses + overtimeAmount;
      const net = Math.max(0, gross - deductions - advances);

      const id = existingSlip?.id || `PR-${period.replace('-', '')}-${staff.id.slice(-4)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

      const payrollPayload = {
        id,
        establishment_id: estId,
        user_id: staff.id,
        employee_code: empCode,
        full_name: staff.full_name,
        job_title: jobTitle,
        department: dept,
        contract_type: contractType,
        period,
        base_salary: base,
        college_hours: collegeHours,
        lycee_hours: lyceeHours,
        college_hourly_rate: colRate,
        lycee_hourly_rate: lycRate,
        total_taught_hours: totalTaughtHours,
        bonuses,
        overtime_hours: totalOvertimeHours,
        overtime_amount: overtimeAmount,
        advances,
        deductions,
        gross_amount: gross,
        net_amount: net,
        status: existingSlip?.status || 'CALCULE',
        notes: (staff.role === 'ENSEIGNANT' || wageType === 'HORAIRE')
          ? (totalTaughtHours > 0
              ? `Collège: ${collegeHours}h x ${colRate.toLocaleString()} FCFA | Lycée: ${lyceeHours}h x ${lycRate.toLocaleString()} FCFA`
              : `0 heure pointée pour ${period}`)
          : `Calculé selon fiche contrat (${contractType})`,
        created_at: existingSlip?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await setDocData(`establishments/${estId}/payroll_records`, id, payrollPayload);
      calculatedCount++;
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'CALCUL_AUTOMATIQUE_PAIE', 'PAYROLL', period, {
      period,
      calculatedCount,
      unconfiguredCount: unconfiguredStaff.length,
    });

    let warningMsg: string | null = null;
    if (unconfiguredStaff.length > 0) {
      warningMsg = `Contrat non configuré pour : ${unconfiguredStaff.join(', ')}. Veuillez remplir leur fiche "Contrat et rémunération" dans l'onglet Promoteur.`;
    }

    res.json({
      message: `Calcul automatique de la paie terminé : ${calculatedCount} bulletin(s) généré(s) pour la période ${period}.`,
      count: calculatedCount,
      unconfiguredStaff,
      unconfiguredCount: unconfiguredStaff.length,
      warning: warningMsg,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors du calcul automatique de la paie.' });
  }
});

api.get('/finance/payroll', authenticateToken, requireRole(['COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { period, department, status } = req.query;

    const [payrollRecords, users] = await Promise.all([
      listPayrollRecords(estId),
      listTenantUsers(estId),
    ]);

    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    let records = (payrollRecords || []).map((pr: any) => {
      const u = pr.user_id ? userMap.get(pr.user_id) : null;
      return {
        ...pr,
        user_full_name: u?.full_name || pr.full_name || null,
        user_phone: u?.phone || null,
      };
    });

    if (period) {
      records = records.filter((r: any) => r.period === period);
    }
    if (department) {
      records = records.filter((r: any) => r.department === department);
    }
    if (status) {
      records = records.filter((r: any) => r.status === status);
    }

    records.sort((a: any, b: any) => {
      const pDiff = (b.period || '').localeCompare(a.period || '');
      if (pDiff !== 0) return pDiff;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des fiches de paie.' });
  }
});



api.post('/finance/payroll', authenticateToken, requireRole(['COMPTABLE', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      userId,
      employeeCode,
      fullName,
      jobTitle,
      department,
      contractType,
      hireDate,
      period,
      baseSalary,
      bonuses,
      overtimeHours,
      overtimeAmount,
      advances,
      deductions,
      notes,
    } = req.body;

    if (!employeeCode || !fullName || !jobTitle || !department || !period) {
      return res.status(400).json({ error: 'Matricule, nom, fonction, service et période requis.' });
    }

    const base = Number(baseSalary || 0);
    const bon = Number(bonuses || 0);
    const otAmount = Number(overtimeAmount || 0);
    const adv = Number(advances || 0);
    const ded = Number(deductions || 0);

    const gross = base + bon + otAmount;
    const net = Math.max(0, gross - adv - ded);

    const id = `PAYROLL-${Date.now().toString(36).toUpperCase()}`;
    const payrollPayload = {
      id,
      establishment_id: req.user!.establishment_id,
      user_id: userId || null,
      employee_code: employeeCode.trim().toUpperCase(),
      full_name: fullName.trim(),
      job_title: jobTitle.trim(),
      department,
      contract_type: contractType || 'CDI',
      hire_date: hireDate || null,
      period,
      base_salary: base,
      bonuses: bon,
      overtime_hours: Number(overtimeHours || 0),
      overtime_amount: otAmount,
      advances: adv,
      deductions: ded,
      gross_amount: gross,
      net_amount: net,
      status: 'BROUILLON',
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/payroll_records`,
      docId: id,
      operation: 'CREATE',
      payload: payrollPayload,
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'CREATION_FICHE_PAIE', 'PAYROLL', id, {
      employeeCode,
      period,
      net,
      syncStatus: dualResult.syncStatus,
    });

    res.json({ message: 'Fiche de paie créée en brouillon.', payrollId: id, syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la création de la fiche de paie.' });
  }
});

api.put('/finance/payroll/:id', authenticateToken, requireRole(['COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await getDocData<any>(`establishments/${req.user!.establishment_id}/payroll_records`, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Fiche de paie introuvable.' });

    if (existing.status === 'PAYE') {
      return res.status(400).json({ error: 'Une fiche de paie déjà payée ne peut pas être modifiée.' });
    }

    const {
      baseSalary,
      bonuses,
      overtimeHours,
      overtimeAmount,
      advances,
      deductions,
      notes,
      contractType,
      jobTitle,
      department,
    } = req.body;

    const base = baseSalary !== undefined ? Number(baseSalary) : existing.base_salary;
    const bon = bonuses !== undefined ? Number(bonuses) : existing.bonuses;
    const otAmount = overtimeAmount !== undefined ? Number(overtimeAmount) : existing.overtime_amount;
    const adv = advances !== undefined ? Number(advances) : existing.advances;
    const ded = deductions !== undefined ? Number(deductions) : existing.deductions;

    const gross = base + bon + otAmount;
    const net = Math.max(0, gross - adv - ded);

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/payroll_records`,
      docId: req.params.id,
      operation: 'UPDATE',
      payload: {
        base_salary: base,
        bonuses: bon,
        overtime_hours: overtimeHours !== undefined ? Number(overtimeHours) : existing.overtime_hours,
        overtime_amount: otAmount,
        advances: adv,
        deductions: ded,
        gross_amount: gross,
        net_amount: net,
        contract_type: contractType || existing.contract_type,
        job_title: jobTitle || existing.job_title,
        department: department || existing.department,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    res.json({ message: 'Fiche de paie mise à jour.', syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

api.post('/finance/payroll/:id/submit', authenticateToken, requireRole(['COMPTABLE', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await updateDocData(`establishments/${req.user!.establishment_id}/payroll_records`, req.params.id, {
      status: 'EN_ATTENTE_VALIDATION',
      updated_at: new Date().toISOString(),
    });
    res.json({ message: 'Bulletin soumis à la direction pour validation.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la soumission.' });
  }
});

api.post('/finance/payroll/:id/validate', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const nowIso = new Date().toISOString();
    await updateDocData(`establishments/${req.user!.establishment_id}/payroll_records`, req.params.id, {
      status: 'VALIDE',
      validated_by: req.user!.full_name,
      validated_at: nowIso,
      updated_at: nowIso,
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'VALIDATION_PAIE', 'PAYROLL', req.params.id);
    res.json({ message: 'Bulletin de paie officiellement validé.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la validation.' });
  }
});

api.post('/finance/payroll/:id/pay', authenticateToken, requireRole(['COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentDate, paymentMethod, transactionRef } = req.body;
    const date = paymentDate || new Date().toISOString().split('T')[0];

    const dualResult = await executeDualWrite({
      establishmentId: req.user!.establishment_id,
      collectionPath: `establishments/${req.user!.establishment_id}/payroll_records`,
      docId: req.params.id,
      operation: 'UPDATE',
      payload: {
        status: 'PAYE',
        payment_date: date,
        payment_method: paymentMethod || 'ESPECES',
        transaction_ref: transactionRef || null,
        updated_at: new Date().toISOString(),
      },
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'DECAISSEMENT_SALAIRE', 'PAYROLL', req.params.id, {
      paymentDate: date,
      paymentMethod,
      syncStatus: dualResult.syncStatus,
    });

    res.json({ message: 'Paiement du salaire enregistré.', syncStatus: dualResult.syncStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de l’enregistrement du paiement.' });
  }
});

api.delete('/finance/payroll/:id', authenticateToken, requireRole(['COMPTABLE', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rec = await getDocData<any>(`establishments/${req.user!.establishment_id}/payroll_records`, req.params.id);
    if (!rec) return res.status(404).json({ error: 'Fiche introuvable.' });
    if (rec.status === 'PAYE' || rec.status === 'VALIDE') {
      return res.status(400).json({ error: 'Impossible de supprimer une fiche de paie validée ou payée.' });
    }

    await deleteDocData(`establishments/${req.user!.establishment_id}/payroll_records`, req.params.id);
    res.json({ message: 'Brouillon supprimé.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// ==========================================
// ==========================================
// 13. CAHIER DE TEXTE CENTRALISÉ, PROGRAMMES & SUIVI PÉDAGOGIQUE (100% FIRESTORE)
// ==========================================

// Helper: Verify if teacher is assigned to a class
async function verifyTeacherClassAssignment(estId: string, teacherId: string, classId: string): Promise<boolean> {
  const classSubjects = await listClassSubjects(estId);
  return (classSubjects || []).some((cs: any) => cs.class_id === classId && cs.teacher_id === teacherId);
}

// 1. Consultation des Cahiers de texte (Filtrée et Sécurisée par Rôle)
api.get('/lessons', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user!.role;
    // Strict HTTP 403 pour les rôles non autorisés (ex: Gestionnaire, Comptable, Surveillant)
    if (['GESTIONNAIRE', 'COMPTABLE', 'SURVEILLANT'].includes(role)) {
      return res.status(403).json({ error: 'Accès refusé. Le cahier de texte est réservé aux enseignants, à la direction pédagogique et aux familles.' });
    }

    const estId = req.user!.establishment_id;
    const { teacherId, classId, subjectId, date, status, incomplete } = req.query;

    const [tbDocs, legacyLogs, users, classes, subjects] = await Promise.all([
      listTenantDocs<any>(estId, 'textbook_entries').catch(() => []),
      listLessonLogs(estId).catch(() => []),
      listTenantUsers(estId).catch(() => []),
      listClasses(estId).catch(() => []),
      listSubjects(estId).catch(() => []),
    ]);

    const userMap = new Map((users || []).map((u: any) => [u.id, u.full_name]));
    const classMap = new Map((classes || []).map((c: any) => [c.id, c]));
    const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s]));

    // Fusionner textbook_entries et legacyLogs
    const docMap = new Map<string, any>();
    for (const item of [...(legacyLogs || []), ...(tbDocs || [])]) {
      if (item && item.id) docMap.set(item.id, item);
    }

    let lessons = Array.from(docMap.values()).map((ll: any) => {
      const cls = classMap.get(ll.class_id);
      const sub = subjectMap.get(ll.subject_id);
      return {
        ...ll,
        teacher_name: userMap.get(ll.teacher_id) || ll.teacher_name || null,
        class_name: cls?.name || ll.class_name || null,
        cycle_code: cls?.cycle_code || ll.cycle_code || null,
        level_code: cls?.level_code || ll.level_code || null,
        serie_code: cls?.serie_code || ll.serie_code || null,
        subject_name: sub?.name || ll.subject_name || null,
        subject_code: sub?.code || ll.subject_code || null,
      };
    });

    // Contrôle strict par rôle
    if (role === 'ENSEIGNANT') {
      lessons = lessons.filter((l: any) => l.teacher_id === req.user!.id);
    } else if (role === 'ELEVE' || role === 'PARENT') {
      // Élèves et parents ne voient PAS les séances 'Non fait' ni leurs motifs
      lessons = lessons.filter((l: any) => l.statut !== 'Non fait' && l.status !== 'NON_FAIT' && l.statut !== 'NON_FAIT');
      if (classId) {
        lessons = lessons.filter((l: any) => l.class_id === classId);
      }
      // Masquer les observations enseignant et motifs réservés à la direction
      lessons = lessons.map((l: any) => {
        const copy = { ...l };
        delete copy.teacher_observation;
        delete copy.observations;
        if (copy.statut === 'Partiellement fait' || copy.status === 'PARTIELLEMENT_VUE') {
          delete copy.motif;
        }
        return copy;
      });
    } else if (teacherId) {
      lessons = lessons.filter((l: any) => l.teacher_id === teacherId);
    }

    if (classId && role !== 'ELEVE' && role !== 'PARENT') lessons = lessons.filter((l: any) => l.class_id === classId);
    if (subjectId) lessons = lessons.filter((l: any) => l.subject_id === subjectId);
    if (date) lessons = lessons.filter((l: any) => l.date === date);
    if (status) lessons = lessons.filter((l: any) => l.status === status || l.statut === status);
    if (incomplete === 'true') lessons = lessons.filter((l: any) => l.incomplete === true);

    lessons.sort((a: any, b: any) => {
      const dDiff = (b.date || '').localeCompare(a.date || '');
      if (dDiff !== 0) return dDiff;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    res.json(lessons.slice(0, 200));
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération du cahier de texte.' });
  }
});

// 2. Saisie d'une Séance dans le Cahier de Texte (Firestore)
api.post('/lessons', authenticateToken, requireRole(['ENSEIGNANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const role = req.user!.role;

    if (['GESTIONNAIRE', 'COMPTABLE', 'SURVEILLANT'].includes(role)) {
      return res.status(403).json({ error: 'Accès refusé. Saisie non autorisée pour votre rôle.' });
    }

    const {
      classId,
      subjectId,
      date,
      timeSlot,
      startTime,
      endTime,
      durationMinutes,
      title,
      titre,
      chapter,
      chapitre,
      generalObjective,
      objectifGeneral,
      specificObjectives,
      objectifsSpecifiques,
      summaryContent,
      resume,
      exemple,
      statut,
      status,
      motif,
      travailAFaire,
      homework,
      homeworkDueDate,
      dateRemise,
      evaluationPrevue,
      observations,
      teacherObservation,
      teacherId,
      // Adaptations par niveau
      competenceVisee,
      objectifsPrescolaire,
      activiteRealisee,
      materielUtilise,
    } = req.body;

    const actualTitle = (titre || title || '').trim();
    if (!actualTitle) {
      return res.status(400).json({ error: 'Le titre de la leçon est obligatoire.' });
    }

    if (!classId || !subjectId || !date) {
      return res.status(400).json({ error: 'Classe, matière et date du cours obligatoires.' });
    }

    const assignedTeacherId = role === 'ENSEIGNANT' ? req.user!.id : (teacherId || req.user!.id);

    // Contrôle strict côté serveur pour l'enseignant : ne saisit que pour ses propres cours
    if (role === 'ENSEIGNANT') {
      const isAssigned = await verifyTeacherClassAssignment(estId, req.user!.id, classId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Accès refusé. Vous ne pouvez saisir un cahier de texte que pour les classes qui vous sont attribuées.' });
      }
    }

    const actualStatut = statut || (status === 'VUE_TERMINEE' ? 'Fait' : (status === 'PARTIELLEMENT_VUE' ? 'Partiellement fait' : 'Non fait'));

    // Le motif est obligatoire si le statut n'est pas "Fait"
    if (actualStatut !== 'Fait' && actualStatut !== 'VUE_TERMINEE') {
      if (!motif || !motif.trim()) {
        return res.status(400).json({ error: 'Le motif est obligatoire lorsque la séance n’est pas marquée comme "Fait".' });
      }
    }

    const genObj = (objectifGeneral || generalObjective || '').trim();
    const specObj = (objectifsSpecifiques || specificObjectives || '').trim();
    const sumCont = (resume || summaryContent || '').trim();

    // Détection fiche incomplète : objectif général, objectifs spécifiques ou résumé manquant
    const isIncomplete = !genObj || !specObj || !sumCont;

    const id = `TB-${Date.now().toString(36).toUpperCase()}`;
    const nowStr = new Date().toISOString();

    const payload: any = {
      id,
      establishment_id: estId,
      date,
      class_id: classId,
      subject_id: subjectId,
      teacher_id: assignedTeacherId,
      start_time: startTime || '08:00',
      end_time: endTime || '10:00',
      time_slot: timeSlot || `${startTime || '08:00'} - ${endTime || '10:00'}`,
      duration_minutes: Number(durationMinutes || 120),
      chapitre: chapitre || chapter || null,
      chapter: chapitre || chapter || null,
      titre: actualTitle,
      title: actualTitle,
      objectif_general: genObj || null,
      general_objective: genObj || null,
      objectifs_specifiques: specObj || null,
      specific_objectives: specObj || null,
      resume: sumCont || null,
      summary_content: sumCont || null,
      exemple: exemple || null,
      statut: actualStatut,
      status: actualStatut === 'Fait' ? 'VUE_TERMINEE' : (actualStatut === 'Partiellement fait' ? 'PARTIELLEMENT_VUE' : 'NON_FAIT'),
      motif: motif || null,
      travail_a_faire: travailAFaire || homework || null,
      homework: travailAFaire || homework || null,
      date_remise: dateRemise || homeworkDueDate || null,
      homework_due_date: dateRemise || homeworkDueDate || null,
      evaluation_prevue: evaluationPrevue || null,
      observations: observations || teacherObservation || null,
      teacher_observation: observations || teacherObservation || null,
      incomplete: isIncomplete,
      visa: null,
      // Adaptation par niveau
      competence_visee: competenceVisee || null,
      objectifs_prescolaire: Array.isArray(objectifsPrescolaire) ? objectifsPrescolaire : null,
      activite_realisee: activiteRealisee || null,
      materiel_utilise: materielUtilise || null,
      edit_history: [],
      de_approval: null,
      created_at: nowStr,
      updated_at: nowStr,
    };

    // Écriture 100% Firestore avec confirmation await
    await setDocData(`establishments/${estId}/textbook_entries`, id, payload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'SAISIE_CAHIER_TEXTE', 'TEXTBOOK_ENTRY', id, {
      title: actualTitle,
      classId,
      subjectId,
      date,
      statut: actualStatut,
      incomplete: isIncomplete,
    });

    res.json({
      message: isIncomplete ? 'Séance enregistrée (Fiche incomplète).' : 'Séance enregistrée dans le cahier de texte.',
      lessonId: id,
      id,
      incomplete: isIncomplete,
    });
  } catch (error: any) {
    console.error('Erreur POST /lessons Firestore:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la création de la séance.' });
  }
});

// 3. Modification d'une Séance (Verrou des 7 jours & Historique d'Audit)
api.put('/lessons/:id', authenticateToken, requireRole(['ENSEIGNANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const role = req.user!.role;

    if (['GESTIONNAIRE', 'COMPTABLE', 'SURVEILLANT'].includes(role)) {
      return res.status(403).json({ error: 'Accès refusé pour la modification.' });
    }

    const existingDoc = await getDocData(`establishments/${estId}/textbook_entries`, req.params.id) ||
                      await getDocData(`establishments/${estId}/lesson_logs`, req.params.id);

    if (!existingDoc) {
      return res.status(404).json({ error: 'Séance introuvable dans le cahier de texte.' });
    }

    // Un enseignant ne peut modifier que ses propres séances
    if (role === 'ENSEIGNANT' && existingDoc.teacher_id !== req.user!.id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier la séance d’un autre enseignant.' });
    }

    // Verrou des 7 jours
    const createdAtDate = existingDoc.created_at ? new Date(existingDoc.created_at) : new Date(existingDoc.date);
    const diffDays = (Date.now() - createdAtDate.getTime()) / (1000 * 3600 * 24);

    if (diffDays > 7 && role === 'ENSEIGNANT') {
      const isApprovedByDE = existingDoc.de_approval && existingDoc.de_approval.approved;
      if (!isApprovedByDE) {
        return res.status(403).json({
          error: 'Saisie verrouillée : Cette séance a été consignée il y a plus de 7 jours. Toute modification doit être préalablement approuvée par le Directeur des Études.',
        });
      }
    }

    const history = existingDoc.edit_history || [];
    history.push({
      user_id: req.user!.id,
      user_name: req.user!.full_name,
      timestamp: new Date().toISOString(),
      old_value: {
        titre: existingDoc.titre || existingDoc.title,
        statut: existingDoc.statut || existingDoc.status,
        resume: existingDoc.resume || existingDoc.summary_content,
      },
      reason: req.body.editReason || 'Mise à jour séance',
    });

    const {
      title, titre,
      chapter, chapitre,
      generalObjective, objectifGeneral,
      specificObjectives, objectifsSpecifiques,
      summaryContent, resume,
      statut, status, motif,
      travailAFaire, homework,
      dateRemise, homeworkDueDate,
      evaluationPrevue, observations, teacherObservation,
    } = req.body;

    const newTitle = (titre || title || existingDoc.titre || existingDoc.title).trim();
    const newGen = (objectifGeneral !== undefined ? objectifGeneral : (generalObjective !== undefined ? generalObjective : existingDoc.objectif_general)) || '';
    const newSpec = (objectifsSpecifiques !== undefined ? objectifsSpecifiques : (specificObjectives !== undefined ? specificObjectives : existingDoc.objectifs_specifiques)) || '';
    const newRes = (resume !== undefined ? resume : (summaryContent !== undefined ? summaryContent : existingDoc.resume)) || '';

    const isIncomplete = !newGen || !newSpec || !newRes;

    const updatedDoc = {
      ...existingDoc,
      titre: newTitle,
      title: newTitle,
      chapitre: chapitre || chapter || existingDoc.chapitre,
      chapter: chapitre || chapter || existingDoc.chapter,
      objectif_general: newGen || null,
      general_objective: newGen || null,
      objectifs_specifiques: newSpec || null,
      specific_objectives: newSpec || null,
      resume: newRes || null,
      summary_content: newRes || null,
      statut: statut || existingDoc.statut,
      status: status || existingDoc.status,
      motif: motif !== undefined ? motif : existingDoc.motif,
      travail_a_faire: travailAFaire || homework || existingDoc.travail_a_faire,
      homework: travailAFaire || homework || existingDoc.homework,
      date_remise: dateRemise || homeworkDueDate || existingDoc.date_remise,
      homework_due_date: dateRemise || homeworkDueDate || existingDoc.homework_due_date,
      evaluation_prevue: evaluationPrevue !== undefined ? evaluationPrevue : existingDoc.evaluation_prevue,
      observations: observations || teacherObservation || existingDoc.observations,
      teacher_observation: observations || teacherObservation || existingDoc.teacher_observation,
      incomplete: isIncomplete,
      edit_history: history,
      updated_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/textbook_entries`, req.params.id, updatedDoc);

    logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_CAHIER_TEXTE', 'TEXTBOOK_ENTRY', req.params.id, {
      diffDays: Math.round(diffDays),
    });

    res.json({ message: 'Séance mise à jour dans Firestore avec traçabilité.', doc: updatedDoc });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour.' });
  }
});

// 4. Visa de la séance ou de la semaine par le D.E. ou D.G.
api.post('/lessons/:id/visa', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { comments, approveEditLock } = req.body;

    const doc = await getDocData(`establishments/${estId}/textbook_entries`, req.params.id);
    if (!doc) return res.status(404).json({ error: 'Séance introuvable.' });

    const visaObj = {
      name: req.user!.full_name,
      date: new Date().toISOString(),
      role: req.user!.role,
      comments: comments || 'Séance visée et validée par la direction des études.',
    };

    const updates: any = {
      visa: visaObj,
      updated_at: new Date().toISOString(),
    };

    if (approveEditLock) {
      updates.de_approval = {
        approved: true,
        approved_by: req.user!.full_name,
        approved_at: new Date().toISOString(),
      };
    }

    await updateDocData(`establishments/${estId}/textbook_entries`, req.params.id, updates);

    logAudit(estId, req.user!.id, req.user!.full_name, 'VISA_CAHIER_TEXTE', 'TEXTBOOK_ENTRY', req.params.id);
    res.json({ message: 'Visa apposé avec succès sur la séance.', visa: visaObj });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du visa de la séance.' });
  }
});

// 5. Prévision de la semaine (Saisie & Copie de la semaine précédente)
api.get('/lessons/forecasts/week', authenticateToken, requireRole(['ENSEIGNANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { weekCode, teacherId } = req.query;
    const targetTeacher = req.user!.role === 'ENSEIGNANT' ? req.user!.id : (teacherId as string || req.user!.id);

    const forecasts = await listTenantDocs<any>(estId, 'textbook_forecasts');
    let filtered = (forecasts || []).filter((f: any) => f.teacher_id === targetTeacher);
    if (weekCode) {
      filtered = filtered.filter((f: any) => f.week_code === weekCode);
    }

    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des prévisions.' });
  }
});

api.post('/lessons/forecasts', authenticateToken, requireRole(['ENSEIGNANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { weekCode, classId, subjectId, dayOfWeek, plannedContent, objectives } = req.body;

    if (!weekCode || !classId || !subjectId || !plannedContent) {
      return res.status(400).json({ error: 'Code semaine, classe, matière et contenu prévu obligatoires.' });
    }

    const id = `FC-${Date.now().toString(36).toUpperCase()}`;
    const forecastDoc = {
      id,
      establishment_id: estId,
      teacher_id: req.user!.id,
      teacher_name: req.user!.full_name,
      week_code: weekCode,
      class_id: classId,
      subject_id: subjectId,
      day_of_week: dayOfWeek || 'Lundi',
      planned_content: plannedContent.trim(),
      objectives: objectives || null,
      created_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/textbook_forecasts`, id, forecastDoc);
    res.json({ message: 'Prévision enregistrée avec succès.', forecast: forecastDoc });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de l’enregistrement de la prévision.' });
  }
});

api.post('/lessons/forecasts/copy-previous', authenticateToken, requireRole(['ENSEIGNANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { currentWeekCode, previousWeekCode } = req.body;

    if (!currentWeekCode || !previousWeekCode) {
      return res.status(400).json({ error: 'Code de la semaine actuelle et précédente requis.' });
    }

    const forecasts = await listTenantDocs<any>(estId, 'textbook_forecasts');
    const prevList = (forecasts || []).filter(
      (f: any) => f.teacher_id === req.user!.id && f.week_code === previousWeekCode
    );

    if (prevList.length === 0) {
      return res.status(404).json({ error: 'Aucune prévision trouvée pour la semaine précédente.' });
    }

    const batch = db.batch();
    let copiedCount = 0;

    for (const item of prevList) {
      const newId = `FC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6)}`;
      const ref = db.collection(`establishments/${estId}/textbook_forecasts`).doc(newId);
      batch.set(ref, {
        ...item,
        id: newId,
        week_code: currentWeekCode,
        created_at: new Date().toISOString(),
      });
      copiedCount++;
    }

    await batch.commit();

    res.json({ message: `${copiedCount} prévision(s) copiée(s) depuis la semaine ${previousWeekCode}.`, count: copiedCount });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la copie des prévisions.' });
  }
});

// ==========================================
// PROGRAMMES SCOLAIRES (COLLECTION CURRICULUM FIRESTORE)
// ==========================================

// 1. Consultation des programmes scolaires
api.get('/curriculum', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ENSEIGNANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { levelCode, classId, subjectId } = req.query;

    const list = await listTenantDocs<any>(estId, 'curriculum').catch(() => []);
    let result = list || [];

    if (levelCode) result = result.filter((c: any) => c.level_code === levelCode);
    if (classId) result = result.filter((c: any) => c.class_id === classId);
    if (subjectId) result = result.filter((c: any) => c.subject_id === subjectId);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des programmes scolaires.' });
  }
});

// 2. Modèle CSV Téléchargeable
api.get('/curriculum/template', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const csvTemplate = `CycleCode;LevelCode;ClassId;SubjectId;SubjectName;ChapterNumber;ChapterTitle;GeneralObjective;SpecificObjectives;HourlyVolume;TextbookTitle;TextbookAuthor;TextbookPublisher;TextbookPage
COLLEGE;3EME;3E-A;MATH-01;Mathématiques;1;Équations du second degré;Résoudre des équations polynômes;Factorisation, Discriminant, Racines;12;CIAM 3ème;INRAP;EDICEF;45
COLLEGE;3EME;3E-A;MATH-01;Mathématiques;2;Théorème de Thalès;Appliquer le théorème de Thalès;Calcul de longueurs, Droites parallèles;10;CIAM 3ème;INRAP;EDICEF;80`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Modele_Programme_Scolaire.csv"');
  res.send(csvTemplate);
});

// 3. Importation CSV des programmes scolaires avec écriture par lot (Batch Write) & Anti-doublon
api.post('/curriculum/import-csv', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ error: 'Données CSV manquantes.' });
    }

    const lines = csvData.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      return res.status(400).json({ error: 'Fichier CSV vide ou dépourvu d’en-têtes.' });
    }

    const existingCurricula = await listTenantDocs<any>(estId, 'curriculum').catch(() => []);
    const curriculaMap = new Map<string, any>();
    existingCurricula.forEach((c) => {
      const key = `${c.level_code}_${c.subject_id}`;
      curriculaMap.set(key, c);
    });

    const batch = db.batch();
    let writtenCount = 0;

    // Ignorer la ligne d'en-tête
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map((c) => c.trim());
      if (cols.length < 7) continue;

      const [
        cycleCode, levelCode, classId, subjectId, subjectName,
        chapNum, chapTitle, genObj, specObjs, hourlyVol,
        tbTitle, tbAuthor, tbPub, tbPage
      ] = cols;

      if (!levelCode || !subjectId || !chapTitle) continue;

      const key = `${levelCode}_${subjectId}`;
      let curDoc = curriculaMap.get(key);

      if (!curDoc) {
        const docId = `CUR-${levelCode}-${subjectId}-${Date.now().toString(36).toUpperCase()}`;
        curDoc = {
          id: docId,
          establishment_id: estId,
          level_code: levelCode,
          cycle_code: cycleCode || 'COLLEGE',
          class_id: classId || null,
          subject_id: subjectId,
          subject_name: subjectName || 'Matière',
          chapters: [],
          textbook_ref: {
            title: tbTitle || '',
            author: tbAuthor || '',
            publisher: tbPub || '',
            page: tbPage || '',
          },
          created_at: new Date().toISOString(),
        };
        curriculaMap.set(key, curDoc);
      }

      // Anti-doublon sur le titre du chapitre
      const existingChapIndex = curDoc.chapters.findIndex((ch: any) => ch.title.toLowerCase() === chapTitle.toLowerCase());
      const chapData = {
        id: `CH-${Date.now().toString(36)}-${i}`,
        chapter_number: Number(chapNum) || curDoc.chapters.length + 1,
        title: chapTitle,
        general_objective: genObj || '',
        specific_objectives: specObjs ? specObjs.split(',').map((s: string) => s.trim()) : [],
        hourly_volume: Number(hourlyVol) || 8,
      };

      if (existingChapIndex >= 0) {
        curDoc.chapters[existingChapIndex] = chapData;
      } else {
        curDoc.chapters.push(chapData);
      }

      writtenCount++;
    }

    // Valider tous les documents par lot dans Firestore
    for (const curDoc of curriculaMap.values()) {
      const ref = db.collection(`establishments/${estId}/curriculum`).doc(curDoc.id);
      batch.set(ref, { ...curDoc, updated_at: new Date().toISOString() }, { merge: true });
    }

    await batch.commit();

    logAudit(estId, req.user!.id, req.user!.full_name, 'IMPORT_PROGRAMME_SCOLAIRE_CSV', 'CURRICULUM', null, {
      writtenCount,
    });

    res.json({
      message: `Importation réussie : ${writtenCount} chapitre(s) de programme écrit(s) dans Firestore sans doublon.`,
      count: writtenCount,
    });
  } catch (error: any) {
    console.error('Erreur import CSV curriculum:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l’importation du programme.' });
  }
});

// 4. Analyse IA d'un document / photo de programme officiel (Gemini API)
api.post('/curriculum/import-ai', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileBase64, mimeType, levelCode, subjectName } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: 'Document ou image du programme obligatoire.' });
    }

    const ai = new GoogleGenAI();
    const prompt = `Analyse ce document officiel du programme scolaire national (Congo-Brazzaville ou sous-région).
Extrais la liste structurée des chapitres avec leurs objectifs et volumes horaires.
Format JSON requis :
{
  "levelCode": "${levelCode || '3EME'}",
  "subjectName": "${subjectName || 'Matière'}",
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Titre exact du chapitre",
      "general_objective": "Objectif général",
      "specific_objectives": ["Objectif spécifique 1", "Objectif spécifique 2"],
      "hourly_volume": 10
    }
  ],
  "textbook_ref": {
    "title": "Titre manuel si mentionné",
    "author": "Auteur si mentionné"
  }
}
Si un champ n'est pas présent dans le document, laisse-le vide ou omission sans rien inventer. Ne renvoie QUE du JSON pur.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: fileBase64.replace(/^data:[^;]+;base64,/, ''),
              },
            },
          ],
        },
      ],
    });

    const responseText = response.text || '';
    const cleanedJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedJson);
    } catch {
      return res.status(422).json({ error: 'L’analyse IA n’a pas pu extraire un format structuré valide de ce document.', rawText: responseText });
    }

    res.json({
      message: 'Analyse IA du programme réussie. Aperçu prêt pour validation.',
      extractedData: parsedData,
    });
  } catch (error: any) {
    console.error('Erreur import AI curriculum:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l’analyse IA du programme scolaire.' });
  }
});

// ==========================================
// RÉFÉRENTIEL PROGRAMMES (MANUELS, LIVRES & GUIDES PÉDAGOGIQUES)
// ==========================================

const CURRICULUM_PROGRAMS_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'programmes');
if (!fs.existsSync(CURRICULUM_PROGRAMS_DIR)) {
  fs.mkdirSync(CURRICULUM_PROGRAMS_DIR, { recursive: true });
}

// 1. Liste des programmes scolaires (D.E, Enseignant, DG, Promoteur)
api.get('/curriculum-programs', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ENSEIGNANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { subjectId, classId, academicYear, search } = req.query;

    let programs: any[] = [];
    try {
      programs = await listCurriculumPrograms(estId);
    } catch {
      programs = [];
    }

    let filtered = [...programs];
    if (subjectId && typeof subjectId === 'string' && subjectId !== 'ALL') {
      filtered = filtered.filter(p => p.subject_id === subjectId || p.subject_name === subjectId);
    }
    if (classId && typeof classId === 'string' && classId !== 'ALL') {
      filtered = filtered.filter(p => p.class_id === classId || p.class_name === classId);
    }
    if (academicYear && typeof academicYear === 'string' && academicYear !== 'ALL') {
      filtered = filtered.filter(p => p.academic_year === academicYear);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.subject_name && p.subject_name.toLowerCase().includes(q)) ||
        (p.class_name && p.class_name.toLowerCase().includes(q)) ||
        (p.file_name && p.file_name.toLowerCase().includes(q))
      );
    }

    // Trier par date décroissante
    filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    // Alléger la payload réseau en retirant file_data (base64)
    const sanitized = filtered.map(({ file_data, ...rest }) => rest);
    res.json(sanitized);
  } catch (error: any) {
    console.error('Erreur get curriculum-programs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des programmes scolaires.' });
  }
});

// 2. Importer un nouveau programme (D.E, DG, Promoteur)
api.post('/curriculum-programs', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const {
      title,
      subject_id,
      subject_name,
      class_id,
      class_name,
      academic_year,
      file_name,
      file_type,
      file_size,
      file_base64
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Le titre du programme ou manuel est obligatoire.' });
    }
    if (!subject_name || !subject_name.trim()) {
      return res.status(400).json({ error: 'La matière est obligatoire.' });
    }
    if (!class_name || !class_name.trim()) {
      return res.status(400).json({ error: 'La classe est obligatoire.' });
    }
    if (!file_name || !file_base64) {
      return res.status(400).json({ error: 'Le fichier du programme est obligatoire.' });
    }

    // Limite de taille raisonnable (20 Mo)
    const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo
    if (file_size && Number(file_size) > MAX_SIZE_BYTES) {
      return res.status(400).json({ error: 'La taille du fichier dépasse la limite maximale autorisée de 20 Mo.' });
    }

    // Nettoyer les données base64
    let cleanBase64 = file_base64;
    let detectedMime = file_type || 'application/octet-stream';
    if (file_base64.includes(';base64,')) {
      const parts = file_base64.split(';base64,');
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch && mimeMatch[1]) {
        detectedMime = mimeMatch[1];
      }
    }

    const fileBuffer = Buffer.from(cleanBase64, 'base64');
    if (fileBuffer.length > MAX_SIZE_BYTES) {
      return res.status(400).json({ error: 'Le fichier dépasse la limite maximale autorisée de 20 Mo.' });
    }

    const programId = `PROG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const safeExt = path.extname(file_name) || '.bin';
    const estUploadDir = path.join(CURRICULUM_PROGRAMS_DIR, estId);
    if (!fs.existsSync(estUploadDir)) {
      fs.mkdirSync(estUploadDir, { recursive: true });
    }

    const diskFileName = `${programId}${safeExt}`;
    const diskFilePath = path.join(estUploadDir, diskFileName);
    fs.writeFileSync(diskFilePath, fileBuffer);

    const now = new Date().toISOString();
    const programRecord = {
      id: programId,
      establishment_id: estId,
      title: title.trim(),
      subject_id: subject_id || null,
      subject_name: subject_name.trim(),
      class_id: class_id || null,
      class_name: class_name.trim(),
      academic_year: academic_year || '2025-2026',
      file_name: file_name.trim(),
      file_type: detectedMime,
      file_size: fileBuffer.length,
      file_path: diskFilePath,
      uploaded_by_id: req.user!.id,
      uploaded_by_name: req.user!.full_name || req.user!.username,
      created_at: now,
      updated_at: now,
    };

    // Sauvegarde Cloud Firestore
    await setCurriculumProgram(estId, programId, programRecord);

    // Journal d'audit
    try {
      await logAudit(
        estId,
        req.user!.id,
        req.user!.full_name,
        'IMPORT_CURRICULUM_PROGRAM',
        'CURRICULUM_PROGRAM',
        programId,
        `Import du programme: ${programRecord.title} (${programRecord.subject_name} - ${programRecord.class_name})`
      );
    } catch {}

    res.status(201).json({
      message: 'Programme importé avec succès.',
      program: programRecord
    });
  } catch (error: any) {
    console.error('Erreur import curriculum program:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l’importation du programme.' });
  }
});

// 3. Modifier un programme (D.E, DG, Promoteur)
api.put('/curriculum-programs/:id', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { id } = req.params;
    const {
      title,
      subject_id,
      subject_name,
      class_id,
      class_name,
      academic_year,
      file_name,
      file_type,
      file_size,
      file_base64
    } = req.body;

    let existing: any = null;
    try {
      existing = await getCurriculumProgram(estId, id);
    } catch {}
    if (!existing) {
      return res.status(404).json({ error: 'Programme introuvable.' });
    }

    let filePath = existing.file_path;
    let fileName = existing.file_name;
    let fileType = existing.file_type;
    let fileSize = existing.file_size;

    // Si un nouveau fichier est fourni
    if (file_base64 && file_name) {
      const MAX_SIZE_BYTES = 20 * 1024 * 1024;
      if (file_size && Number(file_size) > MAX_SIZE_BYTES) {
        return res.status(400).json({ error: 'La taille du fichier dépasse la limite maximale de 20 Mo.' });
      }

      let cleanBase64 = file_base64;
      let detectedMime = file_type || 'application/octet-stream';
      if (file_base64.includes(';base64,')) {
        const parts = file_base64.split(';base64,');
        cleanBase64 = parts[1];
        const mimeMatch = parts[0].match(/data:(.*?)$/);
        if (mimeMatch && mimeMatch[1]) detectedMime = mimeMatch[1];
      }

      const fileBuffer = Buffer.from(cleanBase64, 'base64');
      if (fileBuffer.length > MAX_SIZE_BYTES) {
        return res.status(400).json({ error: 'Le fichier dépasse la limite maximale de 20 Mo.' });
      }

      const safeExt = path.extname(file_name) || '.bin';
      const estUploadDir = path.join(CURRICULUM_PROGRAMS_DIR, estId);
      if (!fs.existsSync(estUploadDir)) {
        fs.mkdirSync(estUploadDir, { recursive: true });
      }

      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }

      const diskFileName = `${id}${safeExt}`;
      filePath = path.join(estUploadDir, diskFileName);
      fs.writeFileSync(filePath, fileBuffer);

      fileName = file_name.trim();
      fileType = detectedMime;
      fileSize = fileBuffer.length;
    }

    const now = new Date().toISOString();
    const updatedRecord = {
      ...existing,
      title: title ? title.trim() : existing.title,
      subject_id: subject_id !== undefined ? subject_id : existing.subject_id,
      subject_name: subject_name ? subject_name.trim() : existing.subject_name,
      class_id: class_id !== undefined ? class_id : existing.class_id,
      class_name: class_name ? class_name.trim() : existing.class_name,
      academic_year: academic_year || existing.academic_year,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      file_path: filePath,
      updated_at: now,
    };

    // Mise à jour Cloud Firestore
    await setCurriculumProgram(estId, id, updatedRecord);

    // Journal d'audit
    try {
      await logAudit(
        estId,
        req.user!.id,
        req.user!.full_name,
        'UPDATE_CURRICULUM_PROGRAM',
        'CURRICULUM_PROGRAM',
        id,
        `Modification du programme: ${updatedRecord.title}`
      );
    } catch {}

    res.json({
      message: 'Programme mis à jour avec succès.',
      program: updatedRecord
    });
  } catch (error: any) {
    console.error('Erreur update curriculum program:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour du programme.' });
  }
});

// 4. Supprimer un programme (D.E, DG, Promoteur)
api.delete('/curriculum-programs/:id', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { id } = req.params;

    let existing: any = null;
    try {
      existing = await getCurriculumProgram(estId, id);
    } catch {}
    if (!existing) {
      return res.status(404).json({ error: 'Programme introuvable.' });
    }

    if (existing.file_path && fs.existsSync(existing.file_path)) {
      try {
        fs.unlinkSync(existing.file_path);
      } catch (err) {
        console.warn('Erreur suppression fichier disque:', err);
      }
    }

    // Suppression Cloud Firestore
    await deleteCurriculumProgramDoc(estId, id);

    // Journal d'audit
    try {
      await logAudit(
        estId,
        req.user!.id,
        req.user!.full_name,
        'DELETE_CURRICULUM_PROGRAM',
        'CURRICULUM_PROGRAM',
        id,
        `Suppression du programme: ${existing.title} (${existing.file_name})`
      );
    } catch {}

    res.json({ success: true, message: 'Programme supprimé avec succès.', id });
  } catch (error: any) {
    console.error('Erreur delete curriculum program:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la suppression du programme.' });
  }
});

// 5. Visualiser le fichier (Voir) - Supporte en-tête Authorization ou ?token=
api.get('/curriculum-programs/:id/file', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.query.token as string);

    if (!token) {
      return res.status(401).json({ error: 'Accès non autorisé : jeton requis.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expirée ou jeton invalide.' });
    }

    const estId = decoded.establishment_id;
    const { id } = req.params;

    let program: any = null;
    try {
      program = await getCurriculumProgram(estId, id);
    } catch {}

    if (!program) {
      return res.status(404).json({ error: 'Fichier du programme introuvable.' });
    }

    if (!program.file_path || !fs.existsSync(program.file_path)) {
      return res.status(404).json({ error: 'Le fichier physique n’existe plus dans le stockage.' });
    }

    res.setHeader('Content-Type', program.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(program.file_name)}"`);
    res.sendFile(path.resolve(program.file_path));
  } catch (error: any) {
    console.error('Erreur view curriculum program file:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du fichier.' });
  }
});

// 6. Télécharger le fichier (Télécharger) - Supporte en-tête Authorization ou ?token=
api.get('/curriculum-programs/:id/download', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.query.token as string);

    if (!token) {
      return res.status(401).json({ error: 'Accès non autorisé : jeton requis.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expirée ou jeton invalide.' });
    }

    const estId = decoded.establishment_id;
    const { id } = req.params;

    let program: any = null;
    try {
      program = await getCurriculumProgram(estId, id);
    } catch {}

    if (!program || !program.file_path || !fs.existsSync(program.file_path)) {
      return res.status(404).json({ error: 'Fichier introuvable dans le stockage.' });
    }

    res.download(path.resolve(program.file_path), program.file_name);
  } catch (error: any) {
    console.error('Erreur download curriculum program file:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du fichier.' });
  }
});

// ==========================================
// SUIVI DES DOSSIERS D'EXAMEN (BEPC & BAC) - DIRECTION DES ÉTUDES
// ==========================================

const DEFAULT_BEPC_DOCS = [
  { id: 'bepc-1', name: 'Acte de naissance légalisé', type: 'original', order: 1 },
  { id: 'bepc-2', name: 'Carte d identité scolaire / Carte photo officielle', type: 'original', order: 2 },
  { id: 'bepc-3', name: 'Diplôme ou Certificat officiel du CEPE', type: 'photocopie', order: 3 },
  { id: 'bepc-4', name: 'Relevé de notes officiel du CEPE', type: 'photocopie', order: 4 },
  { id: 'bepc-5', name: '4 Photos d identité récentes fond blanc', type: 'original', order: 5 },
  { id: 'bepc-6', name: 'Fiche d inscription dument signée', type: 'original', order: 6 },
];

const DEFAULT_BAC_DOCS = [
  { id: 'bac-1', name: 'Acte de naissance légalisé', type: 'original', order: 1 },
  { id: 'bac-2', name: 'Carte d identité scolaire / Carte photo officielle', type: 'original', order: 2 },
  { id: 'bac-3', name: 'Diplôme du BEPC ou Attestation de réussite', type: 'photocopie', order: 3 },
  { id: 'bac-4', name: 'Relevé de notes officiel du BEPC', type: 'photocopie', order: 4 },
  { id: 'bac-5', name: 'Bulletins des classes de Seconde, Première et Terminale', type: 'photocopie', order: 5 },
  { id: 'bac-6', name: '4 Photos d identité récentes fond blanc', type: 'original', order: 6 },
  { id: 'bac-7', name: 'Fiche de candidature au Baccalauréat signée', type: 'original', order: 7 },
];

// 1. Récupération / Initialisation de la configuration des documents exigés
api.get('/exam-dossiers/config', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const examType = (req.query.examType as string || 'BEPC').toUpperCase();
    const academicYear = (req.query.academicYear as string || '2025-2026');

    if (!['BEPC', 'BAC'].includes(examType)) {
      return res.status(400).json({ error: 'Type d examen invalide. Utilisez BEPC ou BAC.' });
    }

    const configId = `EXAM-CFG-${estId}-${academicYear}-${examType}`;
    let config = await getSubcollectionDoc<any>(estId, 'exam_configurations', configId).catch(() => null);

    if (!config) {
      // Auto-création de la configuration par défaut (champ deadline vide au départ selon les spécifications)
      const defaultDocs = examType === 'BEPC' ? DEFAULT_BEPC_DOCS : DEFAULT_BAC_DOCS;
      const defaultDeadline = null;
      const examName = examType === 'BEPC' ? 'BEPC — Brevet d Études du Premier Cycle' : 'BAC — Baccalauréat National';

      config = {
        id: configId,
        establishment_id: estId,
        academic_year: academicYear,
        exam_type: examType,
        exam_name: examName,
        deadline: defaultDeadline,
        required_documents: JSON.stringify(defaultDocs),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await setDocData(`establishments/${estId}/exam_configurations`, configId, config);
    }

    let parsedDocs = [];
    try {
      parsedDocs = typeof config.required_documents === 'string' ? JSON.parse(config.required_documents || '[]') : config.required_documents;
    } catch {
      parsedDocs = examType === 'BEPC' ? DEFAULT_BEPC_DOCS : DEFAULT_BAC_DOCS;
    }

    res.json({
      ...config,
      deadline: config.deadline || null,
      required_documents: parsedDocs,
    });
  } catch (error: any) {
    console.error('Erreur get exam-dossiers/config:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la configuration des examens.' });
  }
});

// 2. Mise à jour de la configuration des documents et de la date limite
api.put('/exam-dossiers/config', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const rawExamType = req.body.examType || req.body.exam_type;
    const { academicYear, deadline, required_documents, exam_name } = req.body;

    if (!rawExamType || !['BEPC', 'BAC'].includes(rawExamType.toUpperCase())) {
      return res.status(400).json({ error: 'Type d examen invalide (BEPC ou BAC).' });
    }
    if (!Array.isArray(required_documents) || required_documents.length === 0) {
      return res.status(400).json({ error: 'Au moins un document obligatoire doit être défini.' });
    }

    const normExamType = rawExamType.toUpperCase();
    const normYear = academicYear || '2025-2026';
    const configId = `EXAM-CFG-${estId}-${normYear}-${normExamType}`;
    const name = exam_name || (normExamType === 'BEPC' ? 'BEPC — Brevet d Études du Premier Cycle' : 'BAC — Baccalauréat National');
    const effectiveDeadline = deadline && String(deadline).trim().length > 0 ? String(deadline).trim() : null;

    const configPayload = {
      id: configId,
      establishment_id: estId,
      academic_year: normYear,
      exam_type: normExamType,
      exam_name: name,
      deadline: effectiveDeadline,
      required_documents: JSON.stringify(required_documents),
      updated_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/exam_configurations`, configId, configPayload);

    // Mettre à jour le nombre total de documents attendus sur tous les candidats existants dans Firestore
    const totalCount = required_documents.length;
    const allCandidates = await listTenantDocs<any>(estId, 'exam_candidates').catch(() => []);
    const matchingCandidates = (allCandidates || []).filter((c: any) => c.academic_year === normYear && c.exam_type === normExamType);
    const docIds = new Set(required_documents.map((d: any) => d.id));

    for (const cand of matchingCandidates) {
      let checklist: Record<string, any> = {};
      try { checklist = typeof cand.checklist === 'string' ? JSON.parse(cand.checklist || '{}') : (cand.checklist || {}); } catch {}

      // Compter les documents reçus qui figurent encore dans la liste active
      let receivedCount = 0;
      docIds.forEach((dId) => {
        if (checklist[dId] && (checklist[dId].received || checklist[dId].is_checked)) receivedCount++;
      });

      const newStatus = (receivedCount >= totalCount && totalCount > 0) ? 'COMPLET' : 'INCOMPLET';

      await updateDocData(`establishments/${estId}/exam_candidates`, cand.id, {
        documents_total_count: totalCount,
        documents_received_count: receivedCount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'CONFIG_DOSSIERS_EXAMEN', 'EXAM_CONFIG', configId, {
      examType: normExamType,
      deadline: effectiveDeadline,
      docsCount: totalCount,
    });

    res.json({
      message: 'Configuration des documents mise à jour avec succès.',
      config: { ...configPayload, required_documents },
      deadline: effectiveDeadline,
      required_documents,
    });
  } catch (error: any) {
    console.error('Erreur put exam-dossiers/config:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour de la configuration.' });
  }
});

// 3. Liste des candidats retenus et état des dossiers avec synchronisation automatique
api.get('/exam-dossiers/candidates', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const examType = (req.query.examType as string || 'BEPC').toUpperCase();
    const academicYear = (req.query.academicYear as string || '2025-2026');
    const serieCode = req.query.serieCode as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    // 1. Récupérer la configuration pour connaître le nombre total de documents requis
    const configId = `EXAM-CFG-${estId}-${academicYear}-${examType}`;
    let config = await getSubcollectionDoc<any>(estId, 'exam_configurations', configId).catch(() => null);

    if (!config) {
      try {
        const fsConfigs = await listTenantDocs<any>(estId, 'exam_configurations');
        config = (fsConfigs || []).find((c: any) => c.academic_year === academicYear && c.exam_type === examType);
      } catch {}
    }

    let requiredDocs: any[] = [];
    if (config) {
      try {
        requiredDocs = typeof config.required_documents === 'string' ? JSON.parse(config.required_documents) : config.required_documents;
      } catch {}
    }
    if (!requiredDocs || requiredDocs.length === 0) {
      requiredDocs = examType === 'BEPC' ? DEFAULT_BEPC_DOCS : DEFAULT_BAC_DOCS;
    }
    const totalDocsCount = requiredDocs.length;

    // 2. Charger les élèves et les classes depuis Firestore
    const [fsStudents, fsClasses, fsCandidates] = await Promise.all([
      listStudents(estId).catch(() => []),
      listClasses(estId).catch(() => []),
      listTenantDocs<any>(estId, 'exam_candidates').catch(() => []),
    ]);

    const classMap = new Map<string, any>();
    (fsClasses || []).forEach((c: any) => { if (c && c.id) classMap.set(c.id, c); });

    // Fusionner la liste des élèves (100% Firestore)
    const studentMap = new Map<string, any>();
    (fsStudents || []).forEach((s: any) => {
      if (s && s.id && s.status !== 'ARCHIVE' && s.status !== 'ARCHIVED') {
        const cls = classMap.get(s.class_id) || {};
        studentMap.set(s.id, {
          ...s,
          class_name: cls.name || s.class_name || null,
          level_code: cls.level_code || s.level_code || null,
          serie_code: cls.serie_code || s.serie_code || null,
          cycle_code: cls.cycle_code || s.cycle_code || null,
        });
      }
    });

    const allStudentsList = Array.from(studentMap.values());

    // Filtrer les élèves éligibles
    const eligibleStudents = allStudentsList.filter((s) => {
      const level = (s.level_code || '').toUpperCase();
      const cName = (s.class_name || '').toUpperCase();
      const cycle = (s.cycle_code || '').toUpperCase();

      if (examType === 'BEPC') {
        return level.includes('3') || cName.includes('3EME') || cName.includes('3È') || cName.includes('3E') || (cycle === 'COLLEGE' && level.includes('3'));
      } else {
        // BAC: Terminale
        return level.includes('TERM') || level.includes('TLE') || cName.includes('TERM') || cName.includes('TLE') || cName.includes('TERMINALE') || (cycle === 'LYCEE' && (level.includes('TLE') || level.includes('TERM')));
      }
    });

    // 3. Fusionner avec les fiches candidates enregistrées (Firestore)
    const savedCandMap = new Map<string, any>();
    (fsCandidates || []).forEach((c: any) => {
      if (c && (c.student_id || c.id)) {
        const key = c.student_id || c.id.replace(`CAND-${estId}-${academicYear}-${examType}-`, '');
        savedCandMap.set(key, c);
      }
    });

    // 4. Construire la liste complète des candidats
    let candidates = eligibleStudents.map((st) => {
      const saved = savedCandMap.get(st.id);
      const candId = saved?.id || `CAND-${estId}-${academicYear}-${examType}-${st.id}`;

      let parsedChecklist: Record<string, any> = {};
      if (saved) {
        try {
          parsedChecklist = typeof saved.checklist === 'string' ? JSON.parse(saved.checklist) : (saved.checklist || {});
        } catch {}
      }

      // Extraction ou déduction de la série pour le BAC
      let extractedSerie = st.serie_code || saved?.serie_code || '';
      if (!extractedSerie && st.class_name) {
        const match = st.class_name.match(/(?:Série|Sér\.?|Tle|Terminale)?\s*([A-Z0-9]{1,3})/i);
        if (match && ['A', 'A4', 'C', 'D', 'TI', 'G1', 'G2', 'G3', 'BG'].includes(match[1].toUpperCase())) {
          extractedSerie = match[1].toUpperCase();
        }
      }

      let receivedCount = 0;
      requiredDocs.forEach((d: any) => {
        if (parsedChecklist[d.id] && (parsedChecklist[d.id].received || parsedChecklist[d.id].is_checked)) {
          receivedCount++;
        }
      });

      const isComplete = totalDocsCount > 0 && receivedCount >= totalDocsCount;
      const isRetained = saved ? (saved.is_retained === 1 || saved.is_retained === true) : true;

      return {
        id: candId,
        establishment_id: estId,
        academic_year: academicYear,
        exam_type: examType,
        student_id: st.id,
        class_id: st.class_id || '',
        serie_code: extractedSerie || null,
        is_retained: Boolean(isRetained),
        checklist: parsedChecklist,
        status: isComplete ? 'COMPLET' : 'INCOMPLET',
        documents_received_count: receivedCount,
        documents_total_count: totalDocsCount,
        first_name: st.first_name || '',
        last_name: st.last_name || '',
        matricule: st.matricule || '',
        gender: st.gender || 'M',
        birth_date: st.birth_date || null,
        photo_data: st.photo_data || null,
        guardian_name: st.guardian_name || null,
        guardian_phone: st.guardian_phone || null,
        guardian_relation: st.guardian_relation || 'Parent',
        class_name: st.class_name || (examType === 'BEPC' ? '3ème' : 'Terminale'),
      };
    });

    // Filtres
    if (serieCode && serieCode !== 'ALL' && serieCode !== 'TOUTES') {
      candidates = candidates.filter((c) => {
        const cSerie = (c.serie_code || '').toUpperCase();
        const targetSerie = serieCode.toUpperCase();
        const className = (c.class_name || '').toUpperCase();
        return cSerie === targetSerie || className.includes(targetSerie);
      });
    }

    if (status && status !== 'ALL') {
      candidates = candidates.filter((c) => c.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      candidates = candidates.filter((c) =>
        (c.first_name && c.first_name.toLowerCase().includes(q)) ||
        (c.last_name && c.last_name.toLowerCase().includes(q)) ||
        (c.matricule && c.matricule.toLowerCase().includes(q)) ||
        (c.class_name && c.class_name.toLowerCase().includes(q))
      );
    }

    // Tri alphabétique par nom puis prénom
    candidates.sort((a, b) => {
      const lDiff = (a.last_name || '').localeCompare(b.last_name || '');
      if (lDiff !== 0) return lDiff;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });

    res.json({
      candidates,
      config: config ? { ...config, required_documents: requiredDocs } : null,
      total_count: candidates.length,
    });
  } catch (error: any) {
    console.error('Erreur get exam-dossiers/candidates:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des candidats aux examens.' });
  }
});

// 4. Basculer l'état "Retenu / Non retenu" d'un candidat
api.post('/exam-dossiers/candidates/toggle-retained', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { candidateId, studentId, examType, academicYear, isRetained } = req.body;

    if (!candidateId && !studentId) {
      return res.status(400).json({ error: 'Identifiant du candidat requis.' });
    }

    const val = isRetained ? 1 : 0;
    const effCandId = candidateId || `CAND-${estId}-${academicYear || '2025-2026'}-${examType || 'BEPC'}-${studentId}`;

    const existing = await getSubcollectionDoc<any>(estId, 'exam_candidates', effCandId).catch(() => null);
    const extractedStuId = effCandId.includes('-STU-') ? 'STU-' + effCandId.split('-STU-')[1] : '';
    const resolvedStudentId = studentId || existing?.student_id || extractedStuId || '';
    
    const updated = {
      ...(existing || {}),
      id: effCandId,
      establishment_id: estId,
      student_id: resolvedStudentId,
      exam_type: examType || existing?.exam_type || 'BEPC',
      academic_year: academicYear || existing?.academic_year || '2025-2026',
      is_retained: val,
      updated_at: new Date().toISOString(),
    };
    await setDocData(`establishments/${estId}/exam_candidates`, effCandId, updated);

    res.json({ success: true, candidateId: effCandId, isRetained: Boolean(val) });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du changement d éligibilité.' });
  }
});

// 5. Basculer l'état "Retenu" en masse (tous les élèves de 3e ou d'une série)
api.post('/exam-dossiers/candidates/toggle-all-retained', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { examType, academicYear, serieCode, isRetained, candidatesList } = req.body;

    const val = isRetained ? 1 : 0;
    const effExamType = examType || 'BEPC';
    const effYear = academicYear || '2025-2026';

    const allCandidates = await listTenantDocs<any>(estId, 'exam_candidates').catch(() => []);
    let filtered = (allCandidates || []).filter((c: any) => c.academic_year === effYear && c.exam_type === effExamType);
    if (serieCode && serieCode !== 'ALL' && serieCode !== 'TOUTES') {
      filtered = filtered.filter((c: any) => c.serie_code === serieCode);
    }

    const batch = db.batch();
    const nowIso = new Date().toISOString();

    for (const cand of filtered) {
      const ref = db.collection(`establishments/${estId}/exam_candidates`).doc(cand.id);
      batch.update(ref, { is_retained: val, updated_at: nowIso });
    }

    if (Array.isArray(candidatesList) && candidatesList.length > 0) {
      for (const cand of candidatesList) {
        const cId = cand.id || `CAND-${estId}-${effYear}-${effExamType}-${cand.student_id || cand.id}`;
        const ref = db.collection(`establishments/${estId}/exam_candidates`).doc(cId);
        const resolvedStuId = cand.student_id || (cand.id && !cand.id.startsWith('CAND-') ? cand.id : '') || (cId.includes('-STU-') ? 'STU-' + cId.split('-STU-')[1] : '');
        batch.set(ref, {
          id: cId,
          establishment_id: estId,
          academic_year: effYear,
          exam_type: effExamType,
          student_id: resolvedStuId || '',
          class_id: cand.class_id || '',
          serie_code: cand.serie_code || null,
          is_retained: val,
          checklist: JSON.stringify(cand.checklist || {}),
          status: cand.status || 'INCOMPLET',
          updated_at: nowIso,
        }, { merge: true });
      }
    }

    await batch.commit();

    res.json({ success: true, isRetained: Boolean(val) });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la modification en masse.' });
  }
});

// 6. Cocher / Décocher un document physique apporté par l'élève (Historique automatique)
api.post('/exam-dossiers/candidates/:candidateId/check-doc', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { candidateId } = req.params;
    const { docId, docName, received, isChecked } = req.body;

    if (!docId) {
      return res.status(400).json({ error: 'Identifiant du document requis.' });
    }

    const isRec = received !== undefined ? Boolean(received) : Boolean(isChecked);

    let candidate = await getSubcollectionDoc<any>(estId, 'exam_candidates', candidateId).catch(() => null);

    const year = candidate?.academic_year || '2025-2026';
    const eType = candidate?.exam_type || 'BEPC';

    const configId = `EXAM-CFG-${estId}-${year}-${eType}`;
    let config = await getSubcollectionDoc<any>(estId, 'exam_configurations', configId).catch(() => null);
    if (!config) {
      try {
        const fsCfgs = await listTenantDocs<any>(estId, 'exam_configurations');
        config = (fsCfgs || []).find((c: any) => c.academic_year === year && c.exam_type === eType);
      } catch {}
    }

    let requiredDocs: any[] = [];
    if (config) {
      try {
        requiredDocs = typeof config.required_documents === 'string' ? JSON.parse(config.required_documents) : config.required_documents;
      } catch {}
    }
    if (!requiredDocs || requiredDocs.length === 0) {
      requiredDocs = eType === 'BEPC' ? DEFAULT_BEPC_DOCS : DEFAULT_BAC_DOCS;
    }

    const totalDocsCount = requiredDocs.length;
    let checklist: Record<string, any> = {};
    if (candidate && candidate.checklist) {
      try {
        checklist = typeof candidate.checklist === 'string' ? JSON.parse(candidate.checklist) : candidate.checklist;
      } catch {}
    }

    const now = new Date().toISOString();

    if (isRec) {
      checklist[docId] = {
        doc_id: docId,
        received: true,
        is_checked: true,
        received_at: now,
        checked_at: now,
        received_by_id: req.user!.id,
        received_by_name: req.user!.full_name || req.user!.username,
        checked_by_name: req.user!.full_name || req.user!.username,
      };
    } else {
      checklist[docId] = {
        doc_id: docId,
        received: false,
        is_checked: false,
        uncheck_at: now,
        uncheck_by_name: req.user!.full_name || req.user!.username,
      };
    }

    // Calcul du nombre de documents reçus
    let receivedCount = 0;
    requiredDocs.forEach((d) => {
      if (checklist[d.id] && (checklist[d.id].received || checklist[d.id].is_checked)) receivedCount++;
    });

    const status = (receivedCount >= totalDocsCount && totalDocsCount > 0) ? 'COMPLET' : 'INCOMPLET';

    // Sauvegarde Cloud Firestore
    const candPayload = {
      id: candidateId,
      establishment_id: estId,
      academic_year: year,
      exam_type: eType,
      student_id: candidate?.student_id || (candidateId.includes('-STU-') ? 'STU-' + candidateId.split('-STU-')[1] : ''),
      class_id: candidate?.class_id || '',
      serie_code: candidate?.serie_code || null,
      is_retained: candidate?.is_retained !== undefined ? candidate.is_retained : 1,
      checklist: JSON.stringify(checklist),
      status,
      documents_received_count: receivedCount,
      documents_total_count: totalDocsCount,
      updated_at: now,
    };
    await setDocData(`establishments/${estId}/exam_candidates`, candidateId, candPayload);

    // Enregistrement immuable dans l'historique d'audit Firestore
    const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await setDocData(`establishments/${estId}/exam_dossier_logs`, logId, {
      id: logId,
      establishment_id: estId,
      candidate_id: candidateId,
      student_id: candidate?.student_id || '',
      exam_type: eType,
      doc_id: docId,
      doc_name: docName || docId,
      action: isRec ? 'CHECKED' : 'UNCHECKED',
      user_id: req.user!.id,
      user_name: req.user!.full_name || req.user!.username,
      created_at: now,
    });

    res.json({
      success: true,
      candidateId,
      docId,
      received: isRec,
      is_checked: isRec,
      documents_received_count: receivedCount,
      documents_total_count: totalDocsCount,
      status,
      checklist,
    });
  } catch (error: any) {
    console.error('Erreur check-doc:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l enregistrement de la pièce.' });
  }
});

// 7. Historique d'audit et notifications pour un candidat
api.get('/exam-dossiers/candidates/:candidateId/logs', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { candidateId } = req.params;

    const [allAuditLogs, allNotifLogs] = await Promise.all([
      listTenantDocs<any>(estId, 'exam_dossier_logs').catch(() => []),
      listTenantDocs<any>(estId, 'exam_notification_logs').catch(() => []),
    ]);

    const auditLogs = (allAuditLogs || [])
      .filter((l: any) => l.candidate_id === candidateId)
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 50);

    const notificationLogs = (allNotifLogs || [])
      .filter((l: any) => l.candidate_id === candidateId)
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 50);

    res.json({
      audit_logs: auditLogs,
      notification_logs: notificationLogs,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l historique.' });
  }
});

// 8. Envoi d'une notification individuelle (WhatsApp, SMS, In-App)
api.post('/exam-dossiers/notifications/send', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { candidateId, studentId, recipientName, recipientPhone, channel, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Le contenu du message est obligatoire.' });
    }

    const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await setDocData(`establishments/${estId}/exam_notification_logs`, notifId, {
      id: notifId,
      establishment_id: estId,
      candidate_id: candidateId,
      student_id: studentId || null,
      recipient_name: recipientName || 'Parent / Candidat',
      recipient_phone: recipientPhone || null,
      channel: channel || 'WHATSAPP',
      message: message.trim(),
      sent_by_id: req.user!.id,
      sent_by_name: req.user!.full_name || req.user!.username,
      created_at: now,
    });

    // Si canal IN_APP, créer également une circulaire interne dans Firestore
    if (channel === 'IN_APP') {
      try {
        const annId = `ANN-EXAM-${Date.now()}`;
        await setDocData(`establishments/${estId}/school_announcements`, annId, {
          id: annId,
          establishment_id: estId,
          title: 'Rappel : Pièces manquantes au dossier d examen officiel',
          content: message.trim(),
          target_audience: 'PARENTS',
          category: 'EXAMEN',
          author_id: req.user!.id,
          author_name: req.user!.full_name,
          created_at: now,
        });
      } catch (annErr) {
        console.warn('Erreur creation annonce in-app:', annErr);
      }
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'ENVOI_RAPPEL_DOSSIER_EXAMEN', 'EXAM_NOTIFICATION', notifId, {
      candidateId,
      recipientName,
      channel,
    });

    res.json({
      success: true,
      message: 'Notification enregistrée dans l historique.',
      log: {
        id: notifId,
        recipient_name: recipientName,
        channel,
        created_at: now,
      },
    });
  } catch (error: any) {
    console.error('Erreur send notification:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l envoi de la notification.' });
  }
});

// 9. Envoi groupé à tous les dossiers incomplets
api.post('/exam-dossiers/notifications/send-bulk', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { notifications, channel } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ error: 'Aucune notification à envoyer.' });
    }

    const now = new Date().toISOString();
    let sentCount = 0;

    for (const item of notifications) {
      if (item.candidateId && item.message) {
        const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await setDocData(`establishments/${estId}/exam_notification_logs`, notifId, {
          id: notifId,
          establishment_id: estId,
          candidate_id: item.candidateId,
          student_id: item.studentId || '',
          recipient_name: item.recipientName || 'Parent / Élève',
          recipient_phone: item.recipientPhone || null,
          channel: channel || 'WHATSAPP',
          message: item.message,
          sent_by_id: req.user!.id,
          sent_by_name: req.user!.full_name || req.user!.username,
          created_at: now,
        });
        sentCount++;
      }
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'ENVOI_GROUPE_RAPPEL_EXAMEN', 'EXAM_NOTIFICATION', `BULK-${Date.now()}`, {
      count: sentCount,
      channel,
    });

    res.json({
      success: true,
      message: `${sentCount} rappels enregistrés avec succès.`,
      sentCount,
    });
  } catch (error: any) {
    console.error('Erreur send-bulk:', error);
    res.status(500).json({ error: 'Erreur lors de l envoi groupé des notifications.' });
  }
});

// 10. Statistiques et tableau de bord des examens
api.get('/exam-dossiers/stats', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const academicYear = (req.query.academicYear as string || '2025-2026');

    // Charger les configs, candidats et classes depuis Firestore
    const [configs, allCandidates, classes] = await Promise.all([
      listTenantDocs<any>(estId, 'exam_configurations').catch(() => []),
      listTenantDocs<any>(estId, 'exam_candidates').catch(() => []),
      listClasses(estId).catch(() => []),
    ]);

    const matchingConfigs = (configs || []).filter((c: any) => c.academic_year === academicYear);
    const configMap: Record<string, any> = {};
    matchingConfigs.forEach((c: any) => {
      let docs = [];
      try { docs = typeof c.required_documents === 'string' ? JSON.parse(c.required_documents || '[]') : (c.required_documents || []); } catch {}
      configMap[c.exam_type] = { ...c, required_documents: docs };
    });

    const classMap = new Map((classes || []).map((cl: any) => [cl.id, cl]));

    const candidates = (allCandidates || [])
      .filter((c: any) => c.academic_year === academicYear && (c.is_retained === 1 || c.is_retained === true))
      .map((c: any) => {
        const cls = classMap.get(c.class_id) || {};
        return {
          ...c,
          resolved_serie: c.serie_code || cls.serie_code || null,
        };
      });

    const computeExamStats = (examType: 'BEPC' | 'BAC') => {
      const cfg = configMap[examType] || {
        deadline: null,
        required_documents: examType === 'BEPC' ? DEFAULT_BEPC_DOCS : DEFAULT_BAC_DOCS,
      };

      const cands = candidates.filter((c) => c.exam_type === examType);
      const total = cands.length;
      const complete = cands.filter((c) => c.status === 'COMPLET').length;
      const incomplete = total - complete;
      const completionRate = total > 0 ? Math.round((complete / total) * 100) : 0;

      // Calcul des documents les plus fréquemment manquants
      const missingDocCounts: Record<string, { id: string; name: string; count: number }> = {};
      cfg.required_documents.forEach((d: any) => {
        missingDocCounts[d.id] = { id: d.id, name: d.name, count: 0 };
      });

      cands.forEach((c) => {
        let chk: Record<string, any> = {};
        try { chk = JSON.parse(c.checklist || '{}'); } catch {}
        cfg.required_documents.forEach((d: any) => {
          if (!chk[d.id] || !chk[d.id].received) {
            if (missingDocCounts[d.id]) {
              missingDocCounts[d.id].count++;
            }
          }
        });
      });

      const topMissingDocs = Object.values(missingDocCounts).sort((a, b) => b.count - a.count);

      // Calcul de la date limite & urgence
      let daysRemaining: number | null = null;
      let isUrgent = false;

      if (cfg.deadline) {
        const deadlineDate = new Date(cfg.deadline);
        if (!isNaN(deadlineDate.getTime())) {
          const today = new Date();
          const diffTime = deadlineDate.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          isUrgent = daysRemaining <= 15 && incomplete > 0;
        }
      }

      return {
        examType,
        total,
        complete,
        incomplete,
        completionRate,
        deadline: cfg.deadline,
        daysRemaining,
        isUrgent,
        topMissingDocs,
      };
    };

    const bepcStats = computeExamStats('BEPC');
    const bacStats = computeExamStats('BAC');

    // Répartition par série pour le BAC
    const bacCandidates = candidates.filter((c) => c.exam_type === 'BAC');
    const seriesSet = new Set(bacCandidates.map((c) => c.resolved_serie || 'Sans Série'));
    const bacSeriesStats = Array.from(seriesSet).map((serie) => {
      const sCands = bacCandidates.filter((c) => (c.resolved_serie || 'Sans Série') === serie);
      const sTotal = sCands.length;
      const sComplete = sCands.filter((c) => c.status === 'COMPLET').length;
      return {
        serie_code: serie,
        total: sTotal,
        complete: sComplete,
        incomplete: sTotal - sComplete,
        completionRate: sTotal > 0 ? Math.round((sComplete / sTotal) * 100) : 0,
      };
    });

    res.json({
      academicYear,
      bepc: bepcStats,
      bac: {
        ...bacStats,
        series: bacSeriesStats,
      },
    });
  } catch (error: any) {
    console.error('Erreur get exam-dossiers/stats:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques des examens.' });
  }
});

// ==========================================
// 14. POINTAGE DES ENSEIGNANTS (SURVEILLANT, DE, DG, PROMOTEUR, ENSEIGNANT)
// ==========================================

// --- RÈGLES DE POINTAGE DU PERSONNEL (PARTIE III) ---

api.get('/staff-attendance/rules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    let rules = await getDocData('staff_attendance_rules', estId);
    if (!rules) {
      rules = {
        id: `RULES-${estId}`,
        establishment_id: estId,
        work_start_time: '07:30',
        work_end_time: '17:30',
        tolerance_minutes: 15,
        absence_deduction_rate_per_hour: 2500,
        overtime_hourly_bonus: 3500,
        checkin_mode_preschool_primary: 'JOURNALIER',
        checkin_mode_college_lycee: 'PAR_SEANCE',
        preschool_primary_morning_time: '07:30',
        preschool_primary_noon_time: '12:00',
      };
    }
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des règles de pointage.' });
  }
});

api.put('/staff-attendance/rules', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      workStartTime,
      workEndTime,
      toleranceMinutes,
      absenceDeductionRatePerHour,
      overtimeHourlyBonus,
      checkinModePreschoolPrimary,
      checkinModeCollegeLycee,
      preschoolPrimaryMorningTime,
      preschoolPrimaryNoonTime,
    } = req.body;

    const estId = req.user!.establishment_id;
    const id = `RULES-${estId}`;

    const payload = {
      id,
      establishment_id: estId,
      work_start_time: workStartTime || '07:30',
      work_end_time: workEndTime || '17:30',
      tolerance_minutes: Number(toleranceMinutes !== undefined ? toleranceMinutes : 15),
      absence_deduction_rate_per_hour: Number(absenceDeductionRatePerHour !== undefined ? absenceDeductionRatePerHour : 2500),
      overtime_hourly_bonus: Number(overtimeHourlyBonus !== undefined ? overtimeHourlyBonus : 3500),
      checkin_mode_preschool_primary: checkinModePreschoolPrimary || 'JOURNALIER',
      checkin_mode_college_lycee: checkinModeCollegeLycee || 'PAR_SEANCE',
      preschool_primary_morning_time: preschoolPrimaryMorningTime || '07:30',
      preschool_primary_noon_time: preschoolPrimaryNoonTime || '12:00',
      updated_by: req.user!.id,
      updated_at: new Date().toISOString(),
    };

    await setDocData('staff_attendance_rules', estId, payload);
    await setDocData(`establishments/${estId}/staff_attendance_rules`, id, payload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_REGLES_POINTAGE', 'STAFF_RULES', id, {
      toleranceMinutes,
      absenceDeductionRatePerHour,
      preschoolPrimaryMorningTime,
      preschoolPrimaryNoonTime,
    });

    res.json({ message: 'Règles de pointage du personnel mises à jour avec succès par le Promoteur.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des règles de pointage.' });
  }
});

api.get('/teacher-attendances', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ENSEIGNANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { date, teacherId } = req.query;
    const targetDate = date ? String(date) : undefined;

    // Source unique de vérité : Cloud Firestore
    const [rawCheckinsFs, users, subjects] = await Promise.all([
      listTeacherCheckins(estId).catch(() => []),
      listTenantUsers(estId).catch(() => []),
      listSubjects(estId).catch(() => []),
    ]);

    const userMap = new Map((users || []).map((u: any) => [u.id, u]));
    const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));

    let records = (rawCheckinsFs || []).map((ta: any) => {
      const u = userMap.get(ta.teacher_id);
      const rep = ta.replacement_teacher_id ? userMap.get(ta.replacement_teacher_id) : null;
      const rec = ta.recorded_by ? userMap.get(ta.recorded_by) : null;
      return {
        ...ta,
        is_absent: ta.is_absent === 1 || ta.is_absent === true ? 1 : 0,
        is_justified: ta.is_justified === 1 || ta.is_justified === true ? 1 : 0,
        delay_minutes: Number(ta.delay_minutes || 0),
        early_departure_minutes: Number(ta.early_departure_minutes || 0),
        scheduled_hours: Number(ta.scheduled_hours !== undefined ? ta.scheduled_hours : 2.0),
        hours_done: Number(ta.hours_done !== undefined ? ta.hours_done : 2.0),
        presence_hours: Number(ta.presence_hours !== undefined ? ta.presence_hours : (ta.hours_done !== undefined ? ta.hours_done : 2.0)),
        taught_hours: Number(ta.taught_hours !== undefined ? ta.taught_hours : (ta.hours_done !== undefined ? ta.hours_done : 2.0)),
        teacher_name: u?.full_name || null,
        teacher_username: u?.username || null,
        replacement_teacher_name: rep?.full_name || null,
        recorded_by_name: rec?.full_name || null,
        subject_name: ta.subject_id ? subjectMap.get(ta.subject_id) || null : null,
      };
    });

    if (req.user!.role === 'ENSEIGNANT') {
      records = records.filter((r: any) => r.teacher_id === req.user!.id);
    } else if (teacherId) {
      records = records.filter((r: any) => r.teacher_id === teacherId);
    }

    if (targetDate) {
      records = records.filter((r: any) => r.date === targetDate);
    }

    records.sort((a: any, b: any) => {
      const dDiff = (b.date || '').localeCompare(a.date || '');
      if (dDiff !== 0) return dDiff;
      return (a.teacher_name || '').localeCompare(b.teacher_name || '');
    });

    res.json(records.slice(0, 200));
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des pointages.' });
  }
});

api.post('/teacher-attendances', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // SÉPARATION STRICTE DES POUVOIRS (Prompt Maître Unique Eco GES)
    // Le Promoteur définit les règles mais ne peut pas effectuer de pointage terrain
    if (req.user!.role === 'PROMOTEUR') {
      return res.status(403).json({
        error: "Séparation des pouvoirs : Le pointage opérationnel relève exclusivement de la Surveillance Générale ou de la Direction des Études. Le Promoteur configure les règles et consulte les états."
      });
    }

    const {
      teacherId,
      date,
      subjectId,
      classIds,
      expectedArrivalTime,
      actualArrivalTime,
      expectedDepartureTime,
      actualDepartureTime,
      scheduledHours,
      hoursDone,
      presenceHours,
      taughtHours,
      isAbsent,
      status,
      replacementTeacherId,
      isJustified,
      justificationReason,
      supportingDoc,
      observations,
    } = req.body;

    if (!teacherId || !date) {
      return res.status(400).json({ error: 'Enseignant et date requis.' });
    }

    // Détection de chevauchement d'horaires pour le même enseignant à la même date
    if (actualArrivalTime && actualDepartureTime) {
      let existingCheckins: any[] = [];
      try {
        const allAtts = await listTenantDocs<any>(req.user!.establishment_id, 'teacher_attendances').catch(() => []);
        existingCheckins = (allAtts || []).filter((a: any) =>
          a.teacher_id === teacherId && a.date === date && (a.is_absent === 0 || a.is_absent === false)
        );
      } catch (e) {}

      const existingOverlap = existingCheckins.find((c: any) => {
        if (!c.actual_arrival_time || !c.actual_departure_time) return false;
        return (
          (c.actual_arrival_time <= actualArrivalTime && c.actual_departure_time > actualArrivalTime) ||
          (c.actual_arrival_time < actualDepartureTime && c.actual_departure_time >= actualDepartureTime) ||
          (c.actual_arrival_time >= actualArrivalTime && c.actual_departure_time <= actualDepartureTime)
        );
      });

      if (existingOverlap && (!req.body.ignoreOverlap)) {
        return res.status(409).json({
          error: `Conflit d'horaire détecté : Cet enseignant a déjà une séance enregistrée de ${existingOverlap.actual_arrival_time || 'N/A'} à ${existingOverlap.actual_departure_time || 'N/A'} à cette date.`,
          hasOverlap: true,
        });
      }
    }

    // Calcul automatique du retard constaté (en minutes)
    let delayMinutes = 0;
    if (expectedArrivalTime && actualArrivalTime) {
      const [eh, em] = expectedArrivalTime.split(':').map(Number);
      const [ah, am] = actualArrivalTime.split(':').map(Number);
      if (!isNaN(eh) && !isNaN(ah)) {
        const diff = (ah * 60 + (am || 0)) - (eh * 60 + (em || 0));
        if (diff > 0) delayMinutes = diff;
      }
    }

    // Calcul automatique du départ anticipé (en minutes)
    let earlyMinutes = 0;
    if (expectedDepartureTime && actualDepartureTime) {
      const [dh, dm] = expectedDepartureTime.split(':').map(Number);
      const [ah, am] = actualDepartureTime.split(':').map(Number);
      if (!isNaN(dh) && !isNaN(ah)) {
        const diff = (dh * 60 + (dm || 0)) - (ah * 60 + (am || 0));
        if (diff > 0) earlyMinutes = diff;
      }
    }

    const schedH = Number(scheduledHours || 2.0);
    const doneH = isAbsent ? 0 : Number(hoursDone !== undefined ? hoursDone : schedH);
    const presH = Number(presenceHours !== undefined ? presenceHours : (isAbsent ? 0 : schedH));
    const tgH = Number(taughtHours !== undefined ? taughtHours : (isAbsent ? 0 : schedH));

    const id = `TATT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const payload = {
      id,
      establishment_id: req.user!.establishment_id,
      teacher_id: teacherId,
      date,
      subject_id: subjectId || null,
      class_ids: classIds ? (Array.isArray(classIds) ? classIds.join(',') : classIds) : null,
      expected_arrival_time: expectedArrivalTime || null,
      actual_arrival_time: actualArrivalTime || null,
      expected_departure_time: expectedDepartureTime || null,
      actual_departure_time: actualDepartureTime || null,
      delay_minutes: delayMinutes,
      early_departure_minutes: earlyMinutes,
      scheduled_hours: schedH,
      hours_done: doneH,
      presence_hours: presH,
      taught_hours: tgH,
      is_absent: isAbsent ? 1 : 0,
      status: status || (isAbsent ? 'ABSENT' : (delayMinutes > 0 ? 'RETARD' : 'PRESENT')),
      replacement_teacher_id: replacementTeacherId || null,
      is_justified: isJustified ? 1 : 0,
      justification_reason: justificationReason || null,
      supportingDoc: supportingDoc || null,
      observations: observations || null,
      validation_status: 'EN_ATTENTE',
      recorded_by: req.user!.id,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Écriture Cloud Firestore
    await setDocData(`establishments/${req.user!.establishment_id}/teacher_attendances`, id, payload);

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'POINTAGE_ENSEIGNANT', 'TEACHER_ATTENDANCE', id, {
      teacherId,
      date,
      status: payload.status,
      delayMinutes,
      hoursDone: doneH,
    });

    res.json({ message: 'Pointage enseignant enregistré avec succès.', attendanceId: id, attendance: payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors du pointage enseignant.' });
  }
});

// Confirmation ou contestation par l'enseignant (D. Validation du pointage)
api.put('/teacher-attendances/:id/teacher-response', authenticateToken, requireRole(['ENSEIGNANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { validationStatus, teacherComment, contestReason, supportingDoc } = req.body;

    let record = await getSubcollectionDoc<any>(estId, 'teacher_attendances', req.params.id).catch(() => null);
    if (!record || record.teacher_id !== req.user!.id) {
      return res.status(404).json({ error: 'Fiche de pointage introuvable pour votre compte.' });
    }

    const updates = {
      validation_status: validationStatus || 'CONFIRME',
      teacher_comment: teacherComment !== undefined ? teacherComment : (record.teacher_comment || null),
      contest_reason: contestReason !== undefined ? contestReason : (record.contest_reason || null),
      supporting_doc: supportingDoc !== undefined ? supportingDoc : (record.supporting_doc || null),
      updated_at: new Date().toISOString(),
    };

    await updateDocData(`establishments/${estId}/teacher_attendances`, req.params.id, updates);

    logAudit(estId, req.user!.id, req.user!.full_name, 'REPONSE_POINTAGE_ENSEIGNANT', 'TEACHER_ATTENDANCE', req.params.id, {
      validationStatus,
      contestReason,
    });

    res.json({ message: validationStatus === 'CONFIRME' ? 'Pointage confirmé avec succès.' : 'Contestation / demande de rectification transmise.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la réponse au pointage.' });
  }
});

// Correction non-silencieuse avec motif obligatoire et conservation de la valeur initiale
api.put('/teacher-attendances/:id/correct', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { correctionReason, hoursDone, status, delayMinutes, isJustified, justificationReason, presenceHours, taughtHours } = req.body;
    if (!correctionReason || !correctionReason.trim()) {
      return res.status(400).json({ error: 'Le motif de la correction est obligatoire pour modifier ce pointage.' });
    }

    let current = await getSubcollectionDoc<any>(estId, 'teacher_attendances', req.params.id).catch(() => null);
    if (!current) {
      return res.status(404).json({ error: 'Pointage introuvable.' });
    }

    const prevSummary = `Statut: ${current.status}, H.Effectuées: ${current.hours_done}h, Retard: ${current.delay_minutes}min, Justifié: ${current.is_justified ? 'Oui' : 'Non'}`;

    const updates = {
      hours_done: hoursDone !== undefined ? Number(hoursDone) : current.hours_done,
      presence_hours: presenceHours !== undefined ? Number(presenceHours) : current.presence_hours,
      taught_hours: taughtHours !== undefined ? Number(taughtHours) : current.taught_hours,
      status: status || current.status,
      delay_minutes: delayMinutes !== undefined ? Number(delayMinutes) : current.delay_minutes,
      is_justified: isJustified !== undefined ? (isJustified ? 1 : 0) : current.is_justified,
      justification_reason: justificationReason || current.justification_reason,
      validation_status: 'EN_CORRECTION',
      previous_value: prevSummary,
      correction_reason: correctionReason.trim(),
      updated_at: new Date().toISOString(),
    };

    await updateDocData(`establishments/${estId}/teacher_attendances`, req.params.id, updates);

    logAudit(estId, req.user!.id, req.user!.full_name, 'CORRECTION_POINTAGE_AUDITEE', 'TEACHER_ATTENDANCE', req.params.id, {
      previousValue: prevSummary,
      correctionReason: correctionReason.trim(),
    });

    res.json({ message: 'Correction auditée enregistrée avec motif et conservation des anciennes données.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la correction du pointage.' });
  }
});

// Validation finale du pointage par le responsable habilité
api.put('/teacher-attendances/:id/validate', authenticateToken, requireRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    await updateDocData(`establishments/${estId}/teacher_attendances`, req.params.id, {
      validation_status: 'VALIDE',
      updated_at: new Date().toISOString(),
    });

    logAudit(estId, req.user!.id, req.user!.full_name, 'VALIDATION_FINALE_POINTAGE', 'TEACHER_ATTENDANCE', req.params.id);
    res.json({ message: 'Pointage validé officiellement pour les registres et la paie.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la validation finale.' });
  }
});

// E. Rapports de présence des enseignants
api.get('/teacher-attendances/reports/summary', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { startDate, endDate, teacherId } = req.query;
    const today = new Date().toISOString().split('T')[0];

    const [rawCheckins, users, subjects] = await Promise.all([
      listTeacherCheckins(estId),
      listTenantUsers(estId),
      listSubjects(estId),
    ]);

    const userMap = new Map((users || []).map((u: any) => [u.id, u]));
    const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));

    const allCheckins = (rawCheckins || []).map((ta: any) => ({
      ...ta,
      teacher_name: userMap.get(ta.teacher_id)?.full_name || null,
      teacher_username: userMap.get(ta.teacher_id)?.username || null,
      subject_name: ta.subject_id ? subjectMap.get(ta.subject_id) || null : null,
    }));

    // 1. Liste journalière des enseignants pointés
    const dailyPointed = allCheckins.filter((ta: any) => ta.date === today);

    // 2. Retards par période
    let delays = allCheckins.filter((ta: any) => (Number(ta.delay_minutes) || 0) > 0);
    if (startDate) delays = delays.filter((ta: any) => ta.date >= startDate);
    if (endDate) delays = delays.filter((ta: any) => ta.date <= endDate);
    if (teacherId) delays = delays.filter((ta: any) => ta.teacher_id === teacherId);

    // 3. Absences justifiées vs non justifiées
    const absentRecords = allCheckins.filter((ta: any) => ta.status === 'ABSENT' || ta.is_absent === 1);
    const justified = absentRecords.filter((ta: any) => ta.is_justified === 1).length;
    const unjustified = absentRecords.length - justified;

    // 4. Heures prévues vs heures effectuées
    const scheduled = allCheckins.reduce((acc: number, curr: any) => acc + (Number(curr.scheduled_hours) || 0), 0);
    const done = allCheckins.reduce((acc: number, curr: any) => acc + (Number(curr.hours_done) || 0), 0);
    const presence = allCheckins.reduce((acc: number, curr: any) => acc + (Number(curr.presence_hours) || 0), 0);
    const taught = allCheckins.reduce((acc: number, curr: any) => acc + (Number(curr.taught_hours) || 0), 0);

    // 5. Départs anticipés
    const earlyDepartures = allCheckins.filter((ta: any) => (Number(ta.early_departure_minutes) || 0) > 0);

    // 6. Pointages contestés ou en attente
    const contestedPointages = allCheckins.filter((ta: any) => ['CONTESTE', 'EN_ATTENTE', 'EN_CORRECTION'].includes(ta.validation_status));

    // 7. Rapport mensuel par enseignant
    const teachers = (users || []).filter((u: any) => u.role === 'ENSEIGNANT' && u.status === 'ACTIVE');
    const monthlyByTeacher = teachers.map((u: any) => {
      const myAtt = allCheckins.filter((ta: any) => ta.teacher_id === u.id);
      return {
        teacher_id: u.id,
        teacher_name: u.full_name,
        sessions_count: myAtt.length,
        total_scheduled: myAtt.reduce((acc: number, curr: any) => acc + (Number(curr.scheduled_hours) || 0), 0),
        total_done: myAtt.reduce((acc: number, curr: any) => acc + (Number(curr.hours_done) || 0), 0),
        total_taught: myAtt.reduce((acc: number, curr: any) => acc + (Number(curr.taught_hours) || 0), 0),
        total_delay_minutes: myAtt.reduce((acc: number, curr: any) => acc + (Number(curr.delay_minutes) || 0), 0),
        total_absences: myAtt.filter((ta: any) => ta.status === 'ABSENT' || ta.is_absent === 1).length,
        contested_count: myAtt.filter((ta: any) => ta.validation_status === 'CONTESTE').length,
      };
    });

    res.json({
      dailyPointed,
      delaysByPeriod: delays.slice(0, 50),
      absencesStats: {
        justified,
        unjustified,
      },
      hoursComparison: {
        scheduled,
        done,
        presence,
        taught,
      },
      earlyDepartures: earlyDepartures.slice(0, 50),
      contestedPointages: contestedPointages.slice(0, 50),
      monthlyByTeacher,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la génération des rapports de présence.' });
  }
});

// ==========================================
// 15. RÉCLAMATIONS & SIGNALEMENTS (SURVEILLANCE, ENSEIGNANTS, TOUS PROFILS)
// ==========================================

api.get('/complaints', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const role = req.user!.role;
    const userId = req.user!.id;

    const [rawComplaints, users] = await Promise.all([
      listTenantDocs<any>(estId, 'complaints').catch(() => []),
      listTenantUsers(estId).catch(() => []),
    ]);

    const userMap = new Map((users || []).map((u: any) => [u.id, u.full_name]));

    let complaints = (rawComplaints || []).map((c: any) => ({
      ...c,
      author_full_name: userMap.get(c.author_id) || c.author_name || null,
      assigned_to_full_name: userMap.get(c.assigned_to_id) || c.assigned_to_name || null,
    }));

    // Confidentialité : Les réclamations confidentielles doivent être accessibles uniquement aux personnes habilitées
    if (!['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'SURVEILLANT'].includes(role)) {
      complaints = complaints.filter((c: any) =>
        c.is_confidential === 0 || c.is_confidential === false || !c.is_confidential || c.author_id === userId || c.assigned_to_id === userId
      );
    }

    complaints.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    res.json(complaints.slice(0, 100));
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des réclamations.' });
  }
});

api.post('/complaints', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      concernedPerson,
      category,
      description,
      supportingDoc,
      priority,
      isConfidential,
      assignedToId,
      assignedToName,
    } = req.body;

    if (!concernedPerson || !category || !description) {
      return res.status(400).json({ error: 'Personne concernée, catégorie et description obligatoires.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const year = new Date().getFullYear();
    const existingComplaints = await listTenantDocs<any>(req.user!.establishment_id, 'complaints').catch(() => []);
    const num = String((existingComplaints.length || 0) + 1).padStart(4, '0');
    const complaintNumber = `REC-${year}-${num}`;
    const id = `CMP-${Date.now().toString(36).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const payload = {
      id,
      establishment_id: req.user!.establishment_id,
      complaint_number: complaintNumber,
      date: today,
      concerned_person: concernedPerson.trim(),
      category,
      description: description.trim(),
      supporting_doc: supportingDoc || null,
      author_id: req.user!.id,
      author_name: req.user!.full_name,
      assigned_to_id: assignedToId || null,
      assigned_to_name: assignedToName || null,
      priority: priority || 'NORMALE',
      is_confidential: isConfidential ? 1 : 0,
      status: 'RECUE',
      created_at: nowIso,
      updated_at: nowIso,
    };

    await setDocData(`establishments/${req.user!.establishment_id}/complaints`, id, payload);

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'ENREGISTREMENT_RECLAMATION', 'COMPLAINT', id, {
      complaintNumber,
      category,
      concernedPerson,
      isConfidential: !!isConfidential,
    });

    res.json({ message: 'Réclamation enregistrée avec succès.', complaintId: id, complaintNumber });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la création de la réclamation.' });
  }
});

api.put('/complaints/:id/respond', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { response, status, assignedToId, assignedToName } = req.body;
    const nowIso = new Date().toISOString();

    await updateDocData(`establishments/${req.user!.establishment_id}/complaints`, req.params.id, {
      response: response !== undefined ? response : null,
      status: status || null,
      assigned_to_id: assignedToId || null,
      assigned_to_name: assignedToName || null,
      responded_by: req.user!.full_name,
      responded_at: nowIso,
      updated_at: nowIso,
    });

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'REPONSE_RECLAMATION', 'COMPLAINT', req.params.id, {
      status,
    });

    res.json({ message: 'Réponse et statut de la réclamation mis à jour.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la réclamation.' });
  }
});

// ==========================================
// 15. DÉCISIONS DE DIRECTION (DG & PROMOTEUR)
// ==========================================

api.get('/decisions', authenticateToken, requireRole(['DIRECTEUR_GENERAL', 'PROMOTEUR', 'DIRECTEUR_ETUDES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [rawDecisions, users] = await Promise.all([
      listTenantDocs<any>(estId, 'administrative_decisions').catch(() => []),
      listTenantUsers(estId).catch(() => []),
    ]);

    const userMap = new Map((users || []).map((u: any) => [u.id, u.full_name]));

    const decisions = (rawDecisions || []).map((d: any) => ({
      ...d,
      created_by_name: userMap.get(d.created_by) || d.created_by_name || 'Utilisateur',
    }));

    decisions.sort((a: any, b: any) => (b.request_date || '').localeCompare(a.request_date || ''));
    res.json(decisions);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des décisions.' });
  }
});

api.post('/decisions', authenticateToken, requireRole(['DIRECTEUR_GENERAL', 'PROMOTEUR', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE', 'COMPTABLE', 'SURVEILLANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject, requesterName, service, requestDate, description, supportingDocs, assignedTo, deadline } = req.body;
    if (!subject || !requesterName || !service || !description) {
      return res.status(400).json({ error: 'Objet, demandeur, service et description obligatoires.' });
    }

    const id = `DEC-${Date.now().toString(36).toUpperCase()}`;
    const date = requestDate || new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const payload = {
      id,
      establishment_id: req.user!.establishment_id,
      subject: subject.trim(),
      requester_name: requesterName.trim(),
      service: service.trim(),
      request_date: date,
      description: description.trim(),
      supporting_docs: supportingDocs || null,
      decision: 'EN_ATTENTE',
      assigned_to: assignedTo || null,
      deadline: deadline || null,
      status: 'OUVERT',
      created_by: req.user!.id,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await setDocData(`establishments/${req.user!.establishment_id}/administrative_decisions`, id, payload);

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'DEMANDE_DECISION_DIRECTION', 'DECISION', id, {
      subject,
      service,
    });

    res.json({ message: 'Demande / Dossier de décision créé.', decisionId: id });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la création de la décision.' });
  }
});

api.put('/decisions/:id', authenticateToken, requireRole(['DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { decision, reason, assignedTo, deadline, status } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (decision !== undefined) updates.decision = decision;
    if (reason !== undefined) updates.reason = reason;
    if (assignedTo !== undefined) updates.assigned_to = assignedTo;
    if (deadline !== undefined) updates.deadline = deadline;
    if (status !== undefined) updates.status = status;

    await updateDocData(`establishments/${req.user!.establishment_id}/administrative_decisions`, req.params.id, updates);

    logAudit(req.user!.establishment_id, req.user!.id, req.user!.full_name, 'STATUT_DECISION_DIRECTION', 'DECISION', req.params.id, {
      decision,
      status,
    });

    res.json({ message: 'Dossier de décision mis à jour.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// ==========================================
// 16. ESPACE ÉLÈVE & ESPACE PARENT / TUTEUR (ECO. GES.)
// ==========================================

// Données complètes pour l'Espace Élève
api.get('/student/portal-data', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    let targetStudentId = (req.query.studentId as string) || (req.query.childId as string) || '';

    const [allStudents, allClasses] = await Promise.all([
      listStudents(estId).catch(() => []),
      listTenantDocs<any>(estId, 'classes').catch(() => []),
    ]);

    if (!targetStudentId) {
      targetStudentId = req.user!.student_id || '';
    }
    if (!targetStudentId) {
      const found = (allStudents || []).find((s: any) =>
        (s.matricule && s.matricule.toLowerCase() === req.user!.username.toLowerCase()) ||
        s.user_id === req.user!.id
      );
      targetStudentId = found ? found.id : '';
    }
    if (!targetStudentId) {
      const s = (allStudents || []).find((st: any) => st.matricule && st.matricule.toLowerCase() === req.user!.username.toLowerCase());
      targetStudentId = s ? s.id : '';
    }
    if (!targetStudentId && req.user!.role === 'PARENT') {
      const parentUserId = req.user!.id;
      const userPhoneNorm = normalizePhone(req.user!.phone || req.user!.username);
      const parentEmail = (req.user!.email || '').trim().toLowerCase();
      const foundChild = (allStudents || []).find((s: any) =>
        s.parent_user_id === parentUserId ||
        (userPhoneNorm && normalizePhone(s.guardian_phone) === userPhoneNorm) ||
        (parentEmail && (s.guardian_email || '').trim().toLowerCase() === parentEmail)
      );
      if (foundChild) targetStudentId = foundChild.id;
    }
    if (!targetStudentId && (allStudents || []).length > 0) {
      targetStudentId = allStudents[0].id;
    }

    if (!targetStudentId) {
      return res.json({
        student: null,
        establishment: null,
        recentGrades: [],
        termAverages: [],
        bulletins: [],
        upcomingEvaluations: [],
        attendanceStats: { totalAbsences: 0, justifiedAbsences: 0, unjustifiedAbsences: 0, totalLatenesses: 0 },
        attendanceHistory: [],
        disciplinaryIncidents: [],
        justifications: [],
        lessonLogs: [],
        homeworks: [],
        announcements: [],
        financialSituation: { totalDue: 0, totalPaid: 0, balance: 0, isSettled: true },
        schedules: [],
      });
    }

    // 1. Fiche élève complète & classe & professeur principal (100% Firestore)
    let student = (allStudents || []).find((s: any) => s.id === targetStudentId);
    if (student) {
      const cls = (allClasses || []).find((c: any) => c.id === student.class_id) || {};
      student = {
        ...student,
        class_name: cls.name || student.class_name || null,
        cycle_code: cls.cycle_code || student.cycle_code || 'COLLEGE',
        level_code: cls.level_code || student.level_code || null,
        serie_code: cls.serie_code || student.serie_code || null,
        room: cls.room || student.room || null,
      };
    }

    if (!student) {
      return res.status(404).json({ error: 'Élève introuvable dans cet établissement.' });
    }

    console.log(`[PortalData] Student ID: ${student.id}, Class ID: ${student.class_id}`);

    let establishment: any = null;
    try {
      establishment = await getEstablishment(estId);
    } catch {}
    if (!establishment) {
      establishment = {
        id: estId,
        name: student?.establishment_name || 'Établissement Scolaire',
        code: 'ECOLE',
        academic_year: student?.academic_year || '2026-2027',
        currency: 'FCFA',
        logo_url: null,
      };
    }

    // 2. Emploi du temps de la classe (Emplacement unifié Firestore : establishments/{estId}/teacher_schedules)
    let schedules: any[] = [];
    const subjects = await listSubjects(estId).catch(() => []);
    const users = await listTenantUsers(estId).catch(() => []);
    const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
    const subjectCodeMap = new Map((subjects || []).map((s: any) => [s.id, s.code || '']));
    const userMap = new Map((users || []).map((u: any) => [u.id, u.full_name]));

    if (student.class_id) {
      try {
        const allSchedules = await listDocs<any>(`establishments/${estId}/teacher_schedules`).catch(async () => {
          return listTenantDocs<any>(estId, 'teacher_schedules');
        });

        schedules = (allSchedules || [])
          .filter((s: any) => s.class_id === student.class_id && (s.is_published === undefined || Number(s.is_published) === 1 || s.is_published === true))
          .map((s: any) => ({
            ...s,
            subject_name: subjectMap.get(s.subject_id) || s.subject_name || 'Matière',
            subject_code: subjectCodeMap.get(s.subject_id) || '',
            teacher_name: userMap.get(s.teacher_id) || s.teacher_name || 'Enseignant',
          }))
          .sort((a: any, b: any) => a.day_of_week - b.day_of_week || (a.start_time || '').localeCompare(b.start_time || ''));
      } catch (e) {
        console.error('Erreur chargement emploi du temps Firestore:', e);
      }
    }

    // 3. Notes de devoirs & Évaluations (Lecture directe Firestore)
    const term = req.query.term as string;
    const currentAcademicYear = student.academic_year || establishment?.academic_year || '2026-2027';

    const [allEvaluations, allGrades] = await Promise.all([
      listTenantDocs<any>(estId, 'evaluations').catch(() => []),
      listTenantDocs<any>(estId, 'grades').catch(() => []),
    ]);

    // Filtrage des évaluations par année scolaire (et trimestre si demandé)
    const matchingEvaluations = (allEvaluations || []).filter((e: any) => {
      const yearMatch = !e.academic_year || e.academic_year === currentAcademicYear;
      const termMatch = !term || e.term === term;
      return yearMatch && termMatch;
    });

    const evalMap = new Map(matchingEvaluations.map((e: any) => [e.id, e]));

    // Notes de l'élève connecté
    const studentGrades = (allGrades || []).filter((g: any) => {
      return g.student_id === targetStudentId && evalMap.has(g.evaluation_id);
    });

    const grades = studentGrades.map((g: any) => {
      const ev = evalMap.get(g.evaluation_id) || {};
      const subName = subjectMap.get(ev.subject_id) || ev.subject_name || 'Matière';
      const subCode = subjectCodeMap.get(ev.subject_id) || ev.subject_code || '';
      const teacherName = userMap.get(ev.created_by) || ev.teacher_name || null;

      // Calcul de la moyenne de classe pour cette évaluation
      const classGrades = (allGrades || []).filter((cg: any) => cg.evaluation_id === ev.id && cg.score !== null && cg.score !== undefined && !cg.is_absent);
      const classAverage = classGrades.length > 0
        ? Number((classGrades.reduce((sum: number, cg: any) => sum + Number(cg.score), 0) / classGrades.length).toFixed(2))
        : null;

      return {
        grade_id: g.id,
        score: g.score !== null && g.score !== undefined ? Number(g.score) : null,
        is_absent: g.is_absent ? 1 : 0,
        remarks: g.remarks || null,
        evaluation_id: ev.id,
        evaluation_title: ev.title || 'Évaluation',
        evaluation_date: ev.date || g.updated_at?.split('T')[0] || '',
        eval_type: ev.eval_type || 'DEVOIR',
        max_score: Number(ev.max_score || 20),
        coefficient: Number(ev.coefficient || 1),
        term: ev.term || 'TRIMESTRE_1',
        subject_id: ev.subject_id,
        subject_name: subName,
        subject_code: subCode,
        teacher_name: teacherName,
        class_average: classAverage,
      };
    }).sort((a: any, b: any) => (b.evaluation_date || '').localeCompare(a.evaluation_date || ''));

    // Calcul des moyennes par matière à partir des notes réelles Firestore
    type SubjectEntry = { subject_name: string; subject_code: string; totalWeightedScore: number; totalMaxCoeff: number; grades: any[] };
    const gradeSubjectMap = new Map<string, SubjectEntry>();
    grades.forEach((g: any) => {
      if (g.score === null || g.is_absent) return;
      const current: SubjectEntry = gradeSubjectMap.get(g.subject_id) || {
        subject_name: g.subject_name,
        subject_code: g.subject_code,
        totalWeightedScore: 0,
        totalMaxCoeff: 0,
        grades: [],
      };
      const normalizedScore = (g.score / (g.max_score || 20)) * 20;
      current.totalWeightedScore += normalizedScore * (g.coefficient || 1);
      current.totalMaxCoeff += (g.coefficient || 1);
      current.grades.push(g);
      gradeSubjectMap.set(g.subject_id, current);
    });

    const termAverages = Array.from(gradeSubjectMap.entries()).map(([subId, item]) => {
      const average = item.totalMaxCoeff > 0 ? Number((item.totalWeightedScore / item.totalMaxCoeff).toFixed(2)) : null;
      let appreciation = 'En progrès';
      if (average !== null) {
        if (average >= 16) appreciation = 'Très Bien / Félicitations';
        else if (average >= 14) appreciation = 'Bien / Tableau d Honneur';
        else if (average >= 12) appreciation = 'Assez Bien / Encouragements';
        else if (average >= 10) appreciation = 'Passable / Travail moyen';
        else appreciation = 'Insuffisant / Doit redoubler d efforts';
      }
      return {
        subject_id: subId,
        subject_name: item.subject_name,
        subject_code: item.subject_code,
        average,
        appreciation,
        gradesCount: item.grades.length,
      };
    });

    let overallAverage: number | null = null;
    if (termAverages.length > 0) {
      const sum = termAverages.reduce((acc, curr) => acc + (curr.average || 0), 0);
      overallAverage = Number((sum / termAverages.length).toFixed(2));
    }

    // 4. Prochaines évaluations (Lecture directe Firestore)
    const todayStr = new Date().toISOString().split('T')[0];
    let upcomingEvaluations: any[] = [];
    if (student.class_id) {
      upcomingEvaluations = (allEvaluations || [])
        .filter((e: any) => e.class_id === student.class_id && (e.date || '') >= todayStr)
        .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))
        .slice(0, 5)
        .map((e: any) => ({
          ...e,
          subject_name: subjectMap.get(e.subject_id) || 'Matière',
        }));
    }

    // 5. Assiduité et Discipline (Lecture directe Firestore)
    const [rawAttendances, rawCourseAttendances, rawDiscipline, rawJustifications] = await Promise.all([
      listStudentAttendances(estId).catch(() => []),
      listStudentCourseAttendances(estId).catch(() => []),
      listTenantDocs<any>(estId, 'disciplinary_incidents').catch(() => []),
      listTenantDocs<any>(estId, 'absence_justifications').catch(() => []),
    ]);

    const attendanceRecords = (rawAttendances || [])
      .filter((a: any) => a.student_id === targetStudentId)
      .map((a: any) => ({
        ...a,
        recorded_by_name: userMap.get(a.recorded_by) || a.recorded_by_name || 'Surveillant de permanence',
      }))
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

    const courseAttendanceHistory = (rawCourseAttendances || [])
      .filter((ca: any) => ca.student_id === targetStudentId)
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (a.start_time || '').localeCompare(b.start_time || ''));

    const totalRecords = attendanceRecords.length;
    const presents = attendanceRecords.filter((a: any) => a.status === 'PRESENT').length;
    const absences = attendanceRecords.filter((a: any) => a.status === 'ABSENT').length;
    const lates = attendanceRecords.filter((a: any) => a.status === 'RETARD').length;
    const justifiedAbsences = attendanceRecords.filter((a: any) => a.status === 'JUSTIFIE' || a.is_justified === 1 || a.is_justified === true || a.justified === 1).length;
    const unjustifiedAbsences = Math.max(0, absences - justifiedAbsences);

    const disciplinaryIncidents = (rawDiscipline || [])
      .filter((di: any) => di.student_id === targetStudentId)
      .map((di: any) => ({
        ...di,
        author_name: userMap.get(di.recorded_by) || di.author_name || 'Vie Scolaire',
      }))
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

    const justifications = (rawJustifications || [])
      .filter((aj: any) => aj.student_id === targetStudentId)
      .map((aj: any) => ({
        ...aj,
        submitted_by_name: userMap.get(aj.submitted_by_id) || aj.submitted_by_name || 'Élève / Parent',
        reviewer_name: userMap.get(aj.reviewed_by_id) || aj.reviewer_name || null,
      }))
      .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));

    // 6. Cahier de devoirs & Séances de cours (Lecture directe Firestore)
    let lessonLogs: any[] = [];
    let homeworks: any[] = [];
    if (student.class_id) {
      const [tbDocs, legacyLogs] = await Promise.all([
        listTenantDocs<any>(estId, 'textbook_entries').catch(() => []),
        listLessonLogs(estId).catch(() => []),
      ]);

      const mergedMap = new Map<string, any>();
      for (const item of [...(legacyLogs || []), ...(tbDocs || [])]) {
        if (item && item.id) mergedMap.set(item.id, item);
      }

      lessonLogs = Array.from(mergedMap.values())
        .filter((l: any) => l.class_id === student.class_id && l.statut !== 'Non fait' && l.status !== 'NON_FAIT')
        .map((l: any) => ({
          ...l,
          title: l.titre || l.title || 'Séance de cours',
          content: l.resume || l.summary_content || l.content || '',
          subject_name: subjectMap.get(l.subject_id) || l.subject_name || 'Matière',
          teacher_name: userMap.get(l.teacher_id) || l.teacher_name || 'Enseignant',
          homework: l.homework || l.travail_a_faire || l.homework_details || '',
          homework_due_date: l.homework_due_date || l.date_remise || l.dateRemise || null,
        }))
        .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''));

      homeworks = lessonLogs
        .filter((l: any) => l.homework && l.homework.trim().length > 0)
        .map((l: any) => ({
          id: l.id,
          subject_name: l.subject_name,
          title: l.title,
          homework_details: l.homework.trim(),
          assigned_date: l.date,
          due_date: l.homework_due_date || l.date,
          teacher_name: l.teacher_name,
        }));
    }

    // 7. Annonces de l'établissement (Lecture directe Firestore)
    const rawAnnouncements = await listTenantDocs<any>(estId, 'school_announcements').catch(() => []);
    const announcements = (rawAnnouncements || [])
      .filter((a: any) => (a.is_published === 1 || a.is_published === true) && ['ALL', 'STUDENTS'].includes(a.target_audience))
      .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 10);

    // 8. Scolarité et reçus (Lecture directe Firestore)
    const [feeStructures, paymentsList, tariffPlans] = await Promise.all([
      listTenantDocs<any>(estId, 'fee_structures').catch(() => []),
      listTenantDocs<any>(estId, 'payments').catch(() => []),
      listTenantDocs<any>(estId, 'school_tariff_plans').catch(() => []),
    ]);

    const clsObj = (allClasses || []).find((c: any) => c.id === student.class_id) || null;
    const finSummary = computeStudentFinancialSummary(
      student,
      clsObj,
      feeStructures,
      tariffPlans,
      paymentsList
    );

    // 9. Bulletins officiels publiés (Lecture directe Firestore)
    const rawBulletins = await listTenantDocs<any>(estId, 'bulletins').catch(() => []);
    const bulletins = (rawBulletins || [])
      .filter((b: any) => {
        const studentMatch = b.student_id === targetStudentId;
        const yearMatch = !b.academic_year || b.academic_year === currentAcademicYear;
        const isPub = b.status === 'PUBLIE' || b.status === 'PUBLISHED' || b.status === 'VALIDE' || b.is_published === 1 || b.is_published === true;
        return studentMatch && yearMatch && isPub;
      })
      .map((b: any) => ({
        id: b.id,
        term: b.term || 'TRIMESTRE_1',
        termLabel: b.termLabel || (b.term === 'TRIMESTRE_1' ? '1er Trimestre' : b.term === 'TRIMESTRE_2' ? '2ème Trimestre' : b.term === 'TRIMESTRE_3' ? '3ème Trimestre' : b.term),
        academicYear: b.academicYear || b.academic_year || currentAcademicYear,
        generalAverage: b.generalAverage !== undefined && b.generalAverage !== null ? Number(b.generalAverage) : (b.overall_average !== undefined ? Number(b.overall_average) : overallAverage),
        rank: b.rank || 1,
        totalStudentsInClass: b.totalStudentsInClass || b.total_students || 1,
        status: 'PUBLIE',
        isLocked: true,
        directorRemarks: b.directorRemarks || b.appreciation || b.observations || 'Bon travail.',
        termAverages: b.termAverages || termAverages,
      }))
      .sort((a: any, b: any) => (a.term || '').localeCompare(b.term || ''));

    res.json({
      student,
      establishment,
      schedules,
      recentGrades: grades,
      termAverages,
      overallAverage,
      bulletins,
      upcomingEvaluations,
      attendanceStats: {
        totalRecords,
        presents,
        absences,
        unjustifiedAbsences,
        justifiedAbsences,
        lates,
      },
      attendanceHistory: attendanceRecords,
      courseAttendanceHistory,
      disciplinaryIncidents,
      justifications,
      lessonLogs,
      homeworks,
      announcements,
      financialSituation: finSummary,
    });
  } catch (error: any) {
    console.error('Erreur /api/student/portal-data:', error);
    res.status(500).json({ error: error.message || 'Erreur lors du chargement des données élève.' });
  }
});

// Soumission de justification d'absence par Élève ou Parent
api.post('/student/absence-justification', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, attendanceId, date, reason, documentUrl } = req.body;
    if (!studentId || !date || !reason) {
      return res.status(400).json({ error: 'Identifiant élève, date et motif requis.' });
    }

    const estId = req.user!.establishment_id;
    const id = `JUSTIF-${Date.now().toString(36).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const payload = {
      id,
      establishment_id: estId,
      student_id: studentId,
      attendance_id: attendanceId || null,
      date,
      reason: reason.trim(),
      document_url: documentUrl || null,
      submitted_by_id: req.user!.id,
      submitted_by_role: req.user!.role,
      status: 'EN_ATTENTE',
      created_at: nowIso,
      updated_at: nowIso,
    };

    await setDocData(`establishments/${estId}/absence_justifications`, id, payload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'DEPOT_JUSTIFICATION_ABSENCE', 'ABSENCE', id, {
      studentId,
      date,
      reason,
    });

    res.json({ message: 'Justification d absence transmise avec succès à la vie scolaire.', justificationId: id });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du dépôt de la justification.' });
  }
});

// Liste de toutes les justifications d'absence pour la vie scolaire (Surveillance & Direction)
api.get('/student/justifications', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ENSEIGNANT', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const [rawJustifs, students, classes, users] = await Promise.all([
      listTenantDocs<any>(estId, 'absence_justifications').catch(() => []),
      listStudents(estId).catch(() => []),
      listClasses(estId).catch(() => []),
      listTenantUsers(estId).catch(() => []),
    ]);

    const studentMap = new Map((students || []).map((s: any) => [s.id, s]));
    const classMap = new Map((classes || []).map((c: any) => [c.id, c]));
    const userMap = new Map((users || []).map((u: any) => [u.id, u.full_name]));

    const justifications = (rawJustifs || []).map((aj: any) => {
      const s = studentMap.get(aj.student_id) || {};
      const c = classMap.get(s.class_id) || {};
      return {
        ...aj,
        first_name: s.first_name || '',
        last_name: s.last_name || '',
        matricule: s.matricule || '',
        class_name: c.name || s.class_name || '',
        submitted_by_name: userMap.get(aj.submitted_by_id) || aj.submitted_by_name || null,
        reviewed_by_name: userMap.get(aj.reviewed_by_id) || aj.reviewed_by_name || null,
      };
    });

    justifications.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json(justifications);
  } catch (error: any) {
    console.error('Erreur get /student/justifications:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des justifications d absence.' });
  }
});

// Examen et validation/rejet d'une justification d'absence par la vie scolaire
api.put('/student/justifications/:id/review', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;
    const estId = req.user!.establishment_id;

    if (!['APPROUVE', 'REJETE'].includes(status)) {
      return res.status(400).json({ error: 'Statut de révision invalide.' });
    }

    const justif = await getSubcollectionDoc<any>(estId, 'absence_justifications', id).catch(() => null);
    if (!justif) {
      return res.status(404).json({ error: 'Justificatif d absence introuvable.' });
    }

    const nowIso = new Date().toISOString();
    await updateDocData(`establishments/${estId}/absence_justifications`, id, {
      status,
      review_note: reviewNote || null,
      reviewed_by_id: req.user!.id,
      reviewed_at: nowIso,
      updated_at: nowIso,
    });

    // Si la justification est approuvée, régulariser la présence correspondante dans Firestore
    if (status === 'APPROUVE') {
      try {
        const studentAttendances = await listTenantDocs<any>(estId, 'student_attendances').catch(() => []);
        const matchingAtt = (studentAttendances || []).find((sa: any) => {
          if (justif.attendance_id && sa.id === justif.attendance_id) return true;
          return sa.student_id === justif.student_id && sa.date === justif.date;
        });

        if (matchingAtt) {
          await updateDocData(`establishments/${estId}/student_attendances`, matchingAtt.id, {
            is_justified: 1,
            justification_reason: justif.reason || 'Justifiée par l administration',
            updated_at: nowIso,
          });
        }
      } catch (attErr) {
        console.warn('Erreur mise à jour présence suite justification:', attErr);
      }
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'REVISION_JUSTIFICATION_ABSENCE', 'ABSENCE', id, {
      status,
      reviewNote,
      studentId: justif.student_id,
    });

    res.json({ message: 'Justificatif examiné et mis à jour avec succès.', status });
  } catch (error: any) {
    console.error('Erreur review justification:', error);
    res.status(500).json({ error: 'Erreur lors de l examen de la justification.' });
  }
});

// Espace Parent / Tuteur : liste des enfants et données complètes
api.get('/parent/portal-data', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const parentUserId = req.user!.id;
    const requestedChildId = req.query.childId as string;

    if (req.user!.role !== 'PARENT' && !['PROMOTEUR', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE', 'SURVEILLANT'].includes(req.user!.role)) {
      return res.status(403).json({ error: "Accès refusé : l'Espace Parents & Tuteurs est réservé aux parents et à la direction." });
    }

    // 1. Récupérer les tuteurs et élèves liés dans Firestore
    const [rawGuardians, rawStudents, rawClasses] = await Promise.all([
      listSubcollectionDocs<any>(estId, 'guardians'),
      listSubcollectionDocs<any>(estId, 'students'),
      listSubcollectionDocs<any>(estId, 'classes'),
    ]);

    const userPhoneNorm = normalizePhone(req.user!.phone || req.user!.username);
    const parentEmail = (req.user!.email || '').trim().toLowerCase();

    // Trouver toutes les fiches tuteurs correspondantes
    const guardianDocs = (rawGuardians || []).filter(
      (g: any) => g.userId === parentUserId ||
                  (userPhoneNorm && normalizePhone(g.phone) === userPhoneNorm) ||
                  (parentEmail && (g.email || '').trim().toLowerCase() === parentEmail)
    );

    const childIdSet = new Set<string>();

    // 1. Enfants déclarés dans les fiches tuteurs (studentIds)
    guardianDocs.forEach((g: any) => {
      if (Array.isArray(g.studentIds)) {
        g.studentIds.forEach((sid: string) => childIdSet.add(sid));
      }
    });

    // 2. Enfants déclarés dans le compte utilisateur (studentIds)
    const userStudentIds = (req.user as any)?.studentIds;
    if (Array.isArray(userStudentIds)) {
      userStudentIds.forEach((sid: string) => childIdSet.add(sid));
    }

    // 3. Enfants dont le champ parent_user_id, téléphone tuteur, e-mail tuteur ou guardianIds correspond
    (rawStudents || []).forEach((s: any) => {
      const matchParentUser = s.parent_user_id === parentUserId;
      const matchPhone = userPhoneNorm && normalizePhone(s.guardian_phone) === userPhoneNorm;
      const matchEmail = parentEmail && (s.guardian_email || '').trim().toLowerCase() === parentEmail;
      const matchGuardianId = guardianDocs.some((g: any) => Array.isArray(s.guardianIds) && s.guardianIds.includes(g.id));

      if (matchParentUser || matchPhone || matchEmail || matchGuardianId) {
        childIdSet.add(s.id);
      }
    });

    let childIds = Array.from(childIdSet);

    const classMap = new Map((rawClasses || []).map((c: any) => [c.id, c]));

    const children = (rawStudents || [])
      .filter((s: any) => childIds.includes(s.id))
      .map((s: any) => {
        const cls = classMap.get(s.class_id) || {};
        return {
          ...s,
          class_name: cls.name || null,
          cycle_code: cls.cycle_code || null,
          level_code: cls.level_code || null,
          serie_code: cls.serie_code || null,
        };
      });

    const selectedChildId = requestedChildId && children.some((c: any) => c.id === requestedChildId)
      ? requestedChildId
      : (children[0]?.id || '');

    // Situation financière globale & détaillée par enfant (Lecture directe Firestore)
    const [payments, feeStructures, tariffPlans] = await Promise.all([
      listTenantDocs<any>(estId, 'payments').catch(() => []),
      listTenantDocs<any>(estId, 'fee_structures').catch(() => []),
      listTenantDocs<any>(estId, 'school_tariff_plans').catch(() => []),
    ]);

    let totalCombinedDue = 0;
    let totalCombinedPaid = 0;

    const childrenWithFinancials = children.map((child: any) => {
      const cls = classMap.get(child.class_id) || null;
      const finSummary = computeStudentFinancialSummary(
        child,
        cls,
        feeStructures,
        tariffPlans,
        payments
      );

      totalCombinedDue += finSummary.totalDue;
      totalCombinedPaid += finSummary.totalPaid;

      return {
        ...child,
        financials: {
          totalFeesDue: finSummary.totalDue,
          totalFeesPaid: finSummary.totalPaid,
          balance: finSummary.balance,
          payments: finSummary.payments,
          feeBreakdown: finSummary.applicableFees,
        },
      };
    });

    const totalCombinedBalance = Math.max(0, totalCombinedDue - totalCombinedPaid);

    // Annonces pour les parents (Lecture directe Firestore)
    const rawAnnouncements = await listTenantDocs<any>(estId, 'school_announcements').catch(() => []);
    const announcements = (rawAnnouncements || [])
      .filter((a: any) => (a.is_published === 1 || a.is_published === true) && ['ALL', 'PARENTS'].includes(a.target_audience))
      .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 10);

    res.json({
      children: childrenWithFinancials,
      selectedChildId,
      combinedFinancialSummary: {
        totalFeesDue: totalCombinedDue,
        totalFeesPaid: totalCombinedPaid,
        balance: totalCombinedBalance,
        paymentNotice: "Paiement à la caisse de l'école",
      },
      announcements,
      paymentNotice: "Paiement à la caisse de l'école",
    });
  } catch (error: any) {
    console.error('Erreur /api/parent/portal-data:', error);
    res.status(500).json({ error: error.message || 'Erreur lors du chargement de l\'espace parent.' });
  }
});

// Annonces de l'établissement (Lecture & Publication)
api.get('/announcements', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const audience = req.query.audience as string;

    const rawList = await listSubcollectionDocs<any>(estId, 'school_announcements');
    let list = (rawList || []).filter((a: any) => a.is_published === 1 || a.is_published === true);

    if (audience) {
      list = list.filter((a: any) => a.target_audience === audience || a.target_audience === 'ALL');
    }

    list.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des annonces.' });
  }
});

api.post('/announcements', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'SURVEILLANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role === 'GESTIONNAIRE') {
      return res.status(403).json({ error: "Accès refusé. Le rôle Gestionnaire ne peut pas publier d'annonces." });
    }

    const { title, content, targetAudience, category, targetClassId } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Titre et contenu obligatoires.' });
    }

    const estId = req.user!.establishment_id;
    const id = `ANN-${Date.now().toString(36).toUpperCase()}`;

    const announcementPayload = {
      id,
      establishment_id: estId,
      title: title.trim(),
      content: content.trim(),
      target_audience: targetAudience || 'ALL',
      target_class_id: targetClassId || null,
      category: category || 'GENERAL',
      author_id: req.user!.id,
      author_name: req.user!.full_name,
      author_role: req.user!.role,
      is_published: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/school_announcements`, id, announcementPayload);
    await setDocData('school_announcements', id, announcementPayload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'PUBLICATION_ANNONCE', 'ANNONCE', id, {
      title,
      targetAudience,
    });

    res.json({ message: 'Annonce publiée avec succès aux usagers.', announcementId: id });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la publication de l\'annonce.' });
  }
});

api.put('/announcements/:id', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'SURVEILLANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role === 'GESTIONNAIRE') {
      return res.status(403).json({ error: "Accès refusé. Le rôle Gestionnaire ne peut pas modifier d'annonces." });
    }

    const estId = req.user!.establishment_id;
    const announcement = await getDocData(`establishments/${estId}/school_announcements`, req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Annonce introuvable.' });

    if (req.user!.role === 'SURVEILLANT' && announcement.author_id !== req.user!.id) {
      return res.status(403).json({ error: "Un surveillant ne peut modifier que ses propres annonces." });
    }

    const { title, content, targetAudience, category } = req.body;
    const updated = {
      ...announcement,
      title: title !== undefined ? title.trim() : announcement.title,
      content: content !== undefined ? content.trim() : announcement.content,
      target_audience: targetAudience !== undefined ? targetAudience : announcement.target_audience,
      category: category !== undefined ? category : announcement.category,
      updated_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/school_announcements`, req.params.id, updated);
    await setDocData('school_announcements', req.params.id, updated);

    logAudit(estId, req.user!.id, req.user!.full_name, 'MODIFICATION_ANNONCE', 'ANNONCE', req.params.id);
    res.json({ message: 'Annonce mise à jour avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'annonce.' });
  }
});

api.delete('/announcements/:id', authenticateToken, requireRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'SURVEILLANT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role === 'GESTIONNAIRE') {
      return res.status(403).json({ error: "Accès refusé pour ce rôle." });
    }

    const estId = req.user!.establishment_id;
    const announcement = await getDocData(`establishments/${estId}/school_announcements`, req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Annonce introuvable.' });

    if (req.user!.role === 'SURVEILLANT' && announcement.author_id !== req.user!.id) {
      return res.status(403).json({ error: "Un surveillant ne peut supprimer que ses propres annonces." });
    }

    await deleteDocData(`establishments/${estId}/school_announcements`, req.params.id);
    await deleteDocData('school_announcements', req.params.id);

    logAudit(estId, req.user!.id, req.user!.full_name, 'SUPPRESSION_ANNONCE', 'ANNONCE', req.params.id);
    res.json({ message: 'Annonce supprimée avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'annonce.' });
  }
});

// Module Discipline (Saisie, consultation, interdiction Gestionnaire, Acknowledgment parent)
api.get('/discipline', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role === 'GESTIONNAIRE') {
      return res.status(403).json({ error: "Accès refusé : Le rôle Gestionnaire n'a aucun accès au module de discipline." });
    }

    const estId = req.user!.establishment_id;
    const rawIncidents = await listSubcollectionDocs<any>(estId, 'disciplinary_incidents');
    let incidents = rawIncidents || [];

    if (req.user!.role === 'ENSEIGNANT') {
      const classSubjects = await listSubcollectionDocs<any>(estId, 'class_subjects');
      const teacherClassIds = new Set((classSubjects || []).filter((cs: any) => cs.teacher_id === req.user!.id).map((cs: any) => cs.class_id));
      const students = await listSubcollectionDocs<any>(estId, 'students');
      const studentClassMap = new Map((students || []).map((s: any) => [s.id, s.class_id]));

      incidents = incidents.filter((i: any) => {
        const cId = studentClassMap.get(i.student_id);
        return i.recorded_by === req.user!.id || (cId && teacherClassIds.has(cId));
      });
    } else if (req.user!.role === 'ELEVE') {
      incidents = incidents.filter((i: any) => i.student_id === req.user!.student_id);
    } else if (req.user!.role === 'PARENT') {
      const guardians = await listSubcollectionDocs<any>(estId, 'guardians');
      const userPhoneNorm = normalizePhone(req.user!.phone || req.user!.username);
      const myG = (guardians || []).find((g: any) => g.userId === req.user!.id || normalizePhone(g.phone) === userPhoneNorm);
      const myChildIds = new Set(myG?.studentIds || []);
      incidents = incidents.filter((i: any) => myChildIds.has(i.student_id));
    }

    incidents.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    res.json(incidents);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des incidents de discipline.' });
  }
});

api.post('/discipline', authenticateToken, requireRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'ENSEIGNANT', 'DIRECTEUR_GENERAL', 'PROMOTEUR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role === 'GESTIONNAIRE') {
      return res.status(403).json({ error: "Accès refusé : Le rôle Gestionnaire ne peut pas saisir de discipline." });
    }

    const { studentId, date, incidentType, motif, description, sanction } = req.body;
    if (!studentId || !incidentType || !description) {
      return res.status(400).json({ error: 'Élève, type d\'incident et description obligatoires.' });
    }

    const estId = req.user!.establishment_id;

    if (req.user!.role === 'ENSEIGNANT') {
      const student = await getSubcollectionDoc<any>(estId, 'students', studentId);
      const classSubjects = await listSubcollectionDocs<any>(estId, 'class_subjects');
      const teacherClassIds = new Set((classSubjects || []).filter((cs: any) => cs.teacher_id === req.user!.id).map((cs: any) => cs.class_id));

      if (student && student.class_id && !teacherClassIds.has(student.class_id)) {
        return res.status(403).json({ error: "Un enseignant ne peut saisir un incident que pour les élèves de ses classes attribuées." });
      }
    }

    const id = `DISC-${Date.now().toString(36).toUpperCase()}`;
    const incidentPayload = {
      id,
      establishment_id: estId,
      student_id: studentId,
      date: date || new Date().toISOString().split('T')[0],
      incident_type: incidentType,
      motif: motif || null,
      description: description.trim(),
      sanction: sanction || null,
      recorded_by: req.user!.id,
      recorded_by_name: req.user!.full_name,
      status: 'SIGNALE',
      parent_acknowledged_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/disciplinary_incidents`, id, incidentPayload);
    await setDocData('disciplinary_incidents', id, incidentPayload);

    logAudit(estId, req.user!.id, req.user!.full_name, 'SAISIE_INCIDENT_DISCIPLINE', 'DISCIPLINE', id, {
      studentId,
      incidentType,
    });

    res.json({ message: 'Incident de discipline enregistré avec succès.', incidentId: id });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la création de l\'incident.' });
  }
});

api.post('/discipline/:id/acknowledge', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const incident = await getDocData(`establishments/${estId}/disciplinary_incidents`, req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident introuvable.' });

    const updated = {
      ...incident,
      parent_acknowledged_at: new Date().toISOString(),
      parent_acknowledged_by: req.user!.full_name,
      updated_at: new Date().toISOString(),
    };

    await setDocData(`establishments/${estId}/disciplinary_incidents`, req.params.id, updated);
    logAudit(estId, req.user!.id, req.user!.full_name, 'ACCUSE_RECEPTION_DISCIPLINE_PARENT', 'DISCIPLINE', req.params.id);

    res.json({ message: 'Accusé de réception enregistré avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de l accusé de réception.' });
  }
});

api.post('/establishment/purge-demo-data/preview', authenticateToken, requireRole(['PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const est: any = await getEstablishment(estId);

    if (!est) {
      return res.status(404).json({ error: 'Établissement introuvable.' });
    }

    const collectionsToScan = [
      { key: 'students', label: 'Élèves inscrites / de test' },
      { key: 'payments', label: 'Quittances & Paiements de test' },
      { key: 'grades', label: 'Notes de test' },
      { key: 'evaluations', label: 'Évaluations de test' },
      { key: 'student_attendances', label: 'Registres de présence' },
      { key: 'student_course_attendances', label: 'Appels par cours' },
      { key: 'payroll_records', label: 'Fiches de paie' },
      { key: 'disciplinary_incidents', label: 'Incidents de discipline' },
      { key: 'guardians', label: 'Comptes Tuteurs / Parents' },
    ];

    let totalDemoCount = 0;
    const details: any[] = [];

    for (const col of collectionsToScan) {
      const docs = await listSubcollectionDocs<any>(estId, col.key);
      const count = (docs || []).length;
      totalDemoCount += count;
      details.push({
        collection: col.key,
        label: col.label,
        count,
        sampleNames: (docs || []).slice(0, 3).map((d: any) => d.first_name ? `${d.last_name} ${d.first_name}` : d.name || d.id),
      });
    }

    res.json({
      establishmentName: est.name,
      isProduction: Boolean(est.is_production),
      totalDemoCount,
      details,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du calcul de prévisibilisation de la purge.' });
  }
});

api.post('/establishment/purge-demo-data', authenticateToken, requireRole(['PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const est: any = await getEstablishment(estId);

    if (!est) {
      return res.status(404).json({ error: 'Établissement introuvable.' });
    }

    if (est.is_production === true || est.status === 'PRODUCTION') {
      return res.status(403).json({ error: 'La purge des données est définitivement désactivée sur cet établissement en mode production.' });
    }

    const { confirmEstablishmentName } = req.body;
    if (!confirmEstablishmentName || confirmEstablishmentName.trim().toLowerCase() !== (est.name || '').trim().toLowerCase()) {
      return res.status(400).json({ error: `Pour confirmer la purge, veuillez saisir exactement le nom de votre établissement ("${est.name}").` });
    }

    const collectionsToBackup = [
      'students', 'payments', 'grades', 'evaluations', 'student_attendances',
      'student_course_attendances', 'payroll_records', 'disciplinary_incidents',
      'complaints', 'lesson_logs', 'guardians'
    ];

    // 1. Sauvegarde automatique de sécurité avant la purge
    const backupId = `BAK-AUTO-PURGE-${Date.now()}`;
    const backupData: Record<string, any[]> = {};

    for (const subcol of collectionsToBackup) {
      const docs = await listSubcollectionDocs<any>(estId, subcol);
      backupData[subcol] = docs || [];
    }

    await setDocData(`establishments/${estId}/backups`, backupId, {
      id: backupId,
      establishment_id: estId,
      created_at: new Date().toISOString(),
      created_by: req.user!.full_name,
      reason: 'Sauvegarde automatique pré-purge',
      data_snapshot: JSON.stringify(backupData),
    });

    // 2. Supprimer les données de démonstration / de test
    let deletedCount = 0;
    for (const subcol of collectionsToBackup) {
      const docs = await listSubcollectionDocs<any>(estId, subcol);
      for (const d of (docs || [])) {
        if (d && d.id) {
          await deleteDocData(`establishments/${estId}/${subcol}`, d.id);
          await deleteDocData(subcol, d.id);
          deletedCount++;
        }
      }
    }

    // 3. Basculer l'établissement en mode production pour verrouiller la purge définitivement
    await setDocData('establishments', estId, {
      ...est,
      is_production: true,
      production_activated_at: new Date().toISOString(),
    });

    logAudit(estId, req.user!.id, req.user!.full_name, 'PURGE_DONNEES_DEMO', 'ESTABLISHMENT', estId, {
      backupId,
      deletedRecords: deletedCount,
    });

    res.json({
      message: `Purge de démonstration effectuée avec succès (${deletedCount} enregistrements supprimés). Sauvegarde préalable créée (${backupId}). L'établissement est maintenant verrouillé en mode Production.`,
      backupId,
      deletedCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erreur lors de la purge des données de test.' });
  }
});

// Endpoints Sauvegardes & Restauration Sans Terminal
api.get('/establishment/backups', authenticateToken, requireRole(['PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const rawBackups = await listSubcollectionDocs<any>(estId, 'backups');
    const backups = (rawBackups || []).map((b: any) => ({
      id: b.id,
      created_at: b.created_at,
      created_by: b.created_by,
      reason: b.reason,
    }));
    backups.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json(backups);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors du chargement des sauvegardes.' });
  }
});

api.post('/establishment/backups/create', authenticateToken, requireRole(['PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { reason } = req.body;

    const collectionsToBackup = [
      'students', 'classes', 'subjects', 'class_subjects', 'payments', 'grades',
      'evaluations', 'student_attendances', 'student_course_attendances',
      'payroll_records', 'disciplinary_incidents', 'complaints', 'lesson_logs', 'guardians'
    ];

    const backupId = `BAK-MANUAL-${Date.now()}`;
    const backupData: Record<string, any[]> = {};

    for (const subcol of collectionsToBackup) {
      const docs = await listSubcollectionDocs<any>(estId, subcol);
      backupData[subcol] = docs || [];
    }

    await setDocData(`establishments/${estId}/backups`, backupId, {
      id: backupId,
      establishment_id: estId,
      created_at: new Date().toISOString(),
      created_by: req.user!.full_name,
      reason: reason || 'Sauvegarde manuelle demandée par le Promoteur',
      data_snapshot: JSON.stringify(backupData),
    });

    logAudit(estId, req.user!.id, req.user!.full_name, 'CREATION_SAUVEGARDE', 'BACKUP', backupId);
    res.json({ message: 'Sauvegarde créée avec succès.', backupId });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la création de la sauvegarde.' });
  }
});

api.post('/establishment/backups/restore', authenticateToken, requireRole(['PROMOTEUR', 'ADMIN_GENERAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const estId = req.user!.establishment_id;
    const { backupId } = req.body;

    if (!backupId) return res.status(400).json({ error: 'Identifiant de sauvegarde requis.' });

    const backupDoc = await getSubcollectionDoc<any>(estId, 'backups', backupId);
    if (!backupDoc || !backupDoc.data_snapshot) {
      return res.status(404).json({ error: 'Sauvegarde introuvable ou invalide.' });
    }

    const snapshot = JSON.parse(backupDoc.data_snapshot);
    let restoredCount = 0;

    for (const [subcolName, docs] of Object.entries(snapshot)) {
      if (Array.isArray(docs)) {
        for (const item of docs) {
          if (item && item.id) {
            await setDocData(`establishments/${estId}/${subcolName}`, item.id, item);
            await setDocData(subcolName, item.id, item);
            restoredCount++;
          }
        }
      }
    }

    logAudit(estId, req.user!.id, req.user!.full_name, 'RESTAURATION_SAUVEGARDE', 'BACKUP', backupId, { restoredCount });
    res.json({ message: `Restauration effectuée avec succès (${restoredCount} enregistrements restaurés).`, restoredCount });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la restauration de la sauvegarde.' });
  }
});

export default api;
