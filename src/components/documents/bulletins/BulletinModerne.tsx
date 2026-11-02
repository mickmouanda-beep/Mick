import React from 'react';
import { DocumentTemplateConfig } from '../../../types/documentTemplates.ts';
import { DocumentFontWrapper } from '../DocumentFontWrapper.tsx';

interface BulletinProps {
  report: any;
  establishment: any;
  schoolClass: any;
  term: string;
  classAverage?: number | null;
  config: DocumentTemplateConfig;
}

export const BulletinModerne: React.FC<BulletinProps> = ({
  report,
  establishment,
  schoolClass,
  term,
  classAverage,
  config,
}) => {
  const termLabel =
    term === 'TRIMESTRE_1' ? '1er Trimestre' : term === 'TRIMESTRE_2' ? '2ème Trimestre' : '3ème Trimestre';

  const school = {
    name: config.schoolInfo?.name || establishment?.name || 'Établissement Scolaire',
    motto: config.schoolInfo?.motto || establishment?.motto || '',
    address: config.schoolInfo?.address || establishment?.address || '',
    city: config.schoolInfo?.city || establishment?.city || 'Brazzaville',
    phone: config.schoolInfo?.phone || establishment?.phone || '',
    email: config.schoolInfo?.email || establishment?.email || '',
    logoUrl: config.schoolInfo?.logoUrl || establishment?.logo_url || null,
  };

  const primary = config.styling?.primaryColor || '#0f766e';
  const secondary = config.styling?.secondaryColor || '#0284c7';
  const font = config.styling?.fontFamily || 'roboto';
  const toggles = config.toggles || { showMention: true, showRank: true, showAppreciation: true, showObservations: true };
  const signatory = config.signatory || { name: 'Direction des Études', title: 'Le Directeur des Études', stampUrl: null };

  const mention =
    report.generalAverage >= 16 ? 'Félicitations' :
    report.generalAverage >= 14 ? 'Tableau d’Honneur' :
    report.generalAverage >= 12 ? 'Encouragements' :
    report.generalAverage >= 10 ? 'Admis(e)' : 'Avertissement de travail';

  return (
    <DocumentFontWrapper
      font={font}
      className="bg-white text-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 max-w-3xl mx-auto text-xs relative overflow-hidden"
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* Accent strip bar top */}
      <div
        className="absolute top-0 left-0 right-0 h-2.5"
        style={{
          background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`,
        }}
      />

      {/* 1. En-tête Moderne */}
      <div className="pt-2 pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt="Logo"
                className="w-14 h-14 object-contain rounded-xl shadow-xs border border-slate-100 p-1 bg-white"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xs"
                style={{ backgroundColor: primary }}
              >
                {school.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-base font-extrabold tracking-tight uppercase text-slate-900">
                {school.name}
              </h1>
              {school.motto && <p className="text-[10px] text-slate-500 font-medium">« {school.motto} »</p>}
              <p className="text-[9px] text-slate-400">
                {[school.address, school.city].filter(Boolean).join(' • ')}
                {school.phone && ` • ${school.phone}`}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span
              className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-xs"
              style={{ backgroundColor: primary }}
            >
              {termLabel}
            </span>
            <div className="text-[9px] text-slate-500 font-semibold mt-1">
              Année : {establishment?.academic_year || '2026-2027'}
            </div>
          </div>
        </div>

        {config.headerText && (
          <div className="mt-2 text-[8px] font-bold tracking-wider text-slate-400 uppercase text-center">
            {config.headerText}
          </div>
        )}
      </div>

      {/* 2. Badge Profil Élève */}
      <div
        className="rounded-xl p-3 mb-4 grid grid-cols-2 gap-4 border"
        style={{
          backgroundColor: `${primary}08`,
          borderColor: `${primary}25`,
        }}
      >
        <div>
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Élève</span>
          <p className="font-extrabold text-sm text-slate-950 uppercase mt-0.5">
            {report.student?.last_name} {report.student?.first_name} {report.student?.post_name || ''}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
            <span>Matricule : <strong className="font-mono text-slate-900">{report.student?.matricule}</strong></span>
            <span>•</span>
            <span>Né(e) le {report.student?.birth_date || '—'}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Classe & Cycle</span>
          <p className="font-bold text-sm text-slate-900 mt-0.5">{schoolClass?.name}</p>
          <p className="text-[10px] text-slate-600 mt-1">
            {schoolClass?.cycle_code} • {schoolClass?.level_code}
            {schoolClass?.serie_code && ` (Série ${schoolClass?.serie_code})`}
          </p>
        </div>
      </div>

      {/* 3. Tableau des Notes Moderne */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 shadow-xs">
        <table className="w-full text-left text-[10px] border-collapse">
          <thead style={{ backgroundColor: `${primary}15` }}>
            <tr className="text-slate-800 uppercase font-black text-[9px] border-b border-slate-200">
              <th className="p-2.5">Matières Enseignées</th>
              <th className="p-2.5 text-center w-16">Moy /20</th>
              <th className="p-2.5 text-center w-12">Coef</th>
              <th className="p-2.5 text-center w-16">Total</th>
              {toggles.showAppreciation && <th className="p-2.5">Appréciation Pédagogique</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(report.subjectGrades || []).map((subj: any, i: number) => (
              <tr key={subj.subjectId || i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                <td className="p-2 font-medium text-slate-900">
                  <span className="font-semibold">{subj.subjectName}</span>
                  <span className="text-slate-400 font-mono text-[9px] ml-1.5">({subj.subjectCode})</span>
                </td>
                <td className="p-2 text-center font-bold">
                  {subj.average !== null ? (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: subj.average >= 10 ? `${primary}15` : '#ffe4e6',
                        color: subj.average >= 10 ? primary : '#b91c1c',
                      }}
                    >
                      {Number(subj.average).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">N.N.</span>
                  )}
                </td>
                <td className="p-2 text-center font-semibold text-slate-600">{subj.coefficient}</td>
                <td className="p-2 text-center font-mono font-bold text-slate-900">
                  {subj.weightedScore !== null ? Number(subj.weightedScore).toFixed(2) : '-'}
                </td>
                {toggles.showAppreciation && (
                  <td className="p-2 text-slate-600 text-[9px]">
                    {subj.average !== null ? (
                      <span className="italic text-slate-700">
                        {subj.average >= 16 ? 'Excellent travail' : subj.average >= 14 ? 'Très bien' : subj.average >= 12 ? 'Bon niveau' : subj.average >= 10 ? 'Passable' : 'Insuffisant'}
                      </span>
                    ) : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Cartes de Performance */}
      <div className="grid grid-cols-12 gap-3 mb-4">
        {/* Moyenne générale */}
        <div
          className="col-span-5 rounded-xl p-3 border text-center flex flex-col justify-center"
          style={{
            backgroundColor: `${primary}08`,
            borderColor: `${primary}30`,
          }}
        >
          <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Moyenne Générale</span>
          <div className="text-2xl font-black mt-0.5" style={{ color: primary }}>
            {report.generalAverage !== null ? `${Number(report.generalAverage).toFixed(2)}` : 'N.C.'}
            <span className="text-xs text-slate-500 font-normal"> / 20</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-1">
            Moy. Classe : <strong>{classAverage ? `${classAverage} / 20` : '—'}</strong>
          </div>
        </div>

        {/* Rang & Points */}
        <div className="col-span-7 grid grid-cols-2 gap-2">
          {toggles.showRank && (
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-center flex flex-col justify-center">
              <span className="text-[9px] uppercase font-bold text-slate-500">Rang de l'élève</span>
              <span className="text-lg font-black text-slate-900 mt-0.5">
                {report.rank ? `${report.rank}e` : '—'}
              </span>
              <span className="text-[8px] text-slate-400">sur la classe</span>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-center flex flex-col justify-center">
            <span className="text-[9px] uppercase font-bold text-slate-500">Total Points</span>
            <span className="text-lg font-black font-mono text-slate-900 mt-0.5">{report.totalWeightedScore}</span>
            <span className="text-[8px] text-slate-400">Coef : {report.totalCoefficients}</span>
          </div>

          {toggles.showMention && (
            <div
              className="col-span-2 rounded-xl p-2 border text-center font-bold text-[10px]"
              style={{
                backgroundColor: `${secondary}10`,
                borderColor: `${secondary}30`,
                color: secondary,
              }}
            >
              Mention : <strong className="text-slate-950 uppercase">{mention}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Observations du conseil */}
      {toggles.showObservations && (
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
            Avis & Appréciation du Conseil de Classe
          </span>
          <p className="text-[10px] italic text-slate-800 mt-1 font-medium">
            « {report.appreciation || 'Trimestre satisfaisant, maintenir les efforts.'} »
          </p>
        </div>
      )}

      {/* 5. Signatures Moderne */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-center text-[10px]">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
          <p className="font-bold text-slate-700 uppercase text-[9px]">Le Professeur Principal</p>
          <div className="h-14 flex items-end justify-center text-[8px] text-slate-400 italic">Visa</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
          <p className="font-bold text-slate-700 uppercase text-[9px]">Parent / Tuteur</p>
          <div className="h-14 flex items-end justify-center text-[8px] text-slate-400 italic">Signature & Date</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <p className="font-bold text-slate-800 uppercase text-[9px]">{signatory.title || 'La Direction'}</p>
            <p className="text-[9px] text-slate-600">{signatory.name}</p>
          </div>
          <div className="h-14 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Cachet" className="max-h-12 max-w-[110px] object-contain" />
            ) : (
              <span className="text-[8px] text-slate-400 italic">Cachet & Signature</span>
            )}
          </div>
        </div>
      </div>

      {config.footerText && (
        <div className="mt-3 text-center text-[8px] text-slate-400 font-mono">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
