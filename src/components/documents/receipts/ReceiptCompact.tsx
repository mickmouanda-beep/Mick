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

export const ReceiptCompact: React.FC<ReceiptProps> = ({
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

  const primary = config.styling?.primaryColor || '#0369a1';
  const secondary = config.styling?.secondaryColor || '#334155';
  const font = config.styling?.fontFamily || 'roboto';
  const signatory = config.signatory || { name: 'La Caisse', title: 'Le Responsable de Caisse', stampUrl: null };

  const getMotifLabel = () => {
    if (payment.notes) return payment.notes;
    switch (payment.payment_type) {
      case 'INSCRIPTION':
        return "Frais d'inscription";
      case 'REINSCRIPTION':
        return "Frais de réinscription";
      case 'SCOLARITE_T1':
        return 'Scolarité T1';
      case 'SCOLARITE_T2':
        return 'Scolarité T2';
      case 'SCOLARITE_T3':
        return 'Scolarité T3';
      default:
        return 'Frais scolaires';
    }
  };

  const payerName = payment.payer_name || 'Parent / Tuteur';
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
      width: format === 'A5' ? 75 : 90,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error(err));
  }, [payment, school.name, format]);

  const isCompact = format === 'A5';

  return (
    <DocumentFontWrapper
      font={font}
      className={`bg-white text-slate-900 border border-slate-300 rounded p-4 mx-auto select-text leading-tight ${
        isCompact ? 'max-w-xl text-[10px]' : 'max-w-3xl text-[11px]'
      }`}
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* 1. En-tête Compact */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b-2" style={{ borderColor: primary }}>
        <div className="flex items-center gap-2">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" className="w-9 h-9 object-contain rounded border border-slate-200 p-0.5" />
          ) : (
            <div className="w-9 h-9 rounded flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: primary }}>
              {school.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xs font-black uppercase text-slate-900 leading-none">{school.name}</h1>
            <p className="text-[8px] text-slate-500 mt-0.5">
              {[school.address, school.city].filter(Boolean).join(' • ')} {school.phone && `• ${school.phone}`}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="px-2 py-0.5 rounded text-[8px] font-black text-white" style={{ backgroundColor: primary }}>
            {isReprint ? 'QUITTANCE (DUPLICATA)' : 'QUITTANCE DE PAIEMENT'}
          </span>
          <div className="font-mono font-bold text-[9px] text-slate-800 mt-0.5">
            N° {payment.receipt_number} • {payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : '—'}
          </div>
        </div>
      </div>

      {isCancelled && (
        <div className="p-1 mb-2 bg-red-100 border border-red-400 rounded text-red-900 text-center font-bold text-[9px] uppercase">
          Quittance Annulée
        </div>
      )}

      {/* 2. Données en grille compacte */}
      <div className="grid grid-cols-12 gap-2 bg-slate-50 p-2 rounded border border-slate-200 mb-2 text-[10px]">
        <div className="col-span-6 space-y-0.5">
          <div>Élève : <strong className="uppercase text-slate-900">{payment.last_name} {payment.first_name}</strong></div>
          <div>Matricule : <span className="font-mono font-bold" style={{ color: primary }}>{payment.matricule || '—'}</span> • Classe : <strong>{payment.class_name || 'Inscrit'}</strong></div>
        </div>
        <div className="col-span-6 border-l border-slate-200 pl-2 space-y-0.5">
          <div>Payeur : <strong>{payerName}</strong></div>
          <div>Règlement : <strong>{payment.payment_method}</strong> {payment.transaction_reference && <span className="font-mono text-slate-500 font-normal">({payment.transaction_reference})</span>}</div>
        </div>
      </div>

      {/* 3. Ligne de Montant & Motif */}
      <div className="p-2 border rounded mb-2 bg-white flex justify-between items-center text-[10px]" style={{ borderColor: `${primary}50` }}>
        <div>
          <span className="text-[8px] uppercase text-slate-400 font-bold block">Motif</span>
          <span className="font-bold text-slate-900">{getMotifLabel()}</span>
          <span className="italic text-[8px] text-slate-500 block">({amountInWords})</span>
        </div>
        <div className="text-right">
          <span className="text-[8px] uppercase text-slate-400 font-bold block">Net Perçu</span>
          <span className="font-mono font-black text-sm" style={{ color: primary }}>
            {(payment.amount || 0).toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      </div>

      {/* 4. Solde Financier */}
      {payment.total_due != null && payment.total_due > 0 && (
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded text-center text-[8px] mb-2 font-mono">
          <div>Dû : <strong>{(payment.total_due ?? 0).toLocaleString('fr-FR')} F</strong></div>
          <div>Versé : <strong className="text-emerald-800">{(payment.total_paid_to_date || payment.amount).toLocaleString('fr-FR')} F</strong></div>
          <div>
            Solde :{' '}
            <strong className="text-rose-900">
              {(payment.balance_after !== undefined && payment.balance_after !== null
                ? payment.balance_after
                : Math.max(0, (payment.total_due ?? 0) - (payment.total_paid_to_date || payment.amount))
              ).toLocaleString('fr-FR')} F
            </strong>
          </div>
        </div>
      )}

      {/* 5. Bas de page avec Signatures & QR */}
      <div className="grid grid-cols-12 gap-2 pt-1 border-t border-slate-200 items-center text-[8px]">
        <div className="col-span-2 flex justify-center">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="QR" className="w-11 h-11 border p-0.5 rounded bg-white" />
          ) : (
            <div className="w-11 h-11 border border-dashed flex items-center justify-center">QR</div>
          )}
        </div>

        <div className="col-span-5 text-center border-r border-slate-200 pr-2">
          <span className="text-slate-400 uppercase font-bold block text-[7px]">Le Payeur</span>
          <span className="text-slate-400 italic text-[7px]">Pour acquit</span>
        </div>

        <div className="col-span-5 flex items-center justify-between pl-2">
          <div>
            <span className="text-slate-700 font-bold block text-[7px] uppercase">{signatory.title || 'La Caisse'}</span>
            <span className="text-[8px] text-slate-800 font-semibold">{signatory.name || payment.cashier_name || 'Le Caissier'}</span>
          </div>
          {signatory.stampUrl && (
            <img src={signatory.stampUrl} alt="Cachet" className="w-8 h-8 object-contain" />
          )}
        </div>
      </div>

      {config.footerText && (
        <div className="mt-1 text-center text-[6.5px] text-slate-400 font-mono truncate">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
