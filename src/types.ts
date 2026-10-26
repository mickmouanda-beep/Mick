export type UserRole =
  | 'ADMIN_GENERAL'
  | 'PROMOTEUR'
  | 'DIRECTEUR_GENERAL'
  | 'DIRECTEUR_ETUDES'
  | 'GESTIONNAIRE'
  | 'COMPTABLE'
  | 'SURVEILLANT'
  | 'ENSEIGNANT'
  | 'ELEVE'
  | 'PARENT';

export interface UserSchoolOption {
  id: string;
  name: string;
  code: string;
  city: string;
  role: UserRole;
  academic_year: string;
}

export interface RegisterSchoolPayload {
  name: string;
  code: string;
  country?: string;
  department?: string;
  city: string;
  arrondissement?: string;
  address?: string;
  phone?: string;
  email?: string;
  motto?: string;
  academic_year: string;
  active_cycles: string[];
  logo_url?: string;
  authorization_code?: string;
  promoteurFullName: string;
  promoteurUsername: string;
  promoteurEmail?: string;
  promoteurPassword: string;
  promoteurPhone?: string;
  // Compatibilité optionnelle
  directorFullName?: string;
  directorUsername?: string;
  directorEmail?: string;
  directorPassword?: string;
  directorPhone?: string;
}

export type EstablishmentStatus = 'ACTIVE' | 'PENDING_ACTIVATION' | 'SUSPENDED' | 'DELETED';

export interface CreationAuthorization {
  id: string;
  code: string;
  promoter_name: string;
  promoter_email?: string | null;
  promoter_phone?: string | null;
  notes?: string | null;
  status: 'AVAILABLE' | 'USED' | 'EXPIRED' | 'REVOKED';
  created_by_user_id?: string | null;
  created_by_name?: string | null;
  created_at: string;
  expires_at?: string | null;
  used_at?: string | null;
  used_by_user_id?: string | null;
  used_by_username?: string | null;
  created_establishment_id?: string | null;
  created_establishment_name?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revocation_reason?: string | null;
}

export interface DeveloperStats {
  totalEstablishments: number;
  activeEstablishments: number;
  pendingEstablishments: number;
  suspendedEstablishments: number;
  totalCodes: number;
  availableCodes: number;
  usedCodes: number;
  expiredOrRevokedCodes: number;
  totalPromoters: number;
  activeLicenses: number;
  expiredOrExpiringLicenses: number;
  formulaDistribution: {
    excellence: number;
    packMoyen: number;
    start: number;
  };
}

export type CommercialFormulaKey = 'EXCELLENCE' | 'PACK_MOYEN' | 'START';

export interface CommercialFormula {
  id: CommercialFormulaKey;
  name: string;
  subtitle: string;
  max_students: number;
  max_staff: number;
  duration_months: number;
  price_fcfa?: number | null;
  modules_included: string[];
  is_active: boolean;
}

export interface SchoolLicense {
  establishment_id: string;
  establishment_name: string;
  establishment_code: string;
  city: string;
  country: string;
  logo_url?: string | null;
  promoter_name?: string | null;
  subscription_id: string;
  license_ref: string;
  formula: CommercialFormulaKey;
  formula_name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  max_students: number;
  current_students: number;
  student_quota_percent: number;
  max_staff: number;
  current_staff: number;
  staff_quota_percent: number;
  activated_at?: string | null;
  expires_at: string;
  days_remaining: number;
  is_expired: boolean;
  renewal_count: number;
}

export interface User {
  id: string;
  establishment_id: string;
  username: string;
  email: string | null;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  student_id?: string | null;
  created_at?: string;
}

export interface Establishment {
  id: string;
  name: string;
  code: string;
  country: string;
  department: string;
  city: string;
  arrondissement: string;
  address?: string;
  phone?: string;
  email?: string;
  motto?: string;
  academic_year: string;
  currency: string;
  active_cycles: string[];
  logo_url?: string;
  status?: EstablishmentStatus;
  activated_at?: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  suspended_by?: string | null;
  deleted_at?: string | null;
  deletion_reason?: string | null;
  auth_code_used?: string | null;
  promoter_id?: string | null;
  promoter_name?: string | null;
  promoter_email?: string | null;
  promoter_phone?: string | null;
  created_at?: string;
}

export interface SchoolClass {
  id: string;
  establishment_id: string;
  academic_year: string;
  name: string;
  cycle_code: 'PRE_SCOLAIRE' | 'PRIMAIRE' | 'COLLEGE' | 'LYCEE';
  level_code: string;
  serie_code?: string | null;
  room?: string | null;
  capacity: number;
  main_teacher_id?: string | null;
  main_teacher_name?: string | null;
  student_count?: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Subject {
  id: string;
  establishment_id: string;
  code: string;
  name: string;
  cycle_code: string;
  default_coefficient: number;
}

export interface ClassSubject {
  class_subject_id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  cycle_code: string;
  teacher_id: string | null;
  teacher_name: string | null;
  coefficient: number;
  weekly_hours: number;
}

export interface Student {
  id: string;
  establishment_id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  post_name?: string | null;
  gender: 'M' | 'F';
  birth_date: string;
  birth_place?: string | null;
  address?: string | null;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string | null;
  guardian_relation: string;
  class_id?: string | null;
  class_name?: string | null;
  level_code?: string | null;
  cycle_code?: string | null;
  serie_code?: string | null;
  academic_year: string;
  status: 'INSCRIT' | 'REINSCRIT' | 'TRANSFERE' | 'ARCHIVE';
  enrollment_date?: string;
  transfer_reason?: string | null;
  notes?: string | null;
  photo_data?: string | null;
}

export interface Evaluation {
  id: string;
  establishment_id: string;
  class_id: string;
  class_name?: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  academic_year: string;
  term: 'TRIMESTRE_1' | 'TRIMESTRE_2' | 'TRIMESTRE_3';
  eval_type: 'INTERROGATION' | 'DEVOIR' | 'COMPOSITION' | 'EXAMEN';
  title: string;
  date: string;
  max_score: number;
  coefficient: number;
  is_locked: number;
  created_by: string;
  created_by_name?: string;
  graded_students_count?: number;
  total_students_count?: number;
}

export interface GradeEntry {
  student_id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  post_name?: string | null;
  grade_id?: string | null;
  score?: number | null;
  is_absent: number;
  remarks?: string | null;
}

export interface FeeStructure {
  id: string;
  establishment_id: string;
  academic_year: string;
  cycle_code?: string | null;
  level_code?: string | null;
  fee_type: string;
  name: string;
  amount: number;
  due_date?: string | null;
}

export interface Payment {
  id: string;
  establishment_id: string;
  receipt_number: string;
  student_id: string;
  first_name?: string;
  last_name?: string;
  matricule?: string;
  class_name?: string;
  payment_type?: string;
  fee_structure_id?: string | null;
  amount: number;
  payment_method: 'ESPECES' | 'AIRTEL_MONEY' | 'MTN_MOMO' | 'CHEQUE' | 'VIREMENT';
  transaction_reference?: string | null;
  notes?: string | null;
  cashier_id: string;
  cashier_name: string;
  status: 'VALIDE' | 'ANNULE';
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  payer_name?: string | null;
  reprint_count?: number;
  last_reprinted_at?: string | null;
  balance_after?: number | null;
  total_due?: number | null;
  total_paid_to_date?: number | null;
  created_at: string;
}

export interface Expense {
  id: string;
  establishment_id: string;
  expense_number: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  beneficiary: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

export interface DisciplinaryIncident {
  id: string;
  establishment_id: string;
  student_id: string;
  first_name?: string;
  last_name?: string;
  matricule?: string;
  class_name?: string;
  date: string;
  time?: string | null;
  incident_type: string;
  motif?: string | null;
  description: string;
  supporting_doc?: string | null;
  sanction?: string | null;
  recorded_by: string;
  recorded_by_name?: string;
  justification_status?: 'NON_JUSTIFIE' | 'JUSTIFIE' | 'EN_ATTENTE';
  observation?: string | null;
  action_taken?: string | null;
  assigned_to?: string | null;
  status: string; // 'SIGNOLE', 'EN_COURS', 'RESOLU', 'SANCTIONNE', 'CLASSE'
  created_at: string;
}

export interface Complaint {
  id: string;
  establishment_id: string;
  complaint_number: string;
  date: string;
  concerned_person: string;
  category: string;
  description: string;
  supporting_doc?: string | null;
  author_id: string;
  author_name: string;
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
  priority: 'FAIBLE' | 'NORMALE' | 'HAUTE' | 'URGENTE';
  is_confidential: number;
  response?: string | null;
  responded_by?: string | null;
  responded_at?: string | null;
  status: 'RECUE' | 'EN_COURS' | 'TRANSMISE' | 'RESOLUE' | 'CLOTUREE';
  created_at?: string;
}

export interface AuditLog {
  id: string;
  establishment_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  establishment_id: string;
  user_id?: string | null;
  employee_code: string;
  full_name: string;
  job_title: string;
  department: string;
  contract_type: string;
  hire_date?: string | null;
  period: string; // e.g. 2026-10
  base_salary: number;
  bonuses: number;
  overtime_hours: number;
  overtime_amount: number;
  advances: number;
  deductions: number;
  gross_amount: number;
  net_amount: number;
  status: 'BROUILLON' | 'CALCULE' | 'EN_ATTENTE_VALIDATION' | 'VALIDE' | 'PAYE';
  payment_date?: string | null;
  payment_method?: string | null;
  transaction_ref?: string | null;
  validated_by?: string | null;
  validated_by_name?: string | null;
  validated_at?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface LessonLog {
  id: string;
  establishment_id: string;
  teacher_id: string;
  teacher_name?: string;
  class_id: string;
  class_name?: string;
  cycle_code?: string;
  level_code?: string;
  serie_code?: string | null;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  academic_year?: string;
  day_of_week?: string;
  date: string;
  time_slot?: string | null;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  planned_duration_minutes?: number;
  effective_duration_minutes?: number;
  session_number?: number;
  chapter?: string | null;
  sub_chapter?: string | null;
  curriculum_reference?: string | null;
  textbook_reference?: string | null;
  title: string;
  official_curriculum_title?: string | null;
  general_objective?: string | null;
  specific_objectives?: string | null;
  summary_content: string;
  content?: string | null;
  curriculum_chapter?: string | null;
  pedagogical_method?: string | null;
  student_activities?: string | null;
  participation_conduct?: string | null;
  difficulties?: string | null;
  exercises_done?: string | null;
  homework?: string | null;
  homework_due_date?: string | null;
  teacher_observation?: string | null;
  status:
    | 'NON_COMMENCEE'
    | 'EN_COURS'
    | 'VUE_TERMINEE'
    | 'PARTIELLEMENT_VUE'
    | 'A_REVOIR'
    | 'NON_TERMINEE'
    | 'REPORTEE';
  next_lesson?: string | null;
  created_at?: string;
}

export interface LessonObservation {
  id: string;
  establishment_id: string;
  lesson_log_id: string;
  lesson_title?: string;
  teacher_name?: string;
  class_name?: string;
  subject_name?: string;
  inspector_id: string;
  inspector_name?: string;
  date: string;
  observation: string;
  strengths?: string | null;
  weaknesses?: string | null;
  recommendations?: string | null;
  corrective_action?: string | null;
  deadline?: string | null;
  status: 'EN_ATTENTE' | 'EN_COURS' | 'RESOLU' | 'CLOTURE';
  teacher_response?: string | null;
  teacher_response_date?: string | null;
  created_at?: string;
}

export interface AdministrativeDecision {
  id: string;
  establishment_id: string;
  subject: string;
  requester_name: string;
  service: string;
  request_date: string;
  description: string;
  supporting_docs?: string | null;
  decision: 'EN_ATTENTE' | 'APPROUVE' | 'REFUSE' | 'EN_REVISION';
  reason?: string | null;
  assigned_to?: string | null;
  deadline?: string | null;
  status: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  created_by: string;
  created_by_name?: string;
  created_at?: string;
}

export interface TeacherAttendance {
  id: string;
  establishment_id: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_username?: string;
  employee_code?: string;
  subject_id?: string | null;
  subject_name?: string | null;
  class_ids?: string | null;
  class_names?: string | null;
  date: string;
  expected_arrival_time?: string | null;
  actual_arrival_time?: string | null;
  expected_departure_time?: string | null;
  actual_departure_time?: string | null;
  delay_minutes: number;
  early_departure_minutes: number;
  scheduled_hours: number;
  hours_done: number;
  presence_hours?: number;
  taught_hours?: number;
  is_absent: number;
  status: 'PRESENT' | 'ABSENT' | 'RETARD' | 'REMPLACE';
  replacement_teacher_id?: string | null;
  replacement_teacher_name?: string | null;
  is_justified: number;
  justification_reason?: string | null;
  supporting_doc?: string | null;
  observations?: string | null;
  validation_status: 'EN_ATTENTE' | 'CONFIRME' | 'CONTESTE' | 'EN_CORRECTION' | 'VALIDE';
  teacher_comment?: string | null;
  contest_reason?: string | null;
  previous_value?: string | null;
  correction_reason?: string | null;
  recorded_by: string;
  recorded_by_name?: string;
  created_at?: string;
}

export interface AbsenceJustification {
  id: string;
  establishment_id: string;
  student_id: string;
  attendance_id?: string | null;
  date: string;
  reason: string;
  document_url?: string | null;
  submitted_by_id: string;
  submitted_by_name?: string;
  submitted_by_role: string;
  status: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';
  review_note?: string | null;
  reviewed_by_id?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface SchoolAnnouncement {
  id: string;
  establishment_id: string;
  title: string;
  content: string;
  target_audience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS';
  category: 'GENERAL' | 'PEDAGOGIQUE' | 'ADMINISTRATIF' | 'URGENT' | 'EVENEMENT';
  author_id: string;
  author_name: string;
  is_published: number;
  created_at: string;
}

export interface StudentPortalData {
  student: Student & {
    class_name?: string;
    cycle_code?: string;
    level_code?: string;
    serie_code?: string;
    room?: string;
    main_teacher_name?: string;
    main_teacher_phone?: string;
  };
  establishment: Establishment;
  schedules: any[];
  recentGrades: any[];
  termAverages: any[];
  overallAverage: number | null;
  bulletins: any[];
  upcomingEvaluations: any[];
  attendanceStats: {
    totalRecords: number;
    presents: number;
    absences: number;
    unjustifiedAbsences: number;
    justifiedAbsences: number;
    lates: number;
  };
  attendanceHistory: any[];
  disciplinaryIncidents: DisciplinaryIncident[];
  justifications: AbsenceJustification[];
  lessonLogs: LessonLog[];
  homeworks: {
    id: string;
    subject_name: string;
    title: string;
    homework_details: string;
    due_date: string;
    assigned_date: string;
    teacher_name: string;
  }[];
  announcements: SchoolAnnouncement[];
  financialSituation?: {
    totalFeesDue: number;
    totalFeesPaid: number;
    balance: number;
    payments: any[];
  };
}

export interface ParentPortalData {
  children: (Student & {
    class_name?: string;
    cycle_code?: string;
    level_code?: string;
    serie_code?: string;
    main_teacher_name?: string;
  })[];
  selectedChildId: string;
  childPortalData?: StudentPortalData;
}

export interface PedagogicalReference {
  id: string;
  cycle_code: string;
  level_code: string;
  serie_code?: string | null;
  specialty_name: string;
  description?: string | null;
  validation_status: 'CONFIRME' | 'PROVISOIRE' | 'A_VERIFIER';
  source_title: string;
  source_url: string;
  notes?: string | null;
  subjects_json?: string | null;
}

export interface SchoolTariffPlan {
  id: string;
  establishment_id: string;
  academic_year: string;
  cycle_code: string;
  level_code?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  inscription_new_fee: number;
  reinscription_fee: number;
  monthly_tuition: number;
  months_count: number;
  payment_schedule: 'MENSUEL' | 'TRIMESTRIEL';
  trimester_1_fee: number;
  trimester_2_fee: number;
  trimester_3_fee: number;
  annex_fees: number;
  annex_fees_details?: string | null;
  annual_total_new: number;
  annual_total_old: number;
  is_active: number;
  updated_by: string;
  updated_at: string;
}

export interface StaffAttendanceRules {
  id: string;
  establishment_id: string;
  work_start_time: string;
  work_end_time: string;
  tolerance_minutes: number;
  absence_deduction_rate_per_hour: number;
  overtime_hourly_bonus: number;
  checkin_mode_preschool_primary: 'JOURNALIER' | 'PAR_SEANCE';
  checkin_mode_college_lycee: 'JOURNALIER' | 'PAR_SEANCE';
  updated_by: string;
  updated_at: string;
}

export interface StaffSalaryParameter {
  id: string;
  establishment_id: string;
  user_id: string;
  full_name?: string;
  employee_code?: string;
  role?: string;
  wage_type: 'MENSUEL_FIXE' | 'HORAIRE';
  base_salary: number;
  hourly_rate: number;
  transport_allowance: number;
  responsibility_bonus: number;
  seniority_bonus: number;
  overtime_rate: number;
  active: number;
  updated_by: string;
  updated_at: string;
}

export interface CourseSchedule {
  id: string;
  establishment_id?: string;
  class_id: string;
  class_name?: string;
  cycle_code?: string;
  level_code?: string;
  serie_code?: string | null;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_username?: string;
  day_of_week: number; // 1: Lundi, 2: Mardi, 3: Mercredi, 4: Jeudi, 5: Vendredi, 6: Samedi
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  room?: string | null;
  is_published?: number; // 1 = Publié, 0 = Brouillon
  academic_year?: string;
  created_at?: string;
  updated_at?: string;
}

