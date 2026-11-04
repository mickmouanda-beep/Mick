import React, { useEffect } from 'react';
import { PayrollRecord, Establishment } from '../types.ts';
import { Printer, ShieldCheck, Download } from 'lucide-react';
import { CloseButton } from './CloseButton.tsx';
import { printPayslipPdf, downloadPayslipPdf } from '../utils/printPdfUtils.ts';
import { CustomizablePayslip } from './documents/CustomizablePayslip.tsx';

interface PrintablePayslipProps {
  record: PayrollRecord;
  establishment: Establishment;
  onClose?: () => void;
}

export const PrintablePayslip: React.FC<PrintablePayslipProps> = ({ record, establishment, onClose }) => {
  const [generatingPdf, setGeneratingPdf] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    const handlePopState = () => {
      if (onClose) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  const handlePrint = async () => {
    await printPayslipPdf(record, establishment);
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    setPdfError(null);
    try {
      await downloadPayslipPdf(record, establishment);
    } catch (err: any) {
      setPdfError(err.message || "Erreur PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 my-8 relative printable-document font-sans text-xs">
        
        {/* Barre d'action à l'écran (masquée à l'impression) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden no-print">
          <div className="flex items-center space-x-2 text-indigo-950 font-bold">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Bulletin de Paie Officiel • Maquette Établissement</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Télécharger en PDF"
            >
              {generatingPdf ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-slate-300" />
              )}
              <span>{generatingPdf ? 'Génération...' : 'Télécharger PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le Bulletin</span>
            </button>
            {onClose && <CloseButton onClose={onClose} className="sticky top-2 z-10" />}
          </div>
        </div>

        {/* ================= CORPS DU BULLETIN PERSONNALISÉ (IMPRIMABLE) ================= */}
        <div id="printable-payslip-doc">
          <CustomizablePayslip record={record} establishment={establishment} />
        </div>

      </div>
    </div>
  );
};
