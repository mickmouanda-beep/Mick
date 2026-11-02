import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Send,
  Eye,
  FileCheck,
  ChevronRight,
  User,
  GraduationCap,
  Layers,
  Sparkles,
  TrendingUp,
  X,
  Printer,
  Download,
  Copy,
  Upload,
  FileText,
  Stamp,
  Lock,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { LessonLog, LessonObservation, SchoolClass, Subject, CourseSchedule, Curriculum } from '../types.ts';
import { printDocument, downloadPdf } from '../utils/printPdfUtils.ts';
import { PrintHeader } from '../components/PrintHeader.tsx';

export const LessonsView: React.FC = () => {
  const { user, establishment } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'notebook' | 'forecasts' | 'curriculum' | 'progression'>('notebook');
  const [lessons, setLessons] = useState<any[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterTeacher, setFilterTeacher] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterIncompleteOnly, setFilterIncompleteOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLessonForView, setSelectedLessonForView] = useState<any | null>(null);
  const [observationsList, setObservationsList] = useState<LessonObservation[]>([]);
  const [isObsModalOpen, setIsObsModalOpen] = useState(false);
  const [selectedLessonForObs, setSelectedLessonForObs] = useState<any | null>(null);

  // Forecast state
  const [currentWeekCode, setCurrentWeekCode] = useState<string>('2026-W44');
  const [previousWeekCode, setPreviousWeekCode] = useState<string>('2026-W43');
  const [forecastForm, setForecastForm] = useState({
    classId: '',
    subjectId: '',
    dayOfWeek: 'Lundi',
    plannedContent: '',
    objectives: '',
  });

  // Curriculum import state
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [curriculumCsvText, setCurriculumCsvText] = useState('');
  const [aiDocBase64, setAiDocBase64] = useState<string | null>(null);
  const [aiMimeType, setAiMimeType] = useState<string>('image/jpeg');
  const [aiExtractedPreview, setAiExtractedPreview] = useState<any | null>(null);

  // Export period filter for printing
  const [exportPeriodClass, setExportPeriodClass] = useState<string>('ALL');
  const [exportPeriodType, setExportPeriodType] = useState<'SEMAINE' | 'MOIS' | 'TRIMESTRE'>('MOIS');

  // Response form & Feedback
  const [replyText, setReplyText] = useState('');
  const [visaComment, setVisaComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: user?.role === 'ENSEIGNANT' ? user.id : '',
    academicYear: '2026-2027',
    date: new Date().toISOString().split('T')[0],
    dayOfWeek: 'Lundi',
    startTime: '08:00',
    endTime: '10:00',
    timeSlot: '08:00 - 10:00',
    durationMinutes: 120,
    title: '',
    chapter: '',
    generalObjective: '',
    specificObjectives: '',
    summaryContent: '',
    exemple: '',
    statut: 'Fait',
    motif: '',
    homework: '',
    homeworkDueDate: '',
    evaluationPrevue: '',
    teacherObservation: '',
    // Level adaptation
    competenceVisee: '',
    objectifsPrescolaire: ['', '', ''],
    activiteRealisee: '',
    materielUtilise: '',
    editReason: '',
  });

  // Observation Form State (for DE / DG)
  const [obsFormData, setObsFormData] = useState({
    observation: '',
    strengths: '',
    weaknesses: '',
    recommendations: '',
    correctiveAction: '',
    deadline: '',
  });

  const isDE = user?.role === 'DIRECTEUR_ETUDES' || user?.role === 'DIRECTEUR_GENERAL' || user?.role === 'PROMOTEUR';
  const isTeacher = user?.role === 'ENSEIGNANT';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cls, subs, tch, prog, scheds, currs] = await Promise.all([
        api.getClasses().catch(() => []),
        api.getSubjects().catch(() => []),
        api.getTeachers().catch(() => []),
        api.getLessonProgress().catch(() => []),
        api.getSchedules().catch(() => []),
        api.getCurriculum().catch(() => []),
      ]);
      setClasses(cls);
      setSubjects(subs);
      setTeachers(tch);
      setProgressSummary(prog);
      setSchedules(scheds);
      setCurricula(currs);

      await fetchLessons();
      await fetchForecasts();
    } catch (err: any) {
      console.error('Erreur chargement données cahier de texte:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const data = await api.getLessons({
        classId: filterClass !== 'ALL' ? filterClass : undefined,
        subjectId: filterSubject !== 'ALL' ? filterSubject : undefined,
        teacherId: filterTeacher !== 'ALL' ? filterTeacher : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        date: filterDate || undefined,
        incomplete: filterIncompleteOnly || undefined,
      });
      setLessons(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchForecasts = async () => {
    try {
      const data = await api.getForecasts(currentWeekCode);
      setForecasts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [filterClass, filterSubject, filterTeacher, filterStatus, filterDate, filterIncompleteOnly]);

  useEffect(() => {
    fetchForecasts();
  }, [currentWeekCode]);

  // Selected class object to know the cycle/level
  const selectedClass = classes.find((c) => c.id === formData.classId);
  const isPreschool = selectedClass?.cycle_code === 'PRE_SCOLAIRE';
  const isCollegeOrLycee = selectedClass?.cycle_code === 'COLLEGE' || selectedClass?.cycle_code === 'LYCEE';

  // Find matching curriculum for selected class and subject
  const availableCurriculum = curricula.find(
    (c) => (c.class_id === formData.classId || c.level_code === selectedClass?.level_code) && c.subject_id === formData.subjectId
  );

  // Slot pre-fill handler
  const handleScheduleSelect = (scheduleId: string) => {
    const sched = schedules.find((s) => s.id === scheduleId);
    if (sched) {
      setFormData((prev) => ({
        ...prev,
        classId: sched.class_id,
        subjectId: sched.subject_id,
        startTime: sched.start_time,
        endTime: sched.end_time,
        timeSlot: `${sched.start_time} - ${sched.end_time}`,
      }));
    }
  };

  // Chapter select handler from Curriculum
  const handleChapterSelect = (chapterTitle: string) => {
    if (!availableCurriculum) return;
    const chap = availableCurriculum.chapters.find((ch) => ch.title === chapterTitle);
    if (chap) {
      setFormData((prev) => ({
        ...prev,
        chapter: chap.title,
        title: chap.title,
        generalObjective: chap.general_objective || '',
        specificObjectives: Array.isArray(chap.specific_objectives) ? chap.specific_objectives.join(', ') : '',
      }));
    }
  };

  const handleOpenLessonDetail = async (lesson: any) => {
    setSelectedLessonForView(lesson);
    try {
      const obs = await api.getLessonObservations(lesson.id);
      setObservationsList(obs);
    } catch {
      setObservationsList([]);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);

    // Frontend validation: motif mandatory if not Fait
    if (formData.statut !== 'Fait' && !formData.motif.trim()) {
      setErrorMsg('Le motif est obligatoire lorsque la séance n’est pas marquée comme "Fait".');
      setActionLoading(false);
      return;
    }

    try {
      const res = await api.createLesson(formData);
      setSuccessMsg(res.message || 'Séance enregistrée dans le cahier de texte officiel.');
      setIsLogModalOpen(false);
      fetchLessons();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVisaLesson = async (lessonId: string) => {
    setActionLoading(true);
    try {
      await api.visaLesson(lessonId, { comments: visaComment, approveEditLock: true });
      setSuccessMsg('Visa officiel et déverrouillage accordés.');
      setVisaComment('');
      fetchLessons();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForObs) return;
    setActionLoading(true);
    try {
      await api.createLessonObservation(selectedLessonForObs.id, obsFormData);
      setSuccessMsg('Observation officielle notifiée à l’enseignant.');
      setIsObsModalOpen(false);
      if (selectedLessonForView?.id === selectedLessonForObs.id) {
        handleOpenLessonDetail(selectedLessonForObs);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplyObservation = async (obsId: string) => {
    if (!replyText.trim()) return;
    try {
      await api.replyLessonObservation(obsId, replyText);
      setSuccessMsg('Réponse transmise à la direction des études.');
      setReplyText('');
      if (selectedLessonForView) {
        const obs = await api.getLessonObservations(selectedLessonForView.id);
        setObservationsList(obs);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.saveForecast({
        weekCode: currentWeekCode,
        ...forecastForm,
      });
      setSuccessMsg('Prévision enregistrée avec succès.');
      setForecastForm({ classId: '', subjectId: '', dayOfWeek: 'Lundi', plannedContent: '', objectives: '' });
      fetchForecasts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyPreviousForecasts = async () => {
    setActionLoading(true);
    try {
      const res = await api.copyPreviousForecasts(currentWeekCode, previousWeekCode);
      setSuccessMsg(res.message);
      fetchForecasts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportCurriculumCsv = async () => {
    if (!curriculumCsvText.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.importCurriculumCsv(curriculumCsvText);
      setSuccessMsg(res.message);
      setCurriculumCsvText('');
      setIsCurriculumModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUploadForAi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setAiDocBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAiAnalysis = async () => {
    if (!aiDocBase64) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.importCurriculumAi({
        fileBase64: aiDocBase64,
        mimeType: aiMimeType,
      });
      setAiExtractedPreview(res.extractedData);
      setSuccessMsg('Analyse IA terminée ! Vérifiez l’aperçu du programme.');
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur d'analyse IA.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAiExtractedCurriculum = async () => {
    if (!aiExtractedPreview) return;
    setActionLoading(true);
    try {
      // Build CSV from extracted
      let csv = `CycleCode;LevelCode;ClassId;SubjectId;SubjectName;ChapterNumber;ChapterTitle;GeneralObjective;SpecificObjectives;HourlyVolume;TextbookTitle;TextbookAuthor;TextbookPublisher;TextbookPage\n`;
      const chaps = aiExtractedPreview.chapters || [];
      chaps.forEach((ch: any, idx: number) => {
        const spec = Array.isArray(ch.specific_objectives) ? ch.specific_objectives.join(', ') : '';
        csv += `COLLEGE;${aiExtractedPreview.levelCode || '3EME'};3E-A;MATH-01;${aiExtractedPreview.subjectName || 'Maths'};${ch.chapter_number || idx + 1};${ch.title};${ch.general_objective || ''};${spec};${ch.hourly_volume || 10};;;;\n`;
      });

      const res = await api.importCurriculumCsv(csv);
      setSuccessMsg(res.message);
      setAiExtractedPreview(null);
      setAiDocBase64(null);
      setIsCurriculumModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    Fait: { label: 'Fait', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' },
    VUE_TERMINEE: { label: 'Fait', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' },
    'Partiellement fait': { label: 'Partiellement fait', color: 'bg-blue-950/60 text-blue-300 border-blue-500/40' },
    PARTIELLEMENT_VUE: { label: 'Partiellement fait', color: 'bg-blue-950/60 text-blue-300 border-blue-500/40' },
    'Non fait': { label: 'Non fait', color: 'bg-rose-950/60 text-rose-300 border-rose-500/40' },
    NON_FAIT: { label: 'Non fait', color: 'bg-rose-950/60 text-rose-300 border-rose-500/40' },
    REPORTEE: { label: 'Reportée', color: 'bg-purple-950/60 text-purple-300 border-purple-500/40' },
  };

  const filteredLessons = lessons.filter((l) => {
    if (filterIncompleteOnly && !l.incomplete) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.titre && l.titre.toLowerCase().includes(term)) ||
      (l.title && l.title.toLowerCase().includes(term)) ||
      (l.teacher_name && l.teacher_name.toLowerCase().includes(term)) ||
      (l.chapitre && l.chapitre.toLowerCase().includes(term))
    );
  });

  // Export filtered list for printing
  const printableExportLessons = lessons.filter((l) => {
    if (exportPeriodClass !== 'ALL' && l.class_id !== exportPeriodClass) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Direction Pédagogique • Cahier de Texte Officiel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Cahiers de Texte & Programmes Scolaires
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Saisie réglementaire, prévisions hebdomadaires, programmes ministériels et visa du Directeur des Études.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(isTeacher || isDE) && (
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Consigner une Séance</span>
            </button>
          )}

          {isDE && (
            <button
              onClick={() => setIsCurriculumModalOpen(true)}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Gérer les Programmes (CSV / IA)</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-200 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Onglets */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('notebook')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'notebook'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Cahier de Texte Centralisé</span>
        </button>

        <button
          onClick={() => setActiveSubTab('forecasts')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'forecasts'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Prévision de la Semaine</span>
        </button>

        <button
          onClick={() => setActiveSubTab('curriculum')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'curriculum'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Programmes Scolaires</span>
        </button>

        <button
          onClick={() => setActiveSubTab('progression')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'progression'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Suivi & Exportation PDF</span>
        </button>
      </div>

      {/* ONGLET 1: CAHIER DE TEXTE */}
      {activeSubTab === 'notebook' && (
        <>
          {/* Bar de filtrage */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Rechercher par leçon, chapitre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
              >
                <option value="ALL">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
              >
                <option value="ALL">Toutes les matières</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {isDE && (
                <select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
                >
                  <option value="ALL">Tous les enseignants</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              )}

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="Fait">Fait</option>
                <option value="Partiellement fait">Partiellement fait</option>
                <option value="Non fait">Non fait</option>
              </select>

              {isDE && (
                <button
                  onClick={() => setFilterIncompleteOnly(!filterIncompleteOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1 transition-colors cursor-pointer ${
                    filterIncompleteOnly
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Fiches Incomplètes</span>
                </button>
              )}

              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-1.5"
              />
            </div>
          </div>

          {/* Liste des séances */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full py-16 text-center text-slate-500">
                Chargement du cahier de texte Cloud Firestore...
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <BookOpen className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-400">Aucune séance consignée pour ces critères.</p>
              </div>
            ) : (
              filteredLessons.map((l) => {
                const badge = STATUS_LABELS[l.statut || l.status] || STATUS_LABELS['Fait'];
                return (
                  <div
                    key={l.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                          {l.class_name} • {l.subject_name}
                        </span>

                        <div className="flex items-center space-x-1">
                          {l.incomplete && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600/50">
                              Fiche incomplète
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-white text-base leading-snug line-clamp-2">
                        {l.titre || l.title}
                      </h3>

                      {(l.chapitre || l.chapter) && (
                        <p className="text-xs text-slate-400 mt-1 italic">
                          Chapitre : {l.chapitre || l.chapter}
                        </p>
                      )}

                      {(l.resume || l.summary_content) && (
                        <p className="text-xs text-slate-300 mt-3 line-clamp-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                          {l.resume || l.summary_content}
                        </p>
                      )}

                      {l.statut !== 'Fait' && l.motif && (
                        <div className="mt-2 text-xs text-rose-300 bg-rose-950/40 p-2 rounded-lg border border-rose-900/40">
                          <span className="font-bold">Motif :</span> {l.motif}
                        </div>
                      )}

                      {l.visa && (
                        <div className="mt-2 text-[10px] text-emerald-300 bg-emerald-950/50 p-1.5 rounded-md border border-emerald-500/30 flex items-center space-x-1">
                          <Stamp className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Visé par {l.visa.name} le {new Date(l.visa.date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <div>
                        <span className="font-medium text-slate-200 block">{l.teacher_name}</span>
                        <span className="text-[10px] text-slate-500">{l.date} • {l.time_slot || `${l.duration_minutes || 120} min`}</span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {isDE && !l.visa && (
                          <button
                            onClick={() => handleVisaLesson(l.id)}
                            title="Apposer le visa du Directeur des Études"
                            className="p-1.5 bg-emerald-950/50 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-600/40 transition-colors cursor-pointer"
                          >
                            <Stamp className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isDE && (
                          <button
                            onClick={() => {
                              setSelectedLessonForObs(l);
                              setIsObsModalOpen(true);
                            }}
                            title="Ajouter une observation pédagogique"
                            className="p-1.5 bg-amber-950/50 hover:bg-amber-900 text-amber-300 rounded-lg border border-amber-600/40 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenLessonDetail(l)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Détails</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ONGLET 2: PRÉVISION DE LA SEMAINE */}
      {activeSubTab === 'forecasts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Saisir une Prévision</span>
            </h3>

            <form onSubmit={handleSaveForecast} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Semaine *</label>
                <input
                  type="text"
                  required
                  value={currentWeekCode}
                  onChange={(e) => setCurrentWeekCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  placeholder="Ex: 2026-W44"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Classe *</label>
                <select
                  required
                  value={forecastForm.classId}
                  onChange={(e) => setForecastForm({ ...forecastForm, classId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="">Sélectionner la classe...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Matière *</label>
                <select
                  required
                  value={forecastForm.subjectId}
                  onChange={(e) => setForecastForm({ ...forecastForm, subjectId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="">Sélectionner la matière...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Jour de la semaine</label>
                <select
                  value={forecastForm.dayOfWeek}
                  onChange={(e) => setForecastForm({ ...forecastForm, dayOfWeek: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="Lundi">Lundi</option>
                  <option value="Mardi">Mardi</option>
                  <option value="Mercredi">Mercredi</option>
                  <option value="Jeudi">Jeudi</option>
                  <option value="Vendredi">Vendredi</option>
                  <option value="Samedi">Samedi</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Contenu Prévu *</label>
                <textarea
                  required
                  rows={3}
                  value={forecastForm.plannedContent}
                  onChange={(e) => setForecastForm({ ...forecastForm, plannedContent: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  placeholder="Ex: Chapitre 3 - Les fractions rationnelles"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-colors cursor-pointer shadow"
              >
                {actionLoading ? 'Enregistrement...' : 'Enregistrer la prévision'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-base">Prévisions pour la Semaine {currentWeekCode}</h3>
                <p className="text-xs text-slate-400">Planning pédagogique indicatif saisi par les enseignants.</p>
              </div>

              {isTeacher && (
                <button
                  onClick={handleCopyPreviousForecasts}
                  disabled={actionLoading}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Copier la semaine précédente ({previousWeekCode})</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {forecasts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs">
                  Aucune prévision enregistrée pour la semaine {currentWeekCode}.
                </div>
              ) : (
                forecasts.map((f) => (
                  <div key={f.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span className="text-indigo-400">{f.day_of_week}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{f.week_code}</span>
                    </div>
                    <p className="text-slate-200 font-semibold">{f.planned_content}</p>
                    {f.objectives && <p className="text-slate-400 text-[11px] italic">Objectifs : {f.objectives}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 3: PROGRAMMES SCOLAIRES */}
      {activeSubTab === 'curriculum' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Référentiel des Programmes Scolaires Officiels</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Chapitres, objectifs généraux et spécifiques préremplis automatiquement lors de la saisie.
              </p>
            </div>

            {isDE && (
              <button
                onClick={() => setIsCurriculumModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Importer un Programme (CSV / IA)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {curricula.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs">
                Aucun programme scolaire importé pour cet établissement.
              </div>
            ) : (
              curricula.map((curr) => (
                <div key={curr.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                      {curr.level_code} • {curr.subject_name}
                    </span>
                    <span className="text-[10px] text-slate-400">{(curr.chapters || []).length} Chapitre(s)</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(curr.chapters || []).map((ch, idx) => (
                      <div key={ch.id || idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                        <div className="font-bold text-white">Ch. {ch.chapter_number || idx + 1} : {ch.title}</div>
                        {ch.general_objective && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">Obj: {ch.general_objective}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ONGLET 4: SUIVI DE PROGRESSION & IMPRESSION / EXPORT PDF */}
      {activeSubTab === 'progression' && (
        <div className="space-y-6">
          {/* Section d'exportation d'impression personnalisée par classe & période */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Exportation du Cahier de Texte Officiel</h3>
              <p className="text-xs text-slate-400">Rendu A4 Portrait normalisé pour l'inspection pédagogique.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={exportPeriodClass}
                onChange={(e) => setExportPeriodClass(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
              >
                <option value="ALL">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button
                onClick={() => printDocument('printable-textbook-export', 'Cahier_de_texte_Officiel')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>

              <button
                onClick={() => downloadPdf('printable-textbook-export', 'Cahier_de_texte_Officiel.pdf')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger PDF</span>
              </button>
            </div>
          </div>

          {/* Document Imprimable Réel A4 Portrait */}
          <div
            id="printable-textbook-export"
            className="printable-document bg-white text-slate-900 p-8 rounded-xl shadow-xl max-w-4xl mx-auto space-y-6"
            style={{ minHeight: '297mm' }}
          >
            <PrintHeader
              establishment={establishment}
              title="CAHIER DE TEXTE OFFICIEL"
              subtitle="Registre Ministériel de Suivi Pédagogique"
            />

            <div className="text-center border-b pb-4 border-slate-300">
              <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                CAHIER DE TEXTE OFFICIEL DE L'ÉTABLISSEMENT
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Année Scolaire 2026-2027 • Édité le {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 uppercase font-bold border-b-2 border-slate-400">
                  <th className="p-2.5 border border-slate-300">Date & Heure</th>
                  <th className="p-2.5 border border-slate-300">Classe / Matière</th>
                  <th className="p-2.5 border border-slate-300">Enseignant</th>
                  <th className="p-2.5 border border-slate-300">Titre & Résumé du Cours</th>
                  <th className="p-2.5 border border-slate-300">Statut</th>
                  <th className="p-2.5 border border-slate-300">Visa DE</th>
                </tr>
              </thead>
              <tbody>
                {printableExportLessons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 border border-slate-300">
                      Aucune séance trouvée pour les critères d'exportation.
                    </td>
                  </tr>
                ) : (
                  printableExportLessons.map((l, idx) => (
                    <tr key={l.id || idx} className="border-b border-slate-300">
                      <td className="p-2 border border-slate-300 font-mono text-[11px]">
                        {l.date}<br />
                        <span className="text-slate-500 text-[10px]">{l.time_slot}</span>
                      </td>
                      <td className="p-2 border border-slate-300 font-bold">
                        {l.class_name}<br />
                        <span className="text-indigo-700 font-normal text-[11px]">{l.subject_name}</span>
                      </td>
                      <td className="p-2 border border-slate-300 text-[11px]">{l.teacher_name}</td>
                      <td className="p-2 border border-slate-300">
                        <div className="font-bold text-slate-900">{l.titre || l.title}</div>
                        {(l.chapitre || l.chapter) && (
                          <div className="text-[10px] italic text-slate-600">Ch: {l.chapitre || l.chapter}</div>
                        )}
                        <div className="text-[11px] text-slate-700 mt-1 leading-snug">{l.resume || l.summary_content}</div>
                      </td>
                      <td className="p-2 border border-slate-300 font-semibold text-[11px]">
                        {l.statut || l.status}
                      </td>
                      <td className="p-2 border border-slate-300 text-[10px] text-center">
                        {l.visa ? (
                          <span className="text-emerald-700 font-bold">Visé le {new Date(l.visa.date).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-slate-400 italic">En attente</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex justify-between items-end pt-8 text-xs text-slate-700">
              <div>
                <p className="font-bold">L'Enseignant en Charge</p>
                <div className="h-12"></div>
              </div>
              <div className="text-right">
                <p className="font-bold">Le Directeur des Études</p>
                <div className="h-12"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IA & CSV CURRICULUM */}
      {isCurriculumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Importer un Programme Scolaire (CSV / IA)</h3>
              <button onClick={() => setIsCurriculumModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              {/* Option 1 : CSV */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-white flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-indigo-400">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Option 1 : Importation par fichier CSV</span>
                  </span>
                  <a
                    href="/api/curriculum/template"
                    download="Modele_Programme_Scolaire.csv"
                    className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Télécharger Modèle CSV</span>
                  </a>
                </div>

                <textarea
                  rows={4}
                  value={curriculumCsvText}
                  onChange={(e) => setCurriculumCsvText(e.target.value)}
                  placeholder="Collez ici le contenu de votre fichier CSV..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-[11px]"
                />

                <button
                  onClick={handleImportCurriculumCsv}
                  disabled={actionLoading || !curriculumCsvText.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Ecriture par lot...' : 'Valider et Écrire en Batch dans Firestore'}
                </button>
              </div>

              {/* Option 2 : IA Document Upload */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-white flex items-center space-x-1.5 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Option 2 : Analyse IA par Photo / Scan PDF du Programme Officiel</span>
                </div>

                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUploadForAi}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-300"
                />

                {aiDocBase64 && (
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={actionLoading}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    {actionLoading ? 'Analyse par Gemini AI...' : 'Lancer l’Analyse IA du Programme'}
                  </button>
                )}

                {aiExtractedPreview && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-purple-500/40 space-y-2">
                    <p className="font-bold text-purple-300">Aperçu extrait par l'IA :</p>
                    <div className="text-[11px] text-slate-300">
                      Niveau : {aiExtractedPreview.levelCode} • Matière : {aiExtractedPreview.subjectName} • {aiExtractedPreview.chapters?.length || 0} Chapitre(s)
                    </div>
                    <button
                      onClick={handleSaveAiExtractedCurriculum}
                      disabled={actionLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      Confirmer et Enregistrer ce Programme
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONSIGNATION SÉANCE */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-lg">Consigner une Séance dans le Cahier de Texte</h3>
              </div>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Préremplissage depuis l'Emploi du temps */}
              <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl space-y-2">
                <label className="block text-indigo-300 font-bold">Préremplir depuis un créneau de votre Emploi du temps</label>
                <select
                  onChange={(e) => handleScheduleSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-indigo-800 rounded-lg p-2 text-white text-xs"
                >
                  <option value="">Sélectionner un créneau attribué...</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.class_name || s.class_id} • {s.subject_name || s.subject_id} ({s.start_time} - {s.end_time})
                    </option>
                  ))}
                </select>
              </div>

              {/* Préremplissage depuis le Programme Scolaire */}
              {availableCurriculum && (
                <div className="bg-purple-950/40 border border-purple-500/30 p-3 rounded-xl space-y-2">
                  <label className="block text-purple-300 font-bold">Préremplir depuis le Programme Scolaire Officiel</label>
                  <select
                    onChange={(e) => handleChapterSelect(e.target.value)}
                    className="w-full bg-slate-950 border border-purple-800 rounded-lg p-2 text-white text-xs"
                  >
                    <option value="">Choisir un chapitre du programme...</option>
                    {(availableCurriculum.chapters || []).map((ch) => (
                      <option key={ch.id} value={ch.title}>
                        Ch. {ch.chapter_number} : {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Classe *</label>
                  <select
                    required
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="">Sélectionner la classe...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.cycle_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Matière *</label>
                  <select
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="">Sélectionner la matière...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Formulaire Adapté : Préscolaire vs Primaire / Collège / Lycée */}
              {isPreschool ? (
                <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 rounded-xl space-y-3">
                  <div className="font-bold text-amber-300">Champs Spécifiques au Préscolaire</div>
                  <div>
                    <label className="block text-slate-400 mb-1">Compétence Visée *</label>
                    <input
                      type="text"
                      value={formData.competenceVisee}
                      onChange={(e) => setFormData({ ...formData, competenceVisee: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      placeholder="Ex: Développer la motricité fine"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Activité Réalisée</label>
                    <input
                      type="text"
                      value={formData.activiteRealisee}
                      onChange={(e) => setFormData({ ...formData, activiteRealisee: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      placeholder="Ex: Atelier de découpage et collage"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Matériel Utilisé</label>
                    <input
                      type="text"
                      value={formData.materielUtilise}
                      onChange={(e) => setFormData({ ...formData, materielUtilise: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      placeholder="Ex: Ciseaux à bout rond, papier couleur, colle"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {isCollegeOrLycee && (
                    <div>
                      <label className="block text-slate-400 mb-1">Chapitre du cours</label>
                      <input
                        type="text"
                        value={formData.chapter}
                        onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        placeholder="Ex: Chapitre 2 - Équations du second degré"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Titre de la leçon *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                      placeholder="Ex: Le discriminant et calcul des racines"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Objectif Général</label>
                      <textarea
                        rows={2}
                        value={formData.generalObjective}
                        onChange={(e) => setFormData({ ...formData, generalObjective: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        placeholder="Saisir l'objectif général..."
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Objectifs Spécifiques</label>
                      <textarea
                        rows={2}
                        value={formData.specificObjectives}
                        onChange={(e) => setFormData({ ...formData, specificObjectives: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        placeholder="Saisir les objectifs spécifiques..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Résumé de la leçon (500 caractères max)</label>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={formData.summaryContent}
                      onChange={(e) => setFormData({ ...formData, summaryContent: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                      placeholder="Résumé synthétique du cours dispensé..."
                    />
                    <div className="text-[10px] text-slate-500 text-right">{formData.summaryContent.length}/500</div>
                  </div>
                </>
              )}

              {/* Statut & Motif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Statut de la séance *</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                  >
                    <option value="Fait">Fait</option>
                    <option value="Partiellement fait">Partiellement fait</option>
                    <option value="Non fait">Non fait</option>
                  </select>
                </div>

                {formData.statut !== 'Fait' && (
                  <div>
                    <label className="block text-rose-300 mb-1 font-bold">Motif (Obligatoire) *</label>
                    <input
                      type="text"
                      required
                      value={formData.motif}
                      onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                      className="w-full bg-slate-900 border border-rose-600/50 rounded-xl p-2.5 text-rose-200"
                      placeholder="Précisez le motif du retard ou de l'annulation..."
                    />
                  </div>
                )}
              </div>

              {/* Devoirs & Évaluation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Travail à faire (Devoir)</label>
                  <input
                    type="text"
                    value={formData.homework}
                    onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    placeholder="Exercices à rendre..."
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Date de remise du devoir</label>
                  <input
                    type="date"
                    value={formData.homeworkDueDate}
                    onChange={(e) => setFormData({ ...formData, homeworkDueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer shadow-lg shadow-indigo-600/20 text-sm"
              >
                {actionLoading ? 'Enregistrement dans Firestore...' : 'Enregistrer la Séance'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS D'UNE SÉANCE */}
      {selectedLessonForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 text-xs">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Fiche de Séance Détaillée</h3>
              <button onClick={() => setSelectedLessonForView(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-400">{selectedLessonForView.class_name} • {selectedLessonForView.subject_name}</span>
                <span className="text-slate-400">{selectedLessonForView.date}</span>
              </div>

              <h2 className="text-lg font-bold text-white">{selectedLessonForView.titre || selectedLessonForView.title}</h2>

              {(selectedLessonForView.resume || selectedLessonForView.summary_content) && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">
                  <p className="font-semibold text-slate-400 mb-1">Résumé du cours :</p>
                  <p>{selectedLessonForView.resume || selectedLessonForView.summary_content}</p>
                </div>
              )}

              {selectedLessonForView.statut !== 'Fait' && selectedLessonForView.motif && (
                <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-900/50 text-rose-300">
                  <p className="font-bold">Motif : {selectedLessonForView.motif}</p>
                </div>
              )}

              {selectedLessonForView.visa && (
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/40 text-emerald-300">
                  <p className="font-bold flex items-center space-x-1">
                    <Stamp className="w-4 h-4 text-emerald-400" />
                    <span>Visé par {selectedLessonForView.visa.name} ({selectedLessonForView.visa.role})</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{selectedLessonForView.visa.comments}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
