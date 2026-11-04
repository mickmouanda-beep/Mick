import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api.ts';

interface MustChangePasswordModalProps {
  onSuccess: () => void;
}

export const MustChangePasswordModal: React.FC<MustChangePasswordModalProps> = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await api.forceChangePassword({ newPassword });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6">
        <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/20 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Changement de mot de passe requis</h2>
          <p className="text-xs text-slate-400">
            Votre compte utilise un mot de passe provisoire. Pour des raisons de sécurité, vous devez définir un nouveau mot de passe personnel d'au moins 8 caractères.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nouveau mot de passe (8 caractères minimum) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Confirmer le nouveau mot de passe *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {loading ? (
              <span>Mise à jour...</span>
            ) : (
              <>
                <span>Enregistrer mon nouveau mot de passe</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
