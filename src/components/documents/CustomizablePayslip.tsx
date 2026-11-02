import React, { useState, useEffect } from 'react';
import { PayrollRecord, Establishment } from '../../types.ts';
import { DocumentTemplateConfig, getDefaultTemplateConfig } from '../../types/documentTemplates.ts';
import { DocumentFontWrapper } from './DocumentFontWrapper.tsx';
import { numberToFrenchWords } from '../../utils/numberToFrenchWords.ts';
import { api } from '../../lib/api.ts';

interface CustomizablePayslipProps {
  record: PayrollRecord;
  establishment: Establishment;
  config?: DocumentTemplateConfig | null;
}

export const CustomizablePayslip: React.FC<CustomizablePayslipProps> = ({
  record,
  establishment,
  config: propConfig,
}) => {
  const [loadedConfig, setLoadedConfig] = useState<DocumentTemplateConfig | null>(null);

  const snapshotConfig = (record as any)?.template_snapshot || null;

  useEffect(() => {
    if (snapshotConfig || propConfig) return;
    let isMounted = true;
    api.getDocumentTemplate('fiche_paie')
      .then((cfg) => {
        if (isMounted && cfg) setLoadedConfig(cfg);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [snapshotConfig, propConfig, establishment?.id]);

  const config: DocumentTemplateConfig =
    snapshotConfig ||
    propConfig ||
    loadedConfig ||
    getDefaultTemplateConfig('fiche_paie', establishment);

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
  const signatory = config.signatory || { name: 'Direction des Ressources Humaines', title: 'Le Responsable de la Paie', stampUrl: null };

  const periodLabel = (() => {
    if (!record.period) return '';
    const [year, month] = record.period.split('-');
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${months[mIdx] || month} ${year}`;
  })();

  const netAmount = record.net_amount ?? (record as any).net_salary ?? 0;
  const netWords = numberToFrenchWords(netAmount);

  // Rendus selon le modèle
  const isModerne = config.modelId === 'moderne';
  const isSobre = config.modelId === 'sobre';
  const isInstitutionnel = config.modelId === 'institutionnel';
  const isElegant = config.modelId === 'elegant';
  const isCompact = config.modelId === 'compact';

  return (
    <DocumentFontWrapper
      font={font}
      className={`bg-white text-slate-900 mx-auto select-text ${
        isSobre ? 'border border-black p-6' :
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
          <span>{config.headerText || 'RÉPUBLIQUE DU CONGO • SERVICE DE LA PAIE ET DU PERSONNEL'}</span>
          <span>BULLETIN OFFICIEL DE SALAIRE</span>
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
            BULLETIN DE PAIE • PÉRIODE DE {periodLabel.toUpperCase()}
          </h2>
          <span className="text-[10px] font-mono text-slate-600">Réf : {record.id}</span>
        </div>
      </div>

      {/* 2. Identification Salarié */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-[11px]">
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Salarié</span>
          <p className="font-extrabold text-sm text-slate-950 uppercase">{record.full_name}</p>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Matricule</span>
          <p className="font-mono font-bold" style={{ color: primary }}>{record.employee_code}</p>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Poste / Fonction</span>
          <p className="font-semibold text-slate-800">{record.job_title}</p>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Département</span>
          <p className="font-semibold text-slate-800">{record.department}</p>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Contrat</span>
          <p className="font-semibold text-slate-800">{record.contract_type || 'CDI'}</p>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Mode Règlement</span>
          <p className="font-semibold text-slate-800">{record.payment_method || 'Virement'}</p>
        </div>
        <div className="col-span-2">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Heures Réalisées</span>
          <p className="font-semibold text-slate-800">
            {record.total_taught_hours !== undefined && record.total_taught_hours > 0 ? (
              <span>{record.total_taught_hours}h pointées (Collège : {record.college_hours || 0}h, Lycée : {record.lycee_hours || 0}h)</span>
            ) : (
              <span>Rémunération forfaitaire statutaire</span>
            )}
          </p>
        </div>
      </div>

      {/* 3. Décompte Salaire Brut & Retenues */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Gains */}
        <div className="border border-slate-300 rounded-xl overflow-hidden">
          <div className="text-white px-3 py-1.5 font-bold text-[10px] uppercase flex justify-between" style={{ backgroundColor: primary }}>
            <span>Éléments de Rémunération</span>
            <span>Montant</span>
          </div>
          <div className="p-3 space-y-2 bg-white text-xs">
            <div className="flex justify-between">
              <span>Salaire de base / Heures de cours</span>
              <span className="font-mono font-bold">{(record.base_salary || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
            {(record.bonuses || 0) > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Primes & Indemnités</span>
                <span className="font-mono font-bold">+{(record.bonuses || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}
            {(record.overtime_amount || 0) > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Heures Supplémentaires ({record.overtime_hours}h)</span>
                <span className="font-mono font-bold">+{(record.overtime_amount || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
              <span>TOTAL SALAIRE BRUT</span>
              <span className="font-mono">{(record.gross_amount || record.base_salary || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>

        {/* Retenues */}
        <div className="border border-slate-300 rounded-xl overflow-hidden">
          <div className="bg-slate-700 text-white px-3 py-1.5 font-bold text-[10px] uppercase flex justify-between">
            <span>Retenues & Cotisations</span>
            <span>Montant</span>
          </div>
          <div className="p-3 space-y-2 bg-white text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Retenues fiscales & sociales</span>
              <span className="font-mono font-semibold">-{(record.deductions || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-800">
              <span>TOTAL DES DÉDUCTIONS</span>
              <span className="font-mono">-{(record.deductions || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. NET À PAYER */}
      <div className="p-3.5 rounded-xl border mb-4 flex items-center justify-between" style={{ backgroundColor: `${primary}0c`, borderColor: `${primary}35` }}>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-600 block">Net à Payer au Salarié</span>
          <div className="text-xl font-black font-mono mt-0.5" style={{ color: primary }}>
            {netAmount.toLocaleString('fr-FR')} FCFA
          </div>
          <p className="text-[10px] italic text-slate-700 mt-1">« {netWords} »</p>
        </div>
        <div className="text-right">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-xs" style={{ backgroundColor: primary }}>
            Paiement Validé
          </span>
        </div>
      </div>

      {/* 5. Signatures */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-center text-[10px]">
        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between h-20">
          <span className="font-bold text-slate-700 uppercase">Le Salarié</span>
          <span className="text-[8px] text-slate-400 italic">Signature & Date</span>
        </div>

        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between h-20">
          <div>
            <span className="font-bold text-slate-800 uppercase">{signatory.title || 'La Direction'}</span>
            <p className="text-[9px] text-slate-700">{signatory.name}</p>
          </div>
          <div className="h-8 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Cachet" className="max-h-7 max-w-[100px] object-contain" />
            ) : (
              <span className="text-[8px] text-slate-400 italic">Cachet & Signature Officielle</span>
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
