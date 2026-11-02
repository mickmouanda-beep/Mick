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

export const ReceiptInstitutionnel: React.FC<ReceiptProps> = ({
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

  const primary = config.styling?.primaryColor || '#7f1d1d'; // Bordeaux
  const secondary = config.styling?.secondaryColor || '#854d0e'; // Bronze Doré
  const font = config.styling?.fontFamily || 'merriweather';
  const signatory = config.signatory || { name: 'La Caisse', title: 'Le Responsable de Caisse', stampUrl: null };

  const getMotifLabel = () => {
    if (payment.notes) return payment.notes;
    switch (payment.payment_type) {
      case 'INSCRIPTION':
        return "Frais d'inscription académique";
      case 'REINSCRIPTION':
        return "Frais de réinscription académique";
      case 'SCOLARITE_T1':
        return 'Droits de scolarité - 1er Trimestre';
      case 'SCOLARITE_T2':
        return 'Droits de scolarité - 2ème Trimestre';
      case 'SCOLARITE_T3':
        return 'Droits de scolarité - 3ème Trimestre';
      case 'FRAIS_ANNEXES':
        return 'Frais annexes et assurances officielles';
      default:
        return 'Versement officiel sur frais scolaires';
    }
  };

  const payerName = payment.payer_name || 'Tuteur Légal / Versant';
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
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error(err));
  }, [payment, school.name, format]);

  const isCompact = format === 'A5';

  return (
    <DocumentFontWrapper
      font={font}
      className={`bg-white text-slate-950 p-6 mx-auto select-text relative ${
        isCompact ? 'max-w-xl text-[10px]' : 'max-w-3xl text-[11px]'
      }`}
      style={{
        pageBreakInside: 'avoid',
        border: `3px double ${primary}`,
      }}
    >
      {/* 1. En-tête Institutionnel Solennel */}
      <div className="border-b-2 pb-2.5 mb-3" style={{ borderColor: secondary }}>
        <div className="flex justify-between items-center text-[8px] uppercase font-bold text-slate-700 tracking-widest border-b border-slate-300 pb-1 mb-2">
          <span>{config.headerText || 'RÉPUBLIQUE DU CONGO • REÇU DU TRÉSOR SCOLAIRE'}</span>
          <span>ANNÉE {establishment?.academic_year || '2026-2027'}</span>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-2 flex justify-start">
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="Blason" className="w-12 h-12 object-contain rounded-full border p-0.5 bg-white shadow-xs" style={{ borderColor: secondary }} />
            ) : (
              <div className="w-12 h-12 rounded-full border flex items-center justify-center font-black text-white text-sm" style={{ backgroundColor: primary, borderColor: secondary }}>
                {school.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="col-span-8 text-center">
            <h1 className="text-sm font-black uppercase tracking-wider" style={{ color: primary }}>
              {school.name}
            </h1>
            {school.motto && <p className="text-[9px] font-bold italic" style={{ color: secondary }}>« {school.motto} »</p>}
            <p className="text-[8px] text-slate-600">
              {[school.address, school.city].filter(Boolean).join(' • ')} {school.phone && `• Tél : ${school.phone}`}
            </p>
          </div>

          <div className="col-span-2 flex justify-end">
            <div className="w-12 h-12 rounded-full border border-dashed flex items-center justify-center text-[7px] font-black uppercase text-center" style={{ borderColor: secondary, color: secondary }}>
              SCEAU
            </div>
          </div>
        </div>

        <div className="mt-2 py-1 text-white uppercase font-black text-center text-[10px] tracking-widest shadow-xs" style={{ backgroundColor: primary }}>
          {isReprint ? 'QUITTANCE OFFICIELLE DE PAIEMENT (DUPLICATA D’ARCHIVE)' : 'QUITTANCE OFFICIELLE DE PAIEMENT DU TRÉSOR SCOLAIRE'}
        </div>
        <div className="text-center font-mono font-bold text-[9px] text-slate-800 mt-1">
          N° {payment.receipt_number} • Enregistrée le {payment.created_at ? new Date(payment.created_at).toLocaleString('fr-FR') : '—'}
        </div>
      </div>

      {isCancelled && (
        <div className="p-2 mb-2 bg-rose-100 border border-rose-500 rounded text-rose-900 text-center font-bold text-xs uppercase">
          *** ACTE DE PAIEMENT LÉGALEMENT ANNULÉ ***
        </div>
      )}

      {/* 2. Registre et Identification */}
      <div className="grid grid-cols-2 gap-3 bg-amber-50/30 p-2.5 rounded border border-amber-300 mb-3 text-[10px]">
        <div>
          <span className="text-[8px] uppercase font-bold text-slate-600 block">Élève Titulaire du Dossier</span>
          <div className="font-black text-slate-950 uppercase text-xs">
            {payment.last_name} {payment.first_name}
          </div>
          <div>Matricule Officiel : <strong className="font-mono" style={{ color: primary }}>{payment.matricule || '—'}</strong></div>
          <div>Division de Classe : <strong>{payment.class_name || 'Inscrit(e)'}</strong></div>
        </div>

        <div className="border-l border-amber-300 pl-3">
          <span className="text-[8px] uppercase font-bold text-slate-600 block">Partie Versante</span>
          <div className="font-bold text-slate-900">{payerName}</div>
          <div>Mode d’encaissement : <strong>{payment.payment_method}</strong></div>
          {payment.transaction_reference && <div>Réf. Transaction : <span className="font-mono">{payment.transaction_reference}</span></div>}
        </div>
      </div>

      {/* 3. Décompte d'Écriture */}
      <div className="border-2 rounded mb-3 overflow-hidden" style={{ borderColor: primary }}>
        <table className="w-full text-left text-[10px]">
          <thead className="text-white font-bold uppercase text-[9px]" style={{ backgroundColor: primary }}>
            <tr>
              <th className="p-2">Libellé & Objet Comptable</th>
              <th className="p-2 text-center w-28">Mode</th>
              <th className="p-2 text-right w-36">Montant Encaissé</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="p-2 font-bold text-slate-900">
                {getMotifLabel()}
                {payment.notes && <span className="block text-[8px] font-normal italic text-slate-500">Note : {payment.notes}</span>}
              </td>
              <td className="p-2 text-center text-slate-700">{payment.payment_method}</td>
              <td className="p-2 text-right font-black font-mono text-sm" style={{ color: primary }}>
                {(payment.amount || 0).toLocaleString('fr-FR')} FCFA
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Montant en toutes lettres solennel */}
      <div className="p-2 bg-amber-50/40 border border-amber-200 rounded mb-3 text-[10px]">
        <span className="text-[8px] uppercase font-black tracking-wider text-slate-700 block">
          Arrêté le présent versement à la somme de :
        </span>
        <p className="font-bold italic text-slate-950 mt-0.5 font-serif">
          « {amountInWords} »
        </p>
      </div>

      {/* 5. Solde */}
      {payment.total_due != null && payment.total_due > 0 && (
        <div className="grid grid-cols-3 gap-2 border border-slate-300 p-1.5 rounded mb-3 text-center text-[9px] bg-slate-50">
          <div>Total Dû : <strong className="font-mono">{(payment.total_due ?? 0).toLocaleString('fr-FR')} F</strong></div>
          <div>Total Versé : <strong className="font-mono text-emerald-800">{(payment.total_paid_to_date || payment.amount).toLocaleString('fr-FR')} F</strong></div>
          <div>
            Reste à Recouvrer :{' '}
            <strong className="font-mono text-red-900">
              {(payment.balance_after !== undefined && payment.balance_after !== null
                ? payment.balance_after
                : Math.max(0, (payment.total_due ?? 0) - (payment.total_paid_to_date || payment.amount))
              ).toLocaleString('fr-FR')} F
            </strong>
          </div>
        </div>
      )}

      {/* 6. Signatures et Sceaux */}
      <div className="grid grid-cols-12 gap-2 border-t-2 pt-2 items-center" style={{ borderColor: primary }}>
        <div className="col-span-3 flex flex-col items-center">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="QR Code" className="w-14 h-14 border border-slate-300 p-0.5 bg-white" />
          ) : (
            <div className="w-14 h-14 border border-dashed border-slate-300 flex items-center justify-center text-[7px]">QR</div>
          )}
          <span className="text-[7px] font-mono mt-0.5 text-slate-500">Contrôle Officiel</span>
        </div>

        <div className="col-span-4 border border-slate-300 p-2 h-18 text-center flex flex-col justify-between bg-white rounded">
          <span className="text-[8px] uppercase font-bold text-slate-700">La Partie Versante</span>
          <span className="text-[7px] text-slate-400 italic">Signature & Date</span>
        </div>

        <div className="col-span-5 border border-slate-300 p-2 h-18 text-center flex flex-col justify-between bg-white rounded">
          <div>
            <span className="text-[8px] uppercase font-bold text-slate-800">{signatory.title || 'La Caisse Centrale'}</span>
            <div className="text-[8px] font-semibold text-slate-900">{signatory.name || payment.cashier_name || 'Le Responsable'}</div>
          </div>
          <div className="h-8 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Sceau" className="max-h-7 max-w-[90px] object-contain" />
            ) : (
              <span className="text-[7px] text-slate-400 italic">Sceau Officiel & Signature</span>
            )}
          </div>
        </div>
      </div>

      {config.footerText && (
        <div className="mt-2 text-center text-[7px] text-slate-500 font-serif border-t border-slate-200 pt-1">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
