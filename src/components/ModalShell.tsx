import React, { useEffect } from 'react';
import { CloseButton } from './CloseButton.tsx';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  footerRight?: React.ReactNode;
  footerLeft?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  showCloseInFooter?: boolean;
}

/**
 * Conteneur de modale universel, accessible et réactif.
 * Incorpore :
 * - Fermeture par touche Échap
 * - Fermeture par bouton Retour du navigateur / téléphone (popstate)
 * - Bouton "X" sticky 44x44px en haut à droite
 * - Bouton "Fermer" facultatif en bas à droite
 * - Masquage automatique à l'impression
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerRight,
  footerRight,
  footerLeft,
  children,
  maxWidth = '3xl',
  showCloseInFooter = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Échap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Bouton Retour téléphone / navigateur
    const stateId = `modal_${Date.now()}`;
    window.history.pushState({ modalOpen: true, id: stateId }, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full m-2',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto no-print-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${maxWidthClass} shadow-2xl my-4 sm:my-8 flex flex-col max-h-[92vh] overflow-hidden relative`}>
        {/* EN-TÊTE STICKY */}
        {(title || headerRight) && (
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 z-20 flex items-center justify-between gap-3 shrink-0 no-print">
            <div className="min-w-0 flex-1">
              {typeof title === 'string' ? (
                <h2 className="text-base sm:text-lg font-bold text-white truncate">{title}</h2>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {headerRight}
              <CloseButton onClose={onClose} />
            </div>
          </div>
        )}

        {/* CORPS DU CONTENU */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-slate-100">
          {children}
        </div>

        {/* PIED DE PAGE AVEC ACTION ET BOUTON FERMER */}
        {(footerLeft || footerRight || showCloseInFooter) && (
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 sm:px-6 py-3 z-20 flex flex-wrap items-center justify-between gap-2 shrink-0 no-print">
            <div>{footerLeft}</div>
            <div className="flex items-center space-x-2">
              {footerRight}
              {showCloseInFooter && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer min-h-[44px] min-w-[44px]"
                >
                  <span>Fermer</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
