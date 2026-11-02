import React from 'react';
import { X } from 'lucide-react';

interface CloseButtonProps {
  onClose: () => void;
  className?: string;
  variant?: 'dark' | 'light' | 'ghost';
  title?: string;
}

/**
 * Bouton "X" de fermeture universel et accessible.
 * Zone de clic minimale de 44x44 px pour le tactile, haut contraste, masqué à l'impression.
 */
export const CloseButton: React.FC<CloseButtonProps> = ({
  onClose,
  className = '',
  variant = 'dark',
  title = 'Fermer (Échap)',
}) => {
  const variantStyles = {
    dark: 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-md',
    light: 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 shadow-xs',
    ghost: 'bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-white',
  };

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fermer"
      title={title}
      className={`min-w-[44px] min-h-[44px] w-11 h-11 p-2.5 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 no-print ${variantStyles[variant]} ${className}`}
    >
      <X className="w-5 h-5 stroke-[2.5]" />
    </button>
  );
};
