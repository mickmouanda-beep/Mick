export type DocumentType =
  | 'bulletin'
  | 'quittance'
  | 'fiche_paie'
  | 'situation_financiere'
  | 'certificat_scolarite'
  | 'liste_presence'
  | 'fiche_individuelle';

export type DocumentModelId =
  | 'classique'
  | 'moderne'
  | 'sobre'
  | 'institutionnel'
  | 'elegant'
  | 'compact';

export type DocumentFont = 'inter' | 'merriweather' | 'roboto' | 'courier';

export interface DocumentSchoolInfo {
  name: string;
  motto: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logoUrl: string;
}

export interface DocumentStyling {
  primaryColor: string; // e.g. '#1e3a8a'
  secondaryColor: string; // e.g. '#475569'
  fontFamily: DocumentFont;
}

export interface DocumentSignatory {
  name: string;
  title: string;
  stampUrl?: string | null;
}

export interface DocumentToggles {
  showMention: boolean;
  showRank: boolean;
  showAppreciation: boolean;
  showObservations: boolean;
}

export interface DocumentTemplateConfig {
  docType: DocumentType;
  modelId: DocumentModelId;
  schoolInfo: DocumentSchoolInfo;
  styling: DocumentStyling;
  headerText: string;
  footerText: string;
  signatory: DocumentSignatory;
  toggles: DocumentToggles;
  version: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DocumentModelPreset {
  id: DocumentModelId;
  name: string;
  description: string;
  badge: string;
  shapeType: string;
  primaryColorDefault: string;
  secondaryColorDefault: string;
  fontDefault: DocumentFont;
}

export const DOCUMENT_MODEL_PRESETS: DocumentModelPreset[] = [
  {
    id: 'classique',
    name: 'Classique',
    description: 'Format officiel académique, cartouche structuré, colonnes régulières et présentation éprouvée.',
    badge: 'Standard',
    shapeType: 'Grille officielle symétrique',
    primaryColorDefault: '#1e3a8a', // Bleu Marine
    secondaryColorDefault: '#475569', // Ardoise
    fontDefault: 'inter',
  },
  {
    id: 'moderne',
    name: 'Moderne',
    description: 'Cartes douces arrondies, bandeau d’accent en dégradé, pilules de données et typographie aérée.',
    badge: 'Tendance',
    shapeType: 'Cartes flottantes & Pilules',
    primaryColorDefault: '#0f766e', // Sarcelle / Teal
    secondaryColorDefault: '#0284c7', // Bleu Ciel
    fontDefault: 'roboto',
  },
  {
    id: 'sobre',
    name: 'Sobre',
    description: 'Traits fins ultra-nets monochromes, aucun aplat lourd, pureté typographique et économie d’encre.',
    badge: 'Éco-Print',
    shapeType: 'Lignes fines & Minimaliste',
    primaryColorDefault: '#18181b', // Noir Encre
    secondaryColorDefault: '#52525b', // Gris Neutre
    fontDefault: 'inter',
  },
  {
    id: 'institutionnel',
    name: 'Institutionnel',
    description: 'Format républicain d’apparat, doubles bordures solennelles, sceau d’État et cartouches d’honneur.',
    badge: 'Solennel',
    shapeType: 'Double cadre & Sceau d’apparat',
    primaryColorDefault: '#7f1d1d', // Bordeaux Impérial
    secondaryColorDefault: '#854d0e', // Doré Bronze
    fontDefault: 'merriweather',
  },
  {
    id: 'elegant',
    name: 'Élégant / Prestige',
    description: 'Forme diplôme haut de gamme, encadrement avec coins travaillés, médaillon central et typographie noble.',
    badge: 'Prestige',
    shapeType: 'Cadre ornemental & Diplôme',
    primaryColorDefault: '#1e1b4b', // Indigo Nuit
    secondaryColorDefault: '#b45309', // Or Ambré
    fontDefault: 'merriweather',
  },
  {
    id: 'compact',
    name: 'Compact / Administratif',
    description: 'Architecture bi-colonne dense et modulaire, haute rentabilité d’espace A4, parfait pour relevés détaillés.',
    badge: 'Modulaire',
    shapeType: 'Bi-colonne haute densité',
    primaryColorDefault: '#0369a1', // Bleu Océan
    secondaryColorDefault: '#334155', // Ardoise foncé
    fontDefault: 'roboto',
  },
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, { label: string; description: string; available: boolean }> = {
  bulletin: {
    label: 'Bulletin scolaire',
    description: 'Relevé officiel des notes trimestrielles, moyennes pondérées, rangs et appréciations.',
    available: true,
  },
  quittance: {
    label: 'Quittance de paiement',
    description: 'Reçu officiel de versement des frais scolaires avec QR Code et décompte financier.',
    available: true,
  },
  fiche_paie: {
    label: 'Fiche de paie',
    description: 'Bulletin de rémunération mensuel pour le personnel enseignant et administratif.',
    available: true,
  },
  situation_financiere: {
    label: 'Situation financière',
    description: 'Relevé de compte individuel de l’élève avec historique des échéances et solde restant.',
    available: true,
  },
  certificat_scolarite: {
    label: 'Certificat de scolarité',
    description: 'Attestation administrative d’inscription et de fréquentation scolaire pour l’année en cours.',
    available: true,
  },
  liste_presence: {
    label: 'Liste de présence',
    description: 'Feuille d’émargement journalière ou mensuelle de la classe pour le contrôle d’assiduité.',
    available: true,
  },
  fiche_individuelle: {
    label: 'Fiche individuelle (Dossier élève)',
    description: 'Fiche d’identification complète de l’élève avec photo, état civil, scolarité et tuteurs.',
    available: true,
  },
};

export function getDefaultTemplateConfig(
  docType: DocumentType,
  est?: {
    name?: string | null;
    motto?: string | null;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    logo_url?: string | null;
  } | null
): DocumentTemplateConfig {
  const schoolName = est?.name?.trim() || "Établissement Scolaire";
  const schoolMotto = est?.motto?.trim() || "Travail - Rigueur - Réussite";
  const schoolAddress = est?.address?.trim() || "Avenue des Écoles, B.P. 1200";
  const schoolCity = est?.city?.trim() || "Brazzaville";
  const schoolPhone = est?.phone?.trim() || "+242 06 000 00 00";
  const schoolEmail = est?.email?.trim() || "direction@ecole.cg";
  const schoolLogo = est?.logo_url || "";

  let signatoryTitle = "La Direction";
  let signatoryName = "";
  let headerText = "RÉPUBLIQUE DU CONGO • MINISTÈRE DE L'ENSEIGNEMENT PRÉSCOLAIRE, PRIMAIRE, SECONDAIRE ET DE L'ALPHABÉTISATION";
  let footerText = "Document officiel émis par le système informatique scolaire • Toute altération ou falsification est passible de sanctions.";

  switch (docType) {
    case 'bulletin':
      signatoryTitle = "Le Directeur des Études";
      signatoryName = "Direction des Études";
      headerText = "RÉPUBLIQUE DU CONGO • DIRECTION GÉNÉRALE DE L'ENSEIGNEMENT SECONDAIRE";
      footerText = "Bulletin officiel trimestriel • Document conservé dans les archives de l'établissement.";
      break;
    case 'quittance':
      signatoryTitle = "La Caisse Scolaire";
      signatoryName = "Le Responsable de Caisse";
      headerText = "RÉPUBLIQUE DU CONGO • SERVICE FINANCIER ET COMPTABLE";
      footerText = "Quittance officielle de versement • Conservez ce reçu comme preuve libératoire de paiement.";
      break;
    case 'fiche_paie':
      signatoryTitle = "Le Responsable des Ressources Humaines";
      signatoryName = "Direction des Ressources Humaines";
      headerText = "RÉPUBLIQUE DU CONGO • SERVICE DU PERSONNEL ET DE LA PAIE";
      footerText = "Bulletin de paie à conserver sans limitation de durée • Certifié conforme aux pointages d'émargement.";
      break;
    case 'situation_financiere':
      signatoryTitle = "L'Intendant / Comptable";
      signatoryName = "Service de l'Intendance";
      headerText = "RÉPUBLIQUE DU CONGO • ÉTAT FINANCIER DES DROITS ET FRAIS SCOLAIRES";
      footerText = "Relevé de situation comptable individuelle arrêté à la date d'impression.";
      break;
    case 'certificat_scolarite':
      signatoryTitle = "Le Chef d'Établissement";
      signatoryName = "Le Directeur Général";
      headerText = "RÉPUBLIQUE DU CONGO • MINISTÈRE DE L'ENSEIGNEMENT • DÉPARTEMENT DU KOUILOU";
      footerText = "Le présent certificat est délivré pour servir et valoir ce que de droit.";
      break;
    case 'liste_presence':
      signatoryTitle = "Le Surveillant Général";
      signatoryName = "Surveillance Générale";
      headerText = "RÉPUBLIQUE DU CONGO • REGISTRE D'ÉMARGEMENT ET D'ASSIDUITÉ SCOLAIRE";
      footerText = "Feuille de présence officielle • Registre journalier de surveillance.";
      break;
    case 'fiche_individuelle':
      signatoryTitle = "Le Directeur Général / Chef d'Établissement";
      signatoryName = "Secrétariat Général";
      headerText = "RÉPUBLIQUE DU CONGO • FICHE INDIVIDUELLE D'INSCRIPTION ET DOSSIER SCOLAIRE";
      footerText = "Document confidentiel d'identification et de suivi administratif de l'élève.";
      break;
  }

  return {
    docType,
    modelId: 'classique',
    schoolInfo: {
      name: schoolName,
      motto: schoolMotto,
      address: schoolAddress,
      city: schoolCity,
      phone: schoolPhone,
      email: schoolEmail,
      logoUrl: schoolLogo,
    },
    styling: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#475569',
      fontFamily: 'inter',
    },
    headerText,
    footerText,
    signatory: {
      name: signatoryName,
      title: signatoryTitle,
      stampUrl: null,
    },
    toggles: {
      showMention: true,
      showRank: true,
      showAppreciation: true,
      showObservations: true,
    },
    version: 1,
  };
}
