import React from 'react';
import { SchoolClass, Establishment } from '../types.ts';

interface PrintableReportCardProps {
  report: any;
  establishment: Establishment;
  schoolClass: SchoolClass;
  term: string;
  classAverage?: number | null;
}

export const PrintableReportCard: React.FC<PrintableReportCardProps> = ({
  report,
  establishment,
  schoolClass,
  term,
  classAverage,
}) => {
  const termLabel =
    term === 'TRIMESTRE_1' ? 'PREMIER TRIMESTRE' : term === 'TRIMESTRE_2' ? 'DEUXIÈME TRIMESTRE' : 'TROISIÈME TRIMESTRE';

  return (
    <div className="bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-300 max-w-3xl mx-auto printable-document font-sans text-xs">
      
      {/* En-tête Officiel Congo */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-start text-[10px] leading-tight">
          <div className="text-center font-bold">
            <p className="uppercase">RÉPUBLIQUE DU CONGO</p>
            <p className="italic text-[9px] font-normal">Unité - Travail - Progrès</p>
            <p className="mt-1 font-semibold">MINISTÈRE DE L'ENSEIGNEMENT</p>
            <p>PRIMAIRE, SECONDAIRE & TECHNIQUE</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 border-2 border-slate-900 rounded-full mx-auto flex items-center justify-center font-black text-sm mb-1">
              FSM
            </div>
            <p className="font-bold text-[9px] uppercase">{establishment.motto || 'Discipline - Travail - Succès'}</p>
          </div>

          <div className="text-right">
            <p className="font-black text-sm uppercase text-indigo-950">{establishment.name}</p>
            <p className="font-medium text-slate-700">{establishment.city || 'Brazzaville'} • {establishment.country}</p>
            <p className="font-mono text-[9px]">Année Scolaire : {establishment.academic_year}</p>
          </div>
        </div>

        <div className="mt-3 text-center bg-slate-900 text-white py-1.5 uppercase font-black text-sm tracking-wider rounded">
          BULLETIN OFFICIEL DE NOTES • {termLabel}
        </div>
      </div>

      {/* Renseignements Élève & Classe */}
      <div className="grid grid-cols-2 gap-4 bg-slate-100 p-3 rounded border border-slate-300 mb-4 text-[11px]">
        <div className="space-y-1">
          <p>
            <span className="font-bold">Nom & Prénoms : </span>
            <span className="font-bold text-slate-950 uppercase">{report.student.last_name}</span> {report.student.first_name} {report.student.post_name || ''}
          </p>
          <p>
            <span className="font-bold">Numéro Matricule : </span>
            <span className="font-mono font-bold text-indigo-900">{report.student.matricule}</span>
          </p>
          <p>
            <span className="font-bold">Sexe : </span>{report.student.gender === 'F' ? 'Féminin' : 'Masculin'} •{' '}
            <span className="font-bold">Né(e) le : </span>{report.student.birth_date}
          </p>
        </div>

        <div className="space-y-1 text-right">
          <p>
            <span className="font-bold">Classe : </span>
            <span className="font-bold text-indigo-950">{schoolClass.name}</span>
          </p>
          <p>
            <span className="font-bold">Cycle / Niveau : </span>{schoolClass.cycle_code} • {schoolClass.level_code}
            {schoolClass.serie_code && ` (Série ${schoolClass.serie_code})`}
          </p>
          <p>
            <span className="font-bold">Professeur Principal : </span>
            {schoolClass.main_teacher_name || 'Direction des Études'}
          </p>
        </div>
      </div>

      {/* Tableau des Matières */}
      <table className="w-full text-left border-collapse border border-slate-400 mb-4 text-[10px]">
        <thead className="bg-slate-200 text-slate-900 font-bold uppercase text-[9px]">
          <tr>
            <th className="border border-slate-400 p-2">Matières Enseignées</th>
            <th className="border border-slate-400 p-2 text-center w-16">Note /20</th>
            <th className="border border-slate-400 p-2 text-center w-12">Coef</th>
            <th className="border border-slate-400 p-2 text-center w-16">Points</th>
            <th className="border border-slate-400 p-2">Professeur & Appréciations</th>
          </tr>
        </thead>
        <tbody>
          {report.subjectGrades.map((subj: any) => (
            <tr key={subj.subjectId} className="border-b border-slate-300">
              <td className="border border-slate-400 p-2 font-semibold">
                {subj.subjectName} <span className="font-mono text-slate-500 text-[9px]">({subj.subjectCode})</span>
              </td>
              <td className="border border-slate-400 p-2 text-center font-bold">
                {subj.average !== null ? (
                  <span className={subj.average >= 10 ? 'text-slate-900' : 'text-rose-700'}>
                    {subj.average.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">N.N.</span>
                )}
              </td>
              <td className="border border-slate-400 p-2 text-center font-semibold text-slate-700">
                {subj.coefficient}
              </td>
              <td className="border border-slate-400 p-2 text-center font-mono font-bold">
                {subj.weightedScore !== null ? subj.weightedScore.toFixed(2) : '-'}
              </td>
              <td className="border border-slate-400 p-2 text-slate-700 text-[9px]">
                <span className="font-semibold block">{subj.teacherName || '-'}</span>
                {subj.average !== null && (
                  <span>
                    {subj.average >= 16 ? 'Excellent' : subj.average >= 14 ? 'Très bien' : subj.average >= 12 ? 'Bien' : subj.average >= 10 ? 'Passable' : 'Insuffisant'}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bilan Général & Statistiques */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        
        {/* Résumé Chiffré */}
        <div className="border border-slate-400 p-3 rounded space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="font-bold">Total des Coefficients :</span>
            <span className="font-mono font-bold">{report.totalCoefficients}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Total des Points Obtenus :</span>
            <span className="font-mono font-bold">{report.totalWeightedScore}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-300 text-sm">
            <span className="font-black text-indigo-950">MOYENNE GÉNÉRALE :</span>
            <span className="font-black text-indigo-950 font-mono">
              {report.generalAverage !== null ? `${report.generalAverage.toFixed(2)} / 20` : 'N.C.'}
            </span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Moyenne générale de la classe :</span>
            <span className="font-mono font-semibold">{classAverage ? `${classAverage} / 20` : '-'}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-300">
            <span className="font-bold text-indigo-950">RANG DE L'ÉLÈVE :</span>
            <span className="font-black text-indigo-950 font-mono text-sm">
              {report.rank ? `${report.rank}e` : '-'}
            </span>
          </div>
        </div>

        {/* Décision du Conseil */}
        <div className="border border-slate-400 p-3 rounded flex flex-col justify-between text-[11px]">
          <div>
            <span className="font-black uppercase text-slate-900 block mb-1">
              Appréciation Générale du Conseil des Professeurs :
            </span>
            <p className="italic text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded font-medium">
              « {report.appreciation} »
            </p>
          </div>
          <div className="text-[9px] text-slate-600 mt-2">
            Mention : {report.generalAverage >= 14 ? 'Tableau d’Honneur' : report.generalAverage >= 12 ? 'Encouragements' : report.generalAverage >= 10 ? 'Admis(e)' : 'Avertissement de travail'}
          </div>
        </div>

      </div>

      {/* Visas & Signatures */}
      <div className="grid grid-cols-3 gap-2 border-t-2 border-slate-900 pt-4 text-center text-[10px]">
        <div>
          <p className="font-bold uppercase">Le Professeur Principal</p>
          <div className="h-14 flex items-end justify-center text-[9px] text-slate-400 italic">Signature</div>
        </div>

        <div>
          <p className="font-bold uppercase">Le Parent ou Tuteur</p>
          <div className="h-14 flex items-end justify-center text-[9px] text-slate-400 italic">Visa & Date</div>
        </div>

        <div>
          <p className="font-bold uppercase">Le Directeur des Études</p>
          <div className="h-14 flex items-end justify-center text-[9px] text-slate-400 italic">
            Cachet Officiel & Signature
          </div>
        </div>
      </div>

    </div>
  );
};
