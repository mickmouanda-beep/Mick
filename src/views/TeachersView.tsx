import React, { useState, useEffect } from 'react';
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
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { SchoolClass, Subject } from '../types.ts';

export const TeachersView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courseLogs, setCourseLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teachers' | 'logs'>('teachers');

  // Modal Créer Enseignant
  const [showCreateTeacherModal, setShowCreateTeacherModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

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

  const canCreateTeacher = hasRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES']);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, cData, sData, lData] = await Promise.all([
        api.getTeachers(),
        api.getClasses(),
        api.getSubjects(),
        api.getCourseLogs(),
      ]);
      setTeachers(tData);
      setClasses(cData);
      setSubjects(sData);
      setCourseLogs(lData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des enseignants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !username.trim() || !password) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    try {
      await api.createUser({
        fullName,
        username,
        email: email || null,
        phone: phone || null,
        password,
        role: 'ENSEIGNANT',
      });

      setSuccess(`Compte enseignant de ${fullName} créé avec succès (Identifiant: ${username}).`);
      setShowCreateTeacherModal(false);
      setFullName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setPassword('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-cyan-400" />
            <span>Gestion du Corps Enseignant & Heures</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Création des comptes • Charges hebdomadaires • Suivi des heures réellement dispensées
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowLogModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Enregistrer des Heures</span>
          </button>

          {canCreateTeacher && (
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
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'teachers'
              ? 'border-cyan-500 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Liste des Enseignants ({teachers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'logs'
              ? 'border-cyan-500 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Cahier des Heures Effectuées ({courseLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: LISTE DES ENSEIGNANTS */}
      {activeTab === 'teachers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {teachers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <UserCheck className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucun enseignant créé</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Le Directeur des Études peut créer les comptes des professeurs et leur attribuer des classes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Nom & Prénoms</th>
                    <th className="p-3.5">Identifiant</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Classes Attribuées</th>
                    <th className="p-3.5">Charge Hebdomadaire</th>
                    <th className="p-3.5">Total Heures Dispensées</th>
                    <th className="p-3.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold text-white flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-300 flex items-center justify-center font-bold text-xs border border-cyan-500/20">
                          {t.full_name[0]}
                        </div>
                        <span>{t.full_name}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">{t.username}</td>
                      <td className="p-3.5 text-slate-300">{t.phone || t.email || '-'}</td>
                      <td className="p-3.5">
                        <span className="font-semibold text-white">{t.classes_count || 0}</span>
                        <span className="text-slate-500 ml-1">classe(s)</span>
                      </td>
                      <td className="p-3.5 font-semibold text-indigo-300">
                        {t.total_weekly_hours || 0} h / semaine
                      </td>
                      <td className="p-3.5 font-bold text-cyan-400">
                        {t.total_hours_done || 0} h
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAHIER DES HEURES EFFECTUÉES */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {courseLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Clock className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucune heure de cours enregistrée</p>
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

      {/* MODAL CRÉER ENSEIGNANT */}
      {showCreateTeacherModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Créer un Compte Enseignant</span>
              </h2>
              <button
                onClick={() => setShowCreateTeacherModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Nom complet de l'Enseignant *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: M. Alain MASSAMBA"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Identifiant de connexion *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: prof.massamba"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
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

      {/* MODAL ENREGISTRER HEURES */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>Enregistrement de Séance de Cours</span>
              </h2>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-white"
              >
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
