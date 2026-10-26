import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Shield,
  Building,
  Building2,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Layers,
  Search,
  Check,
  X,
  PlusCircle,
  KeyRound,
  Terminal,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { UserSchoolOption, RegisterSchoolPayload } from '../types.ts';
import { SchoolLogoCapture } from './SchoolLogoCapture.tsx';

interface LoginModalProps {
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const { login, demoSwitchUser, registerNewSchool, bootstrapDeveloper, logout } = useAuth();
  
  // Onglets publics : 'login' (Connexion) | 'app-management' (Gestion d'application) | 'register' (Activer une école)
  const [activeView, setActiveView] = useState<'login' | 'app-management' | 'register'>('login');

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [establishmentCode, setEstablishmentCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Multi-school selection state
  const [schoolOptions, setSchoolOptions] = useState<UserSchoolOption[] | null>(null);

  // Espace Gestion d'application
  const [devBootstrapStatus, setDevBootstrapStatus] = useState<{ initialized: boolean; adminCount: number } | null>(null);
  const [devUsername, setDevUsername] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [devLoadingStatus, setDevLoadingStatus] = useState(false);
  const [devFeedback, setDevFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Initialisation Master si aucun compte n'est encore configuré
  const [bootFullName, setBootFullName] = useState('');
  const [bootUsername, setBootUsername] = useState('admin.general');
  const [bootEmail, setBootEmail] = useState('');
  const [bootPhone, setBootPhone] = useState('');
  const [bootPassword, setBootPassword] = useState('');
  const [bootConfirmPassword, setBootConfirmPassword] = useState('');

  const fetchBootstrapStatus = async () => {
    try {
      const res = await api.getDeveloperBootstrapStatus();
      setDevBootstrapStatus(res);
    } catch {
      // Ignorer
    }
  };

  useEffect(() => {
    fetchBootstrapStatus();
  }, []);

  // Register New School State (Promoteur)
  const [regLoading, setRegLoading] = useState(false);
  const [codeCheckStatus, setCodeCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [regForm, setRegForm] = useState<RegisterSchoolPayload>({
    name: '',
    code: '',
    city: 'Brazzaville',
    address: '',
    phone: '',
    email: '',
    motto: '',
    academic_year: '2026-2027',
    active_cycles: ['COLLEGE', 'LYCEE'],
    logo_url: '',
    promoteurFullName: '',
    promoteurUsername: '',
    promoteurEmail: '',
    promoteurPassword: '',
    promoteurPhone: '',
  });

  // Modal Console Technique & Tests
  const [showDevModal, setShowDevModal] = useState(false);
  const [devPasskeyInput, setDevPasskeyInput] = useState('');
  const [isDevAuthorized, setIsDevAuthorized] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevFeedback(null);
    if (!devUsername.trim() || !devPassword) {
      setDevFeedback({ type: 'error', text: "Veuillez renseigner votre identifiant et votre mot de passe gestionnaire." });
      return;
    }

    setDevLoadingStatus(true);
    try {
      const res = await login({
        username: devUsername.trim(),
        password: devPassword,
      });

      if (res?.user?.role !== 'ADMIN_GENERAL') {
        logout();
        setDevFeedback({
          type: 'error',
          text: "Accès refusé. Ce compte ne possède pas le rôle 'Gestionnaire d'application' (ADMIN_GENERAL). Veuillez utiliser l'onglet 'Connexion' pour accéder à votre établissement.",
        });
        return;
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setDevFeedback({ type: 'error', text: err.message || "Identifiants gestionnaire incorrects." });
    } finally {
      setDevLoadingStatus(false);
    }
  };

  const handleDevBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevFeedback(null);
    if (!bootFullName.trim() || !bootUsername.trim() || !bootPassword) {
      setDevFeedback({ type: 'error', text: "Le nom complet, l'identifiant et le mot de passe sont obligatoires." });
      return;
    }

    if (bootPassword.length < 8) {
      setDevFeedback({ type: 'error', text: "Le mot de passe doit comporter au moins 8 caractères." });
      return;
    }

    if (bootPassword !== bootConfirmPassword) {
      setDevFeedback({ type: 'error', text: "Les mots de passe saisis ne sont pas identiques." });
      return;
    }

    setDevLoadingStatus(true);
    try {
      await bootstrapDeveloper({
        fullName: bootFullName.trim(),
        username: bootUsername.trim(),
        email: bootEmail.trim() || undefined,
        phone: bootPhone.trim() || undefined,
        password: bootPassword,
      });
      setDevFeedback({ type: 'success', text: "Compte Gestionnaire configuré avec succès ! Ouverture du portail..." });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setDevFeedback({ type: 'error', text: err.message || "Erreur lors de la configuration du compte gestionnaire." });
    } finally {
      setDevLoadingStatus(false);
    }
  };

  const checkCodeAvailability = async (code: string) => {
    if (!code || code.length < 3) {
      setCodeCheckStatus('idle');
      return;
    }
    setCodeCheckStatus('checking');
    try {
      const res = await api.checkSchoolCode(code);
      setCodeCheckStatus(res.available ? 'available' : 'taken');
    } catch {
      setCodeCheckStatus('idle');
    }
  };

  const toggleRegCycle = (cycleId: string) => {
    setRegForm((prev) => {
      const exists = prev.active_cycles.includes(cycleId);
      return {
        ...prev,
        active_cycles: exists
          ? prev.active_cycles.filter((c) => c !== cycleId)
          : [...prev.active_cycles, cycleId],
      };
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regForm.name.trim() || !regForm.code.trim() || !regForm.city.trim()) {
      setError("Le nom officiel de l'école, le code unique et la ville sont obligatoires.");
      return;
    }
    const promoteurName = (regForm.promoteurFullName || regForm.directorFullName || '').trim();
    const promoteurUser = (regForm.promoteurUsername || regForm.directorUsername || '').trim();
    const promoteurPass = regForm.promoteurPassword || regForm.directorPassword || '';

    if (!promoteurName || !promoteurUser) {
      setError("Le nom complet et l'identifiant du promoteur sont obligatoires.");
      return;
    }
    if (promoteurPass.length < 8) {
      setError('Le mot de passe du promoteur doit comporter au moins 8 caractères.');
      return;
    }
    if (codeCheckStatus === 'taken') {
      setError(`Le code "${regForm.code}" est déjà utilisé. Veuillez en choisir un autre.`);
      return;
    }

    setRegLoading(true);
    try {
      await registerNewSchool({
        ...regForm,
        promoteurFullName: promoteurName,
        promoteurUsername: promoteurUser,
        promoteurPassword: promoteurPass,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de l'établissement.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Veuillez saisir votre nom d'utilisateur et votre mot de passe.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await login({
        username: username.trim(),
        password,
        establishmentCode: establishmentCode.trim() ? establishmentCode.trim() : undefined,
      });

      if (res?.requireEstablishmentSelection) {
        setSchoolOptions(res.establishments);
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides ou compte suspendu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSchool = async (schoolId: string) => {
    setError(null);
    setLoading(true);
    try {
      await login({
        username: username.trim(),
        password,
        establishmentId: schoolId,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sélection de cet établissement.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockDevConsole = (e: React.FormEvent) => {
    e.preventDefault();
    setDevError(null);
    if (devPasskeyInput.trim() === 'EcoDev2026!') {
      setIsDevAuthorized(true);
    } else {
      setDevError('Clé de sécurité technique invalide. Accès refusé.');
    }
  };

  const handleQuickDevLogin = async (userKey: string, code?: string) => {
    setDevError(null);
    setDevLoading(true);
    try {
      await demoSwitchUser(userKey, code, 'EcoDev2026!');
      setShowDevModal(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setDevError(err.message || "Erreur lors du chargement du profil technique.");
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center overflow-x-hidden bg-slate-900 selection:bg-blue-600 selection:text-white">
      {/* 1. Photographie d'école réaliste en arrière-plan (Style lumineux et accueillant) */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/campus_background.jpg"
          alt="Campus Scolaire Eco GES"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top opacity-95 brightness-105"
        />
        {/* Dégradé doux sur le haut pour la clarté du ciel */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 via-transparent to-blue-900/60" />
      </div>

      {/* 2. Vagues dynamiques bleu vif en bas d'écran (identité visuelle Eco GES fidèle à la maquette) */}
      <div className="absolute inset-x-0 bottom-0 z-0 pointer-events-none overflow-hidden h-[65vh] max-h-[700px]">
        <svg
          viewBox="0 0 1440 680"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full text-blue-700/90"
        >
          <path
            fill="currentColor"
            d="M-50,300 C200,450 400,200 720,380 C1040,560 1250,320 1500,450 L1500,700 L-50,700 Z"
          />
        </svg>
        <svg
          viewBox="0 0 1440 680"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full text-blue-800"
        >
          <path
            fill="currentColor"
            d="M-50,360 C240,490 480,260 760,420 C1040,580 1200,380 1500,490 L1500,700 L-50,700 Z"
          />
        </svg>
        <svg
          viewBox="0 0 1440 680"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full text-blue-900"
        >
          <path
            fill="currentColor"
            d="M-50,420 C300,530 500,360 820,470 C1140,580 1300,440 1500,530 L1500,700 L-50,700 Z"
          />
        </svg>
      </div>

      {/* 3. Section Supérieure : Logo officiel Eco GES & Titres */}
      <header className="relative z-10 w-full pt-8 pb-3 sm:pt-10 sm:pb-4 flex flex-col items-center text-center px-4">
        {/* Emblème / Logo officiel Eco GES (Livre ouvert & diplôme or et bleu roi) */}
        <div className="relative mb-3 flex items-center justify-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/95 shadow-xl shadow-blue-950/20 border-2 border-white flex items-center justify-center backdrop-blur-md transition-transform hover:scale-105 duration-300">
            <svg
              viewBox="0 0 100 100"
              className="w-14 h-14 sm:w-16 sm:h-16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Chapeau de diplômé au sommet */}
              <path
                d="M50 16L78 28L50 40L22 28L50 16Z"
                fill="#1D4ED8"
              />
              <path
                d="M50 40V49C50 54 42 56 42 56V43"
                stroke="#1D4ED8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="50" cy="30" r="4" fill="#F59E0B" />
              {/* Tassel doré */}
              <path
                d="M74 30V48C74 50 76 52 78 52"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Livre ouvert stylisé en ailes bleues et dorées */}
              <path
                d="M20 44C26 44 42 41 50 47C58 41 74 44 80 44V76C74 76 58 73 50 79C42 73 26 76 20 76V44Z"
                fill="#2563EB"
              />
              <path
                d="M50 47V79"
                stroke="#1E40AF"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M26 49C33 49 43 47 48 52"
                stroke="#93C5FD"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M74 49C67 49 57 47 52 52"
                stroke="#93C5FD"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Bordure dorée d'excellence */}
              <path
                d="M20 76C26 76 42 73 50 79C58 73 74 76 80 76"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Titre de l'application Eco. GES */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-sm flex items-center justify-center">
          <span className="text-blue-900">Eco.</span>
          <span className="text-amber-500 ml-1.5 font-extrabold uppercase">GES</span>
        </h1>

        {/* Sous-titre officiel */}
        <p className="mt-1.5 text-xs sm:text-sm font-bold text-blue-950/90 tracking-wide max-w-sm sm:max-w-md drop-shadow-xs">
          Plateforme Intégrée de Gestion Scolaire
        </p>
        <p className="text-[11px] sm:text-xs font-semibold text-blue-800 tracking-wider uppercase">
          Multi-Établissements
        </p>
      </header>

      {/* 4. Carte Principale Flottante (Effet Verre / Glassmorphism Bleu & Blanc) */}
      <main className="relative z-10 w-full max-w-md px-4 sm:px-0 mb-6">
        <div className="bg-white/95 sm:bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-blue-950/30 border border-white/80 p-5 sm:p-7 overflow-hidden transition-all duration-300">
          
          {/* Barre d'onglets principale : « Connexion » et « Gestion d’application » */}
          <div className="bg-slate-100/90 p-1.5 rounded-2xl flex gap-1.5 mb-5 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveView('login');
                setSchoolOptions(null);
                setError(null);
              }}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer ${
                activeView === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Connexion</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView('app-management');
                setError(null);
                setDevFeedback(null);
                fetchBootstrapStatus();
              }}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer ${
                activeView === 'app-management'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-700 hover:text-blue-700 hover:bg-white/60'
              }`}
            >
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Gestion d’application</span>
            </button>
          </div>

          {/* Alertes d'erreur */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2.5 text-rose-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* VUE 1 : FORMULAIRE DE CONNEXION PRINCIPAL */}
          {activeView === 'login' && !schoolOptions && (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Champ 1 : Identifiant ou adresse e-mail */}
              <div className="relative">
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center space-x-3 text-slate-800 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-xs">
                  <User className="w-5 h-5 text-blue-600 shrink-0" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Identifiant, matricule ou téléphone"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Guide de connexion rapide multi-profils */}
              <div className="px-1 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold text-slate-700">Guide :</span>
                <span className="text-blue-700 font-medium">Personnel / Professeurs</span>
                <span>•</span>
                <span className="text-indigo-700 font-medium">Élèves (Matricule)</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium">Parents (Téléphone)</span>
              </div>

              {/* Champ 2 : Mot de passe avec œil afficher/masquer */}
              <div className="relative">
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center space-x-3 text-slate-800 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-xs">
                  <Lock className="w-5 h-5 text-blue-600 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-blue-600 p-1 focus:outline-none transition cursor-pointer"
                    aria-label="Afficher ou masquer le mot de passe"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Champ 3 : Code d'établissement (optionnel) */}
              <div className="relative">
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center space-x-3 text-slate-800 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-xs">
                  <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                  <input
                    type="text"
                    placeholder="Code d’établissement (optionnel)"
                    value={establishmentCode}
                    onChange={(e) => setEstablishmentCode(e.target.value.toUpperCase())}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium font-mono uppercase focus:outline-none"
                  />
                </div>
              </div>

              {/* Bouton Principal : Accéder à mon Espace */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Connexion en cours...</span>
                ) : (
                  <>
                    <span>Accéder à mon Espace</span>
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </button>

            </form>
          )}

          {/* VUE 1.1 : SÉLECTION D'ÉTABLISSEMENT SI MULTI-ÉCOLES */}
          {activeView === 'login' && schoolOptions && (
            <div className="space-y-3.5">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs">
                <p className="font-bold mb-1">Plusieurs écoles associées à votre profil</p>
                <p className="text-blue-700">Sélectionnez l'établissement scolaire auquel vous souhaitez vous connecter :</p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {schoolOptions.map((sch) => (
                  <button
                    key={sch.id}
                    type="button"
                    onClick={() => handleSelectSchool(sch.id)}
                    disabled={loading}
                    className="w-full p-3.5 bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700">
                        {sch.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span className="font-mono font-semibold text-blue-600">{sch.code}</span>
                        <span>•</span>
                        <span>{sch.city}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-600">{sch.role}</span>
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSchoolOptions(null)}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition text-center cursor-pointer"
              >
                ← Retour au formulaire de connexion
              </button>
            </div>
          )}

          {/* VUE 2 : GESTION D’APPLICATION (Portail Central Souverain) */}
          {activeView === 'app-management' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Shield className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-blue-950">
                      Gestion d’application Eco GES
                    </h3>

                  </div>
                </div>
              </div>

              {devFeedback && (
                <div className={`p-3 rounded-2xl flex items-start space-x-2 text-xs border ${
                  devFeedback.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{devFeedback.text}</span>
                </div>
              )}

              {/* Si jamais aucun compte n'existe encore sur la base : formulaire de première initialisation */}
              {devBootstrapStatus?.initialized === false ? (
                <form onSubmit={handleDevBootstrapSubmit} className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Configuration Initiale du Compte Gestionnaire</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Définissez vos identifiants souverains pour la première ouverture du portail.
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nom complet du Gestionnaire *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Mick Mouanda"
                      value={bootFullName}
                      onChange={(e) => setBootFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Identifiant Unique *
                      </label>
                      <input
                        type="text"
                        required
                        value={bootUsername}
                        onChange={(e) => setBootUsername(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Adresse Email
                      </label>
                      <input
                        type="email"
                        placeholder="mickmouanda@gmail.com"
                        value={bootEmail}
                        onChange={(e) => setBootEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mot de passe *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={bootPassword}
                        onChange={(e) => setBootPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Confirmer *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={bootConfirmPassword}
                        onChange={(e) => setBootConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={devLoadingStatus}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {devLoadingStatus ? "Initialisation..." : "Initialiser et Ouvrir le Portail Central →"}
                  </button>
                </form>
              ) : (
                /* Formulaire de Connexion Direct Gestionnaire d'application */
                <form onSubmit={handleDevLogin} className="space-y-3.5">
                  <div className="relative">
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center space-x-3 text-slate-800 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-xs">
                      <User className="w-5 h-5 text-blue-600 shrink-0" />
                      <input
                        type="text"
                        required
                        placeholder="Identifiant du gestionnaire"
                        value={devUsername}
                        onChange={(e) => setDevUsername(e.target.value)}
                        className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center space-x-3 text-slate-800 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-xs">
                      <Lock className="w-5 h-5 text-blue-600 shrink-0" />
                      <input
                        type={showDevPassword ? 'text' : 'password'}
                        required
                        placeholder="Mot de passe gestionnaire"
                        value={devPassword}
                        onChange={(e) => setDevPassword(e.target.value)}
                        className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDevPassword(!showDevPassword)}
                        className="text-slate-400 hover:text-blue-600 p-1 focus:outline-none transition cursor-pointer"
                        aria-label="Afficher ou masquer le mot de passe"
                      >
                        {showDevPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={devLoadingStatus}
                    className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 active:from-blue-900 text-white rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg shadow-blue-700/30 hover:shadow-xl hover:shadow-blue-700/40 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {devLoadingStatus ? (
                      <span>Vérification des autorisations...</span>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 text-amber-300" />
                        <span>Ouvrir le Portail Central</span>
                        <ArrowRight className="w-5 h-5 ml-1" />
                      </>
                    )}
                  </button>
                </form>
              )}


            </div>
          )}

          {/* VUE 3 : INSCRIRE UN NOUVEL ÉTABLISSEMENT AVEC CODE D'AUTORISATION */}
          {activeView === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveView('login')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <span>← Retour à la connexion</span>
                </button>
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Espace Promoteur
                </span>
              </div>

              {/* Code d'autorisation */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-1.5">
                <label className="block text-xs font-bold text-blue-950 flex items-center space-x-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Code d'Autorisation de Création</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: AUTH-2026-XXXX"
                  value={regForm.authorization_code || ''}
                  onChange={(e) => setRegForm({ ...regForm, authorization_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-mono font-bold uppercase text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[10px] text-blue-700">
                  Fourni par l'administration générale Eco GES pour débloquer votre établissement.
                </p>
              </div>

              {/* Détails de l'école */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>Informations de l'Établissement</span>
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nom officiel de l'École *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Complexe Scolaire Saint-Exupéry"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Code unique *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CS-STEX"
                      value={regForm.code}
                      onChange={(e) => {
                        const codeVal = e.target.value.toUpperCase();
                        setRegForm({ ...regForm, code: codeVal });
                        checkCodeAvailability(codeVal);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ville *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Brazzaville..."
                      value={regForm.city}
                      onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Cycles activés */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Cycles d'enseignement activés :
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'PRE_SCOLAIRE', label: 'Maternelle' },
                      { id: 'PRIMAIRE', label: 'Primaire' },
                      { id: 'COLLEGE', label: 'Collège' },
                      { id: 'LYCEE', label: 'Lycée' },
                    ].map((cyc) => {
                      const active = regForm.active_cycles.includes(cyc.id);
                      return (
                        <button
                          key={cyc.id}
                          type="button"
                          onClick={() => toggleRegCycle(cyc.id)}
                          className={`p-1.5 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {cyc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Compte du Promoteur */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compte Promoteur / Administrateur</span>
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nom complet du Promoteur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="M. / Mme ..."
                    value={regForm.promoteurFullName}
                    onChange={(e) => setRegForm({ ...regForm, promoteurFullName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Identifiant *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: prom.mouanda"
                      value={regForm.promoteurUsername}
                      onChange={(e) => setRegForm({ ...regForm, promoteurUsername: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regForm.promoteurPassword}
                      onChange={(e) => setRegForm({ ...regForm, promoteurPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading || codeCheckStatus === 'taken'}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {regLoading ? (
                  <span>Initialisation de l'école...</span>
                ) : (
                  <>
                    <span>Créer l'Établissement & Ouvrir l'Espace</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </main>

      {/* 5. Bas de page : Signature commerciale officielle */}
      <footer className="relative z-10 w-full pb-6 pt-2 flex flex-col items-center justify-center px-4">
        <div className="flex items-center justify-center space-x-3 text-[10px] sm:text-xs font-bold tracking-widest text-white/95 uppercase drop-shadow-md">
          <span className="h-[1px] w-6 sm:w-12 bg-white/40"></span>
          <span>PRODUIT MIFAT SOLUTIONS BY MICHAEL G. MOUANDA</span>
          <span className="h-[1px] w-6 sm:w-12 bg-white/40"></span>
        </div>
      </footer>

      {/* 6. Modal Sécurisée pour les Tests Techniques Multi-Écoles */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 my-8 space-y-4 text-xs">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span>Console Technique & Tests Multi-Écoles</span>
              </h3>
              <button
                type="button"
                onClick={() => { setShowDevModal(false); setDevPasskeyInput(''); }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {devError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{devError}</span>
              </div>
            )}

            {!isDevAuthorized ? (
              <form onSubmit={handleUnlockDevConsole} className="space-y-3">
                <p className="text-slate-600 leading-relaxed text-xs">
                  Cette console est protégée. Saisissez la clé technique de test :
                </p>
                <div>
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Saisissez la clé technique..."
                    value={devPasskeyInput}
                    onChange={(e) => setDevPasskeyInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDevModal(false)}
                    className="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Déverrouiller
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px]">
                  <p className="font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    <span>Environnement de test déverrouillé</span>
                  </p>
                  <p className="text-blue-700">
                    Basculez instantanément sur les profils de test pour vérifier l'étanchéité des données.
                  </p>
                </div>

                {/* Profil Gestionnaire Général */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 text-[11px]">
                    <span className="font-bold text-slate-900">Plateforme Centrale Eco GES</span>
                    <span className="text-blue-600 font-mono font-bold">ECO-HQ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickDevLogin('admin.general', 'ECO-HQ')}
                    disabled={devLoading}
                    className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-left text-[11px] font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span>Gestionnaire d’application (admin.general)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* École 1 */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 text-[11px]">
                    <span className="font-bold text-slate-900">Institut Pilote Brazza Excellence (ECO-001)</span>
                    <span className="text-blue-600 font-mono">Brazzaville</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleQuickDevLogin('directeur.eco1', 'ECO-001')}
                      disabled={devLoading}
                      className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                    >
                      🎓 Directeur
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDevLogin('comptable.eco1', 'ECO-001')}
                      disabled={devLoading}
                      className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                    >
                      💰 Comptable
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDevLogin('prof.maths.eco1', 'ECO-001')}
                      disabled={devLoading}
                      className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                    >
                      📚 Enseignant
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDevLogin('parent.kouba', 'ECO-001')}
                      disabled={devLoading}
                      className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                    >
                      👨‍👩‍👦 Espace Parent
                    </button>
                  </div>
                </div>

                {/* École 2 */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 text-[11px]">
                    <span className="font-bold text-slate-900">Lycée Scientifique Océan (ECO-002)</span>
                    <span className="text-blue-600 font-mono">Pointe-Noire</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleQuickDevLogin('directeur.eco2', 'ECO-002')}
                      disabled={devLoading}
                      className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                    >
                      🎓 Directeur
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDevLogin('prof.physique.eco2', 'ECO-002')}
                      disabled={devLoading}
                      className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                    >
                      🧪 Enseignant
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
