import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  KeyRound,
  FileCheck2,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PlusCircle,
  Copy,
  Check,
  X,
  RefreshCw,
  Power,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Sliders,
  ChevronRight,
  Filter,
  Eye,
  AlertCircle,
  Lock,
  Sparkles,
  LogOut,
  Moon,
  TrendingUp,
  Award,
  Users,
  Building,
  RotateCw,
  Menu
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { DeveloperStats, CreationAuthorization, Establishment, SchoolLicense } from '../types.ts';
import { formatBrazzavilleDateTime, formatBrazzavilleDate } from '../lib/dateUtils.ts';
import { SchoolLogoCapture } from '../components/SchoolLogoCapture.tsx';

type CentralTab = 'dashboard' | 'establishments' | 'authorizations' | 'licenses' | 'audit' | 'promoters-recovery';

const centralTabs = [
  { id: 'dashboard' as CentralTab, label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'establishments' as CentralTab, label: 'Multi-Écoles & Licences', icon: Building2 },
  { id: 'authorizations' as CentralTab, label: 'Codes d’autorisation', icon: KeyRound },
  { id: 'licenses' as CentralTab, label: 'Gestion des licences', icon: FileCheck2 },
  { id: 'promoters-recovery' as CentralTab, label: 'Assistance et récupération des comptes promoteurs', icon: KeyRound },
  { id: 'audit' as CentralTab, label: 'Journaux d’audit', icon: Shield },
];

export const DeveloperView: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<CentralTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Données réelles
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [authorizations, setAuthorizations] = useState<CreationAuthorization[]>([]);
  const [licenses, setLicenses] = useState<SchoolLicense[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtres Établissements & Licences
  const [estSearch, setEstSearch] = useState('');
  const [estStatusFilter, setEstStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [estCityFilter, setEstCityFilter] = useState<string>('ALL');

  // Modale Création directe d'Établissement (Exclusif Gestionnaire d'application)
  const [showCreateEstModal, setShowCreateEstModal] = useState(false);
  const [createEstLoading, setCreateEstLoading] = useState(false);
  const [createEstError, setCreateEstError] = useState<string | null>(null);
  const [createEstCodeStatus, setCreateEstCodeStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [createEstForm, setCreateEstForm] = useState({
    name: '',
    code: '',
    city: 'Brazzaville',
    address: '',
    phone: '',
    email: '',
    motto: '',
    academic_year: '2026-2027',
    active_cycles: ['COLLEGE', 'LYCEE'],
    formula: 'EXCELLENCE' as 'EXCELLENCE' | 'PACK_MOYEN' | 'START',
    promoteurFullName: '',
    promoteurUsername: '',
    promoteurPassword: '',
    promoteurPhone: '',
    promoteurEmail: '',
    logo_url: '',
  });

  // Modales
  const [selectedEst, setSelectedEst] = useState<any | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [targetSuspendEstId, setTargetSuspendEstId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Modale Création Code
  const [showCreateAuthModal, setShowCreateAuthModal] = useState(false);
  const [newAuthPromoterName, setNewAuthPromoterName] = useState('');
  const [newAuthEmail, setNewAuthEmail] = useState('');
  const [newAuthPhone, setNewAuthPhone] = useState('');
  const [newAuthNotes, setNewAuthNotes] = useState('');
  const [newAuthValidityDays, setNewAuthValidityDays] = useState<number>(90);

  // Modale Renouvellement Licence
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [targetRenewEstId, setTargetRenewEstId] = useState<string | null>(null);
  const [renewDurationMonths, setRenewDurationMonths] = useState<number>(12);
  const [renewNotes, setRenewNotes] = useState('');

  // Modale Changement Formule
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [targetFormulaEstId, setTargetFormulaEstId] = useState<string | null>(null);
  const [selectedFormulaKey, setSelectedFormulaKey] = useState<'EXCELLENCE' | 'PACK_MOYEN' | 'START'>('EXCELLENCE');
  const [formulaChangeNotes, setFormulaChangeNotes] = useState('');

  // Code copié
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Assistance & Récupération des Comptes Promoteurs
  const [promotersList, setPromotersList] = useState<any[]>([]);
  const [promoterSearch, setPromoterSearch] = useState('');
  const [promoterLoading, setPromoterLoading] = useState(false);
  const [selectedPromoter, setSelectedPromoter] = useState<any | null>(null);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoveredData, setRecoveredData] = useState<any | null>(null);
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [newPromoterPassword, setNewPromoterPassword] = useState('');
  const [resetPassNotes, setResetPassNotes] = useState('');
  const [resetPassLoading, setResetPassLoading] = useState(false);

  const loadPromotersNetwork = async (q?: string) => {
    setPromoterLoading(true);
    try {
      const res = await api.searchPromoters(q);
      setPromotersList(res);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors de la recherche des promoteurs.' });
    } finally {
      setPromoterLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'promoters-recovery') {
      loadPromotersNetwork();
    }
  }, [activeTab]);

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromoter || !newPromoterPassword) return;
    if (newPromoterPassword.length < 8) {
      setFeedback({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    setResetPassLoading(true);
    try {
      await api.resetPromoterPasswordByAdmin({
        promoterUserId: selectedPromoter.promoter_user_id,
        newPassword: newPromoterPassword,
        notes: resetPassNotes,
      });
      setShowResetPassModal(false);
      setNewPromoterPassword('');
      setResetPassNotes('');
      setSelectedPromoter(null);
      setFeedback({ type: 'success', text: `Mot de passe réinitialisé avec succès pour le promoteur "${selectedPromoter.promoter_name}".` });
      loadPromotersNetwork(promoterSearch);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors de la réinitialisation du mot de passe.' });
    } finally {
      setResetPassLoading(false);
    }
  };

  const loadAllCentralData = async () => {
    setLoading(true);
    try {
      const [statsRes, estsRes, authsRes, licRes, auditRes] = await Promise.all([
        api.getDeveloperMetrics(),
        api.getDeveloperEstablishments(),
        api.getAuthorizations(),
        api.getDeveloperLicenses(),
        api.getDeveloperAuditLogs(),
      ]);

      setStats(statsRes);
      setEstablishments(estsRes);
      setAuthorizations(authsRes);
      setLicenses(licRes);
      setAuditLogs(auditRes);
    } catch (err: any) {
      console.error('Erreur chargement portail central:', err);
      setFeedback({ type: 'error', text: err.message || 'Erreur lors du chargement des données.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCentralData();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Actions Établissements
  const handleToggleStatus = async (estId: string, currentStatus: string) => {
    if (currentStatus === 'ACTIVE') {
      setTargetSuspendEstId(estId);
      setSuspendReason('');
      setShowSuspendModal(true);
    } else {
      try {
        await api.updateEstablishmentStatus(estId, 'ACTIVE');
        setFeedback({ type: 'success', text: "L'établissement a été réactivé avec succès." });
        await loadAllCentralData();
      } catch (err: any) {
        setFeedback({ type: 'error', text: err.message || 'Erreur lors de la réactivation.' });
      }
    }
  };

  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSuspendEstId) return;
    try {
      await api.updateEstablishmentStatus(targetSuspendEstId, 'SUSPENDED', suspendReason);
      setShowSuspendModal(false);
      setTargetSuspendEstId(null);
      setFeedback({ type: 'success', text: "L'établissement a été suspendu. Ses accès opérationnels sont désormais bloqués." });
      await loadAllCentralData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors de la suspension.' });
    }
  };

  // Actions Codes d'autorisation
  const handleCreateAuthCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthPromoterName.trim()) {
      setFeedback({ type: 'error', text: 'Le nom du promoteur est obligatoire.' });
      return;
    }
    try {
      const res = await api.createAuthorization({
        promoter_name: newAuthPromoterName.trim(),
        promoter_email: newAuthEmail.trim() || undefined,
        promoter_phone: newAuthPhone.trim() || undefined,
        notes: newAuthNotes.trim() || undefined,
        validityDays: newAuthValidityDays,
      });
      setShowCreateAuthModal(false);
      setNewAuthPromoterName('');
      setNewAuthEmail('');
      setNewAuthPhone('');
      setNewAuthNotes('');
      setFeedback({ type: 'success', text: `Code généré avec succès : ${res.authorization?.code}` });
      await loadAllCentralData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors de la création du code.' });
    }
  };

  const handleRevokeCode = async (codeId: string) => {
    const reason = window.prompt("Motif de la révocation de ce code d'autorisation :");
    if (reason === null) return;
    try {
      await api.revokeAuthorization(codeId, reason);
      setFeedback({ type: 'success', text: "Le code d'autorisation a été révoqué." });
      await loadAllCentralData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors de la révocation.' });
    }
  };

  // Actions Licences
  const handleQuickRenew12Months = async (establishmentId: string) => {
    try {
      const res = await api.renewEstablishmentLicense(establishmentId, 12, "Renouvellement annuel rapide (+12 mois)");
      setFeedback({ type: 'success', text: `Licence renouvelée (+12 Mois). Nouvelle échéance : ${res.newExpiresAt}` });
      await loadAllCentralData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors du renouvellement de la licence.' });
    }
  };

  const handleConfirmRenewModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRenewEstId) return;
    try {
      const res = await api.renewEstablishmentLicense(targetRenewEstId, renewDurationMonths, renewNotes);
      setShowRenewModal(false);
      setTargetRenewEstId(null);
      setFeedback({ type: 'success', text: `Licence renouvelée (+${renewDurationMonths} Mois). Nouvelle échéance : ${res.newExpiresAt}` });
      await loadAllCentralData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors du renouvellement.' });
    }
  };

  const handleConfirmFormulaModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFormulaEstId) return;
    try {
      const res = await api.updateEstablishmentFormula(targetFormulaEstId, selectedFormulaKey, formulaChangeNotes);
      setShowFormulaModal(false);
      setTargetFormulaEstId(null);
      setFeedback({ type: 'success', text: `Formule mise à jour : ${res.license?.formula_name}` });
      await loadAllCentralData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors du changement de formule.' });
    }
  };

  const handleCheckCreateEstCode = async (code: string) => {
    const clean = code.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
    setCreateEstForm((prev) => ({ ...prev, code: clean }));
    if (clean.length < 3) {
      setCreateEstCodeStatus('idle');
      return;
    }
    setCreateEstCodeStatus('checking');
    try {
      const res = await api.checkSchoolCode(clean);
      setCreateEstCodeStatus(res.available ? 'available' : 'taken');
    } catch {
      setCreateEstCodeStatus('idle');
    }
  };

  const toggleCreateEstCycle = (cycleId: string) => {
    setCreateEstForm((prev) => {
      const exists = prev.active_cycles.includes(cycleId);
      return {
        ...prev,
        active_cycles: exists
          ? prev.active_cycles.filter((c) => c !== cycleId)
          : [...prev.active_cycles, cycleId],
      };
    });
  };

  const handleCreateEstSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateEstError(null);
    if (!createEstForm.name.trim() || !createEstForm.code.trim() || !createEstForm.city.trim()) {
      setCreateEstError("Le nom de l'école, le code unique et la ville sont obligatoires.");
      return;
    }
    if (!createEstForm.promoteurFullName.trim() || !createEstForm.promoteurUsername.trim()) {
      setCreateEstError("Le nom complet et l'identifiant du promoteur sont requis.");
      return;
    }
    if (createEstForm.promoteurPassword.length < 8) {
      setCreateEstError("Le mot de passe du promoteur doit comporter au moins 8 caractères.");
      return;
    }
    if (createEstCodeStatus === 'taken') {
      setCreateEstError(`Le code "${createEstForm.code}" est déjà utilisé. Veuillez en choisir un autre.`);
      return;
    }

    setCreateEstLoading(true);
    try {
      await api.createDeveloperEstablishment(createEstForm);
      setShowCreateEstModal(false);
      setFeedback({ type: 'success', text: `Établissement "${createEstForm.name}" (${createEstForm.code}) créé avec succès et activé sur le réseau Eco GES !` });
      setCreateEstForm({
        name: '',
        code: '',
        city: 'Brazzaville',
        address: '',
        phone: '',
        email: '',
        motto: '',
        academic_year: '2026-2027',
        active_cycles: ['COLLEGE', 'LYCEE'],
        formula: 'EXCELLENCE',
        promoteurFullName: '',
        promoteurUsername: '',
        promoteurPassword: '',
        promoteurPhone: '',
        promoteurEmail: '',
        logo_url: '',
      });
      await loadAllCentralData();
    } catch (err: any) {
      setCreateEstError(err.message || "Erreur lors de la création de l'établissement.");
    } finally {
      setCreateEstLoading(false);
    }
  };

  // Filtrage des établissements
  const filteredEstablishments = establishments.filter((est) => {
    const matchesSearch =
      !estSearch ||
      est.name?.toLowerCase().includes(estSearch.toLowerCase()) ||
      est.code?.toLowerCase().includes(estSearch.toLowerCase()) ||
      est.promoter_name?.toLowerCase().includes(estSearch.toLowerCase()) ||
      est.city?.toLowerCase().includes(estSearch.toLowerCase());

    const matchesStatus =
      estStatusFilter === 'ALL' || est.status === estStatusFilter;

    const matchesCity =
      estCityFilter === 'ALL' || est.city?.toLowerCase() === estCityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesCity;
  });

  const availableCities = Array.from(new Set(establishments.map((e) => e.city).filter(Boolean)));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex font-sans antialiased selection:bg-indigo-600 selection:text-white">
      
      {/* 1. MENU LATÉRAL SOMBRE CONFORME À LA RÉFÉRENCE (Desktop) */}
      <aside className="hidden md:flex w-64 bg-[#0E1322] border-r border-slate-800/80 flex-col shrink-0">
        
        {/* Logo & Nom Eco GES */}
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 p-0.5 shadow-lg shadow-indigo-900/40 shrink-0">
            <div className="w-full h-full bg-[#0E1322] rounded-[10px] flex items-center justify-center text-amber-400 font-black text-sm">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tight flex items-center space-x-1">
              <span>Eco.</span>
              <span className="text-amber-400 font-extrabold uppercase">Ges</span>
            </h1>
            <p className="text-[10px] text-indigo-300 font-semibold tracking-wider uppercase">
              Portail Central
            </p>
          </div>
        </div>

        {/* Navigation Centrale (UNIQUEMENT les 5 rubriques requises) */}
        <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            Administration Centrale
          </div>

          {centralTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setActiveTab(item.id); setFeedback(null); }}
                className={`w-full py-3 px-3.5 rounded-xl font-bold text-xs flex items-center space-x-3 transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer serveur et localisation */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0B0F19]/50 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Serveur Opérationnel</span>
          </div>
          <div className="text-[10px] text-slate-400">Heure : Africa/Brazzaville</div>
          <div className="text-[10px] text-slate-400">Devise : FCFA</div>
        </div>
      </aside>

      {/* Drawer mobile pour téléphones Android et petits écrans */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="relative w-72 bg-[#0E1322] border-r border-slate-800 h-full flex flex-col z-10 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 p-0.5">
                  <div className="w-full h-full bg-[#0E1322] rounded-[6px] flex items-center justify-center text-amber-400">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">Eco.Ges</span>
                  <span className="text-[10px] text-indigo-300 uppercase">Portail Central</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
              {centralTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setFeedback(null);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full py-3 px-3.5 rounded-xl font-bold text-xs flex items-center space-x-3 transition cursor-pointer text-left ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      {/* 2. CONTENU PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Barre Supérieure du Portail Central */}
        <header className="h-16 bg-[#0E1322] border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline-block">
              Eco GES • Système Central
            </span>
            <span className="text-slate-700 hidden sm:inline-block">|</span>
            <div className="flex items-center space-x-1.5 text-xs text-indigo-300 font-medium bg-indigo-950/60 border border-indigo-800/40 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Multi-Établissements & Licences</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Rôle Gestionnaire d'application */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-full text-xs text-slate-200">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-bold text-white">Gestionnaire d’application</span>
              <span className="text-slate-400 text-[10px]">({user?.full_name || user?.username})</span>
            </div>

            <button
              type="button"
              onClick={loadAllCentralData}
              title="Rafraîchir les données réelles"
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={logout}
              title="Déconnexion sécurisée"
              className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 rounded-xl border border-rose-800/40 transition flex items-center space-x-1 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </header>

        {/* Zone de feedback */}
        {feedback && (
          <div className={`p-3.5 mx-6 mt-4 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800 text-rose-200'
          }`}>
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Vues du Portail Central */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ========================================================
              RUBRIQUE 1 : TABLEAU DE BORD CENTRAL
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Tableau de Bord Central</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Indicateurs réels calculés en direct depuis la base de données Eco GES
                </p>
              </div>

              {/* Indicateurs Clés */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#131B2E] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Établissements Enregistrés</span>
                    <Building2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stats?.totalEstablishments || 0}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] pt-1">
                    <span className="text-emerald-400 font-bold">{stats?.activeEstablishments || 0} actifs</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-rose-400 font-bold">{stats?.suspendedEstablishments || 0} suspendus</span>
                  </div>
                </div>

                <div className="bg-[#131B2E] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Licences Actives</span>
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stats?.activeLicenses || 0}
                  </div>
                  <div className="text-[11px] text-amber-400 pt-1 font-semibold flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{stats?.expiredOrExpiringLicenses || 0} à renouveler sous 30 j</span>
                  </div>
                </div>

                <div className="bg-[#131B2E] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Codes d'Autorisation</span>
                    <KeyRound className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stats?.totalCodes || 0}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] pt-1">
                    <span className="text-emerald-400 font-bold">{stats?.availableCodes || 0} disponibles</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-indigo-400 font-bold">{stats?.usedCodes || 0} utilisés</span>
                  </div>
                </div>

                <div className="bg-[#131B2E] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Promoteurs Enregistrés</span>
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stats?.totalPromoters || 0}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Comptes propriétaires vérifiés
                  </div>
                </div>
              </div>

              {/* Répartition par Formule Commerciale */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>Répartition des Établissements par Formule Commerciale</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300">Formule Excellence — Illimité</span>
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-mono font-bold">
                        {stats?.formulaDistribution.excellence || 0} écoles
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Plafond : 1 500 élèves • 150 personnels</p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, ((stats?.formulaDistribution.excellence || 0) / Math.max(1, stats?.totalEstablishments || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-300">Formule Pack Moyen</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono font-bold">
                        {stats?.formulaDistribution.packMoyen || 0} écoles
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Plafond : 700 élèves • 80 personnels</p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, ((stats?.formulaDistribution.packMoyen || 0) / Math.max(1, stats?.totalEstablishments || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">Formule Start</span>
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono font-bold">
                        {stats?.formulaDistribution.start || 0} écoles
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Plafond : 400 élèves • 50 personnels</p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, ((stats?.formulaDistribution.start || 0) / Math.max(1, stats?.totalEstablishments || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              RUBRIQUE : ASSISTANCE ET RÉCUPÉRATION DES COMPTES PROMOTEURS
             ======================================================== */}
          {activeTab === 'promoters-recovery' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
                    <KeyRound className="w-6 h-6 text-indigo-400" />
                    <span>Assistance et Récupération des Comptes Promoteurs</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Recherchez un établissement ou un promoteur, retrouvez son identifiant et effectuez une réinitialisation de mot de passe sécurisée.
                  </p>
                </div>
              </div>

              {/* Barre de Recherche et Filtres */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom d'école, promoteur, identifiant, e-mail ou téléphone..."
                    value={promoterSearch}
                    onChange={(e) => {
                      setPromoterSearch(e.target.value);
                      loadPromotersNetwork(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadPromotersNetwork(promoterSearch)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Filtrer</span>
                </button>
              </div>

              {/* Liste des Promoteurs & Établissements */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Comptes Promoteurs du Réseau ({promotersList.length})
                  </span>
                  <span className="text-[11px] text-indigo-400 font-semibold">
                    Accès Réservé — Gestionnaire d’Application
                  </span>
                </div>

                {promoterLoading ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Chargement des comptes promoteurs...
                  </div>
                ) : promotersList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Aucun compte promoteur ne correspond à votre recherche.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {promotersList.map((item) => {
                      const isFaithBen = item.establishment_name?.toLowerCase().includes('faith') || item.establishment_code === 'CSFS1-2026';
                      return (
                        <div
                          key={item.promoter_user_id}
                          className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                            isFaithBen ? 'bg-indigo-950/20 border-l-4 border-indigo-500' : 'hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-white text-sm">{item.establishment_name}</span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[10px] font-bold">
                                {item.establishment_code}
                              </span>
                              {isFaithBen && (
                                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold border border-amber-800/40">
                                  Prioritaire (Faith Ben)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span>👤 <strong className="text-white">{item.promoter_name}</strong></span>
                              <span>🔑 Identifiant : <code className="text-amber-400 font-mono font-bold">*** (Masqué - Cliquer pour retrouver)</code></span>
                              <span>📧 {item.promoter_email || 'Aucun e-mail'}</span>
                              <span>📞 {item.promoter_phone || 'Aucun téléphone'}</span>
                              <span>📍 {item.city}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                setSelectedPromoter(item);
                                try {
                                  const res = await api.recoverPromoterUsername(item.promoter_user_id);
                                  setRecoveredData(res);
                                  setShowRecoverModal(true);
                                } catch (err: any) {
                                  setFeedback({ type: 'error', text: err.message || "Erreur lors de la récupération de l'identifiant." });
                                }
                              }}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5 border border-slate-700"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                              <span>Retrouver mon identifiant</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPromoter(item);
                                setNewPromoterPassword('');
                                setResetPassNotes('');
                                setShowResetPassModal(true);
                              }}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Réinitialiser le mot de passe</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              RUBRIQUE 2 : MULTI-ÉCOLES & GESTION DES ÉTABLISSEMENTS
             ======================================================== */}
          {activeTab === 'establishments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    <span>Multi-Écoles & Gestion des Établissements</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Module exclusif Gestionnaire d’application : création d’écoles, répertoire complet et contrôle des licences
                  </p>
                </div>

                {/* Bouton Création & Filtres de recherche */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreateEstModal(true); setCreateEstError(null); }}
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition space-x-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Créer un Établissement</span>
                  </button>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Nom, code, promoteur..."
                      value={estSearch}
                      onChange={(e) => setEstSearch(e.target.value)}
                      className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <select
                    value={estStatusFilter}
                    onChange={(e: any) => setEstStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium"
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="ACTIVE">Actifs uniquement</option>
                    <option value="SUSPENDED">Suspendus uniquement</option>
                  </select>

                  <select
                    value={estCityFilter}
                    onChange={(e) => setEstCityFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium"
                  >
                    <option value="ALL">Toutes les villes</option>
                    {availableCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tableau des établissements */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/90 text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Établissement</th>
                        <th className="py-3 px-4">Code Unique</th>
                        <th className="py-3 px-4">Promoteur</th>
                        <th className="py-3 px-4">Ville</th>
                        <th className="py-3 px-4">Effectifs Réels</th>
                        <th className="py-3 px-4">Formule & Licence</th>
                        <th className="py-3 px-4">Statut</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredEstablishments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Aucun établissement ne correspond aux critères de recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredEstablishments.map((est) => (
                          <tr key={est.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                {est.logo_url ? (
                                  <img
                                    src={est.logo_url}
                                    alt={est.name}
                                    className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-slate-700 p-0.5 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                                    {est.name ? est.name.substring(0, 2).toUpperCase() : 'EG'}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-white text-xs">{est.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">ID: {est.id}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono font-bold text-amber-300">
                              {est.code}
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-200">{est.promoter_name || 'Non renseigné'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{est.promoter_phone || est.promoter_email || '—'}</div>
                            </td>

                            <td className="py-3 px-4 text-slate-300">
                              {est.city}
                            </td>

                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <div className="text-[11px] font-mono text-slate-200">
                                  <span className="font-bold text-indigo-400">{est.student_count || 0}</span> élèves / {est.max_students || 1500}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {est.staff_count || est.user_count || 0} personnels / {est.max_users || 150}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-semibold text-purple-300 block">{est.formula_name || 'Formule Excellence'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Exp : {est.subscription_expires_at || '1 an'}</span>
                            </td>

                            <td className="py-3 px-4">
                              {est.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                                  Actif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 border border-rose-800 text-rose-300">
                                  Suspendu
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedEst(est)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                                  title="Consulter la fiche détaillée"
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(est.id, est.status)}
                                  className={`p-1.5 rounded-lg transition ${
                                    est.status === 'ACTIVE'
                                      ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300'
                                      : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300'
                                  }`}
                                  title={est.status === 'ACTIVE' ? "Suspendre l'établissement" : "Réactiver l'établissement"}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              RUBRIQUE 3 : CODES D'AUTORISATION
             ======================================================== */}
          {activeTab === 'authorizations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Codes d’Autorisation</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Génération et contrôle strict des jetons d'ouverture à usage unique pour Promoteurs
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateAuthModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/30"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Générer un Code d’Autorisation</span>
                </button>
              </div>

              {/* Liste des codes */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/90 text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Code d'Autorisation Unique</th>
                        <th className="py-3 px-4">Promoteur Bénéficiaire</th>
                        <th className="py-3 px-4">Création & Expiration</th>
                        <th className="py-3 px-4">Statut</th>
                        <th className="py-3 px-4">Établissement Attribué</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {authorizations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Aucun code d'autorisation généré pour le moment.
                          </td>
                        </tr>
                      ) : (
                        authorizations.map((auth) => (
                          <tr key={auth.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-amber-300 text-xs tracking-wider bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                  {auth.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(auth.code)}
                                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                                  title="Copier le code"
                                >
                                  {copiedCode === auth.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-200">{auth.promoter_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{auth.promoter_phone || auth.promoter_email || '—'}</div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="text-[11px] text-slate-300">
                                Créé le : {formatBrazzavilleDate(auth.created_at)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {auth.expires_at ? `Expire le : ${formatBrazzavilleDate(auth.expires_at)}` : 'Validité permanente'}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {auth.status === 'AVAILABLE' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                                  Disponible
                                </span>
                              )}
                              {auth.status === 'USED' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 border border-indigo-800 text-indigo-300">
                                  Utilisé
                                </span>
                              )}
                              {auth.status === 'REVOKED' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 border border-rose-800 text-rose-300">
                                  Révoqué
                                </span>
                              )}
                              {auth.status === 'EXPIRED' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400">
                                  Expiré
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {auth.created_establishment_name ? (
                                <div>
                                  <span className="font-bold text-white block">{auth.created_establishment_name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">Consommé le : {formatBrazzavilleDate(auth.used_at)}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">En attente d'ouverture</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              {auth.status === 'AVAILABLE' && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeCode(auth.id)}
                                  className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded text-[11px] font-semibold transition cursor-pointer"
                                >
                                  Révoquer
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              RUBRIQUE 4 : GESTION DES LICENCES (CONFORME CAPTURE LÉO BÉA)
             ======================================================== */}
          {activeTab === 'licenses' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Gestion Commerciale des Licences Annuelles
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Suivi de la validité d’exploitation, renouvellements et plafonds par établissement
                </p>
              </div>

              {/* Encadré d'information conforme à la capture */}
              <div className="bg-[#131B2E] border border-indigo-900/50 rounded-2xl p-5 shadow-xl flex items-start space-x-3.5">
                <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 shrink-0 mt-0.5">
                  <RotateCw className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <h4 className="font-bold text-white text-sm">
                    Distinction Fondamentale : Code de Création vs Licence d’Exploitation
                  </h4>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Le <strong>Code de Création</strong> est un jeton à usage unique qui autorise l’enregistrement initial de l’école.
                    La <strong>Licence</strong> régit quant à elle les droits d’utilisation opérationnels dans le temps (annuelle, trimestrielle).
                    En cas d’expiration d’une licence, les données de l’établissement ne sont jamais supprimées ; seul le renouvellement réactive l’accès sans perte d’historique.
                  </p>
                </div>
              </div>

              {/* Cartes d'établissements conformes à la capture */}
              <div className="space-y-4">
                {licenses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-[#131B2E] border border-slate-800 rounded-2xl">
                    Aucune licence d'établissement enregistrée pour le moment.
                  </div>
                ) : (
                  licenses.map((lic) => (
                    <div
                      key={lic.establishment_id}
                      className="bg-[#131B2E] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5"
                    >
                      {/* En-tête de carte */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-300 shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-white text-base">
                              {lic.establishment_name} – {lic.city}
                            </h3>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Réf : {lic.license_ref}
                            </div>
                          </div>
                        </div>

                        <div>
                          {lic.status === 'ACTIVE' && !lic.is_expired ? (
                            <span className="text-emerald-400 font-bold text-xs flex items-center space-x-1">
                              <span>Licence Active</span>
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold text-xs flex items-center space-x-1">
                              <span>Licence Expirée</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grille des caractéristiques et quotas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
                        <div>
                          <span className="text-slate-400 text-[11px] block mb-1">Formule & Plan :</span>
                          <span className="font-bold text-white text-sm block">
                            {lic.formula_name || 'Formule Excellence Multimédia (Illimité)'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block mb-1">Plafond Effectif Élèves :</span>
                          <span className="font-bold text-white text-sm">
                            Jusqu'à {lic.max_students} élèves
                          </span>
                          <span className="text-[11px] text-indigo-400 font-mono ml-2">
                            ({lic.current_students} inscrits • {lic.student_quota_percent}%)
                          </span>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-indigo-500 h-full rounded-full"
                              style={{ width: `${lic.student_quota_percent}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block mb-1">Plafond Personnel Enseignant :</span>
                          <span className="font-bold text-white text-sm">
                            Jusqu'à {lic.max_staff} personnels
                          </span>
                          <span className="text-[11px] text-purple-400 font-mono ml-2">
                            ({lic.current_staff} collaborateurs • {lic.staff_quota_percent}%)
                          </span>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-purple-500 h-full rounded-full"
                              style={{ width: `${lic.staff_quota_percent}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block mb-1">Date d’échéance :</span>
                          <span className="font-bold text-indigo-300 text-sm font-mono block">
                            {formatBrazzavilleDate(lic.expires_at)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {lic.is_expired ? 'Expirée depuis' : 'Il reste'} {Math.abs(lic.days_remaining)} jours
                          </span>
                        </div>
                      </div>

                      {/* Barre d'action conforme à la capture */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/60 text-xs">
                        <div className="text-slate-400 text-[11px]">
                          Activée le : {formatBrazzavilleDate(lic.activated_at || '')}
                          {lic.renewal_count > 0 && ` • Renouvelée ${lic.renewal_count} fois`}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetFormulaEstId(lic.establishment_id);
                              setSelectedFormulaKey(lic.formula || 'EXCELLENCE');
                              setFormulaChangeNotes('');
                              setShowFormulaModal(true);
                            }}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition flex items-center space-x-1.5"
                          >
                            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Changer Formule</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickRenew12Months(lic.establishment_id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Renouveler (+12 Mois)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              RUBRIQUE 5 : JOURNAUX D'AUDIT CENTRAUX
             ======================================================== */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Journaux d’Audit</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Traçabilité immuable des opérations de sécurité, des licences et des autorisations
                </p>
              </div>

              <div className="bg-[#131B2E] border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/90 text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Date & Heure</th>
                        <th className="py-3 px-4">Opérateur / Auteur</th>
                        <th className="py-3 px-4">Établissement</th>
                        <th className="py-3 px-4">Action Enregistrée</th>
                        <th className="py-3 px-4">Détails de l'Événement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            Aucun journal d'audit enregistré.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                              {formatBrazzavilleDateTime(log.created_at)}
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-semibold text-white block">{log.user_name || 'Système Central'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{log.user_id || 'SYS'}</span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-medium text-slate-200 block">{log.establishment_name || 'Plateforme Centrale'}</span>
                              {log.establishment_code && (
                                <span className="text-[10px] font-mono text-amber-400">{log.establishment_code}</span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 border border-indigo-800/60 text-indigo-300">
                                {log.action}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================
          MODALES DE CONTRÔLE
         ======================================================== */}

      {/* Modal Suspension Établissement */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Suspension Administrative</span>
              </h3>
              <button onClick={() => setShowSuspendModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSuspend} className="space-y-3.5">
              <p className="text-slate-300">
                La suspension bloque immédiatement les accès opérationnels de l'école. Aucune donnée ne sera supprimée.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Motif officiel de la suspension *
                </label>
                <textarea
                  required
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Ex : Défaut de conformité administrative, renouvellement en attente..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition"
                >
                  Confirmer la Suspension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Génération Code d'Autorisation */}
      {showCreateAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Générer un Code d’Autorisation Unique</span>
              </h3>
              <button onClick={() => setShowCreateAuthModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAuthCode} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nom Complet du Promoteur Bénéficiaire *
                </label>
                <input
                  type="text"
                  required
                  value={newAuthPromoterName}
                  onChange={(e) => setNewAuthPromoterName(e.target.value)}
                  placeholder="Ex : M. Denis Sassou Mouanda"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Téléphone Promoteur
                  </label>
                  <input
                    type="text"
                    value={newAuthPhone}
                    onChange={(e) => setNewAuthPhone(e.target.value)}
                    placeholder="+242 06..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Validité (Jours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newAuthValidityDays}
                    onChange={(e) => setNewAuthValidityDays(parseInt(e.target.value, 10) || 90)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Adresse E-mail du Promoteur
                </label>
                <input
                  type="email"
                  value={newAuthEmail}
                  onChange={(e) => setNewAuthEmail(e.target.value)}
                  placeholder="promoteur@exemple.cg"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Notes / Référence du Projet
                </label>
                <textarea
                  rows={2}
                  value={newAuthNotes}
                  onChange={(e) => setNewAuthNotes(e.target.value)}
                  placeholder="Établissement prévu, ville, remarques..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAuthModal(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/30"
                >
                  Générer le Code Unique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Changement Formule */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Modifier la Formule Commerciale</span>
              </h3>
              <button onClick={() => setShowFormulaModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmFormulaModal} className="space-y-3.5">
              <div className="space-y-2">
                {[
                  {
                    key: 'EXCELLENCE' as const,
                    name: 'Formule Excellence — Illimité',
                    desc: 'Jusqu’à 1 500 élèves • 150 membres du personnel',
                    color: 'border-purple-500/60 bg-purple-950/20'
                  },
                  {
                    key: 'PACK_MOYEN' as const,
                    name: 'Formule Pack Moyen',
                    desc: 'Jusqu’à 700 élèves • 80 membres du personnel',
                    color: 'border-indigo-500/60 bg-indigo-950/20'
                  },
                  {
                    key: 'START' as const,
                    name: 'Formule Start',
                    desc: 'Jusqu’à 400 élèves • 50 membres du personnel',
                    color: 'border-amber-500/60 bg-amber-950/20'
                  },
                ].map((f) => (
                  <label
                    key={f.key}
                    className={`block p-3 border rounded-xl cursor-pointer transition ${
                      selectedFormulaKey === f.key
                        ? `${f.color} ring-1 ring-indigo-500`
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="formula"
                        checked={selectedFormulaKey === f.key}
                        onChange={() => setSelectedFormulaKey(f.key)}
                        className="text-indigo-600"
                      />
                      <span className="font-bold text-white">{f.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 pl-5">
                      {f.desc}
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Motif / Notes de modification
                </label>
                <input
                  type="text"
                  value={formulaChangeNotes}
                  onChange={(e) => setFormulaChangeNotes(e.target.value)}
                  placeholder="Ex : Évolution d'effectif, contrat commercial..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-600/30"
                >
                  Enregistrer la Nouvelle Formule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fiche Détail Établissement */}
      {selectedEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-xs space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                {selectedEst.logo_url && (
                  <img
                    src={selectedEst.logo_url}
                    alt={selectedEst.name}
                    className="w-10 h-10 object-contain rounded-lg bg-slate-950 border border-slate-700 p-0.5"
                  />
                )}
                <div>
                  <h3 className="font-black text-white text-base">{selectedEst.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Code : {selectedEst.code} • ID : {selectedEst.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEst(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400 block">Promoteur Responsable :</span>
                <span className="font-bold text-white">{selectedEst.promoter_name || 'Non renseigné'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Contact Promoteur :</span>
                <span className="font-mono text-slate-300">{selectedEst.promoter_phone || selectedEst.promoter_email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Ville & Pays :</span>
                <span className="font-semibold text-slate-200">{selectedEst.city}, {selectedEst.country || 'Congo'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Code Autorisation Utilisé :</span>
                <span className="font-mono font-bold text-amber-400">{selectedEst.auth_code_used || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Statut Établissement :</span>
                <span className={`font-bold ${selectedEst.status === 'ACTIVE' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedEst.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Formule Commerciale :</span>
                <span className="font-bold text-purple-300">{selectedEst.formula_name || 'Excellence'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedEst(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION DIRECTE D'ÉTABLISSEMENT PAR LE GESTIONNAIRE D'APPLICATION */}
      {showCreateEstModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 my-8 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Créer un Nouvel Établissement Scolaire</h3>
                  <span className="text-[10px] text-indigo-400 font-mono">Module Gestionnaire d’application — Administration Centrale</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEstModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createEstError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{createEstError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEstSubmit} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Informations de l'école */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Informations de l'Établissement</span>
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nom Officiel de l'École *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Complexe Scolaire Saint-Exupéry"
                    value={createEstForm.name}
                    onChange={(e) => setCreateEstForm({ ...createEstForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Code Unique *
                      </label>
                      {createEstCodeStatus === 'available' && <span className="text-[10px] text-emerald-400 font-bold">✓ Disponible</span>}
                      {createEstCodeStatus === 'taken' && <span className="text-[10px] text-rose-400 font-bold">✗ Déjà pris</span>}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CS-STEX"
                      value={createEstForm.code}
                      onChange={(e) => handleCheckCreateEstCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Ville *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Brazzaville, Pointe-Noire..."
                      value={createEstForm.city}
                      onChange={(e) => setCreateEstForm({ ...createEstForm, city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Téléphone de l'école
                    </label>
                    <input
                      type="text"
                      placeholder="+242 06 ..."
                      value={createEstForm.phone}
                      onChange={(e) => setCreateEstForm({ ...createEstForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Email officiel
                    </label>
                    <input
                      type="email"
                      placeholder="direction@ecole.cg"
                      value={createEstForm.email}
                      onChange={(e) => setCreateEstForm({ ...createEstForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Cycles */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Cycles d'enseignement activés :
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'PRE_SCOLAIRE', label: 'Maternelle' },
                      { id: 'PRIMAIRE', label: 'Primaire' },
                      { id: 'COLLEGE', label: 'Collège' },
                      { id: 'LYCEE', label: 'Lycée' },
                    ].map((cyc) => {
                      const active = createEstForm.active_cycles.includes(cyc.id);
                      return (
                        <button
                          key={cyc.id}
                          type="button"
                          onClick={() => toggleCreateEstCycle(cyc.id)}
                          className={`p-1.5 rounded-lg text-[11px] font-semibold border transition text-center cursor-pointer ${
                            active
                              ? 'bg-indigo-600/40 text-indigo-200 border-indigo-500'
                              : 'bg-slate-800/40 text-slate-400 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {cyc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Attribution de la Formule Commerciale & Licence */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Attribution de la Licence Commerciale</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'EXCELLENCE' as const, name: 'Excellence (1500 élèves)', desc: '150 personnels' },
                    { key: 'PACK_MOYEN' as const, name: 'Pack Moyen (700 élèves)', desc: '80 personnels' },
                    { key: 'START' as const, name: 'Start (400 élèves)', desc: '50 personnels' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setCreateEstForm({ ...createEstForm, formula: f.key })}
                      className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                        createEstForm.formula === f.key
                          ? 'bg-purple-950/50 border-purple-500 text-purple-200 ring-1 ring-purple-500'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold text-[11px] text-white">{f.name}</div>
                      <div className="text-[10px] text-slate-400">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compte du Promoteur initial */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Compte du Promoteur Initial</span>
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nom Complet du Promoteur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="M. / Mme ... (Promoteur / Propriétaire)"
                    value={createEstForm.promoteurFullName}
                    onChange={(e) => setCreateEstForm({ ...createEstForm, promoteurFullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Identifiant Unique du Promoteur *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: prom.mandela"
                      value={createEstForm.promoteurUsername}
                      onChange={(e) => setCreateEstForm({ ...createEstForm, promoteurUsername: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Mot de Passe Sécurisé (≥ 8 car.) *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={createEstForm.promoteurPassword}
                      onChange={(e) => setCreateEstForm({ ...createEstForm, promoteurPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Téléphone Promoteur
                    </label>
                    <input
                      type="text"
                      placeholder="+242 06 ..."
                      value={createEstForm.promoteurPhone}
                      onChange={(e) => setCreateEstForm({ ...createEstForm, promoteurPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Email Promoteur
                    </label>
                    <input
                      type="email"
                      placeholder="promoteur@exemple.cg"
                      value={createEstForm.promoteurEmail}
                      onChange={(e) => setCreateEstForm({ ...createEstForm, promoteurEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateEstModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createEstLoading || createEstCodeStatus === 'taken'}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {createEstLoading ? "Création en cours..." : "Créer et Activer l'Établissement →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Récupération d'Identifiant */}
      {showRecoverModal && recoveredData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#131B2E] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Identifiant Promoteur Récupéré</span>
              </h3>
              <button onClick={() => setShowRecoverModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                <div><span className="text-slate-400">Établissement :</span> <strong className="text-white">{recoveredData.establishment_name}</strong> ({recoveredData.establishment_code})</div>
                <div><span className="text-slate-400">Promoteur :</span> <strong className="text-white">{recoveredData.full_name}</strong></div>
                <div><span className="text-slate-400">E-mail :</span> {recoveredData.email || 'N/A'}</div>
                <div><span className="text-slate-400">Téléphone :</span> {recoveredData.phone || 'N/A'}</div>
              </div>

              <div className="p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-2 text-center">
                <span className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider block">Identifiant de Connexion Validé</span>
                <div className="text-lg font-mono font-black text-amber-400 bg-slate-900/80 py-2 px-3 rounded-lg border border-indigo-900">
                  {recoveredData.username}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(recoveredData.username);
                    setFeedback({ type: 'success', text: "Identifiant copié dans le presse-papier." });
                  }}
                  className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Copier l'identifiant
                </button>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecoverModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale Réinitialisation de Mot de Passe */}
      {showResetPassModal && selectedPromoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#131B2E] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                <span>Réinitialisation du Mot de Passe Promoteur</span>
              </h3>
              <button onClick={() => setShowResetPassModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-1 text-slate-300">
                <div>Établissement : <strong className="text-white">{selectedPromoter.establishment_name}</strong></div>
                <div>Promoteur : <strong className="text-white">{selectedPromoter.promoter_name}</strong></div>
                <div className="text-[10px] text-amber-400 pt-1">Une trace d'audit sera enregistrée pour cette action administrative souveraine.</div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nouveau mot de passe sécurisé (≥ 8 caractères) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPromoterPassword}
                  onChange={(e) => setNewPromoterPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Motif / Notes d'audit (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Demande verbale vérifiée par téléphone"
                  value={resetPassNotes}
                  onChange={(e) => setResetPassNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resetPassLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {resetPassLoading ? "Réinitialisation..." : "Confirmer la réinitialisation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
