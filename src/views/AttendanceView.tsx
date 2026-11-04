import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  Calendar,
  X,
  UserCheck,
  FileText,
  ShieldAlert,
  Users,
  Printer,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  Filter,
  Lock,
  Shield,
  Search,
  Edit3,
  Check,
  Eye,
  TrendingUp,
  Send,
  HelpCircle,
  Download,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { SchoolClass, DisciplinaryIncident, Student, TeacherAttendance, Complaint, Subject, StaffAttendanceRules } from '../types.ts';
import { PrintHeader } from '../components/PrintHeader.tsx';
import { printDocument, downloadAttendancePdf, downloadPdf } from '../utils/printPdfUtils.ts';
import { CustomizableAttendanceSheet } from '../components/documents/CustomizableAttendanceSheet.tsx';

export const AttendanceView: React.FC = () => {
  const { hasRole, user, establishment } = useAuth();
  const canRecord = hasRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ENSEIGNANT']);
  const isSurveillantOrDirection = hasRole(['SURVEILLANT', 'DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']);
  const isDirection = hasRole(['DIRECTEUR_ETUDES', 'DIRECTEUR_GENERAL', 'PROMOTEUR']);

  const [showPrintSheetModal, setShowPrintSheetModal] = useState(false);
  const [mainSpace, setMainSpace] = useState<'students' | 'teachers' | 'complaints' | 'reports' | 'rules'>('students');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<DisciplinaryIncident[]>([]);
  const [activeTab, setActiveTab] = useState<'rollcall' | 'course_rollcall' | 'alerts' | 'discipline' | 'justifications'>(
    user?.role === 'ENSEIGNANT' ? 'course_rollcall' : 'rollcall'
  );
  const [justificationsList, setJustificationsList] = useState<any[]>([]);
  const [justifReviewModal, setJustifReviewModal] = useState<any | null>(null);
  const [justifReviewNote, setJustifReviewNote] = useState('');
  const [justifReviewLoading, setJustifReviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Course Rollcall & Alerts States
  const [courseSchedules, setCourseSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedSessionType, setSelectedSessionType] = useState<'MATIN' | 'FIN_MATINEE' | 'COURS'>('COURS');
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [courseEditReason, setCourseEditReason] = useState('');
  const [courseSaving, setCourseSaving] = useState(false);
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Staff Attendance Rules (Promoteur / Direction)
  const [attendanceRules, setAttendanceRules] = useState<StaffAttendanceRules | null>(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesForm, setRulesForm] = useState({
    workStartTime: '07:30',
    workEndTime: '16:00',
    toleranceMinutes: 15,
    absenceDeductionRatePerHour: 2500,
    overtimeHourlyBonus: 1500,
    checkinModePreschoolPrimary: 'JOURNALIER' as 'JOURNALIER' | 'PAR_SEANCE',
    checkinModeCollegeLycee: 'PAR_SEANCE' as 'JOURNALIER' | 'PAR_SEANCE',
    preschoolPrimaryMorningTime: '07:30',
    preschoolPrimaryNoonTime: '12:00',
  });

  // Teacher Pointage state
  const [teacherAttendances, setTeacherAttendances] = useState<TeacherAttendance[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [teacherPointageDate, setTeacherPointageDate] = useState(new Date().toISOString().split('T')[0]);
  const [isTeacherPointageModalOpen, setIsTeacherPointageModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isTeacherContestModalOpen, setIsTeacherContestModalOpen] = useState(false);
  const [selectedAttendanceForAction, setSelectedAttendanceForAction] = useState<TeacherAttendance | null>(null);

  // Formulaire Pointage Enseignant complet
  const [teacherPointageForm, setTeacherPointageForm] = useState({
    teacherId: '',
    date: new Date().toISOString().split('T')[0],
    subjectId: '',
    classIds: '',
    expectedArrivalTime: '07:45',
    actualArrivalTime: '07:45',
    expectedDepartureTime: '12:00',
    actualDepartureTime: '12:00',
    scheduledHours: 2.0,
    hoursDone: 2.0,
    presenceHours: 2.0,
    taughtHours: 2.0,
    isAbsent: false,
    status: 'PRESENT',
    replacementTeacherId: '',
    isJustified: false,
    justificationReason: '',
    supportingDoc: '',
    observations: '',
  });

  // Formulaire Correction encadrée (non silencieuse)
  const [correctionForm, setCorrectionForm] = useState({
    correctionReason: '',
    hoursDone: 2.0,
    presenceHours: 2.0,
    taughtHours: 2.0,
    status: 'PRESENT',
    delayMinutes: 0,
    isJustified: false,
    justificationReason: '',
  });

  // Formulaire Contestation / Validation par Enseignant
  const [teacherResponseForm, setTeacherResponseForm] = useState({
    validationStatus: 'CONFIRME' as 'CONFIRME' | 'CONTESTE',
    teacherComment: '',
    contestReason: '',
    supportingDoc: '',
  });

  // Complaints / Réclamations state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [complaintForm, setComplaintForm] = useState({
    concernedPerson: '',
    category: 'POINTAGE',
    description: '',
    supportingDoc: '',
    priority: 'NORMALE' as 'FAIBLE' | 'NORMALE' | 'HAUTE' | 'URGENTE',
    isConfidential: false,
    assignedToId: '',
    assignedToName: '',
  });
  const [responseForm, setResponseForm] = useState({
    response: '',
    status: 'EN_COURS' as 'RECUE' | 'EN_COURS' | 'TRANSMISE' | 'RESOLUE' | 'CLOTUREE',
    assignedToId: '',
    assignedToName: '',
  });

  // Incident disciplinaire modal state
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showUpdateIncidentModal, setShowUpdateIncidentModal] = useState(false);
  const [selectedIncidentForUpdate, setSelectedIncidentForUpdate] = useState<DisciplinaryIncident | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [incidentForm, setIncidentForm] = useState({
    studentId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    incidentType: 'INDISCIPLINE',
    motif: '',
    description: '',
    supportingDoc: '',
    sanction: '',
    justificationStatus: 'NON_JUSTIFIE' as 'NON_JUSTIFIE' | 'JUSTIFIE' | 'EN_ATTENTE',
    observation: '',
    actionTaken: '',
    assignedTo: '',
    status: 'SIGNOLE',
  });

  // Attendance Reports State
  const [reportsData, setReportsData] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);



  useEffect(() => {
    api.getClasses().then((cls) => {
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) {
        setSelectedClassId(cls[0].id);
      }
    });

    api.getSubjects().then(setSubjects).catch(() => {});
    api.getStudents().then(setAllStudents).catch(() => {});
    api.getDisciplineIncidents().then(setIncidents).catch(() => {});
    api.getTeachers().then(setTeachersList).catch(() => {});
    loadComplaints();
  }, []);

  const loadAttendance = async () => {
    if (!selectedClassId || !selectedDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAttendance(selectedClassId, selectedDate);
      setAttendanceRecords(
        data.map((item) => ({
          ...item,
          status: item.status || 'PRESENT',
        }))
      );
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement de l'appel.");
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherPointage = async () => {
    try {
      const data = await api.getTeacherAttendances(teacherPointageDate);
      setTeacherAttendances(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadComplaints = async () => {
    try {
      const data = await api.getComplaints();
      setComplaints(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const data = await api.getTeacherAttendanceReports();
      setReportsData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadJustifications = async () => {
    try {
      const data = await api.getAbsenceJustifications();
      setJustificationsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setJustificationsList([]);
    }
  };

  const handleReviewJustification = async (id: string, status: 'APPROUVE' | 'REJETE') => {
    setJustifReviewLoading(true);
    try {
      await api.reviewAbsenceJustification(id, {
        status,
        reviewNote: justifReviewNote,
      });
      setJustifReviewModal(null);
      setJustifReviewNote('');
      await loadJustifications();
      await loadAttendance();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation');
    } finally {
      setJustifReviewLoading(false);
    }
  };

  const loadRules = async () => {
    setRulesLoading(true);
    try {
      const data = await api.getStaffAttendanceRules();
      if (data) {
        setAttendanceRules(data);
        setRulesForm({
          workStartTime: data.work_start_time || '07:30',
          workEndTime: data.work_end_time || '16:00',
          toleranceMinutes: data.tolerance_minutes ?? 15,
          absenceDeductionRatePerHour: data.absence_deduction_rate_per_hour ?? 2500,
          overtimeHourlyBonus: data.overtime_hourly_bonus ?? 1500,
          checkinModePreschoolPrimary: data.checkin_mode_preschool_primary || 'JOURNALIER',
          checkinModeCollegeLycee: data.checkin_mode_college_lycee || 'PAR_SEANCE',
          preschoolPrimaryMorningTime: data.preschool_primary_morning_time || '07:30',
          preschoolPrimaryNoonTime: data.preschool_primary_noon_time || '12:00',
        });
      }
    } catch (err: any) {
      console.error('Erreur chargement règles assiduité:', err);
    } finally {
      setRulesLoading(false);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setRulesLoading(true);
    setError(null);
    try {
      await api.updateStaffAttendanceRules(rulesForm);
      setSuccess('Règles institutionnelles de pointage et barèmes d’absence mis à jour avec succès.');
      loadRules();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour des règles');
    } finally {
      setRulesLoading(false);
    }
  };

  const loadCourseSchedules = async () => {
    try {
      const schs = await api.getSchedules({ classId: selectedClassId });
      setCourseSchedules(schs || []);
      if (schs && schs.length > 0 && !selectedScheduleId) {
        setSelectedScheduleId(schs[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement emplois du temps:', err);
    }
  };

  const loadCourseAttendance = async () => {
    if (!selectedClassId || !selectedDate) return;
    try {
      const [studentsData, caData] = await Promise.all([
        api.getStudents({ classId: selectedClassId }),
        api.getCourseAttendance({
          classId: selectedClassId,
          date: selectedDate,
          scheduleId: selectedScheduleId || undefined,
          sessionType: selectedSessionType || undefined,
        }),
      ]);

      const caMap = new Map((caData || []).map((item: any) => [item.student_id, item]));

      const merged = (studentsData || [])
        .filter((s: any) => s.status !== 'ARCHIVE')
        .map((s: any) => {
          const ca = caMap.get(s.id);
          return {
            student_id: s.id,
            matricule: s.matricule,
            first_name: s.first_name,
            last_name: s.last_name,
            status: ca?.status || 'PRESENT',
            motif_category: ca?.motif_category || '',
            motif: ca?.motif || '',
          };
        });

      merged.sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || ''));
      setCourseStudents(merged);
    } catch (err) {
      console.error('Erreur chargement présence cours:', err);
    }
  };

  const loadAlerts = async () => {
    if (!isSurveillantOrDirection) return;
    setAlertsLoading(true);
    try {
      const res = await api.getAttendanceAlerts(selectedDate);
      setAlertsList(res || []);
    } catch (err) {
      console.error('Erreur chargement alertes:', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    if (mainSpace === 'students') {
      if (activeTab === 'rollcall') {
        loadAttendance();
      } else if (activeTab === 'course_rollcall') {
        loadCourseSchedules();
        loadCourseAttendance();
      } else if (activeTab === 'alerts' && isSurveillantOrDirection) {
        loadAlerts();
      } else if (activeTab === 'justifications') {
        loadJustifications();
      }
    } else if (mainSpace === 'teachers') {
      loadTeacherPointage();
    } else if (mainSpace === 'complaints') {
      loadComplaints();
    } else if (mainSpace === 'reports') {
      loadReports();
    } else if (mainSpace === 'rules') {
      loadRules();
    }
  }, [selectedClassId, selectedDate, selectedScheduleId, selectedSessionType, activeTab, mainSpace, teacherPointageDate]);

  // Rollcall handlers
  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  };

  const handleArrivalTimeChange = (studentId: string, actual_arrival_time: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, actual_arrival_time, actualArrivalTime: actual_arrival_time } : r))
    );
  };

  const handleDepartureTimeChange = (studentId: string, actual_departure_time: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, actual_departure_time, actualDepartureTime: actual_departure_time } : r))
    );
  };

  const handleJustifyChange = (studentId: string, isJustified: boolean, reason?: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.student_id === studentId
          ? {
              ...r,
              is_justified: isJustified ? 1 : 0,
              justification_reason: reason !== undefined ? reason : r.justification_reason,
            }
          : r
      )
    );
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || !selectedDate) return;
    setError(null);
    try {
      const recordsToSave = attendanceRecords.map((r) => ({
        studentId: r.student_id,
        status: r.status || 'PRESENT',
        actualArrivalTime: r.actual_arrival_time || r.actualArrivalTime || null,
        actualDepartureTime: r.actual_departure_time || r.actualDepartureTime || null,
        isJustified: r.is_justified,
        justificationReason: r.justification_reason,
      }));
      await api.saveAttendance(selectedClassId, selectedDate, recordsToSave);
      setSuccess("Feuille d'émargement de la classe enregistrée avec succès.");
      loadAttendance();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de l'appel.");
    }
  };

  const handleCourseStatusChange = (studentId: string, status: string) => {
    setCourseStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleCourseMotifCategoryChange = (studentId: string, category: string) => {
    setCourseStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, motif_category: category } : s))
    );
  };

  const handleCourseMotifTextChange = (studentId: string, motif: string) => {
    setCourseStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, motif } : s))
    );
  };

  const handleDownloadAttendance = async () => {
    if (!selectedClassId || attendanceRecords.length === 0) return;
    setGeneratingPdf(true);
    setPdfError(null);
    try {
      const className = classes.find(c => c.id === selectedClassId)?.name || 'Classe';
      await downloadAttendancePdf(attendanceRecords, establishment, className, selectedDate);
    } catch (err: any) {
      setPdfError(err.message || "Erreur PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSaveCourseAttendance = async () => {
    if (!selectedClassId || !selectedDate) return;
    setError(null);
    setCourseSaving(true);
    try {
      const records = courseStudents.map((s) => ({
        studentId: s.student_id,
        status: s.status || 'PRESENT',
        motifCategory: s.motif_category || null,
        motif: s.motif || null,
      }));

      await api.saveCourseAttendance({
        classId: selectedClassId,
        date: selectedDate,
        scheduleId: selectedScheduleId || undefined,
        sessionType: selectedSessionType || undefined,
        records,
        editReason: courseEditReason || undefined,
      });

      setSuccess("Appel de présence au cours / séance enregistré avec succès dans Firestore.");
      setCourseEditReason('');
      loadCourseAttendance();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de l'appel de cours.");
    } finally {
      setCourseSaving(false);
    }
  };

  // Discipline Incident handlers
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createDisciplineIncident(incidentForm);
      setSuccess('Incident disciplinaire consigné avec toutes les mentions obligatoires.');
      setShowIncidentModal(false);
      setIncidentForm({
        studentId: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        incidentType: 'INDISCIPLINE',
        motif: '',
        description: '',
        supportingDoc: '',
        sanction: '',
        justificationStatus: 'NON_JUSTIFIE',
        observation: '',
        actionTaken: '',
        assignedTo: '',
        status: 'SIGNOLE',
      });
      api.getDisciplineIncidents().then(setIncidents);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement.");
    }
  };

  const handleUpdateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentForUpdate) return;
    setError(null);
    try {
      await api.updateDisciplineIncident(selectedIncidentForUpdate.id, {
        sanction: selectedIncidentForUpdate.sanction,
        actionTaken: selectedIncidentForUpdate.action_taken,
        assignedTo: selectedIncidentForUpdate.assigned_to,
        status: selectedIncidentForUpdate.status,
        justificationStatus: selectedIncidentForUpdate.justification_status,
        observation: selectedIncidentForUpdate.observation,
        motif: selectedIncidentForUpdate.motif,
        supportingDoc: selectedIncidentForUpdate.supporting_doc,
      });
      setSuccess('Dossier disciplinaire et suite donnée mis à jour.');
      setShowUpdateIncidentModal(false);
      setSelectedIncidentForUpdate(null);
      api.getDisciplineIncidents().then(setIncidents);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour.');
    }
  };

  // Pointage Enseignant handlers
  const handleSaveTeacherPointage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveTeacherAttendance(teacherPointageForm);
      setSuccess('Pointage enseignant enregistré avec calcul automatique du retard et des heures.');
      setIsTeacherPointageModalOpen(false);
      loadTeacherPointage();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du pointage.');
    }
  };

  const handleAuditedCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceForAction) return;
    try {
      await api.correctTeacherAttendance(selectedAttendanceForAction.id, correctionForm);
      setSuccess('Correction auditée consignée avec traçabilité intégrale.');
      setIsCorrectionModalOpen(false);
      setSelectedAttendanceForAction(null);
      loadTeacherPointage();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la correction.');
    }
  };

  const handleTeacherResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceForAction) return;
    try {
      await api.teacherPointageResponse(selectedAttendanceForAction.id, teacherResponseForm);
      setSuccess(
        teacherResponseForm.validationStatus === 'CONFIRME'
          ? 'Pointage confirmé avec succès.'
          : 'Contestation / demande de rectification transmise avec succès.'
      );
      setIsTeacherContestModalOpen(false);
      setSelectedAttendanceForAction(null);
      loadTeacherPointage();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la transmission.');
    }
  };

  const handleValidateFinalPointage = async (id: string) => {
    try {
      await api.validateFinalTeacherAttendance(id);
      setSuccess('Pointage officiellement validé pour les registres d’établissement et la paie.');
      loadTeacherPointage();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation.');
    }
  };

  // Complaints handlers
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createComplaint(complaintForm);
      setSuccess('Réclamation enregistrée avec attribution automatique de numéro officiel.');
      setShowComplaintModal(false);
      setComplaintForm({
        concernedPerson: '',
        category: 'POINTAGE',
        description: '',
        supportingDoc: '',
        priority: 'NORMALE',
        isConfidential: false,
        assignedToId: '',
        assignedToName: '',
      });
      loadComplaints();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réclamation.');
    }
  };

  const handleRespondComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      await api.respondComplaint(selectedComplaint.id, responseForm);
      setSuccess('Réponse consignée et statut mis à jour.');
      setShowRespondModal(false);
      setSelectedComplaint(null);
      loadComplaints();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du traitement.');
    }
  };

  const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
  const lateCount = attendanceRecords.filter((r) => r.status === 'RETARD').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Surveillance Générale • Assiduité, Discipline & Pointage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Surveillance Élèves & Pointage Enseignants
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Module de contrôle des présences, registre des sanctions, suivi horaire journalier et gestion des réclamations.
          </p>
        </div>

        {/* Espace sélecteur 4 onglets professionnels */}
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex flex-wrap items-center gap-1">
          <button
            onClick={() => setMainSpace('students')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              mainSpace === 'students'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Élèves & Discipline</span>
          </button>
          <button
            onClick={() => setMainSpace('teachers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              mainSpace === 'teachers'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>2. Pointage Enseignants</span>
          </button>
          <button
            onClick={() => setMainSpace('complaints')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              mainSpace === 'complaints'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>3. Réclamations ({complaints.length})</span>
          </button>
          <button
            onClick={() => setMainSpace('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              mainSpace === 'reports'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>4. Rapports de Présence</span>
          </button>
          <button
            onClick={() => setMainSpace('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              mainSpace === 'rules'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>5. Règles de Pointage</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl flex items-center justify-between text-rose-200 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center justify-between text-emerald-200 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* ESPACE 1 : SURVEILLANCE & APPEL DE PRÉSENCE ÉLÈVES */}
      {/* ======================================================== */}
      {mainSpace === 'students' && (
        <div className="space-y-4">
          <div className="flex border-b border-slate-800 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('rollcall')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'rollcall'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>1. Appel Établissement (Surveillant)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('course_rollcall');
                loadCourseSchedules();
                loadCourseAttendance();
              }}
              className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'course_rollcall'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>2. Appel par Cours / Séance (Enseignant)</span>
            </button>

            {isSurveillantOrDirection && (
              <button
                onClick={() => {
                  setActiveTab('alerts');
                  loadAlerts();
                }}
                className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'alerts'
                    ? 'border-indigo-500 text-indigo-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>3. Alertes & Discordances</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('discipline')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'discipline'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>4. Suivi de la Conduite ({incidents.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('justifications');
                loadJustifications();
              }}
              className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'justifications'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>5. Justifications Déposées</span>
              {(Array.isArray(justificationsList) ? justificationsList : []).filter((j) => j.status === 'EN_ATTENTE').length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full text-[10px]">
                  {(Array.isArray(justificationsList) ? justificationsList : []).filter((j) => j.status === 'EN_ATTENTE').length}
                </span>
              )}
            </button>
          </div>

          {/* 1. APPEL GLOBAL ÉTABLISSEMENT (SURVEILLANT) */}
          {activeTab === 'rollcall' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Classe</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.level_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                  {pdfError && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-rose-950/50 border border-rose-800 rounded-lg text-[10px] text-rose-200">
                      <span>{pdfError}</span>
                      <button onClick={handleDownloadAttendance} className="underline font-bold">Réessayer</button>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-emerald-400 font-bold">{presentCount} Présents</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-rose-400 font-bold">{absentCount} Absents</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400 font-bold">{lateCount} Retards</span>
                  </div>

                  <button
                    type="button"
                    disabled={generatingPdf}
                    onClick={handleDownloadAttendance}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold rounded-lg transition flex items-center space-x-1.5 cursor-pointer text-xs"
                    title="Télécharger la feuille d'émargement en PDF"
                  >
                    {generatingPdf ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>{generatingPdf ? 'Génération...' : 'Exporter PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadAttendance()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-semibold rounded-lg transition flex items-center space-x-1.5 cursor-pointer text-xs"
                    title="Télécharger la liste en PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttendance()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 font-semibold rounded-lg transition flex items-center space-x-1.5 cursor-pointer text-xs"
                    title="Imprimer la liste"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintSheetModal(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg transition flex items-center space-x-1.5 cursor-pointer text-xs"
                    title="Imprimer la feuille d'émargement officielle de la classe"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Feuille d'Appel</span>
                  </button>

                  {canRecord && (
                    <button
                      onClick={handleSaveAttendance}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow-md cursor-pointer"
                    >
                      Enregistrer l'Appel
                    </button>
                  )}
                </div>
              </div>

              {/* Table appel Surveillant avec Heure Arrivée & Heure Départ */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 min-w-[850px]">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Matricule</th>
                      <th className="p-3.5">Élève</th>
                      <th className="p-3.5">Statut de Présence</th>
                      <th className="p-3.5">Heure Arrivée</th>
                      <th className="p-3.5">Heure Départ</th>
                      <th className="p-3.5">Justificatif & Motif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          {loading ? 'Chargement en cours...' : 'Aucun élève inscrit dans cette classe.'}
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.map((r, idx) => (
                        <tr key={r.student_id ? `${r.student_id}-${idx}` : `att-rec-${idx}`} className="hover:bg-slate-800/40">
                          <td className="p-3.5 font-mono text-slate-400">{r.matricule}</td>
                          <td className="p-3.5 font-bold text-white">
                            {r.last_name} {r.first_name}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center space-x-1.5">
                              {['PRESENT', 'ABSENT', 'RETARD'].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={isDirection && user?.role !== 'SURVEILLANT'}
                                  onClick={() => handleStatusChange(r.student_id, st)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                    r.status === st
                                      ? st === 'PRESENT'
                                        ? 'bg-emerald-600 text-white'
                                        : st === 'ABSENT'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-amber-600 text-white'
                                      : 'bg-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {st === 'PRESENT' ? 'Présent' : st === 'ABSENT' ? 'Absent' : 'Retard'}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <input
                              type="time"
                              value={r.actual_arrival_time || r.actualArrivalTime || ''}
                              onChange={(e) => handleArrivalTimeChange(r.student_id, e.target.value)}
                              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-emerald-400 font-mono text-[11px] w-24"
                            />
                          </td>
                          <td className="p-3.5">
                            <input
                              type="time"
                              value={r.actual_departure_time || r.actualDepartureTime || ''}
                              onChange={(e) => handleDepartureTimeChange(r.student_id, e.target.value)}
                              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-400 font-mono text-[11px] w-24"
                            />
                          </td>
                          <td className="p-3.5">
                            {r.status !== 'PRESENT' ? (
                              <div className="flex items-center space-x-2">
                                <label className="flex items-center space-x-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!r.is_justified}
                                    onChange={(e) => handleJustifyChange(r.student_id, e.target.checked)}
                                    className="rounded border-slate-700 text-indigo-600"
                                  />
                                  <span className="text-[10px] text-slate-400">Justifié</span>
                                </label>
                                {r.is_justified && (
                                  <input
                                    type="text"
                                    placeholder="Motif (ex: Certificat médical)..."
                                    value={r.justification_reason || ''}
                                    onChange={(e) => handleJustifyChange(r.student_id, true, e.target.value)}
                                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-[11px] w-48"
                                  />
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. APPEL PAR COURS / SÉANCE (ENSEIGNANT) */}
          {activeTab === 'course_rollcall' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Classe</label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.level_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      />
                    </div>

                    {/* Sélection Préscolaire/Primaire (Séance Matin / Fin de matinée) vs Collège/Lycée (Emploi du Temps) */}
                    {classes.find((c) => c.id === selectedClassId)?.cycle_code === 'PRE_SCOLAIRE' || classes.find((c) => c.id === selectedClassId)?.cycle_code === 'PRIMAIRE' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Séance d'Appel (Préscolaire / Primaire)</label>
                        <select
                          value={selectedSessionType}
                          onChange={(e) => setSelectedSessionType(e.target.value as any)}
                          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-amber-300 font-bold"
                        >
                          <option value="MATIN">Appel du matin ({attendanceRules?.preschool_primary_morning_time || '07:30'})</option>
                          <option value="FIN_MATINEE">Appel de fin de matinée ({attendanceRules?.preschool_primary_noon_time || '12:00'})</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cours de l'Emploi du Temps (Collège / Lycée)</label>
                        <select
                          value={selectedScheduleId}
                          onChange={(e) => setSelectedScheduleId(e.target.value)}
                          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-indigo-300 font-bold max-w-xs"
                        >
                          <option value="">Sélectionner le cours...</option>
                          {courseSchedules.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.subject_name} ({s.start_time} - {s.end_time}) • {s.teacher_name || 'Enseignant'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {canRecord && (
                      <button
                        onClick={handleSaveCourseAttendance}
                        disabled={courseSaving}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow cursor-pointer disabled:opacity-50"
                      >
                        {courseSaving ? 'Enregistrement...' : 'Valider l\'Appel du Cours'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Saisie obligatoire du motif si modification post-appel (date antérieure) */}
                {selectedDate !== new Date().toISOString().split('T')[0] && (
                  <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs space-y-1">
                    <span className="font-bold flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Appel à date antérieure : Motif obligatoire pour traçabilité</span>
                    </span>
                    <input
                      type="text"
                      placeholder="Préciser le motif de la modification rétroactive (ex: Rectification oubli enseignant)..."
                      value={courseEditReason}
                      onChange={(e) => setCourseEditReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-amber-800/80 rounded-lg text-white font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Table appel de cours */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 min-w-[800px]">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Matricule</th>
                      <th className="p-3.5">Élève</th>
                      <th className="p-3.5">Statut au Cours</th>
                      <th className="p-3.5">Catégorie de Motif</th>
                      <th className="p-3.5">Explication / Observation Enseignant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {courseStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          Aucun élève chargé pour ce cours ou cette classe.
                        </td>
                      </tr>
                    ) : (
                      courseStudents.map((s, idx) => (
                        <tr key={s.student_id ? `${s.student_id}-${idx}` : `ca-stu-${idx}`} className="hover:bg-slate-800/40">
                          <td className="p-3.5 font-mono text-slate-400">{s.matricule}</td>
                          <td className="p-3.5 font-bold text-white">
                            {s.last_name} {s.first_name}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center space-x-1.5">
                              {['PRESENT', 'ABSENT', 'RETARD'].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleCourseStatusChange(s.student_id, st)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                    s.status === st
                                      ? st === 'PRESENT'
                                        ? 'bg-emerald-600 text-white'
                                        : st === 'ABSENT'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-amber-600 text-white'
                                      : 'bg-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {st === 'PRESENT' ? 'Présent' : st === 'ABSENT' ? 'Absent' : 'Retard'}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {s.status !== 'PRESENT' ? (
                              <select
                                value={s.motif_category || ''}
                                onChange={(e) => handleCourseMotifCategoryChange(s.student_id, e.target.value)}
                                className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-[11px]"
                              >
                                <option value="">Choisir motif...</option>
                                <option value="SANTE">Problème de santé</option>
                                <option value="DISCIPLINE">Problème de discipline</option>
                                <option value="SORTIE">Autorisation de sortie</option>
                                <option value="AUTRE">Autre raison</option>
                              </select>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {s.status !== 'PRESENT' ? (
                              <input
                                type="text"
                                placeholder="Détail du motif (ex: Problème de santé, maux de tête)..."
                                value={s.motif || ''}
                                onChange={(e) => handleCourseMotifTextChange(s.student_id, e.target.value)}
                                className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-white text-[11px]"
                              />
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. ALERTES & DISCORDANCES D'ASSIDUITÉ */}
          {activeTab === 'alerts' && isSurveillantOrDirection && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Tableau de Contrôle des Discordances d'Assiduité</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Croisement automatique entre la feuille du surveillant (entrée/sortie) et les appels de cours des enseignants.
                  </p>
                </div>
                <button
                  onClick={loadAlerts}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {alertsLoading ? 'Analyse...' : 'Actualiser les Alertes'}
                </button>
              </div>

              {alertsList.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Aucune discordance ou alerte détectée pour la date sélectionnée</h4>
                  <p className="text-xs text-slate-400">Tous les appels de cours concordent avec le registre d'entrée du surveillant.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alertsList.map((alt, idx) => (
                    <div
                      key={alt.id || `alt-${idx}`}
                      className={`p-4 rounded-2xl border space-y-2.5 text-xs shadow-md ${
                        alt.type === 'STUDENT_LEFT'
                          ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                          : alt.type === 'SUSPICIOUS_ABSENCE'
                          ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                          : 'bg-indigo-950/40 border-indigo-800/80 text-indigo-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 font-bold">
                          {alt.type === 'STUDENT_LEFT' ? (
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : alt.type === 'SUSPICIOUS_ABSENCE' ? (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          )}
                          <span>{alt.message}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            alt.type === 'STUDENT_LEFT'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : alt.type === 'SUSPICIOUS_ABSENCE'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          }`}
                        >
                          {alt.type === 'STUDENT_LEFT' ? 'Départ légitime' : alt.type === 'SUSPICIOUS_ABSENCE' ? 'Absence suspecte' : 'Appel manquant'}
                        </span>
                      </div>

                      {alt.student_name && (
                        <div className="font-semibold text-white">
                          {alt.student_name} ({alt.class_name}) • Matr: {alt.matricule}
                        </div>
                      )}

                      <div className="text-[11px] opacity-90">{alt.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'discipline' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-xs text-slate-400">
                  Total : <span className="text-white font-bold">{incidents.length} incidents</span> répertoriés
                </div>
                {canRecord && (
                  <button
                    onClick={() => setShowIncidentModal(true)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Enregistrer un Événement Disciplinaire</span>
                  </button>
                )}
              </div>

              {/* Table détaillée des 12 champs demandés pour la conduite */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 min-w-[950px]">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Date & Heure</th>
                      <th className="p-3.5">Élève & Matricule</th>
                      <th className="p-3.5">Classe</th>
                      <th className="p-3.5">Type d'Événement</th>
                      <th className="p-3.5">Motif & Faits</th>
                      <th className="p-3.5">Justificatif</th>
                      <th className="p-3.5">Suite Donnée / Sanction</th>
                      <th className="p-3.5">Statut</th>
                      <th className="p-3.5">Auteur / Responsable</th>
                      <th className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500">
                          Aucun incident disciplinaire signalé. Les dossiers de conduite sont vierges.
                        </td>
                      </tr>
                    ) : (
                      incidents.map((inc, idx) => (
                        <tr key={inc.id ? `${inc.id}-${idx}` : `att-inc-${idx}`} className="hover:bg-slate-800/40">
                          <td className="p-3.5 font-mono text-slate-300">
                            <div>{inc.date}</div>
                            <div className="text-[10px] text-slate-500">{inc.time || '10:00'}</div>
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {inc.last_name} {inc.first_name}
                            <span className="block font-mono text-[10px] text-amber-400">{inc.matricule}</span>
                          </td>
                          <td className="p-3.5 font-semibold text-indigo-300">{inc.class_name || 'N/A'}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              {inc.incident_type}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-300 max-w-xs">
                            {inc.motif && <div className="font-semibold text-slate-200 mb-0.5">{inc.motif}</div>}
                            <div className="line-clamp-2 text-slate-400">{inc.description}</div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                inc.justification_status === 'JUSTIFIE'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : inc.justification_status === 'EN_ATTENTE'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {inc.justification_status || 'Non justifié'}
                            </span>
                            {inc.supporting_doc && (
                              <span className="block text-[10px] text-indigo-400 truncate max-w-[100px] mt-0.5">
                                {inc.supporting_doc}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {inc.action_taken ? (
                              <div className="font-semibold text-amber-300">{inc.action_taken}</div>
                            ) : inc.sanction ? (
                              <div className="text-amber-300 font-semibold">{inc.sanction}</div>
                            ) : (
                              <span className="text-slate-500 italic">En délibéré</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inc.status === 'RESOLU' || inc.status === 'CLASSE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : inc.status === 'SANCTIONNE'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {inc.status || 'SIGNOLE'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 text-[11px]">
                            <div>Signalé : {inc.recorded_by_name || 'Surveillant'}</div>
                            {inc.assigned_to && <div className="text-slate-500 text-[10px]">Suivi : {inc.assigned_to}</div>}
                          </td>
                          <td className="p-3.5 text-center">
                            {canRecord && (
                              <button
                                onClick={() => {
                                  setSelectedIncidentForUpdate(inc);
                                  setShowUpdateIncidentModal(true);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg hover:text-white transition cursor-pointer"
                                title="Mettre à jour la suite donnée / sanction"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'justifications' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Dossiers de Justification d'Absence Soumis</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Demandes transmises par les élèves et parents. Le surveillant doit statuer (Approuver pour régulariser ou Rejeter).
                  </p>
                </div>
                <button
                  onClick={loadJustifications}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Actualiser
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 min-w-[800px]">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Élève & Classe</th>
                      <th className="p-3.5">Date Absence</th>
                      <th className="p-3.5">Motif Invoqué</th>
                      <th className="p-3.5">Pièce Justificative</th>
                      <th className="p-3.5">Déposé par</th>
                      <th className="p-3.5 text-center">Statut</th>
                      <th className="p-3.5 text-center">Décision Vie Scolaire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(Array.isArray(justificationsList) ? justificationsList : []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          Aucun justificatif d'absence n'a été déposé pour le moment.
                        </td>
                      </tr>
                    ) : (
                      (Array.isArray(justificationsList) ? justificationsList : []).map((j: any, idx: number) => (
                        <tr key={j.id ? `${j.id}-${idx}` : `att-j-${idx}`} className="hover:bg-slate-800/40">
                          <td className="p-3.5 font-bold text-white">
                            {j.first_name} {j.last_name}
                            <span className="block font-mono text-[10px] text-slate-400">
                              Matr: {j.matricule} • {j.class_name || 'Sans classe'}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap">{j.date}</td>
                          <td className="p-3.5 text-slate-200 max-w-xs">{j.reason}</td>
                          <td className="p-3.5 text-slate-400 text-[11px]">{j.document_url || 'Aucune pièce jointe'}</td>
                          <td className="p-3.5 text-slate-400 text-[11px]">
                            {j.submitted_by_name || 'Élève'} ({j.submitted_by_role})
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                j.status === 'APPROUVE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : j.status === 'REJETE'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {j.status === 'APPROUVE' ? 'Régularisée' : j.status === 'REJETE' ? 'Rejetée' : 'En examen'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {canRecord && j.status === 'EN_ATTENTE' ? (
                              <button
                                onClick={() => {
                                  setJustifReviewModal(j);
                                  setJustifReviewNote('');
                                }}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold transition cursor-pointer"
                              >
                                Examiner
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">
                                {j.review_note || 'Traité'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {justifReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Examen de la justification d'absence</h3>
              <button onClick={() => setJustifReviewModal(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div><strong>Élève :</strong> {justifReviewModal.first_name} {justifReviewModal.last_name} ({justifReviewModal.class_name})</div>
              <div><strong>Date d'absence :</strong> {justifReviewModal.date}</div>
              <div><strong>Motif invoqué :</strong> {justifReviewModal.reason}</div>
              {justifReviewModal.document_url && <div><strong>Pièce :</strong> {justifReviewModal.document_url}</div>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Remarque ou motif de la décision
              </label>
              <textarea
                rows={2}
                placeholder="Ex : Certificat médical conforme, absence régularisée."
                value={justifReviewNote}
                onChange={(e) => setJustifReviewNote(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setJustifReviewModal(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={justifReviewLoading}
                onClick={() => handleReviewJustification(justifReviewModal.id, 'REJETE')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Rejeter l'absence
              </button>
              <button
                type="button"
                disabled={justifReviewLoading}
                onClick={() => handleReviewJustification(justifReviewModal.id, 'APPROUVE')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Valider & Régulariser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ESPACE 2 : POINTAGE DU PERSONNEL ENSEIGNANT */}
      {/* ======================================================== */}
      {mainSpace === 'teachers' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <label className="font-semibold text-slate-400">Date d'émargement :</label>
              <input
                type="date"
                value={teacherPointageDate}
                onChange={(e) => setTeacherPointageDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold"
              />
            </div>

            <div className="flex items-center space-x-2 no-print">
              <button
                onClick={() => printDocument('printable-teacher-pointage-register', `Registre_Pointage_Enseignants_${teacherPointageDate}`)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                title="Imprimer le registre du jour"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
              <button
                onClick={() => downloadPdf('printable-teacher-pointage-register', `Registre_Pointage_Enseignants_${teacherPointageDate}.pdf`)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow"
                title="Télécharger le registre du jour en PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger PDF</span>
              </button>

              {user?.role === 'PROMOTEUR' ? (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs">
                  <Shield className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>Séparation des pouvoirs :</strong> Le Promoteur définit les règles institutionnelles (onglet 5) et supervise. Le pointage opérationnel est réservé aux Surveillants.
                  </span>
                </div>
              ) : isSurveillantOrDirection ? (
                <button
                  onClick={() => {
                    setTeacherPointageForm({
                      teacherId: teachersList[0]?.id || '',
                      date: teacherPointageDate,
                      subjectId: subjects[0]?.id || '',
                      classIds: classes[0]?.id || '',
                      expectedArrivalTime: '07:45',
                      actualArrivalTime: '07:45',
                      expectedDepartureTime: '12:00',
                      actualDepartureTime: '12:00',
                      scheduledHours: 2,
                      hoursDone: 2,
                      presenceHours: 2,
                      taughtHours: 2,
                      isAbsent: false,
                      status: 'PRESENT',
                      replacementTeacherId: '',
                      isJustified: false,
                      justificationReason: '',
                      supportingDoc: '',
                      observations: '',
                    });
                    setIsTeacherPointageModalOpen(true);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pointer un Enseignant</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Registre des pointages enseignants avec les 20 champs complets */}
          <div id="printable-teacher-pointage-register" className="printable-document bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto p-4">
            <PrintHeader
              establishment={establishment}
              title="REGISTRE DU POINTAGE DES ENSEIGNANTS"
              subtitle={`Date d'émargement : ${teacherPointageDate} • Édité le ${new Date().toLocaleDateString('fr-FR')}`}
            />
            <table className="w-full text-left text-xs text-slate-300 min-w-[1000px]">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Enseignant & Matricule</th>
                  <th className="p-3.5">Matière & Horaires</th>
                  <th className="p-3.5">Arrivée / Départ</th>
                  <th className="p-3.5 text-center">Retard / Anticipé</th>
                  <th className="p-3.5 text-center">H. Prévues / Disp.</th>
                  <th className="p-3.5">Statut Présence</th>
                  <th className="p-3.5">Statut Validation</th>
                  <th className="p-3.5">Observations & Justif.</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {teacherAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      Aucun émargement enregistré pour le {teacherPointageDate}.
                    </td>
                  </tr>
                ) : (
                  teacherAttendances.map((ta, idx) => {
                    const statusBadge = {
                      PRESENT: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
                      ABSENT: 'bg-rose-950 text-rose-300 border-rose-500/40',
                      RETARD: 'bg-amber-950 text-amber-300 border-amber-500/40',
                      REMPLACE: 'bg-blue-950 text-blue-300 border-blue-500/40',
                    }[ta.status] || 'bg-slate-800 text-slate-300 border-slate-700';

                    const valBadge = {
                      EN_ATTENTE: 'bg-slate-800 text-slate-300 border-slate-700',
                      CONFIRME: 'bg-blue-950 text-blue-300 border-blue-500/40',
                      CONTESTE: 'bg-rose-950 text-rose-300 border-rose-500/40',
                      EN_CORRECTION: 'bg-amber-950 text-amber-300 border-amber-500/40',
                      VALIDE: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
                    }[ta.validation_status] || 'bg-slate-800 text-slate-300';

                    const isMyPointage = user?.id === ta.teacher_id;

                    return (
                      <tr key={ta.id ? `${ta.id}-${idx}` : `ta-${idx}`} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-white">
                          {ta.teacher_name}
                          <span className="block font-mono text-[10px] text-slate-400">
                            Matricule: {ta.employee_code || ta.teacher_username || 'ENS-01'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div className="font-semibold text-indigo-300">{ta.subject_name || 'Cours assigné'}</div>
                          <div className="text-[10px] text-slate-400">
                            {ta.class_ids ? `Classes: ${ta.class_ids}` : 'Toutes classes'}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          <div>Arr: {ta.actual_arrival_time || '07:45'} <span className="text-slate-500 text-[10px]">(prévu: {ta.expected_arrival_time || '07:45'})</span></div>
                          <div>Dép: {ta.actual_departure_time || '12:00'} <span className="text-slate-500 text-[10px]">(prévu: {ta.expected_departure_time || '12:00'})</span></div>
                        </td>
                        <td className="p-3.5 text-center font-mono text-xs">
                          {ta.delay_minutes > 0 ? (
                            <span className="text-amber-400 font-bold block">+{ta.delay_minutes} min retard</span>
                          ) : (
                            <span className="text-slate-500 block">À l'heure</span>
                          )}
                          {ta.early_departure_minutes > 0 && (
                            <span className="text-rose-400 text-[10px] block">-{ta.early_departure_minutes} min départ ant.</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono">
                          <span className="text-slate-400">{ta.scheduled_hours}h prévues</span>
                          <span className="block font-bold text-emerald-400">{ta.hours_done}h dispensées</span>
                          {ta.presence_hours !== undefined && (
                            <span className="block text-[10px] text-slate-500">{ta.presence_hours}h présence</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadge}`}>
                            {ta.status}
                          </span>
                          {ta.replacement_teacher_name && (
                            <div className="text-[10px] text-blue-300 mt-1">
                              Remplacé par: {ta.replacement_teacher_name}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${valBadge}`}>
                            {ta.validation_status}
                          </span>
                          {ta.contest_reason && (
                            <div className="text-[10px] text-rose-300 mt-1 font-semibold truncate max-w-[120px]" title={ta.contest_reason}>
                              Motif: {ta.contest_reason}
                            </div>
                          )}
                          {ta.correction_reason && (
                            <div className="text-[10px] text-amber-300 mt-1 truncate max-w-[120px]" title={ta.correction_reason}>
                              Corrigé: {ta.correction_reason}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-300 max-w-xs">
                          {ta.observations && <div>{ta.observations}</div>}
                          {ta.is_justified ? (
                            <div className="text-emerald-400 text-[10px]">Justifié : {ta.justification_reason || 'Oui'}</div>
                          ) : ta.status === 'ABSENT' ? (
                            <div className="text-rose-400 text-[10px]">Absence Injustifiée</div>
                          ) : null}
                          {ta.teacher_comment && (
                            <div className="text-cyan-300 text-[10px] mt-0.5 italic">
                              Enseignant: "{ta.teacher_comment}"
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Actions Enseignant : Confirmer ou Contester son relevé journalier */}
                            {isMyPointage && ta.validation_status !== 'VALIDE' && (
                              <button
                                onClick={() => {
                                  setSelectedAttendanceForAction(ta);
                                  setTeacherResponseForm({
                                    validationStatus: 'CONFIRME',
                                    teacherComment: ta.teacher_comment || '',
                                    contestReason: ta.contest_reason || '',
                                    supportingDoc: ta.supporting_doc || '',
                                  });
                                  setIsTeacherContestModalOpen(true);
                                }}
                                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                title="Vérifier et confirmer ou contester ce pointage"
                              >
                                Vérifier
                              </button>
                            )}

                            {/* Actions Surveillant / Direction : Corriger avec motif sans modification silencieuse */}
                            {isSurveillantOrDirection && (
                              <button
                                onClick={() => {
                                  setSelectedAttendanceForAction(ta);
                                  setCorrectionForm({
                                    correctionReason: '',
                                    hoursDone: ta.hours_done,
                                    presenceHours: ta.presence_hours || ta.hours_done,
                                    taughtHours: ta.taught_hours || ta.hours_done,
                                    status: ta.status,
                                    delayMinutes: ta.delay_minutes,
                                    isJustified: !!ta.is_justified,
                                    justificationReason: ta.justification_reason || '',
                                  });
                                  setIsCorrectionModalOpen(true);
                                }}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded hover:text-white cursor-pointer"
                                title="Corriger avec traçabilité obligatoire"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Action Direction : Validation Finale */}
                            {isDirection && ta.validation_status !== 'VALIDE' && (
                              <button
                                onClick={() => handleValidateFinalPointage(ta.id)}
                                className="p-1 bg-emerald-900/60 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded cursor-pointer"
                                title="Validation finale direction"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ESPACE 3 : GESTION DES RÉCLAMATIONS */}
      {/* ======================================================== */}
      {mainSpace === 'complaints' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Registre Officiel des Réclamations & Demandes de Rectification</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Formulaire officiel de réclamation avec suivi de statut : reçue, en cours, transmise, résolue ou clôturée.
              </p>
            </div>

            <button
              onClick={() => setShowComplaintModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Déposer une Réclamation</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 min-w-[950px]">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">N° Réclamation</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Personne Concernée</th>
                  <th className="p-3.5">Catégorie & Priorité</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Auteur du Signalement</th>
                  <th className="p-3.5">Réponse / Suite</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      Aucune réclamation enregistrée.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c: any, idx: number) => (
                    <tr key={c.id ? `${c.id}-${idx}` : `complaint-${idx}`} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-indigo-400">{c.complaint_number}</td>
                      <td className="p-3.5 text-slate-400">{c.date}</td>
                      <td className="p-3.5 font-bold text-white">
                        {c.concerned_person}
                        {c.is_confidential ? (
                          <span className="inline-flex items-center space-x-1 ml-1 px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Confidentiel</span>
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">{c.category}</div>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-0.5 ${
                            c.priority === 'URGENTE'
                              ? 'bg-rose-500/20 text-rose-300'
                              : c.priority === 'HAUTE'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300 max-w-xs">
                        <div className="line-clamp-2">{c.description}</div>
                        {c.supporting_doc && (
                          <span className="text-[10px] text-indigo-400 block mt-0.5">Pièce: {c.supporting_doc}</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400">
                        <div>{c.author_name}</div>
                        {c.assigned_to_name && (
                          <div className="text-[10px] text-slate-500">Assigné : {c.assigned_to_name}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-300 max-w-xs">
                        {c.response ? (
                          <div className="text-emerald-300 font-semibold line-clamp-2">{c.response}</div>
                        ) : (
                          <span className="text-slate-500 italic">En attente de traitement</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'RESOLUE' || c.status === 'CLOTUREE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : c.status === 'TRANSMISE'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : c.status === 'EN_COURS'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isSurveillantOrDirection && (
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setResponseForm({
                                response: c.response || '',
                                status: c.status,
                                assignedToId: c.assigned_to_id || '',
                                assignedToName: c.assigned_to_name || '',
                              });
                              setShowRespondModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded font-semibold text-[10px] cursor-pointer"
                          >
                            Traiter
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ESPACE 4 : RAPPORTS DE PRÉSENCE DES ENSEIGNANTS */}
      {/* ======================================================== */}
      {mainSpace === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Rapports Analytiques & Synthèse de Présence des Enseignants</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bilan horaire officiel : retards, heures dispensées vs prévues, absences et contestations.
              </p>
            </div>

            <div className="flex items-center space-x-2 no-print">
              <button
                onClick={() => printDocument('printable-attendance-reports', 'Rapport_Presence_Enseignants')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                title="Imprimer le rapport mensuel"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>
              <button
                onClick={() => downloadPdf('printable-attendance-reports', 'Rapport_Presence_Enseignants.pdf')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                title="Télécharger le rapport mensuel en PDF"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger PDF</span>
              </button>
            </div>
          </div>

          {reportsLoading ? (
            <div className="p-8 text-center text-slate-400">Génération des rapports en cours...</div>
          ) : reportsData ? (
            <div id="printable-attendance-reports" className="printable-document space-y-6 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <PrintHeader
                establishment={establishment}
                title="RAPPORT ANALYTIQUE DE PRÉSENCE DES ENSEIGNANTS"
                subtitle={`Synthèse d'assiduité et bilan horaire • Édité le ${new Date().toLocaleDateString('fr-FR')}`}
              />
              {/* Cartes KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">Heures Prévues</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {reportsData.hoursComparison.scheduled}h
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">Heures Réellement Dispensées</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {reportsData.hoursComparison.taught}h
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">Absences (Justifiées / Injustifiées)</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {reportsData.absencesStats.justified} / {reportsData.absencesStats.unjustified}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">Pointages Contestés / En attente</div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                    {reportsData.contestedPointages.length}
                  </div>
                </div>
              </div>

              {/* Tableau Rapport Mensuel par Enseignant */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <div className="p-4 border-b border-slate-800 font-bold text-white text-xs min-w-[700px]">
                  Synthèse Mensuelle Individuelle des Enseignants
                </div>
                <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Enseignant</th>
                      <th className="p-3.5 text-center">Séances Émargées</th>
                      <th className="p-3.5 text-center">H. Prévues</th>
                      <th className="p-3.5 text-center">H. Dispensées</th>
                      <th className="p-3.5 text-center">Cumul Retards</th>
                      <th className="p-3.5 text-center">Absences</th>
                      <th className="p-3.5 text-center">Contestations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reportsData.monthlyByTeacher.map((t: any, idx: number) => (
                      <tr key={t.teacher_id ? `${t.teacher_id}-${idx}` : `rep-teach-${idx}`} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-white">{t.teacher_name}</td>
                        <td className="p-3.5 text-center font-mono">{t.sessions_count}</td>
                        <td className="p-3.5 text-center font-mono text-slate-400">{t.total_scheduled}h</td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-400">{t.total_taught}h</td>
                        <td className="p-3.5 text-center font-mono">
                          {t.total_delay_minutes > 0 ? (
                            <span className="text-amber-400 font-semibold">{t.total_delay_minutes} min</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono">
                          {t.total_absences > 0 ? (
                            <span className="text-rose-400 font-bold">{t.total_absences}</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono">
                          {t.contested_count > 0 ? (
                            <span className="text-rose-400 font-bold">{t.contested_count}</span>
                          ) : (
                            <span className="text-emerald-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ======================================================== */}
      {/* ESPACE 5 : RÈGLES INSTITUTIONNELLES DE POINTAGE */}
      {/* ======================================================== */}
      {mainSpace === 'rules' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4" />
                <span>Paramétrage Institutionnel • Promoteur & Direction Générale</span>
              </div>
              <h2 className="text-base font-extrabold text-white">
                Règles de Pointage, Tolérances & Barèmes d'Absence du Personnel
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Définition des plages horaires, des seuils de retard, des retenues financières et des modes de pointage selon les cycles congolais.
              </p>
            </div>

            {attendanceRules && (
              <div className="text-[11px] text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                Dernière maj : {attendanceRules.updated_at ? new Date(attendanceRules.updated_at).toLocaleDateString('fr-FR') : 'Initiale'} par <span className="text-amber-300 font-bold">{attendanceRules.updated_by}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleSaveRules} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Horaires et Tolérance */}
                <div className="space-y-4 bg-slate-950/60 border border-slate-800/80 p-5 rounded-xl">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Plage Horaires & Tolérance d'Arrivée</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Heure d'ouverture officielle
                      </label>
                      <input
                        type="time"
                        value={rulesForm.workStartTime}
                        onChange={(e) => setRulesForm({ ...rulesForm, workStartTime: e.target.value })}
                        disabled={user?.role !== 'PROMOTEUR' && user?.role !== 'DIRECTEUR_GENERAL'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono"
                        required
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Début de journée (ex: 07:30)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Heure de fin officielle
                      </label>
                      <input
                        type="time"
                        value={rulesForm.workEndTime}
                        onChange={(e) => setRulesForm({ ...rulesForm, workEndTime: e.target.value })}
                        disabled={user?.role !== 'PROMOTEUR' && user?.role !== 'DIRECTEUR_GENERAL'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono"
                        required
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Clôture des cours (ex: 16:00)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tolérance de retard sans pénalité (minutes)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={rulesForm.toleranceMinutes}
                      onChange={(e) => setRulesForm({ ...rulesForm, toleranceMinutes: parseInt(e.target.value) || 0 })}
                      disabled={user?.role !== 'PROMOTEUR' && user?.role !== 'DIRECTEUR_GENERAL'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Au-delà de cette durée, le retard est comptabilisé et déduit lors du calcul de la paie.
                    </span>
                  </div>
                </div>

                {/* Barèmes financiers (Retenues & Bonifications) */}
                <div className="space-y-4 bg-slate-950/60 border border-slate-800/80 p-5 rounded-xl">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Barèmes Financiers d'Assiduité</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Retenue par heure d'absence injustifiée (FCFA / h)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={rulesForm.absenceDeductionRatePerHour}
                      onChange={(e) => setRulesForm({ ...rulesForm, absenceDeductionRatePerHour: parseFloat(e.target.value) || 0 })}
                      disabled={user?.role !== 'PROMOTEUR' && user?.role !== 'DIRECTEUR_GENERAL'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-amber-300 font-mono font-bold"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Taux appliqué automatiquement lors du calcul de paie sur les heures manquantes non justifiées.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Bonification heure supplémentaire validée (FCFA / h)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={rulesForm.overtimeHourlyBonus}
                      onChange={(e) => setRulesForm({ ...rulesForm, overtimeHourlyBonus: parseFloat(e.target.value) || 0 })}
                      disabled={user?.role !== 'PROMOTEUR' && user?.role !== 'DIRECTEUR_GENERAL'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-emerald-400 font-mono font-bold"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Taux appliqué aux heures effectuées au-delà du volume contractuel prévu.
                    </span>
                  </div>
                </div>
              </div>

              {/* Modes de pointage par cycle */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4 text-cyan-400" />
                  <span>Organisation des Modes de Pointage selon le Cycle Scolaire</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-800 p-4 rounded-xl bg-slate-900/50">
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Cycle Préscolaire & Primaire (P1-P3, CP1-CM2)
                    </label>
                    <select
                      value={rulesForm.checkinModePreschoolPrimary}
                      onChange={(e) => setRulesForm({ ...rulesForm, checkinModePreschoolPrimary: e.target.value as any })}
                      disabled={user?.role !== 'PROMOTEUR' && user?.role !== 'DIRECTEUR_GENERAL'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="JOURNALIER">Pointage Journalier (Matin / Soir par journée complète)</option>
                      <option value="PAR_SEANCE">Pointage Par Séance (Émargement cours par cours)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">
                      Recommandé au Primaire : Émargement à l'arrivée et au départ avec maître titulaire de classe.
                    </span>
                  </div>

                  <div className="border border-slate-800 p-4 rounded-xl bg-slate-900/50">
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Cycle Secondaire (Collège, Lycée Général & Technique)
                    </label>
                    <select
                      value={rulesForm.checkinModeCollegeLycee}
                      onChange={(e) => setRulesForm({ ...rulesForm, checkinModeCollegeLycee: e.target.value as any })}
                      disabled={user?.role !== 'PROMOTEUR' && user?.role !== 'DIRECTEUR_GENERAL'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="PAR_SEANCE">Pointage Par Séance de Cours (Horaires début / fin par créneau)</option>
                      <option value="JOURNALIER">Pointage Journalier Unique</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">
                      Recommandé au Secondaire : Émargement par plage horaire de cours (enseignants par discipline et créneaux).
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton de sauvegarde Promoteur */}
              {(user?.role === 'PROMOTEUR' || user?.role === 'DIRECTEUR_GENERAL') ? (
                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={rulesLoading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50 flex items-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{rulesLoading ? 'Enregistrement en cours...' : 'Enregistrer les Règles de Pointage'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>Consultation en lecture seule : Seul le Promoteur ou la Direction Générale peut modifier les règles de pointage.</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* RAPPEL DE CONFORMITÉ DES RÔLES / LIMITES DU SURVEILLANT */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-400">
        <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-slate-200">
            Limites et Habilitations du Profil Surveillance Générale :
          </p>
          <p>
            Le surveillant ne dispose d'aucun droit de modification sur les notes, les frais scolaires, les encaissements ou les grilles salariales.
            Il assure l'enregistrement transparent du pointage journalier et la discipline. La validation définitive des volumes horaires pour la paie relève de la direction et du service comptable.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1 : POINTAGE ENSEIGNANT AVEC CHAMPS OBLIGATOIRES */}
      {/* ======================================================== */}
      {isTeacherPointageModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <span>Pointage & Émargement Journalier de l'Enseignant</span>
              </h2>
              <button onClick={() => setIsTeacherPointageModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacherPointage} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Enseignant & Matricule *</label>
                <select
                  required
                  value={teacherPointageForm.teacherId}
                  onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Sélectionner l'enseignant...</option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Matière</label>
                  <select
                    value={teacherPointageForm.subjectId}
                    onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Sélectionner la matière...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Classe(s) concernée(s)</label>
                  <input
                    type="text"
                    placeholder="Ex: 3ème A, Terminale D..."
                    value={teacherPointageForm.classIds}
                    onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, classIds: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Date de cours *</label>
                  <input
                    type="date"
                    required
                    value={teacherPointageForm.date}
                    onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Statut de Présence</label>
                  <select
                    value={teacherPointageForm.status}
                    onChange={(e) => {
                      const st = e.target.value;
                      setTeacherPointageForm({
                        ...teacherPointageForm,
                        status: st,
                        isAbsent: st === 'ABSENT',
                        hoursDone: st === 'ABSENT' ? 0 : teacherPointageForm.scheduledHours,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                  >
                    <option value="PRESENT">Présent</option>
                    <option value="RETARD">En retard</option>
                    <option value="ABSENT">Absent</option>
                    <option value="REMPLACE">Remplacé</option>
                  </select>
                </div>
              </div>

              {/* Horaires et Retard automatique */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Heure Arrivée Prévue / Réelle</label>
                  <div className="flex space-x-2">
                    <input
                      type="time"
                      value={teacherPointageForm.expectedArrivalTime}
                      onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, expectedArrivalTime: e.target.value })}
                      className="w-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-300 text-[11px]"
                    />
                    <input
                      type="time"
                      value={teacherPointageForm.actualArrivalTime}
                      onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, actualArrivalTime: e.target.value })}
                      className="w-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-amber-300 font-bold text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Heure Départ Prévue / Réelle</label>
                  <div className="flex space-x-2">
                    <input
                      type="time"
                      value={teacherPointageForm.expectedDepartureTime}
                      onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, expectedDepartureTime: e.target.value })}
                      className="w-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-300 text-[11px]"
                    />
                    <input
                      type="time"
                      value={teacherPointageForm.actualDepartureTime}
                      onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, actualDepartureTime: e.target.value })}
                      className="w-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-300 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Distinction heures prévues / heures de présence / cours dispensés */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Heures Prévues</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={teacherPointageForm.scheduledHours}
                    onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, scheduledHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">H. Présence</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={teacherPointageForm.presenceHours}
                    onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, presenceHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold text-emerald-400">Cours Dispensés</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={teacherPointageForm.taughtHours}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTeacherPointageForm({ ...teacherPointageForm, taughtHours: val, hoursDone: val });
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>

              {teacherPointageForm.status === 'REMPLACE' && (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Enseignant Remplaçant</label>
                  <select
                    value={teacherPointageForm.replacementTeacherId}
                    onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, replacementTeacherId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Sélectionner le remplaçant...</option>
                    {teachersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {teacherPointageForm.status === 'ABSENT' && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teacherPointageForm.isJustified}
                      onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, isJustified: e.target.checked })}
                      className="rounded border-slate-700 text-indigo-600"
                    />
                    <span className="text-slate-300 font-semibold">Absence Justifiée</span>
                  </label>
                  {teacherPointageForm.isJustified && (
                    <input
                      type="text"
                      placeholder="Motif de justification (permission, maladie...)"
                      value={teacherPointageForm.justificationReason}
                      onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, justificationReason: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                    />
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Observations du Surveillant</label>
                <textarea
                  rows={2}
                  placeholder="Remarques éventuelles sur la tenue de séance, retard, etc."
                  value={teacherPointageForm.observations}
                  onChange={(e) => setTeacherPointageForm({ ...teacherPointageForm, observations: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTeacherPointageModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md cursor-pointer"
                >
                  Enregistrer l'Émargement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2 : CORRECTION AUDITÉE (NON-SILENCIEUSE) */}
      {/* ======================================================== */}
      {isCorrectionModalOpen && selectedAttendanceForAction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Correction Auditée de Pointage</span>
              </h2>
              <button onClick={() => setIsCorrectionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-amber-200/90 mt-2 p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-lg">
              Règle obligatoire : Les pointages ne peuvent pas être modifiés silencieusement.
              La valeur initiale sera conservée dans l'historique d'audit avec votre motif de rectification.
            </p>

            <form onSubmit={handleAuditedCorrection} className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold text-amber-400">
                  Motif de la rectification (Obligatoire) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explication claire du motif de la modification..."
                  value={correctionForm.correctionReason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, correctionReason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Heures Effectuées</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={correctionForm.hoursDone}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, hoursDone: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Statut Présence</label>
                  <select
                    value={correctionForm.status}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="PRESENT">Présent</option>
                    <option value="RETARD">Retard</option>
                    <option value="ABSENT">Absent</option>
                    <option value="REMPLACE">Remplacé</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Valider la Rectification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3 : VALIDATION / CONTESTATION ENSEIGNANT */}
      {/* ======================================================== */}
      {isTeacherContestModalOpen && selectedAttendanceForAction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <span>Relevé Journalier de l'Enseignant</span>
              </h2>
              <button onClick={() => setIsTeacherContestModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 my-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Date :</span>
                <span className="text-white font-mono font-bold">{selectedAttendanceForAction.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Heures dispensées pointées :</span>
                <span className="text-emerald-400 font-mono font-bold">{selectedAttendanceForAction.hours_done}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Statut constaté :</span>
                <span className="text-white font-bold">{selectedAttendanceForAction.status}</span>
              </div>
            </div>

            <form onSubmit={handleTeacherResponse} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Votre décision</label>
                <div className="flex space-x-3">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      checked={teacherResponseForm.validationStatus === 'CONFIRME'}
                      onChange={() => setTeacherResponseForm({ ...teacherResponseForm, validationStatus: 'CONFIRME' })}
                      className="text-cyan-600"
                    />
                    <span className="text-emerald-400 font-bold">Confirmer les informations</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      checked={teacherResponseForm.validationStatus === 'CONTESTE'}
                      onChange={() => setTeacherResponseForm({ ...teacherResponseForm, validationStatus: 'CONTESTE' })}
                      className="text-rose-600"
                    />
                    <span className="text-rose-400 font-bold">Contester / Signaler une erreur</span>
                  </label>
                </div>
              </div>

              {teacherResponseForm.validationStatus === 'CONTESTE' && (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold text-rose-300">
                    Motif de la contestation / Rectification demandée *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Préciser l'erreur constatée sur les heures ou l'horaire..."
                    value={teacherResponseForm.contestReason}
                    onChange={(e) => setTeacherResponseForm({ ...teacherResponseForm, contestReason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1">Commentaire ou justificatif facultatif</label>
                <input
                  type="text"
                  placeholder="Observation de l'enseignant..."
                  value={teacherResponseForm.teacherComment}
                  onChange={(e) => setTeacherResponseForm({ ...teacherResponseForm, teacherComment: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTeacherContestModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Transmettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4 : FORMULAIRE OFFICIEL DE RÉCLAMATION */}
      {/* ======================================================== */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <span>Formulaire Officiel de Réclamation</span>
              </h2>
              <button onClick={() => setShowComplaintModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-3.5 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Personne Concernée *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nom ou élève/enseignant concerné..."
                    value={complaintForm.concernedPerson}
                    onChange={(e) => setComplaintForm({ ...complaintForm, concernedPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Catégorie *</label>
                  <select
                    value={complaintForm.category}
                    onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="POINTAGE">Pointage des heures</option>
                    <option value="DISCIPLINE">Discipline / Comportement</option>
                    <option value="PEDAGOGIQUE">Pédagogique</option>
                    <option value="ADMINISTRATIF">Administratif</option>
                    <option value="FINANCIER">Frais / Caisse</option>
                    <option value="HARCELEMENT">Harcèlement / Conflit</option>
                    <option value="AUTRE">Autre réclamation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Priorité</label>
                  <select
                    value={complaintForm.priority}
                    onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="FAIBLE">Faible</option>
                    <option value="NORMALE">Normale</option>
                    <option value="HAUTE">Haute</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Pièce justificative (facultative)</label>
                  <input
                    type="text"
                    placeholder="Référence document ou justificatif..."
                    value={complaintForm.supportingDoc}
                    onChange={(e) => setComplaintForm({ ...complaintForm, supportingDoc: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Description détaillée des faits *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explication précise de la réclamation..."
                  value={complaintForm.description}
                  onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="confidential-cb"
                  checked={complaintForm.isConfidential}
                  onChange={(e) => setComplaintForm({ ...complaintForm, isConfidential: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600"
                />
                <label htmlFor="confidential-cb" className="text-slate-300 cursor-pointer">
                  <span className="font-bold text-white">Réclamation confidentielle</span>
                  <span className="block text-[11px] text-slate-500">
                    Accessible uniquement aux personnes habilitées (Direction, Surveillance, Auteur).
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Enregistrer la Réclamation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5 : TRAITER RÉCLAMATION */}
      {/* ======================================================== */}
      {showRespondModal && selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <span>Traitement de la Réclamation {selectedComplaint.complaint_number}</span>
              </h2>
              <button onClick={() => setShowRespondModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRespondComplaint} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Statut du traitement *</label>
                <select
                  value={responseForm.status}
                  onChange={(e) => setResponseForm({ ...responseForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                >
                  <option value="RECUE">Reçue</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="TRANSMISE">Transmise</option>
                  <option value="RESOLUE">Résolue</option>
                  <option value="CLOTUREE">Clôturée</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Réponse apportée / Décision *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Réponse officielle apportée à cette réclamation..."
                  value={responseForm.response}
                  onChange={(e) => setResponseForm({ ...responseForm, response: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRespondModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Enregistrer la Réponse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6 : SIGNALER ÉVÉNEMENT DISCIPLINAIRE COMPLET */}
      {/* ======================================================== */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Rapport d'Événement Disciplinaire Complet</span>
              </h2>
              <button onClick={() => setShowIncidentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Élève concerné *</label>
                <select
                  required
                  value={incidentForm.studentId}
                  onChange={(e) => setIncidentForm({ ...incidentForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Sélectionner l'élève...</option>
                  {allStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.last_name} {s.first_name} ({s.matricule}) - {s.class_name || 'Sans classe'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Date de survenance *</label>
                  <input
                    type="date"
                    required
                    value={incidentForm.date}
                    onChange={(e) => setIncidentForm({ ...incidentForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Heure</label>
                  <input
                    type="time"
                    value={incidentForm.time}
                    onChange={(e) => setIncidentForm({ ...incidentForm, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Type d'Événement *</label>
                  <select
                    value={incidentForm.incidentType}
                    onChange={(e) => setIncidentForm({ ...incidentForm, incidentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="INDISCIPLINE">Indiscipline en classe</option>
                    <option value="RETARD_REPETE">Retard répété</option>
                    <option value="ABSENCE_INJUSTIFIEE">Absence injustifiée répétée</option>
                    <option value="BAGARRE">Bagarre / Voies de fait</option>
                    <option value="DEGRADATION">Dégradation matérielle</option>
                    <option value="FRAUDE">Fraude / Tricherie</option>
                    <option value="INSOLENCE">Insolence envers personnel</option>
                    <option value="AUTRE">Autre incident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Motif / Intitulé court *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bagarre dans la cour, refus d'obtempérer..."
                    value={incidentForm.motif}
                    onChange={(e) => setIncidentForm({ ...incidentForm, motif: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Description détaillée des faits *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Rapport précis de l'incident survenu..."
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Pièce justificative (facultative)</label>
                  <input
                    type="text"
                    placeholder="Référence rapport écrit, certificat..."
                    value={incidentForm.supportingDoc}
                    onChange={(e) => setIncidentForm({ ...incidentForm, supportingDoc: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Statut de Justification</label>
                  <select
                    value={incidentForm.justificationStatus}
                    onChange={(e) => setIncidentForm({ ...incidentForm, justificationStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="NON_JUSTIFIE">Non justifié</option>
                    <option value="JUSTIFIE">Justifié</option>
                    <option value="EN_ATTENTE">En attente de justificatif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Suite donnée / Mesure prise</label>
                  <input
                    type="text"
                    placeholder="Ex: Avertissement, convocation parents, retenue..."
                    value={incidentForm.actionTaken}
                    onChange={(e) => setIncidentForm({ ...incidentForm, actionTaken: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Statut de Traitement</label>
                  <select
                    value={incidentForm.status}
                    onChange={(e) => setIncidentForm({ ...incidentForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                  >
                    <option value="SIGNOLE">Signalé</option>
                    <option value="EN_COURS">En cours de traitement</option>
                    <option value="SANCTIONNE">Sanctionné</option>
                    <option value="RESOLU">Résolu</option>
                    <option value="CLASSE">Classé sans suite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Observations du surveillant</label>
                <input
                  type="text"
                  placeholder="Observations complémentaires..."
                  value={incidentForm.observation}
                  onChange={(e) => setIncidentForm({ ...incidentForm, observation: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Enregistrer l'Événement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 7 : METTRE À JOUR SUITE DONNÉE DISCIPLINE */}
      {/* ======================================================== */}
      {showUpdateIncidentModal && selectedIncidentForUpdate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Mise à jour du Dossier Disciplinaire</span>
              </h2>
              <button onClick={() => setShowUpdateIncidentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateIncident} className="space-y-3 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Suite donnée / Mesure prise *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Blâme écrit notifié aux parents, corvée..."
                  value={selectedIncidentForUpdate.action_taken || ''}
                  onChange={(e) =>
                    setSelectedIncidentForUpdate({ ...selectedIncidentForUpdate, action_taken: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Statut de Traitement</label>
                <select
                  value={selectedIncidentForUpdate.status || 'SIGNOLE'}
                  onChange={(e) =>
                    setSelectedIncidentForUpdate({ ...selectedIncidentForUpdate, status: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                >
                  <option value="SIGNOLE">Signalé</option>
                  <option value="EN_COURS">En cours de traitement</option>
                  <option value="SANCTIONNE">Sanctionné</option>
                  <option value="RESOLU">Résolu</option>
                  <option value="CLASSE">Classé sans suite</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Statut de justification</label>
                <select
                  value={selectedIncidentForUpdate.justification_status || 'NON_JUSTIFIE'}
                  onChange={(e) =>
                    setSelectedIncidentForUpdate({
                      ...selectedIncidentForUpdate,
                      justification_status: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="NON_JUSTIFIE">Non justifié</option>
                  <option value="JUSTIFIE">Justifié</option>
                  <option value="EN_ATTENTE">En attente de justificatif</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Observations du suivi</label>
                <input
                  type="text"
                  placeholder="Observations..."
                  value={selectedIncidentForUpdate.observation || ''}
                  onChange={(e) =>
                    setSelectedIncidentForUpdate({ ...selectedIncidentForUpdate, observation: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUpdateIncidentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FEUILLE D'ÉMARGEMENT / D'APPEL OFFICIELLE PERSONNALISÉE */}
      {showPrintSheetModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl my-8 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 no-print">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Feuille d'Émargement Officielle ({classes.find(c => c.id === selectedClassId)?.name || 'Classe'})</span>
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadPdf(
                      'printable-attendance-sheet',
                      `Feuille_Appel_${classes.find(c => c.id === selectedClassId)?.name || 'classe'}_${selectedDate}.pdf`
                    )
                  }
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printDocument(
                      'printable-attendance-sheet',
                      `Feuille_Appel_${classes.find(c => c.id === selectedClassId)?.name || 'classe'}_${selectedDate}`
                    )
                  }
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer Feuille d'Appel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintSheetModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="printable-attendance-sheet" className="printable-document bg-white rounded-xl overflow-y-auto flex-1 my-4 border border-slate-200 shadow-md">
              <CustomizableAttendanceSheet
                classNameTitle={classes.find(c => c.id === selectedClassId)?.name || 'Classe'}
                dateStr={new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                sessionTitle="Appel Général de l'Établissement"
                rows={attendanceRecords.map(r => ({
                  student_id: r.student_id,
                  matricule: r.matricule,
                  name: `${r.last_name || ''} ${r.first_name || ''}`,
                  status: r.status,
                  arrival_time: r.arrival_time,
                  departure_time: r.departure_time,
                  motif: r.motif,
                }))}
                establishment={establishment}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
