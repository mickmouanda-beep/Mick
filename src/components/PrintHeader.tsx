import React, { useState, useEffect } from 'react';
import { printDocument } from '../utils/printPdfUtils.ts';
import { Establishment } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

/**
 * Extrait les initiales significatives du nom réel de l'établissement.
 * Exemples :
 * - "Groupe Scolaire Les Étoiles du Kouilou" -> "GS"
 * - "Complexe Scolaire La Renaissance" -> "CS"
 * - "Lycée Scientifique" -> "LS"
 */
export function getInitials(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();

  const stopWords = new Set(['DU', 'DE', 'LA', 'LES', 'ET', 'DES', 'LE', "D'", "L'", 'AU', 'AUX', 'ECO', 'GES']);
  const significantWords = words.filter((w) => !stopWords.has(w.toUpperCase()));

  const targetWords = significantWords.length >= 2 ? significantWords : words;
  const first = targetWords[0]?.[0] || '';
  const second = targetWords[1]?.[0] || '';
  return (first + second).toUpperCase();
}

interface PrintHeaderProps {
  establishment?: Partial<Establishment> | null;
  title: string;
  subtitle?: string;
  docNumber?: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * En-tête officiel réutilisable pour tous les documents imprimables et exportables.
 * Alimenté dynamiquement par le profil Firestore de l'établissement connecté.
 */
export const PrintHeader: React.FC<PrintHeaderProps> = ({
  establishment: propEst,
  title,
  subtitle,
  docNumber,
  rightSlot,
  className = '',
}) => {
  let authEst: Establishment | null = null;
  try {
    const auth = useAuth();
    authEst = auth.establishment;
  } catch {
    // Mode déconnecté ou hors provider
  }

  const est = propEst || authEst;

  // Attendre le chargement complet du profil avant d'afficher l'en-tête
  if (!est || !est.name) {
    return (
      <div className={`print-header-loading border-b-2 border-slate-300 pb-4 mb-4 text-center py-6 text-slate-500 font-medium ${className}`}>
        <div className="inline-flex items-center space-x-2 text-xs">
          <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Chargement de l'en-tête officiel...</span>
        </div>
      </div>
    );
  }

  const logo = est.logo_url || (est as any).logoUrl || null;
  const name = est.name;
  const city = est.city || '';
  const country = est.country || 'Congo-Brazzaville';
  const phone = est.phone;
  const email = est.email;
  const address = est.address;
  const motto = est.motto;
  const academicYear = est.academic_year || '2026-2027';

  // Calcul des initiales réelles de l'établissement (jamais ÉS ni le nom de l'app)
  const initials = getInitials(name);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logo]);

  return (
    <div className={`print-header-root border-b-2 border-slate-900 pb-3 mb-4 text-slate-900 ${className}`}>
      {/* Devise Nationale & Année Scolaire */}
      <div className="flex justify-between items-center text-[9px] sm:text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-2 border-b border-slate-300 pb-1">
        <span>RÉPUBLIQUE DU CONGO • UNITÉ - TRAVAIL - PROGRÈS</span>
        <span>ANNÉE SCOLAIRE {academicYear}</span>
      </div>

      {/* Identification Établissement, Logo et Slot Optionnel */}
      {/* Identification Établissement, Logo et Slot Optionnel (Layout 3 colonnes robuste) */}
      <div
        className="grid grid-cols-12 gap-3 items-center print-header-grid"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        {/* Case Logo DÉDIÉE (Gauche) */}
        <div
          className="col-span-3 flex flex-col items-center justify-center border-r border-slate-300 pr-2"
          style={{
            width: '25%',
            minWidth: '22mm',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid #cbd5e1',
            paddingRight: '6px',
          }}
        >
          {logo && !imgError ? (
            <img
              src={logo}
              alt={name}
              onError={() => setImgError(true)}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto print:max-h-20 school-logo"
              style={{
                width: '22mm',
                height: '22mm',
                maxWidth: '22mm',
                maxHeight: '22mm',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            />
          ) : (
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-indigo-900 bg-indigo-50 flex items-center justify-center text-indigo-950 font-black text-xl sm:text-2xl shadow-xs mx-auto"
              style={{
                width: '22mm',
                height: '22mm',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #1e1b4b',
                backgroundColor: '#e0e7ff',
                color: '#1e1b4b',
                fontWeight: 900,
                fontSize: '18px',
                margin: '0 auto',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              {initials}
            </div>
          )}
          {est.code && (
            <span className="text-[9px] font-mono text-slate-600 mt-1 font-bold">
              CODE : {est.code}
            </span>
          )}
        </div>

        {/* Coordonnées & Identification (Centre) */}
        <div
          className={`${rightSlot ? 'col-span-6' : 'col-span-9'} text-center px-2`}
          style={{
            width: rightSlot ? '50%' : '75%',
            flexGrow: 1,
            textAlign: 'center',
            padding: '0 8px',
          }}
        >
          <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950 leading-tight">
            {name}
          </h1>
          {motto && (
            <p className="text-[10px] italic text-slate-700 font-medium my-0.5">
              « {motto} »
            </p>
          )}
          <div className="text-[10px] text-slate-700 space-y-0.5 mt-1 font-medium">
            {address ? (
              <p>{address}{city ? ` • ${city}` : ''}{country ? `, ${country}` : ''}</p>
            ) : (
              <p>{city}{country ? `, ${country}` : ''}</p>
            )}
            <p className="flex justify-center flex-wrap gap-2 text-[9.5px]">
              {phone && <span>Tél : {phone}</span>}
              {email && <span>Email : {email}</span>}
            </p>
          </div>
        </div>

        {/* Slot Droit Optionnel - Photo élève (Droite) */}
        {rightSlot && (
          <div
            className="col-span-3 flex justify-center items-center border-l border-slate-300 pl-2"
            style={{
              width: '25%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: '1px solid #cbd5e1',
              paddingLeft: '6px',
            }}
          >
            {rightSlot}
          </div>
        )}
      </div>

      {/* Titre du Document Officiel */}
      <div className="mt-3 pt-2 border-t border-slate-300 text-center">
        <div
          className="inline-block bg-slate-900 text-white text-xs sm:text-sm font-black uppercase px-4 py-1.5 rounded-md shadow-xs tracking-wide"
          style={{
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <p className="text-xs font-semibold text-slate-700 mt-1">{subtitle}</p>
        )}
        {docNumber && (
          <p className="text-[10px] font-mono font-bold text-slate-600 mt-0.5">
            Réf / N° : {docNumber}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Lance l'impression via le module unifié printDocument
 */
export async function safePrint(targetOrTimeout?: string | HTMLElement | number): Promise<void> {
  const target = typeof targetOrTimeout === 'string' || (targetOrTimeout && typeof targetOrTimeout === 'object')
    ? targetOrTimeout
    : (document.querySelector('.printable-document') as HTMLElement) || document.body;
  await printDocument(target, 'Document');
}
