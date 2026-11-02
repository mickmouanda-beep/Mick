import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Payment } from '../../../types.ts';
import { DocumentTemplateConfig } from '../../../types/documentTemplates.ts';
import { DocumentFontWrapper } from '../DocumentFontWrapper.tsx';
import { numberToFrenchWords } from '../../../utils/numberToFrenchWords.ts';

interface ReceiptProps {
  payment: Payment;
  establishment: any;
  format?: 'A4' | 'A5';
  isDuplicate?: boolean;
  config: DocumentTemplateConfig;
}

export const ReceiptClassique: React.FC<ReceiptProps> = ({
  payment,
  establishment,
  format = 'A4',
  isDuplicate = false,
  config,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const isReprint = isDuplicate || (payment.reprint_count !== undefined && payment.reprint_count > 0);
  const isCancelled = payment.status === 'ANNULE';

  const school = {
    name: config.schoolInfo?.name || establishment?.name || 'Établissement Scolaire',
    motto: config.schoolInfo?.motto || establishment?.motto || '',
    address: config.schoolInfo?.address || establishment?.address || '',
    city: config.schoolInfo?.city || establishment?.city || 'Brazzaville',
    phone: config.schoolInfo?.phone || establishment?.phone || '',
    email: config.schoolInfo?.email || establishment?.email || '',
    logoUrl: config.schoolInfo?.logoUrl || establishment?.logo_url || null,
  };

  const primary = config.styling?.primaryColor || '#1e3a8a';
  const secondary = config.styling?.secondaryColor || '#475569';
  const font = config.styling?.fontFamily || 'inter';
  const signatory = config.signatory || { name: 'La Caisse', title: 'Le Responsable de Caisse', stampUrl: null };

  const getMotifLabel = () => {
    if (payment.notes) return payment.notes;
    switch (payment.payment_type) {
      case 'INSCRIPTION':
        return "Frais d'inscription scolaire";
      case 'REINSCRIPTION':
        return "Frais de réinscription scolaire";
      case 'SCOLARITE_T1':
        return 'Frais de scolarité - 1er Trimestre';
      case 'SCOLARITE_T2':
        return 'Frais de scolarité - 2ème Trimestre';
      case 'SCOLARITE_T3':
        return 'Frais de scolarité - 3ème Trimestre';
      case 'FRAIS_ANNEXES':
        return 'Frais annexes et assurances';
      default:
        return 'Versement sur frais scolaires';
    }
  };

  const payerName = payment.payer_name || 'Parent / Tuteur de l’élève';
  const amountInWords = numberToFrenchWords(payment.amount || 0);

  useEffect(() => {
    const payload = JSON.stringify({
      quittance: payment.receipt_number,
      ecole: school.name,
      eleve: `${payment.last_name || ''} ${payment.first_name || ''}`.trim(),
      matricule: payment.matricule,
      montant: `${payment.amount} FCFA`,
      date: payment.created_at,
      statut: payment.status,
    });

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: format === 'A5' ? 90 : 110,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Erreur QR Code:', err));
  }, [payment, school.name, format]);

  const isCompact = format === 'A5';

  return (
    <DocumentFontWrapper
      font={font}
      className={`relative bg-white text-slate-900 border border-slate-300 rounded-xl shadow-lg mx-auto select-text overflow-hidden ${
        isCompact ? 'max-w-xl p-5 text-[11px] leading-tight' : 'max-w-3xl p-8 text-xs leading-normal'
      }`}
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* Filigrane DUPLICATA */}
      {isReprint && !isCancelled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5">
          <span className="text-7xl font-black tracking-widest text-slate-900 transform -rotate-15 uppercase">
            DUPLICATA
          </span>
        </div>
      )}

      {/* Filigrane ANNULÉE */}
      {isCancelled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
          <span className="text-7xl font-black tracking-widest text-rose-700 transform -rotate-15 uppercase">
            ANNULÉE
          </span>
        </div>
      )}

      <div className="relative z-10 space-y-4">
        {isCancelled && (
          <div className="p-2.5 bg-rose-50 border-2 border-rose-500 rounded-lg text-rose-800 text-center font-bold text-xs uppercase">
            *** QUITTANCE ANNULÉE LE {payment.cancelled_at ? new Date(payment.cancelled_at).toLocaleString('fr-FR') : '—'} ***
            {payment.cancellation_reason && (
              <span className="block text-[11px] font-normal normal-case mt-0.5">
                Motif : {payment.cancellation_reason}
              </span>
            )}
          </div>
        )}

        {/* 1. En-tête Classique de la Quittance */}
        <div className="border-b-2 pb-3" style={{ borderColor: primary }}>
          <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-600 tracking-wider mb-2 border-b border-slate-200 pb-1">
            <span>{config.headerText || 'RÉPUBLIQUE DU CONGO • UNITÉ - TRAVAIL - PROGRÈS'}</span>
            <span>ANNÉE {establishment?.academic_year || '2026-2027'}</span>
          </div>

          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-3 flex justify-center">
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt="Logo"
                  className="w-14 h-14 object-contain rounded border border-slate-200 p-1 bg-white"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded border flex items-center justify-center font-black text-white text-base"
                  style={{ backgroundColor: primary }}
                >
                  {school.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="col-span-9 text-left space-y-0.5">
              <h1 className="text-base font-black tracking-wide uppercase" style={{ color: primary }}>
                {school.name}
              </h1>
              {school.motto && <p className="text-[10px] italic font-semibold text-slate-600">« {school.motto} »</p>}
              <p className="text-[9px] text-slate-500">
                {[school.address, school.city].filter(Boolean).join(' • ')}
                {school.phone && ` • Tél : ${school.phone}`}
              </p>
            </div>
          </div>

          <div className="mt-3 text-center py-1.5 rounded" style={{ backgroundColor: `${primary}12` }}>
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: primary }}>
              {isReprint && !isCancelled ? 'QUITTANCE DE PAIEMENT (DUPLICATA)' : 'QUITTANCE OFFICIELLE DE PAIEMENT'}
            </h2>
            <span className="text-[10px] font-mono font-bold text-slate-700">
              N° {payment.receipt_number} • Date : {payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : '—'}
            </span>
          </div>
        </div>

        {/* 2. Élève & Payeur */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-300 text-[11px]">
          <div className="space-y-1">
            <div className="flex items-baseline">
              <span className="text-slate-500 w-24 shrink-0 font-medium">Élève :</span>
              <span className="font-black uppercase text-slate-950">
                {payment.last_name} {payment.first_name}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="text-slate-500 w-24 shrink-0 font-medium">Matricule :</span>
              <span className="font-mono font-bold" style={{ color: primary }}>{payment.matricule || '—'}</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-slate-500 w-24 shrink-0 font-medium">Classe :</span>
              <span className="font-bold text-slate-900">{payment.class_name || 'Élève inscrit'}</span>
            </div>
          </div>

          <div className="space-y-1 border-l border-slate-200 pl-3">
            <div className="flex items-baseline">
              <span className="text-slate-500 w-24 shrink-0 font-medium">Versé par :</span>
              <span className="font-bold text-slate-900">{payerName}</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-slate-500 w-24 shrink-0 font-medium">Mode :</span>
              <span className="font-bold text-slate-800">{payment.payment_method}</span>
            </div>
            {payment.transaction_reference && (
              <div className="flex items-baseline">
                <span className="text-slate-500 w-24 shrink-0 font-medium">Réf. Trans. :</span>
                <span className="font-mono font-semibold text-slate-700">{payment.transaction_reference}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Tableau Opération */}
        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
              <tr>
                <th className="p-2.5">Objet / Nature du Versement</th>
                <th className="p-2.5">Mode</th>
                <th className="p-2.5 text-right">Montant Versé</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="p-2.5 font-semibold text-slate-900">
                  {getMotifLabel()}
                  {payment.notes && (
                    <span className="block text-[10px] text-slate-500 font-normal italic">
                      Note : {payment.notes}
                    </span>
                  )}
                </td>
                <td className="p-2.5 font-medium text-slate-700">{payment.payment_method}</td>
                <td className="p-2.5 text-right font-black font-mono text-base" style={{ color: primary }}>
                  {(payment.amount || 0).toLocaleString('fr-FR')} FCFA
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Montant en toutes lettres */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
          <span className="text-slate-600 font-bold uppercase text-[9px] block">
            Montant total versé en toutes lettres :
          </span>
          <p className="font-bold text-slate-900 text-xs mt-0.5 italic">
            « {amountInWords} »
          </p>
        </div>

        {/* 5. Situation Financière */}
        {payment.total_due != null && payment.total_due > 0 && (
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5">
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-1.5 bg-white border border-slate-200 rounded">
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Total Exigible</span>
                <span className="font-mono font-bold text-slate-800">
                  {(payment.total_due ?? 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded">
                <span className="text-emerald-700 block text-[9px] uppercase font-semibold">Déjà Versé</span>
                <span className="font-mono font-black text-emerald-800">
                  {(payment.total_paid_to_date || payment.amount).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="p-1.5 bg-rose-50 border border-rose-200 rounded">
                <span className="text-rose-700 block text-[9px] uppercase font-semibold">Solde Restant</span>
                <span className="font-mono font-black text-rose-800">
                  {(payment.balance_after !== undefined && payment.balance_after !== null
                    ? payment.balance_after
                    : Math.max(0, (payment.total_due ?? 0) - (payment.total_paid_to_date || payment.amount))
                  ).toLocaleString('fr-FR')}{' '}
                  FCFA
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 6. Signatures & QR Code */}
        <div className="pt-2 grid grid-cols-12 gap-3 items-end border-t border-slate-300">
          <div className="col-span-3 flex flex-col items-center justify-center text-center">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="w-16 h-16 border border-slate-300 rounded p-1 bg-white"
              />
            ) : (
              <div className="w-16 h-16 border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[8px] text-slate-400">
                QR Code
              </div>
            )}
            <span className="text-[8px] text-slate-500 font-mono mt-1">Vérification QR</span>
          </div>

          <div className="col-span-4 border border-slate-300 rounded-lg p-2.5 text-center bg-white h-24 flex flex-col justify-between">
            <p className="font-bold text-slate-700 uppercase text-[9px]">Le Parent / Payeur</p>
            <div className="text-[9px] text-slate-400 italic">Pour acquit</div>
          </div>

          <div className="col-span-5 border border-slate-300 rounded-lg p-2.5 text-center bg-white h-24 flex flex-col justify-between">
            <div>
              <p className="font-bold text-slate-700 uppercase text-[9px]">
                {signatory.title || 'La Caisse Scolaire'}
              </p>
              <p className="text-[10px] font-semibold text-slate-900 mt-0.5">
                {signatory.name || payment.cashier_name || 'Le Caissier'}
              </p>
            </div>
            <div className="h-10 flex items-center justify-center">
              {signatory.stampUrl ? (
                <img src={signatory.stampUrl} alt="Cachet" className="max-h-9 max-w-[100px] object-contain" />
              ) : (
                <span className="text-[9px] text-slate-400 italic">Cachet & Signature</span>
              )}
            </div>
          </div>
        </div>

        {/* 7. Pied de page */}
        <div className="pt-2 border-t border-slate-200 text-center text-[8px] text-slate-500 font-mono">
          {config.footerText || "Document officiel généré par ordinateur • Tout paiement doit faire l'objet d'une quittance numérotée."}
        </div>
      </div>
    </DocumentFontWrapper>
  );
};
