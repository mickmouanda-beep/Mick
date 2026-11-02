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

export interface SchoolCertificateStudent {
  id: string;
  first_name: string;
  last_name: string;
  matricule?: string;
  gender?: string;
  birth_date?: string;
  birth_place?: string;
  nationality?: string;
  class_name?: string;
  academic_year?: string;
  regime?: string;
  parent_name?: string;
}

interface Props {
  student: SchoolCertificateStudent;
  academicYear?: string;
  establishment?: any;
  customConfig?: DocumentTemplateConfig;
  snapshotConfig?: DocumentTemplateConfig;
}

export const CustomizableSchoolCertificate: React.FC<Props> = ({
  student,
  academicYear = '2026-2027',
  establishment,
  customConfig,
  snapshotConfig,
}) => {
  const [dbConfig, setDbConfig] = useState<DocumentTemplateConfig | null>(null);

  useEffect(() => {
    if (customConfig || snapshotConfig) return;
    api.getDocumentTemplate('certificat_scolarite')
      .then((res: DocumentTemplateConfig | null) => {
        if (res) setDbConfig(res);
      })
      .catch(() => setDbConfig(getDefaultTemplateConfig('certificat_scolarite', establishment)));
  }, [customConfig, snapshotConfig, establishment?.id]);

  const config: DocumentTemplateConfig =
    customConfig || snapshotConfig || dbConfig || getDefaultTemplateConfig('certificat_scolarite', establishment);

  const fontClass = FONT_CLASSES[config.styling.fontFamily] || 'font-serif';
  const primaryColor = config.styling.primaryColor || '#1e3a8a';
  const secondaryColor = config.styling.secondaryColor || '#d97706';

  const schoolName = config.schoolInfo?.name || establishment?.name || 'GROUPE SCOLAIRE D’EXCELLENCE';
  const motto = config.schoolInfo?.motto || establishment?.motto || 'Discipline - Travail - Réussite';
  const address = config.schoolInfo?.address || establishment?.address || 'Avenue de la Paix, B.P. 1024';
  const phone = config.schoolInfo?.phone || establishment?.phone || '+242 06 000 00 00';
  const email = config.schoolInfo?.email || establishment?.email || 'contact@ecole.cg';
  const logoUrl = config.schoolInfo?.logoUrl || establishment?.logo_url;

  const formattedBirth = student.birth_date
    ? new Date(student.birth_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '........................';
  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Renders the specific layout model
  return (
    <div
      className={`a4-document bg-white text-slate-800 ${fontClass} relative overflow-hidden`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm 20mm 25mm 20mm',
        boxSizing: 'border-box',
        margin: '0 auto',
      }}
    >
      {config.modelId === 'moderne' && (
        <CertificateModerne
          student={student}
          academicYear={academicYear}
          config={config}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          schoolName={schoolName}
          motto={motto}
          address={address}
          phone={phone}
          email={email}
          logoUrl={logoUrl}
          formattedBirth={formattedBirth}
          todayFormatted={todayFormatted}
        />
      )}

      {config.modelId === 'sobre' && (
        <CertificateSobre
          student={student}
          academicYear={academicYear}
          config={config}
          primaryColor={primaryColor}
          schoolName={schoolName}
          motto={motto}
          address={address}
          phone={phone}
          email={email}
          logoUrl={logoUrl}
          formattedBirth={formattedBirth}
          todayFormatted={todayFormatted}
        />
      )}

      {config.modelId === 'institutionnel' && (
        <CertificateInstitutionnel
          student={student}
          academicYear={academicYear}
          config={config}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          schoolName={schoolName}
          motto={motto}
          address={address}
          phone={phone}
          email={email}
          logoUrl={logoUrl}
          formattedBirth={formattedBirth}
          todayFormatted={todayFormatted}
        />
      )}

      {config.modelId === 'elegant' && (
        <CertificateElegant
          student={student}
          academicYear={academicYear}
          config={config}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          schoolName={schoolName}
          motto={motto}
          address={address}
          phone={phone}
          email={email}
          logoUrl={logoUrl}
          formattedBirth={formattedBirth}
          todayFormatted={todayFormatted}
        />
      )}

      {config.modelId === 'compact' && (
        <CertificateCompact
          student={student}
          academicYear={academicYear}
          config={config}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          schoolName={schoolName}
          motto={motto}
          address={address}
          phone={phone}
          email={email}
          logoUrl={logoUrl}
          formattedBirth={formattedBirth}
          todayFormatted={todayFormatted}
        />
      )}

      {(config.modelId === 'classique' || !['moderne', 'sobre', 'institutionnel', 'elegant', 'compact'].includes(config.modelId)) && (
        <CertificateClassique
          student={student}
          academicYear={academicYear}
          config={config}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          schoolName={schoolName}
          motto={motto}
          address={address}
          phone={phone}
          email={email}
          logoUrl={logoUrl}
          formattedBirth={formattedBirth}
          todayFormatted={todayFormatted}
        />
      )}
    </div>
  );
};

/* --- 1. CLASSIQUE (Officiel Académique Symétrique) --- */
const CertificateClassique: React.FC<any> = ({
  student, academicYear, config, primaryColor, schoolName, motto, address, phone, email, logoUrl, formattedBirth, todayFormatted
}) => (
  <div className="flex flex-col h-full justify-between">
    <div>
      <div className="border-b-2 pb-4 mb-6" style={{ borderColor: primaryColor }}>
        <div className="flex items-center justify-between">
          <div className="w-2/3">
            <h1 className="text-xl font-bold tracking-tight uppercase" style={{ color: primaryColor }}>{schoolName}</h1>
            <p className="text-xs italic text-slate-500 mt-0.5">{motto}</p>
            <p className="text-xs text-slate-600 mt-1">{address} • Tél : {phone} • {email}</p>
          </div>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
          ) : (
            <div className="h-14 w-14 rounded border flex items-center justify-center font-bold text-xs" style={{ borderColor: primaryColor, color: primaryColor }}>
              LOGO
            </div>
          )}
        </div>
        {config.headerText && <div className="text-center text-xs text-slate-500 mt-2 font-medium tracking-wide">{config.headerText}</div>}
      </div>

      <div className="text-center my-8">
        <h2 className="text-2xl font-bold uppercase tracking-widest inline-block border-b-2 pb-1" style={{ color: primaryColor, borderColor: primaryColor }}>
          CERTIFICAT DE SCOLARITÉ
        </h2>
        <p className="text-sm font-semibold text-slate-600 mt-2">Année Scolaire {academicYear}</p>
      </div>

      <div className="text-base leading-relaxed text-slate-800 space-y-6 mt-8">
        <p>
          Le soussigné, <strong>{config.signatory.name || 'Le Chef d’Établissement'}</strong>, agissant en qualité de <strong>{config.signatory.title || 'Directeur Général'}</strong> de l'établissement susmentionné, certifie par la présente que :
        </p>

        <div className="bg-slate-50 border p-5 rounded-md space-y-2.5">
          <p>L’élève : <strong className="text-lg uppercase" style={{ color: primaryColor }}>{student.last_name} {student.first_name}</strong></p>
          <p>Matricule : <strong>{student.matricule || 'N/A'}</strong></p>
          <p>Né(e) le : <strong>{formattedBirth}</strong> {student.birth_place ? `à ${student.birth_place}` : ''}</p>
          {student.parent_name && <p>Fils/Fille de : <strong>{student.parent_name}</strong></p>}
          <p>Est régulièrement inscrit(e) et fréquente la classe de : <strong className="text-base" style={{ color: primaryColor }}>{student.class_name || 'Non assignée'}</strong></p>
        </div>

        <p className="pt-2 text-justify">
          En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit, auprès de toutes administrations ou organismes compétents.
        </p>
      </div>
    </div>

    <div className="mt-12">
      <div className="flex justify-between items-end">
        <div className="text-xs text-slate-500">
          <p>Fait pour valoir de droit.</p>
          <p className="mt-1">Délivré le : {todayFormatted}</p>
        </div>
        <div className="text-center w-64">
          <p className="text-xs text-slate-500">Fait le {todayFormatted}</p>
          <p className="text-sm font-bold uppercase mt-1" style={{ color: primaryColor }}>{config.signatory.title || 'Le Directeur'}</p>
          {config.signatory.stampUrl && (
            <img src={config.signatory.stampUrl} alt="Cachet" className="h-20 mx-auto my-2 object-contain" />
          )}
          <p className="font-semibold text-sm mt-8 border-t pt-1 border-slate-300">{config.signatory.name || 'La Direction'}</p>
        </div>
      </div>

      {config.footerText && (
        <div className="border-t pt-2 mt-8 text-center text-xs text-slate-400">
          {config.footerText}
        </div>
      )}
    </div>
  </div>
);

/* --- 2. MODERNE (Arrondis, Cartes Flottantes, Dégradés) --- */
const CertificateModerne: React.FC<any> = ({
  student, academicYear, config, primaryColor, secondaryColor, schoolName, motto, address, phone, email, logoUrl, formattedBirth, todayFormatted
}) => (
  <div className="flex flex-col h-full justify-between">
    <div>
      <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] tracking-widest font-semibold uppercase bg-white/20 px-3 py-1 rounded-full">Attestation Officielle</span>
            <h1 className="text-2xl font-bold tracking-tight mt-2">{schoolName}</h1>
            <p className="text-xs text-white/80 italic mt-0.5">{motto}</p>
          </div>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-16 w-16 bg-white rounded-xl p-1 shadow" />
          ) : (
            <div className="h-14 w-14 bg-white/10 rounded-xl border border-white/30 flex items-center justify-center font-bold text-xs">
              LOGO
            </div>
          )}
        </div>
      </div>

      <div className="text-center my-8">
        <h2 className="text-3xl font-extrabold uppercase tracking-tight" style={{ color: primaryColor }}>
          Certificat de Scolarité
        </h2>
        <span className="inline-block mt-2 px-4 py-1 rounded-full text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: secondaryColor }}>
          Session {academicYear}
        </span>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4 text-sm leading-relaxed text-slate-700">
        <p>
          La direction du <strong>{schoolName}</strong> atteste par ce document que l'élève désigné(e) ci-après est assidu(e) et régulièrement scolarisé(e) au sein de notre établissement :
        </p>

        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-100">
          <div>
            <p className="text-xs text-slate-400 font-medium">Nom complet de l'élève</p>
            <p className="text-base font-bold text-slate-800 uppercase">{student.last_name} {student.first_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Matricule scolaire</p>
            <p className="text-base font-bold" style={{ color: primaryColor }}>{student.matricule || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Date & Lieu de naissance</p>
            <p className="text-sm font-semibold text-slate-800">{formattedBirth} {student.birth_place ? `à ${student.birth_place}` : ''}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Classe & Niveau</p>
            <p className="text-base font-bold" style={{ color: secondaryColor }}>{student.class_name || 'Non assignée'}</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 pt-2">
          Le présent certificat est délivré à l’intéressé(e) pour faire valoir auprès des autorités scolaires, administratives ou de prévoyance sociale.
        </p>
      </div>
    </div>

    <div className="mt-8">
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border">
        <div className="text-xs text-slate-500">
          <p>{address}</p>
          <p>{phone} • {email}</p>
          <p className="mt-1 font-medium">Fait le : {todayFormatted}</p>
        </div>
        <div className="text-center w-56">
          <p className="text-xs font-semibold text-slate-500">{config.signatory.title || 'Direction Générale'}</p>
          {config.signatory.stampUrl && (
            <img src={config.signatory.stampUrl} alt="Cachet" className="h-16 mx-auto my-1 object-contain" />
          )}
          <p className="font-bold text-sm" style={{ color: primaryColor }}>{config.signatory.name || 'La Direction'}</p>
        </div>
      </div>
    </div>
  </div>
);

/* --- 3. SOBRE (Lignes Fines 1px, Monochrome Minimaliste) --- */
const CertificateSobre: React.FC<any> = ({
  student, academicYear, config, schoolName, address, phone, email, formattedBirth, todayFormatted
}) => (
  <div className="flex flex-col h-full justify-between font-sans">
    <div>
      <div className="border-b border-black pb-3 mb-8">
        <h1 className="text-base font-bold uppercase tracking-wider text-black">{schoolName}</h1>
        <p className="text-[11px] text-neutral-600">{address} — Tél : {phone} — {email}</p>
      </div>

      <div className="my-6">
        <h2 className="text-xl font-bold uppercase tracking-wide text-black">
          CERTIFICAT DE SCOLARITÉ
        </h2>
        <p className="text-xs text-neutral-500 mt-1 uppercase">ANNÉE ACADÉMIQUE {academicYear}</p>
      </div>

      <div className="text-sm leading-relaxed space-y-5 text-neutral-800 mt-8 border-t border-b border-black py-6">
        <p>
          Je soussigné, représentant de la direction de l'établissement, certifie que l'élève ci-dessous est régulièrement inscrit(e) et poursuit ses études pour l'année scolaire <strong>{academicYear}</strong> :
        </p>

        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div>
            <span className="text-neutral-500 text-xs block">NOM ET PRÉNOMS</span>
            <span className="font-bold text-black uppercase">{student.last_name} {student.first_name}</span>
          </div>
          <div>
            <span className="text-neutral-500 text-xs block">MATRICULE</span>
            <span className="font-bold text-black">{student.matricule || '—'}</span>
          </div>
          <div>
            <span className="text-neutral-500 text-xs block">DATE DE NAISSANCE</span>
            <span className="font-medium">{formattedBirth}</span>
          </div>
          <div>
            <span className="text-neutral-500 text-xs block">CLASSE FRÉQUENTÉE</span>
            <span className="font-bold text-black">{student.class_name || '—'}</span>
          </div>
        </div>

        <p className="text-xs text-neutral-600 pt-3">
          Document officiel délivré pour faire valoir ce que de droit.
        </p>
      </div>
    </div>

    <div className="mt-12 flex justify-between items-end border-t border-black pt-4">
      <div className="text-xs text-neutral-500">
        <p>Délivré le {todayFormatted}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-neutral-600 uppercase font-semibold">{config.signatory.title || 'Le Directeur'}</p>
        <p className="text-sm font-bold mt-8 text-black">{config.signatory.name || 'La Direction'}</p>
      </div>
    </div>
  </div>
);

/* --- 4. INSTITUTIONNEL (Double Bordure, Sceau d'État, Ruban) --- */
const CertificateInstitutionnel: React.FC<any> = ({
  student, academicYear, config, primaryColor, secondaryColor, schoolName, motto, address, phone, email, logoUrl, formattedBirth, todayFormatted
}) => (
  <div className="flex flex-col h-full justify-between border-4 p-8 relative" style={{ borderColor: primaryColor }}>
    {/* Inner decorative border */}
    <div className="absolute inset-2 border border-slate-300 pointer-events-none" />

    <div>
      <div className="text-center pb-6 border-b-2" style={{ borderColor: secondaryColor }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">RÉPUBLIQUE • MINISTÈRE DE L'ENSEIGNEMENT</p>
        <h1 className="text-2xl font-black uppercase tracking-wider mt-1" style={{ color: primaryColor }}>{schoolName}</h1>
        <p className="text-xs italic text-slate-600 mt-1">« {motto} »</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{address} • Tél: {phone} • {email}</p>
      </div>

      <div className="text-center my-8">
        <div className="inline-block px-8 py-2 border-2 border-double rounded" style={{ borderColor: primaryColor, backgroundColor: '#f8fafc' }}>
          <h2 className="text-2xl font-black uppercase tracking-widest" style={{ color: primaryColor }}>
            CERTIFICAT DE SCOLARITÉ
          </h2>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-2">SESSION OFFICIELLE {academicYear}</p>
      </div>

      <div className="text-sm leading-relaxed space-y-6 text-slate-800 px-4">
        <p className="text-justify indent-8">
          Le Directeur de l'établissement d'enseignement général certifie par le présent acte authentique que l'élève dont l'état civil suit est inscrit(e) sur le registre matricule officiel de l'établissement :
        </p>

        <div className="border border-slate-400 p-4 space-y-2.5 bg-slate-50/50">
          <div className="flex justify-between border-b pb-1 border-slate-200">
            <span className="font-semibold text-slate-600">Nom & Prénoms :</span>
            <span className="font-bold uppercase text-base" style={{ color: primaryColor }}>{student.last_name} {student.first_name}</span>
          </div>
          <div className="flex justify-between border-b pb-1 border-slate-200">
            <span className="font-semibold text-slate-600">Identifiant Unique (Matricule) :</span>
            <span className="font-mono font-bold">{student.matricule || 'NON RENSEIGNÉ'}</span>
          </div>
          <div className="flex justify-between border-b pb-1 border-slate-200">
            <span className="font-semibold text-slate-600">Date et lieu de naissance :</span>
            <span>{formattedBirth} {student.birth_place ? `à ${student.birth_place}` : ''}</span>
          </div>
          <div className="flex justify-between border-b pb-1 border-slate-200">
            <span className="font-semibold text-slate-600">Classe suivie :</span>
            <span className="font-bold" style={{ color: secondaryColor }}>{student.class_name || 'En cours d’affectation'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-600">Statut scolaire :</span>
            <span className="font-bold text-emerald-700">RÉGULIER & ASSIDU</span>
          </div>
        </div>

        <p className="text-justify indent-8 text-xs text-slate-600">
          Le présent certificat est délivré sous la foi du serment professionnel pour valoir auprès des autorités compétentes ce que de droit.
        </p>
      </div>
    </div>

    <div className="mt-8 px-4">
      <div className="flex justify-between items-end">
        <div className="text-xs text-slate-500">
          <p>Enregistré au registre des certificats.</p>
          <p>Fait à Brazzaville, le {todayFormatted}</p>
        </div>
        <div className="text-center w-64 border-t-2 pt-2" style={{ borderColor: primaryColor }}>
          <p className="text-xs uppercase font-bold text-slate-600">{config.signatory.title || 'Le Directeur des Études'}</p>
          {config.signatory.stampUrl && (
            <img src={config.signatory.stampUrl} alt="Cachet et signature" className="h-20 mx-auto my-2 object-contain" />
          )}
          <p className="font-bold text-sm mt-6" style={{ color: primaryColor }}>{config.signatory.name || 'Direction Générale'}</p>
        </div>
      </div>
    </div>
  </div>
);

/* --- 5. ELEGANT (Diplôme de Prestige, Cadre Ornemental) --- */
const CertificateElegant: React.FC<any> = ({
  student, academicYear, config, primaryColor, secondaryColor, schoolName, motto, address, phone, formattedBirth, todayFormatted, logoUrl
}) => (
  <div className="flex flex-col h-full justify-between border-8 p-8 relative bg-amber-50/20" style={{ borderColor: primaryColor }}>
    <div className="text-center">
      {logoUrl && <img src={logoUrl} alt="Logo" className="h-16 mx-auto mb-2 object-contain" />}
      <h1 className="text-3xl font-serif font-black tracking-widest uppercase" style={{ color: primaryColor }}>{schoolName}</h1>
      <p className="text-xs italic tracking-widest text-slate-500 mt-1">« {motto} »</p>
      <div className="w-32 h-0.5 mx-auto my-4" style={{ backgroundColor: secondaryColor }} />
      <h2 className="text-2xl font-serif font-bold uppercase tracking-widest mt-2" style={{ color: secondaryColor }}>
        Certificat de Fréquentation & Scolarité
      </h2>
      <p className="text-xs font-semibold text-slate-600 mt-1">Année académique {academicYear}</p>
    </div>

    <div className="text-base font-serif leading-loose text-slate-800 text-center px-8 my-6">
      <p className="italic">Nous attestons avec honneur que</p>
      <p className="text-2xl font-bold uppercase my-3 tracking-wider underline decoration-1" style={{ color: primaryColor }}>
        {student.last_name} {student.first_name}
      </p>
      <p className="text-sm text-slate-600">
        Né(e) le {formattedBirth} {student.birth_place ? `à ${student.birth_place}` : ''}
        <br />
        Porteur(se) du matricule : <span className="font-mono font-bold text-slate-800">{student.matricule || 'N/A'}</span>
      </p>

      <p className="mt-4">
        Suit avec régularité l'ensemble des enseignements dispensés au sein de la classe de
      </p>
      <p className="text-xl font-bold uppercase mt-1 tracking-wide" style={{ color: secondaryColor }}>
        {student.class_name || 'Classe non assignée'}
      </p>
    </div>

    <div className="flex justify-between items-end border-t pt-4 px-6" style={{ borderColor: secondaryColor }}>
      <div className="text-xs text-slate-500">
        <p>{address}</p>
        <p>Tél : {phone}</p>
        <p className="mt-1 italic">Délivré en séance solennelle le {todayFormatted}</p>
      </div>
      <div className="text-center w-60">
        <p className="text-xs uppercase font-serif tracking-wider font-bold" style={{ color: primaryColor }}>
          {config.signatory.title || 'Le Recteur / Directeur'}
        </p>
        {config.signatory.stampUrl && (
          <img src={config.signatory.stampUrl} alt="Sceau" className="h-16 mx-auto my-1 object-contain" />
        )}
        <p className="font-serif font-bold text-sm mt-4">{config.signatory.name || 'Direction de l’Établissement'}</p>
      </div>
    </div>
  </div>
);

/* --- 6. COMPACT (Architecture Bi-colonne Haute Densité) --- */
const CertificateCompact: React.FC<any> = ({
  student, academicYear, config, primaryColor, secondaryColor, schoolName, motto, address, phone, email, formattedBirth, todayFormatted, logoUrl
}) => (
  <div className="flex flex-col h-full justify-between text-xs font-sans">
    <div>
      <div className="flex items-center justify-between border-b-2 pb-3 mb-4" style={{ borderColor: primaryColor }}>
        <div className="flex items-center space-x-3">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain" />}
          <div>
            <h1 className="text-base font-bold uppercase" style={{ color: primaryColor }}>{schoolName}</h1>
            <p className="text-[10px] text-slate-500">{motto}</p>
          </div>
        </div>
        <div className="text-right text-[10px] text-slate-500">
          <p>{address}</p>
          <p>{phone} • {email}</p>
        </div>
      </div>

      <div className="bg-slate-100 p-2.5 rounded flex justify-between items-center mb-6">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500">Document Certifié</span>
          <h2 className="text-base font-black uppercase" style={{ color: primaryColor }}>Certificat de Scolarité</h2>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-white px-2 py-1 rounded" style={{ backgroundColor: secondaryColor }}>
            Année {academicYear}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
        <div className="space-y-2 border-r pr-4">
          <h3 className="font-bold uppercase text-[11px] text-slate-400">Identité de l'élève</h3>
          <p className="text-sm font-bold text-slate-900 uppercase">{student.last_name} {student.first_name}</p>
          <p>Matricule : <span className="font-mono font-bold">{student.matricule || 'N/A'}</span></p>
          <p>Né(e) le : <span>{formattedBirth}</span></p>
          {student.birth_place && <p>Lieu : <span>{student.birth_place}</span></p>}
        </div>

        <div className="space-y-2">
          <h3 className="font-bold uppercase text-[11px] text-slate-400">Inscription & Cursus</h3>
          <p className="text-sm font-bold" style={{ color: primaryColor }}>Classe : {student.class_name || 'N/A'}</p>
          <p>Régime : <span>{student.regime || 'Externe'}</span></p>
          <p>Situation : <span className="font-bold text-emerald-600">Inscrit & Fréquentant</span></p>
          <p>Période : <span>{academicYear}</span></p>
        </div>
      </div>

      <p className="mt-4 text-justify text-slate-600 leading-normal">
        Ce certificat atteste que l'élève ci-dessus mentionné est inscrit pour l'année scolaire en cours et suit assidûment les cours. Il est établi pour servir et valoir ce que de droit.
      </p>
    </div>

    <div className="border-t pt-3 flex justify-between items-end">
      <div>
        <p className="text-[10px] text-slate-400">Date d'émission : {todayFormatted}</p>
        {config.footerText && <p className="text-[10px] text-slate-500 mt-0.5">{config.footerText}</p>}
      </div>
      <div className="text-center w-52">
        <p className="text-[11px] font-bold uppercase" style={{ color: primaryColor }}>{config.signatory.title || 'Le Directeur'}</p>
        {config.signatory.stampUrl && (
          <img src={config.signatory.stampUrl} alt="Cachet" className="h-14 mx-auto my-1 object-contain" />
        )}
        <p className="font-bold text-xs mt-4">{config.signatory.name || 'Direction'}</p>
      </div>
    </div>
  </div>
);
