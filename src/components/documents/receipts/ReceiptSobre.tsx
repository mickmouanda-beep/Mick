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

export const ReceiptSobre: React.FC<ReceiptProps> = ({
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
      width: format === 'A5' ? 80 : 100,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error(err));
  }, [payment, school.name, format]);

  const isCompact = format === 'A5';

  return (
    <DocumentFontWrapper
      font={font}
      className={`bg-white text-black border border-black p-5 mx-auto text-xs ${
        isCompact ? 'max-w-xl text-[10px]' : 'max-w-3xl text-[11px]'
      }`}
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* 1. En-tête Sobre */}
      <div className="border-b border-black pb-2 mb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider">{school.name}</h1>
            <p className="text-[9px] text-neutral-600">
              {[school.address, school.city].filter(Boolean).join(' • ')} {school.phone && `• Tél : ${school.phone}`}
            </p>
          </div>
          <div className="text-right">
            <span className="font-bold text-xs uppercase block">
              {isReprint ? 'QUITTANCE DE PAIEMENT (DUPLICATA)' : 'QUITTANCE DE PAIEMENT'}
            </span>
            <span className="font-mono text-[10px] block mt-0.5">
              N° {payment.receipt_number} • {payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : '—'}
            </span>
          </div>
        </div>
      </div>

      {isCancelled && (
        <div className="border border-black p-1.5 mb-2 text-center font-bold text-[10px] uppercase bg-neutral-100">
          *** QUITTANCE ANNULÉE ***
        </div>
      )}

      {/* 2. Données en grille fine */}
      <div className="border border-black p-2 mb-3 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <div><strong>Élève :</strong> <span className="uppercase font-bold">{payment.last_name} {payment.first_name}</span></div>
          <div><strong>Matricule :</strong> <span className="font-mono">{payment.matricule || '—'}</span></div>
          <div><strong>Classe :</strong> {payment.class_name || 'Élève inscrit'}</div>
        </div>
        <div className="border-l border-black pl-2">
          <div><strong>Versé par :</strong> {payerName}</div>
          <div><strong>Mode de paiement :</strong> {payment.payment_method}</div>
          {payment.transaction_reference && <div><strong>Réf transaction :</strong> {payment.transaction_reference}</div>}
        </div>
      </div>

      {/* 3. Ligne de Montant */}
      <div className="border border-black p-2 mb-3 bg-neutral-50 flex justify-between items-center text-xs">
        <div>
          <span className="text-[9px] uppercase font-bold block">Motif du versement :</span>
          <span className="font-semibold">{getMotifLabel()}</span>
        </div>
        <div className="text-right">
          <span className="text-[9px] uppercase font-bold block">Montant perçu :</span>
          <span className="font-mono font-bold text-base">{(payment.amount || 0).toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      {/* 4. Montant en lettres */}
      <div className="border border-black p-2 mb-3 text-[10px]">
        <strong>Montant en lettres :</strong> <span className="italic">{amountInWords}</span>
      </div>

      {/* 5. Solde Financier */}
      {payment.total_due != null && payment.total_due > 0 && (
        <div className="border border-black p-1.5 mb-3 grid grid-cols-3 gap-2 text-center text-[9px]">
          <div>Total exigible : <strong>{(payment.total_due ?? 0).toLocaleString('fr-FR')} F</strong></div>
          <div>Déjà réglé : <strong>{(payment.total_paid_to_date || payment.amount).toLocaleString('fr-FR')} F</strong></div>
          <div>
            Reste dû :{' '}
            <strong>
              {(payment.balance_after !== undefined && payment.balance_after !== null
                ? payment.balance_after
                : Math.max(0, (payment.total_due ?? 0) - (payment.total_paid_to_date || payment.amount))
              ).toLocaleString('fr-FR')} F
            </strong>
          </div>
        </div>
      )}

      {/* 6. Signatures et QR Code */}
      <div className="border-t border-black pt-2 grid grid-cols-12 gap-2 items-center">
        <div className="col-span-3 flex flex-col items-center">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="QR Code" className="w-14 h-14 border border-black p-0.5" />
          ) : (
            <div className="w-14 h-14 border border-black flex items-center justify-center text-[8px]">QR</div>
          )}
          <span className="text-[7px] font-mono mt-0.5">Authentification</span>
        </div>

        <div className="col-span-4 border border-black p-2 h-16 text-center flex flex-col justify-between">
          <span className="text-[8px] uppercase font-bold">Le Payeur</span>
          <span className="text-[8px] text-neutral-400 italic">Pour acquit</span>
        </div>

        <div className="col-span-5 border border-black p-2 h-16 text-center flex flex-col justify-between">
          <div>
            <span className="text-[8px] uppercase font-bold">{signatory.title || 'La Caisse'}</span>
            <div className="text-[8px] font-semibold">{signatory.name || payment.cashier_name || 'Le Caissier'}</div>
          </div>
          <div className="h-6 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Cachet" className="max-h-6 max-w-[80px] object-contain" />
            ) : (
              <span className="text-[7px] text-neutral-400 italic">Cachet & Signature</span>
            )}
          </div>
        </div>
      </div>

      {config.footerText && (
        <div className="mt-2 text-center text-[7px] text-neutral-600 font-mono border-t border-black pt-1">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
