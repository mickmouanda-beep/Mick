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

export const ReceiptElegant: React.FC<ReceiptProps> = ({
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

  const primary = config.styling?.primaryColor || '#1e1b4b'; // Indigo Nuit
  const secondary = config.styling?.secondaryColor || '#b45309'; // Or Ambré
  const font = config.styling?.fontFamily || 'merriweather';
  const signatory = config.signatory || { name: 'La Caisse', title: 'Le Responsable de Caisse', stampUrl: null };

  const getMotifLabel = () => {
    if (payment.notes) return payment.notes;
    switch (payment.payment_type) {
      case 'INSCRIPTION':
        return "Droits d'inscription académique";
      case 'REINSCRIPTION':
        return "Droits de réinscription académique";
      case 'SCOLARITE_T1':
        return 'Scolarité trimestrielle - Trimestre 1';
      case 'SCOLARITE_T2':
        return 'Scolarité trimestrielle - Trimestre 2';
      case 'SCOLARITE_T3':
        return 'Scolarité trimestrielle - Trimestre 3';
      default:
        return 'Versement sur frais scolaires';
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
      width: format === 'A5' ? 85 : 105,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error(err));
  }, [payment, school.name, format]);

  const isCompact = format === 'A5';

  return (
    <DocumentFontWrapper
      font={font}
      className={`bg-[#fafaf9] text-slate-900 mx-auto select-text relative shadow-xl ${
        isCompact ? 'max-w-xl p-5 text-[10px]' : 'max-w-3xl p-7 text-[11px]'
      }`}
      style={{
        pageBreakInside: 'avoid',
        border: `2px solid ${secondary}`,
        outline: `3px solid ${primary}`,
        outlineOffset: '-6px',
      }}
    >
      <div className="absolute top-1.5 left-1.5 text-xs font-serif" style={{ color: secondary }}>❖</div>
      <div className="absolute top-1.5 right-1.5 text-xs font-serif" style={{ color: secondary }}>❖</div>
      <div className="absolute bottom-1.5 left-1.5 text-xs font-serif" style={{ color: secondary }}>❖</div>
      <div className="absolute bottom-1.5 right-1.5 text-xs font-serif" style={{ color: secondary }}>❖</div>

      {/* 1. Header Prestige */}
      <div className="text-center pb-2.5 mb-3 border-b" style={{ borderColor: `${secondary}40` }}>
        <p className="text-[8px] uppercase tracking-widest font-serif font-bold text-slate-500 mb-1">
          {config.headerText || 'RÉPUBLIQUE DU CONGO • REÇU DU TRÉSOR SCOLAIRE'}
        </p>

        <div className="flex items-center justify-center gap-3">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-full border p-0.5 bg-white" style={{ borderColor: secondary }} />
          ) : (
            <div className="w-12 h-12 rounded-full border flex items-center justify-center text-white font-serif font-bold text-sm" style={{ backgroundColor: primary, borderColor: secondary }}>
              {school.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-sm font-serif font-black uppercase tracking-wider" style={{ color: primary }}>{school.name}</h1>
            {school.motto && <p className="text-[9px] font-serif italic text-amber-900">« {school.motto} »</p>}
            <p className="text-[8px] text-slate-500">
              {[school.address, school.city].filter(Boolean).join(' • ')} {school.phone && `• ${school.phone}`}
            </p>
          </div>
        </div>

        <div className="inline-block px-4 py-0.5 rounded-full border text-[10px] font-serif font-bold uppercase tracking-wider mt-1.5"
             style={{ backgroundColor: `${primary}08`, borderColor: secondary, color: primary }}>
          {isReprint ? 'Duplicata de Quittance Officielle' : 'Quittance de Paiement Certifiée'}
        </div>
        <div className="font-mono text-[9px] text-slate-700 mt-1">
          N° {payment.receipt_number} • Date : {payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : '—'}
        </div>
      </div>

      {isCancelled && (
        <div className="p-1.5 mb-2 bg-rose-50 border border-rose-300 rounded text-rose-800 text-center font-bold text-xs uppercase">
          Quittance Annulée
        </div>
      )}

      {/* 2. Données Élève */}
      <div className="grid grid-cols-2 gap-3 p-2.5 rounded border mb-3 bg-white text-[10px]" style={{ borderColor: `${secondary}30` }}>
        <div className="space-y-0.5">
          <span className="text-[8px] uppercase font-serif font-bold text-slate-500 block">Titulaire de la Quittance</span>
          <div className="font-serif font-extrabold uppercase text-xs text-slate-950">{payment.last_name} {payment.first_name}</div>
          <div>Matricule : <strong className="font-mono" style={{ color: primary }}>{payment.matricule || '—'}</strong></div>
          <div>Classe : <strong>{payment.class_name || 'Inscrit'}</strong></div>
        </div>
        <div className="space-y-0.5 border-l border-amber-200 pl-3">
          <span className="text-[8px] uppercase font-serif font-bold text-slate-500 block">Versement effectué par</span>
          <div className="font-serif font-bold text-slate-900">{payerName}</div>
          <div>Mode : {payment.payment_method}</div>
          {payment.transaction_reference && <div>Réf : <span className="font-mono">{payment.transaction_reference}</span></div>}
        </div>
      </div>

      {/* 3. Bloc Montant Prestige */}
      <div className="p-3 rounded border mb-3 bg-white flex items-center justify-between" style={{ borderColor: `${secondary}40` }}>
        <div>
          <span className="text-[8px] font-serif font-bold uppercase text-slate-500 block">Objet du versement</span>
          <div className="font-serif font-bold text-slate-900 text-xs">{getMotifLabel()}</div>
          <div className="font-serif italic text-[10px] text-slate-700 mt-0.5">« {amountInWords} »</div>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-serif font-bold uppercase text-slate-500 block">Montant Perçu</span>
          <span className="text-xl font-serif font-black" style={{ color: primary }}>
            {(payment.amount || 0).toLocaleString('fr-FR')} <span className="text-xs font-normal">FCFA</span>
          </span>
        </div>
      </div>

      {/* 4. Solde */}
      {payment.total_due != null && payment.total_due > 0 && (
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded border mb-3 bg-white text-center text-[9px]" style={{ borderColor: `${secondary}30` }}>
          <div>Total Dû : <strong>{(payment.total_due ?? 0).toLocaleString('fr-FR')} F</strong></div>
          <div>Total Réglé : <strong className="text-emerald-800">{(payment.total_paid_to_date || payment.amount).toLocaleString('fr-FR')} F</strong></div>
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

      {/* 5. Signatures et QR Code */}
      <div className="pt-2 border-t grid grid-cols-12 gap-3 items-center" style={{ borderColor: `${secondary}40` }}>
        <div className="col-span-3 flex flex-col items-center">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="QR Code" className="w-14 h-14 border p-0.5 bg-white" style={{ borderColor: secondary }} />
          ) : (
            <div className="w-14 h-14 border border-dashed flex items-center justify-center text-[7px]">QR</div>
          )}
          <span className="text-[7px] font-mono mt-0.5 text-slate-500">Certifié conforme</span>
        </div>

        <div className="col-span-4 bg-white border p-2 h-16 rounded text-center flex flex-col justify-between" style={{ borderColor: `${secondary}30` }}>
          <span className="text-[7px] font-serif font-bold uppercase text-slate-700">Le Payeur</span>
          <span className="text-[7px] text-slate-400 italic">Pour acquit</span>
        </div>

        <div className="col-span-5 bg-white border p-2 h-16 rounded text-center flex flex-col justify-between" style={{ borderColor: `${secondary}30` }}>
          <div>
            <span className="text-[7px] font-serif font-bold uppercase text-slate-800">{signatory.title || 'La Caisse'}</span>
            <div className="text-[8px] font-semibold text-slate-900">{signatory.name || payment.cashier_name || 'Le Caissier'}</div>
          </div>
          <div className="h-6 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Cachet" className="max-h-6 max-w-[85px] object-contain" />
            ) : (
              <span className="text-[7px] text-slate-400 italic">Sceau Officiel & Signature</span>
            )}
          </div>
        </div>
      </div>

      {config.footerText && (
        <div className="mt-2 text-center text-[7px] text-slate-500 font-serif border-t border-amber-200/50 pt-1">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
