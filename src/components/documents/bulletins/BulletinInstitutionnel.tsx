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

export const BulletinInstitutionnel: React.FC<BulletinProps> = ({
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

  const primary = config.styling?.primaryColor || '#7f1d1d'; // Bordeaux Impérial
  const secondary = config.styling?.secondaryColor || '#854d0e'; // Bronze Doré
  const font = config.styling?.fontFamily || 'merriweather';
  const toggles = config.toggles || { showMention: true, showRank: true, showAppreciation: true, showObservations: true };
  const signatory = config.signatory || { name: 'Direction des Études', title: 'Le Directeur des Études', stampUrl: null };

  const mention =
    report.generalAverage >= 16 ? 'Félicitations du Jury' :
    report.generalAverage >= 14 ? 'Tableau d’Honneur' :
    report.generalAverage >= 12 ? 'Encouragements' :
    report.generalAverage >= 10 ? 'Admis(e)' : 'Avertissement de travail';

  return (
    <DocumentFontWrapper
      font={font}
      className="bg-white text-slate-950 p-8 shadow-2xl max-w-3xl mx-auto text-xs relative select-text"
      style={{
        pageBreakInside: 'avoid',
        border: `4px double ${primary}`,
      }}
    >
      {/* 1. En-tête Institutionnel Solennel */}
      <div className="text-center pb-3 mb-4 border-b-2" style={{ borderColor: secondary }}>
        <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-700 tracking-widest border-b border-slate-300 pb-1 mb-2">
          <span>{config.headerText || 'RÉPUBLIQUE DU CONGO • MINISTÈRE DE L’ENSEIGNEMENT'}</span>
          <span>ANNÉE SCOLAIRE {establishment?.academic_year || '2026-2027'}</span>
        </div>

        <div className="grid grid-cols-12 items-center gap-3 py-1">
          <div className="col-span-2 flex justify-start">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt="Blason"
                className="w-16 h-16 object-contain rounded-full border-2 p-1 bg-white shadow-xs"
                style={{ borderColor: secondary }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full border-2 flex items-center justify-center font-black text-white text-lg shadow-xs"
                style={{ backgroundColor: primary, borderColor: secondary }}
              >
                {school.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="col-span-8 text-center space-y-0.5">
            <h1 className="text-base font-black uppercase tracking-wider" style={{ color: primary }}>
              {school.name}
            </h1>
            {school.motto && (
              <p className="text-[10px] font-bold tracking-wide italic" style={{ color: secondary }}>
                « {school.motto} »
              </p>
            )}
            <p className="text-[9px] text-slate-600">
              {[school.address, school.city].filter(Boolean).join(' — ')}
              {school.phone && ` — Tél : ${school.phone}`}
            </p>
          </div>

          <div className="col-span-2 flex justify-end">
            <div
              className="w-14 h-14 rounded-full border border-dashed flex flex-col items-center justify-center text-[7px] font-black uppercase text-center leading-tight p-1"
              style={{ borderColor: secondary, color: secondary }}
            >
              <span>SCEAU</span>
              <span>OFFICIEL</span>
            </div>
          </div>
        </div>

        <div
          className="mt-2 py-1 text-white uppercase font-black text-xs tracking-widest shadow-xs rounded-xs"
          style={{ backgroundColor: primary }}
        >
          BULLETIN OFFICIEL TRIMESTRIEL DE RÉSULTATS • {termLabel}
        </div>
      </div>

      {/* 2. Renseignements Élève et Registre */}
      <div className="grid grid-cols-2 gap-4 bg-amber-50/40 p-3 rounded border border-amber-200 mb-4 text-[10px]">
        <div className="space-y-1">
          <p>
            <span className="font-bold text-slate-700">Nom & Prénoms : </span>
            <span className="font-black uppercase text-slate-950 text-xs">
              {report.student?.last_name} {report.student?.first_name} {report.student?.post_name || ''}
            </span>
          </p>
          <p>
            <span className="font-bold text-slate-700">Registre Matricule : </span>
            <span className="font-mono font-black" style={{ color: primary }}>{report.student?.matricule}</span>
          </p>
          <p>
            <span className="font-bold text-slate-700">Genre : </span>{report.student?.gender === 'F' ? 'Féminin' : 'Masculin'} •{' '}
            <span className="font-bold text-slate-700">Date de naissance : </span>{report.student?.birth_date || '—'}
          </p>
        </div>

        <div className="space-y-1 text-right">
          <p>
            <span className="font-bold text-slate-700">Division / Classe : </span>
            <span className="font-black uppercase" style={{ color: primary }}>{schoolClass?.name}</span>
          </p>
          <p>
            <span className="font-bold text-slate-700">Section Académique : </span>
            {schoolClass?.cycle_code} • {schoolClass?.level_code}
            {schoolClass?.serie_code && ` (Série ${schoolClass?.serie_code})`}
          </p>
          <p>
            <span className="font-bold text-slate-700">Responsable Pédagogique : </span>
            {schoolClass?.main_teacher_name || 'Direction des Études'}
          </p>
        </div>
      </div>

      {/* 3. Relevé des Évaluations */}
      <table className="w-full text-left border-collapse border-2 mb-4 text-[10px]" style={{ borderColor: primary }}>
        <thead className="text-white font-bold uppercase text-[9px]" style={{ backgroundColor: primary }}>
          <tr>
            <th className="border p-2" style={{ borderColor: primary }}>Disciplines Enseignées</th>
            <th className="border p-2 text-center w-16" style={{ borderColor: primary }}>Note /20</th>
            <th className="border p-2 text-center w-12" style={{ borderColor: primary }}>Coef</th>
            <th className="border p-2 text-center w-16" style={{ borderColor: primary }}>Total</th>
            {toggles.showAppreciation && <th className="border p-2" style={{ borderColor: primary }}>Avis du Professeur</th>}
          </tr>
        </thead>
        <tbody>
          {(report.subjectGrades || []).map((subj: any, i: number) => (
            <tr key={subj.subjectId || i} className={i % 2 === 1 ? 'bg-amber-50/20' : 'bg-white'}>
              <td className="border border-slate-300 p-2 font-semibold">
                {subj.subjectName} <span className="font-mono text-slate-500 text-[8px]">[{subj.subjectCode}]</span>
              </td>
              <td className="border border-slate-300 p-2 text-center font-black">
                {subj.average !== null ? (
                  <span className={subj.average >= 10 ? 'text-slate-950' : 'text-red-700'}>
                    {Number(subj.average).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">N.N.</span>
                )}
              </td>
              <td className="border border-slate-300 p-2 text-center font-bold text-slate-700">{subj.coefficient}</td>
              <td className="border border-slate-300 p-2 text-center font-mono font-bold">
                {subj.weightedScore !== null ? Number(subj.weightedScore).toFixed(2) : '-'}
              </td>
              {toggles.showAppreciation && (
                <td className="border border-slate-300 p-2 text-slate-700 text-[9px]">
                  <span className="font-semibold block">{subj.teacherName || '—'}</span>
                  {subj.average !== null && (
                    <span className="italic">
                      {subj.average >= 16 ? 'Très Honorable' : subj.average >= 14 ? 'Honorable' : subj.average >= 12 ? 'Assez Bien' : subj.average >= 10 ? 'Passable' : 'Insuffisant'}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Délibérations du Conseil */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Résumé chiffré */}
        <div className="border-2 p-3 rounded space-y-1 text-[10px] bg-amber-50/20" style={{ borderColor: primary }}>
          <div className="flex justify-between">
            <span className="font-bold">Total des Coefficients :</span>
            <span className="font-mono font-bold">{report.totalCoefficients}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Total Pondéré des Points :</span>
            <span className="font-mono font-bold">{report.totalWeightedScore}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-300 text-sm">
            <span className="font-black" style={{ color: primary }}>MOYENNE PONDÉRÉE :</span>
            <span className="font-black font-mono text-base" style={{ color: primary }}>
              {report.generalAverage !== null ? `${Number(report.generalAverage).toFixed(2)} / 20` : 'N.C.'}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 text-[9px]">
            <span>Moyenne générale de la classe :</span>
            <span className="font-mono font-bold">{classAverage ? `${classAverage} / 20` : '—'}</span>
          </div>
          {toggles.showRank && (
            <div className="flex justify-between pt-1 border-t border-slate-300">
              <span className="font-bold" style={{ color: primary }}>RANG OFFICIEL :</span>
              <span className="font-black font-mono text-sm" style={{ color: primary }}>
                {report.rank ? `${report.rank}e` : '—'}
              </span>
            </div>
          )}
        </div>

        {/* Décision solennelle */}
        <div className="border-2 p-3 rounded flex flex-col justify-between text-[10px] bg-amber-50/20" style={{ borderColor: primary }}>
          {toggles.showObservations && (
            <div>
              <span className="font-black uppercase text-slate-900 block mb-1">
                Avis & Décision du Conseil Pédagogique :
              </span>
              <p className="italic text-slate-900 p-2 bg-white border border-slate-300 rounded font-serif text-[10px]">
                « {report.appreciation || 'Travail satisfaisant.'} »
              </p>
            </div>
          )}
          {toggles.showMention && (
            <div className="text-[10px] font-bold mt-2" style={{ color: secondary }}>
              Mention solennelle : <strong className="uppercase text-slate-950 font-black">{mention}</strong>
            </div>
          )}
        </div>
      </div>

      {/* 5. Visas & Signatures d'Apparat */}
      <div className="grid grid-cols-3 gap-3 border-t-2 pt-3 text-center text-[10px]" style={{ borderColor: primary }}>
        <div className="border border-slate-300 p-2 rounded bg-white">
          <p className="font-bold uppercase text-[9px]">Le Professeur Principal</p>
          <div className="h-16 flex items-end justify-center text-[8px] text-slate-400 italic">Signature</div>
        </div>

        <div className="border border-slate-300 p-2 rounded bg-white">
          <p className="font-bold uppercase text-[9px]">Le Tuteur Légal</p>
          <div className="h-16 flex items-end justify-center text-[8px] text-slate-400 italic">Visa & Date</div>
        </div>

        <div className="border border-slate-300 p-2 rounded bg-white flex flex-col justify-between">
          <div>
            <p className="font-bold uppercase text-[9px]">{signatory.title || 'Le Directeur des Études'}</p>
            <p className="text-[8px] font-semibold text-slate-800">{signatory.name}</p>
          </div>
          <div className="h-16 flex items-center justify-center">
            {signatory.stampUrl ? (
              <img src={signatory.stampUrl} alt="Sceau & Signature" className="max-h-14 max-w-[120px] object-contain" />
            ) : (
              <span className="text-[8px] text-slate-400 italic">Cachet & Signature Officielle</span>
            )}
          </div>
        </div>
      </div>

      {/* Pied de page solennel */}
      {config.footerText && (
        <div className="mt-4 pt-2 border-t border-slate-300 text-center text-[8px] text-slate-600 font-serif">
          {config.footerText}
        </div>
      )}
    </DocumentFontWrapper>
  );
};
