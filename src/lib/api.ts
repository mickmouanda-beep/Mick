const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('fsm_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('fsm_auth_token', token);
  } else {
    localStorage.removeItem('fsm_auth_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let errorMsg = data.error || `Erreur serveur (${response.status})`;
    try {
      if (typeof errorMsg === 'string' && errorMsg.startsWith('{')) {
        const parsed = JSON.parse(errorMsg);
        errorMsg = parsed.error || parsed.message || errorMsg;
      }
    } catch {}

    if (
      response.status === 503 ||
      (typeof errorMsg === 'string' && (
        errorMsg.includes('Base de données indisponible') ||
        errorMsg.includes('PERMISSION_DENIED') ||
        errorMsg.includes('FIRESTORE_BLOCKED')
      ))
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('database-unavailable', { detail: { message: errorMsg, data } }));
      }
    }
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Statut & Setup
  getStatus: async () => {
    const res = await request<any>('/status');
    if (res && res.databaseAvailable === false) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('database-unavailable', { detail: { message: res.databaseError, data: res } }));
      }
    }
    return res;
  },
  initializeSetup: (payload: any) => request<any>('/setup/initialize', { method: 'POST', body: JSON.stringify(payload) }),
  seedDemoData: () => request<any>('/setup/seed-demo', { method: 'POST' }),

  // Auth & Multi-Écoles
  login: (credentials: { username: string; password: string; establishmentCode?: string; establishmentId?: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  demoSwitch: (payload: { username?: string; role?: string; establishmentCode?: string; devKey?: string }) => {
    const customHeaders: Record<string, string> = {};
    if (payload.devKey) {
      customHeaders['x-eco-dev-key'] = payload.devKey;
    }
    return request<any>('/auth/demo-switch', {
      method: 'POST',
      headers: customHeaders,
      body: JSON.stringify(payload),
    });
  },
  getMe: () => request<any>('/auth/me'),
  changePassword: (payload: any) => request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),

  // Multi-Établissements & Plateforme
  registerSchool: (payload: any) => request<any>('/establishments/register', { method: 'POST', body: JSON.stringify(payload) }),
  checkSchoolCode: (code: string) => request<{ code: string; available: boolean }>(`/establishments/check-code/${encodeURIComponent(code)}`),
  verifyAuthCode: (code: string) => request<{ valid: boolean; authorization?: any; error?: string }>(`/establishments/verify-auth-code/${encodeURIComponent(code)}`),
  getEstablishments: () => request<any[]>('/establishments'),
  switchEstablishment: (targetEstablishmentId: string) =>
    request<any>('/establishments/switch', { method: 'POST', body: JSON.stringify({ targetEstablishmentId }) }),

  // Espace Développeur & Console Centrale
  getDeveloperBootstrapStatus: () => request<{ initialized: boolean; adminCount: number }>('/developer/bootstrap-status'),
  bootstrapDeveloper: (payload: { username: string; password: string; fullName: string; email?: string; phone?: string }) =>
    request<any>('/developer/bootstrap', { method: 'POST', body: JSON.stringify(payload) }),
  getDeveloperMetrics: () => request<any>('/developer/metrics'),
  getDeveloperEstablishments: (params?: { search?: string; status?: string; city?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.city) q.set('city', params.city);
    return request<any[]>(`/developer/establishments?${q.toString()}`);
  },
  createDeveloperEstablishment: (payload: any) =>
    request<any>('/developer/establishments', { method: 'POST', body: JSON.stringify(payload) }),
  updateEstablishmentStatus: (id: string, status: string, reason?: string) =>
    request<any>(`/developer/establishments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, reason }) }),
  deleteEstablishmentPermanently: (id: string, confirmationCode: string) =>
    request<any>(`/developer/establishments/${id}`, { method: 'DELETE', body: JSON.stringify({ confirmationCode }) }),
  getAuthorizations: () => request<any[]>('/developer/authorizations'),
  createAuthorization: (payload: { promoter_name: string; promoter_email?: string; promoter_phone?: string; notes?: string; validityDays?: number }) =>
    request<any>('/developer/authorizations', { method: 'POST', body: JSON.stringify(payload) }),
  revokeAuthorization: (id: string, reason?: string) =>
    request<any>(`/developer/authorizations/${id}/revoke`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  getDeveloperPromoters: () => request<any[]>('/developer/promoters'),
  searchPromoters: (query?: string) => request<any[]>(`/developer/promoters/search${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  recoverPromoterUsername: (promoterUserId: string) => request<any>('/developer/promoters/recover-username', { method: 'POST', body: JSON.stringify({ promoterUserId }) }),
  resetPromoterPasswordByAdmin: (payload: { promoterUserId: string; newPassword: string; notes?: string }) => request<any>('/developer/promoters/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  getDeveloperAuditLogs: () => request<any[]>('/developer/audit-logs'),
  getDeveloperLicenses: () => request<any[]>('/developer/licenses'),
  getCommercialFormulas: () => request<any[]>('/developer/formulas'),
  updateEstablishmentFormula: (id: string, formula: string, notes?: string) =>
    request<any>(`/developer/licenses/${id}/formula`, { method: 'PUT', body: JSON.stringify({ formula, notes }) }),
  renewEstablishmentLicense: (id: string, durationMonths: number = 12, notes?: string) =>
    request<any>(`/developer/licenses/${id}/renew`, { method: 'POST', body: JSON.stringify({ durationMonths, notes }) }),

  // Établissement & Modèles de Documents
  getSettings: () => request<any>('/establishment/settings'),
  updateSettings: (payload: any) => request<any>('/establishment/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  getDocumentTemplate: (docType: string) => request<any>(`/document-templates/${docType}`),
  saveDocumentTemplate: (docType: string, config: any) =>
    request<any>(`/document-templates/${docType}`, { method: 'PUT', body: JSON.stringify(config) }),
  getAuditLogs: () => request<any[]>('/audit-logs'),

  // Utilisateurs
  getUsers: () => request<any[]>('/users'),
  createUser: (payload: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUserStatus: (id: string, status: string) => request<any>(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  resetUserPassword: (id: string, newPassword: string) => request<any>(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),

  // Académique
  getClasses: () => request<any[]>('/academic/classes'),
  createClass: (payload: any) => request<any>('/academic/classes', { method: 'POST', body: JSON.stringify(payload) }),
  updateClass: (id: string, payload: any) => request<any>(`/academic/classes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteClass: (id: string) => request<any>(`/academic/classes/${id}`, { method: 'DELETE' }),

  getSubjects: () => request<any[]>('/academic/subjects'),
  createSubject: (payload: any) => request<any>('/academic/subjects', { method: 'POST', body: JSON.stringify(payload) }),
  getClassSubjects: (classId: string) => request<any[]>(`/academic/classes/${classId}/subjects`),
  assignClassSubject: (classId: string, payload: any) => request<any>(`/academic/classes/${classId}/subjects`, { method: 'POST', body: JSON.stringify(payload) }),

  // Élèves
  getStudents: (params: { classId?: string; status?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.classId) query.append('classId', params.classId);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return request<any[]>(`/students?${query.toString()}`);
  },
  getStudentById: (id: string) => request<any>(`/students/${id}`),
  createStudent: (payload: any) => request<any>('/students', { method: 'POST', body: JSON.stringify(payload) }),
  updateStudent: (id: string, payload: any) => request<any>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  transferStudent: (id: string, payload: any) => request<any>(`/students/${id}/transfer`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteStudent: (id: string) => request<any>(`/students/${id}`, { method: 'DELETE' }),
  provisionStudentAccounts: (id: string) => request<any>(`/students/${id}/provision-accounts`, { method: 'POST' }),

  // Enseignants
  getTeachers: () => request<any[]>('/teachers'),
  getMyAssignments: () => request<any[]>('/teachers/my-assignments'),
  assignTeacherSubject: (teacherId: string, payload: { classId: string; subjectId: string; coefficient?: number; weeklyHours?: number }) =>
    request<any>(`/teachers/${teacherId}/assignments`, { method: 'POST', body: JSON.stringify(payload) }),
  removeTeacherAssignment: (teacherId: string, classSubjectId: string) =>
    request<any>(`/teachers/${teacherId}/assignments/${classSubjectId}`, { method: 'DELETE' }),
  getCourseLogs: () => request<any[]>('/teachers/course-logs'),
  logCourseSession: (payload: any) => request<any>('/teachers/course-logs', { method: 'POST', body: JSON.stringify(payload) }),

  // Emplois du temps des cours (Multi-rôles & Sécurisé)
  getSchedules: (params: { classId?: string; teacherId?: string; studentId?: string; dayOfWeek?: number; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.classId) query.append('classId', params.classId);
    if (params.teacherId) query.append('teacherId', params.teacherId);
    if (params.studentId) query.append('studentId', params.studentId);
    if (params.dayOfWeek) query.append('dayOfWeek', String(params.dayOfWeek));
    if (params.status) query.append('status', params.status);
    return request<any[]>(`/academic/schedules?${query.toString()}`);
  },
  createSchedule: (payload: { classId: string; teacherId: string; subjectId: string; dayOfWeek: number; startTime: string; endTime: string; room?: string; isPublished?: boolean }) =>
    request<any>('/academic/schedules', { method: 'POST', body: JSON.stringify(payload) }),
  updateSchedule: (id: string, payload: { classId?: string; teacherId?: string; subjectId?: string; dayOfWeek?: number; startTime?: string; endTime?: string; room?: string; isPublished?: boolean }) =>
    request<any>(`/academic/schedules/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSchedule: (id: string) => request<any>(`/academic/schedules/${id}`, { method: 'DELETE' }),
  publishSchedules: (payload: { classId?: string; isPublished: boolean }) =>
    request<any>('/academic/schedules/publish', { method: 'POST', body: JSON.stringify(payload) }),
  getScheduleAudits: () => request<any[]>('/academic/schedules/audits'),

  // Évaluations & Notes
  getEvaluations: (params: { classId?: string; subjectId?: string; term?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.classId) query.append('classId', params.classId);
    if (params.subjectId) query.append('subjectId', params.subjectId);
    if (params.term) query.append('term', params.term);
    return request<any[]>(`/evaluations?${query.toString()}`);
  },
  createEvaluation: (payload: any) => request<any>('/evaluations', { method: 'POST', body: JSON.stringify(payload) }),
  getEvaluationGrades: (evalId: string) => request<any>(`/evaluations/${evalId}/grades`),
  saveEvaluationGrades: (evalId: string, grades: any[]) => request<any>(`/evaluations/${evalId}/grades`, { method: 'POST', body: JSON.stringify({ grades }) }),
  lockEvaluation: (evalId: string, isLocked: boolean) => request<any>(`/evaluations/${evalId}/lock`, { method: 'POST', body: JSON.stringify({ isLocked }) }),
  getReportCards: (classId: string, term: string) => request<any>(`/report-cards/class/${classId}?term=${term}`),
  publishReportCards: (payload: { classId: string; term: string; reports: any[]; academicYear?: string }) => request<any>('/report-cards/publish', { method: 'POST', body: JSON.stringify(payload) }),
  repairParentStudentLinks: (payload?: { dryRun?: boolean }) => request<any>('/academic/repair-parent-student-links', { method: 'POST', body: JSON.stringify(payload || {}) }),

  // Présences & Discipline
  getAttendance: (classId: string, date: string) => request<any[]>(`/attendance?classId=${classId}&date=${date}`),
  saveAttendance: (classId: string, date: string, records: any[]) => request<any>('/attendance', { method: 'POST', body: JSON.stringify({ classId, date, records }) }),
  getCourseAttendance: (params: { classId: string; date: string; scheduleId?: string; sessionType?: string }) => {
    const q = new URLSearchParams();
    q.set('classId', params.classId);
    q.set('date', params.date);
    if (params.scheduleId) q.set('scheduleId', params.scheduleId);
    if (params.sessionType) q.set('sessionType', params.sessionType);
    return request<any[]>(`/attendance/course-rollcall?${q.toString()}`);
  },
  saveCourseAttendance: (payload: { classId: string; date: string; scheduleId?: string; sessionType?: string; records: any[]; editReason?: string }) =>
    request<any>('/attendance/course-rollcall', { method: 'POST', body: JSON.stringify(payload) }),
  getAttendanceAlerts: (date?: string) => {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return request<any[]>(`/attendance/alerts${q}`);
  },
  getDisciplineIncidents: () => request<any[]>('/discipline'),
  createDisciplineIncident: (payload: any) => request<any>('/discipline', { method: 'POST', body: JSON.stringify(payload) }),
  updateDisciplineIncident: (id: string, payload: any) => request<any>(`/discipline/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Réclamations & Signalements (Tous profils, Surveillance, Direction)
  getComplaints: () => request<any[]>('/complaints'),
  createComplaint: (payload: any) => request<any>('/complaints', { method: 'POST', body: JSON.stringify(payload) }),
  respondComplaint: (id: string, payload: any) => request<any>(`/complaints/${id}/respond`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Comptabilité
  getFeeStructures: () => request<any[]>('/finance/fee-structures'),
  createFeeStructure: (payload: any) => request<any>('/finance/fee-structures', { method: 'POST', body: JSON.stringify(payload) }),
  updateFeeStructure: (id: string, payload: any) => request<any>(`/finance/fee-structures/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteFeeStructure: (id: string) => request<any>(`/finance/fee-structures/${id}`, { method: 'DELETE' }),
  getStudentFeeStatus: (studentId: string) => request<any>(`/finance/student-fee-status/${studentId}`),
  getStudentBalances: () => request<any[]>('/finance/student-balances'),
  getPayments: () => request<any[]>('/finance/payments'),
  createPayment: (payload: any) => request<any>('/finance/payments', { method: 'POST', body: JSON.stringify(payload) }),
  cancelPayment: (paymentId: string, reason: string) => request<any>(`/finance/payments/${paymentId}/cancel`, { method: 'POST', body: JSON.stringify({ cancellationReason: reason }) }),
  logPaymentPrint: (paymentId: string) => request<any>(`/finance/payments/${paymentId}/log-print`, { method: 'POST' }),
  getExpenses: () => request<any[]>('/finance/expenses'),
  createExpense: (payload: any) => request<any>('/finance/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  getCashInjections: () => request<any[]>('/finance/cash-injections'),
  createCashInjection: (payload: { amount: number; providerName: string; paymentMethod?: string; notes?: string }) =>
    request<any>('/finance/cash-injections', { method: 'POST', body: JSON.stringify(payload) }),
  getFinanceSummary: () => request<any>('/finance/summary'),

  // Paie & Salaires (Comptable, Promoteur, DG)
  getPayrollRecords: (params: { period?: string; department?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.period) query.append('period', params.period);
    if (params.department) query.append('department', params.department);
    if (params.status) query.append('status', params.status);
    return request<any[]>(`/finance/payroll?${query.toString()}`);
  },
  createPayrollRecord: (payload: any) => request<any>('/finance/payroll', { method: 'POST', body: JSON.stringify(payload) }),
  updatePayrollRecord: (id: string, payload: any) => request<any>(`/finance/payroll/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  submitPayrollRecord: (id: string) => request<any>(`/finance/payroll/${id}/submit`, { method: 'POST' }),
  validatePayrollRecord: (id: string) => request<any>(`/finance/payroll/${id}/validate`, { method: 'POST' }),
  payPayrollRecord: (id: string, payload: any) => request<any>(`/finance/payroll/${id}/pay`, { method: 'POST', body: JSON.stringify(payload) }),
  deletePayrollRecord: (id: string) => request<any>(`/finance/payroll/${id}`, { method: 'DELETE' }),

  // Cahier de texte officiel & Pédagogie (DE, DG, Promoteur, Enseignant)
  getLessons: (params: { teacherId?: string; classId?: string; subjectId?: string; date?: string; status?: string; incomplete?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.teacherId) query.append('teacherId', params.teacherId);
    if (params.classId) query.append('classId', params.classId);
    if (params.subjectId) query.append('subjectId', params.subjectId);
    if (params.date) query.append('date', params.date);
    if (params.status) query.append('status', params.status);
    if (params.incomplete) query.append('incomplete', 'true');
    return request<any[]>(`/lessons?${query.toString()}`);
  },
  createLesson: (payload: any) => request<any>('/lessons', { method: 'POST', body: JSON.stringify(payload) }),
  updateLesson: (id: string, payload: any) => request<any>(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  visaLesson: (id: string, payload: { comments?: string; approveEditLock?: boolean }) =>
    request<any>(`/lessons/${id}/visa`, { method: 'POST', body: JSON.stringify(payload) }),
  getLessonObservations: (lessonId: string) => request<any[]>(`/lessons/${lessonId}/observations`),
  createLessonObservation: (lessonId: string, payload: any) => request<any>(`/lessons/${lessonId}/observations`, { method: 'POST', body: JSON.stringify(payload) }),
  replyLessonObservation: (obsId: string, reply: string) => request<any>(`/lessons/observations/${obsId}/reply`, { method: 'POST', body: JSON.stringify({ reply }) }),
  updateObservationStatus: (obsId: string, status: string) => request<any>(`/lessons/observations/${obsId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getLessonProgress: () => request<any[]>('/lessons/progress/summary'),

  // Prévisions de la semaine
  getForecasts: (weekCode?: string, teacherId?: string) => {
    const q = new URLSearchParams();
    if (weekCode) q.set('weekCode', weekCode);
    if (teacherId) q.set('teacherId', teacherId);
    return request<any[]>(`/lessons/forecasts/week?${q.toString()}`);
  },
  saveForecast: (payload: any) => request<any>('/lessons/forecasts', { method: 'POST', body: JSON.stringify(payload) }),
  copyPreviousForecasts: (currentWeekCode: string, previousWeekCode: string) =>
    request<any>('/lessons/forecasts/copy-previous', { method: 'POST', body: JSON.stringify({ currentWeekCode, previousWeekCode }) }),

  // Programmes scolaires (Curriculum)
  getCurriculum: (params: { levelCode?: string; classId?: string; subjectId?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.levelCode) q.set('levelCode', params.levelCode);
    if (params.classId) q.set('classId', params.classId);
    if (params.subjectId) q.set('subjectId', params.subjectId);
    return request<any[]>(`/curriculum?${q.toString()}`);
  },
  importCurriculumCsv: (csvData: string) => request<any>('/curriculum/import-csv', { method: 'POST', body: JSON.stringify({ csvData }) }),
  importCurriculumAi: (payload: { fileBase64: string; mimeType?: string; levelCode?: string; subjectName?: string }) =>
    request<any>('/curriculum/import-ai', { method: 'POST', body: JSON.stringify(payload) }),

  // Pointage Enseignants (Surveillant, DE, DG, Promoteur, Enseignant)
  getTeacherAttendances: (date?: string, teacherId?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (teacherId) params.append('teacherId', teacherId);
    const qs = params.toString();
    return request<any[]>(`/teacher-attendances${qs ? `?${qs}` : ''}`);
  },
  saveTeacherAttendance: (payload: any) => request<any>('/teacher-attendances', { method: 'POST', body: JSON.stringify(payload) }),
  teacherPointageResponse: (id: string, payload: { validationStatus: 'CONFIRME' | 'CONTESTE'; teacherComment?: string; contestReason?: string; supportingDoc?: string }) =>
    request<any>(`/teacher-attendances/${id}/teacher-response`, { method: 'PUT', body: JSON.stringify(payload) }),
  correctTeacherAttendance: (id: string, payload: any) => request<any>(`/teacher-attendances/${id}/correct`, { method: 'PUT', body: JSON.stringify(payload) }),
  validateFinalTeacherAttendance: (id: string) => request<any>(`/teacher-attendances/${id}/validate`, { method: 'PUT' }),
  getTeacherAttendanceReports: (params: { startDate?: string; endDate?: string; teacherId?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.teacherId) query.append('teacherId', params.teacherId);
    return request<any>(`/teacher-attendances/reports/summary?${query.toString()}`);
  },

  importPedagogicalReference: (payload: { referenceId?: string; cycleCode?: string }) =>
    request<any>('/academic/pedagogical-references/import-to-school', { method: 'POST', body: JSON.stringify(payload) }),

  // Décisions administratives (DG, Promoteur, DE)
  getDecisions: () => request<any[]>('/decisions'),
  createDecision: (payload: any) => request<any>('/decisions', { method: 'POST', body: JSON.stringify(payload) }),
  updateDecision: (id: string, payload: any) => request<any>(`/decisions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Espace Élève & Espace Parent / Tuteur (ECO. GES.)
  getStudentPortalData: (studentId?: string, term?: string) => {
    let q = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    if (term) {
      q += (q ? '&' : '?') + `term=${encodeURIComponent(term)}`;
    }
    return request<any>(`/student/portal-data${q}`);
  },
  submitAbsenceJustification: (payload: { studentId: string; attendanceId?: string; date: string; reason: string; documentUrl?: string }) =>
    request<any>('/student/absence-justification', { method: 'POST', body: JSON.stringify(payload) }),
  getParentPortalData: (childId?: string) => {
    const q = childId ? `?childId=${encodeURIComponent(childId)}` : '';
    return request<any>(`/parent/portal-data${q}`);
  },
  getAbsenceJustifications: () => request<any[]>('/student/justifications'),
  reviewAbsenceJustification: (id: string, payload: { status: 'APPROUVE' | 'REJETE'; reviewNote?: string }) =>
    request<any>(`/student/justifications/${id}/review`, { method: 'PUT', body: JSON.stringify(payload) }),
  getAnnouncements: (audience?: string) => {
    const q = audience ? `?audience=${encodeURIComponent(audience)}` : '';
    return request<any[]>(`/announcements${q}`);
  },
  createAnnouncement: (payload: { title: string; content: string; targetAudience?: string; category?: string }) =>
    request<any>('/announcements', { method: 'POST', body: JSON.stringify(payload) }),

  // Référentiel National Pédagogique (Congo-Brazzaville)
  getPedagogicalReferences: () => request<any[]>('/academic/pedagogical-references'),

  // Grilles tarifaires (Promoteur)
  getTariffs: () => request<any[]>('/tariffs'),
  createTariff: (payload: any) => request<any>('/tariffs', { method: 'POST', body: JSON.stringify(payload) }),
  updateTariff: (id: string, payload: any) => request<any>(`/tariffs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTariff: (id: string) => request<any>(`/tariffs/${id}`, { method: 'DELETE' }),

  // Règles de Pointage du Personnel (Promoteur & Direction)
  getStaffAttendanceRules: () => request<any>('/staff-attendance/rules'),
  updateStaffAttendanceRules: (payload: any) => request<any>('/staff-attendance/rules', { method: 'PUT', body: JSON.stringify(payload) }),

  // Rémunérations & Paie (Promoteur & Comptable)
  getStaffSalaryParameters: () => request<any[]>('/staff-salary-parameters'),
  updateStaffSalaryParameter: (userId: string, payload: any) =>
    request<any>(`/staff-salary-parameters/${userId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  autoCalculatePayroll: (payload: { period: string; department?: string }) =>
    request<any>('/finance/payroll/auto-calculate', { method: 'POST', body: JSON.stringify(payload) }),

  // Dashboard
  getDashboardStats: () => request<any>('/dashboard/stats'),

  // Maintenance des données & Diagnostics
  pingFirestore: () => request<any>('/firestore/ping'),
  exportSqliteData: async () => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch('/api/admin/export-sqlite', {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Erreur lors de l'exportation (${response.status})`);
    }
    return response.json();
  },
  getMigrationMapping: () => request<any>('/migration/mapping'),
  runMigration: (dryRun: boolean, targetTableName?: string) =>
    request<any>('/migration/run', { method: 'POST', body: JSON.stringify({ dryRun, targetTableName }) }),

  // Activation & Discipline Acknowledgment
  activateAccount: (payload: { code: string; password: string; accountType?: string }) =>
    request<any>('/auth/activate-account', { method: 'POST', body: JSON.stringify(payload) }),
  generateActivationCode: (studentId: string, accountType: 'PARENT' | 'ELEVE') =>
    request<any>(`/students/${studentId}/activation-code`, { method: 'POST', body: JSON.stringify({ accountType }) }),
  acknowledgeDiscipline: (incidentId: string) =>
    request<any>(`/discipline/${incidentId}/acknowledge`, { method: 'POST' }),

  // Référentiel programmes & manuels scolaires (D.E & Enseignants)
  getCurriculumPrograms: (params?: { subjectId?: string; classId?: string; academicYear?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.subjectId) q.set('subjectId', params.subjectId);
    if (params?.classId) q.set('classId', params.classId);
    if (params?.academicYear) q.set('academicYear', params.academicYear);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return request<any[]>(`/curriculum-programs${qs ? `?${qs}` : ''}`);
  },
  deleteCurriculumProgram: (id: string) => request<any>(`/curriculum-programs/${id}`, { method: 'DELETE' }),
  getCurriculumProgramFileUrl: (id: string) => {
    const token = getAuthToken();
    return `${API_BASE}/curriculum-programs/${id}/file${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  getCurriculumProgramDownloadUrl: (id: string) => {
    const token = getAuthToken();
    return `${API_BASE}/curriculum-programs/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  // Suivi des dossiers d'examen (D.E, D.G, Promoteur)
  getExamConfig: (examType: 'BEPC' | 'BAC', academicYear?: string) => {
    const q = new URLSearchParams();
    q.set('examType', examType);
    if (academicYear) q.set('academicYear', academicYear);
    return request<any>(`/exam-dossiers/config?${q.toString()}`);
  },
  updateExamConfig: (payload: { exam_type: 'BEPC' | 'BAC'; academic_year?: string; required_documents: any[]; deadline?: string | null }) =>
    request<any>('/exam-dossiers/config', { method: 'PUT', body: JSON.stringify(payload) }),
  getExamCandidates: (params: {
    examType: 'BEPC' | 'BAC';
    academicYear?: string;
    classId?: string;
    serieCode?: string;
    status?: string;
    retainedOnly?: boolean;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    q.set('examType', params.examType);
    if (params.academicYear) q.set('academicYear', params.academicYear);
    if (params.classId) q.set('classId', params.classId);
    if (params.serieCode) q.set('serieCode', params.serieCode);
    if (params.status) q.set('status', params.status);
    if (params.retainedOnly !== undefined) q.set('retainedOnly', String(params.retainedOnly));
    if (params.search) q.set('search', params.search);
    return request<any>(`/exam-dossiers/candidates?${q.toString()}`);
  },
  toggleCandidateRetained: (candidateId: string, isRetained: boolean) =>
    request<any>('/exam-dossiers/candidates/toggle-retained', { method: 'POST', body: JSON.stringify({ candidateId, isRetained }) }),
  toggleAllCandidatesRetained: (payload: { examType: 'BEPC' | 'BAC'; academicYear?: string; serieCode?: string; isRetained: boolean }) =>
    request<any>('/exam-dossiers/candidates/toggle-all-retained', { method: 'POST', body: JSON.stringify(payload) }),
  checkCandidateDoc: (candidateId: string, payload: { docId: string; isChecked: boolean; note?: string }) =>
    request<any>(`/exam-dossiers/candidates/${candidateId}/check-doc`, { method: 'POST', body: JSON.stringify(payload) }),
  getCandidateLogs: (candidateId: string) =>
    request<{ logs: any[]; notifications: any[] }>(`/exam-dossiers/candidates/${candidateId}/logs`),
  sendExamNotification: (payload: {
    candidateId: string;
    channel: 'WHATSAPP' | 'SMS' | 'IN_APP';
    recipientName: string;
    recipientPhone?: string;
    message: string;
  }) => request<any>('/exam-dossiers/notifications/send', { method: 'POST', body: JSON.stringify(payload) }),
  sendBulkExamNotifications: (payload: {
    candidateIds: string[];
    channel: 'WHATSAPP' | 'SMS' | 'IN_APP';
    customMessageTemplate?: string;
  }) => request<any>('/exam-dossiers/notifications/send-bulk', { method: 'POST', body: JSON.stringify(payload) }),
  getExamStats: (academicYear?: string) => {
    const q = new URLSearchParams();
    if (academicYear) q.set('academicYear', academicYear);
    return request<any>(`/exam-dossiers/stats?${q.toString()}`);
  },
};

/**
 * Upload ou mise à jour d'un programme avec suivi précis de la progression de transfert
 */
export function uploadCurriculumProgram(
  payload: any,
  editId?: string | null,
  onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getAuthToken();
    const url = editId ? `${API_BASE}/curriculum-programs/${editId}` : `${API_BASE}/curriculum-programs`;

    xhr.open(editId ? 'PUT' : 'POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(percent, event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const errorMsg = data.error || `Erreur d'importation (${xhr.status})`;
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Erreur de connexion réseau lors du transfert du fichier.'));
    };

    xhr.send(JSON.stringify(payload));
  });
}

