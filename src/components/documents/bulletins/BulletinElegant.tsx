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

export const BulletinElegant: React.FC<BulletinProps> = ({
  report,
  establishment,
  schoolClass,
  term,
  classAverage,
  config,
}) => {
  const termLabel =
    term === 'TRIMESTRE_1' ? 'PREMIER TRIMESTRE' : term === 'TRIMESTRE_2' ? 'DEUXIÈME TRIMESTRE' : 'TROISIÈME TRIMESTRE';

  const school = {
    name: config.schoolInfo?.name || establishment?.name || 'Établissement Scolaire',
    motto: config.schoolInfo?.motto || establishment?.motto || '',
    address: config.schoolInfo?.address || establishment?.address || '',
    city: config.schoolInfo?.city || establishment?.city || 'Brazzaville',
    phone: config.schoolInfo?.phone || establishment?.phone || '',
    email: config.schoolInfo?.email || establishment?.email || '',
    logoUrl: config.schoolInfo?.logoUrl || establishment?.logo_url || null,
  };

  const primary = config.styling?.primaryColor || '#1e1b4b'; // Indigo Nuit
  const secondary = config.styling?.secondaryColor || '#b45309'; // Or Ambré
  const font = config.styling?.fontFamily || 'merriweather';
  const toggles = config.toggles || { showMention: true, showRank: true, showAppreciation: true, showObservations: true };
  const signatory = config.signatory || { name: 'Direction des Études', title: 'Le Directeur des Études', stampUrl: null };

  const mention =
    report.generalAverage >= 16 ? 'Félicitations du Conseil' :
    report.generalAverage >= 14 ? 'Tableau d’Honneur' :
    report.generalAverage >= 12 ? 'Encouragements' :
    report.generalAverage >= 10 ? 'Admis(e)' : 'Avertissement de travail';

  return (
    <DocumentFontWrapper
      font={font}
      className="bg-[#fafaf9] text-slate-900 p-8 shadow-2xl max-w-3xl mx-auto text-xs relative select-text"
      style={{
        pageBreakInside: 'avoid',
        border: `2px solid ${secondary}`,
        outline: `4px solid ${primary}`,
        outlineOffset: '-7px',
      }}
    >
      {/* Coins ornementaux prestige */}
      <div className="absolute top-2 left-2 text-xs font-serif leading-none" style={{ color: secondary }}>❖</div>
      <div className="absolute top-2 right-2 text-xs font-serif leading-none" style={{ color: secondary }}>❖</div>
      <div className="absolute bottom-2 left-2 text-xs font-serif leading-none" style={{ color: secondary }}>❖</div>
      <div className="absolute bottom-2 right-2 text-xs font-serif leading-none" style={{ color: secondary }}>❖</div>

      {/* 1. En-tête Prestige Élégant */}
      <div className="text-center pb-4 mb-4 border-b" style={{ borderColor: `${secondary}50` }}>
        <p className="text-[8px] uppercase tracking-widest font-serif font-bold text-slate-500 mb-1">
          {config.headerText || 'RÉPUBLIQUE DU CONGO • MINISTÈRE DE L’ENSEIGNEMENT'}
        </p>
        
        <div className="flex items-center justify-center gap-4 my-2">
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt="Logo Prestige"
              className="w-14 h-14 object-contain rounded-full border-2 p-1 bg-white shadow-xs"
              style={{ borderColor: secondary }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-white font-serif font-black text-lg shadow-xs"
              style={{ backgroundColor: primary, borderColor: secondary }}
            >
              {school.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <h1 className="text-base font-serif font-black tracking-wider uppercase" style={{ color: primary }}>
              {school.name}
            </h1>
            {school.motto && <p className="text-[10px] font-serif italic text-amber-900">« {school.motto} »</p>}
            <p className="text-[8px] text-slate-500 font-sans">
              {[school.address, school.city].filter(Boolean).join(' • ')} {school.phone && `• Tél : ${school.phone}`}
            </p>
          </div>
        </div>

        <div className="inline-block px-6 py-1 rounded-full border text-[11px] font-serif font-bold uppercase tracking-widest mt-1"
             style={{ backgroundColor: `${primary}08`, borderColor: secondary, color: primary }}>
          Relevé Officiel des Notes • {termLabel}
        </div>
      </div>

      {/* 2. Cartouche Étudiant & Classe */}
      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border mb-4 text-[11px] bg-white shadow-xs"
           style={{ borderColor: `${secondary}40` }}>
        <div className="space-y-1">
          <p>
            <span className="font-serif font-bold text-slate-600">Élève : </span>
            <span className="font-serif font-bold text-slate-950 uppercase">
              {report.student?.last_name} {report.student?.first_name} {report.student?.post_name || ''}
            </span>
          </p>
          <p>
            <span className="font-serif font-bold text-slate-600">Matricule : </span>
            <span className="font-mono font-bold" style={{ color: primary }}>{report.student?.matricule}</span>
          </p>
          <p>
            <span className="font-serif font-bold text-slate-600">Date de naissance : </span>{report.student?.birth_date || '—'}
          </p>
        </div>

        <div className="space-y-1 text-right">
          <p>
            <span className="font-serif font-bold text-slate-600">Classe : </span>
            <span className="font-serif font-bold uppercase" style={{ color: primary }}>{schoolClass?.name}</span>
          </p>
          <p>
            <span className="font-serif font-bold text-slate-600">Cycle & Niveau : </span>{schoolClass?.cycle_code} • {schoolClass?.level_code}
          </p>
          <p>
            <span className="font-serif font-bold text-slate-600">Prof. Principal : </span>{schoolClass?.main_teacher_name || 'Direction'}
          </p>
        </div>
      </div>

      {/* 3. Table des Notes Élégante */}
      <table className="w-full text-left border-collapse mb-4 text-[10px]">
        <thead>
          <tr className="text-white font-serif font-bold uppercase text-[9px]" style={{ backgroundColor: primary }}>
            <th className="p-2 border" style={{ borderColor: secondary }}>Disciplines Enseignées</th>
            <th className="p-2 text-center w-16 border" style={{ borderColor: secondary }}>Note /20</th>
            <th className="p-2 text-center w-12 border" style={{ borderColor: secondary }}>Coef</th>
            <th className="p-2 text-center w-16 border" style={{ borderColor: secondary }}>Points</th>
            {toggles.showAppreciation && <th className="p-2 border" style={{ borderColor: secondary }}>Appréciation du Maître</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-100 bg-white">
          {(report.subjectGrades || []).map((subj: any, i: number) => (
            <tr key={subj.subjectId || i} className={i % 2 === 1 ? 'bg-amber-50/20' : 'bg-white'}>
              <td className="p-2 font-serif font-semibold border-x border-amber-200">
                {subj.subjectName} <span className="font-mono text-slate-400 text-[8px]">({subj.subjectCode})</span>
              </td>
              <td className="p-2 text-center font-bold border-r border-amber-200">
                {subj.average !== null ? (
                  <span className={subj.average >= 10 ? 'text-slate-900 font-serif' : 'text-rose-700 font-serif'}>
                    {Number(subj.average).toFixed(2)}
                  </span>
                ) : 'N.N.'}
              </td>
              <td className="p-2 text-center text-slate-700 border-r border-amber-200">{subj.coefficient}</td>
              <td className="p-2 text-center font-mono font-bold border-r border-amber-200">
                {subj.weightedScore !== null ? Number(subj.weightedScore).toFixed(2) : '-'}
              </td>
              {toggles.showAppreciation && (
                <td className="p-2 text-slate-600 font-serif italic border-r border-amber-200 text-[9px]">
                  {subj.average !== null ? (
                    <span>
                      {subj.average >= 16 ? 'Excellent' : subj.average >= 14 ? 'Très bien' : subj.average >= 12 ? 'Bien' : subj.average >= 10 ? 'Passable' : 'Insuffisant'}
                    </span>
                  ) : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Résultats & Mention d'Honneur */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-3 rounded border space-y-1 text-[11px]" style={{ borderColor: `${secondary}40` }}>
          <div className="flex justify-between font-serif">
            <span>Total Coefficients :</span>
            <span className="font-bold">{report.totalCoefficients}</span>
          </div>
          <div className="flex justify-between font-serif">
            <span>Points Pondérés :</span>
            <span className="font-bold font-mono">{report.totalWeightedScore}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-amber-200 font-serif font-black text-sm" style={{ color: primary }}>
            <span>MOYENNE GÉNÉRALE :</span>
            <span className="font-mono">{report.generalAverage !== null ? `${Number(report.generalAverage).toFixed(2)} / 20` : 'N.C.'}</span>
          </div>
          {toggles.showRank && (
            <div className="flex justify-between pt-0.5 text-[10px] text-slate-600 font-serif">
              <span>Rang dans la promotion :</span>
              <span className="font-bold" style={{ color: secondary }}>{report.rank ? `${report.rank}e` : '—'}</span>
            </div>
          )}
        </div>

        <div className="bg-white p-3 rounded border flex flex-col justify-between text-[11px]" style={{ borderColor: `${secondary}40` }}>
          {toggles.showObservations && (
            <div>
              <span className="font-serif font-bold uppercase text-[9px] text-slate-700 block">
                Témoignage du Corps Professoral :
              </span>
              <p className="font-serif italic text-slate-900 text-[10px] mt-1 bg-amber-50/30 p-2 rounded border border-amber-100">
                « {report.appreciation || 'Travail satisfaisant.'} »
              </p>
            </div>
          )}
          {toggles.showMention && (
            <div className="text-[10px] font-serif font-bold text-center py-1 mt-1 rounded" style={{ backgroundColor: `${secondary}15`, color: secondary }}>
              Distinction : <strong className="uppercase text-slate-950 font-black">{mention}</strong>
            </div>
          )}
        </div>
      </div>

      {/* 5. Sceau et Signatures Prestige */}
      <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center text-[10px]" style={{ borderColor: `${secondary}50` }}>
        <div>
          <p className="font-serif font-bold uppercase text-slate-800">Le Professeur Principal</p>
          <div className="h-14 flex items-end justify-center text-[8px] text-slate-400 italic">Signature</div>
        </div>

        <div>
          <p className="font-serif font-bold uppercase text-slate-800">Le Tuteur Légal</p>
          <div className="h-14 flex items-end justify-center text-[8px] text-slate-400 italic">Visa</div>
        </div>

        <div className="flex flex-col items-center justify-between">
          <div>
            <p className="font-serif font-bold uppercase text-slate-800">{signatory.title || 'La Direction'}</p>
            <p className="text-[8px] text-slate-600">{signatory.name}</p>
          </div>
          <div className="h-14 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Sceau" className="max-h-12 max-w-[110px] object-contain" />
            ) : (
              <span className="text-[8px] text-slate-400 italic">Sceau & Signature</span>
            )}
          </div>
        </div>
      </div>

      {config.footerText && (
        <div className="mt-3 text-center text-[7px] text-slate-500 font-serif border-t border-amber-200/50 pt-1">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
