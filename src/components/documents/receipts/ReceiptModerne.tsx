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

export const ReceiptModerne: React.FC<ReceiptProps> = ({
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

  const primary = config.styling?.primaryColor || '#0f766e';
  const secondary = config.styling?.secondaryColor || '#0284c7';
  const font = config.styling?.fontFamily || 'roboto';
  const signatory = config.signatory || { name: 'La Caisse', title: 'Le Responsable de Caisse', stampUrl: null };

  const getMotifLabel = () => {
    if (payment.notes) return payment.notes;
    switch (payment.payment_type) {
      case 'INSCRIPTION':
        return "Frais d'inscription scolaire";
      case 'REINSCRIPTION':
        return "Frais de réinscription scolaire";
      case 'SCOLARITE_T1':
        return 'Scolarité - 1er Trimestre';
      case 'SCOLARITE_T2':
        return 'Scolarité - 2ème Trimestre';
      case 'SCOLARITE_T3':
        return 'Scolarité - 3ème Trimestre';
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
      montant: `${payment.amount} FCFA`,
      date: payment.created_at,
    });

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: format === 'A5' ? 85 : 105,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error(err));
  }, [payment, school.name, format]);

  const isCompact = format === 'A5';

  return (
    <DocumentFontWrapper
      font={font}
      className={`relative bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-xl mx-auto select-text overflow-hidden ${
        isCompact ? 'max-w-xl p-5 text-[11px]' : 'max-w-3xl p-8 text-xs'
      }`}
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{ background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)` }}
      />

      {isReprint && !isCancelled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5">
          <span className="text-7xl font-black tracking-widest text-slate-900 transform -rotate-12 uppercase">
            DUPLICATA
          </span>
        </div>
      )}

      {isCancelled && (
        <div className="p-2 mb-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-center font-bold text-xs uppercase">
          Quittance Annulée ({payment.cancellation_reason || 'Annulation administrative'})
        </div>
      )}

      {/* 1. Header Moderne */}
      <div className="pt-1 pb-3 mb-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl p-0.5 border border-slate-100 shadow-xs" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-xs" style={{ backgroundColor: primary }}>
              {school.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 uppercase">{school.name}</h1>
            {school.motto && <p className="text-[9px] text-slate-500 font-medium">« {school.motto} »</p>}
            <p className="text-[8px] text-slate-400">
              {[school.address, school.city].filter(Boolean).join(' • ')} {school.phone && `• ${school.phone}`}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs" style={{ backgroundColor: primary }}>
            {isReprint ? 'Duplicata Quittance' : 'Reçu de Caisse'}
          </span>
          <div className="text-[10px] font-mono font-bold text-slate-800 mt-1">
            N° {payment.receipt_number}
          </div>
          <div className="text-[8px] text-slate-400">
            {payment.created_at ? new Date(payment.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
          </div>
        </div>
      </div>

      {/* 2. Carte Montant Principal */}
      <div
        className="p-3.5 rounded-xl border mb-3 flex items-center justify-between"
        style={{ backgroundColor: `${primary}08`, borderColor: `${primary}30` }}
      >
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Montant Réglé</span>
          <span className="text-2xl font-black" style={{ color: primary }}>
            {(payment.amount || 0).toLocaleString('fr-FR')} <span className="text-sm font-bold">FCFA</span>
          </span>
          <p className="text-[10px] text-slate-600 font-medium italic mt-0.5">
            « {amountInWords} »
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-800 shadow-xs">
            {payment.payment_method}
          </span>
          {payment.transaction_reference && (
            <div className="text-[9px] font-mono text-slate-500 mt-1">
              Réf : {payment.transaction_reference}
            </div>
          )}
        </div>
      </div>

      {/* 3. Détails Élève et Motif */}
      <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3 text-[10px]">
        <div className="space-y-0.5">
          <span className="text-[8px] uppercase font-bold text-slate-400 block">Bénéficiaire (Élève)</span>
          <div className="font-extrabold text-slate-900 uppercase">
            {payment.last_name} {payment.first_name}
          </div>
          <div className="text-slate-600">Matricule : <strong className="font-mono text-slate-900">{payment.matricule || '—'}</strong></div>
          <div className="text-slate-600">Classe : <strong>{payment.class_name || 'Inscrit'}</strong></div>
        </div>

        <div className="space-y-0.5 border-l border-slate-200 pl-3">
          <span className="text-[8px] uppercase font-bold text-slate-400 block">Versé par & Motif</span>
          <div className="font-bold text-slate-900">{payerName}</div>
          <div className="text-slate-700 font-medium">Motif : {getMotifLabel()}</div>
          {payment.notes && <div className="text-slate-500 italic text-[9px]">{payment.notes}</div>}
        </div>
      </div>

      {/* 4. Solde Financier (si total dû existe) */}
      {payment.total_due != null && payment.total_due > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3 text-center text-[9px]">
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[8px] uppercase font-bold">Total Exigible</span>
            <strong className="text-slate-800 font-mono text-[11px]">{(payment.total_due ?? 0).toLocaleString('fr-FR')} F</strong>
          </div>
          <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-emerald-700 block text-[8px] uppercase font-bold">Total Réglé</span>
            <strong className="text-emerald-800 font-mono text-[11px]">{(payment.total_paid_to_date || payment.amount).toLocaleString('fr-FR')} F</strong>
          </div>
          <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
            <span className="text-rose-700 block text-[8px] uppercase font-bold">Reste à Payer</span>
            <strong className="text-rose-800 font-mono text-[11px]">
              {(payment.balance_after !== undefined && payment.balance_after !== null
                ? payment.balance_after
                : Math.max(0, (payment.total_due ?? 0) - (payment.total_paid_to_date || payment.amount))
              ).toLocaleString('fr-FR')} F
            </strong>
          </div>
        </div>
      )}

      {/* 5. Signatures & QR Code */}
      <div className="pt-2 border-t border-slate-200 grid grid-cols-12 gap-3 items-center">
        <div className="col-span-3 flex flex-col items-center">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="QR" className="w-16 h-16 rounded-lg border border-slate-200 p-0.5 bg-white shadow-xs" />
          ) : (
            <div className="w-16 h-16 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[8px] text-slate-400">QR</div>
          )}
          <span className="text-[8px] text-slate-400 font-mono mt-0.5">Scan contrôle</span>
        </div>

        <div className="col-span-4 bg-slate-50 rounded-xl p-2 border border-slate-200 text-center h-20 flex flex-col justify-between">
          <span className="text-[8px] uppercase font-bold text-slate-500">Parent / Versant</span>
          <div className="text-[8px] text-slate-400 italic">Pour acquit</div>
        </div>

        <div className="col-span-5 bg-slate-50 rounded-xl p-2 border border-slate-200 text-center h-20 flex flex-col justify-between">
          <div>
            <span className="text-[8px] uppercase font-bold text-slate-700">{signatory.title || 'La Caisse'}</span>
            <p className="text-[9px] font-semibold text-slate-900">{signatory.name || payment.cashier_name || 'Le Caissier'}</p>
          </div>
          <div className="h-9 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Cachet" className="max-h-8 max-w-[95px] object-contain" />
            ) : (
              <span className="text-[8px] text-slate-400 italic">Signature & Cachet</span>
            )}
          </div>
        </div>
      </div>

      {config.footerText && (
        <div className="mt-2 text-center text-[7px] text-slate-400 font-mono border-t border-slate-100 pt-1">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
