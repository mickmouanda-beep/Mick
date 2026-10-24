import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Users,
  UserPlus,
  ShieldCheck,
  Building,
  KeyRound,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { User, AuditLog, UserRole } from '../types.ts';
import { ROLE_LABELS } from '../components/Navbar.tsx';
import { SchoolLogoCapture } from '../components/SchoolLogoCapture.tsx';

export const AdministrationView: React.FC = () => {
  const { establishment, hasRole, user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'settings' | 'password'>('users');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Créer Utilisateur
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('GESTIONNAIRE');
  const [newPassword, setNewPassword] = useState('');

  // Modal Réinitialiser Mot de passe
  const [showResetModal, setShowResetModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [resetPassValue, setResetPassValue] = useState('');

  // Paramètres Établissement
  const [estName, setEstName] = useState(establishment?.name || '');
  const [estLogo, setEstLogo] = useState(establishment?.logo_url || '');
  const [estCity, setEstCity] = useState(establishment?.city || 'Brazzaville');
  const [estAddress, setEstAddress] = useState(establishment?.address || '');
  const [estPhone, setEstPhone] = useState(establishment?.phone || '');
  const [estEmail, setEstEmail] = useState(establishment?.email || '');
  const [estMotto, setEstMotto] = useState(establishment?.motto || '');
  const [estYear, setEstYear] = useState(establishment?.academic_year || '2026-2027');

  // Changement de mot de passe personnel
  const [currentPass, setCurrentPass] = useState('');
  const [newPersonalPass, setNewPersonalPass] = useState('');
  const [confirmPersonalPass, setConfirmPersonalPass] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPromoteur = hasRole('PROMOTEUR');
  const isDG = hasRole('DIRECTEUR_GENERAL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [uData, aData] = await Promise.all([
        api.getUsers(),
        (isPromoteur || isDG) ? api.getAuditLogs() : Promise.resolve([]),
      ]);
      setUsersList(uData);
      setAuditLogs(aData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données administratives.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newUsername.trim() || !newFullName.trim() || !newPassword) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    try {
      await api.createUser({
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        role: newRole,
        password: newPassword,
      });

      setSuccess(`Le compte de ${newFullName} (${newRole}) a été créé avec succès.`);
      setShowCreateUserModal(false);
      setNewUsername('');
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'réactiver' : 'suspendre';
    if (!window.confirm(`Voulez-vous vraiment ${actionLabel} ce compte utilisateur ?`)) return;

    try {
      await api.updateUserStatus(userId, nextStatus);
      setSuccess(`Statut du compte mis à jour (${nextStatus}).`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !resetPassValue || resetPassValue.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    try {
      await api.resetUserPassword(targetUserId, resetPassValue);
      setSuccess('Le mot de passe du collaborateur a été réinitialisé.');
      setShowResetModal(false);
      setResetPassValue('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.updateSettings({
        name: estName,
        city: estCity,
        address: estAddress,
        phone: estPhone,
        email: estEmail,
        motto: estMotto,
        academicYear: estYear,
        activeCycles: establishment?.active_cycles || ['PRE_SCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'],
        logo_url: estLogo,
      });
      setSuccess("Paramètres de l'établissement mis à jour.");
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChangePersonalPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPersonalPass.length < 8) {
      setError('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (newPersonalPass !== confirmPersonalPass) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    try {
      await api.changePassword({
        currentPassword: currentPass,
        newPassword: newPersonalPass,
      });
      setSuccess('Votre mot de passe a été modifié avec succès.');
      setCurrentPass('');
      setNewPersonalPass('');
      setConfirmPersonalPass('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>Administration, Sécurité & Traçabilité</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestion des profils et des accès • Journaux d'audit immuables • Paramètres institutionnels
          </p>
        </div>

        {isPromoteur && (
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Créer un Compte Personnel</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl flex items-center space-x-2 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center space-x-2 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Onglets */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Personnel & Rôles ({usersList.length})</span>
        </button>

        {(isPromoteur || isDG) && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Journal d'Audit ({auditLogs.length})</span>
          </button>
        )}

        {(isPromoteur || isDG) && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Paramètres Établissement</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'password'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Mon Mot de Passe</span>
        </button>
      </div>

      {/* TAB 1: PERSONNEL & RÔLES */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Collaborateur</th>
                  <th className="p-3.5">Identifiant</th>
                  <th className="p-3.5">Rôle & Niveau d'Accès</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Statut du Compte</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => {
                  const meta = ROLE_LABELS[u.role] || { label: u.role, badgeColor: 'bg-slate-800 text-slate-300' };
                  const isSelf = u.id === user?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-white flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                          {u.full_name[0]}
                        </div>
                        <span>{u.full_name}</span>
                        {isSelf && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded">
                            (Vous)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">{u.username}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.badgeColor}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">{u.phone || u.email || '-'}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}>
                          {u.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        {!isSelf && (isPromoteur || isDG) && (
                          <>
                            <button
                              onClick={() => {
                                setTargetUserId(u.id);
                                setShowResetModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                              title="Réinitialiser le mot de passe"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(u.id, u.status)}
                              className={`p-1.5 rounded transition ${
                                u.status === 'ACTIVE'
                                  ? 'text-amber-400 hover:bg-amber-950/30'
                                  : 'text-emerald-400 hover:bg-emerald-950/30'
                              }`}
                              title={u.status === 'ACTIVE' ? 'Suspendre le compte' : 'Activer le compte'}
                            >
                              {u.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: JOURNAL D'AUDIT */}
      {activeTab === 'audit' && (isPromoteur || isDG) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold text-slate-300">Journalisation immuable des opérations de sécurité</span>
            <span>200 derniers événements enregistrés</span>
          </div>

          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 sticky top-0 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Horodatage</th>
                  <th className="p-3">Auteur</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entité Ciblée</th>
                  <th className="p-3">Détails de l'Événement</th>
                  <th className="p-3">Adresse IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400">{log.created_at}</td>
                    <td className="p-3 font-semibold text-white font-sans">{log.user_name || 'Système'}</td>
                    <td className="p-3 font-bold text-indigo-300">{log.action}</td>
                    <td className="p-3 text-slate-400">{log.entity_type} ({log.entity_id || '-'})</td>
                    <td className="p-3 text-slate-300 max-w-xs truncate">{log.details || '-'}</td>
                    <td className="p-3 text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PARAMÈTRES DE L'ÉTABLISSEMENT */}
      {activeTab === 'settings' && (isPromoteur || isDG) && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs max-w-2xl shadow-sm">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Building className="w-4 h-4 text-indigo-400" />
            <span>Configuration de l'Établissement Scolaire</span>
          </h2>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Nom Officiel de l'Établissement *</label>
            <input
              type="text"
              required
              value={estName}
              onChange={(e) => setEstName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
            />
          </div>

          {/* Logo de l'Établissement */}
          <SchoolLogoCapture
            logoUrl={estLogo}
            onChange={(logo) => setEstLogo(logo || '')}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Ville (Congo-Brazzaville)</label>
              <input
                type="text"
                required
                value={estCity}
                onChange={(e) => setEstCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Année Scolaire Active</label>
              <input
                type="text"
                required
                value={estYear}
                onChange={(e) => setEstYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Devise de l'Établissement</label>
            <input
              type="text"
              placeholder="Ex: Discipline - Travail - Succès"
              value={estMotto}
              onChange={(e) => setEstMotto(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Téléphone de l'Établissement</label>
              <input
                type="text"
                value={estPhone}
                onChange={(e) => setEstPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Email Officiel</label>
              <input
                type="email"
                value={estEmail}
                onChange={(e) => setEstEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Adresse Géographique</label>
            <input
              type="text"
              value={estAddress}
              onChange={(e) => setEstAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
            >
              Mettre à Jour les Paramètres
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: MON MOT DE PASSE PERSONNEL */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePersonalPassword} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs max-w-md shadow-sm">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>Modifier Mon Mot de Passe</span>
          </h2>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Mot de passe actuel *</label>
            <input
              type="password"
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Nouveau mot de passe (min. 8 car.) *</label>
            <input
              type="password"
              required
              value={newPersonalPass}
              onChange={(e) => setNewPersonalPass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Confirmer le nouveau mot de passe *</label>
            <input
              type="password"
              required
              value={confirmPersonalPass}
              onChange={(e) => setConfirmPersonalPass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
            >
              Changer Mon Mot de Passe
            </button>
          </div>
        </form>
      )}

      {/* MODAL CRÉER PERSONNEL */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Créer un Compte de Direction / Personnel</span>
              </h2>
              <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Profil / Rôle Attribué *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                >
                  <option value="DIRECTEUR_GENERAL">Directeur Général (DG)</option>
                  <option value="DIRECTEUR_ETUDES">Directeur des Études (DE)</option>
                  <option value="GESTIONNAIRE">Gestionnaire Scolarité (Inscriptions)</option>
                  <option value="COMPTABLE">Comptable / Caisse</option>
                  <option value="SURVEILLANT">Surveillant Général</option>
                  {isPromoteur && <option value="PROMOTEUR">Co-Promoteur</option>}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="M. ou Mme..."
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Identifiant de Connexion *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: dg.moukoko"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Téléphone</label>
                  <input
                    type="text"
                    placeholder="+242..."
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@ecole.cg"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Mot de passe temporaire (min. 8 car.) *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Créer le Compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÉINITIALISER MOT DE PASSE */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-2 flex items-center space-x-2">
              <RotateCcw className="w-5 h-5 text-indigo-400" />
              <span>Nouveau Mot de Passe</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Attribuez un nouveau mot de passe sécurisé à ce collaborateur.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Mot de passe (min. 8 car.) *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={resetPassValue}
                  onChange={(e) => setResetPassValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
