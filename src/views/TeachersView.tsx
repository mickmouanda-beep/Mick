import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  UserPlus,
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Search,
  Filter,
  Trash2,
  Printer,
  ChevronRight,
  Shield,
  Layers,
  GraduationCap
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { SchoolClass, Subject } from '../types.ts';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lundi' },
  { id: 2, label: 'Mardi' },
  { id: 3, label: 'Mercredi' },
  { id: 4, label: 'Jeudi' },
  { id: 5, label: 'Vendredi' },
  { id: 6, label: 'Samedi' },
];

export const TeachersView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courseLogs, setCourseLogs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Onglet actif
  const [activeTab, setActiveTab] = useState<'teachers' | 'schedules' | 'logs'>('teachers');

  // Recherche et filtres en temps réel
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCycleFilter, setSelectedCycleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modal Créer Enseignant
  const [showCreateTeacherModal, setShowCreateTeacherModal] = useState(false);
  const [createLastName, setCreateLastName] = useState('');
  const [createFirstName, setCreateFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Modal Attribution Rapide Matière & Classe
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState<any | null>(null);
  const [assignClassId, setAssignClassId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignCoeff, setAssignCoeff] = useState<number>(1.0);
  const [assignWeeklyHours, setAssignWeeklyHours] = useState<number>(2.0);
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Modal / Vue Emploi du Temps d'un Enseignant
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState<any | null>(null);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [schedClassId, setSchedClassId] = useState('');
  const [schedSubjectId, setSchedSubjectId] = useState('');
  const [schedDay, setSchedDay] = useState<number>(1);
  const [schedStart, setSchedStart] = useState('08:00');
  const [schedEnd, setSchedEnd] = useState('10:00');
  const [schedRoom, setSchedRoom] = useState('');

  // Modal Enregistrer Heures de Cours
  const [showLogModal, setShowLogModal] = useState(false);
  const [logTeacherId, setLogTeacherId] = useState('');
  const [logClassId, setLogClassId] = useState('');
  const [logSubjectId, setLogSubjectId] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logHours, setLogHours] = useState<number>(2.0);
  const [logStatus, setLogStatus] = useState<string>('EFFECTUE');
  const [logTopic, setLogTopic] = useState('');
  const [logRemarks, setLogRemarks] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManageTeachers = hasRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, cData, sData, lData, schedData] = await Promise.all([
        api.getTeachers(),
        api.getClasses(),
        api.getSubjects(),
        api.getCourseLogs(),
        api.getSchedules(),
      ]);
      setTeachers(tData);
      setClasses(cData);
      setSubjects(sData);
      setCourseLogs(lData);
      setSchedules(schedData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des enseignants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrage en temps réel par : Nom, Prénom, Matière, Classe
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (t.last_name && t.last_name.toLowerCase().includes(q)) ||
        (t.first_name && t.first_name.toLowerCase().includes(q)) ||
        (t.full_name && t.full_name.toLowerCase().includes(q)) ||
        (t.username && t.username.toLowerCase().includes(q)) ||
        (t.assigned_subjects && t.assigned_subjects.toLowerCase().includes(q)) ||
        (t.assigned_classes && t.assigned_classes.toLowerCase().includes(q));

      const matchCycle =
        selectedCycleFilter === 'ALL' ||
        (t.assigned_cycles && t.assigned_cycles.toLowerCase().includes(selectedCycleFilter.toLowerCase()));

      const matchStatus =
        selectedStatusFilter === 'ALL' || t.status === selectedStatusFilter;

      return matchSearch && matchCycle && matchStatus;
    });
  }, [teachers, searchTerm, selectedCycleFilter, selectedStatusFilter]);

  // Création Enseignant
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const full = `${createLastName.trim().toUpperCase()} ${createFirstName.trim()}`.trim();
    if (!createLastName.trim() || !username.trim() || !password) {
      setError('Veuillez renseigner le nom de famille, l’identifiant et le mot de passe.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    try {
      await api.createUser({
        fullName: full,
        firstName: createFirstName.trim(),
        lastName: createLastName.trim().toUpperCase(),
        username: username.trim().toLowerCase(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        password,
        role: 'ENSEIGNANT',
      });

      setSuccess(`Compte enseignant créé avec succès : ${full} (Identifiant : ${username.trim().toLowerCase()}).`);
      setShowCreateTeacherModal(false);
      setCreateLastName('');
      setCreateFirstName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setPassword('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte.');
    }
  };

  // Attribution rapide Matière & Classe
  const openAssignModal = (teacher: any) => {
    setSelectedTeacherForAssign(teacher);
    setAssignClassId(classes[0]?.id || '');
    setAssignSubjectId(subjects[0]?.id || '');
    setAssignCoeff(1.0);
    setAssignWeeklyHours(2.0);
    setShowAssignModal(true);
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForAssign || !assignClassId || !assignSubjectId) {
      setError('Veuillez sélectionner la classe et la matière.');
      return;
    }

    setAssigningLoading(true);
    setError(null);
    try {
      await api.assignTeacherSubject(selectedTeacherForAssign.id, {
        classId: assignClassId,
        subjectId: assignSubjectId,
        coefficient: assignCoeff,
        weeklyHours: assignWeeklyHours,
      });

      setSuccess(`Matière attribuée avec succès à ${selectedTeacherForAssign.full_name}.`);
      setShowAssignModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'attribution de la matière.");
    } finally {
      setAssigningLoading(false);
    }
  };

  // Retrait d'attribution
  const handleRemoveAssignment = async (teacherId: string, classSubjectId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette matière pour cet enseignant ?')) return;
    try {
      await api.removeTeacherAssignment(teacherId, classSubjectId);
      setSuccess('Attribution retirée.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du retrait.');
    }
  };

  // Emploi du temps Enseignant : Ajout de créneau avec contrôle de conflit
  const handleAddScheduleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForSchedule || !schedClassId || !schedSubjectId) {
      setError('Veuillez sélectionner la classe et la matière.');
      return;
    }

    try {
      await api.createSchedule({
        teacherId: selectedTeacherForSchedule.id,
        classId: schedClassId,
        subjectId: schedSubjectId,
        dayOfWeek: Number(schedDay),
        startTime: schedStart,
        endTime: schedEnd,
        room: schedRoom.trim() || undefined,
      });

      setSuccess(`Créneau ajouté à l'emploi du temps de ${selectedTeacherForSchedule.full_name}.`);
      setShowAddScheduleModal(false);
      const updatedSchedules = await api.getSchedules();
      setSchedules(updatedSchedules);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'ajout du créneau.");
    }
  };

  const handleDeleteScheduleSlot = async (slotId: string) => {
    if (!confirm('Supprimer ce créneau de cours ?')) return;
    try {
      await api.deleteSchedule(slotId);
      setSuccess('Créneau supprimé.');
      const updatedSchedules = await api.getSchedules();
      setSchedules(updatedSchedules);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
    }
  };

  // Enregistrer heures effectuées
  const handleLogCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await api.logCourseSession({
        teacherId: logTeacherId || user?.id,
        classId: logClassId,
        subjectId: logSubjectId,
        date: logDate,
        hoursDone: logHours,
        status: logStatus,
        topic: logTopic,
        remarks: logRemarks,
      });

      setSuccess('Heures de cours enregistrées avec succès.');
      setShowLogModal(false);
      setLogTopic('');
      setLogRemarks('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filtrer les créneaux pour l'enseignant sélectionné
  const teacherSchedules = useMemo(() => {
    if (!selectedTeacherForSchedule) return [];
    return schedules.filter((s) => s.teacher_id === selectedTeacherForSchedule.id);
  }, [schedules, selectedTeacherForSchedule]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md text-[11px] font-bold tracking-wider uppercase">
              Corps Pédagogique
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-cyan-400" />
            <span>Gestion des Enseignants & Charges Horaires</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tableau officiel du personnel enseignant • Attribution des matières • Emplois du temps Collège & Lycée
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowLogModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Enregistrer des Heures</span>
          </button>

          {canManageTeachers && (
            <button
              onClick={() => setShowCreateTeacherModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouveau Profil Enseignant</span>
            </button>
          )}
        </div>
      </div>

      {/* Alertes d'état */}
      {error && (
        <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-xl flex items-center justify-between text-rose-200 text-xs shadow-md">
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
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center justify-between text-emerald-200 text-xs shadow-md">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Onglets */}
      <div className="flex border-b border-slate-800 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-4 py-3 border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'teachers'
              ? 'border-cyan-500 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Tableau des Enseignants ({teachers.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('schedules');
            if (!selectedTeacherForSchedule && teachers.length > 0) {
              setSelectedTeacherForSchedule(teachers[0]);
            }
          }}
          className={`px-4 py-3 border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'schedules'
              ? 'border-cyan-500 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Emploi du Temps Hebdomadaire</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-3 border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-cyan-500 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Cahier des Heures Effectuées ({courseLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: TABLEAU COMPLET DES ENSEIGNANTS */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          {/* Barre de Recherche et Filtrage en temps réel */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par Nom, Prénom, Matière, Classe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-400 font-medium">Cycle :</span>
                <select
                  value={selectedCycleFilter}
                  onChange={(e) => setSelectedCycleFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tous cycles</option>
                  <option value="COLLEGE">Collège</option>
                  <option value="LYCEE">Lycée</option>
                  <option value="PRIMAIRE">Primaire</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium">Statut :</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tous</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="SUSPENDED">Suspendu</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE DES ENSEIGNANTS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs">Chargement du corps enseignant...</p>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <UserCheck className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-300">
                  {searchTerm ? 'Aucun enseignant ne correspond à votre recherche' : 'Aucun enseignant enregistré'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchTerm
                    ? 'Essayez avec un autre nom, une autre matière ou réinitialisez les filtres.'
                    : 'Le Directeur des Études ou la Direction peut créer les comptes enseignants et leur affecter des matières.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 font-bold">Nom de famille</th>
                      <th className="p-3.5 font-bold">Prénom</th>
                      <th className="p-3.5 font-bold">Matière(s) attribuée(s)</th>
                      <th className="p-3.5 font-bold">Classes prises en charge</th>
                      <th className="p-3.5 font-bold">Niveau d'enseignement</th>
                      <th className="p-3.5 font-bold">Identifiant / Matricule</th>
                      <th className="p-3.5 font-bold">Statut</th>
                      <th className="p-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTeachers.map((t) => {
                      const hasAssignedSubjects = t.assigned_subjects && t.assigned_subjects.trim().length > 0;
                      const hasAssignedClasses = t.assigned_classes && t.assigned_classes.trim().length > 0;
                      const cycles = t.assigned_cycles || 'Collège / Lycée';

                      return (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition">
                          {/* 1. Nom de famille */}
                          <td className="p-3.5 font-bold text-white tracking-wide">
                            {t.last_name || t.full_name?.split(' ')[0] || '-'}
                          </td>

                          {/* 2. Prénom */}
                          <td className="p-3.5 text-slate-200">
                            {t.first_name || t.full_name?.split(' ').slice(1).join(' ') || '-'}
                          </td>

                          {/* 3. Matière(s) attribuée(s) - Affichage direct obligatoire */}
                          <td className="p-3.5">
                            {hasAssignedSubjects ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {t.assigned_subjects.split(',').map((subj: string, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold"
                                  >
                                    {subj.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[11px] italic">
                                Non attribuée
                              </span>
                            )}
                          </td>

                          {/* 4. Classes prises en charge */}
                          <td className="p-3.5">
                            {hasAssignedClasses ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {t.assigned_classes.split(',').map((cls: string, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold"
                                  >
                                    {cls.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">Aucune classe</span>
                            )}
                          </td>

                          {/* 5. Niveau d'enseignement */}
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/20">
                              {cycles}
                            </span>
                          </td>

                          {/* 6. Identifiant / Matricule */}
                          <td className="p-3.5 font-mono text-slate-400 text-xs">
                            {t.username}
                          </td>

                          {/* 7. Statut */}
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                t.status === 'ACTIVE'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/25'
                              }`}
                            >
                              {t.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                            </span>
                          </td>

                          {/* 8. Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {canManageTeachers && (
                                <button
                                  onClick={() => openAssignModal(t)}
                                  title="Attribuer une matière & classe"
                                  className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span className="hidden sm:inline">Attribuer</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedTeacherForSchedule(t);
                                  setActiveTab('schedules');
                                }}
                                title="Voir l'emploi du temps"
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition"
                              >
                                <Calendar className="w-3 h-3 text-cyan-400" />
                                <span className="hidden sm:inline">Planning</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOI DU TEMPS HEBDOMADAIRE (ENSEIGNANT) */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {/* Sélection de l'enseignant */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <label className="text-[11px] text-slate-400 block font-medium">Sélectionner l'Enseignant :</label>
                <select
                  value={selectedTeacherForSchedule?.id || ''}
                  onChange={(e) => {
                    const found = teachers.find((t) => t.id === e.target.value);
                    setSelectedTeacherForSchedule(found || null);
                  }}
                  className="bg-slate-950 border border-slate-800 text-white text-xs rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:border-cyan-500"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Imprimer l'Emploi du Temps</span>
              </button>

              {canManageTeachers && selectedTeacherForSchedule && (
                <button
                  onClick={() => {
                    setSchedClassId(classes[0]?.id || '');
                    setSchedSubjectId(subjects[0]?.id || '');
                    setShowAddScheduleModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un Créneau</span>
                </button>
              )}
            </div>
          </div>

          {/* Grille Hebdomadaire (Lundi à Samedi) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="mb-4 pb-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Planning des cours : {selectedTeacherForSchedule?.full_name || 'Enseignant non sélectionné'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Matières : {selectedTeacherForSchedule?.assigned_subjects || 'Non attribuée'} • Classes : {selectedTeacherForSchedule?.assigned_classes || 'Aucune'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-cyan-400">{teacherSchedules.length}</span>
                <span className="text-[11px] text-slate-500 ml-1">séance(s) programmée(s)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {DAYS_OF_WEEK.map((day) => {
                const daySlots = teacherSchedules
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
                              {canManageTeachers && (
                                <button
                                  onClick={() => handleDeleteScheduleSlot(slot.id)}
                                  title="Supprimer ce créneau"
                                  className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="text-xs font-bold text-white truncate">
                              {slot.subject_name}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                              <span className="font-semibold text-indigo-300">{slot.class_name}</span>
                              <span>{slot.room ? `Salle ${slot.room}` : 'Salle std'}</span>
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
        </div>
      )}

      {/* TAB 3: CAHIER DES HEURES EFFECTUÉES */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {courseLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Clock className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucune séance enregistrée</p>
              <p className="text-xs text-slate-500">
                Enregistrez les séances pédagogiques dispensées pour le suivi des volumes horaires.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Enseignant</th>
                    <th className="p-3.5">Classe</th>
                    <th className="p-3.5">Matière</th>
                    <th className="p-3.5">Durée</th>
                    <th className="p-3.5">Statut</th>
                    <th className="p-3.5">Thème / Chapitre Abordé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {courseLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-slate-300">{log.date}</td>
                      <td className="p-3.5 font-bold text-white">{log.teacher_name}</td>
                      <td className="p-3.5 font-semibold text-indigo-300">{log.class_name}</td>
                      <td className="p-3.5 text-slate-300">{log.subject_name}</td>
                      <td className="p-3.5 font-bold text-cyan-400">{log.hours_done} h</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.status === 'EFFECTUE' ? 'bg-emerald-500/15 text-emerald-300' :
                          log.status === 'RETARD' ? 'bg-amber-500/15 text-amber-300' :
                          'bg-rose-500/15 text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 max-w-xs truncate">{log.topic || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CRÉER PROFIL ENSEIGNANT */}
      {showCreateTeacherModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Nouveau Profil Enseignant</span>
              </h2>
              <button onClick={() => setShowCreateTeacherModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-3.5 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MASSAMBA"
                    value={createLastName}
                    onChange={(e) => setCreateLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Prénom *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alain"
                    value={createFirstName}
                    onChange={(e) => setCreateFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Identifiant de connexion *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: prof.massamba"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Téléphone</label>
                  <input
                    type="text"
                    placeholder="+242 06..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="prof@ecole.cg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Mot de passe temporaire (min. 8 car.) *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTeacherModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Créer le Compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ATTRIBUTION RAPIDE MATIÈRE & CLASSE */}
      {showAssignModal && selectedTeacherForAssign && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  <span>Attribution de Matière & Classe</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enseignant : <strong className="text-white">{selectedTeacherForAssign.full_name}</strong>
                </p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Classe bénéficiaire *</label>
                <select
                  required
                  value={assignClassId}
                  onChange={(e) => setAssignClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Sélectionner une classe...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level_code} {c.serie_code ? `- Série ${c.serie_code}` : ''} • {c.cycle_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Matière attribuée *</label>
                <select
                  required
                  value={assignSubjectId}
                  onChange={(e) => setAssignSubjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Sélectionner une matière...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code} • Coeff: {s.default_coefficient})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Coefficient pour cette classe</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    required
                    value={assignCoeff}
                    onChange={(e) => setAssignCoeff(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Volume horaire hebdo (heures)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="15"
                    required
                    value={assignWeeklyHours}
                    onChange={(e) => setAssignWeeklyHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={assigningLoading}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold shadow-md flex items-center space-x-1.5"
                >
                  {assigningLoading ? (
                    <span>Validation...</span>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      <span>Valider l'Attribution</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AJOUTER UN CRÉNEAU D'EMPLOI DU TEMPS */}
      {showAddScheduleModal && selectedTeacherForSchedule && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  <span>Nouveau Créneau Horaire</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Professeur : <strong className="text-white">{selectedTeacherForSchedule.full_name}</strong>
                </p>
              </div>
              <button onClick={() => setShowAddScheduleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddScheduleSlot} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Classe *</label>
                  <select
                    required
                    value={schedClassId}
                    onChange={(e) => setSchedClassId(e.target.value)}
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
                    value={schedSubjectId}
                    onChange={(e) => setSchedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Sélectionner...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Jour de la semaine *</label>
                <select
                  required
                  value={schedDay}
                  onChange={(e) => setSchedDay(Number(e.target.value))}
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
                  <label className="block text-slate-300 mb-1 font-semibold">Heure de début *</label>
                  <input
                    type="time"
                    required
                    value={schedStart}
                    onChange={(e) => setSchedStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Heure de fin *</label>
                  <input
                    type="time"
                    required
                    value={schedEnd}
                    onChange={(e) => setSchedEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Salle de cours</label>
                <input
                  type="text"
                  placeholder="Ex: Salle 12, Labo SVT..."
                  value={schedRoom}
                  onChange={(e) => setSchedRoom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400">
                <span className="font-semibold text-cyan-400">Contrôle anti-collision :</span> Le système bloque automatiquement tout conflit si l'enseignant ou la classe est déjà occupé(e) sur ce créneau horaire.
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Enregistrer le Créneau
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ENREGISTRER HEURES EFFECTUÉES */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>Enregistrement de Séance de Cours</span>
              </h2>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogCourse} className="space-y-3.5 pt-4 text-xs">
              {user?.role !== 'ENSEIGNANT' && (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Enseignant *</label>
                  <select
                    required
                    value={logTeacherId}
                    onChange={(e) => setLogTeacherId(e.target.value)}
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
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Classe *</label>
                  <select
                    required
                    value={logClassId}
                    onChange={(e) => setLogClassId(e.target.value)}
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
                    value={logSubjectId}
                    onChange={(e) => setLogSubjectId(e.target.value)}
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Date *</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Volume (heures) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    required
                    value={logHours}
                    onChange={(e) => setLogHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Statut</label>
                  <select
                    value={logStatus}
                    onChange={(e) => setLogStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="EFFECTUE">Effectué</option>
                    <option value="RETARD">Retard</option>
                    <option value="ABSENT">Absent</option>
                    <option value="REMPLACE">Remplacé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Thème ou Chapitre Abordé</label>
                <input
                  type="text"
                  placeholder="Ex: Chapitre 3 - Équations du second degré"
                  value={logTopic}
                  onChange={(e) => setLogTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
