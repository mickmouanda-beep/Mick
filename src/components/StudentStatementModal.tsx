import React, { useState, useEffect } from 'react';
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
import { CloseButton } from './CloseButton.tsx';
import { printDocument, downloadPdf } from '../utils/printPdfUtils.ts';
import { CustomizableStatement } from './documents/CustomizableStatement.tsx';

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handlePopState = () => onClose();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

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
    printDocument('printable-student-statement', `Releve_${student.matricule || 'eleve'}`);
  };

  const handleDownloadPdf = () => {
    downloadPdf('printable-student-statement', `Releve_Paiements_${student.matricule || 'eleve'}.pdf`);
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

          <div className="flex items-center space-x-2 no-print">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              title="Télécharger en PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer le Relevé</span>
            </button>
            <CloseButton onClose={onClose} className="sticky top-2 z-10" />
          </div>
        </div>

        {/* CONTENU IMPRIMABLE PERSONNALISABLE */}
        <div id="printable-student-statement" className="overflow-y-auto flex-1 bg-white text-slate-900 rounded-xl my-4 border border-slate-200 printable-document">
          <CustomizableStatement
            student={student}
            payments={payments}
            financialSituation={financialSituation}
            establishment={establishment}
            onPrintReceipt={onPrintReceipt}
          />
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
