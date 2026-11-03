import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. Lecture sécurisée de la configuration du compte de service (s'il existe)
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const saPath = path.resolve(process.cwd(), '.env.service_account');
    if (fs.existsSync(saPath)) {
      process.env.FIREBASE_SERVICE_ACCOUNT = fs.readFileSync(saPath, 'utf8').trim();
    }
  } catch {}
}

let serviceAccount: any = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err: any) {
    console.error('[Firebase] Erreur parsing FIREBASE_SERVICE_ACCOUNT:', err?.message || err);
  }
}

// 2. Lecture sécurisée de firebase-applet-config.json
let configData: any = null;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e: any) {
  console.warn('[Firebase] Impossible de lire firebase-applet-config.json:', e?.message);
}

export const firebaseProjectId =
  serviceAccount?.project_id ||
  configData?.projectId ||
  process.env.FIREBASE_PROJECT_ID ||
  'soy-spanner-zn2tx';

// 3. Détection de la base Firestore cible (base par défaut vs base nommée)
let targetDatabaseId: string | undefined = undefined;
if (serviceAccount?.project_id) {
  // Si un compte de service dédié est fourni en environnement, il cible la base de son projet
  targetDatabaseId = undefined;
} else if (configData?.firestoreDatabaseId && configData.firestoreDatabaseId !== '(default)') {
  targetDatabaseId = configData.firestoreDatabaseId;
}

// 4. Initialisation sécurisée de l'application Firebase
let app: any = null;
try {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else if (serviceAccount && serviceAccount.project_id && serviceAccount.private_key) {
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseProjectId,
    });
  } else {
    app = initializeApp({
      projectId: firebaseProjectId,
    });
  }
} catch (appErr: any) {
  console.error('[Firebase] Avertissement lors de initializeApp (tentative de récupération de l\'app active):', appErr?.message || appErr);
  const apps = getApps();
  app = apps.length > 0 ? apps[0] : null;
}

// 5. Initialisation sécurisée de l'instance Firestore
let firestoreInstance: any = null;
try {
  if (app) {
    firestoreInstance = targetDatabaseId
      ? getFirestore(app, targetDatabaseId)
      : getFirestore(app);
    try {
      firestoreInstance.settings({ ignoreUndefinedProperties: true });
    } catch {}
  }
} catch (fsErr: any) {
  console.error(`[Firebase] Erreur initialisation Firestore (${targetDatabaseId || 'default'}):`, fsErr?.message || fsErr);
  if (targetDatabaseId && app) {
    try {
      console.log('[Firebase] Tentative de repli vers la base par défaut...');
      firestoreInstance = getFirestore(app);
      firestoreInstance.settings({ ignoreUndefinedProperties: true });
    } catch (fsFallbackErr: any) {
      console.error('[Firebase] Erreur repli Firestore par défaut:', fsFallbackErr?.message || fsFallbackErr);
    }
  }
}

export const db = firestoreInstance;


export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

interface FirestoreErrorInfo {
  error: string;
  code?: string;
  details?: any;
  stack?: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errObj = error as any;
  const rawMsg = errObj instanceof Error ? errObj.message : String(errObj);
  let cleanMsg = rawMsg;
  try {
    if (rawMsg.startsWith('{')) {
      const parsed = JSON.parse(rawMsg);
      cleanMsg = parsed.error || parsed.message || rawMsg;
    }
  } catch {}

  const errInfo: FirestoreErrorInfo = {
    error: rawMsg,
    code: errObj?.code || 'UNKNOWN',
    details: errObj?.details || null,
    stack: errObj instanceof Error ? errObj.stack : undefined,
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  throw new Error(`Erreur base de données (${operationType} sur ${path || 'général'}): ${cleanMsg}`);
}

// ==========================================
// GENERIC DOCUMENT & COLLECTION HELPERS (Admin SDK)
// ==========================================

export async function checkDocExists(colPath: string, docId: string): Promise<boolean> {
  try {
    const docRef = db.collection(colPath).doc(docId);
    const snap = await docRef.get();
    return snap.exists;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${colPath}/${docId}`);
  }
}

export async function getDocData<T = any>(colPath: string, docId: string): Promise<T | null> {
  try {
    const docRef = db.collection(colPath).doc(docId);
    const snap = await docRef.get();
    return snap.exists ? (snap.data() as T) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${colPath}/${docId}`);
  }
}

export async function setDocData(colPath: string, docId: string, data: any): Promise<boolean> {
  try {
    const docRef = db.collection(colPath).doc(docId);
    await docRef.set(data, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${docId}`);
  }
}

export async function updateDocData(colPath: string, docId: string, data: any): Promise<boolean> {
  try {
    const docRef = db.collection(colPath).doc(docId);
    await docRef.update(data);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${colPath}/${docId}`);
  }
}

export async function deleteDocData(colPath: string, docId: string): Promise<boolean> {
  try {
    const docRef = db.collection(colPath).doc(docId);
    await docRef.delete();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${colPath}/${docId}`);
  }
}

export async function listDocs<T = any>(colPath: string): Promise<T[]> {
  try {
    const colRef = db.collection(colPath);
    const snap = await colRef.get();
    return snap.docs.map((d: any) => d.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function queryDocs<T = any>(colPath: string, field: string, op: any, value: any): Promise<T[]> {
  try {
    const colRef = db.collection(colPath);
    const q = colRef.where(field, op, value);
    const snap = await q.get();
    return snap.docs.map((d: any) => d.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

// Subcollection Helpers
export async function listSubcollectionDocs<T = any>(establishmentId: string, subcolName: string): Promise<T[]> {
  return listDocs<T>(`establishments/${establishmentId}/${subcolName}`);
}

export async function getSubcollectionDoc<T = any>(establishmentId: string, subcolName: string, docId: string): Promise<T | null> {
  return getDocData<T>(`establishments/${establishmentId}/${subcolName}`, docId);
}

// 1. Establishments
export async function getEstablishment(id: string) {
  return getDocData('establishments', id);
}

export async function checkEstablishmentExists(id: string): Promise<boolean> {
  return checkDocExists('establishments', id);
}

export async function setEstablishment(id: string, data: any) {
  return setDocData('establishments', id, data);
}

export async function listEstablishments() {
  return listDocs('establishments');
}

// 2. Students
export async function getStudent(establishmentId: string, studentId: string) {
  const subcolDoc = await getSubcollectionDoc(establishmentId, 'students', studentId);
  if (subcolDoc) return subcolDoc;
  return getDocData('students', studentId);
}

export async function setStudent(idOrEstId: string, dataOrNull?: any) {
  let establishmentId: string | null = null;
  let studentId: string;
  let data: any;

  if (dataOrNull) {
    establishmentId = idOrEstId;
    data = dataOrNull;
    studentId = data.id || dataOrNull.id;
  } else {
    data = idOrEstId;
    studentId = data.id;
    establishmentId = data.establishment_id || null;
  }

  if (establishmentId && studentId) {
    await setDocData(`establishments/${establishmentId}/students`, studentId, data);
  }
  return setDocData('students', studentId, data);
}

export async function listStudents(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'students');
}

// 3. Users & Profiles
export async function getGlobalUser(id: string) {
  return getDocData('users', id);
}

export async function setTenantUser(idOrEstId: string, dataOrNull?: any) {
  let establishmentId: string | null = null;
  let userId: string;
  let data: any;

  if (dataOrNull) {
    establishmentId = idOrEstId;
    data = dataOrNull;
    userId = data.id || dataOrNull.id;
  } else {
    data = idOrEstId;
    userId = data.id;
    establishmentId = data.establishment_id || null;
  }

  if (establishmentId && userId) {
    await setDocData(`establishments/${establishmentId}/users`, userId, data);
  }
  return setDocData('users', userId, data);
}

export async function listTenantUsers(establishmentId: string) {
  let subcolUsers: any[] = [];
  try {
    subcolUsers = await listDocs<any>(`establishments/${establishmentId}/users`);
  } catch {}

  let rootUsers: any[] = [];
  try {
    rootUsers = await queryDocs<any>('users', 'establishment_id', '==', establishmentId);
  } catch {}

  const userMap = new Map<string, any>();
  for (const u of [...subcolUsers, ...rootUsers]) {
    if (u && u.id && u.establishment_id === establishmentId) {
      userMap.set(u.id, u);
    }
  }

  return Array.from(userMap.values());
}

export async function findUsersByUsernameOrEmail(username: string, targetEstablishmentId?: string, email?: string) {
  const cleanUsername = username ? username.trim().toLowerCase() : '';
  const cleanEmail = email ? email.trim().toLowerCase() : (cleanUsername.includes('@') ? cleanUsername : undefined);
  const cleanPhone = cleanUsername.replace(/\D/g, '');

  let tenantUsers: any[] = [];
  if (targetEstablishmentId) {
    try {
      tenantUsers = await listTenantUsers(targetEstablishmentId);
    } catch {}
  }

  let rootUsers: any[] = [];
  try {
    if (targetEstablishmentId) {
      rootUsers = await queryDocs<any>('users', 'establishment_id', '==', targetEstablishmentId);
    } else {
      rootUsers = await listDocs<any>('users');
    }
  } catch {}

  const userMap = new Map<string, any>();
  for (const u of [...tenantUsers, ...rootUsers]) {
    if (u && u.id) {
      if (!targetEstablishmentId || u.establishment_id === targetEstablishmentId) {
        userMap.set(u.id, u);
      }
    }
  }

  const allUsers = Array.from(userMap.values());
  return allUsers.filter(u => {
    const uName = (u.username || '').trim().toLowerCase();
    const uEmail = (u.email || '').trim().toLowerCase();
    const uPhone = (u.phone || u.telephone || u.guardian_phone || u.username || '').replace(/\D/g, '');

    const matchUser = (cleanUsername && uName === cleanUsername) ||
                      (cleanEmail && uEmail === cleanEmail) ||
                      (cleanUsername && uEmail === cleanUsername) ||
                      (cleanPhone.length >= 6 && uPhone.length >= 6 && (uPhone === cleanPhone || uPhone.endsWith(cleanPhone) || cleanPhone.endsWith(uPhone)));

    const matchEst = targetEstablishmentId ? (u.establishment_id === targetEstablishmentId) : true;

    return matchUser && matchEst;
  });
}

// Generic helper to list documents from both establishment subcollections and root collections
export async function listTenantDocs<T = any>(establishmentId: string, collectionName: string): Promise<T[]> {
  let subcolDocs: T[] = [];
  try {
    subcolDocs = await listDocs<T>(`establishments/${establishmentId}/${collectionName}`);
  } catch {}

  let rootDocs: T[] = [];
  try {
    rootDocs = await queryDocs<T>(collectionName, 'establishment_id', '==', establishmentId);
  } catch {}

  const map = new Map<string, T>();
  for (const doc of [...subcolDocs, ...rootDocs]) {
    if (doc) {
      const docId = (doc as any).id;
      if (docId) {
        map.set(docId, doc);
      }
    }
  }

  return Array.from(map.values());
}

// 4. Classes & Subjects
export async function listClasses(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'classes');
}

export async function setClass(id: string, data: any) {
  return setDocData('classes', id, data);
}

export async function listSubjects(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'subjects');
}

export async function setSubject(id: string, data: any) {
  return setDocData('subjects', id, data);
}

export async function listClassSubjects(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'class_subjects');
}

// 5. Payments & Finance
export async function listPayments(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'payments');
}

export async function setPayment(id: string, data: any) {
  return setDocData('payments', id, data);
}

export async function listTariffs(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'school_tariff_plans');
}

export async function listExpenses(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'expenses');
}

export async function listFundInjections(establishmentId: string) {
  const [injections, reinforcements] = await Promise.all([
    listTenantDocs<any>(establishmentId, 'fund_injections').catch(() => []),
    listTenantDocs<any>(establishmentId, 'cash_reinforcements').catch(() => []),
  ]);
  const map = new Map<string, any>();
  for (const doc of [...(injections || []), ...(reinforcements || [])]) {
    if (doc && doc.id) {
      map.set(doc.id, doc);
    }
  }
  return Array.from(map.values());
}

// 6. Evaluations & Grades
export async function listEvaluations(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'evaluations');
}

export async function setEvaluation(id: string, data: any) {
  return setDocData('evaluations', id, data);
}

export async function listGrades(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'grades');
}

export async function setGrade(id: string, data: any) {
  return setDocData('grades', id, data);
}

// 7. Attendance, Course Logs, Schedules & Payroll
export async function listStudentAttendances(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'student_attendances');
}

export async function listStudentCourseAttendances(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'student_course_attendances');
}

export async function setStudentCourseAttendance(establishmentId: string, id: string, data: any) {
  if (establishmentId && id) {
    await setDocData(`establishments/${establishmentId}/student_course_attendances`, id, data);
  }
  return setDocData('student_course_attendances', id, data);
}

export async function listStudentSessionAttendances(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'student_session_attendances');
}

export async function setStudentAttendance(id: string, data: any) {
  return setDocData('student_attendances', id, data);
}

export async function listTeacherCheckins(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'teacher_attendances');
}

export async function listPayrollRecords(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'payroll_records');
}

export async function setPayrollRecord(id: string, data: any) {
  return setDocData('payroll_records', id, data);
}

export async function listLessonLogs(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'lesson_logs');
}

export async function setLessonLog(id: string, data: any) {
  return setDocData('lesson_logs', id, data);
}

export async function listSchedules(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'teacher_schedules');
}

export async function listDisciplinaryIncidents(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'disciplinary_incidents');
}

export async function listComplaints(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'complaints');
}

export async function listAnnouncements(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'school_announcements');
}

export async function listParentStudents(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'parent_students');
}

// 8. Subscriptions & Audit logs
export async function getSubscription(establishmentId: string) {
  return getDocData('subscriptions', establishmentId);
}

export async function setSubscription(establishmentId: string, data: any) {
  return setDocData('subscriptions', establishmentId, data);
}

export async function logFirestoreAudit(id: string, data: any) {
  return setDocData('audit_logs_firestore', id, data);
}

// 9. Guardians
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+242')) return cleaned;
  if (cleaned.startsWith('242')) return '+' + cleaned;
  if (cleaned.startsWith('0')) return '+242' + cleaned.substring(1);
  return '+242' + cleaned;
}

export async function listGuardians(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'guardians');
}

export async function getGuardian(establishmentId: string, guardianId: string) {
  const subcolDoc = await getSubcollectionDoc(establishmentId, 'guardians', guardianId);
  if (subcolDoc) return subcolDoc;
  return getDocData('guardians', guardianId);
}

export async function setGuardian(establishmentId: string, guardianId: string, data: any) {
  if (establishmentId && guardianId) {
    await setDocData(`establishments/${establishmentId}/guardians`, guardianId, data);
  }
  return setDocData('guardians', guardianId, data);
}

export async function queryGuardiansByPhone(establishmentId: string, phone: string) {
  const normPhone = normalizePhone(phone);
  if (!normPhone) return [];
  const allGuardians = await listGuardians(establishmentId);
  return allGuardians.filter((g: any) => normalizePhone(g.phone) === normPhone);
}

// Curriculum Programs (Référentiel des programmes & manuels)
export async function listCurriculumPrograms(establishmentId: string) {
  return listTenantDocs<any>(establishmentId, 'curriculum_programs');
}

export async function getCurriculumProgram(establishmentId: string, programId: string) {
  const subcolDoc = await getSubcollectionDoc(establishmentId, 'curriculum_programs', programId);
  if (subcolDoc) return subcolDoc;
  return getDocData('curriculum_programs', programId);
}

export async function setCurriculumProgram(establishmentId: string, programId: string, data: any) {
  if (establishmentId && programId) {
    await setDocData(`establishments/${establishmentId}/curriculum_programs`, programId, data);
  }
  return setDocData('curriculum_programs', programId, data);
}

export async function deleteCurriculumProgramDoc(establishmentId: string, programId: string) {
  if (establishmentId && programId) {
    await deleteDocData(`establishments/${establishmentId}/curriculum_programs`, programId);
  }
  return deleteDocData('curriculum_programs', programId);
}

// 10. Student Matricule Generator (CODEECOLE-ANNÉESCOLAIRE-NUMÉRO)
export function formatAcademicYearForMatricule(yearStr: string | null | undefined): string {
  if (!yearStr) return '2026/27';
  const clean = yearStr.trim();
  const matchFull = clean.match(/^(\d{4})[-/](\d{4})$/);
  if (matchFull) {
    const startYear = matchFull[1];
    const endYear = matchFull[2].slice(-2);
    return `${startYear}/${endYear}`;
  }
  const matchShort = clean.match(/^(\d{4})[-/](\d{2})$/);
  if (matchShort) {
    return `${matchShort[1]}/${matchShort[2]}`;
  }
  const matchSingle = clean.match(/^(\d{4})$/);
  if (matchSingle) {
    const start = parseInt(matchSingle[1], 10);
    const end = String(start + 1).slice(-2);
    return `${start}/${end}`;
  }
  return clean.replace('-', '/');
}

export async function generateNextStudentMatricule(
  establishmentId: string,
  schoolCode: string,
  academicYear: string
): Promise<string> {
  const formattedYear = formatAcademicYearForMatricule(academicYear);
  const cleanCode = (schoolCode || 'ECO').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const yearKey = formattedYear.replace('/', '_');
  const counterRef = db.collection(`establishments/${establishmentId}/counters`).doc(`student_matricule_${yearKey}`);

  const seqNumber = await db.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(counterRef);
    let nextSeq = 1;
    if (snap.exists) {
      const data = snap.data();
      nextSeq = (Number(data?.current_seq) || 0) + 1;
    }
    transaction.set(counterRef, {
      current_seq: nextSeq,
      academic_year: formattedYear,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return nextSeq;
  });

  const paddedSeq = seqNumber.toString().padStart(4, '0');
  return `${cleanCode}-${formattedYear}-${paddedSeq}`;
}


