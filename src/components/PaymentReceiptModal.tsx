import React, { useState } from 'react';
import {
  Printer,
  Download,
  Share2,
  X,
  FileText,
  CheckCircle2,
  Copy,
  Receipt,
  Layers,
} from 'lucide-react';
import { Payment, Establishment } from '../types.ts';
import { PrintableReceipt } from './PrintableReceipt.tsx';
import { api } from '../lib/api.ts';
import { numberToFrenchWords } from '../utils/numberToFrenchWords.ts';

interface PaymentReceiptModalProps {
  payments: Payment | Payment[];
  establishment: Establishment;
  onClose: () => void;
  onPaymentUpdated?: (updated: Payment) => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  payments,
  establishment,
  onClose,
  onPaymentUpdated,
}) => {
  const [format, setFormat] = useState<'A4' | 'A5'>('A4');
  const [copySuccess, setCopySuccess] = useState(false);
  const [loggingPrint, setLoggingPrint] = useState(false);

  const paymentList: Payment[] = Array.isArray(payments) ? payments : [payments];
  const isMultiple = paymentList.length > 1;

  // Enregistrer l'impression / réimpression dans le journal d'audit
  const handlePrint = async () => {
    setLoggingPrint(true);
    try {
      // Logger chaque quittance imprimée
      for (const p of paymentList) {
        if (p.id) {
          try {
            const res = await api.logPaymentPrint(p.id);
            if (onPaymentUpdated) {
              onPaymentUpdated({
                ...p,
                reprint_count: res.reprintCount,
                last_reprinted_at: res.lastReprintedAt,
              });
            }
          } catch (e) {
            console.warn('Erreur log print pour quittance', p.receipt_number, e);
          }
        }
      }
    } finally {
      setLoggingPrint(false);
      window.print();
    }
  };

  // Partage WhatsApp du reçu
  const handleShareWhatsApp = () => {
    const p = paymentList[0];
    if (!p) return;

    const text = `*QUITTANCE DE PAIEMENT - ${establishment?.name || 'ECOLE'}*
━━━━━━━━━━━━━━━━━━━━
*N° Quittance :* ${p.receipt_number}
*Date :* ${new Date(p.created_at).toLocaleDateString('fr-FR')} ${new Date(p.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
*Élève :* ${p.last_name || ''} ${p.first_name || ''} (Mtr: ${p.matricule || '—'})
*Classe :* ${p.class_name || 'Inscrit'}
*Payeur :* ${p.payer_name || 'Responsable légal'}
*Montant versé :* ${p.amount.toLocaleString('fr-FR')} FCFA
*En lettres :* ${numberToFrenchWords(p.amount)}
*Mode :* ${p.payment_method}${p.transaction_reference ? ` (Réf: ${p.transaction_reference})` : ''}
${p.total_due ? `*Reste à payer :* ${(p.balance_after ?? 0).toLocaleString('fr-FR')} FCFA` : ''}
*Caissier :* ${p.cashier_name || 'Caisse'}
━━━━━━━━━━━━━━━━━━━━
_Document officiel certifié généré par Eco GES_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleCopyText = () => {
    const p = paymentList[0];
    if (!p) return;
    const text = `QUITTANCE ${p.receipt_number} | ${p.last_name} ${p.first_name} | ${p.amount.toLocaleString('fr-FR')} FCFA (${numberToFrenchWords(p.amount)}) | ${establishment?.name || 'ECOLE'}`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-4 sm:p-6 shadow-2xl my-6 flex flex-col max-h-[92vh]">
        
        {/* BARRE D'OUTILS SUPÉRIEURE (NON IMPRIMABLE) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
                <span>
                  {isMultiple
                    ? `Impression groupée (${paymentList.length} quittances)`
                    : `Quittance N° ${paymentList[0]?.receipt_number || 'Nouveau'}`}
                </span>
                {paymentList[0]?.status === 'ANNULE' && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    ANNULÉE
                  </span>
                )}
                {paymentList[0]?.reprint_count ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    DUPLICATA
                  </span>
                ) : null}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isMultiple
                  ? 'Toutes les quittances sélectionnées prêtes pour impression ou export'
                  : 'Aperçu certifié prêt pour impression, téléchargement ou envoi'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bascule de format A4 / A5 */}
            <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setFormat('A4')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  format === 'A4'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Format A4 standard (page complète)"
              >
                Format A4
              </button>
              <button
                type="button"
                onClick={() => setFormat('A5')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  format === 'A5'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Petit format demi-page A5 / Ticket de caisse"
              >
                Format A5 / Ticket
              </button>
            </div>

            {/* Partage WhatsApp (si quittance unique) */}
            {!isMultiple && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                title="Envoyer le récapitulatif par WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            {/* Bouton Télécharger en PDF (lance l'impression avec option enregistrer PDF) */}
            <button
              type="button"
              disabled={loggingPrint}
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Télécharger en PDF via le module d'impression"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger PDF</span>
            </button>

            {/* Bouton Imprimer */}
            <button
              type="button"
              disabled={loggingPrint}
              onClick={handlePrint}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-teal-600/30 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isMultiple ? `Imprimer les ${paymentList.length} quittances` : 'Imprimer la quittance'}</span>
            </button>

            {/* Fermer */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPS DE L'APERÇU IMPRIMABLE */}
        <div className="overflow-y-auto p-2 sm:p-4 space-y-6 flex-1 bg-slate-950/40 rounded-xl border border-slate-800/60 my-3">
          {paymentList.map((payment, index) => (
            <div
              key={payment.id || index}
              className={isMultiple && index > 0 ? 'pt-6 border-t-2 border-dashed border-slate-700' : ''}
              style={{ pageBreakAfter: isMultiple ? 'always' : 'auto' }}
            >
              {isMultiple && (
                <div className="text-[11px] text-slate-400 mb-2 font-mono flex items-center justify-between no-print px-2">
                  <span>Quittance #{index + 1} de {paymentList.length}</span>
                  <span className="font-bold text-amber-400">{payment.receipt_number}</span>
                </div>
              )}
              <PrintableReceipt
                payment={payment}
                establishment={establishment}
                format={format}
                isDuplicate={Boolean(payment.reprint_count && payment.reprint_count > 0)}
              />
            </div>
          ))}
        </div>

        {/* PIED DE MODAL (NON IMPRIMABLE) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 shrink-0 text-xs text-slate-400 no-print">
          <div className="flex items-center space-x-2">
            {!isMultiple && (
              <button
                type="button"
                onClick={handleCopyText}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] flex items-center space-x-1"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier la référence</span>
                  </>
                )}
              </button>
            )}
            <span className="text-[11px] text-slate-500">
              Chaque impression est enregistrée dans le journal d'audit de l'établissement.
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer maintenant</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
