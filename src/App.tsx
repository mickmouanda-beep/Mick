import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SetupWizard } from './components/SetupWizard.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, ActiveTab } from './components/Sidebar.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { AcademicView } from './views/AcademicView.tsx';
import { StudentsView } from './views/StudentsView.tsx';
import { TeachersView } from './views/TeachersView.tsx';
import { GradesView } from './views/GradesView.tsx';
import { AttendanceView } from './views/AttendanceView.tsx';
import { FinanceView } from './views/FinanceView.tsx';
import { PayrollView } from './views/PayrollView.tsx';
import { ContractsSalariesView } from './views/ContractsSalariesView.tsx';
import { LessonsView } from './views/LessonsView.tsx';
import { DecisionsView } from './views/DecisionsView.tsx';
import { AdministrationView } from './views/AdministrationView.tsx';
import { CommercialView } from './views/CommercialView.tsx';
import { StudentView } from './views/StudentView.tsx';
import { ParentView } from './views/ParentView.tsx';
import { DeveloperView } from './views/DeveloperView.tsx';
import { TimetableView } from './views/TimetableView.tsx';
import { CurriculumProgramsView } from './views/CurriculumProgramsView.tsx';
import { ExamDossiersView } from './views/ExamDossiersView.tsx';
import { GraduationCap, AlertTriangle } from 'lucide-react';
import { api } from './lib/api.ts';

const MainApp: React.FC = () => {
  const { isSystemInitialized, isAuthenticated, isLoading, user } = useAuth();
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Ajuster l'onglet par défaut selon le rôle de l'utilisateur connecté
  React.useEffect(() => {
    if (user?.role === 'ELEVE') {
      setCurrentTab('student-space');
    } else if (user?.role === 'PARENT') {
      setCurrentTab('parent-space');
    } else {
      setCurrentTab('dashboard');
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-300">
        <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30 mb-4 animate-bounce">
          <GraduationCap className="w-7 h-7" />
        </div>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Démarrage sécurisé d'Eco GES...</p>
      </div>
    );
  }

  // 1. Si la base de données est vierge (premier lancement)
  if (!isSystemInitialized) {
    return <SetupWizard />;
  }

  // 2. Si le système est initialisé mais l'utilisateur n'est pas connecté
  if (!isAuthenticated) {
    return <LoginModal />;
  }

  // 3. Si l'utilisateur est le Gestionnaire d'application (ADMIN_GENERAL)
  // Il accède souverainement au Portail Central « Gestion d'application »
  if (user?.role === 'ADMIN_GENERAL') {
    return <DeveloperView />;
  }

  // 4. Application connectée pour les établissements scolaires
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      <Navbar
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-950 pb-16">
          {currentTab === 'dashboard' && (
            user?.role === 'ELEVE' ? <StudentView /> :
            user?.role === 'PARENT' ? <ParentView /> :
            <DashboardView onNavigate={setCurrentTab} />
          )}
          {currentTab === 'student-space' && (
            user?.role === 'ELEVE' ? <StudentView /> : (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/30 mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white">Accès non autorisé</h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  L'Espace Élève est strictement réservé aux comptes ayant le rôle Élève. Le personnel consulte les dossiers via les modules dédiés.
                </p>
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Retour au Tableau de Bord
                </button>
              </div>
            )
          )}
          {currentTab === 'parent-space' && (
            user?.role === 'PARENT' ? <ParentView /> : (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/30 mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white">Accès non autorisé</h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  L'Espace Parents & Tuteurs est strictement réservé aux comptes ayant le rôle Parent.
                </p>
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Retour au Tableau de Bord
                </button>
              </div>
            )
          )}
          {currentTab === 'academic' && <AcademicView />}
          {currentTab === 'students' && <StudentsView />}
          {currentTab === 'curriculum-programs' && <CurriculumProgramsView />}
          {currentTab === 'exam-dossiers' && <ExamDossiersView />}
          {currentTab === 'lessons' && <LessonsView />}
          {currentTab === 'teachers' && (
            ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES'].includes(user?.role || '') ? (
              <TeachersView />
            ) : (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/30 mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white">Accès non autorisé</h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Le module "Corps Enseignant" est strictement réservé aux comptes Promoteur, Directeur Général et Directeur des Études.
                </p>
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Retour au Tableau de Bord
                </button>
              </div>
            )
          )}
          {currentTab === 'schedules' && <TimetableView />}
          {currentTab === 'grades' && <GradesView />}
          {currentTab === 'attendance' && <AttendanceView />}
          {currentTab === 'finance' && <FinanceView />}
          {currentTab === 'payroll' && <PayrollView />}
          {currentTab === 'contracts-salaries' && <ContractsSalariesView />}
          {currentTab === 'decisions' && <DecisionsView />}
          {currentTab === 'admin' && <AdministrationView />}
          {currentTab === 'commercial' && <DashboardView onNavigate={setCurrentTab} />}
          {currentTab === 'developer' && <DashboardView onNavigate={setCurrentTab} />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const [isDatabaseUnavailable, setIsDatabaseUnavailable] = useState(false);

  React.useEffect(() => {
    const handleUnavailable = (e: any) => {
      console.error('[DATABASE_UNAVAILABLE_BANNER] Déclenchement de la bannière rouge permanente:', e.detail);
      setIsDatabaseUnavailable(true);
    };

    window.addEventListener('database-unavailable', handleUnavailable);

    // Vérification initiale
    api.getStatus()
      .then((res) => {
        if (res && res.databaseAvailable === false) {
          setIsDatabaseUnavailable(true);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('database-unavailable', handleUnavailable);
    };
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-slate-950">
        {isDatabaseUnavailable && (
          <div
            role="alert"
            className="bg-red-600 text-white font-bold py-3.5 px-4 text-center sticky top-0 z-[99999] flex items-center justify-center gap-2.5 shadow-2xl border-b-2 border-red-800"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse text-yellow-300" />
            <span className="text-sm md:text-base font-extrabold tracking-wide uppercase">
              Base de données indisponible : les modifications NE sont PAS sauvegardées
            </span>
          </div>
        )}
        <MainApp />
      </div>
    </AuthProvider>
  );
}
