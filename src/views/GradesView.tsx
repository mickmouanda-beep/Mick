import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Printer,
  Calendar,
  Layers,
  BookOpen,
  X,
  FileSpreadsheet,
  TrendingUp,
  Download,
  Eye,
  FileText,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Evaluation, SchoolClass, Subject } from '../types.ts';
import { PrintableReportCard } from '../components/PrintableReportCard.tsx';
import { CloseButton } from '../components/CloseButton.tsx';
import { printReportCardPdf, downloadReportCardPdf, downloadListPdf } from '../utils/printPdfUtils.ts';

export const GradesView: React.FC = () => {
  const { establishment, hasRole, user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterTerm, setFilterTerm] = useState('TRIMESTRE_1');

  // Modal Nouvelle Évaluation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newTerm, setNewTerm] = useState<'TRIMESTRE_1' | 'TRIMESTRE_2' | 'TRIMESTRE_3'>('TRIMESTRE_1');
  const [newEvalType, setNewEvalType] = useState<'INTERROGATION' | 'DEVOIR' | 'COMPOSITION' | 'EXAMEN'>('DEVOIR');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMaxScore, setNewMaxScore] = useState<number>(20.0);
  const [newCoef, setNewCoef] = useState<number>(1.0);

  // Modal Saisie des Notes
  const [activeEvalForGrading, setActiveEvalForGrading] = useState<any | null>(null);
  const [gradingStudents, setGradingStudents] = useState<any[]>([]);

  // Bulletin de notes
  const [reportCardData, setReportCardData] = useState<any | null>(null);
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<any | null>(null);

  // Aperçu évaluation
  const [activeEvalPreview, setActiveEvalPreview] = useState<any | null>(null);

  const handlePreviewEval = async (ev: Evaluation) => {
    setError(null);
    try {
      const data = await api.getEvaluationGrades(ev.id);
      setActiveEvalPreview(data);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement de l’aperçu.');
    }
  };

  const handlePrintEval = async (ev: Evaluation) => {
    try {
      const data = await api.getEvaluationGrades(ev.id);
      const studentsList = data.students || [];
      const columns = [
        { header: 'N°', key: 'num' },
        { header: 'Matricule', key: 'matricule' },
        { header: 'Nom & Prénoms', key: 'name' },
        { header: 'Note / Barème', key: 'score' },
        { header: 'Observations', key: 'remarks' },
      ];
      const rows = studentsList.map((s: any, idx: number) => ({
        num: idx + 1,
        matricule: s.matricule || '—',
        name: `${s.last_name || ''} ${s.first_name || ''}`,
        score: s.is_absent ? 'ABSENT' : (s.score !== null && s.score !== undefined ? `${s.score} / ${ev.max_score}` : '—'),
        remarks: s.remarks || ''
      }));
      await downloadListPdf(`Fiche_Evaluation_${ev.title}_${ev.subject_name}`, columns, rows, establishment);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’impression.');
    }
  };

  const handleDownloadEvalPdf = async (ev: Evaluation) => {
    await handlePrintEval(ev);
  };

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const canLock = hasRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evals, cls, subjs] = await Promise.all([
        api.getEvaluations({
          classId: filterClassId || undefined,
          subjectId: filterSubjectId || undefined,
          term: filterTerm || undefined,
        }),
        api.getClasses(),
        api.getSubjects(),
      ]);
      setEvaluations(evals);
      setClasses(cls);
      setSubjects(subjs);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des évaluations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterClassId, filterSubjectId, filterTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedStudentForCard) setSelectedStudentForCard(null);
        else if (showReportCardModal) setShowReportCardModal(false);
        else if (activeEvalForGrading) setActiveEvalForGrading(null);
        else if (showCreateModal) setShowCreateModal(false);
      }
    };

    const handlePopState = () => {
      if (selectedStudentForCard) setSelectedStudentForCard(null);
      else if (showReportCardModal) setShowReportCardModal(false);
      else if (activeEvalForGrading) setActiveEvalForGrading(null);
      else if (showCreateModal) setShowCreateModal(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedStudentForCard, showReportCardModal, activeEvalForGrading, showCreateModal]);

  const handleCreateEval = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newTitle.trim() || !newClassId || !newSubjectId) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      await api.createEvaluation({
        classId: newClassId,
        subjectId: newSubjectId,
        term: newTerm,
        evalType: newEvalType,
        title: newTitle.trim(),
        date: newDate,
        maxScore: newMaxScore,
        coefficient: newCoef,
      });

      setSuccess(`Évaluation "${newTitle}" créée avec succès.`);
      setShowCreateModal(false);
      setNewTitle('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenGrading = async (evaluationId: string) => {
    setError(null);
    try {
      const data = await api.getEvaluationGrades(evaluationId);
      setActiveEvalForGrading(data.evaluation);
      setGradingStudents(data.students);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération des notes.');
    }
  };

  const handleGradeChange = (studentId: string, field: string, value: any) => {
    setGradingStudents((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvalForGrading) return;
    setError(null);

    try {
      const payload = gradingStudents.map((s) => ({
        studentId: s.student_id,
        score: s.score,
        isAbsent: s.is_absent ? 1 : 0,
        remarks: s.remarks,
      }));

      await api.saveEvaluationGrades(activeEvalForGrading.id, payload);
      setSuccess('Notes enregistrées avec succès.');
      setActiveEvalForGrading(null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleLock = async (evalId: string, currentStatus: number) => {
    try {
      await api.lockEvaluation(evalId, currentStatus === 0);
      setSuccess(currentStatus === 0 ? 'Évaluation verrouillée par la direction.' : 'Évaluation déverrouillée.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateReportCards = async () => {
    if (!filterClassId) {
      setError('Veuillez sélectionner une classe dans le filtre pour générer les bulletins.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getReportCards(filterClassId, filterTerm);
      setReportCardData(data);
      setShowReportCardModal(true);
    } catch (err: any) {
      setError(err.message || 'Impossible de calculer les bulletins de notes.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishReportCards = async () => {
    if (!reportCardData?.class?.id || !reportCardData?.reports?.length) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await api.publishReportCards({
        classId: reportCardData.class.id,
        term: reportCardData.term,
        reports: reportCardData.reports,
        academicYear: reportCardData.establishment?.academic_year || '2026-2027',
      });
      setSuccess(res.message || 'Bulletins officiels validés et publiés dans Firestore avec succès.');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la publication des bulletins.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadReportCard = async (report: any) => {
    if (!report || !reportCardData) return;
    setGeneratingPdf(true);
    setPdfError(null);
    try {
      await downloadReportCardPdf(
        report,
        reportCardData.establishment,
        reportCardData.class,
        reportCardData.term
      );
    } catch (err: any) {
      setPdfError(err.message || "Erreur lors de la génération du PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <Award className="w-6 h-6 text-indigo-400" />
            <span>Notes, Évaluations & Bulletins Scolaires</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Devoirs • Compositions • Verrouillage Directeur des Études • Calcul pondéré officiel & Bulletins trimestriels
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleGenerateReportCards}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span>Générer Bulletins Trimestriels</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une Évaluation</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl flex items-center space-x-2 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center space-x-2 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Barre de Filtres */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-sm text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Classe</label>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Matière</label>
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
          >
            <option value="">Toutes les matières</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Période / Trimestre</label>
          <select
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-semibold"
          >
            <option value="TRIMESTRE_1">1er Trimestre</option>
            <option value="TRIMESTRE_2">2ème Trimestre</option>
            <option value="TRIMESTRE_3">3ème Trimestre</option>
          </select>
        </div>
      </div>

      {/* Tableau des Évaluations */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {evaluations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Award className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Aucune évaluation enregistrée</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Créez des devoirs, interrogations ou compositions pour commencer la saisie des notes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Évaluation / Intitulé</th>
                  <th className="p-3.5">Classe</th>
                  <th className="p-3.5">Matière</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Barème & Coef</th>
                  <th className="p-3.5">Saisie Notes</th>
                  <th className="p-3.5">Statut Verrou</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {evaluations.map((ev, idx) => (
                  <tr key={ev.id ? `${ev.id}-${idx}` : `eval-${idx}`} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <span className="font-bold text-white block">{ev.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{ev.date}</span>
                    </td>
                    <td className="p-3.5 font-semibold text-indigo-300">{ev.class_name}</td>
                    <td className="p-3.5 font-semibold text-slate-200">{ev.subject_name}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {ev.eval_type}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      /{ev.max_score} (x{ev.coefficient})
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center space-x-1">
                        <span className="font-bold text-white">{ev.graded_students_count || 0}</span>
                        <span className="text-slate-500">/ {ev.total_students_count || 0}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {ev.is_locked === 1 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1 w-max">
                          <Lock className="w-3 h-3" />
                          <span>Verrouillé</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 w-max">
                          <Unlock className="w-3 h-3" />
                          <span>Modifiable</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handlePreviewEval(ev)}
                        title="Aperçu de l'évaluation"
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Aperçu</span>
                      </button>
                      <button
                        onClick={() => handlePrintEval(ev)}
                        title="Imprimer l'évaluation"
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Imprimer</span>
                      </button>
                      <button
                        onClick={() => handleDownloadEvalPdf(ev)}
                        title="Télécharger l'évaluation en PDF"
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                      <button
                        onClick={() => handleOpenGrading(ev.id)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold inline-flex items-center transition"
                      >
                        Saisir Notes
                      </button>

                      {canLock && (
                        <button
                          onClick={() => handleToggleLock(ev.id, ev.is_locked)}
                          className={`p-1.5 rounded transition ${
                            ev.is_locked === 1
                              ? 'text-amber-400 hover:bg-amber-500/20'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                          title={ev.is_locked === 1 ? 'Déverrouiller l’évaluation' : 'Verrouiller définitivement'}
                        >
                          {ev.is_locked === 1 ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CRÉER UNE ÉVALUATION */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <span>Créer une Évaluation / Devoir</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEval} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Titre de l'évaluation *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Devoir surveillé N°1 : Trigonométrie"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Classe *</label>
                  <select
                    required
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Sélectionner...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Matière *</label>
                  <select
                    required
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Sélectionner...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Trimestre</label>
                  <select
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="TRIMESTRE_1">1er Trimestre</option>
                    <option value="TRIMESTRE_2">2ème Trimestre</option>
                    <option value="TRIMESTRE_3">3ème Trimestre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Type d'évaluation</label>
                  <select
                    value={newEvalType}
                    onChange={(e) => setNewEvalType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="INTERROGATION">Interrogation</option>
                    <option value="DEVOIR">Devoir Surveillé</option>
                    <option value="COMPOSITION">Composition</option>
                    <option value="EXAMEN">Examen Blanc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Note Max (sur)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newMaxScore}
                    onChange={(e) => setNewMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Coefficient</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newCoef}
                    onChange={(e) => setNewCoef(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Créer l'Évaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GRILLE DE SAISIE DES NOTES */}
      {activeEvalForGrading && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Award className="w-5 h-5 text-indigo-400" />
                  <span>Saisie des Notes • {activeEvalForGrading.title}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Classe : <span className="text-indigo-300 font-semibold">{activeEvalForGrading.class_name}</span> •
                  Matière : <span className="text-slate-200 font-semibold">{activeEvalForGrading.subject_name}</span> •
                  Barème : /{activeEvalForGrading.max_score} (Coef {activeEvalForGrading.coefficient})
                </p>
              </div>
              <button
                onClick={() => setActiveEvalForGrading(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrades} className="space-y-4 pt-4 text-xs">
              <div className="max-h-[55vh] overflow-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-slate-300 min-w-[600px]">
                  <thead className="bg-slate-800/80 sticky top-0 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                    <tr>
                      <th className="p-3">Matricule</th>
                      <th className="p-3">Nom & Prénoms</th>
                      <th className="p-3 w-32">Note /{activeEvalForGrading.max_score}</th>
                      <th className="p-3 w-24">Absent(e)</th>
                      <th className="p-3">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {gradingStudents.map((st, idx) => (
                      <tr key={st.student_id ? `${st.student_id}-${idx}` : `grading-${idx}`} className="hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-bold text-amber-400">{st.matricule}</td>
                        <td className="p-3 font-semibold text-white">
                          {st.last_name} {st.first_name} {st.post_name || ''}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max={activeEvalForGrading.max_score}
                            disabled={st.is_absent}
                            value={st.score ?? ''}
                            onChange={(e) =>
                              handleGradeChange(
                                st.student_id,
                                'score',
                                e.target.value === '' ? null : Number(e.target.value)
                              )
                            }
                            placeholder="-"
                            className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-center text-white font-mono font-bold disabled:opacity-30"
                          />
                        </td>
                        <td className="p-3">
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!st.is_absent}
                              onChange={(e) =>
                                handleGradeChange(st.student_id, 'is_absent', e.target.checked ? 1 : 0)
                              }
                              className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                            />
                            <span className="text-[11px] text-slate-400">Absent</span>
                          </label>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Observations..."
                            value={st.remarks || ''}
                            onChange={(e) => handleGradeChange(st.student_id, 'remarks', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Total inscrits dans cette classe : {gradingStudents.length}
                </span>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveEvalForGrading(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
                  >
                    Enregistrer les Notes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GÉNÉRATION ET IMPRESSION DU BULLETIN TRIMESTRIEL */}
      {showReportCardModal && reportCardData && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Résultats & Bulletins • {reportCardData.class?.name}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {reportCardData.term === 'TRIMESTRE_1' ? '1er Trimestre' : reportCardData.term === 'TRIMESTRE_2' ? '2ème Trimestre' : '3ème Trimestre'} •
                  Moyenne de classe : <span className="font-bold text-amber-300">{reportCardData.classAverage || '-'} / 20</span>
                </p>
              </div>
              <button onClick={() => setShowReportCardModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedStudentForCard ? (
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedStudentForCard(null)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    ← Retour à la liste de classe
                  </button>
                  <div className="flex items-center space-x-2 no-print">
                    {pdfError && (
                      <div className="flex items-center space-x-2 px-3 py-1.5 bg-rose-950/50 border border-rose-800 rounded-lg text-[10px] text-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{pdfError}</span>
                        <button 
                          onClick={() => handleDownloadReportCard(selectedStudentForCard)}
                          className="underline font-bold hover:text-white"
                        >
                          Réessayer
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleDownloadReportCard(selectedStudentForCard)}
                      disabled={generatingPdf}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                      title="Télécharger en PDF"
                    >
                      {generatingPdf ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          <span>Génération...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Télécharger PDF (Vecteur)</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        printReportCardPdf(
                          selectedStudentForCard,
                          reportCardData.establishment
                        )
                      }
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimer ce Bulletin</span>
                    </button>
                  </div>
                </div>

                <div id="printable-report-card-single">
                  <PrintableReportCard
                    report={selectedStudentForCard}
                    establishment={reportCardData.establishment}
                    schoolClass={reportCardData.class}
                    term={reportCardData.term}
                    classAverage={reportCardData.classAverage}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4 text-xs">
                <div className="overflow-x-auto max-h-[60vh]">
                  <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-800/80 sticky top-0 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                      <tr>
                        <th className="p-3">Rang</th>
                        <th className="p-3">Matricule</th>
                        <th className="p-3">Nom & Prénoms</th>
                        <th className="p-3">Moyenne Générale /20</th>
                        <th className="p-3">Total Pondéré</th>
                        <th className="p-3">Appréciation du Conseil</th>
                        <th className="p-3 text-right">Bulletin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {reportCardData.reports.map((r: any, idx: number) => (
                        <tr key={r.student?.id ? `${r.student.id}-${idx}` : `report-${idx}`} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-amber-400">
                            {r.rank ? `${r.rank}e` : '-'}
                          </td>
                          <td className="p-3 font-mono text-slate-400">{r.student.matricule}</td>
                          <td className="p-3 font-semibold text-white">
                            {r.student.last_name} {r.student.first_name}
                          </td>
                          <td className="p-3 font-bold text-base">
                            <span className={r.generalAverage >= 10 ? 'text-emerald-400' : 'text-rose-400'}>
                              {r.generalAverage !== null ? `${r.generalAverage.toFixed(2)} / 20` : 'Non classé'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 font-mono">
                            {r.totalWeightedScore} / {r.totalCoefficients * 20}
                          </td>
                          <td className="p-3 text-slate-300 text-[11px]">{r.appreciation}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedStudentForCard(r)}
                              className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition"
                            >
                              Voir Bulletin
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 no-print">
                  <button
                    onClick={handlePublishReportCards}
                    disabled={publishing}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center space-x-1.5 shadow cursor-pointer transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{publishing ? 'Publication en cours...' : 'Valider & Publier Officiellement les Bulletins (Firestore)'}</span>
                  </button>

                  <button
                    onClick={async () => {
                      for (const r of (reportCardData.reports || [])) {
                        await printReportCardPdf(r, reportCardData.establishment);
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center justify-center space-x-1.5 shadow cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer Tous les Bulletins de la Classe</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL APERÇU ÉVALUATION */}
      {activeEvalPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Eye className="w-5 h-5 text-sky-400" />
                <span>Aperçu des notes : {activeEvalPreview.evaluation?.title}</span>
              </h2>
              <button onClick={() => setActiveEvalPreview(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Matricule</th>
                    <th className="p-3">Nom & Prénoms</th>
                    <th className="p-3 text-center">Note</th>
                    <th className="p-3">Appréciation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {activeEvalPreview.students?.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-400">{s.matricule || '—'}</td>
                      <td className="p-3 font-semibold text-white">{s.last_name} {s.first_name}</td>
                      <td className="p-3 text-center font-bold text-emerald-400">
                        {s.is_absent ? 'ABSENT' : (s.score !== null ? `${s.score} / ${activeEvalPreview.evaluation?.max_score || 20}` : '—')}
                      </td>
                      <td className="p-3 text-slate-400">{s.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
