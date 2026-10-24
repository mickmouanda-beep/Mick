import React from 'react';
import { Payment, Establishment } from '../types.ts';

interface PrintableReceiptProps {
  payment: Payment;
  establishment: Establishment;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ payment, establishment }) => {
  return (
    <div className="bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-300 max-w-xl mx-auto printable-document font-sans text-xs">
      
      {/* En-tête */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center space-x-3">
            {establishment.logo_url ? (
              <img
                src={establishment.logo_url}
                alt={establishment.name}
                className="w-12 h-12 object-contain rounded border border-slate-300 p-0.5 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded border border-slate-300 bg-slate-100 flex items-center justify-center font-bold text-indigo-950 text-xs shrink-0 uppercase">
                {establishment.name ? establishment.name.substring(0, 2) : 'EG'}
              </div>
            )}
            <div>
              <h2 className="font-black text-base uppercase text-indigo-950 tracking-tight">
                {establishment.name}
              </h2>
              <p className="text-[10px] text-slate-600 font-medium">
                {establishment.city} • {establishment.country}
              </p>
              {establishment.phone && (
                <p className="text-[10px] text-slate-600 font-mono">Tél : {establishment.phone}</p>
              )}
              <p className="text-[9px] font-mono text-slate-500">Année Scolaire : {establishment.academic_year}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-2 py-0.5 border border-slate-900 font-black text-sm uppercase rounded">
              QUITTANCE DE CAISSE
            </span>
            <p className="text-sm font-mono font-bold text-indigo-900 mt-1">
              N° {payment.receipt_number}
            </p>
            <p className="text-[10px] text-slate-500">{new Date(payment.created_at).toLocaleString('fr-FR')}</p>
          </div>
        </div>
      </div>

      {payment.status === 'ANNULE' && (
        <div className="mb-4 p-2 bg-rose-100 border border-rose-400 text-rose-800 text-center font-bold text-xs uppercase rounded">
          *** CETTE QUITTANCE A ÉTÉ ANNULÉE LE {payment.cancelled_at || ''} ***
          <span className="block text-[10px] font-normal normal-case">Motif : {payment.cancellation_reason}</span>
        </div>
      )}

      {/* Renseignements Élève */}
      <div className="bg-slate-50 p-3 rounded border border-slate-300 mb-4 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-600">Reçu de :</span>
          <span className="font-bold uppercase text-slate-950">
            {payment.last_name} {payment.first_name}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Numéro Matricule :</span>
          <span className="font-mono font-bold">{payment.matricule}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Classe :</span>
          <span className="font-semibold text-indigo-900">{payment.class_name || 'Élève inscrit'}</span>
        </div>
      </div>

      {/* Détails du Versement */}
      <div className="border border-slate-300 rounded mb-4 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
            <tr>
              <th className="p-2.5">Libellé de l'Opération</th>
              <th className="p-2.5">Mode Règlement</th>
              <th className="p-2.5 text-right">Montant Versé</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="p-2.5 font-medium">
                {payment.notes || "Versement sur frais de scolarité de l'établissement"}
                {payment.transaction_reference && (
                  <span className="block text-[10px] text-slate-500 font-mono">
                    Réf. Transaction : {payment.transaction_reference}
                  </span>
                )}
              </td>
              <td className="p-2.5 font-semibold text-slate-800">
                {payment.payment_method}
              </td>
              <td className="p-2.5 text-right font-black font-mono text-sm text-indigo-950">
                {payment.amount.toLocaleString('fr-FR')} FCFA
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Montant en lettres */}
      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded mb-6 text-[11px]">
        <span className="text-slate-600 font-medium">Montant total reçu : </span>
        <span className="font-bold text-slate-900">
          {payment.amount.toLocaleString('fr-FR')} Francs CFA ({establishment.currency})
        </span>
      </div>

      {/* Signatures & Sceau */}
      <div className="grid grid-cols-2 gap-4 border-t border-slate-300 pt-3 text-center text-[10px]">
        <div>
          <p className="font-bold text-slate-700 uppercase">Le Déposant / Parent</p>
          <div className="h-16 flex items-end justify-center text-[9px] text-slate-400 italic">
            Pour acquit
          </div>
        </div>

        <div>
          <p className="font-bold text-slate-700 uppercase">La Caisse / Comptabilité</p>
          <p className="text-[10px] text-slate-600">{payment.cashier_name}</p>
          <div className="h-12 flex items-end justify-center text-[9px] text-slate-400 italic">
            Cachet Officiel & Signature
          </div>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[8px] text-slate-500 font-mono">
        Eco GES • Document informatique faisant foi • Tout versement doit faire l'objet d'une quittance officielle.
      </div>

    </div>
  );
};
