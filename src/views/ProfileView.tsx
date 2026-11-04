import React, { useState, useEffect } from 'react';
import {
  User,
  KeyRound,
  Shield,
  Building,
  CheckCircle2,
  AlertCircle,
  Lock,
  Search,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';

export const ProfileView: React.FC = () => {
  const { user, establishment } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Password reset for other users (Promoteur / Gestionnaire)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [resetTargetType, setResetTargetType] = useState<'staff' | 'student'>('staff');
  const [selectedTargetUser, setSelectedTargetUser] = useState<any | null>(null);
  const [tempPasswordResult, setTempPasswordResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const canResetStaff = ['PROMOTEUR', 'DIRECTEUR_GENERAL'].includes(user?.role || '');
  const canResetStudents = ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'GESTIONNAIRE'].includes(user?.role || '');

  useEffect(() => {
    if (canResetStaff || canResetStudents) {
      loadDirectoryData();
    }
  }, [user?.role]);

  const loadDirectoryData = async () => {
    try {
      const [uRes, sRes] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getStudents().catch(() => [])
      ]);
      setUsersList(uRes || []);
      setStudentsList(sRes || []);
    } catch {}
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Le nouveau mot de passe doit comporter au moins 8 caractères.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    setLoadingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Votre mot de passe a été mis à jour avec succès.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Erreur lors du changement de mot de passe.' });
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleResetUserPassword = async (targetId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser le mot de passe de cet utilisateur ? Un mot de passe provisoire sera généré.')) {
      return;
    }
    setLoadingReset(true);
    setTempPasswordResult(null);
    try {
      const res = await api.resetUserPassword(targetId, 'Eco' + Math.floor(100000 + Math.random() * 900000) + '!');
      setTempPasswordResult(res.temporaryPassword);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setLoadingReset(false);
    }
  };

  const handleResetStudentPassword = async (studentId: string) => {
    if (!confirm('Générer de nouveaux identifiants / mot de passe provisoire pour cet élève / parent ?')) {
      return;
    }
    setLoadingReset(true);
    setTempPasswordResult(null);
    try {
      const res = await api.provisionStudentAccounts(studentId);
      setTempPasswordResult(`Élève: ${res.accounts.studentAccount.temporaryPassword} | Parent: ${res.accounts.parentAccount.temporaryPassword}`);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réinitialisation des comptes de l’élève.');
    } finally {
      setLoadingReset(false);
    }
  };

  const filteredUsers = usersList.filter(u =>
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = studentsList.filter(s =>
    (`${s.last_name || ''} ${s.first_name || ''}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.matricule || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.guardian_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* En-tête du profil */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-2xl">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{user?.full_name}</h1>
            <p className="text-xs sm:text-sm text-indigo-400 font-medium">
              Rôle : <span className="uppercase font-bold">{user?.role}</span> • Identifiant : <span className="font-mono">{user?.username}</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3 w-full sm:w-auto">
          <Building className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-white">{establishment?.name}</p>
            <p className="text-[11px] text-slate-400 font-mono">Code : {establishment?.code} • {establishment?.city}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1 : Changer mon mot de passe */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Changer mon mot de passe</h2>
              <p className="text-xs text-slate-400">Mise à jour sécurisée de vos identifiants personnels</p>
            </div>
          </div>

          {passwordMsg && (
            <div className={`p-3 rounded-2xl flex items-start space-x-2 text-xs border ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="font-medium">{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mot de passe actuel *
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nouveau mot de passe (8 caractères min) *
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmer le nouveau mot de passe *
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPassword}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {loadingPassword ? 'Modification...' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        </div>

        {/* Section 2 : Réinitialisation administrative (Promoteur / Gestionnaire) */}
        {(canResetStaff || canResetStudents) && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Réinitialisation Administrateur</h2>
                <p className="text-xs text-slate-400">Génération de mots de passe provisoires</p>
              </div>
            </div>

            {tempPasswordResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">Mot de passe / Identifiants générés :</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tempPasswordResult);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl font-mono text-xs text-white select-all">
                  {tempPasswordResult}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {canResetStaff && (
                <button
                  type="button"
                  onClick={() => setResetTargetType('staff')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    resetTargetType === 'staff'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Personnel de l'école
                </button>
              )}
              {canResetStudents && (
                <button
                  type="button"
                  onClick={() => setResetTargetType('student')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    resetTargetType === 'student'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Élèves & Parents
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={resetTargetType === 'staff' ? "Rechercher un membre du personnel..." : "Rechercher un élève ou matricule..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {resetTargetType === 'staff' ? (
                filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Aucun utilisateur trouvé.</p>
                ) : (
                  filteredUsers.map((u) => (
                    <div key={u.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">{u.full_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.username} • <span className="text-indigo-400">{u.role}</span></p>
                      </div>
                      <button
                        onClick={() => handleResetUserPassword(u.id)}
                        disabled={loadingReset}
                        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  ))
                )
              ) : (
                filteredStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Aucun élève trouvé.</p>
                ) : (
                  filteredStudents.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">{s.last_name} {s.first_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{s.matricule} • {s.class_name || 'Sans classe'}</p>
                      </div>
                      <button
                        onClick={() => handleResetStudentPassword(s.id)}
                        disabled={loadingReset}
                        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Nouveaux codes
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
