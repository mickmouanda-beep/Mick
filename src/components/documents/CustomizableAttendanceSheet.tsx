import React, { useEffect, useState } from 'react';
import type { DocumentTemplateConfig, DocumentFont } from '../../types/documentTemplates.ts';
import { getDefaultTemplateConfig } from '../../types/documentTemplates.ts';
import { api } from '../../lib/api.ts';

const FONT_CLASSES: Record<DocumentFont, string> = {
  inter: 'font-sans',
  roboto: 'font-sans tracking-wide',
  merriweather: 'font-serif',
  courier: 'font-mono',
};

export interface AttendanceSheetRow {
  student_id: string;
  matricule?: string;
  name: string;
  gender?: string;
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | string;
  arrival_time?: string;
  departure_time?: string;
  motif?: string;
}

interface Props {
  classNameTitle?: string;
  dateStr?: string;
  sessionTitle?: string; // e.g. "Appel du matin" or "Mathématiques (08h00 - 10h00)"
  teacherName?: string;
  rows: AttendanceSheetRow[];
  establishment?: any;
  customConfig?: DocumentTemplateConfig;
  snapshotConfig?: DocumentTemplateConfig;
}

export const CustomizableAttendanceSheet: React.FC<Props> = ({
  classNameTitle = '6ème A',
  dateStr,
  sessionTitle = 'Feuille de Présence Journalière',
  teacherName,
  rows = [],
  establishment,
  customConfig,
  snapshotConfig,
}) => {
  const [dbConfig, setDbConfig] = useState<DocumentTemplateConfig | null>(null);

  useEffect(() => {
    if (customConfig || snapshotConfig) return;
    api.getDocumentTemplate('liste_presence')
      .then((res: DocumentTemplateConfig | null) => {
        if (res) setDbConfig(res);
      })
      .catch(() => setDbConfig(getDefaultTemplateConfig('liste_presence', establishment)));
  }, [customConfig, snapshotConfig, establishment?.id]);

  const config: DocumentTemplateConfig =
    customConfig || snapshotConfig || dbConfig || getDefaultTemplateConfig('liste_presence', establishment);

  const fontClass = FONT_CLASSES[config.styling.fontFamily] || 'font-sans';
  const primaryColor = config.styling.primaryColor || '#047857';
  const secondaryColor = config.styling.secondaryColor || '#0284c7';

  const schoolName = config.schoolInfo?.name || establishment?.name || 'GROUPE SCOLAIRE D’EXCELLENCE';
  const motto = config.schoolInfo?.motto || establishment?.motto || 'Discipline - Travail - Réussite';
  const address = config.schoolInfo?.address || establishment?.address || 'Avenue de la Paix';
  const phone = config.schoolInfo?.phone || establishment?.phone || '+242 06 000 00 00';
  const logoUrl = config.schoolInfo?.logoUrl || establishment?.logo_url;

  const formattedDate = dateStr || new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const total = rows.length;
  const presentCount = rows.filter(r => r.status === 'PRESENT').length;
  const absentCount = rows.filter(r => r.status === 'ABSENT').length;
  const lateCount = rows.filter(r => r.status === 'LATE').length;

  return (
    <div
      className={`a4-document bg-white text-slate-800 ${fontClass} relative`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm 15mm 20mm 15mm',
        boxSizing: 'border-box',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: primaryColor }}>
        <div className="flex items-center space-x-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
          ) : (
            <div className="h-12 w-12 rounded border flex items-center justify-center text-xs font-bold" style={{ borderColor: primaryColor, color: primaryColor }}>
              LOGO
            </div>
          )}
          <div>
            <h1 className="text-base font-bold uppercase tracking-tight" style={{ color: primaryColor }}>{schoolName}</h1>
            <p className="text-[10px] text-slate-500 italic">{motto}</p>
            <p className="text-[10px] text-slate-500">{address} • Tél : {phone}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider" style={{ backgroundColor: primaryColor }}>
            Émargement Officiel
          </span>
          <p className="text-xs font-bold text-slate-700 mt-1 capitalize">{formattedDate}</p>
        </div>
      </div>

      {/* Title & Metadata Banner */}
      <div
        className={`p-3 rounded-lg mb-4 flex items-center justify-between ${
          config.modelId === 'moderne'
            ? 'shadow text-white'
            : config.modelId === 'institutionnel'
            ? 'border-2 border-slate-700 bg-slate-50'
            : 'border bg-slate-50'
        }`}
        style={
          config.modelId === 'moderne'
            ? { background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }
            : {}
        }
      >
        <div>
          <h2 className={`text-base font-black uppercase tracking-wide ${config.modelId === 'moderne' ? 'text-white' : 'text-slate-800'}`}>
            {sessionTitle} — Classe : {classNameTitle}
          </h2>
          {teacherName && (
            <p className={`text-xs mt-0.5 ${config.modelId === 'moderne' ? 'text-white/80' : 'text-slate-600'}`}>
              Enseignant / Surveillant : <span className="font-semibold">{teacherName}</span>
            </p>
          )}
        </div>
        <div className="flex space-x-3 text-xs font-bold">
          <span className={`px-2 py-1 rounded ${config.modelId === 'moderne' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-800'}`}>
            Présents : {presentCount}
          </span>
          <span className={`px-2 py-1 rounded ${config.modelId === 'moderne' ? 'bg-white/20' : 'bg-red-100 text-red-800'}`}>
            Absents : {absentCount}
          </span>
          <span className={`px-2 py-1 rounded ${config.modelId === 'moderne' ? 'bg-white/20' : 'bg-amber-100 text-amber-800'}`}>
            Retards : {lateCount}
          </span>
          <span className={`px-2 py-1 rounded ${config.modelId === 'moderne' ? 'bg-white/20' : 'bg-slate-200 text-slate-800'}`}>
            Total : {total}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full text-left text-xs border-collapse border border-slate-300">
        <thead>
          <tr className="text-white uppercase font-bold text-[11px]" style={{ backgroundColor: primaryColor }}>
            <th className="p-2 border border-slate-300 w-8 text-center">N°</th>
            <th className="p-2 border border-slate-300 w-24">Matricule</th>
            <th className="p-2 border border-slate-300">Nom & Prénoms de l'élève</th>
            <th className="p-2 border border-slate-300 w-24 text-center">Statut</th>
            <th className="p-2 border border-slate-300 w-16 text-center">Arrivée</th>
            <th className="p-2 border border-slate-300 w-16 text-center">Départ</th>
            <th className="p-2 border border-slate-300">Motif / Observations</th>
            <th className="p-2 border border-slate-300 w-20 text-center">Émargement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isAbsent = row.status === 'ABSENT';
            const isLate = row.status === 'LATE';
            const isPresent = row.status === 'PRESENT';

            return (
              <tr
                key={row.student_id || idx}
                className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}
              >
                <td className="p-1.5 border border-slate-300 text-center font-medium text-slate-500">{idx + 1}</td>
                <td className="p-1.5 border border-slate-300 font-mono text-[11px] text-slate-600">{row.matricule || '—'}</td>
                <td className="p-1.5 border border-slate-300 font-bold uppercase text-slate-800">{row.name}</td>
                <td className="p-1.5 border border-slate-300 text-center font-bold">
                  {isPresent && <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Présent</span>}
                  {isAbsent && <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Absent</span>}
                  {isLate && <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Retard</span>}
                  {!isPresent && !isAbsent && !isLate && <span className="text-slate-400">—</span>}
                </td>
                <td className="p-1.5 border border-slate-300 text-center font-mono text-[11px]">{row.arrival_time || '—'}</td>
                <td className="p-1.5 border border-slate-300 text-center font-mono text-[11px]">{row.departure_time || '—'}</td>
                <td className="p-1.5 border border-slate-300 text-slate-600 italic text-[11px]">{row.motif || ''}</td>
                <td className="p-1.5 border border-slate-300"></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Signature & Validation Footer */}
      <div className="mt-8 pt-4 border-t flex justify-between items-end">
        <div className="w-1/2 text-xs text-slate-600">
          <p className="font-bold text-slate-800 uppercase">Visa de la Surveillance Générale</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Date et heure de contrôle : ........................................</p>
          <div className="h-16 mt-2 border border-dashed rounded border-slate-300 p-2 text-slate-400 text-[10px]">
            Observations du Surveillant :
          </div>
        </div>

        <div className="w-60 text-center">
          <p className="text-xs font-bold uppercase text-slate-700">{config.signatory.title || 'Le Surveillant Général'}</p>
          {config.signatory.stampUrl && (
            <img src={config.signatory.stampUrl} alt="Cachet" className="h-14 mx-auto my-1 object-contain" />
          )}
          <p className="text-xs font-bold mt-6 border-t pt-1 border-slate-300 text-slate-800">
            {config.signatory.name || 'Nom & Signature'}
          </p>
        </div>
      </div>

      {config.footerText && (
        <div className="border-t pt-2 mt-4 text-center text-[10px] text-slate-400">
          {config.footerText}
        </div>
      )}
    </div>
  );
};
