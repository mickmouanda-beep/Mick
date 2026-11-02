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

export interface StudentFileDetail {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  post_name?: string | null;
  gender: 'M' | 'F';
  birth_date?: string | null;
  birth_place?: string | null;
  address?: string | null;
  photo_data?: string | null;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string | null;
  guardian_relation: string;
  class_name?: string | null;
  level_code?: string | null;
  cycle_code?: string | null;
  status?: string | null;
  student_notes?: string | null;
  academic_year?: string | null;
  admission_date?: string | null;
}

interface Props {
  student: StudentFileDetail;
  academicYear?: string;
  establishment?: any;
  customConfig?: DocumentTemplateConfig;
  snapshotConfig?: DocumentTemplateConfig;
}

export const CustomizableStudentFile: React.FC<Props> = ({
  student,
  academicYear = '2026-2027',
  establishment,
  customConfig,
  snapshotConfig,
}) => {
  const [dbConfig, setDbConfig] = useState<DocumentTemplateConfig | null>(null);

  useEffect(() => {
    if (customConfig || snapshotConfig) return;
    api.getDocumentTemplate('fiche_individuelle')
      .then((res: DocumentTemplateConfig | null) => {
        if (res) setDbConfig(res);
      })
      .catch(() => setDbConfig(getDefaultTemplateConfig('fiche_individuelle', establishment)));
  }, [customConfig, snapshotConfig, establishment?.id]);

  const config: DocumentTemplateConfig =
    customConfig || snapshotConfig || dbConfig || getDefaultTemplateConfig('fiche_individuelle', establishment);

  const fontClass = FONT_CLASSES[config.styling.fontFamily] || 'font-sans';
  const primaryColor = config.styling.primaryColor || '#1e3a8a';
  const secondaryColor = config.styling.secondaryColor || '#475569';

  const schoolName = config.schoolInfo?.name || establishment?.name || 'GROUPE SCOLAIRE D’EXCELLENCE';
  const motto = config.schoolInfo?.motto || establishment?.motto || 'Discipline - Travail - Réussite';
  const address = config.schoolInfo?.address || establishment?.address || 'Avenue des Écoles, Brazzaville';
  const phone = config.schoolInfo?.phone || establishment?.phone || '+242 06 000 00 00';
  const email = config.schoolInfo?.email || establishment?.email || 'contact@ecole.cg';
  const logoUrl = config.schoolInfo?.logoUrl || establishment?.logo_url;

  const formattedBirth = student.birth_date
    ? new Date(student.birth_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Non renseignée';

  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className={`a4-document bg-white text-slate-900 ${fontClass} relative overflow-hidden`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm 18mm 20mm 18mm',
        boxSizing: 'border-box',
        margin: '0 auto',
      }}
    >
      {/* En-tête de document officiel */}
      <div className="border-b-2 pb-3 mb-4" style={{ borderColor: primaryColor }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo École" className="w-16 h-16 object-contain rounded" />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl shadow"
                style={{ backgroundColor: primaryColor }}
              >
                {schoolName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-base font-extrabold uppercase tracking-tight" style={{ color: primaryColor }}>
                {schoolName}
              </h1>
              <p className="text-[10px] italic text-slate-600 font-medium">{motto}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {address} • Tél: {phone} • {email}
              </p>
            </div>
          </div>

          <div className="text-right border-l-2 pl-3 border-slate-200">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              {config.headerText}
            </p>
            <p className="text-[10px] font-extrabold text-slate-700 mt-1">
              Année Scolaire: <span style={{ color: primaryColor }}>{student.academic_year || academicYear}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Titre du document */}
      <div className="text-center my-4 py-2 rounded-lg" style={{ backgroundColor: `${primaryColor}10`, borderLeft: `4px solid ${primaryColor}` }}>
        <h2 className="text-lg font-black uppercase tracking-wider" style={{ color: primaryColor }}>
          Fiche Individuelle d'Identification
        </h2>
        <p className="text-[11px] font-semibold text-slate-600">
          Dossier Administratif Élève • Matricule: <span className="font-mono font-bold text-slate-900">{student.matricule}</span>
        </p>
      </div>

      {/* Bloc principal : Photo & État Civil */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* Photo Identité */}
        <div className="col-span-1 flex flex-col items-center justify-start p-2 border border-slate-300 rounded-xl bg-slate-50/50">
          <div className="w-28 h-32 rounded-lg border-2 border-dashed border-slate-400 overflow-hidden flex items-center justify-center bg-slate-200">
            {student.photo_data ? (
              <img src={student.photo_data} alt="Photo Élève" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2 text-slate-500">
                <span className="text-3xl font-black text-slate-400">
                  {student.last_name?.[0] || '?'}{student.first_name?.[0] || ''}
                </span>
                <span className="block text-[9px] font-semibold mt-1">PHOTO D'IDENTITÉ</span>
              </div>
            )}
          </div>
          <div className="mt-2 text-center">
            <span
              className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold text-white uppercase shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              {student.status || 'INSCRIT'}
            </span>
          </div>
        </div>

        {/* État Civil Détaillé */}
        <div className="col-span-3 border border-slate-300 rounded-xl p-3 bg-white space-y-2">
          <h3 className="text-xs font-extrabold uppercase border-b pb-1 flex items-center justify-between" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>
            <span>1. État Civil & Identité</span>
            <span className="text-[10px] font-normal text-slate-500">Sexe: <strong>{student.gender === 'F' ? 'Féminin (F)' : 'Masculin (M)'}</strong></span>
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Nom de famille</span>
              <span className="font-extrabold text-sm text-slate-900 tracking-wide uppercase">{student.last_name}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Prénom(s) & Postnom</span>
              <span className="font-bold text-sm text-slate-800">{student.first_name} {student.post_name || ''}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Date de Naissance</span>
              <span className="font-semibold text-slate-800">{formattedBirth}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Lieu de Naissance</span>
              <span className="font-semibold text-slate-800">{student.birth_place || 'Brazzaville'}</span>
            </div>
          </div>

          <div className="text-xs pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Adresse de Résidence</span>
            <span className="font-medium text-slate-800">{student.address || 'Non renseignée'}</span>
          </div>
        </div>
      </div>

      {/* Bloc Scolarité & Affectation */}
      <div className="border border-slate-300 rounded-xl p-3 bg-white mb-4 space-y-2">
        <h3 className="text-xs font-extrabold uppercase border-b pb-1" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>
          2. Cursus & Affectation Pédagogique
        </h3>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Classe / Section</span>
            <span className="font-black text-sm" style={{ color: primaryColor }}>
              {student.class_name || 'Non affecté'}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Niveau & Cycle</span>
            <span className="font-bold text-slate-800">
              {student.level_code || '—'} {student.cycle_code ? `(${student.cycle_code})` : ''}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Matricule Élève</span>
            <span className="font-mono font-bold text-slate-900">{student.matricule}</span>
          </div>
        </div>
      </div>

      {/* Bloc Responsable Légal / Tuteur */}
      <div className="border border-slate-300 rounded-xl p-3 bg-white mb-4 space-y-2">
        <h3 className="text-xs font-extrabold uppercase border-b pb-1" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>
          3. Responsable Légal & Contacts d'Urgence
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Nom du Parent / Tuteur</span>
            <span className="font-bold text-sm text-slate-900">{student.guardian_name || 'Non renseigné'}</span>
            <span className="text-[10px] italic text-slate-500 block">Lien: {student.guardian_relation || 'Parent'}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Téléphone Principal</span>
            <span className="font-mono font-bold text-sm text-slate-900">{student.guardian_phone || 'Non renseigné'}</span>
            {student.guardian_email && (
              <span className="text-[10px] text-slate-600 block">Email: {student.guardian_email}</span>
            )}
          </div>
        </div>
      </div>

      {/* Remarques / Santé / Observations */}
      {config.toggles.showObservations && (
        <div className="border border-slate-300 rounded-xl p-3 bg-white mb-4">
          <h3 className="text-xs font-extrabold uppercase border-b pb-1 mb-1" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>
            4. Remarques & Particularités Médicales
          </h3>
          <p className="text-xs text-slate-700 italic">
            {student.student_notes || 'Aucune observation particulière ou médicale signalée à ce jour.'}
          </p>
        </div>
      )}

      {/* Bloc Validation & Signature */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-2 border-t-2 border-slate-200">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500">Fait à {establishment?.city || 'Brazzaville'}, le {todayFormatted}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            Fiche certifiée exacte et enregistrée dans le registre d'immatriculation officiel de l'établissement.
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <p className="text-xs font-extrabold uppercase" style={{ color: primaryColor }}>
            {config.signatory.title || "Le Chef d'Établissement"}
          </p>
          <p className="text-[11px] font-bold text-slate-800 mt-0.5">
            {config.signatory.name || "La Direction"}
          </p>

          <div className="w-36 h-20 mt-2 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center relative overflow-hidden bg-slate-50">
            {config.signatory.stampUrl ? (
              <img src={config.signatory.stampUrl} alt="Cachet et Signature" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-[9px] text-slate-400 italic text-center p-1">Sceau & Signature Officiels</span>
            )}
          </div>
        </div>
      </div>

      {/* Pied de page */}
      <div className="absolute bottom-4 left-18 right-18 text-center text-[9px] text-slate-400 border-t pt-2 border-slate-200">
        {config.footerText}
      </div>
    </div>
  );
};
