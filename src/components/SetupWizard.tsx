import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import { api, setAuthToken } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const SetupWizard: React.FC = () => {
  const { checkStatus, refreshUser } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [demoLoading, setDemoLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [establishmentName, setEstablishmentName] = useState('');
  const [city, setCity] = useState('Brazzaville');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [activeCycles, setActiveCycles] = useState<string[]>([
    'PRE_SCOLAIRE',
    'PRIMAIRE',
    'COLLEGE',
    'LYCEE'
  ]);

  const [promoteurFullName, setPromoteurFullName] = useState('');
  const [promoteurUsername, setPromoteurUsername] = useState('');
  const [promoteurEmail, setPromoteurEmail] = useState('');
  const [promoteurPhone, setPromoteurPhone] = useState('');
  const [promoteurPassword, setPromoteurPassword] = useState('');
  const [promoteurPasswordConfirm, setPromoteurPasswordConfirm] = useState('');

  const toggleCycle = (cycleCode: string) => {
    if (activeCycles.includes(cycleCode)) {
      if (activeCycles.length === 1) return; // au moins un cycle
      setActiveCycles(activeCycles.filter(c => c !== cycleCode));
    } else {
      setActiveCycles([...activeCycles, cycleCode]);
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!establishmentName.trim()) {
        setError("Veuillez renseigner le nom de l'établissement scolaire.");
        return;
      }
      if (!city.trim() || !academicYear.trim()) {
        setError("La ville et l'année scolaire sont obligatoires.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (activeCycles.length === 0) {
        setError('Veuillez activer au moins un cycle d’enseignement.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!promoteurFullName.trim() || !promoteurUsername.trim()) {
      setError("Le nom complet et le nom d'utilisateur du promoteur sont requis.");
      return;
    }

    if (promoteurPassword.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (promoteurPassword !== promoteurPasswordConfirm) {
      setError('Les mots de passe saisis ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.initializeSetup({
        establishmentName,
        city,
        address,
        phone,
        email,
        academicYear,
        activeCycles,
        promoteurFullName,
        promoteurUsername,
        promoteurEmail,
        promoteurPassword,
        promoteurPhone,
      });

      if (res.token) {
        setAuthToken(res.token);
      }
      await checkStatus();
      await refreshUser();
    } catch (err: any) {
      setError(err.message || "Échec de l'initialisation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!window.confirm("Initialiser la base avec les données de test (élèves, classes du collège et lycée, 7 profils avec mot de passe 'Faith2026!') ?")) {
      return;
    }
    setDemoLoading(true);
    setError(null);
    try {
      await api.seedDemoData();
      await checkStatus();
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données de test.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-amber-600 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Eco. Ges.</h1>
              <p className="text-blue-100 text-sm font-medium">République du Congo • Système Intégré de Gestion Scolaire</p>
            </div>
          </div>
          <p className="text-sm text-blue-50/90 mt-3 max-w-xl">
            Bienvenue dans l'assistant d'initialisation. Ce processus configure votre établissement scolaire et crée le compte sécurisé du Promoteur sans aucune donnée fictive initiale.
          </p>

          {/* Stepper */}
          <div className="flex items-center space-x-4 mt-6 pt-4 border-t border-white/15">
            <div className={`flex items-center space-x-2 text-xs font-semibold ${step >= 1 ? 'text-amber-300' : 'text-blue-200/60'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'bg-amber-400 text-slate-900 border-amber-300' : 'border-white/30 text-white/60'}`}>1</div>
              <span>Établissement</span>
            </div>
            <div className="w-8 h-0.5 bg-white/20" />
            <div className={`flex items-center space-x-2 text-xs font-semibold ${step >= 2 ? 'text-amber-300' : 'text-blue-200/60'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'bg-amber-400 text-slate-900 border-amber-300' : 'border-white/30 text-white/60'}`}>2</div>
              <span>Cycles Homologués</span>
            </div>
            <div className="w-8 h-0.5 bg-white/20" />
            <div className={`flex items-center space-x-2 text-xs font-semibold ${step >= 3 ? 'text-amber-300' : 'text-blue-200/60'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 3 ? 'bg-amber-400 text-slate-900 border-amber-300' : 'border-white/30 text-white/60'}`}>3</div>
              <span>Compte Promoteur</span>
            </div>
          </div>
        </div>

        {/* Corps du Formulaire */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start space-x-3 text-rose-200 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>Identification de l'Établissement</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom officiel de l'Établissement *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Complexe Scolaire Saint-Exupéry"
                    value={establishmentName}
                    onChange={(e) => setEstablishmentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ville (Congo) *</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Brazzaville">Brazzaville</option>
                    <option value="Pointe-Noire">Pointe-Noire</option>
                    <option value="Dolisie">Dolisie (Niari)</option>
                    <option value="Nkayi">Nkayi (Bouenza)</option>
                    <option value="Oyo">Oyo (Cuvette)</option>
                    <option value="Ouesso">Ouesso (Sangha)</option>
                    <option value="Kinkala">Kinkala (Pool)</option>
                    <option value="Madingou">Madingou</option>
                    <option value="Impfondo">Impfondo (Likouala)</option>
                    <option value="Sibiti">Sibiti (Lékoumou)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Année Scolaire Active *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2026-2027"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Adresse / Quartier
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Arrondissement 4 Moungali, Rue Lékana"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Téléphone Institutionnel</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+242 06 ..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Officiel</span>
                  </label>
                  <input
                    type="email"
                    placeholder="direction@ecole.cg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/30"
                >
                  <span>Suivant : Sélection des Cycles</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Cycles d'Enseignement Homologués</span>
              </h2>
              <p className="text-xs text-slate-400">
                Sélectionnez les ordres d'enseignement réellement ouverts dans votre établissement. Le référentiel officiel national du Congo-Brazzaville sera préconfiguré.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  {
                    code: 'PRE_SCOLAIRE',
                    title: 'Préscolaire (P1, P2, P3)',
                    desc: 'Petite, Moyenne et Grande Section.',
                  },
                  {
                    code: 'PRIMAIRE',
                    title: 'Primaire (CP1, CP2, CE1, CE2, CM1, CM2)',
                    desc: 'Cycle complet menant au Certificat d’Études Primaires (CEPE).',
                  },
                  {
                    code: 'COLLEGE',
                    title: 'Collège (6ème, 5ème, 4ème, 3ème)',
                    desc: 'Enseignement secondaire 1er degré menant au BEPC.',
                  },
                  {
                    code: 'LYCEE',
                    title: 'Lycée Général & Technique',
                    desc: 'Secondaire 2nd degré (Seconde, Première, Terminale) avec les séries officielles A, D, C, G1-G3, BG, F1-F6, H1-H6.',
                  },
                ].map((item) => {
                  const active = activeCycles.includes(item.code);
                  return (
                    <div
                      key={item.code}
                      onClick={() => toggleCycle(item.code)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        active
                          ? 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-semibold text-sm text-slate-200">{item.title}</span>
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border ${
                            active ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600'
                          }`}
                        >
                          {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{item.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/30"
                >
                  <span>Suivant : Compte Promoteur</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span>Création du Premier Compte Promoteur (Propriétaire)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Le Promoteur détient le niveau d'autorité le plus élevé. Il configure les politiques, crée les comptes de direction (DG, DE, Comptable) et consulte les journaux d'audit.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nom et Prénoms du Promoteur *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="M. Jean-Paul NGOUABI"
                    value={promoteurFullName}
                    onChange={(e) => setPromoteurFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Identifiant / Nom d'utilisateur *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="promoteur"
                    value={promoteurUsername}
                    onChange={(e) => setPromoteurUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email personnel / pro</span>
                  </label>
                  <input
                    type="email"
                    placeholder="promoteur@cs-ecole.cg"
                    value={promoteurEmail}
                    onChange={(e) => setPromoteurEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Téléphone mobile</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+242 06 ..."
                    value={promoteurPhone}
                    onChange={(e) => setPromoteurPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mot de passe robuste (min. 8 car.) *</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={promoteurPassword}
                    onChange={(e) => setPromoteurPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Confirmation du mot de passe *</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={promoteurPasswordConfirm}
                    onChange={(e) => setPromoteurPasswordConfirm(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold flex items-center space-x-2 transition shadow-xl shadow-emerald-700/30 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Initialisation du système...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finaliser et Ouvrir l'Établissement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Optionnel : Mode Test / Évaluation directe */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/40">
            <div>
              <p className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Environnement de Test & Démonstration rapide</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Pour évaluer instantanément les 7 profils (Promoteur, DG, DE, Enseignant, etc.), vous pouvez charger les données de test préconfigurées pour le Complexe Scolaire La Renaissance (Brazzaville).
              </p>
            </div>
            <button
              type="button"
              onClick={handleSeedDemo}
              disabled={demoLoading}
              className="shrink-0 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 rounded-lg text-xs font-semibold transition"
            >
              {demoLoading ? 'Chargement en cours...' : 'Charger la Démo Complète'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
