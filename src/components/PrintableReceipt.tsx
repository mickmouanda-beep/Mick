import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Payment, Establishment } from '../types.ts';
import { numberToFrenchWords } from '../utils/numberToFrenchWords.ts';

interface PrintableReceiptProps {
  payment: Payment;
  establishment: Establishment;
  format?: 'A4' | 'A5';
  isDuplicate?: boolean;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  payment,
  establishment,
  format = 'A4',
  isDuplicate = false,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const isReprint = isDuplicate || (payment.reprint_count !== undefined && payment.reprint_count > 0);
  const isCancelled = payment.status === 'ANNULE';

  // Format motif
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
  const amountInWords = numberToFrenchWords(payment.amount);

  // Génération du QR Code officiel de vérification
  useEffect(() => {
    const payload = JSON.stringify({
      quittance: payment.receipt_number,
      ecole: establishment?.name || 'ECOLE',
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
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Erreur génération QR Code:', err));
  }, [payment, establishment, format]);

  const isCompact = format === 'A5';

  return (
    <div
      className={`relative bg-white text-slate-900 border border-slate-300 rounded-xl shadow-lg mx-auto printable-document font-sans overflow-hidden select-text ${
        isCompact
          ? 'max-w-xl p-5 text-[11px] leading-tight'
          : 'max-w-3xl p-8 text-xs leading-normal'
      }`}
      style={{
        pageBreakInside: 'avoid',
      }}
    >
      {/* FILIGRANE DUPLICATA (si réimpression) */}
      {isReprint && !isCancelled && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden"
          style={{ opacity: 0.08 }}
        >
          <span className="text-8xl sm:text-9xl font-black tracking-widest text-slate-900 transform -rotate-30 uppercase">
            DUPLICATA
          </span>
        </div>
      )}

      {/* FILIGRANE ANNULÉE (si annulé) */}
      {isCancelled && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden"
          style={{ opacity: 0.12 }}
        >
          <span className="text-8xl sm:text-9xl font-black tracking-widest text-rose-700 transform -rotate-30 uppercase">
            ANNULÉE
          </span>
        </div>
      )}

      <div className="relative z-10 space-y-4">
        {/* BANDEAU EN CAS D'ANNULATION */}
        {isCancelled && (
          <div className="p-2.5 bg-rose-50 border-2 border-rose-500 rounded-lg text-rose-800 text-center font-bold text-xs uppercase shadow-xs">
            *** QUITTANCE OFFICIELLEMENT ANNULÉE LE{' '}
            {payment.cancelled_at
              ? new Date(payment.cancelled_at).toLocaleString('fr-FR')
              : 'RÉCEMMENT'}{' '}
            ***
            {payment.cancellation_reason && (
              <span className="block text-[11px] font-normal normal-case mt-0.5 text-rose-700">
                Motif obligatoire : {payment.cancellation_reason} (par {payment.cancelled_by || 'La Direction'})
              </span>
            )}
          </div>
        )}

        {/* 1. EN-TÊTE ÉTABLISSEMENT */}
        <div className="border-b-2 border-slate-900 pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center space-x-3">
              {establishment?.logo_url ? (
                <img
                  src={establishment.logo_url}
                  alt={establishment.name}
                  className={`${
                    isCompact ? 'w-12 h-12' : 'w-16 h-16'
                  } object-contain rounded-lg border border-slate-300 p-1 shrink-0 bg-white shadow-xs`}
                />
              ) : (
                <div
                  className={`${
                    isCompact ? 'w-12 h-12 text-sm' : 'w-16 h-16 text-base'
                  } rounded-lg border border-slate-300 bg-slate-100 flex items-center justify-center font-black text-indigo-950 shrink-0 uppercase shadow-xs`}
                >
                  {establishment?.name ? establishment.name.substring(0, 2) : 'EG'}
                </div>
              )}

              <div>
                <h1
                  className={`font-black uppercase text-indigo-950 tracking-tight leading-none ${
                    isCompact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
                  }`}
                >
                  {establishment?.name || 'ÉTABLISSEMENT SCOLAIRE'}
                </h1>
                {establishment?.motto && (
                  <p className="text-[10px] text-slate-500 italic mt-0.5">
                    « {establishment.motto} »
                  </p>
                )}
                <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                  {establishment?.address ? `${establishment.address}, ` : ''}
                  {establishment?.city || 'Brazzaville'} • {establishment?.country || 'Congo-Brazzaville'}
                </p>
                {establishment?.phone && (
                  <p className="text-[10px] text-slate-600 font-mono">
                    Tél : {establishment.phone}
                    {establishment.email ? ` • Email : ${establishment.email}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-flex flex-col items-end">
                <span className="inline-block px-2.5 py-1 bg-indigo-950 text-white font-black text-xs sm:text-sm uppercase rounded tracking-wider shadow-xs">
                  QUITTANCE DE PAIEMENT
                </span>
                {isReprint && !isCancelled && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 border border-amber-400 text-amber-900 font-black text-[9px] uppercase rounded">
                    DUPLICATA (Copie {payment.reprint_count || 1})
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-mono font-black text-indigo-900 mt-1">
                N° {payment.receipt_number}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Date : {new Date(payment.created_at).toLocaleDateString('fr-FR')} à{' '}
                {new Date(payment.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-[9px] font-mono text-slate-500">
                Année Scolaire : {establishment?.academic_year || '2026-2027'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. IDENTIFICATION ÉLÈVE & PAYEUR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-300">
          <div className="space-y-1">
            <div className="flex items-baseline">
              <span className="text-slate-500 w-24 shrink-0 font-medium">Élève :</span>
              <span className="font-black uppercase text-slate-950">
                {payment.last_name} {payment.first_name}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="text-slate-500 w-24 shrink-0 font-medium">Matricule :</span>
              <span className="font-mono font-bold text-indigo-950">{payment.matricule || '—'}</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-slate-500 w-24 shrink-0 font-medium">Classe :</span>
              <span className="font-bold text-indigo-900">{payment.class_name || 'Élève inscrit'}</span>
            </div>
          </div>

          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-3 pt-2 sm:pt-0">
            <div className="flex items-baseline">
              <span className="text-slate-500 w-28 shrink-0 font-medium">Payeur / Versé par :</span>
              <span className="font-bold text-slate-900">{payerName}</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-slate-500 w-28 shrink-0 font-medium">Mode Règlement :</span>
              <span className="font-bold text-slate-800">{payment.payment_method}</span>
            </div>
            {payment.transaction_reference && (
              <div className="flex items-baseline">
                <span className="text-slate-500 w-28 shrink-0 font-medium">Réf. Transaction :</span>
                <span className="font-mono font-semibold text-slate-700">{payment.transaction_reference}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. DÉTAILS DE L'OPÉRATION */}
        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
              <tr>
                <th className="p-2.5">Motif du Paiement</th>
                <th className="p-2.5">Mode</th>
                <th className="p-2.5 text-right">Montant Versé</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 bg-white">
                <td className="p-2.5 font-semibold text-slate-900">
                  {getMotifLabel()}
                  {payment.notes && (
                    <span className="block text-[10px] text-slate-500 font-normal italic">
                      Note : {payment.notes}
                    </span>
                  )}
                </td>
                <td className="p-2.5 font-medium text-slate-700">{payment.payment_method}</td>
                <td className="p-2.5 text-right font-black font-mono text-sm sm:text-base text-indigo-950">
                  {payment.amount.toLocaleString('fr-FR')} FCFA
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. MONTANT EN TOUTES LETTRES */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
            <div>
              <span className="text-indigo-950 font-semibold uppercase text-[10px] tracking-wider block">
                Montant total versé en toutes lettres :
              </span>
              <p className="font-bold text-indigo-950 text-xs sm:text-sm mt-0.5 italic">
                « {amountInWords} »
              </p>
            </div>
            <div className="sm:text-right shrink-0 font-mono font-black text-indigo-900 text-sm">
              {payment.amount.toLocaleString('fr-FR')} {establishment?.currency || 'FCFA'}
            </div>
          </div>
        </div>

        {/* 5. SITUATION FINANCIÈRE DE L'ÉLÈVE (Total Dû, Total Payé, Reste à Payer) */}
        {payment.total_due != null && payment.total_due > 0 && (
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5">
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs">
              <div className="p-1.5 bg-white border border-slate-200 rounded">
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Total Exigible (Dû)</span>
                <span className="font-mono font-bold text-slate-800">
                  {(payment.total_due ?? 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded">
                <span className="text-emerald-700 block text-[9px] uppercase font-semibold">Total Déjà Payé</span>
                <span className="font-mono font-black text-emerald-800">
                  {(payment.total_paid_to_date || payment.amount).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="p-1.5 bg-rose-50 border border-rose-200 rounded">
                <span className="text-rose-700 block text-[9px] uppercase font-semibold">Reste à Payer (Solde)</span>
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

        {/* 6. SIGNATURES, CACHET & QR CODE */}
        <div className="pt-2 grid grid-cols-12 gap-3 items-end border-t border-slate-300">
          {/* QR Code & authenticité */}
          <div className="col-span-3 flex flex-col items-center justify-center text-center">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code de vérification"
                className={`${isCompact ? 'w-16 h-16' : 'w-20 h-20'} border border-slate-300 rounded p-1 bg-white shadow-xs`}
              />
            ) : (
              <div className={`${isCompact ? 'w-16 h-16' : 'w-20 h-20'} border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[8px] text-slate-400`}>
                QR Code
              </div>
            )}
            <span className="text-[8px] text-slate-500 font-mono mt-1 block leading-tight">
              Scannez pour vérifier
            </span>
          </div>

          {/* Signature Payeur */}
          <div className="col-span-4 border border-slate-300 rounded-lg p-2.5 text-center bg-white h-24 flex flex-col justify-between">
            <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">
              Signature du Parent / Payeur
            </p>
            <div className="text-[9px] text-slate-400 italic">
              Pour acquit
            </div>
          </div>

          {/* Signature et Cachet Gestionnaire / Caisse */}
          <div className="col-span-5 border border-slate-300 rounded-lg p-2.5 text-center bg-white h-24 flex flex-col justify-between">
            <div>
              <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">
                La Caisse / Gestionnaire Scolaire
              </p>
              <p className="text-[10px] font-semibold text-indigo-950 mt-0.5">
                {payment.cashier_name || 'Le Responsable de Caisse'}
              </p>
            </div>
            <div className="text-[9px] text-slate-400 italic">
              Cachet Officiel & Signature
            </div>
          </div>
        </div>

        {/* 7. PIED DE PAGE & MENTION LÉGALE */}
        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[8px] text-slate-500 font-mono gap-1">
          <span>Eco GES • Document officiel généré par ordinateur</span>
          <span>Tout paiement doit impérativement faire l'objet d'une quittance officielle numérotée.</span>
        </div>
      </div>
    </div>
  );
};
