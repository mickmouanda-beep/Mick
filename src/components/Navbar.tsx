import React, { useState } from 'react';
import {
  GraduationCap,
  LogOut,
  User as UserIcon,
  Shield,
  Sparkles,
  Menu,
  X,
  Building,
  KeyRound,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types.ts';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const ROLE_LABELS: Record<UserRole, { label: string; badgeColor: string }> = {
  ADMIN_GENERAL: { label: 'Administrateur Général Eco GES', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  PROMOTEUR: { label: 'Promoteur (Propriétaire)', badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  DIRECTEUR_GENERAL: { label: 'Directeur Général', badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  DIRECTEUR_ETUDES: { label: 'Directeur des Études', badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  GESTIONNAIRE: { label: 'Secrétariat / Scolarité', badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  COMPTABLE: { label: 'Comptable / Caisse', badgeColor: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  SURVEILLANT: { label: 'Surveillant Général', badgeColor: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  ENSEIGNANT: { label: 'Enseignant', badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  ELEVE: { label: 'Élève', badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  PARENT: { label: 'Parent / Tuteur Légal', badgeColor: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
};

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const { user, establishment, logout, demoSwitchUser } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  const handleSwitch = async (username: string) => {
    setSwitchLoading(true);
    try {
      await demoSwitchUser(username);
      setShowRoleMenu(false);
    } catch {
      // Ignorer si non disponible
    } finally {
      setSwitchLoading(false);
    }
  };

  const roleMeta = user ? ROLE_LABELS[user.role] : { label: 'Utilisateur', badgeColor: 'bg-slate-700 text-slate-300 border-slate-600' };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Gauche : Bouton menu mobile + Logo & Titre */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label="Menu de navigation"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
                {establishment?.logo_url ? (
                  <img
                    src={establishment.logo_url}
                    alt={establishment.name}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-tight text-white text-base sm:text-lg flex items-center space-x-1.5">
                  <span>Eco.</span>
                  <span className="text-amber-400 text-xs sm:text-sm font-semibold uppercase tracking-wider">Ges.</span>
                </span>
                {establishment?.code && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold hidden sm:inline-block">
                    {establishment.code}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate max-w-[220px]">
                {establishment?.name || 'Plateforme Scolaire Multi-Établissements'}
              </p>
            </div>
          </div>

          {establishment?.academic_year && (
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 ml-2">
              <Building className="w-3 h-3 mr-1 text-slate-400" />
              {establishment.academic_year} • {establishment.currency || 'FCFA'}
            </span>
          )}
        </div>

        {/* Droite : Sélecteur de rôle Démo + Profil utilisateur */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Sélecteur de rôle réservé à l'Administrateur Général Technique */}
          {user?.role === 'ADMIN_GENERAL' && (
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 text-purple-200 transition"
                title="Supervision : Tester les rôles métiers"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Supervision :</span>
                <span className="font-semibold text-white">{roleMeta.label.split(' ')[0]}</span>
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-purple-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Console Admin Général</span>
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  {[
                    { role: 'PROMOTEUR', username: 'promoteur', label: '1. Promoteur' },
                    { role: 'DIRECTEUR_GENERAL', username: 'dg', label: '2. Directeur Général' },
                    { role: 'DIRECTEUR_ETUDES', username: 'de', label: '3. Directeur des Études' },
                    { role: 'GESTIONNAIRE', username: 'gestionnaire', label: '4. Secrétariat / Scolarité' },
                    { role: 'COMPTABLE', username: 'comptable', label: '5. Comptable / Caisse' },
                    { role: 'SURVEILLANT', username: 'surveillant', label: '6. Surveillant Général' },
                    { role: 'ENSEIGNANT', username: 'prof.maths', label: '7. Enseignant (Maths)' },
                    { role: 'ELEVE', username: 'eleve', label: '8. Élève' },
                    { role: 'PARENT', username: 'parent', label: '9. Parent d\'Élève' },
                  ].map((item) => {
                    const isActive = user?.username === item.username || user?.role === item.role;
                    return (
                      <button
                        key={item.username}
                        onClick={() => handleSwitch(item.username)}
                        disabled={switchLoading}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800 transition ${
                          isActive ? 'bg-indigo-950/50 text-indigo-300 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isActive && <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Badge du rôle actif */}
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-semibold text-white">{user?.full_name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${roleMeta.badgeColor}`}>
              {roleMeta.label}
            </span>
          </div>

          {/* Déconnexion */}
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
