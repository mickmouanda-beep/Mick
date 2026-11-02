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

export const BulletinSobre: React.FC<BulletinProps> = ({
  report,
  establishment,
  schoolClass,
  term,
  classAverage,
  config,
}) => {
  const termLabel =
    term === 'TRIMESTRE_1' ? '1ER TRIMESTRE' : term === 'TRIMESTRE_2' ? '2ÈME TRIMESTRE' : '3ÈME TRIMESTRE';

  const school = {
    name: config.schoolInfo?.name || establishment?.name || 'Établissement Scolaire',
    motto: config.schoolInfo?.motto || establishment?.motto || '',
    address: config.schoolInfo?.address || establishment?.address || '',
    city: config.schoolInfo?.city || establishment?.city || 'Brazzaville',
    phone: config.schoolInfo?.phone || establishment?.phone || '',
    email: config.schoolInfo?.email || establishment?.email || '',
    logoUrl: config.schoolInfo?.logoUrl || establishment?.logo_url || null,
  };

  const primary = config.styling?.primaryColor || '#18181b';
  const secondary = config.styling?.secondaryColor || '#52525b';
  const font = config.styling?.fontFamily || 'inter';
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
      className="bg-white text-black p-6 rounded-none border border-black max-w-3xl mx-auto text-xs"
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* 1. En-tête Sobre */}
      <div className="border-b border-black pb-3 mb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <h1 className="text-sm font-bold uppercase tracking-wider text-black">
              {school.name}
            </h1>
            {school.motto && <p className="text-[9px] italic text-neutral-600">{school.motto}</p>}
            <p className="text-[9px] text-neutral-700">
              {[school.address, school.city].filter(Boolean).join(' • ')} {school.phone && `• Tél: ${school.phone}`}
            </p>
          </div>

          <div className="text-right">
            <span className="font-bold text-xs uppercase block border-b border-black pb-0.5">
              BULLETIN DE NOTES • {termLabel}
            </span>
            <span className="text-[9px] text-neutral-600 block mt-0.5">
              Année Scolaire {establishment?.academic_year || '2026-2027'}
            </span>
          </div>
        </div>

        {config.headerText && (
          <div className="mt-2 text-[8px] text-center text-neutral-500 uppercase tracking-wider">
            {config.headerText}
          </div>
        )}
      </div>

      {/* 2. Données Élève */}
      <div className="grid grid-cols-2 gap-2 border border-black p-2 mb-3 text-[10px]">
        <div>
          <div><strong>Élève :</strong> <span className="uppercase font-bold">{report.student?.last_name} {report.student?.first_name}</span></div>
          <div><strong>Matricule :</strong> <span className="font-mono">{report.student?.matricule}</span></div>
          <div><strong>Né(e) le :</strong> {report.student?.birth_date || '—'}</div>
        </div>
        <div className="text-right">
          <div><strong>Classe :</strong> <span className="font-bold">{schoolClass?.name}</span></div>
          <div><strong>Niveau :</strong> {schoolClass?.cycle_code} - {schoolClass?.level_code}</div>
          <div><strong>Professeur Principal :</strong> {schoolClass?.main_teacher_name || '—'}</div>
        </div>
      </div>

      {/* 3. Tableau Notes Sobre (haute lisibilité) */}
      <table className="w-full text-left text-[10px] border-collapse border border-black mb-3">
        <thead>
          <tr className="border-b border-black bg-neutral-100 uppercase text-[9px] font-bold">
            <th className="p-1.5 border-r border-black">Matière</th>
            <th className="p-1.5 border-r border-black text-center w-14">Note /20</th>
            <th className="p-1.5 border-r border-black text-center w-10">Coef</th>
            <th className="p-1.5 border-r border-black text-center w-14">Points</th>
            {toggles.showAppreciation && <th className="p-1.5">Observations Pédagogiques</th>}
          </tr>
        </thead>
        <tbody>
          {(report.subjectGrades || []).map((subj: any, i: number) => (
            <tr key={subj.subjectId || i} className="border-b border-neutral-300">
              <td className="p-1.5 border-r border-black font-medium">
                {subj.subjectName} <span className="text-[8px] text-neutral-500">({subj.subjectCode})</span>
              </td>
              <td className="p-1.5 border-r border-black text-center font-bold">
                {subj.average !== null ? Number(subj.average).toFixed(2) : 'N.N.'}
              </td>
              <td className="p-1.5 border-r border-black text-center">{subj.coefficient}</td>
              <td className="p-1.5 border-r border-black text-center font-mono font-semibold">
                {subj.weightedScore !== null ? Number(subj.weightedScore).toFixed(2) : '-'}
              </td>
              {toggles.showAppreciation && (
                <td className="p-1.5 text-neutral-700 text-[9px]">
                  {subj.average !== null ? (
                    <span>{subj.teacherName ? `${subj.teacherName} : ` : ''}
                      {subj.average >= 16 ? 'Excellent' : subj.average >= 14 ? 'Très bien' : subj.average >= 12 ? 'Bien' : subj.average >= 10 ? 'Passable' : 'Faible'}
                    </span>
                  ) : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Résultats & Rangs */}
      <div className="grid grid-cols-2 gap-3 mb-3 border border-black p-2 text-[10px]">
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Total coefficients :</span>
            <span className="font-bold">{report.totalCoefficients}</span>
          </div>
          <div className="flex justify-between">
            <span>Total points obtenus :</span>
            <span className="font-bold font-mono">{report.totalWeightedScore}</span>
          </div>
          <div className="flex justify-between border-t border-black pt-1 font-bold text-xs">
            <span>MOYENNE DU TRIMESTRE :</span>
            <span className="font-mono">
              {report.generalAverage !== null ? `${Number(report.generalAverage).toFixed(2)} / 20` : 'N.C.'}
            </span>
          </div>
          <div className="flex justify-between text-neutral-600 text-[9px]">
            <span>Moyenne de classe :</span>
            <span>{classAverage ? `${classAverage} / 20` : '—'}</span>
          </div>
          {toggles.showRank && (
            <div className="flex justify-between border-t border-neutral-300 pt-0.5">
              <span>Rang de l'élève :</span>
              <span className="font-bold">{report.rank ? `${report.rank}e` : '—'}</span>
            </div>
          )}
        </div>

        <div className="border-l border-black pl-2 flex flex-col justify-between">
          {toggles.showObservations && (
            <div>
              <span className="font-bold uppercase text-[9px] block">Avis du conseil :</span>
              <p className="italic text-[9px] text-neutral-800 mt-0.5">
                « {report.appreciation || 'Travail satisfaisant.'} »
              </p>
            </div>
          )}
          {toggles.showMention && (
            <div className="text-[9px] font-bold mt-1">
              Mention : <span className="uppercase">{mention}</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Signatures Minimalistes */}
      <div className="grid grid-cols-3 gap-2 border-t border-black pt-2 text-center text-[9px]">
        <div>
          <p className="font-bold uppercase">Professeur Principal</p>
          <div className="h-12 flex items-end justify-center text-neutral-400 italic">Visa</div>
        </div>
        <div>
          <p className="font-bold uppercase">Parent d'Élève</p>
          <div className="h-12 flex items-end justify-center text-neutral-400 italic">Signature</div>
        </div>
        <div className="flex flex-col justify-between">
          <div>
            <p className="font-bold uppercase">{signatory.title || 'La Direction'}</p>
            <p className="text-[8px] text-neutral-600">{signatory.name}</p>
          </div>
          <div className="h-12 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Cachet" className="max-h-11 max-w-[100px] object-contain" />
            ) : (
              <span className="text-neutral-400 italic">Cachet & Signature</span>
            )}
          </div>
        </div>
      </div>

      {config.footerText && (
        <div className="mt-2 text-center text-[8px] text-neutral-600 font-mono border-t border-neutral-300 pt-1">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
