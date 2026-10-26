import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.error('Erreur lecture firebase-applet-config.json:', e);
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================
// GENERIC DOCUMENT & COLLECTION HELPERS
// ==========================================

export async function checkDocExists(colPath: string, docId: string): Promise<boolean> {
  try {
    const docRef = doc(db, colPath, docId);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${colPath}/${docId}`);
  }
}

export async function getDocData<T = any>(colPath: string, docId: string): Promise<T | null> {
  try {
    const docRef = doc(db, colPath, docId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as T) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${colPath}/${docId}`);
  }
}

export async function setDocData(colPath: string, docId: string, data: any): Promise<boolean> {
  try {
    const docRef = doc(db, colPath, docId);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${docId}`);
  }
}

export async function updateDocData(colPath: string, docId: string, data: any): Promise<boolean> {
  try {
    const docRef = doc(db, colPath, docId);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${colPath}/${docId}`);
  }
}

export async function deleteDocData(colPath: string, docId: string): Promise<boolean> {
  try {
    const docRef = doc(db, colPath, docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${colPath}/${docId}`);
  }
}

export async function listDocs<T = any>(colPath: string): Promise<T[]> {
  try {
    const colRef = collection(db, colPath);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function queryDocs<T = any>(colPath: string, field: string, op: any, value: any): Promise<T[]> {
  try {
    const colRef = collection(db, colPath);
    const q = query(colRef, where(field, op, value));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

// ==========================================
// 1. ESTABLISHMENTS
// ==========================================

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

// ==========================================
// 2. USERS & AUTHENTICATION
// ==========================================

export async function getGlobalUser(userId: string) {
  return getDocData('users', userId);
}

export async function getTenantUser(establishmentId: string, userId: string) {
  return getDocData(`establishments/${establishmentId}/users`, userId);
}

export async function setTenantUser(establishmentId: string, user: any) {
  // Enregistrement synchronisé : dans le tenant ET dans l'index global pour auth rapide
  await setDocData(`establishments/${establishmentId}/users`, user.id, user);
  await setDocData('users', user.id, user);
  return true;
}

export async function listTenantUsers(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/users`);
}

export async function findUsersByUsernameOrEmail(identifier: string, establishmentId?: string) {
  const cleanId = identifier.trim().toLowerCase();
  try {
    let usersCol = collection(db, 'users');
    let q = query(usersCol, where('username', '==', cleanId));
    let snap = await getDocs(q);
    let results = snap.docs.map(d => d.data());

    if (results.length === 0) {
      const qEmail = query(usersCol, where('email', '==', cleanId));
      const snapEmail = await getDocs(qEmail);
      results = snapEmail.docs.map(d => d.data());
    }

    if (establishmentId && results.length > 0) {
      results = results.filter(u => u.establishment_id === establishmentId);
    }
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

// ==========================================
// 3. STUDENTS
// ==========================================

export async function getStudent(establishmentId: string, studentId: string) {
  return getDocData(`establishments/${establishmentId}/students`, studentId);
}

export async function setStudent(establishmentId: string, student: any) {
  return setDocData(`establishments/${establishmentId}/students`, student.id, student);
}

export async function listStudents(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/students`);
}

// ==========================================
// 4. CLASSES & SUBJECTS
// ==========================================

export async function listClasses(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/classes`);
}

export async function setClass(establishmentId: string, classData: any) {
  return setDocData(`establishments/${establishmentId}/classes`, classData.id, classData);
}

export async function listSubjects(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/subjects`);
}

export async function setSubject(establishmentId: string, subjectData: any) {
  return setDocData(`establishments/${establishmentId}/subjects`, subjectData.id, subjectData);
}

export async function listClassSubjects(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/class_subjects`);
}

export async function setClassSubject(establishmentId: string, csData: any) {
  return setDocData(`establishments/${establishmentId}/class_subjects`, csData.id, csData);
}

// ==========================================
// 5. PAYMENTS & FINANCES
// ==========================================

export async function listPayments(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/payments`);
}

export async function getPayment(establishmentId: string, paymentId: string) {
  return getDocData(`establishments/${establishmentId}/payments`, paymentId);
}

export async function setPayment(establishmentId: string, payment: any) {
  return setDocData(`establishments/${establishmentId}/payments`, payment.id, payment);
}

export async function listFeeStructures(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/fee_structures`);
}

export async function setFeeStructure(establishmentId: string, fee: any) {
  return setDocData(`establishments/${establishmentId}/fee_structures`, fee.id, fee);
}

export async function listSchoolTariffPlans(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/school_tariff_plans`);
}

export async function setSchoolTariffPlan(establishmentId: string, plan: any) {
  return setDocData(`establishments/${establishmentId}/school_tariff_plans`, plan.id, plan);
}

// ==========================================
// 6. EVALUATIONS & GRADES
// ==========================================

export async function listEvaluations(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/evaluations`);
}

export async function setEvaluation(establishmentId: string, evaluation: any) {
  return setDocData(`establishments/${establishmentId}/evaluations`, evaluation.id, evaluation);
}

export async function listGrades(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/grades`);
}

export async function setGrade(establishmentId: string, grade: any) {
  return setDocData(`establishments/${establishmentId}/grades`, grade.id, grade);
}

// ==========================================
// 7. ATTENDANCE & DISCIPLINE
// ==========================================

export async function listStudentAttendances(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/student_attendances`);
}

export async function setStudentAttendance(establishmentId: string, attendance: any) {
  return setDocData(`establishments/${establishmentId}/student_attendances`, attendance.id, attendance);
}

export async function listTeacherAttendances(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/teacher_attendances`);
}

export async function setTeacherAttendance(establishmentId: string, att: any) {
  return setDocData(`establishments/${establishmentId}/teacher_attendances`, att.id, att);
}

export async function listDisciplinaryIncidents(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/disciplinary_incidents`);
}

export async function setDisciplinaryIncident(establishmentId: string, incident: any) {
  return setDocData(`establishments/${establishmentId}/disciplinary_incidents`, incident.id, incident);
}

// ==========================================
// 8. PAYROLL RECORDS
// ==========================================

export async function listPayrollRecords(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/payroll_records`);
}

export async function setPayrollRecord(establishmentId: string, payroll: any) {
  return setDocData(`establishments/${establishmentId}/payroll_records`, payroll.id, payroll);
}

// ==========================================
// 9. LESSON LOGS (CAHIER DE TEXTE)
// ==========================================

export async function listLessonLogs(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/lesson_logs`);
}

export async function setLessonLog(establishmentId: string, log: any) {
  return setDocData(`establishments/${establishmentId}/lesson_logs`, log.id, log);
}

// ==========================================
// 10. ANNOUNCEMENTS & PARENT-STUDENT
// ==========================================

export async function listAnnouncements(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/school_announcements`);
}

export async function setAnnouncement(establishmentId: string, ann: any) {
  return setDocData(`establishments/${establishmentId}/school_announcements`, ann.id, ann);
}

export async function listParentStudents(establishmentId: string) {
  return listDocs(`establishments/${establishmentId}/parent_students`);
}

export async function setParentStudent(establishmentId: string, ps: any) {
  return setDocData(`establishments/${establishmentId}/parent_students`, ps.id, ps);
}

// ==========================================
// 11. GLOBAL PLATFORM ENTITIES
// ==========================================

export async function listSubscriptions() {
  return listDocs('subscriptions');
}

export async function getSubscription(subId: string) {
  return getDocData('subscriptions', subId);
}

export async function setSubscription(subscription: any) {
  return setDocData('subscriptions', subscription.id, subscription);
}

export async function listCreationAuthorizations() {
  return listDocs('creation_authorizations');
}

export async function setCreationAuthorization(authData: any) {
  return setDocData('creation_authorizations', authData.id, authData);
}

export async function listPedagogicalReferences() {
  return listDocs('pedagogical_references');
}

export async function setPedagogicalReference(refData: any) {
  return setDocData('pedagogical_references', refData.id, refData);
}

export async function logFirestoreAudit(establishmentId: string, auditData: any) {
  try {
    await setDocData(`establishments/${establishmentId}/audit_logs`, auditData.id, auditData);
  } catch (error) {
    console.error('Audit log Firestore error:', error);
  }
}
