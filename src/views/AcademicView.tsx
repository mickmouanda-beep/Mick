import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  BookOpen,
  UserCheck,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Users,
  Search,
  School,
  X,
  ExternalLink,
  ShieldCheck,
  Download,
  Filter,
  Check,
  Calendar,
  Printer,
  Clock,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { SchoolClass, Subject, ClassSubject, User } from '../types.ts';
import { OFFICIAL_CYCLES, OFFICIAL_LYCEE_SERIES, CONGO_SERIES_CATALOG, DetailedSerieRef, CONGO_COLLEGE_CATALOG, CollegeClassRef } from '../constants.ts';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lundi' },
  { id: 2, label: 'Mardi' },
  { id: 3, label: 'Mercredi' },
  { id: 4, label: 'Jeudi' },
  { id: 5, label: 'Vendredi' },
  { id: 6, label: 'Samedi' },
];

export const AcademicView: React.FC = () => {
  const { establishment, hasRole } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'assignment' | 'referentiel' | 'schedules'>('classes');
  const [refSubTab, setRefSubTab] = useState<'lycee' | 'college'>('lycee');
  const [refCategoryFilter, setRefCategoryFilter] = useState<'ALL' | 'GENERAL' | 'TERTIAIRE' | 'INDUSTRIEL' | 'INFORMATIQUE'>('ALL');
  const [importingRef, setImportingRef] = useState<string | null>(null);

  // Emplois du temps par classe (Collège & Lycée)
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedScheduleClassId, setSelectedScheduleClassId] = useState<string>('');
  const [showAddClassScheduleModal, setShowAddClassScheduleModal] = useState(false);
  const [slotDay, setSlotDay] = useState<number>(1);
  const [slotStart, setSlotStart] = useState<string>('08:00');
  const [slotEnd, setSlotEnd] = useState<string>('10:00');
  const [slotSubjectId, setSlotSubjectId] = useState<string>('');
  const [slotTeacherId, setSlotTeacherId] = useState<string>('');
  const [slotRoom, setSlotRoom] = useState<string>('');

  // Modal Création Classe
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<string>('COLLEGE');
  const [selectedLevel, setSelectedLevel] = useState<string>('6ème');
  const [selectedSerie, setSelectedSerie] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [capacity, setCapacity] = useState<number>(45);
  const [mainTeacherId, setMainTeacherId] = useState<string>('');

  // Modal Création Matière
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCycle, setSubjectCycle] = useState('COLLEGE');
  const [defaultCoef, setDefaultCoef] = useState<number>(2.0);

  // Modal Attribution Matière à Classe
  const [selectedClassForSubjects, setSelectedClassForSubjects] = useState<string>('');
  const [classSubjectsList, setClassSubjectsList] = useState<ClassSubject[]>([]);
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignCoef, setAssignCoef] = useState<number>(2.0);
  const [assignWeeklyHours, setAssignWeeklyHours] = useState<number>(4.0);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManage = hasRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clsData, subjData, teachData, schedData] = await Promise.all([
        api.getClasses(),
        api.getSubjects(),
        api.getTeachers(),
        api.getSchedules(),
      ]);
      setClasses(clsData);
      setSubjects(subjData);
      setTeachers(teachData);
      setSchedules(schedData);

      if (clsData.length > 0) {
        if (!selectedClassForSubjects) setSelectedClassForSubjects(clsData[0].id);
        if (!selectedScheduleClassId) setSelectedScheduleClassId(clsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données académiques.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClassScheduleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleClassId || !slotSubjectId || !slotTeacherId) {
      setError('Veuillez sélectionner la matière et le professeur.');
      return;
    }
    setError(null);
    try {
      await api.createSchedule({
        classId: selectedScheduleClassId,
        teacherId: slotTeacherId,
        subjectId: slotSubjectId,
        dayOfWeek: Number(slotDay),
        startTime: slotStart,
        endTime: slotEnd,
        room: slotRoom.trim() || undefined,
      });
      setSuccess('Créneau ajouté à l’emploi du temps avec succès.');
      setShowAddClassScheduleModal(false);
      const updated = await api.getSchedules();
      setSchedules(updated);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’ajout du créneau.');
    }
  };

  const handleDeleteClassScheduleSlot = async (slotId: string) => {
    if (!confirm('Supprimer ce cours de l’emploi du temps ?')) return;
    try {
      await api.deleteSchedule(slotId);
      setSuccess('Créneau supprimé.');
      const updated = await api.getSchedules();
      setSchedules(updated);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mettre à jour les niveaux disponibles quand le cycle change
  const currentLevels = OFFICIAL_CYCLES.find((c) => c.code === selectedCycle)?.levels || [];

  const handleCycleChange = (cycle: string) => {
    setSelectedCycle(cycle);
    const levels = OFFICIAL_CYCLES.find((c) => c.code === cycle)?.levels || [];
    setSelectedLevel(levels[0] || '');
    if (cycle !== 'LYCEE') {
      setSelectedSerie('');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!className.trim()) {
      setError('Le nom de la classe est obligatoire.');
      return;
    }

    try {
      await api.createClass({
        name: className.trim(),
        cycleCode: selectedCycle,
        levelCode: selectedLevel,
        serieCode: selectedCycle === 'LYCEE' && selectedSerie ? selectedSerie : null,
        room: room.trim() || null,
        capacity: Number(capacity),
        mainTeacherId: mainTeacherId || null,
      });

      setSuccess(`La classe "${className}" a été créée avec succès.`);
      setShowClassModal(false);
      setClassName('');
      setRoom('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la classe.');
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!window.confirm(`Confirmez-vous la suppression de la classe "${name}" ?`)) return;
    setError(null);
    try {
      await api.deleteClass(id);
      setSuccess(`Classe "${name}" supprimée.`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createSubject({
        code: subjectCode,
        name: subjectName,
        cycleCode: subjectCycle,
        defaultCoefficient: defaultCoef,
      });
      setSuccess(`Matière "${subjectName}" enregistrée.`);
      setShowSubjectModal(false);
      setSubjectCode('');
      setSubjectName('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Charger les matières de la classe sélectionnée
  useEffect(() => {
    if (selectedClassForSubjects) {
      api.getClassSubjects(selectedClassForSubjects).then(setClassSubjectsList).catch(console.error);
    }
  }, [selectedClassForSubjects]);

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForSubjects || !assignSubjectId) return;
    try {
      await api.assignClassSubject(selectedClassForSubjects, {
        subjectId: assignSubjectId,
        teacherId: assignTeacherId || null,
        coefficient: assignCoef,
        weeklyHours: assignWeeklyHours,
      });
      setSuccess('Matière et enseignant affectés à la classe.');
      const updated = await api.getClassSubjects(selectedClassForSubjects);
      setClassSubjectsList(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleImportRef = async (refCode?: string, cycleCode: 'LYCEE' | 'COLLEGE' = 'LYCEE') => {
    setError(null);
    setSuccess(null);
    setImportingRef(refCode || (cycleCode === 'LYCEE' ? 'ALL' : 'ALL-COL'));
    try {
      const res = await api.importPedagogicalReference({ referenceId: refCode ? `REF-${refCode}` : undefined, cycleCode });
      setSuccess(res.message);
      const updatedSubjs = await api.getSubjects();
      setSubjects(updatedSubjs);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’importation');
    } finally {
      setImportingRef(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Structure Scolaire & Classes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Référentiel officiel national du Congo-Brazzaville • Séries Lycée A, D, C, G1-G3, BG, F1-F6, H1-H6
          </p>
        </div>

        {canManage && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSubjectModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Nouvelle Matière</span>
            </button>
            <button
              onClick={() => setShowClassModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Ouvrir une Classe</span>
            </button>
          </div>
        )}
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

      {/* Onglets */}
      <div className="flex border-b border-slate-800 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'classes'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Classes Ouvertes ({classes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'subjects'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Répertoire des Matières ({subjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assignment')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'assignment'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Attribution Matières & Enseignants</span>
        </button>

        <button
          onClick={() => setActiveTab('referentiel')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'referentiel'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Référentiel National (Congo-Brazzaville)</span>
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'schedules'
              ? 'border-cyan-500 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span>Emplois du Temps par Classe ({schedules.length})</span>
        </button>
      </div>

      {/* TAB 1: LISTE DES CLASSES */}
      {activeTab === 'classes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {classes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <School className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucune classe ouverte pour l'instant</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Configurez les divisions scolaires homologuées de votre établissement pour cette année scolaire.
              </p>
              {canManage && (
                <button
                  onClick={() => setShowClassModal(true)}
                  className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ouvrir la première classe</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Classe</th>
                    <th className="p-3.5">Cycle</th>
                    <th className="p-3.5">Niveau</th>
                    <th className="p-3.5">Série (Lycée)</th>
                    <th className="p-3.5">Professeur Principal</th>
                    <th className="p-3.5">Effectif / Capacité</th>
                    <th className="p-3.5">Salle</th>
                    {canManage && <th className="p-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold text-white flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span>{cls.name}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {cls.cycle_code}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-200">{cls.level_code}</td>
                      <td className="p-3.5">
                        {cls.serie_code ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Série {cls.serie_code}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {cls.main_teacher_name || <span className="text-slate-500 italic">Non désigné</span>}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-white">{cls.student_count || 0}</span>
                          <span className="text-slate-500">/ {cls.capacity}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-400">{cls.room || '-'}</td>
                      {canManage && (
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteClass(cls.id, cls.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            title="Supprimer la classe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RÉPERTOIRE DES MATIÈRES */}
      {activeTab === 'subjects' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {subjects.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <BookOpen className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucune matière configurée</p>
              <p className="text-xs text-slate-500">
                Ajoutez les matières enseignées dans votre établissement scolaire.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Intitulé de la Matière</th>
                    <th className="p-3.5">Cycle</th>
                    <th className="p-3.5">Coefficient Standard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-bold text-amber-400">{s.code}</td>
                      <td className="p-3.5 font-semibold text-white">{s.name}</td>
                      <td className="p-3.5 text-slate-400">{s.cycle_code}</td>
                      <td className="p-3.5 font-semibold text-slate-200">x{s.default_coefficient}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ATTRIBUTION MATIÈRES & ENSEIGNANTS */}
      {activeTab === 'assignment' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-72">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Sélectionner la Classe à Configurer
              </label>
              <select
                value={selectedClassForSubjects}
                onChange={(e) => setSelectedClassForSubjects(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400 text-right">
              Matières configurées pour cette classe : <span className="font-bold text-white">{classSubjectsList.length}</span>
            </div>
          </div>

          {canManage && (
            <form onSubmit={handleAssignSubject} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Matière *</label>
                <select
                  required
                  value={assignSubjectId}
                  onChange={(e) => setAssignSubjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="">Sélectionner matière...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Enseignant Titulaire</label>
                <select
                  value={assignTeacherId}
                  onChange={(e) => setAssignTeacherId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="">Attribuer plus tard...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Coefficient *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={assignCoef}
                  onChange={(e) => setAssignCoef(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Heures/Semaine *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={assignWeeklyHours}
                  onChange={(e) => setAssignWeeklyHours(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
              >
                Attribuer Matière
              </button>
            </form>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 min-w-[600px]">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Matière</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Enseignant Affecté</th>
                  <th className="p-3.5">Coefficient</th>
                  <th className="p-3.5">Volume Horaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {classSubjectsList.map((cs) => (
                  <tr key={cs.class_subject_id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-white">{cs.subject_name}</td>
                    <td className="p-3.5 font-mono text-amber-400">{cs.subject_code}</td>
                    <td className="p-3.5 text-slate-200">
                      {cs.teacher_name || <span className="text-slate-500 italic">Non assigné</span>}
                    </td>
                    <td className="p-3.5 font-semibold text-indigo-300">x{cs.coefficient}</td>
                    <td className="p-3.5 text-slate-300">{cs.weekly_hours} h / sem.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RÉFÉRENTIEL NATIONAL CONGO-BRAZZAVILLE (PARTIE I) */}
      {activeTab === 'referentiel' && (
        <div className="space-y-6">
          {/* Bannière institutionnelle officielle */}
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Programme Officiel National • Congo-Brazzaville
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-400 bg-slate-800">
                    MEPSA / METP
                  </span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Nomenclature & Répertoire National des Séries et Matières
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Documentation de référence conforme aux programmes officiels du secondaire congolais. Distinction stricte entre matières <strong>Confirmées</strong> (programmes homologués), <strong>Provisoires</strong> (en déploiement) et <strong>À vérifier</strong> (spécificités locales).
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  <a
                    href="https://ecolesaucongo.com/series.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4"
                  >
                    <span>Consulter la source officielle : ecolesaucongo.com/series.html</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {canManage && (
                <div className="shrink-0">
                  <button
                    onClick={() => handleImportRef(undefined, 'LYCEE')}
                    disabled={importingRef === 'ALL'}
                    className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{importingRef === 'ALL' ? 'Importation en cours...' : 'Importer Toutes les Matières Nationales (Lycée)'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>


          {/* Sous-onglets Lycée / Collège */}
          <div className="flex border-b border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setRefSubTab('lycee')}
              className={`px-4 py-2 border-b-2 transition ${
                refSubTab === 'lycee' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400'
              }`}
            >
              Référentiel Lycée
            </button>
            <button
              onClick={() => setRefSubTab('college')}
              className={`px-4 py-2 border-b-2 transition ${
                refSubTab === 'college' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-400'
              }`}
            >
              Référentiel Collège
            </button>
          </div>

          {/* Légende des statuts de validation */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-start space-x-2 bg-slate-900/60 p-2.5 rounded-xl border border-emerald-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
              <div>
                <p className="font-bold text-emerald-300">Confirmé Officiel</p>
                <p className="text-[10px] text-slate-400">Homologué par décret ministériel et ecolesaucongo.com</p>
              </div>
            </div>
            <div className="flex items-start space-x-2 bg-slate-900/60 p-2.5 rounded-xl border border-amber-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 shrink-0" />
              <div>
                <p className="font-bold text-amber-300">Programme Provisoire</p>
                <p className="text-[10px] text-slate-400">Circulaire d'expérimentation en cours de généralisation</p>
              </div>
            </div>
            <div className="flex items-start space-x-2 bg-slate-900/60 p-2.5 rounded-xl border border-blue-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 mt-1 shrink-0" />
              <div>
                <p className="font-bold text-blue-300">À vérifier / Spécifique</p>
                <p className="text-[10px] text-slate-400">Validation par la Direction avant verrouillage des bulletins</p>
              </div>
            </div>
          </div>


          {/* Filtres par filières (pour Lycée) */}
          {refSubTab === 'lycee' && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-semibold flex items-center space-x-1 shrink-0 mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Filière :</span>
              </span>
              {[
                { id: 'ALL', label: 'Toutes les Séries' },
                { id: 'GENERAL', label: 'Enseignement Général (A, C, D)' },
                { id: 'TERTIAIRE', label: 'Technique Tertiaire (G1, G2, G3, BG)' },
                { id: 'INDUSTRIEL', label: 'Technique Industriel (E, F1, F2, F3, F4)' },
                { id: 'INFORMATIQUE', label: 'Technologies & Info (H1, H2, H3, H4, H5)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setRefCategoryFilter(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition ${
                    refCategoryFilter === cat.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Grille des séries / classes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {refSubTab === 'lycee' ? (
              CONGO_SERIES_CATALOG.filter((s) => refCategoryFilter === 'ALL' || s.category === refCategoryFilter).map((serie) => (
                <div
                  key={serie.code}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm transition space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded font-black text-sm bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Série {serie.code}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {serie.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm mt-1.5">{serie.name}</h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 border ${
                        serie.validationStatus === 'CONFIRME'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : serie.validationStatus === 'PROVISOIRE'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {serie.validationStatus === 'CONFIRME' ? '✓ Confirmé' : serie.validationStatus === 'PROVISOIRE' ? 'Provisoire' : 'À vérifier'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{serie.description}</p>

                  {/* Tableau des matières de la série */}
                  <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 flex justify-between">
                      <span>Matières recommandées</span>
                      <span>Coefficient officiel</span>
                    </div>
                    <div className="divide-y divide-slate-800/50 max-h-48 overflow-y-auto">
                      {serie.subjects.map((sub) => (
                        <div key={sub.code} className="px-3 py-2 text-xs flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] text-amber-400 font-bold">{sub.code}</span>
                            <span className="text-slate-200">{sub.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-indigo-300">Coef {sub.defaultCoef}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                sub.status === 'CONFIRME' ? 'bg-emerald-400' : sub.status === 'PROVISOIRE' ? 'bg-amber-400' : 'bg-blue-400'
                              }`}
                              title={`Statut : ${sub.status}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-500 truncate max-w-[200px]">
                      Source : {serie.sourceTitle}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleImportRef(serie.code)}
                        disabled={importingRef === serie.code}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-lg font-semibold transition border border-slate-700 text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{importingRef === serie.code ? 'Importation...' : 'Importer cette série'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              CONGO_COLLEGE_CATALOG.map((col) => (
                <div
                  key={col.code}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm transition space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded font-black text-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {col.levelName}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {col.cycleName}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm mt-1.5">{col.name}</h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 border ${
                        col.validationStatus === 'CONFIRME'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : col.validationStatus === 'PROVISOIRE'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {col.validationStatus === 'CONFIRME' ? '✓ Confirmé' : col.validationStatus === 'PROVISOIRE' ? 'Provisoire' : 'À vérifier'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{col.description}</p>

                  {/* Tableau des matières de la classe */}
                  <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 flex justify-between">
                      <span>Matières recommandées</span>
                      <span className="flex items-center space-x-3">
                        <span>Coef</span>
                        <span>h/sem</span>
                      </span>
                    </div>
                    <div className="divide-y divide-slate-800/50 max-h-48 overflow-y-auto">
                      {col.subjects.map((sub) => (
                        <div key={sub.code} className="px-3 py-2 text-xs flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] text-amber-400 font-bold">{sub.code}</span>
                            <span className="text-slate-200">{sub.name}</span>
                          </div>
                          <div className="flex items-center space-x-3 text-mono font-bold text-indigo-300">
                            <span>{sub.defaultCoef}</span>
                            <span>{sub.weeklyHours}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-500 truncate max-w-[200px]">
                      Source : {col.sourceTitle}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleImportRef(`COL-${col.code}`)}
                        disabled={importingRef === `COL-${col.code}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white rounded-lg font-semibold transition border border-slate-700 text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{importingRef === `COL-${col.code}` ? 'Importation...' : 'Importer cette classe'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: EMPLOIS DU TEMPS PAR CLASSE (COLLÈGE & LYCÉE) */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <label className="text-[11px] text-slate-400 block font-medium">Sélectionner la Classe :</label>
                <select
                  value={selectedScheduleClassId}
                  onChange={(e) => setSelectedScheduleClassId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-white text-xs rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level_code} {c.serie_code ? `- Série ${c.serie_code}` : ''} • {c.cycle_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Imprimer l'Emploi du Temps</span>
              </button>

              {canManage && selectedScheduleClassId && (
                <button
                  onClick={() => {
                    setSlotSubjectId(subjects[0]?.id || '');
                    setSlotTeacherId(teachers[0]?.id || '');
                    setShowAddClassScheduleModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un Cours</span>
                </button>
              )}
            </div>
          </div>

          {/* Grille de l'Emploi du Temps de la classe */}
          {(() => {
            const currentClass = classes.find((c) => c.id === selectedScheduleClassId);
            const classSlots = schedules.filter((s) => s.class_id === selectedScheduleClassId);

            return (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="mb-4 pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <span>Emploi du Temps Officiel : {currentClass?.name || 'Sélectionnez une classe'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Niveau : {currentClass?.level_code} {currentClass?.serie_code ? `• Série ${currentClass.serie_code}` : ''} • Cycle : {currentClass?.cycle_code} • Salle : {currentClass?.room || 'Non assignée'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-cyan-400">{classSlots.length}</span>
                    <span className="text-[11px] text-slate-500 ml-1">cours programmés cette semaine</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  {DAYS_OF_WEEK.map((day) => {
                    const daySlots = classSlots
                      .filter((s) => s.day_of_week === day.id)
                      .sort((a, b) => a.start_time.localeCompare(b.start_time));

                    return (
                      <div key={day.id} className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                        <div className="bg-slate-800/80 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{day.label}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400">
                            {daySlots.length}
                          </span>
                        </div>

                        <div className="p-2 space-y-2 flex-1 min-h-[140px]">
                          {daySlots.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-center p-3 text-[11px] text-slate-600 italic">
                              Aucun cours
                            </div>
                          ) : (
                            daySlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="p-2.5 bg-slate-900 border border-cyan-500/20 rounded-lg hover:border-cyan-500/50 transition group relative"
                              >
                                <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300 font-bold mb-1">
                                  <span>{slot.start_time} - {slot.end_time}</span>
                                  {canManage && (
                                    <button
                                      onClick={() => handleDeleteClassScheduleSlot(slot.id)}
                                      title="Supprimer ce cours"
                                      className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-xs font-bold text-white truncate">
                                  {slot.subject_name}
                                </div>
                                <div className="text-[10px] text-indigo-300 font-semibold truncate mt-0.5">
                                  {slot.teacher_name || 'Prof. non assigné'}
                                </div>
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  {slot.room ? `Salle ${slot.room}` : 'Salle de classe'}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL AJOUT CRÉNEAU CLASSE */}
      {showAddClassScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  <span>Programmer un Cours</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Classe : <strong className="text-white">{classes.find(c => c.id === selectedScheduleClassId)?.name}</strong>
                </p>
              </div>
              <button onClick={() => setShowAddClassScheduleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClassScheduleSlot} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Matière *</label>
                <select
                  required
                  value={slotSubjectId}
                  onChange={(e) => setSlotSubjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Sélectionner une matière...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Enseignant / Professeur *</label>
                <select
                  required
                  value={slotTeacherId}
                  onChange={(e) => setSlotTeacherId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Sélectionner un enseignant...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Jour de la semaine *</label>
                <select
                  required
                  value={slotDay}
                  onChange={(e) => setSlotDay(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Heure Début *</label>
                  <input
                    type="time"
                    required
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Heure Fin *</label>
                  <input
                    type="time"
                    required
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Salle spécifique (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Salle 14, Labo Informatique..."
                  value={slotRoom}
                  onChange={(e) => setSlotRoom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400">
                <span className="font-semibold text-cyan-400">Détection de collision :</span> Le système vérifie en temps réel que ni le professeur ni la classe ne sont déjà en cours sur ce créneau horaire.
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddClassScheduleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Valider le Cours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClassModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <School className="w-5 h-5 text-indigo-400" />
                <span>Ouvrir une Nouvelle Classe</span>
              </h2>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cycle *</label>
                  <select
                    value={selectedCycle}
                    onChange={(e) => handleCycleChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    {OFFICIAL_CYCLES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Niveau *</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    {currentLevels.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Si Lycée : Choix obligatoire ou optionnel de la Série officielle */}
              {selectedCycle === 'LYCEE' && (
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">
                    Série Officielle Lycée (Congo-Brazzaville)
                  </label>
                  <select
                    value={selectedSerie}
                    onChange={(e) => setSelectedSerie(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-amber-600/50 rounded-lg text-xs text-white"
                  >
                    <option value="">Tronc commun / Sans série</option>
                    {OFFICIAL_LYCEE_SERIES.map((serie) => (
                      <option key={serie} value={serie}>
                        Série {serie}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Séries générales (A, D, C) et techniques/professionnelles (G1-G3, BG, F1-F6, H1-H6)
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom d'affichage de la classe *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 3ème A, Terminale D 1, CP1 B..."
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Salle de cours</label>
                  <input
                    type="text"
                    placeholder="Ex: Salle 04, Bâtiment B"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Capacité maximale</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Professeur Principal / Titulaire
                </label>
                <select
                  value={mainTeacherId}
                  onChange={(e) => setMainTeacherId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="">Désigner ultérieurement</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Enregistrer la Classe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE MATIÈRE */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Créer une Matière</span>
              </h2>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Code Matière *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MATH, FRAN, PC, SVT..."
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Intitulé Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mathématiques & Algèbre"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cycle *</label>
                  <select
                    value={subjectCycle}
                    onChange={(e) => setSubjectCycle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    {OFFICIAL_CYCLES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Coef. par défaut</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={defaultCoef}
                    onChange={(e) => setDefaultCoef(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Créer la Matière
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
