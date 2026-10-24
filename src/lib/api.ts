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
    throw new Error(data.error || `Erreur serveur (${response.status})`);
  }

  return data as T;
}

export const api = {
  // Statut & Setup
  getStatus: () => request<any>('/status'),
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

  // Établissement
  getSettings: () => request<any>('/establishment/settings'),
  updateSettings: (payload: any) => request<any>('/establishment/settings', { method: 'PUT', body: JSON.stringify(payload) }),
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

  // Enseignants
  getTeachers: () => request<any[]>('/teachers'),
  getMyAssignments: () => request<any[]>('/teachers/my-assignments'),
  getCourseLogs: () => request<any[]>('/teachers/course-logs'),
  logCourseSession: (payload: any) => request<any>('/teachers/course-logs', { method: 'POST', body: JSON.stringify(payload) }),

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

  // Présences & Discipline
  getAttendance: (classId: string, date: string) => request<any[]>(`/attendance?classId=${classId}&date=${date}`),
  saveAttendance: (classId: string, date: string, records: any[]) => request<any>('/attendance', { method: 'POST', body: JSON.stringify({ classId, date, records }) }),
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
  getStudentBalances: () => request<any[]>('/finance/student-balances'),
  getPayments: () => request<any[]>('/finance/payments'),
  createPayment: (payload: any) => request<any>('/finance/payments', { method: 'POST', body: JSON.stringify(payload) }),
  cancelPayment: (paymentId: string, reason: string) => request<any>(`/finance/payments/${paymentId}/cancel`, { method: 'POST', body: JSON.stringify({ cancellationReason: reason }) }),
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
  getLessons: (params: { teacherId?: string; classId?: string; subjectId?: string; date?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.teacherId) query.append('teacherId', params.teacherId);
    if (params.classId) query.append('classId', params.classId);
    if (params.subjectId) query.append('subjectId', params.subjectId);
    if (params.date) query.append('date', params.date);
    if (params.status) query.append('status', params.status);
    return request<any[]>(`/lessons?${query.toString()}`);
  },
  createLesson: (payload: any) => request<any>('/lessons', { method: 'POST', body: JSON.stringify(payload) }),
  updateLesson: (id: string, payload: any) => request<any>(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getLessonObservations: (lessonId: string) => request<any[]>(`/lessons/${lessonId}/observations`),
  createLessonObservation: (lessonId: string, payload: any) => request<any>(`/lessons/${lessonId}/observations`, { method: 'POST', body: JSON.stringify(payload) }),
  replyLessonObservation: (obsId: string, reply: string) => request<any>(`/lessons/observations/${obsId}/reply`, { method: 'POST', body: JSON.stringify({ reply }) }),
  updateObservationStatus: (obsId: string, status: string) => request<any>(`/lessons/observations/${obsId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getLessonProgress: () => request<any[]>('/lessons/progress/summary'),

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
  getStudentPortalData: (studentId?: string) => {
    const q = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
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
};

