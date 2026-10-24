import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Users,
  UserCheck,
  BookOpen,
  Clock,
  DollarSign,
  Wallet,
  FileCheck2,
  ShieldAlert,
  Sliders,
  Award,
  ChevronRight,
  GraduationCap,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types.ts';

export type ActiveTab =
  | 'dashboard'
  | 'student-space'
  | 'parent-space'
  | 'academic'
  | 'students'
  | 'lessons'
  | 'teachers'
  | 'grades'
  | 'attendance'
  | 'finance'
  | 'payroll'
  | 'decisions'
  | 'admin'
  | 'commercial'
  | 'developer';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isMobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  allowedRoles: UserRole[];
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE', 'COMPTABLE', 'SURVEILLANT', 'ENSEIGNANT'],
    description: 'Espace de supervision et métriques métier',
  },
  {
    id: 'student-space',
    label: 'Mon Espace Élève',
    icon: GraduationCap,
    allowedRoles: ['ELEVE', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'SURVEILLANT'],
    description: 'Notes, bulletins, devoirs, emploi du temps & présences',
  },
  {
    id: 'parent-space',
    label: 'Espace Parents & Tuteurs',
    icon: Users,
    allowedRoles: ['PARENT', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES'],
    description: 'Suivi multi-enfants, scolarité, justificatifs & requêtes',
  },
  {
    id: 'academic',
    label: 'Structure & Classes',
    icon: Layers,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES'],
    description: 'Cycles, niveaux, séries A-H & matières',
  },
  {
    id: 'students',
    label: 'Inscriptions & Élèves',
    icon: Users,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE'],
    description: 'Inscriptions, pièces, photos & fiches',
  },
  {
    id: 'lessons',
    label: 'Cahiers de texte',
    icon: BookOpen,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'ENSEIGNANT'],
    description: 'Séances, 21 champs, observations & progression',
  },
  {
    id: 'teachers',
    label: 'Corps Enseignant',
    icon: UserCheck,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'ENSEIGNANT', 'COMPTABLE'],
    description: 'Affectations, horaires & fiches pro',
  },
  {
    id: 'grades',
    label: 'Notes & Bulletins',
    icon: Award,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'ENSEIGNANT'],
    description: 'Évaluations, verrouillage & bulletins',
  },
  {
    id: 'attendance',
    label: 'Surveillance & Pointage',
    icon: Clock,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'SURVEILLANT', 'ENSEIGNANT'],
    description: 'Élèves (appels, discipline) & Enseignants (émargement)',
  },
  {
    id: 'finance',
    label: 'Encaissements & Scolarité',
    icon: DollarSign,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'GESTIONNAIRE', 'COMPTABLE'],
    description: 'Paiements élèves, soldes, échéances & reçus',
  },
  {
    id: 'payroll',
    label: 'Paie & Salaires',
    icon: Wallet,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'COMPTABLE'],
    description: 'Rémunérations, bulletins officiels & validation',
  },
  {
    id: 'decisions',
    label: 'Décisions de Direction',
    icon: FileCheck2,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL'],
    description: 'Coordination, validation des requêtes & arrêtés',
  },
  {
    id: 'admin',
    label: 'Administration & Audit',
    icon: Sliders,
    allowedRoles: ['PROMOTEUR', 'DIRECTEUR_GENERAL'],
    description: 'Comptes, statuts & traçabilité immuable',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileSidebarOpen,
  onCloseMobileSidebar,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const accessibleItems = NAV_ITEMS.filter(
    (item) => user.role === 'ADMIN_GENERAL' || item.allowedRoles.includes(user.role)
  );

  return (
    <>
      {/* Overlay pour mobile */}
      {isMobileSidebarOpen && (
        <div
          onClick={onCloseMobileSidebar}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Barre latérale */}
      <aside
        className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-slate-900 border-r border-slate-800 z-40 transition-transform duration-200 ease-in-out overflow-y-auto flex flex-col justify-between ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation Principale
          </div>

          {accessibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobileSidebar();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-indigo-200" />}
              </button>
            );
          })}
        </div>

        {/* Pied de navigation */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400">
          <div className="flex items-center space-x-2 text-[11px]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">Base locale ACID connectée</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Système prêt pour extension Android & iOS
          </p>
        </div>
      </aside>
    </>
  );
};
