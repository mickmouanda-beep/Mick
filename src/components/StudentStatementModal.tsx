import React, { useState } from 'react';
import {
  Printer,
  Download,
  X,
  FileSpreadsheet,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Payment, Establishment, Student } from '../types.ts';
import { PrintableReceipt } from './PrintableReceipt.tsx';
import { numberToFrenchWords } from '../utils/numberToFrenchWords.ts';

interface StudentStatementModalProps {
  student: Student;
  payments: Payment[];
  financialSituation?: {
    totalDue: number;
    totalPaid: number;
    balance: number;
    applicableFees?: any[];
  };
  establishment: Establishment;
  onClose: () => void;
  onPrintReceipt?: (payment: Payment) => void;
}

export const StudentStatementModal: React.FC<StudentStatementModalProps> = ({
  student,
  payments,
  financialSituation,
  establishment,
  onClose,
  onPrintReceipt,
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  const totalDue = financialSituation?.totalDue || 0;
  const validPayments = payments.filter((p) => p.status === 'VALIDE');
  const totalPaid = financialSituation?.totalPaid !== undefined
    ? financialSituation.totalPaid
    : validPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const balance = financialSituation?.balance !== undefined
    ? financialSituation.balance
    : Math.max(0, totalDue - totalPaid);

  let statusBadge = 'IMPAYÉ';
  let badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (totalDue === 0 && totalPaid > 0) {
    statusBadge = 'RÉGLÉ';
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (balance === 0 && totalPaid > 0) {
    statusBadge = 'SOLDÉ (À JOUR)';
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (totalPaid > 0) {
    statusBadge = 'PAIEMENT PARTIEL';
    badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-5 sm:p-7 shadow-2xl my-6 flex flex-col max-h-[92vh]">
        
        {/* BARRE D'OUTILS (NO PRINT) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Relevé Individuel des Paiements de l'Élève</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                  {statusBadge}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {student.last_name} {student.first_name} • Matricule {student.matricule}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer le Relevé</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENU IMPRIMABLE */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 bg-white text-slate-900 rounded-xl my-4 border border-slate-200 printable-document">
          
          {/* En-tête officiel */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div className="flex items-center space-x-3">
              {establishment?.logo_url ? (
                <img
                  src={establishment.logo_url}
                  alt={establishment.name}
                  className="w-14 h-14 object-contain rounded border border-slate-300 p-1 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded border border-slate-300 bg-slate-100 flex items-center justify-center font-black text-indigo-950 text-base shrink-0 uppercase">
                  {establishment?.name ? establishment.name.substring(0, 2) : 'EG'}
                </div>
              )}
              <div>
                <h1 className="font-black text-base uppercase text-indigo-950 tracking-tight">
                  {establishment?.name || 'ÉTABLISSEMENT SCOLAIRE'}
                </h1>
                <p className="text-[10px] text-slate-600 font-medium">
                  {establishment?.city} • {establishment?.country || 'Congo-Brazzaville'} • Tél : {establishment?.phone || '—'}
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  Année Scolaire : {establishment?.academic_year || '2026-2027'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-indigo-950 text-white font-black text-xs uppercase rounded">
                RELEVÉ DE PAIEMENTS
              </span>
              <p className="text-[10px] font-mono text-slate-500 mt-1">
                Date d'édition : {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Fiche de l'élève */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex">
                <span className="text-slate-500 w-28 shrink-0 font-medium">Nom & Prénom(s) :</span>
                <span className="font-black uppercase text-slate-950">{student.last_name} {student.first_name}</span>
              </div>
              <div className="flex">
                <span className="text-slate-500 w-28 shrink-0 font-medium">Matricule :</span>
                <span className="font-mono font-bold text-indigo-950">{student.matricule}</span>
              </div>
              <div className="flex">
                <span className="text-slate-500 w-28 shrink-0 font-medium">Classe :</span>
                <span className="font-bold text-slate-800">{student.class_name || 'Élève inscrit'}</span>
              </div>
            </div>

            <div className="space-y-1 border-l border-slate-200 pl-4">
              <div className="flex">
                <span className="text-slate-500 w-28 shrink-0 font-medium">Responsable Légal :</span>
                <span className="font-bold text-slate-900">{student.guardian_name} ({student.guardian_relation})</span>
              </div>
              <div className="flex">
                <span className="text-slate-500 w-28 shrink-0 font-medium">Contact Parent :</span>
                <span className="font-mono font-semibold text-slate-800">{student.guardian_phone}</span>
              </div>
              <div className="flex">
                <span className="text-slate-500 w-28 shrink-0 font-medium">Statut Dossier :</span>
                <span className="font-bold uppercase text-indigo-900">{statusBadge}</span>
              </div>
            </div>
          </div>

          {/* Synthèse financière */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Frais Exigibles</span>
              <p className="text-lg font-black font-mono text-slate-900 mt-0.5">
                {totalDue.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Déjà Encaissé</span>
              <p className="text-lg font-black font-mono text-emerald-800 mt-0.5">
                {totalPaid.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Reste à Payer (Solde Dû)</span>
              <p className="text-lg font-black font-mono text-rose-800 mt-0.5">
                {balance.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>

          {/* Tableau historique des versements */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="bg-slate-100 p-2.5 border-b border-slate-300 font-bold text-xs uppercase text-slate-800 flex justify-between items-center">
              <span>Historique Chronologique des Versements & Quittances</span>
              <span className="text-[10px] font-mono text-slate-500 font-normal">
                {payments.length} opération(s) enregistrée(s)
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Aucun paiement n'a encore été enregistré pour cet élève.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Date & Heure</th>
                    <th className="p-2.5">N° Quittance</th>
                    <th className="p-2.5">Motif du Paiement</th>
                    <th className="p-2.5">Mode</th>
                    <th className="p-2.5 text-right">Montant Versé</th>
                    <th className="p-2.5">Statut</th>
                    <th className="p-2.5 text-right no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-[11px] text-slate-600">
                        {new Date(p.created_at).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(p.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-indigo-950">{p.receipt_number}</td>
                      <td className="p-2.5 font-medium text-slate-800">
                        {p.notes || p.payment_type || 'Scolarité'}
                        {p.transaction_reference && (
                          <span className="block text-[10px] text-slate-500 font-mono">
                            Réf: {p.transaction_reference}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-700 font-medium">{p.payment_method}</td>
                      <td className="p-2.5 text-right font-black font-mono text-slate-950">
                        {p.amount.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="p-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          p.status === 'VALIDE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right no-print">
                        {onPrintReceipt && (
                          <button
                            type="button"
                            onClick={() => onPrintReceipt(p)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold inline-flex items-center space-x-1"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Quittance</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bloc signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-center text-xs">
            <div className="space-y-12">
              <p className="font-bold text-slate-700 uppercase text-[10px]">
                Le Responsable Légal / Parent<br />(Pour acceptation du relevé financier)
              </p>
              <div className="h-8 border-b border-dashed border-slate-300 mx-8" />
            </div>
            <div className="space-y-12">
              <p className="font-bold text-slate-700 uppercase text-[10px]">
                La Direction & Caisse de l'Établissement<br />(Cachet officiel & Signature)
              </p>
              <div className="h-8 border-b border-dashed border-slate-300 mx-8" />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 text-center text-[8px] text-slate-500 font-mono">
            Eco GES • Relevé officiel de situation comptable • Certifié exact et conforme aux écritures de caisse.
          </div>
        </div>

        {/* PIED DE MODAL (NO PRINT) */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0 text-xs text-slate-400 no-print">
          <span>Relevé consolidé pour l'année scolaire {establishment?.academic_year || '2026-2027'}</span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le relevé</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
