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
import { LessonsView } from './views/LessonsView.tsx';
import { DecisionsView } from './views/DecisionsView.tsx';
import { AdministrationView } from './views/AdministrationView.tsx';
import { CommercialView } from './views/CommercialView.tsx';
import { StudentView } from './views/StudentView.tsx';
import { ParentView } from './views/ParentView.tsx';
import { DeveloperView } from './views/DeveloperView.tsx';
import { GraduationCap } from 'lucide-react';

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
          {currentTab === 'student-space' && <StudentView />}
          {currentTab === 'parent-space' && <ParentView />}
          {currentTab === 'academic' && <AcademicView />}
          {currentTab === 'students' && <StudentsView />}
          {currentTab === 'lessons' && <LessonsView />}
          {currentTab === 'teachers' && <TeachersView />}
          {currentTab === 'grades' && <GradesView />}
          {currentTab === 'attendance' && <AttendanceView />}
          {currentTab === 'finance' && <FinanceView />}
          {currentTab === 'payroll' && <PayrollView />}
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
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
