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

export const BulletinClassique: React.FC<BulletinProps> = ({
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

  const primary = config.styling?.primaryColor || '#1e3a8a';
  const secondary = config.styling?.secondaryColor || '#475569';
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
      className="bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-300 max-w-3xl mx-auto text-xs"
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* 1. En-tête officiel Classique */}
      <div className="border-b-2 pb-3 mb-4" style={{ borderColor: primary }}>
        <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-600 tracking-wider mb-2 border-b border-slate-200 pb-1">
          <span>{config.headerText || 'RÉPUBLIQUE DU CONGO • UNITÉ - TRAVAIL - PROGRÈS'}</span>
          <span>ANNÉE SCOLAIRE {establishment?.academic_year || '2026-2027'}</span>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-3 flex justify-center">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt="Logo École"
                className="w-16 h-16 object-contain rounded border border-slate-200 p-1 bg-white"
              />
            ) : (
              <div
                className="w-16 h-16 rounded border flex flex-col items-center justify-center font-black text-lg text-white"
                style={{ backgroundColor: primary }}
              >
                {school.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="col-span-9 text-left space-y-0.5">
            <h2 className="text-base font-black tracking-wide uppercase" style={{ color: primary }}>
              {school.name}
            </h2>
            {school.motto && <p className="text-[10px] italic font-semibold text-slate-600">« {school.motto} »</p>}
            <p className="text-[10px] text-slate-500">
              {[school.address, school.city].filter(Boolean).join(' • ')}
              {school.phone && ` • Tél : ${school.phone}`}
            </p>
          </div>
        </div>

        <div className="mt-3 text-center py-1.5 rounded" style={{ backgroundColor: `${primary}12` }}>
          <h1 className="text-xs font-black uppercase tracking-widest" style={{ color: primary }}>
            BULLETIN OFFICIEL DE NOTES • {termLabel}
          </h1>
          <span className="text-[10px] font-mono text-slate-600">Matricule : {report.student?.matricule || 'N/A'}</span>
        </div>
      </div>

      {/* 2. Renseignements Élève & Classe */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-300 mb-4 text-[11px]">
        <div className="space-y-1">
          <p>
            <span className="font-bold text-slate-700">Nom & Prénoms : </span>
            <span className="font-bold uppercase text-slate-950">
              {report.student?.last_name} {report.student?.first_name} {report.student?.post_name || ''}
            </span>
          </p>
          <p>
            <span className="font-bold text-slate-700">Matricule : </span>
            <span className="font-mono font-bold" style={{ color: primary }}>{report.student?.matricule}</span>
          </p>
          <p>
            <span className="font-bold text-slate-700">Sexe : </span>{report.student?.gender === 'F' ? 'Féminin' : 'Masculin'} •{' '}
            <span className="font-bold text-slate-700">Né(e) le : </span>{report.student?.birth_date || '—'}
          </p>
        </div>

        <div className="space-y-1 text-right">
          <p>
            <span className="font-bold text-slate-700">Classe : </span>
            <span className="font-bold uppercase" style={{ color: primary }}>{schoolClass?.name}</span>
          </p>
          <p>
            <span className="font-bold text-slate-700">Niveau / Cycle : </span>{schoolClass?.cycle_code} • {schoolClass?.level_code}
            {schoolClass?.serie_code && ` (Série ${schoolClass?.serie_code})`}
          </p>
          <p>
            <span className="font-bold text-slate-700">Professeur Principal : </span>
            {schoolClass?.main_teacher_name || 'Direction des Études'}
          </p>
        </div>
      </div>

      {/* 3. Tableau des Matières */}
      <table className="w-full text-left border-collapse border border-slate-400 mb-4 text-[10px]">
        <thead className="text-white font-bold uppercase text-[9px]" style={{ backgroundColor: primary }}>
          <tr>
            <th className="border border-slate-400 p-2">Matières Enseignées</th>
            <th className="border border-slate-400 p-2 text-center w-16">Note /20</th>
            <th className="border border-slate-400 p-2 text-center w-12">Coef</th>
            <th className="border border-slate-400 p-2 text-center w-16">Points</th>
            {toggles.showAppreciation && <th className="border border-slate-400 p-2">Professeur & Appréciation</th>}
          </tr>
        </thead>
        <tbody>
          {(report.subjectGrades || []).map((subj: any, i: number) => (
            <tr key={subj.subjectId || i} className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
              <td className="border border-slate-400 p-2 font-semibold text-slate-900">
                {subj.subjectName} <span className="font-mono text-slate-500 text-[9px]">({subj.subjectCode})</span>
              </td>
              <td className="border border-slate-400 p-2 text-center font-bold">
                {subj.average !== null ? (
                  <span className={subj.average >= 10 ? 'text-slate-900' : 'text-rose-700'}>
                    {Number(subj.average).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">N.N.</span>
                )}
              </td>
              <td className="border border-slate-400 p-2 text-center font-semibold text-slate-700">
                {subj.coefficient}
              </td>
              <td className="border border-slate-400 p-2 text-center font-mono font-bold">
                {subj.weightedScore !== null ? Number(subj.weightedScore).toFixed(2) : '-'}
              </td>
              {toggles.showAppreciation && (
                <td className="border border-slate-400 p-2 text-slate-700 text-[9px]">
                  <span className="font-semibold block">{subj.teacherName || '-'}</span>
                  {subj.average !== null && (
                    <span>
                      {subj.average >= 16 ? 'Excellent' : subj.average >= 14 ? 'Très bien' : subj.average >= 12 ? 'Bien' : subj.average >= 10 ? 'Passable' : 'Insuffisant'}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Bilan Général & Décision */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Résumé chiffré */}
        <div className="border border-slate-400 p-3 rounded space-y-1 text-[11px] bg-slate-50">
          <div className="flex justify-between">
            <span className="font-bold text-slate-700">Total des Coefficients :</span>
            <span className="font-mono font-bold">{report.totalCoefficients}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-slate-700">Total des Points Obtenus :</span>
            <span className="font-mono font-bold">{report.totalWeightedScore}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-300 text-sm">
            <span className="font-black" style={{ color: primary }}>MOYENNE GÉNÉRALE :</span>
            <span className="font-black font-mono" style={{ color: primary }}>
              {report.generalAverage !== null ? `${Number(report.generalAverage).toFixed(2)} / 20` : 'N.C.'}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 text-[10px]">
            <span>Moyenne générale de la classe :</span>
            <span className="font-mono font-semibold">{classAverage ? `${classAverage} / 20` : '-'}</span>
          </div>
          {toggles.showRank && (
            <div className="flex justify-between pt-1 border-t border-slate-300">
              <span className="font-bold" style={{ color: primary }}>RANG DE L'ÉLÈVE :</span>
              <span className="font-black font-mono text-sm" style={{ color: primary }}>
                {report.rank ? `${report.rank}e` : '-'}
              </span>
            </div>
          )}
        </div>

        {/* Observations / Appréciation du Conseil */}
        <div className="border border-slate-400 p-3 rounded flex flex-col justify-between text-[11px] bg-slate-50">
          {toggles.showObservations && (
            <div>
              <span className="font-black uppercase text-slate-900 block mb-1">
                Appréciation Générale du Conseil :
              </span>
              <p className="italic text-slate-800 p-2 bg-white border border-slate-200 rounded font-medium text-[10px]">
                « {report.appreciation || 'Travail satisfaisant.'} »
              </p>
            </div>
          )}
          {toggles.showMention && (
            <div className="text-[10px] font-bold mt-2" style={{ color: secondary }}>
              Mention accordée : <span className="uppercase text-slate-950 font-black">{mention}</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Signatures, Cachet & Visa */}
      <div className="grid grid-cols-3 gap-2 border-t-2 pt-3 text-center text-[10px]" style={{ borderColor: primary }}>
        <div>
          <p className="font-bold uppercase text-slate-800">Le Professeur Principal</p>
          <div className="h-16 flex items-end justify-center text-[9px] text-slate-400 italic">Signature</div>
        </div>

        <div>
          <p className="font-bold uppercase text-slate-800">Le Parent ou Tuteur</p>
          <div className="h-16 flex items-end justify-center text-[9px] text-slate-400 italic">Visa & Date</div>
        </div>

        <div className="flex flex-col items-center justify-between">
          <div>
            <p className="font-bold uppercase text-slate-800">{signatory.title || 'Le Directeur des Études'}</p>
            <p className="text-[9px] font-semibold text-slate-700">{signatory.name}</p>
          </div>
          <div className="h-16 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Cachet et signature" className="max-h-14 max-w-[120px] object-contain" />
            ) : (
              <span className="text-[9px] text-slate-400 italic">Cachet Officiel & Signature</span>
            )}
          </div>
        </div>
      </div>

      {/* Pied de page libre */}
      {config.footerText && (
        <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[8px] text-slate-500 font-mono">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
