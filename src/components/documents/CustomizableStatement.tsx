import React, { useState, useEffect } from 'react';
import { Payment, Establishment, Student } from '../../types.ts';
import { DocumentTemplateConfig, getDefaultTemplateConfig } from '../../types/documentTemplates.ts';
import { DocumentFontWrapper } from './DocumentFontWrapper.tsx';
import { api } from '../../lib/api.ts';

interface CustomizableStatementProps {
  student: any;
  payments: Payment[];
  financialSituation?: {
    totalDue: number;
    totalPaid: number;
    balance: number;
    applicableFees?: any[];
  };
  establishment: Establishment;
  config?: DocumentTemplateConfig | null;
  customConfig?: DocumentTemplateConfig | null;
  onPrintReceipt?: (payment: Payment) => void;
}

export const CustomizableStatement: React.FC<CustomizableStatementProps> = ({
  student,
  payments,
  financialSituation,
  establishment,
  config: propConfig,
  customConfig,
  onPrintReceipt,
}) => {
  const [loadedConfig, setLoadedConfig] = useState<DocumentTemplateConfig | null>(null);

  const effectiveConfig = customConfig || propConfig;

  useEffect(() => {
    if (effectiveConfig) return;
    let isMounted = true;
    api.getDocumentTemplate('situation_financiere')
      .then((cfg) => {
        if (isMounted && cfg) setLoadedConfig(cfg);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [effectiveConfig, establishment?.id]);

  const config: DocumentTemplateConfig =
    effectiveConfig ||
    loadedConfig ||
    getDefaultTemplateConfig('situation_financiere', establishment);

  const school = {
    name: config.schoolInfo?.name || establishment?.name || 'Établissement Scolaire',
    motto: config.schoolInfo?.motto || establishment?.motto || '',
    address: config.schoolInfo?.address || establishment?.address || '',
    city: config.schoolInfo?.city || establishment?.city || 'Brazzaville',
    phone: config.schoolInfo?.phone || establishment?.phone || '',
    email: config.schoolInfo?.email || establishment?.email || '',
    logoUrl: config.schoolInfo?.logoUrl || establishment?.logo_url || null,
  };

  const primary = config.styling?.primaryColor || '#1e3a8a';
  const secondary = config.styling?.secondaryColor || '#475569';
  const font = config.styling?.fontFamily || 'inter';
  const signatory = config.signatory || { name: 'Service de l’Intendance', title: 'L’Intendant / Comptable', stampUrl: null };

  const totalDue = financialSituation?.totalDue || 0;
  const validPayments = (payments || []).filter((p) => p.status === 'VALIDE');
  const totalPaid = financialSituation?.totalPaid !== undefined
    ? financialSituation.totalPaid
    : validPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const balance = financialSituation?.balance !== undefined
    ? financialSituation.balance
    : Math.max(0, totalDue - totalPaid);

  const isSolded = balance === 0 && totalPaid > 0;

  const isModerne = config.modelId === 'moderne';
  const isSobre = config.modelId === 'sobre';
  const isInstitutionnel = config.modelId === 'institutionnel';
  const isElegant = config.modelId === 'elegant';
  const isCompact = config.modelId === 'compact';

  return (
    <DocumentFontWrapper
      font={font}
      className={`bg-white text-slate-900 mx-auto select-text ${
        isSobre ? 'border border-black p-5' :
        isInstitutionnel ? 'border-4 border-double p-7 shadow-xl' :
        isElegant ? 'border-2 border-amber-600 outline outline-4 outline-indigo-950 -outline-offset-8 p-7 bg-[#fafaf9] shadow-xl' :
        isModerne ? 'border border-slate-200 rounded-2xl p-7 shadow-xl' :
        isCompact ? 'border border-slate-300 rounded p-4 text-[11px]' :
        'border border-slate-300 rounded-xl p-7 shadow-lg'
      } max-w-3xl text-xs`}
      style={{
        pageBreakInside: 'avoid',
        borderColor: isInstitutionnel ? primary : undefined,
      }}
    >
      {/* 1. En-tête */}
      <div className={`pb-3 mb-4 ${isSobre ? 'border-b border-black' : 'border-b-2'}`} style={{ borderColor: isSobre ? '#000' : primary }}>
        <div className="flex justify-between items-center text-[8px] uppercase font-bold text-slate-600 tracking-wider mb-2 border-b border-slate-200 pb-1">
          <span>{config.headerText || 'RÉPUBLIQUE DU CONGO • SERVICE DE L’INTENDANCE ET DE LA COMPTABILITÉ'}</span>
          <span>ANNÉE {establishment?.academic_year || '2026-2027'}</span>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-3 flex justify-start">
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="Logo" className="w-14 h-14 object-contain rounded border p-1 bg-white" />
            ) : (
              <div className="w-14 h-14 rounded flex items-center justify-center text-white font-bold text-base" style={{ backgroundColor: primary }}>
                {school.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="col-span-9 text-left">
            <h1 className="text-base font-black uppercase" style={{ color: primary }}>{school.name}</h1>
            {school.motto && <p className="text-[10px] italic text-slate-500">« {school.motto} »</p>}
            <p className="text-[9px] text-slate-500">
              {[school.address, school.city].filter(Boolean).join(' • ')} {school.phone && `• ${school.phone}`}
            </p>
          </div>
        </div>

        <div className="mt-3 text-center py-1 rounded" style={{ backgroundColor: `${primary}12` }}>
          <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: primary }}>
            RELEVÉ DE SITUATION FINANCIÈRE INDIVIDUELLE
          </h2>
          <span className="text-[9px] font-mono text-slate-600">
            Date d'arrêté : {new Date().toLocaleDateString('fr-FR')} • Matricule : {student.matricule}
          </span>
        </div>
      </div>

      {/* 2. Renseignements Élève */}
      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-[11px]">
        <div className="space-y-1">
          <div><span className="text-slate-500 font-medium">Élève :</span> <strong className="uppercase text-slate-950">{student.last_name} {student.first_name}</strong></div>
          <div><span className="text-slate-500 font-medium">Matricule :</span> <strong className="font-mono" style={{ color: primary }}>{student.matricule}</strong></div>
          <div><span className="text-slate-500 font-medium">Classe :</span> <strong>{student.class_name || 'Inscrit'}</strong></div>
        </div>
        <div className="space-y-1 border-l border-slate-200 pl-3">
          <div><span className="text-slate-500 font-medium">Responsable Légal :</span> <strong>{student.guardian_name || 'Tuteur Légal'}</strong></div>
          <div><span className="text-slate-500 font-medium">Téléphone :</span> <span className="font-mono">{student.guardian_phone || '—'}</span></div>
          <div>
            <span className="text-slate-500 font-medium">Position :</span>{' '}
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isSolded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {isSolded ? 'SOLDÉ / À JOUR' : balance === totalDue ? 'IMPAYÉ' : 'RÈGLEMENT PARTIEL'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Synthèse des Montants */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Exigible</span>
          <span className="font-mono text-base font-bold text-slate-900">{totalDue.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="text-[9px] uppercase font-bold text-emerald-700 block">Total Déjà Versé</span>
          <span className="font-mono text-base font-black text-emerald-800">{totalPaid.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <span className="text-[9px] uppercase font-bold text-rose-700 block">Reste à Payer</span>
          <span className="font-mono text-base font-black text-rose-800">{balance.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      {/* 4. Historique des Versements */}
      <div className="border border-slate-300 rounded-xl overflow-hidden mb-4">
        <div className="px-3 py-1.5 font-bold text-[10px] uppercase text-white flex justify-between" style={{ backgroundColor: primary }}>
          <span>Historique des Versements Encaissés ({validPayments.length})</span>
          <span>Montant</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 text-[9px] uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="p-2">Date</th>
              <th className="p-2">N° Quittance</th>
              <th className="p-2">Objet / Motif</th>
              <th className="p-2">Mode</th>
              <th className="p-2 text-right">Montant Versé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {validPayments.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                  Aucun versement enregistré à ce jour.
                </td>
              </tr>
            ) : (
              validPayments.map((p) => (
                <tr key={p.id || p.receipt_number}>
                  <td className="p-2 font-mono text-[10px] text-slate-600">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="p-2 font-mono font-bold" style={{ color: primary }}>{p.receipt_number}</td>
                  <td className="p-2 text-slate-800 font-medium">{p.notes || p.payment_type || 'Frais scolaires'}</td>
                  <td className="p-2 text-slate-600">{p.payment_method}</td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900">
                    {(p.amount || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Signatures */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-center text-[10px]">
        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between h-20">
          <span className="font-bold text-slate-700 uppercase">Le Parent d'Élève</span>
          <span className="text-[8px] text-slate-400 italic">Visa & Mention</span>
        </div>

        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between h-20">
          <div>
            <span className="font-bold text-slate-800 uppercase">{signatory.title || 'L’Intendance'}</span>
            <p className="text-[9px] text-slate-700">{signatory.name}</p>
          </div>
          <div className="h-8 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Cachet" className="max-h-7 max-w-[100px] object-contain" />
            ) : (
              <span className="text-[8px] text-slate-400 italic">Cachet & Signature</span>
            )}
          </div>
        </div>
      </div>

      {config.footerText && (
        <div className="mt-3 text-center text-[7.5px] text-slate-500 font-mono border-t border-slate-200 pt-1">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
