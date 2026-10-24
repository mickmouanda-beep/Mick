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
  Printer
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { LessonLog, LessonObservation, SchoolClass, Subject } from '../types.ts';

export const LessonsView: React.FC = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'notebook' | 'observations' | 'progression'>('notebook');
  const [lessons, setLessons] = useState<LessonLog[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterTeacher, setFilterTeacher] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLessonForView, setSelectedLessonForView] = useState<LessonLog | null>(null);
  const [observationsList, setObservationsList] = useState<LessonObservation[]>([]);
  const [isObsModalOpen, setIsObsModalOpen] = useState(false);
  const [selectedLessonForObs, setSelectedLessonForObs] = useState<LessonLog | null>(null);

  // Response form
  const [replyText, setReplyText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 24 Fields Form State (Conforme aux Directives Ministérielles & Inspection)
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
    plannedDurationMinutes: 120,
    effectiveDurationMinutes: 120,
    sessionNumber: 1,
    curriculumReference: '',
    textbookReference: '',
    title: '',
    officialCurriculumTitle: '',
    chapter: '',
    subChapter: '',
    generalObjective: '',
    specificObjectives: '',
    summaryContent: '',
    pedagogicalMethod: 'Méthode active et participative',
    studentActivities: '',
    participationConduct: '',
    difficulties: '',
    exercisesDone: '',
    homework: '',
    teacherObservation: '',
    status: 'VUE_TERMINEE',
    nextLesson: '',
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
      const [cls, subs, tch, prog] = await Promise.all([
        api.getClasses(),
        api.getSubjects(),
        api.getTeachers(),
        api.getLessonProgress(),
      ]);
      setClasses(cls);
      setSubjects(subs);
      setTeachers(tch);
      setProgressSummary(prog);

      await fetchLessons();
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
      });
      setLessons(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [filterClass, filterSubject, filterTeacher, filterStatus, filterDate]);

  const handleOpenLessonDetail = async (lesson: LessonLog) => {
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
    try {
      await api.createLesson(formData);
      setSuccessMsg('Séance enregistrée dans le cahier de texte officiel.');
      setIsLogModalOpen(false);
      fetchLessons();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement");
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

  const handleCloseObservation = async (obsId: string) => {
    try {
      await api.updateObservationStatus(obsId, 'CLOTURE');
      setSuccessMsg('Dossier de suivi pédagogique clôturé.');
      if (selectedLessonForView) {
        const obs = await api.getLessonObservations(selectedLessonForView.id);
        setObservationsList(obs);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    NON_COMMENCEE: { label: 'Non commencée', color: 'bg-slate-800 text-slate-300 border-slate-700' },
    EN_COURS: { label: 'En cours', color: 'bg-amber-950/60 text-amber-300 border-amber-600/40' },
    VUE_TERMINEE: { label: 'Vue et terminée', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' },
    PARTIELLEMENT_VUE: { label: 'Partiellement vue', color: 'bg-blue-950/60 text-blue-300 border-blue-500/40' },
    A_REVOIR: { label: 'À revoir', color: 'bg-rose-950/60 text-rose-300 border-rose-500/40' },
    NON_TERMINEE: { label: 'Non terminée', color: 'bg-orange-950/60 text-orange-300 border-orange-500/40' },
    REPORTEE: { label: 'Reportée', color: 'bg-purple-950/60 text-purple-300 border-purple-500/40' },
  };

  const filteredLessons = lessons.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.title.toLowerCase().includes(term) ||
      (l.teacher_name && l.teacher_name.toLowerCase().includes(term)) ||
      (l.chapter && l.chapter.toLowerCase().includes(term))
    );
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
            Cahiers de Texte & Progression des Programmes
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Suivi scrupuleux des 21 champs normalisés, observations du Directeur des Études, et avancement pédagogique.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {(isTeacher || isDE) && (
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Consigner une Séance</span>
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
      <div className="flex items-center space-x-2 border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('notebook')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'notebook'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Registre des Séances Enseignées</span>
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
          <span>Suivi de l'Avancement des Programmes</span>
        </button>
      </div>

      {activeSubTab === 'notebook' && (
        <>
          {/* Bar de filtrage */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Rechercher par leçon, chapitre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <option value="VUE_TERMINEE">Vue et terminée</option>
                <option value="PARTIELLEMENT_VUE">Partiellement vue</option>
                <option value="EN_COURS">En cours</option>
                <option value="A_REVOIR">À revoir</option>
                <option value="REPORTEE">Reportée</option>
              </select>

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
                Chargement des fiches de cours...
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <BookOpen className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-400">Aucune séance consignée pour ces critères.</p>
                <p className="text-xs text-slate-600 mt-1">
                  Les enseignants peuvent enregistrer chaque séance tenue avec les 21 champs réglementaires.
                </p>
              </div>
            ) : (
              filteredLessons.map((l) => {
                const badge = STATUS_LABELS[l.status] || STATUS_LABELS['VUE_TERMINEE'];
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
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-base leading-snug line-clamp-2">
                        {l.title}
                      </h3>

                      {l.chapter && (
                        <p className="text-xs text-slate-400 mt-1 italic">
                          Chapitre : {l.chapter} {l.sub_chapter ? `> ${l.sub_chapter}` : ''}
                        </p>
                      )}

                      <p className="text-xs text-slate-300 mt-3 line-clamp-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                        {l.summary_content}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <div>
                        <span className="font-medium text-slate-200 block">{l.teacher_name}</span>
                        <span className="text-[10px] text-slate-500">{l.date} • {l.time_slot || `${l.duration_minutes} min`}</span>
                      </div>

                      <div className="flex items-center space-x-1.5">
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

      {activeSubTab === 'progression' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div>
              <h3 className="font-bold text-white text-base">État d'Avancement Pédagogique par Matière</h3>
              <p className="text-xs text-slate-400">
                Comparatif des leçons terminées, partielles et reportées dans chaque classe.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer l'état</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Classe & Matière</th>
                  <th className="py-3 px-4">Enseignant en Charge</th>
                  <th className="py-3 px-4 text-center">Séances Tenues</th>
                  <th className="py-3 px-4 text-center">Vues & Terminées</th>
                  <th className="py-3 px-4 text-center">Partielles / À Revoir</th>
                  <th className="py-3 px-4 text-center">Reportées</th>
                  <th className="py-3 px-4 text-right">Progression Estimée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {progressSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Aucune donnée de progression disponible.
                    </td>
                  </tr>
                ) : (
                  progressSummary.map((p, idx) => {
                    const completed = p.completed_lessons || 0;
                    const total = p.total_logged || 0;
                    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white">{p.class_name}</span>
                          <span className="text-xs text-indigo-400 block">{p.subject_name}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-300">
                          {p.teacher_name || <span className="text-slate-500 italic">Non assigné</span>}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">
                          {p.total_logged || 0}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-400 font-bold">
                          {p.completed_lessons || 0}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-amber-400">
                          {(p.partial_lessons || 0) + (p.review_lessons || 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-rose-400">
                          {p.postponed_lessons || 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <div className="w-24 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                              <div
                                className="bg-indigo-500 h-full rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold text-white w-9">
                              {percent}%
                            </span>
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

      {/* Modal 21 Champs pour Consigner une Séance */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-lg">Consigner une Séance (21 Champs Officiels)</h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Section 1 : Identification de la Séance */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-white text-xs flex items-center space-x-1.5 text-indigo-400">
                  <BookOpen className="w-4 h-4" />
                  <span>1. Identification Officielle de la Séance</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Année Scolaire</label>
                    <input
                      type="text"
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Date du cours *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Jour de la semaine</label>
                    <select
                      value={formData.dayOfWeek}
                      onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
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
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">N° de la Séance</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.sessionNumber}
                      onChange={(e) => setFormData({ ...formData, sessionNumber: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Classe *</label>
                    <select
                      required
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    >
                      <option value="">Sélectionner la classe...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cycle_code} - {c.level_code} {c.serie_code ? `Série ${c.serie_code}` : ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Matière *</label>
                    <select
                      required
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    >
                      <option value="">Sélectionner la matière...</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Heure de début</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value, timeSlot: `${e.target.value} - ${formData.endTime}` })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Heure de fin</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value, timeSlot: `${formData.startTime} - ${e.target.value}` })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Durée Prévue (min)</label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={formData.plannedDurationMinutes}
                      onChange={(e) => setFormData({ ...formData, plannedDurationMinutes: Number(e.target.value), durationMinutes: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Durée Effective (min)</label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={formData.effectiveDurationMinutes}
                      onChange={(e) => setFormData({ ...formData, effectiveDurationMinutes: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono text-xs font-bold text-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Référence du Programme Officiel</label>
                    <input
                      type="text"
                      placeholder="Ex: Programme INRAP Congo p. 45-48"
                      value={formData.curriculumReference}
                      onChange={(e) => setFormData({ ...formData, curriculumReference: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Référence du Livre / Manuel Utilisé</label>
                    <input
                      type="text"
                      placeholder="Ex: Manuel CIAM 3ème, Chapitre 4"
                      value={formData.textbookReference}
                      onChange={(e) => setFormData({ ...formData, textbookReference: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2 : Titre de la leçon & Statut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Titre de la leçon du jour *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs sm:text-sm text-white font-bold"
                    placeholder="Ex: Les équations du second degré"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Titre prévu dans le programme officiel ou manuel</label>
                  <input
                    type="text"
                    value={formData.officialCurriculumTitle}
                    onChange={(e) => setFormData({ ...formData, officialCurriculumTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs sm:text-sm text-white"
                    placeholder="Ex: Résolution algébrique des trinômes du second degré"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Statut de la leçon *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs sm:text-sm text-white font-semibold"
                  >
                    <option value="VUE_TERMINEE">Vue et terminée</option>
                    <option value="EN_COURS">En cours</option>
                    <option value="PARTIELLEMENT_VUE">Partiellement vue</option>
                    <option value="A_REVOIR">À revoir</option>
                    <option value="NON_TERMINEE">Non terminée</option>
                    <option value="NON_COMMENCEE">Non commencée</option>
                    <option value="REPORTEE">Reportée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Chapitre & Sous-chapitre</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.chapter}
                      onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                      placeholder="Chapitre II"
                    />
                    <input
                      type="text"
                      value={formData.subChapter}
                      onChange={(e) => setFormData({ ...formData, subChapter: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                      placeholder="Section 2.1"
                    />
                  </div>
                </div>
              </div>

              {/* Objectifs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Objectif Général</label>
                  <input
                    type="text"
                    value={formData.generalObjective}
                    onChange={(e) => setFormData({ ...formData, generalObjective: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    placeholder="Maîtriser la résolution des trinômes"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Objectifs Spécifiques</label>
                  <input
                    type="text"
                    value={formData.specificObjectives}
                    onChange={(e) => setFormData({ ...formData, specificObjectives: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    placeholder="Calculer le discriminant delta, identifier les racines"
                  />
                </div>
              </div>

              {/* Résumé du contenu */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Résumé du Contenu Enseigné *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.summaryContent}
                  onChange={(e) => setFormData({ ...formData, summaryContent: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs sm:text-sm text-white"
                  placeholder="Définition du discriminant delta = b² - 4ac. Cas delta > 0, = 0 et < 0 avec exemples concrets..."
                />
              </div>

              {/* Activités & Pédagogie */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Méthode Pédagogique</label>
                  <input
                    type="text"
                    value={formData.pedagogicalMethod}
                    onChange={(e) => setFormData({ ...formData, pedagogicalMethod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Activités des Apprenants</label>
                  <input
                    type="text"
                    value={formData.studentActivities}
                    onChange={(e) => setFormData({ ...formData, studentActivities: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Passage au tableau, calcul individuel"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Participation & Conduite</label>
                  <input
                    type="text"
                    value={formData.participationConduct}
                    onChange={(e) => setFormData({ ...formData, participationConduct: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Bonne attention, 2 bavardages signalés"
                  />
                </div>
              </div>

              {/* Exercices & Devoirs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Exercices Effectués en Classe</label>
                  <input
                    type="text"
                    value={formData.exercisesDone}
                    onChange={(e) => setFormData({ ...formData, exercisesDone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Exercices 1, 2 et 3 page 45"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Travail à Faire à Domicile</label>
                  <input
                    type="text"
                    value={formData.homework}
                    onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Exercice 4 page 46 pour la prochaine séance"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Difficultés Rencontrées</label>
                  <input
                    type="text"
                    value={formData.difficulties}
                    onChange={(e) => setFormData({ ...formData, difficulties: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Difficulté sur le calcul des racines complexes"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Prochaine Leçon Prévue</label>
                  <input
                    type="text"
                    value={formData.nextLesson}
                    onChange={(e) => setFormData({ ...formData, nextLesson: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Factorisation et signe du trinôme"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Observation Générale de l'Enseignant</label>
                <textarea
                  rows={2}
                  value={formData.teacherObservation}
                  onChange={(e) => setFormData({ ...formData, teacherObservation: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  placeholder="Séance productive dans l'ensemble..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Enregistrement...' : 'Enregistrer la Séance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Consultation Fiche de Séance Complète avec Observations */}
      {selectedLessonForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <span className="text-xs font-mono text-indigo-400 font-bold uppercase">
                  {selectedLessonForView.class_name} • {selectedLessonForView.subject_name}
                </span>
                <h3 className="font-bold text-white text-lg">{selectedLessonForView.title}</h3>
              </div>
              <button
                onClick={() => setSelectedLessonForView(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs sm:text-sm text-slate-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Enseignant</span>
                  <span className="font-bold text-white">{selectedLessonForView.teacher_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Date & Horaire</span>
                  <span className="font-semibold text-slate-200">{selectedLessonForView.date}</span>
                  <span className="text-slate-500 block text-xs">{selectedLessonForView.time_slot}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Durée</span>
                  <span className="font-semibold text-slate-200">{selectedLessonForView.duration_minutes} min</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Statut</span>
                  <span className="font-bold text-emerald-400">{selectedLessonForView.status}</span>
                </div>
              </div>

              {/* Contenu et Objectifs */}
              <div className="space-y-3">
                <div className="border border-slate-800 p-4 rounded-xl bg-slate-950/40">
                  <h4 className="font-bold text-white mb-1">Résumé du Contenu</h4>
                  <p className="whitespace-pre-line text-slate-200">{selectedLessonForView.summary_content}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-slate-800 p-3 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block mb-1">Objectifs</span>
                    <p><strong className="text-slate-300">Général :</strong> {selectedLessonForView.general_objective || 'N/A'}</p>
                    <p className="mt-1"><strong className="text-slate-300">Spécifiques :</strong> {selectedLessonForView.specific_objectives || 'N/A'}</p>
                  </div>
                  <div className="border border-slate-800 p-3 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block mb-1">Activités & Pédagogie</span>
                    <p><strong className="text-slate-300">Méthode :</strong> {selectedLessonForView.pedagogical_method || 'N/A'}</p>
                    <p className="mt-1"><strong className="text-slate-300">Activités élèves :</strong> {selectedLessonForView.student_activities || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-slate-800 p-3 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block mb-1">Exercices & Devoirs</span>
                    <p><strong className="text-slate-300">Classe :</strong> {selectedLessonForView.exercises_done || 'N/A'}</p>
                    <p className="mt-1"><strong className="text-slate-300">Maison :</strong> {selectedLessonForView.homework || 'N/A'}</p>
                  </div>
                  <div className="border border-slate-800 p-3 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block mb-1">Observations & Suite</span>
                    <p><strong className="text-slate-300">Observation prof :</strong> {selectedLessonForView.teacher_observation || 'N/A'}</p>
                    <p className="mt-1"><strong className="text-slate-300">Prochaine séance :</strong> {selectedLessonForView.next_lesson || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Rubrique Observations du DE */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-base flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    <span>Observations & Recommandations de la Direction des Études</span>
                  </h4>

                  {isDE && (
                    <button
                      onClick={() => {
                        setSelectedLessonForObs(selectedLessonForView);
                        setIsObsModalOpen(true);
                      }}
                      className="px-3 py-1 bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-semibold border border-amber-500/40 cursor-pointer"
                    >
                      + Nouvelle Observation
                    </button>
                  )}
                </div>

                {observationsList.length === 0 ? (
                  <p className="text-slate-500 text-xs italic bg-slate-950 p-4 rounded-xl">
                    Aucune observation enregistrée par la direction pour cette séance.
                  </p>
                ) : (
                  observationsList.map((obs) => (
                    <div
                      key={obs.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400 text-xs">
                          {obs.inspector_name} • le {obs.date}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          obs.status === 'CLOTURE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                            : 'bg-amber-950 text-amber-300 border border-amber-600/40'
                        }`}>
                          {obs.status === 'CLOTURE' ? 'Clôturé' : 'En cours de suivi'}
                        </span>
                      </div>

                      <p className="text-slate-200 font-medium">{obs.observation}</p>

                      {(obs.strengths || obs.weaknesses) && (
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                          {obs.strengths && (
                            <div className="text-emerald-300">
                              <span className="font-bold block">Points positifs :</span>
                              {obs.strengths}
                            </div>
                          )}
                          {obs.weaknesses && (
                            <div className="text-rose-300">
                              <span className="font-bold block">Insuffisances :</span>
                              {obs.weaknesses}
                            </div>
                          )}
                        </div>
                      )}

                      {obs.corrective_action && (
                        <div className="p-2 bg-amber-950/30 border border-amber-600/30 rounded-lg text-xs text-amber-200">
                          <span className="font-bold block">Action corrective demandée :</span>
                          {obs.corrective_action} (Échéance : {obs.deadline || 'Immédiate'})
                        </div>
                      )}

                      {/* Réponse Enseignant */}
                      {obs.teacher_response ? (
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 mt-2">
                          <span className="font-bold text-indigo-400 block mb-1">
                            Réponse de l'enseignant (le {obs.teacher_response_date}) :
                          </span>
                          <p>{obs.teacher_response}</p>
                        </div>
                      ) : (
                        isTeacher && (
                          <div className="pt-2 flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder="Rédiger votre réponse ou compte-rendu..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                            />
                            <button
                              onClick={() => handleReplyObservation(obs.id)}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Répondre
                            </button>
                          </div>
                        )
                      )}

                      {isDE && obs.status !== 'CLOTURE' && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleCloseObservation(obs.id)}
                            className="text-[11px] bg-slate-800 hover:bg-emerald-900 hover:text-emerald-300 text-slate-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            Clôturer ce suivi
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout Observation par le DE */}
      {isObsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white text-base">Consigner une Observation Pédagogique</h3>
              <button
                onClick={() => setIsObsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddObservation} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Observation générale *</label>
                <textarea
                  required
                  rows={2}
                  value={obsFormData.observation}
                  onChange={(e) => setObsFormData({ ...obsFormData, observation: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  placeholder="Remarques sur la conformité de la leçon..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">Points Positifs</label>
                  <textarea
                    rows={2}
                    value={obsFormData.strengths}
                    onChange={(e) => setObsFormData({ ...obsFormData, strengths: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Bonne méthodologie, cours clair..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-rose-400 mb-1">Insuffisances Constatées</label>
                  <textarea
                    rows={2}
                    value={obsFormData.weaknesses}
                    onChange={(e) => setObsFormData({ ...obsFormData, weaknesses: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Exercices d'application insuffisants..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Action Corrective / Rattrapage</label>
                  <input
                    type="text"
                    value={obsFormData.correctiveAction}
                    onChange={(e) => setObsFormData({ ...obsFormData, correctiveAction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Prévoir une séance de TD de rattrapage"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date Limite de Prise en Compte</label>
                  <input
                    type="date"
                    value={obsFormData.deadline}
                    onChange={(e) => setObsFormData({ ...obsFormData, deadline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsObsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Envoi...' : 'Consigner l’Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
