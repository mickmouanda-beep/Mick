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

export const BulletinCompact: React.FC<BulletinProps> = ({
  report,
  establishment,
  schoolClass,
  term,
  classAverage,
  config,
}) => {
  const termLabel =
    term === 'TRIMESTRE_1' ? 'T1' : term === 'TRIMESTRE_2' ? 'T2' : 'T3';

  const school = {
    name: config.schoolInfo?.name || establishment?.name || 'Établissement Scolaire',
    motto: config.schoolInfo?.motto || establishment?.motto || '',
    address: config.schoolInfo?.address || establishment?.address || '',
    city: config.schoolInfo?.city || establishment?.city || 'Brazzaville',
    phone: config.schoolInfo?.phone || establishment?.phone || '',
    email: config.schoolInfo?.email || establishment?.email || '',
    logoUrl: config.schoolInfo?.logoUrl || establishment?.logo_url || null,
  };

  const primary = config.styling?.primaryColor || '#0369a1'; // Bleu Océan
  const secondary = config.styling?.secondaryColor || '#334155'; // Ardoise foncé
  const font = config.styling?.fontFamily || 'roboto';
  const toggles = config.toggles || { showMention: true, showRank: true, showAppreciation: true, showObservations: true };
  const signatory = config.signatory || { name: 'Direction des Études', title: 'Le Directeur des Études', stampUrl: null };

  const mention =
    report.generalAverage >= 16 ? 'Félicitations' :
    report.generalAverage >= 14 ? 'Tableau d’Honneur' :
    report.generalAverage >= 12 ? 'Encouragements' :
    report.generalAverage >= 10 ? 'Admis' : 'Insuffisant';

  return (
    <DocumentFontWrapper
      font={font}
      className="bg-white text-slate-900 p-5 rounded-md shadow-md border border-slate-300 max-w-3xl mx-auto text-[11px] leading-tight"
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* 1. En-tête Compact Bi-colonne */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b-2" style={{ borderColor: primary }}>
        <div className="flex items-center gap-2.5">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded border border-slate-200 p-0.5" />
          ) : (
            <div className="w-10 h-10 rounded flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: primary }}>
              {school.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xs font-black uppercase text-slate-900 leading-none">{school.name}</h1>
            <p className="text-[8px] text-slate-500 mt-0.5">
              {[school.address, school.city].filter(Boolean).join(' • ')} {school.phone && `• ${school.phone}`}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="px-2 py-0.5 rounded text-[9px] font-black text-white" style={{ backgroundColor: primary }}>
              BULLETIN {termLabel}
            </span>
            <span className="font-mono font-bold text-[9px] text-slate-700">{establishment?.academic_year || '2026-2027'}</span>
          </div>
          <div className="text-[9px] font-mono text-slate-600 mt-0.5">Matricule : {report.student?.matricule}</div>
        </div>
      </div>

      {/* 2. Bandeau Élève & Classe super compact */}
      <div className="grid grid-cols-12 gap-2 bg-slate-100 p-1.5 rounded border border-slate-200 mb-2 text-[10px]">
        <div className="col-span-5 font-bold uppercase truncate text-slate-900">
          {report.student?.last_name} {report.student?.first_name}
        </div>
        <div className="col-span-3 text-slate-700">
          Classe : <strong className="text-slate-900">{schoolClass?.name}</strong>
        </div>
        <div className="col-span-2 text-slate-700 text-center">
          Né(e) : {report.student?.birth_date || '—'}
        </div>
        <div className="col-span-2 text-right text-slate-700">
          Cycle : {schoolClass?.cycle_code?.substring(0, 4)}
        </div>
      </div>

      {/* 3. Tableau des Matières Haute Densité */}
      <table className="w-full text-left border-collapse border border-slate-300 mb-2 text-[9px]">
        <thead className="text-white font-bold uppercase text-[8px]" style={{ backgroundColor: primary }}>
          <tr>
            <th className="border border-slate-300 p-1.5">Matière</th>
            <th className="border border-slate-300 p-1.5 text-center w-12">Moy /20</th>
            <th className="border border-slate-300 p-1.5 text-center w-8">Coef</th>
            <th className="border border-slate-300 p-1.5 text-center w-12">Total</th>
            {toggles.showAppreciation && <th className="border border-slate-300 p-1.5">Professeur & Appréciation</th>}
          </tr>
        </thead>
        <tbody>
          {(report.subjectGrades || []).map((subj: any, i: number) => (
            <tr key={subj.subjectId || i} className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
              <td className="border border-slate-300 p-1 font-semibold text-slate-800">
                {subj.subjectName}
              </td>
              <td className="border border-slate-300 p-1 text-center font-bold">
                {subj.average !== null ? (
                  <span className={subj.average >= 10 ? 'text-slate-900' : 'text-red-700'}>
                    {Number(subj.average).toFixed(1)}
                  </span>
                ) : '—'}
              </td>
              <td className="border border-slate-300 p-1 text-center text-slate-600">{subj.coefficient}</td>
              <td className="border border-slate-300 p-1 text-center font-mono font-bold">
                {subj.weightedScore !== null ? Number(subj.weightedScore).toFixed(1) : '-'}
              </td>
              {toggles.showAppreciation && (
                <td className="border border-slate-300 p-1 text-slate-600 text-[8px] truncate max-w-[200px]">
                  {subj.teacherName ? `${subj.teacherName} — ` : ''}
                  {subj.average !== null ? (subj.average >= 12 ? 'Bon travail' : subj.average >= 10 ? 'Passable' : 'Insuffisant') : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Barre de Synthèse Numérique */}
      <div className="grid grid-cols-12 gap-1.5 mb-2">
        <div className="col-span-6 bg-slate-50 border border-slate-300 rounded p-1.5 flex justify-between items-center text-[10px]">
          <div>
            <span className="text-slate-500 block text-[8px] uppercase">Moyenne Générale</span>
            <span className="font-black text-sm font-mono" style={{ color: primary }}>
              {report.generalAverage !== null ? `${Number(report.generalAverage).toFixed(2)} / 20` : 'N.C.'}
            </span>
          </div>
          <div className="text-right text-[9px] text-slate-600">
            <div>Points : <strong>{report.totalWeightedScore}</strong> (Coef {report.totalCoefficients})</div>
            {classAverage && <div>Classe : {classAverage} / 20</div>}
          </div>
        </div>

        <div className="col-span-6 bg-slate-50 border border-slate-300 rounded p-1.5 flex justify-between items-center text-[10px]">
          {toggles.showRank && (
            <div>
              <span className="text-slate-500 block text-[8px] uppercase">Rang</span>
              <span className="font-black text-sm text-slate-900">{report.rank ? `${report.rank}e` : '—'}</span>
            </div>
          )}
          {toggles.showMention && (
            <div className="text-right font-bold text-[9px]" style={{ color: secondary }}>
              <span className="text-slate-400 block text-[8px] uppercase">Mention</span>
              <span className="uppercase text-slate-950 font-black">{mention}</span>
            </div>
          )}
        </div>
      </div>

      {/* Avis & Signatures réduites */}
      <div className="grid grid-cols-12 gap-2 pt-1.5 border-t border-slate-300 text-[9px]">
        <div className="col-span-7">
          {toggles.showObservations && (
            <div>
              <span className="font-bold uppercase text-[8px] text-slate-500 block">Avis du Conseil :</span>
              <p className="italic text-slate-800 text-[9px] truncate">
                « {report.appreciation || 'Trimestre satisfaisant.'} »
              </p>
            </div>
          )}
          {config.footerText && (
            <p className="text-[7px] text-slate-400 font-mono mt-1 truncate">{config.footerText}</p>
          )}
        </div>

        <div className="col-span-5 flex justify-between items-center border-l border-slate-200 pl-2">
          <div className="text-center">
            <span className="text-[7px] uppercase font-bold text-slate-400 block">Parent</span>
            <span className="text-[7px] text-slate-400 italic">Visa</span>
          </div>
          <div className="text-right flex items-center gap-2">
            <div>
              <span className="text-[7px] uppercase font-bold text-slate-700 block">{signatory.title || 'Direction'}</span>
              <span className="text-[8px] text-slate-600">{signatory.name}</span>
            </div>
            {signatory.stampUrl && (
              <img src={signatory.stampUrl} alt="Cachet" className="w-8 h-8 object-contain" />
            )}
          </div>
        </div>
      </div>
    </DocumentFontWrapper>
  );
};
