import React, { useState, useEffect } from 'react';
import {
  Users,
  Layers,
  UserCheck,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp,
  Wallet,
  BookOpen,
  FileCheck2,
  ShieldAlert,
  ChevronRight,
  School,
  FileText
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ActiveTab } from '../components/Sidebar.tsx';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, establishment } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Erreur chargement statistiques:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Calcul des indicateurs en temps réel...</p>
        </div>
      </div>
    );
  }

  const role = user?.role || 'ENSEIGNANT';
  const isBrandNew = (stats?.totalStudents || 0) === 0 && (stats?.totalClasses || 0) === 0;

  // Calculs d'indicateurs
  const classesList: any[] = stats?.classesOverview || [];
  const totalCapacity = classesList.reduce((acc, c) => acc + (c.capacity || 0), 0);
  const totalOccupied = classesList.reduce((acc, c) => acc + (c.student_count || 0), 0);
  const totalAvailablePlaces = Math.max(0, totalCapacity - totalOccupied);
  const totalBoys = classesList.reduce((acc, c) => acc + (c.boys_count || 0), 0);
  const totalGirls = classesList.reduce((acc, c) => acc + (c.girls_count || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Bannière de Bienvenue */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {establishment?.logo_url ? (
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 p-1.5 flex items-center justify-center shrink-0 shadow-lg">
              <img
                src={establishment.logo_url}
                alt={establishment.name}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-indigo-900/40 border border-indigo-700/40 p-2 flex items-center justify-center shrink-0 text-amber-400 font-extrabold text-lg shadow-lg">
              {establishment?.name ? establishment.name.substring(0, 2).toUpperCase() : 'EG'}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Portail Administratif & Pédagogique • Espace Métier</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Bonjour, {user?.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {establishment?.name} • Session active en tant que{' '}
              <span className="font-semibold text-amber-300">{user?.role}</span>.
              {establishment?.academic_year && ` Année Scolaire ${establishment.academic_year}.`}
            </p>
          </div>
        </div>

        {/* Raccourcis rapides selon profil */}
        <div className="flex flex-wrap gap-2">
          {['PROMOTEUR', 'DIRECTEUR_GENERAL', 'GESTIONNAIRE'].includes(role) && (
            <button
              onClick={() => onNavigate('students')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Inscrire un Élève</span>
            </button>
          )}

          {['GESTIONNAIRE', 'PROMOTEUR', 'DIRECTEUR_GENERAL'].includes(role) && (
            <button
              onClick={() => onNavigate('finance')}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Encaisser Scolarité</span>
            </button>
          )}

          {['COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL'].includes(role) && (
            <button
              onClick={() => onNavigate('payroll')}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Gérer les Salaires</span>
            </button>
          )}

          {['DIRECTEUR_ETUDES', 'ENSEIGNANT'].includes(role) && (
            <button
              onClick={() => onNavigate('lessons')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Cahier de Texte</span>
            </button>
          )}

          {['SURVEILLANT'].includes(role) && (
            <button
              onClick={() => onNavigate('attendance')}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-orange-600/20 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Faire l'Appel & Pointage</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerte si établissement vierge */}
      {isBrandNew && (
        <div className="p-6 bg-slate-900 border border-indigo-900/60 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 bg-indigo-600/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Établissement Vierge (Zéro Donnée Fictive)</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            La base de données relationnelle est prête et sécurisée. Aucune statistique artificielle n'est affichée. Pour démarrer, ouvrez les classes de l'année scolaire et commencez l'enregistrement des effectifs.
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            {['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES'].includes(role) && (
              <button
                onClick={() => onNavigate('academic')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Ouvrir les Premières Classes
              </button>
            )}
            <button
              onClick={() => onNavigate('students')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700 cursor-pointer"
            >
              Accéder aux Inscriptions
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TABLEAU DE BORD DU PROMOTEUR (SUPERVISION GÉNÉRALE EXHAUSTIVE) */}
      {/* ========================================================================= */}
      {role === 'PROMOTEUR' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <School className="w-4 h-4" />
            <span>Supervision Stratégique & Financière du Promoteur</span>
          </div>

          {/* Grille Principale 4 KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Effectif Général Inscrits</span>
              <p className="text-2xl font-black text-white mt-1">{stats?.totalStudents || 0}</p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>{stats?.registrations?.newStudents || 0} Inscrits</span>
                <span>{stats?.registrations?.reEnrolled || 0} Réinscrits</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Classes Ouvertes & Capacité</span>
              <p className="text-2xl font-black text-white mt-1">
                {stats?.totalClasses || 0} <span className="text-xs text-slate-400 font-normal">classes</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                Capacité: <strong className="text-slate-200">{totalCapacity}</strong> • Dispo: <strong className="text-emerald-400">{totalAvailablePlaces}</strong>
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Trésorerie & Caisse Nette</span>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {(stats?.financialStats?.netCash || 0).toLocaleString()} <span className="text-xs font-normal">FCFA</span>
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>Recettes: {(stats?.financialStats?.totalCollected || 0).toLocaleString()}</span>
                <span>Dépenses: {(stats?.financialStats?.totalExpenses || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Masse Salariale du Personnel</span>
              <p className="text-2xl font-black text-purple-400 mt-1 font-mono">
                {(stats?.payrollOverview?.totalNet || 0).toLocaleString()} <span className="text-xs font-normal">FCFA</span>
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>Versé: {(stats?.payrollOverview?.totalPaid || 0).toLocaleString()}</span>
                <span>À valider: {stats?.payrollOverview?.totalPendingValidation || 0}</span>
              </div>
            </div>
          </div>

          {/* Section Suivi Conduite & Présences du Jour */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Assiduité des Élèves ce Jour</span>
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Présents</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">{stats?.attendanceOverview?.presents || 0}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Absents</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">{stats?.todayAbsences || 0}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Retards</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">{stats?.todayLates || 0}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Incidents disciplinaires enregistrés : {stats?.disciplineOverview?.totalIncidents || 0}
              </p>
            </div>

            {/* Décisions & Arbitrages */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-indigo-400" />
                <span>Dossiers de Décision de Direction</span>
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Total</span>
                  <span className="text-lg font-bold text-white font-mono">{stats?.decisionsOverview?.total || 0}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">En attente</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">{stats?.decisionsOverview?.pending || 0}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Approuvées</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">{stats?.decisionsOverview?.approved || 0}</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('decisions')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
              >
                <span>Accéder au registre des décisions →</span>
              </button>
            </div>

            {/* Personnel & Enseignants */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>Ressources Humaines & Enseignement</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Total Enseignants</span>
                  <span className="font-bold text-white">{stats?.totalTeachers || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Personnel Rémunéré Total</span>
                  <span className="font-bold text-white">{stats?.payrollOverview?.totalStaff || 0}</span>
                </div>
                <button
                  onClick={() => onNavigate('teachers')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 pt-1"
                >
                  <span>Dossiers et affectations →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TABLEAU DE BORD DU DIRECTEUR GÉNÉRAL (EFFECTIFS & COORDINATION) */}
      {/* ========================================================================= */}
      {role === 'DIRECTEUR_GENERAL' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <School className="w-4 h-4" />
            <span>Coordination Générale & Effectifs des Classes</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Total Inscrits</span>
              <p className="text-2xl font-black text-white mt-1">{stats?.totalStudents || 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">Garçons: {totalBoys} • Filles: {totalGirls}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Capacité Globale</span>
              <p className="text-2xl font-black text-white mt-1">{totalCapacity}</p>
              <p className="text-[11px] text-emerald-400 mt-1">{totalAvailablePlaces} places libres</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Professeurs Actifs</span>
              <p className="text-2xl font-black text-cyan-400 mt-1">{stats?.totalTeachers || 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">Affectations vérifiées</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Décisions en Attente</span>
              <p className="text-2xl font-black text-amber-400 mt-1">{stats?.decisionsOverview?.pending || 0}</p>
              <button
                onClick={() => onNavigate('decisions')}
                className="text-[11px] text-indigo-400 hover:underline mt-1 block"
              >
                Arbitrer les requêtes →
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl col-span-2 lg:col-span-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-cyan-400 font-bold block uppercase tracking-wider">Emploi du Temps des Cours</span>
                <p className="text-xs text-slate-300 mt-0.5">Consultez, modifiez, validez les conflits d’horaires et publiez les emplois du temps de l'établissement.</p>
              </div>
              <button
                onClick={() => onNavigate('schedules')}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shrink-0 ml-4"
              >
                Gérer les emplois du temps →
              </button>
            </div>
          </div>

          {/* Tableau Détaillé des Effectifs par Classe (Exigé Section A DG) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Tableau de Bord des Effectifs par Classe</h3>
              <span className="text-xs text-slate-500">{classesList.length} classes configurées</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Classe</th>
                    <th className="p-3">Cycle & Niveau</th>
                    <th className="p-3">Série</th>
                    <th className="p-3 text-center">Capacité</th>
                    <th className="p-3 text-center">Inscrits</th>
                    <th className="p-3 text-center">Places Libres</th>
                    <th className="p-3 text-center">Garçons</th>
                    <th className="p-3 text-center">Filles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {classesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Aucune classe ouverte pour l'instant.
                      </td>
                    </tr>
                  ) : (
                    classesList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{c.name}</td>
                        <td className="p-3">{c.cycle_code} - {c.level_code}</td>
                        <td className="p-3 font-mono text-indigo-400">{c.serie_code || '-'}</td>
                        <td className="p-3 text-center font-mono">{c.capacity}</td>
                        <td className="p-3 text-center font-mono font-bold text-white">{c.student_count}</td>
                        <td className="p-3 text-center font-mono text-emerald-400 font-bold">{c.available_places}</td>
                        <td className="p-3 text-center font-mono text-blue-400">{c.boys_count}</td>
                        <td className="p-3 text-center font-mono text-pink-400">{c.girls_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TABLEAU DE BORD DU DIRECTEUR DES ÉTUDES (PÉDAGOGIE) */}
      {/* ========================================================================= */}
      {role === 'DIRECTEUR_ETUDES' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-400">
            <BookOpen className="w-4 h-4" />
            <span>Direction des Études & Organisation Pédagogique</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Corps Enseignant</span>
              <p className="text-2xl font-black text-white mt-1">{stats?.totalTeachers || 0}</p>
              <button onClick={() => onNavigate('teachers')} className="text-[11px] text-blue-400 hover:underline mt-1">
                Affectations & horaires →
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Divisions de Classe</span>
              <p className="text-2xl font-black text-white mt-1">{stats?.totalClasses || 0}</p>
              <button onClick={() => onNavigate('academic')} className="text-[11px] text-blue-400 hover:underline mt-1">
                Séries A-H & coefficients →
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Cahiers de Texte</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">Actif</p>
              <button onClick={() => onNavigate('lessons')} className="text-[11px] text-emerald-400 hover:underline mt-1">
                Consulter les 21 champs & observations →
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Évaluations & Notes</span>
              <p className="text-2xl font-black text-purple-400 mt-1">Bulletins</p>
              <button onClick={() => onNavigate('grades')} className="text-[11px] text-purple-400 hover:underline mt-1">
                Verrouillage & moyennes →
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl col-span-2 lg:col-span-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-blue-400 font-bold block uppercase tracking-wider">Organisation Pédagogique — Emploi du Temps</span>
                <p className="text-xs text-slate-300 mt-0.5">Programmation hebdomadaire des cours par cycle, répartition des salles et contrôle des conflits d'horaires.</p>
              </div>
              <button
                onClick={() => onNavigate('schedules')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shrink-0 ml-4"
              >
                Gérer les emplois du temps →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TABLEAU DE BORD DU GESTIONNAIRE (INSCRIPTIONS & ENCAISSEMENTS) */}
      {/* ========================================================================= */}
      {role === 'GESTIONNAIRE' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-teal-400">
            <Users className="w-4 h-4" />
            <span>Gestion des Admissions & Encaissements de Scolarité</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Inscriptions Actives</span>
              <p className="text-2xl font-black text-white mt-1">{stats?.totalStudents || 0}</p>
              <button onClick={() => onNavigate('students')} className="text-[11px] text-indigo-400 hover:underline mt-1">
                Gérer les dossiers & fiches →
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Nouvelles Inscriptions</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{stats?.registrations?.newStudents || 0}</p>
              <span className="text-[11px] text-slate-500">Année en cours</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Réinscriptions</span>
              <p className="text-2xl font-black text-blue-400 mt-1">{stats?.registrations?.reEnrolled || 0}</p>
              <span className="text-[11px] text-slate-500">Élèves reconduits</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Caisse Scolarité</span>
              <p className="text-2xl font-black text-teal-400 mt-1 font-mono">
                {(stats?.financialStats?.totalCollected || 0).toLocaleString()} <span className="text-xs">FCFA</span>
              </p>
              <button onClick={() => onNavigate('finance')} className="text-[11px] text-teal-400 hover:underline mt-1">
                Encaisser & imprimer reçus →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TABLEAU DE BORD DU COMPTABLE (PAIE DU PERSONNEL & TRÉSORERIE) */}
      {/* ========================================================================= */}
      {role === 'COMPTABLE' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-purple-400">
            <Wallet className="w-4 h-4" />
            <span>Gestion de la Paie & Rémunérations du Personnel</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Personnel Rémunéré</span>
              <p className="text-2xl font-black text-white mt-1">{stats?.payrollOverview?.totalStaff || 0}</p>
              <span className="text-[11px] text-slate-500">Salariés actifs</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Masse Salariale Nette</span>
              <p className="text-2xl font-black text-purple-400 mt-1 font-mono">
                {(stats?.payrollOverview?.totalNet || 0).toLocaleString()} <span className="text-xs">FCFA</span>
              </p>
              <button onClick={() => onNavigate('payroll')} className="text-[11px] text-purple-400 hover:underline mt-1">
                Fiches et bulletins officiels →
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Salaires Réglés</span>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {(stats?.payrollOverview?.totalPaid || 0).toLocaleString()} <span className="text-xs">FCFA</span>
              </p>
              <span className="text-[11px] text-slate-500">Décaissements effectués</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">À Valider par Direction</span>
              <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                {stats?.payrollOverview?.totalPendingValidation || 0}
              </p>
              <span className="text-[11px] text-slate-500">En attente de signature</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TABLEAU DE BORD DU SURVEILLANT (DISCIPLINE & POINTAGE) */}
      {/* ========================================================================= */}
      {role === 'SURVEILLANT' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-400">
            <Clock className="w-4 h-4" />
            <span>Surveillance Générale & Pointage Enseignants</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Élèves Présents ce Jour</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{stats?.attendanceOverview?.presents || 0}</p>
              <span className="text-[11px] text-slate-500">Sur appel journalier</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Absences Élèves</span>
              <p className="text-2xl font-black text-rose-400 mt-1">{stats?.todayAbsences || 0}</p>
              <button onClick={() => onNavigate('attendance')} className="text-[11px] text-rose-400 hover:underline mt-1">
                Gérer les justificatifs →
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Retards Signalés</span>
              <p className="text-2xl font-black text-amber-400 mt-1">{stats?.todayLates || 0}</p>
              <span className="text-[11px] text-slate-500">Billets de retard</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Incidents de Conduite</span>
              <p className="text-2xl font-black text-purple-400 mt-1">{stats?.disciplineOverview?.totalIncidents || 0}</p>
              <button onClick={() => onNavigate('attendance')} className="text-[11px] text-purple-400 hover:underline mt-1">
                Rapports de discipline →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ENSEIGNANT (ESPACE PÉDAGOGIQUE COMPLET) */}
      {/* ========================================================================= */}
      {role === 'ENSEIGNANT' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <UserCheck className="w-4 h-4" />
              <span>Espace de Travail Pédagogique Personnel</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('lessons')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Cahier de Texte</span>
              </button>
              <button
                onClick={() => onNavigate('grades')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Saisie des Notes</span>
              </button>
            </div>
          </div>

          {/* Grille des 6 indicateurs clés */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block truncate">Classes Affectées</span>
              <p className="text-xl font-black text-white mt-0.5">
                {stats?.teacherSpecific?.assignedClassesCount || 0}
              </p>
              <span className="text-[10px] text-slate-500">Groupes d'élèves</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block truncate">Heures Dispensées</span>
              <p className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
                {stats?.teacherSpecific?.hoursTaught || 0}h
              </p>
              <span className="text-[10px] text-slate-500">
                sur {stats?.teacherSpecific?.scheduledHours || 0}h prévues
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block truncate">Leçons Terminées</span>
              <p className="text-xl font-black text-cyan-400 mt-0.5 font-mono">
                {stats?.teacherSpecific?.completedLessonsCount || 0}
              </p>
              <span className="text-[10px] text-slate-500">
                {stats?.teacherSpecific?.pendingLessonsCount || 0} en cours / à revoir
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block truncate">Notes à Saisir</span>
              <p className="text-xl font-black text-amber-400 mt-0.5 font-mono">
                {stats?.teacherSpecific?.pendingGradesCount || 0}
              </p>
              <span className="text-[10px] text-slate-500">Évaluations ouvertes</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block truncate">Pointages à Confirmer</span>
              <p className="text-xl font-black text-rose-400 mt-0.5 font-mono">
                {stats?.teacherSpecific?.pointagesToConfirmCount || 0}
              </p>
              <span className="text-[10px] text-slate-500">Relevés en attente</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block truncate">Observations DE</span>
              <p className="text-xl font-black text-purple-400 mt-0.5 font-mono">
                {stats?.teacherSpecific?.receivedObservations?.length || 0}
              </p>
              <span className="text-[10px] text-slate-500">Retours pédagogiques</span>
            </div>
          </div>

          {/* Panneaux d'activité : Classes & Matières / Pointages Récents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Emploi du temps & Classes affectées */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Mes Classes & Matières Enseignées</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {stats?.teacherSpecific?.classesList?.length || 0} classe(s)
                </span>
              </div>

              {stats?.teacherSpecific?.classesList && stats.teacherSpecific.classesList.length > 0 ? (
                <div className="space-y-2">
                  {stats.teacherSpecific.classesList.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{c.name}</div>
                        <div className="text-[10px] text-slate-400">
                          Niveau {c.level_code} • {c.student_count || 0} élèves inscrits
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onNavigate('lessons')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-[10px] font-semibold cursor-pointer"
                        >
                          Cahier de texte
                        </button>
                        <button
                          onClick={() => onNavigate('grades')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] font-semibold cursor-pointer"
                        >
                          Notes
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center italic">
                  Aucune classe officiellement affectée pour le moment.
                </p>
              )}
            </div>

            {/* 2. Suivi Horaire & Pointages Récents */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mes Derniers Émargements Journaliers</span>
                </h3>
                <button
                  onClick={() => onNavigate('attendance')}
                  className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                >
                  Tous mes pointages →
                </button>
              </div>

              {stats?.teacherSpecific?.recentAttendances && stats.teacherSpecific.recentAttendances.length > 0 ? (
                <div className="space-y-2">
                  {stats.teacherSpecific.recentAttendances.slice(0, 4).map((att: any) => (
                    <div
                      key={att.id}
                      className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {att.date} • {att.subject_name || 'Cours régulier'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {att.hours_done}h dispensées (sur {att.scheduled_hours}h) • {att.status}
                          {att.delay_minutes > 0 && <span className="text-amber-400 ml-1">(+{att.delay_minutes}min retard)</span>}
                        </div>
                      </div>
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            att.validation_status === 'VALIDE'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : att.validation_status === 'CONFIRME'
                              ? 'bg-blue-500/20 text-blue-300'
                              : att.validation_status === 'CONTESTE'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {att.validation_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center italic">
                  Aucun pointage enregistré pour votre compte à cette date.
                </p>
              )}
            </div>
          </div>

          {/* Observations pédagogiques reçues du Directeur des Études */}
          {stats?.teacherSpecific?.receivedObservations && stats.teacherSpecific.receivedObservations.length > 0 && (
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                <span>Observations Officielles de la Direction des Études sur vos Leçons</span>
              </h3>
              <div className="space-y-2">
                {stats.teacherSpecific.receivedObservations.map((obs: any) => (
                  <div key={obs.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-white">
                      <span>Leçon : {obs.lesson_title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{obs.date}</span>
                    </div>
                    <p className="text-slate-300 italic">"{obs.observation}"</p>
                    {obs.recommendations && (
                      <p className="text-purple-300 text-[11px]">Recommandation : {obs.recommendations}</p>
                    )}
                    <div className="pt-1 flex justify-between items-center text-[10px]">
                      <span className="text-slate-500">Par : {obs.inspector_name}</span>
                      <button
                        onClick={() => onNavigate('lessons')}
                        className="text-indigo-400 hover:underline font-semibold"
                      >
                        Consulter et répondre dans le Cahier de Texte →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Répartition Globale par Cycle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Répartition des Effectifs par Cycle Homologué</span>
        </h2>

        {stats?.cycleDistribution && stats.cycleDistribution.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.cycleDistribution.map((item: any) => {
              const total = stats.totalStudents || 1;
              const pct = Math.round((item.count / total) * 100);
              const cycleNames: Record<string, string> = {
                PRE_SCOLAIRE: 'Préscolaire (P1-P3)',
                PRIMAIRE: 'Primaire (CP1-CM2)',
                COLLEGE: 'Collège (6ème-3ème)',
                LYCEE: 'Lycée (2nde-Tle)',
              };
              return (
                <div key={item.cycle_code} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200">{cycleNames[item.cycle_code] || item.cycle_code}</span>
                    <span className="font-bold text-indigo-400">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 block">{pct}% de l'effectif global</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            Aucun élève affecté dans les cycles pour l'instant.
          </div>
        )}
      </div>

    </div>
  );
};
