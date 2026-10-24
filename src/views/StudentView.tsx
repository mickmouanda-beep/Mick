import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Award,
  Clock,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  ChevronRight,
  Send,
  Bell,
  DollarSign,
  ShieldCheck,
  User,
  Info,
  Layers,
  Sparkles,
  Search,
  Download,
  AlertCircle
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { StudentPortalData, AbsenceJustification } from '../types.ts';

interface StudentViewProps {
  studentIdOverride?: string;
  readOnlyBanner?: boolean;
}

export const StudentView: React.FC<StudentViewProps> = ({ studentIdOverride, readOnlyBanner }) => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'grades' | 'attendance' | 'lessons' | 'finance' | 'announcements'>('dashboard');
  const [selectedTerm, setSelectedTerm] = useState('TRIMESTRE_1');
  const [isJustifModalOpen, setIsJustifModalOpen] = useState(false);
  const [submittingJustif, setSubmittingJustif] = useState(false);
  const [justifSuccessMsg, setJustifSuccessMsg] = useState('');
  const [justifErrorMsg, setJustifErrorMsg] = useState('');

  const [justifForm, setJustifForm] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: '',
    documentUrl: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getStudentPortalData(studentIdOverride);
      setData(res);
    } catch (err: any) {
      console.error('Erreur chargement Espace Élève:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentIdOverride, user]);

  const handleSubmitJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.student?.id) return;
    setSubmittingJustif(true);
    setJustifSuccessMsg('');
    setJustifErrorMsg('');

    try {
      const res = await api.submitAbsenceJustification({
        studentId: data.student.id,
        date: justifForm.date,
        reason: justifForm.reason,
        documentUrl: justifForm.documentUrl || undefined,
      });
      setJustifSuccessMsg(res.message || 'Demande transmise avec succès.');
      setJustifForm({
        date: new Date().toISOString().split('T')[0],
        reason: '',
        documentUrl: '',
      });
      setTimeout(() => {
        setIsJustifModalOpen(false);
        setJustifSuccessMsg('');
        fetchData();
      }, 1500);
    } catch (err: any) {
      setJustifErrorMsg(err.message || "Erreur lors de l'envoi de la justification.");
    } finally {
      setSubmittingJustif(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Chargement de votre dossier scolaire sécurisé...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.student) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white">Dossier élève non disponible</h2>
        <p className="text-sm text-slate-400">
          Aucun compte élève n'est encore associé à votre profil ou aucun élève n'est inscrit dans l'établissement.
        </p>
      </div>
    );
  }

  const { student, establishment, recentGrades, termAverages, overallAverage, bulletins, upcomingEvaluations, attendanceStats, attendanceHistory, disciplinaryIncidents, justifications, lessonLogs, homeworks, announcements, financialSituation, schedules } = data;

  const dayNames = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Bannière Fiche Profil Élève */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4 sm:space-x-5">
            {/* Photo ou Avatar Élève */}
            <div className="relative">
              {student.photo_data ? (
                <img
                  src={student.photo_data}
                  alt={student.first_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xl sm:text-2xl shadow-inner">
                  {student.first_name[0]}{student.last_name[0]}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-emerald-500 text-[10px] font-black rounded-md text-slate-950 uppercase tracking-wider">
                Élève
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
                {establishment.logo_url && (
                  <img
                    src={establishment.logo_url}
                    alt={establishment.name}
                    className="w-5 h-5 object-contain rounded shrink-0 bg-slate-900 border border-slate-700 p-0.5"
                  />
                )}
                <span>{establishment.name}</span>
                <span>•</span>
                <span>Année {establishment.academic_year}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                {student.first_name} {student.last_name} {student.post_name || ''}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-300">
                <span className="px-2 py-0.5 bg-slate-800/80 border border-slate-700 rounded-md font-mono text-amber-300">
                  Matricule : {student.matricule}
                </span>
                <span className="px-2 py-0.5 bg-indigo-900/60 border border-indigo-700/50 rounded-md font-semibold text-indigo-200">
                  Classe : {student.class_name || 'Non affectée'}
                </span>
                {student.cycle_code && (
                  <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-slate-300">
                    Cycle : {student.cycle_code.replace('_', ' ')}
                  </span>
                )}
                {student.main_teacher_name && (
                  <span className="px-2 py-0.5 bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Titulaire : {student.main_teacher_name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Badge de sécurité & Consultation seule */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Moyenne Générale</div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {overallAverage !== null ? `${overallAverage.toFixed(2)} / 20` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Note de conformité */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Espace Élève Eco. Ges. certifié conforme • Données sécurisées en lecture seule.</span>
          </div>
          <button
            onClick={() => setIsJustifModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Justifier une absence</span>
          </button>
        </div>
      </div>

      {/* Navigation par Onglets Spécialisés */}
      <div className="flex border-b border-slate-800 overflow-x-auto pb-px space-x-2">
        {[
          { id: 'dashboard', label: 'Vue Générale', icon: Layers },
          { id: 'grades', label: 'Notes & Bulletins', icon: Award },
          { id: 'attendance', label: 'Assiduité & Discipline', icon: Clock },
          { id: 'lessons', label: 'Cahier de texte & Devoirs', icon: BookOpen },
          { id: 'finance', label: 'Scolarité & Reçus', icon: DollarSign },
          { id: 'announcements', label: 'Annonces & Circulaires', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-indigo-400 border-t-2 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. ONGLET : VUE GÉNÉRALE / TABLEAU DE BORD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Cartes d'indicateurs clés */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Moyenne Générale</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {overallAverage !== null ? `${overallAverage.toFixed(2)}/20` : '—'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Calculée sur {termAverages.length} matières</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Assiduité</span>
                <Clock className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {attendanceStats.absences} <span className="text-xs font-normal text-slate-400">absences</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {attendanceStats.unjustifiedAbsences} non justifiée(s) • {attendanceStats.lates} retard(s)
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Devoirs à Faire</span>
                <BookOpen className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {homeworks.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Travaux scolaires enregistrés</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Prochains Examens</span>
                <Calendar className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {upcomingEvaluations.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Évaluations programmées</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne gauche : Emploi du temps de la semaine */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-white">Emploi du Temps Hebdomadaire</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Classe : {student.class_name}</span>
              </div>

              {schedules.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                  Aucun créneau d'emploi du temps n'est encore configuré pour cette classe.
                </div>
              ) : (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((dayNum) => {
                    const daySlots = schedules.filter((s: any) => s.day_of_week === dayNum);
                    if (daySlots.length === 0) return null;

                    return (
                      <div key={dayNum} className="border border-slate-800 rounded-xl p-3 bg-slate-950/60">
                        <div className="text-xs font-bold text-amber-400 mb-2">{dayNames[dayNum]}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {daySlots.map((slot: any) => (
                            <div
                              key={slot.id}
                              className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 text-xs flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-white block">{slot.subject_name}</span>
                                <span className="text-[11px] text-slate-400">
                                  {slot.teacher_name || 'Enseignant non assigné'} {slot.room ? `• ${slot.room}` : ''}
                                </span>
                              </div>
                              <div className="px-2 py-1 bg-slate-800 rounded text-[11px] font-mono text-indigo-300 font-semibold">
                                {slot.start_time} - {slot.end_time}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Colonne droite : Devoirs et Évaluations à venir */}
            <div className="space-y-6">
              {/* Devoirs */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <h3 className="font-bold text-sm text-white">Devoirs & Travaux</h3>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 bg-sky-950 text-sky-300 rounded font-bold">
                    {homeworks.length}
                  </span>
                </div>

                {homeworks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Aucun devoir à rendre pour l'instant.</p>
                ) : (
                  <div className="space-y-2.5">
                    {homeworks.slice(0, 4).map((hw: any) => (
                      <div key={hw.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{hw.subject_name}</span>
                          <span className="text-[10px] text-amber-400 font-mono font-medium">Pour le {hw.due_date}</span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2">{hw.homework_details}</p>
                        <div className="text-[10px] text-slate-500">Par {hw.teacher_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Évaluations prévues */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">Prochaines Évaluations</h3>
                  </div>
                </div>

                {upcomingEvaluations.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Aucun examen programmé prochainement.</p>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingEvaluations.map((ev: any) => (
                      <div key={ev.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{ev.title}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded font-semibold font-mono">
                            {ev.date}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {ev.subject_name} • Coeff. {ev.coefficient || 1} • Barème /{ev.max_score || 20}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ONGLET : SUIVI DES RÉSULTATS SCOLAIRES & BULLETINS */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          {/* Avertissement de sécurité */}
          <div className="p-4 bg-indigo-950/40 border border-indigo-800/50 rounded-xl flex items-center space-x-3 text-xs text-indigo-200">
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold">Consultation des résultats officiels :</span> Les notes, coefficients et bulletins sont saisis et certifiés par la direction des études et les enseignants. Les élèves ne peuvent en aucun cas modifier les valeurs.
            </div>
          </div>

          {/* Synthèse par Matière & Moyennes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Moyennes par Matière & Appréciations</h3>
                <p className="text-xs text-slate-400">Calcul basé sur les évaluations certifiées du trimestre en cours</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-medium">Période :</span>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                >
                  <option value="TRIMESTRE_1">1er Trimestre</option>
                  <option value="TRIMESTRE_2">2ème Trimestre</option>
                  <option value="TRIMESTRE_3">3ème Trimestre</option>
                </select>
              </div>
            </div>

            {termAverages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Aucune note n'a encore été publiée pour ce trimestre.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Matière</th>
                      <th className="p-3 text-center">Évaluations</th>
                      <th className="p-3 text-right">Moyenne (/20)</th>
                      <th className="p-3">Appréciation Enseignant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {termAverages.map((sub: any) => (
                      <tr key={sub.subject_id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-white">
                          {sub.subject_name}
                          <span className="block text-[10px] text-slate-400 font-normal">{sub.subject_code}</span>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-400">{sub.gradesCount}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          {sub.average !== null ? (
                            <span className={sub.average >= 10 ? 'text-emerald-400' : 'text-rose-400'}>
                              {sub.average.toFixed(2)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3 text-slate-300">
                          <span className="px-2 py-0.5 bg-slate-800 rounded text-[11px] font-medium">
                            {sub.appreciation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-950/80 font-bold border-t border-slate-800">
                    <tr>
                      <td colSpan={2} className="p-3 text-white">Moyenne Générale Pondérée</td>
                      <td className="p-3 text-right font-mono text-amber-400 text-sm">
                        {overallAverage !== null ? `${overallAverage.toFixed(2)} / 20` : '—'}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">Calcul officiel de l'établissement</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Bulletins Officiels Validés & Téléchargeables */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Bulletins Officiels Certifiés</h3>
                <p className="text-xs text-slate-400">Consultation et téléchargement des relevés validés par la direction</p>
              </div>
            </div>

            {bulletins.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Aucun bulletin officiel n'a encore été validé et publié pour cette année.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bulletins.map((b: any) => (
                  <div key={b.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        <div>
                          <span className="font-bold text-sm text-white block">{b.termLabel}</span>
                          <span className="text-[11px] text-slate-400">Année scolaire {b.academicYear}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-800/80 text-emerald-300 rounded-full text-[10px] font-bold">
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-900 rounded-lg text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Moyenne</div>
                        <div className="font-bold text-amber-400 font-mono text-sm">{b.generalAverage?.toFixed(2) || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Rang</div>
                        <div className="font-bold text-indigo-300 font-mono text-sm">{b.rank}e / {b.totalStudentsInClass}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Mention</div>
                        <div className="font-bold text-white text-[11px]">Tableau d'Honneur</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      « {b.directorRemarks} »
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => window.print()}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer le Bulletin</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Liste détaillée des notes obtenues */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Détail des Évaluations & Notes Obtenues</h3>
            {recentGrades.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune note détaillée enregistrée.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Matière</th>
                      <th className="p-3">Intitulé de l'évaluation</th>
                      <th className="p-3 text-center">Coeff.</th>
                      <th className="p-3 text-right">Note</th>
                      <th className="p-3">Commentaire Enseignant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {recentGrades.map((g: any) => (
                      <tr key={g.grade_id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{g.evaluation_date}</td>
                        <td className="p-3 font-semibold text-white">{g.subject_name}</td>
                        <td className="p-3 text-slate-300">{g.evaluation_title}</td>
                        <td className="p-3 text-center font-mono">{g.coefficient || 1}</td>
                        <td className="p-3 text-right font-mono font-bold text-sm">
                          <span className={g.score >= 10 ? 'text-emerald-400' : 'text-rose-400'}>
                            {g.score} / {g.max_score || 20}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 italic">{g.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ONGLET : SUIVI DES PRÉSENCES & DISCIPLINE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Synthèse des compteurs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">Total Appels</span>
              <span className="text-2xl font-black text-white font-mono mt-1 block">{attendanceStats.totalRecords}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-[11px] text-emerald-400 font-medium block">Présences</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">{attendanceStats.presents}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-[11px] text-rose-400 font-medium block">Absences Non Justifiées</span>
              <span className="text-2xl font-black text-rose-400 font-mono mt-1 block">{attendanceStats.unjustifiedAbsences}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-[11px] text-amber-400 font-medium block">Retards Constatés</span>
              <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">{attendanceStats.lates}</span>
            </div>
          </div>

          {/* Formulaire de soumission de justificatif */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Transmission d'un Justificatif d'Absence</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Transmettez une explication ou pièce justificative (certificat médical, billet familial) à la vie scolaire.
                </p>
              </div>
              <button
                onClick={() => setIsJustifModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Rédiger un justificatif</span>
              </button>
            </div>
          </div>

          {/* Historique des justificatifs soumis */}
          {justifications.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Statut des Demandes de Justification Déposées</h3>
              <div className="space-y-3">
                {justifications.map((j) => (
                  <div key={j.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-300 font-bold">Absence du {j.date}</span>
                        <span className="text-slate-500">• Déposé par {j.submitted_by_name || 'Élève'}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          j.status === 'APPROUVE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : j.status === 'REJETE'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {j.status === 'APPROUVE' ? 'Acceptée / Justifiée' : j.status === 'REJETE' ? 'Rejetée' : 'En examen par la vie scolaire'}
                      </span>
                    </div>
                    <p className="text-slate-300 font-medium">Motif : {j.reason}</p>
                    {j.review_note && (
                      <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-800/40">
                        Observation vie scolaire : {j.review_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registre des présences */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Historique Récent des Appels & Ponctualité</h3>
            {attendanceHistory.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun appel enregistré pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3">Agent Enregistreur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {attendanceHistory.map((att: any) => (
                      <tr key={att.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-slate-400">{att.date}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              att.status === 'PRESENT'
                                ? 'bg-emerald-950 text-emerald-300'
                                : att.status === 'RETARD'
                                ? 'bg-amber-950 text-amber-300'
                                : att.status === 'JUSTIFIE'
                                ? 'bg-sky-950 text-sky-300'
                                : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{att.recorded_by_name || 'Surveillant de permanence'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Incidents de conduite */}
          {disciplinaryIncidents.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Incidents & Mesures Disciplinaires</span>
              </h3>
              <div className="space-y-3">
                {disciplinaryIncidents.map((inc) => (
                  <div key={inc.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">{inc.incident_type}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{inc.date} {inc.time || ''}</span>
                    </div>
                    <p className="text-slate-300">{inc.description}</p>
                    {inc.sanction && (
                      <div className="text-[11px] text-rose-300">Sanction : {inc.sanction}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ONGLET : CAHIER DE TEXTE & TRAVAIL SCOLAIRE */}
      {activeTab === 'lessons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Séances Réalisées & Devoirs à Domicile</h3>
              <p className="text-xs text-slate-400">Leçons étudiées, exercices à faire et progression pédagogique</p>
            </div>
          </div>

          {lessonLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              Aucune séance de cours n'a encore été enregistrée pour votre classe.
            </div>
          ) : (
            <div className="space-y-4">
              {lessonLogs.map((les) => (
                <div key={les.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="px-2.5 py-1 bg-indigo-950 border border-indigo-700/50 text-indigo-300 rounded-lg font-bold text-xs">
                        {les.subject_name}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-white">{les.title}</h4>
                        <span className="text-[11px] text-slate-400">
                          {les.curriculum_chapter ? `Chapitre : ${les.curriculum_chapter}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-300 font-mono font-semibold block">{les.date}</span>
                      <span className="text-[11px] text-slate-400">{les.start_time} - {les.end_time} • Par {les.teacher_name}</span>
                    </div>
                  </div>

                  {/* Contenu du cours */}
                  <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Résumé du cours</span>
                    <p>{les.content}</p>
                  </div>

                  {/* Devoirs à faire */}
                  {les.homework && (
                    <div className="text-xs bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Travail demandé / Devoir à la maison :</span>
                        </span>
                        {les.homework_due_date && (
                          <span className="text-[10px] text-amber-400 font-mono font-bold">
                            À rendre pour le : {les.homework_due_date}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-200">{les.homework}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. ONGLET : SCOLARITÉ & REÇUS */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-3 text-xs text-slate-300">
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Situation financière personnelle :</span> Consulter l'état des frais scolaires exigibles, les paiements reçus par la caisse et le solde restant. Les modifications sont réservées au service comptable.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">Frais Totaux de l'Année</span>
              <span className="text-xl font-black text-white font-mono mt-1 block">
                {(financialSituation?.totalFeesDue || 0).toLocaleString()} {establishment.currency || 'FCFA'}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-emerald-400 block">Total Réglé</span>
              <span className="text-xl font-black text-emerald-400 font-mono mt-1 block">
                {(financialSituation?.totalFeesPaid || 0).toLocaleString()} {establishment.currency || 'FCFA'}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-amber-400 block">Solde Restant à Payer</span>
              <span className="text-xl font-black text-amber-400 font-mono mt-1 block">
                {(financialSituation?.balance || 0).toLocaleString()} {establishment.currency || 'FCFA'}
              </span>
            </div>
          </div>

          {/* Historique des paiements & quittances */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Reçus Officiels de Caisse & Paiements Effectués</h3>
            {(!financialSituation?.payments || financialSituation.payments.length === 0) ? (
              <p className="text-xs text-slate-400">Aucun paiement enregistré pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">N° Quittance</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3 text-right">Montant Réglé</th>
                      <th className="p-3">Caissier / Caisse</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {financialSituation.payments.map((pay: any) => (
                      <tr key={pay.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-indigo-300">{pay.receipt_number}</td>
                        <td className="p-3 font-mono text-slate-400">{pay.payment_date}</td>
                        <td className="p-3">{pay.payment_method}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {pay.amount.toLocaleString()} {establishment.currency || 'FCFA'}
                        </td>
                        <td className="p-3 text-slate-400">{pay.cashier_name || 'Caisse Centrale'}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => window.print()}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold flex items-center space-x-1 mx-auto transition cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Imprimer Reçu</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. ONGLET : ANNONCES & CIRCULAIRES */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Communications Officielles de l'Établissement</h3>
              <p className="text-xs text-slate-400">Circulaires, informations d'examens et annonces générales</p>
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              Aucune annonce publiée pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-700/40 rounded text-[10px] font-bold">
                      {ann.category}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(ann.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{ann.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                    Communiqué par {ann.author_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Soumission Justificatif d'Absence */}
      {isJustifModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Dépôt d'un Justificatif d'Absence</h3>
              </div>
              <button
                onClick={() => setIsJustifModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {justifSuccessMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{justifSuccessMsg}</span>
              </div>
            )}

            {justifErrorMsg && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{justifErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitJustification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date de l'absence concernée <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={justifForm.date}
                  onChange={(e) => setJustifForm({ ...justifForm, date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motif circonstancié de l'absence <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex : Maladie soudaine, consultation médicale à l'hôpital, urgence familiale..."
                  value={justifForm.reason}
                  onChange={(e) => setJustifForm({ ...justifForm, reason: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Référence du document / Pièce jointe (facultatif)
                </label>
                <input
                  type="text"
                  placeholder="Ex : Certificat médical Dr. Nkoua N° 4521"
                  value={justifForm.documentUrl}
                  onChange={(e) => setJustifForm({ ...justifForm, documentUrl: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Ce dépôt est enregistré comme <strong className="text-slate-200">En attente</strong>. Le surveillant général ou le responsable habilité examinera la demande avant de valider la régularisation de l'absence.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJustifModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingJustif}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingJustif ? 'Transmission...' : 'Transmettre à la Vie Scolaire'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
