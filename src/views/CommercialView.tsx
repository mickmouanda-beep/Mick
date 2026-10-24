import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building,
  Building2,
  CheckCircle2,
  Users,
  Shield,
  Layers,
  Database,
  Smartphone,
  Server,
  Lock,
  PlusCircle,
  Search,
  ExternalLink,
  GraduationCap,
  Calendar,
  MapPin,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { RegisterSchoolPayload } from '../types.ts';
import { SchoolLogoCapture } from '../components/SchoolLogoCapture.tsx';

export const CommercialView: React.FC = () => {
  const { establishment, user, switchEstablishment, registerNewSchool } = useAuth();

  if (user?.role !== 'ADMIN_GENERAL') {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-12 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white">Accès Réservé au Gestionnaire d’application</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Le module « Multi-Écoles & Licences » est exclusivement géré par l'Administration Centrale Eco GES (Gestionnaire d’application). Les promoteurs et directeurs administrent leur établissement scolaire en étanchéité complète.
        </p>
      </div>
    );
  }

  const [subscription, setSubscription] = useState<any>(null);
  const [establishmentsList, setEstablishmentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // New School Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [codeCheckStatus, setCodeCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [form, setForm] = useState<RegisterSchoolPayload>({
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

  const loadData = async () => {
    try {
      const [settingsRes, estsRes] = await Promise.all([
        api.getSettings(),
        api.getEstablishments(),
      ]);
      setSubscription(settingsRes.subscription);
      setEstablishmentsList(estsRes);
    } catch (err) {
      console.error('Erreur chargement données multi-écoles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitch = async (targetId: string) => {
    if (targetId === establishment?.id) return;
    setSwitchingId(targetId);
    try {
      await switchEstablishment(targetId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors du basculement d'école.");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCodeChange = async (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
    setForm((prev) => ({ ...prev, code: clean }));
    if (clean.length < 3) {
      setCodeCheckStatus('idle');
      return;
    }
    setCodeCheckStatus('checking');
    try {
      const res = await api.checkSchoolCode(clean);
      setCodeCheckStatus(res.available ? 'available' : 'taken');
    } catch {
      setCodeCheckStatus('idle');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!form.name.trim() || !form.code.trim() || !form.city.trim()) {
      setModalError("Le nom de l'école, le code unique et la ville sont obligatoires.");
      return;
    }
    const promName = (form.promoteurFullName || form.directorFullName || '').trim();
    const promUser = (form.promoteurUsername || form.directorUsername || '').trim();
    const promPass = form.promoteurPassword || form.directorPassword || '';

    if (!promName || !promUser) {
      setModalError("Le nom complet et l'identifiant du promoteur sont requis.");
      return;
    }
    if (promPass.length < 8) {
      setModalError('Le mot de passe du promoteur doit comporter au moins 8 caractères.');
      return;
    }

    setModalLoading(true);
    try {
      await registerNewSchool({
        ...form,
        promoteurFullName: promName,
        promoteurUsername: promUser,
        promoteurPassword: promPass,
      });
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || "Erreur lors de la création de l'établissement.");
    } finally {
      setModalLoading(false);
    }
  };

  const filteredSchools = establishmentsList.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <span>Plateforme Multi-Établissements & Licences</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestion centralisée multi-écoles • Isolation stricte des données par identifiant unique • Congo-Brazzaville
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setShowAddModal(true); setModalError(null); }}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition space-x-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Créer un Nouvel Établissement</span>
        </button>
      </div>

      {/* Carte d'Abonnement de l'Établissement Actuel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Éspace Actif
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                {establishment?.code}
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">
              {establishment?.name}
            </h2>
            <p className="text-xs text-slate-400">
              {establishment?.city} • Année Scolaire {establishment?.academic_year} • {establishment?.currency || 'FCFA'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Statut : {subscription?.status || 'ACTIF'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <span className="text-slate-400">Capacité Maximale Élèves</span>
            <p className="text-2xl font-black text-white mt-1 font-mono">
              {subscription?.max_students || 500}
            </p>
            <span className="text-[10px] text-slate-500">Inscriptions autorisées</span>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <span className="text-slate-400">Comptes Utilisateurs / Personnel</span>
            <p className="text-2xl font-black text-white mt-1 font-mono">
              {subscription?.max_users || 50}
            </p>
            <span className="text-[10px] text-slate-500">Directions & Enseignants</span>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <span className="text-slate-400">Validité de la Licence</span>
            <p className="text-lg font-bold text-amber-300 mt-1 font-mono">
              {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString('fr-FR') : 'Année Scolaire 2026-2027'}
            </p>
            <span className="text-[10px] text-slate-500">Renouvelable par le Promoteur</span>
          </div>
        </div>
      </div>

      {/* Répertoire des Établissements Enregistrés sur Eco GES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span>Établissements Enregistrés sur la Plateforme ({establishmentsList.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chaque établissement possède un identifiant cryptographique et une base de données isolée
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, code ou ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Grille des Écoles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredSchools.map((school) => {
            const isCurrent = school.id === establishment?.id;
            return (
              <div
                key={school.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                        {school.code}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-1.5 leading-snug">
                        {school.name}
                      </h4>
                    </div>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Actif
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 flex items-center space-x-1 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{school.city || 'Congo-Brazzaville'} • {school.academic_year || '2026-2027'}</span>
                  </p>

                  {/* Statistiques rapides si Admin Général */}
                  {school.student_count !== undefined && (
                    <div className="grid grid-cols-3 gap-2 py-2 mb-3 border-y border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500">Élèves</span>
                        <p className="font-bold text-white font-mono">{school.student_count}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Profs</span>
                        <p className="font-bold text-white font-mono">{school.teacher_count}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Classes</span>
                        <p className="font-bold text-white font-mono">{school.class_count}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bouton de basculement si Admin Général */}
                {user?.role === 'ADMIN_GENERAL' && !isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleSwitch(school.id)}
                    disabled={switchingId === school.id}
                    className="w-full mt-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center justify-center space-x-1.5"
                  >
                    <span>{switchingId === school.id ? 'Basculement en cours...' : 'Ouvrir cet établissement'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Spécifications d'Architecture Commerciale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Séparation Stricte des Données Multi-Écoles</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Chaque enregistrement (utilisateurs, classes, élèves, quittances de caisse, notes, journaux d'audit) est cloisonné par un identifiant unique <code className="text-amber-300 font-mono">establishment_id</code>. Les requêtes de base de données exécutées côté serveur appliquent ce filtre pour garantir une étanchéité absolue entre établissements scolaires distincts.
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Base relationnelle ACID avec clés étrangères et intégrité référentielle</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Sécurité des mots de passe avec salage bcrypt (10 rounds)</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Unicité stricte des codes écoles (index unique)</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-teal-400" />
            <span>Évolutivité Vers Applications Mobiles Android & Tablettes</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Le backend Node.js / Express expose une API REST découplée sous le préfixe standard <code className="text-amber-300 font-mono">/api/*</code> avec authentification par jeton Bearer JWT. Cette architecture permet de connecter les applications pour les parents d'élèves (consultation des bulletins, suivi des présences) et pour les enseignants (saisie des notes).
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Endpoints REST documentés et standardisés en JSON</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Contrôle d'accès basé sur les rôles (RBAC) validé côté serveur</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Sessions sécurisées et déconnexion complète garantie</span>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Ajout Établissement */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                <span>Créer un Nouvel Établissement</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom Officiel de l'École *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lycée Nelson Mandela"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* LOGO DE L'ÉTABLISSEMENT */}
              <SchoolLogoCapture
                logoUrl={form.logo_url}
                onChange={(logo) => setForm((prev) => ({ ...prev, logo_url: logo || '' }))}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Code Unique *</span>
                    {codeCheckStatus === 'available' && <span className="text-[10px] text-emerald-400">✓ Libre</span>}
                    {codeCheckStatus === 'taken' && <span className="text-[10px] text-rose-400">✗ Pris</span>}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: LNM-BZV"
                    value={form.code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono uppercase text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Brazzaville, Pointe-Noire..."
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Compte du Promoteur / Administrateur Principal
                </span>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nom Complet du Promoteur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="M. / Mme ... (Promoteur)"
                    value={form.promoteurFullName}
                    onChange={(e) => setForm({ ...form, promoteurFullName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Identifiant de connexion *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: prom.mandela"
                      value={form.promoteurUsername}
                      onChange={(e) => setForm({ ...form, promoteurUsername: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Mot de Passe * (min 8)
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={form.promoteurPassword}
                      onChange={(e) => setForm({ ...form, promoteurPassword: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || codeCheckStatus === 'taken'}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {modalLoading ? 'Création en cours...' : 'Créer et Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
