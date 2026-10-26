// Référentiel officiel national des cycles, filières et séries de la République du Congo (Congo-Brazzaville)
// Sources : https://ecolesaucongo.com/series.html & Programmes officiels MEPSA / METP

export interface CycleDefinition {
  code: 'PRE_SCOLAIRE' | 'PRIMAIRE' | 'COLLEGE' | 'LYCEE';
  name: string;
  levels: string[];
}

export const OFFICIAL_CYCLES: CycleDefinition[] = [
  { code: 'PRE_SCOLAIRE', name: 'Préscolaire (Maternelle)', levels: ['P1', 'P2', 'P3'] },
  { code: 'PRIMAIRE', name: 'Enseignement Primaire', levels: ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'] },
  { code: 'COLLEGE', name: 'Enseignement Secondaire 1er Cycle (Collège)', levels: ['6ème', '5ème', '4ème', '3ème'] },
  { code: 'LYCEE', name: 'Enseignement Secondaire 2nd Cycle (Lycée)', levels: ['Seconde', 'Première', 'Terminale'] },
];

export interface DetailedSerieRef {
  code: string;
  name: string;
  category: 'GENERAL' | 'TERTIAIRE' | 'INDUSTRIEL' | 'INFORMATIQUE';
  description: string;
  validationStatus: 'CONFIRME' | 'PROVISOIRE' | 'A_VERIFIER';
  sourceTitle: string;
  sourceUrl: string;
  subjects: { code: string; name: string; defaultCoef: number; status: 'CONFIRME' | 'PROVISOIRE' | 'A_VERIFIER' }[];
}

export const CONGO_SERIES_CATALOG: DetailedSerieRef[] = [
  // --- ENSEIGNEMENT GÉNÉRAL ---
  {
    code: 'A',
    name: 'Série A — Lettres & Philosophie',
    category: 'GENERAL',
    description: 'Filière littéraire axée sur le Français, la Philosophie, l’Histoire-Géographie et les Langues Vivantes.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Séries Officielles Baccalauréat',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'FRAN', name: 'Français & Littérature', defaultCoef: 5, status: 'CONFIRME' },
      { code: 'PHIL', name: 'Philosophie', defaultCoef: 5, status: 'CONFIRME' },
      { code: 'HIST', name: 'Histoire-Géographie', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'ANG', name: 'Anglais LV1', defaultCoef: 3, status: 'CONFIRME' },
      { code: 'LV2', name: 'Langue Vivante 2 (Espagnol / Russe)', defaultCoef: 2, status: 'CONFIRME' },
      { code: 'MATH', name: 'Mathématiques de base', defaultCoef: 2, status: 'CONFIRME' },
      { code: 'EPS', name: 'Éducation Physique & Sportive', defaultCoef: 1, status: 'CONFIRME' },
    ],
  },
  {
    code: 'C',
    name: 'Série C — Mathématiques & Sciences Physiques',
    category: 'GENERAL',
    description: 'Filière scientifique d’excellence axée sur les Mathématiques pures et la Physique-Chimie.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Séries Officielles Baccalauréat',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'MATH', name: 'Mathématiques', defaultCoef: 6, status: 'CONFIRME' },
      { code: 'PC', name: 'Physique-Chimie', defaultCoef: 5, status: 'CONFIRME' },
      { code: 'FRAN', name: 'Français', defaultCoef: 2, status: 'CONFIRME' },
      { code: 'PHIL', name: 'Philosophie', defaultCoef: 2, status: 'CONFIRME' },
      { code: 'ANG', name: 'Anglais', defaultCoef: 2, status: 'CONFIRME' },
      { code: 'SVT', name: 'Sciences de la Vie et de la Terre', defaultCoef: 2, status: 'CONFIRME' },
      { code: 'EPS', name: 'Éducation Physique & Sportive', defaultCoef: 1, status: 'CONFIRME' },
    ],
  },
  {
    code: 'D',
    name: 'Série D — Mathématiques & Sciences de la Vie et de la Terre',
    category: 'GENERAL',
    description: 'Filière scientifique équilibrée orientée vers la Biologie, la Géologie et les Sciences de la Santé.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Séries Officielles Baccalauréat',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'SVT', name: 'Sciences de la Vie et de la Terre', defaultCoef: 5, status: 'CONFIRME' },
      { code: 'MATH', name: 'Mathématiques', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'PC', name: 'Physique-Chimie', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'FRAN', name: 'Français', defaultCoef: 2, status: 'CONFIRME' },
      { code: 'PHIL', name: 'Philosophie', defaultCoef: 2, status: 'CONFIRME' },
      { code: 'ANG', name: 'Anglais', defaultCoef: 2, status: 'CONFIRME' },
      { code: 'EPS', name: 'Éducation Physique & Sportive', defaultCoef: 1, status: 'CONFIRME' },
    ],
  },

  // --- ENSEIGNEMENT TECHNIQUE TERTIAIRE ---
  {
    code: 'G1',
    name: 'Série G1 — Secrétariat de Direction & Bureautique',
    category: 'TERTIAIRE',
    description: 'Filière tertiaire préparant à la gestion administrative, bureautique professionnelle et communication.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Enseignement Technique Tertiaire',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'COMM_ADMIN', name: 'Communication Administrative', defaultCoef: 5, status: 'CONFIRME' },
      { code: 'BUREAU', name: 'Bureautique & Informatique', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'FRAN', name: 'Français & Correspondance', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'ECO_DROIT', name: 'Économie & Droit', defaultCoef: 3, status: 'CONFIRME' },
      { code: 'ANG', name: 'Anglais Commercial', defaultCoef: 3, status: 'CONFIRME' },
    ],
  },
  {
    code: 'G2',
    name: 'Série G2 — Comptabilité & Gestion Financière',
    category: 'TERTIAIRE',
    description: 'Filière tertiaire spécialisée en comptabilité générale, analytique, fiscalité et gestion d’entreprise.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Enseignement Technique Tertiaire',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'COMPTA', name: 'Comptabilité Générale & Analytique', defaultCoef: 6, status: 'CONFIRME' },
      { code: 'MATH_FIN', name: 'Mathématiques Financières', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'ECO_DROIT', name: 'Économie Générale & Droit du Travail', defaultCoef: 3, status: 'CONFIRME' },
      { code: 'FRAN', name: 'Français', defaultCoef: 3, status: 'CONFIRME' },
      { code: 'INFO_GEST', name: 'Informatique de Gestion (Logiciels comptables)', defaultCoef: 3, status: 'CONFIRME' },
    ],
  },
  {
    code: 'G3',
    name: 'Série G3 — Commerce, Vente & Action Commerciale',
    category: 'TERTIAIRE',
    description: 'Filière tertiaire formant aux techniques de négociation, marketing, distribution et merchandising.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Enseignement Technique Tertiaire',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'COMMERCE', name: 'Techniques Commerciales & Mercatique', defaultCoef: 5, status: 'CONFIRME' },
      { code: 'NEGOC', name: 'Négociation & Gestion de la Relation Client', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'ECO_DROIT', name: 'Économie Commerciale & Droit des Affaires', defaultCoef: 3, status: 'CONFIRME' },
      { code: 'ANG', name: 'Anglais des Affaires', defaultCoef: 3, status: 'CONFIRME' },
    ],
  },
  {
    code: 'BG',
    name: 'Série BG — Brevet de Gestion',
    category: 'TERTIAIRE',
    description: 'Formation de technicien supérieur en gestion polyvalente de PME-PMI.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Ministère Enseignement Technique & Professionnel',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'GEST_PME', name: 'Gestion & Administration PME', defaultCoef: 5, status: 'CONFIRME' },
      { code: 'COMPTA_BASE', name: 'Comptabilité Fondamentale', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'INFO_APPLI', name: 'Outils Informatiques Professionnels', defaultCoef: 3, status: 'CONFIRME' },
    ],
  },

  // --- ENSEIGNEMENT TECHNIQUE INDUSTRIEL ---
  {
    code: 'E',
    name: 'Série E — Mathématiques & Technique (Génie Mécanique)',
    category: 'INDUSTRIEL',
    description: 'Filière industrielle de pointe associant Mathématiques approfondies et Construction mécanique.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Séries Industrielles',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'MATH', name: 'Mathématiques Appliquées', defaultCoef: 6, status: 'CONFIRME' },
      { code: 'CONST_MECA', name: 'Construction & Dessin Mécanique', defaultCoef: 5, status: 'CONFIRME' },
      { code: 'PC', name: 'Physique Industrielle', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'AUTO', name: 'Automatique & Informatique Industrielle', defaultCoef: 3, status: 'CONFIRME' },
    ],
  },
  {
    code: 'F1',
    name: 'Série F1 — Fabrication Mécanique & Productique',
    category: 'INDUSTRIEL',
    description: 'Usinage, commande numérique, fabrication assistée par ordinateur et métrologie.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Séries Industrielles',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'ATELIER_FAB', name: 'Technologie de Fabrication & Atelier', defaultCoef: 6, status: 'CONFIRME' },
      { code: 'DESSIN_IND', name: 'Dessin Industriel & DAO', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'MECANIQUE', name: 'Mécanique Appliquée & RDM', defaultCoef: 4, status: 'CONFIRME' },
    ],
  },
  {
    code: 'F2',
    name: 'Série F2 — Électronique & Systèmes Connectés',
    category: 'INDUSTRIEL',
    description: 'Circuits intégrés, microcontrôleurs, maintenance électronique et télémesure.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Séries Industrielles',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'ELEC_APPLI', name: 'Électronique Analogique & Numérique', defaultCoef: 6, status: 'CONFIRME' },
      { code: 'SCHEMA_ELEC', name: 'Schémas Électroniques & Réalisations', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'PHYSIQUE', name: 'Sciences Physiques', defaultCoef: 4, status: 'CONFIRME' },
    ],
  },
  {
    code: 'F3',
    name: 'Série F3 — Électrotechnique & Énergie',
    category: 'INDUSTRIEL',
    description: 'Réseaux électriques, machines tournantes, distribution HTA/BT et énergies renouvelables.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Séries Industrielles',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'ELECTROTECH', name: 'Électrotechnique & Machines Électriques', defaultCoef: 6, status: 'CONFIRME' },
      { code: 'DISTRIB_ELEC', name: 'Installations & Schémas Électriques', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'SECURITE_IND', name: 'Sécurité Électrique & Normes', defaultCoef: 3, status: 'CONFIRME' },
    ],
  },
  {
    code: 'F4',
    name: 'Série F4 — Génie Civil & Bâtiment',
    category: 'INDUSTRIEL',
    description: 'Topographie, béton armé, métré, dessin d’architecture et conduite de chantier.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Écoles au Congo — Séries Industrielles',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'BATIMENT', name: 'Technologie du Bâtiment & Travaux Publics', defaultCoef: 6, status: 'CONFIRME' },
      { code: 'RDM_BETON', name: 'Résistance des Matériaux & Béton Armé', defaultCoef: 5, status: 'CONFIRME' },
      { code: 'TOPOGRAPHIE', name: 'Topographie & Dessin de Bâtiment', defaultCoef: 4, status: 'CONFIRME' },
    ],
  },

  // --- SÉRIES TECHNOLOGIES DE L'INFORMATION & INFORMATIQUE ---
  {
    code: 'H1',
    name: 'Série H1 — Informatique de Gestion & Systèmes d’Information',
    category: 'INFORMATIQUE',
    description: 'Programmation d’applications de gestion, algorithmique, modélisation Merise/UML et SQL.',
    validationStatus: 'PROVISOIRE',
    sourceTitle: 'Déploiement Lycées Techniques Brazzaville / Pointe-Noire',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'ALGO_PROG', name: 'Algorithmique & Développement Applicatif', defaultCoef: 5, status: 'PROVISOIRE' },
      { code: 'BDD_SQL', name: 'Bases de Données & Systèmes d’Information', defaultCoef: 4, status: 'PROVISOIRE' },
      { code: 'MATH_INFO', name: 'Mathématiques pour l’Informatique', defaultCoef: 4, status: 'CONFIRME' },
      { code: 'ECO_ENTREP', name: 'Économie Numérique & Entrepreneuriat', defaultCoef: 2, status: 'PROVISOIRE' },
    ],
  },
  {
    code: 'H2',
    name: 'Série H2 — Maintenance des Systèmes & Réseaux Locaux',
    category: 'INFORMATIQUE',
    description: 'Architecture des ordinateurs, dépannage matériel, câblage et administration Windows/Linux.',
    validationStatus: 'PROVISOIRE',
    sourceTitle: 'Arrêté d’expérimentation Enseignement Technique',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'MAINT_HARD', name: 'Maintenance Matérielle & Diagnostic', defaultCoef: 5, status: 'PROVISOIRE' },
      { code: 'ADMIN_SYS', name: 'Systèmes d’Exploitation & Réseaux LAN', defaultCoef: 4, status: 'PROVISOIRE' },
      { code: 'SECURITE_INF', name: 'Sécurité des Postes de Travail', defaultCoef: 3, status: 'A_VERIFIER' },
    ],
  },
  {
    code: 'H3',
    name: 'Série H3 — Télécommunications & Réseaux Mobiles',
    category: 'INFORMATIQUE',
    description: 'Transmission hertzienne, fibre optique, protocoles IP et téléphonie mobile.',
    validationStatus: 'A_VERIFIER',
    sourceTitle: 'Projet pilote interministériel télécoms Congo',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'TELECOM', name: 'Technologie des Télécommunications & Fibre', defaultCoef: 5, status: 'A_VERIFIER' },
      { code: 'RESEAUX_IP', name: 'Réseaux Mobiles (4G/5G) & Routage IP', defaultCoef: 4, status: 'A_VERIFIER' },
    ],
  },
  {
    code: 'H4',
    name: 'Série H4 — Administration de Données & Cloud',
    category: 'INFORMATIQUE',
    description: 'Gestion de serveurs de données, sauvegardes, virtualisation et solutions Cloud.',
    validationStatus: 'A_VERIFIER',
    sourceTitle: 'Référentiel expérimental',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'ADMIN_DATA', name: 'Administration de Serveurs & Cloud', defaultCoef: 4, status: 'A_VERIFIER' },
      { code: 'SECURITE_CYBER', name: 'Principes de Cybersécurité', defaultCoef: 3, status: 'A_VERIFIER' },
    ],
  },
  {
    code: 'H5',
    name: 'Série H5 — Multimédia & Technologies Web',
    category: 'INFORMATIQUE',
    description: 'Conception d’interfaces graphiques, intégration web responsive et production de contenus digitaux.',
    validationStatus: 'A_VERIFIER',
    sourceTitle: 'Spécialité en cours d’homologation nationale',
    sourceUrl: 'https://ecolesaucongo.com/series.html',
    subjects: [
      { code: 'DEV_WEB', name: 'Développement Web & CMS', defaultCoef: 4, status: 'A_VERIFIER' },
      { code: 'GRAPHISME', name: 'Infographie & Design Graphique', defaultCoef: 3, status: 'A_VERIFIER' },
    ],
  },
];

export const OFFICIAL_LYCEE_SERIES: string[] = CONGO_SERIES_CATALOG.map((s) => s.code);

export interface CollegeClassRef {
  code: string; // '6EME', '5EME', '4EME', '3EME'
  levelName: string; // '6ème', '5ème', '4ème', '3ème'
  name: string;
  cycleName: string;
  description: string;
  validationStatus: 'CONFIRME' | 'PROVISOIRE' | 'A_VERIFIER';
  sourceTitle: string;
  sourceUrl: string;
  subjects: { code: string; name: string; defaultCoef: number; weeklyHours: number; status: 'CONFIRME' | 'PROVISOIRE' | 'A_VERIFIER' }[];
}

export const CONGO_COLLEGE_CATALOG: CollegeClassRef[] = [
  {
    code: '6EME',
    levelName: '6ème',
    name: 'Classe de 6ème — Cycle d’Observation',
    cycleName: 'COLLÈGE',
    description: 'Première année du collège (enseignement secondaire 1er cycle), consolidant les acquis du primaire et initiant au système par matières.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Programmes Officiels MEPSA — Enseignement Secondaire 1er Cycle Congo',
    sourceUrl: 'https://ecolesaucongo.com/college.html',
    subjects: [
      { code: 'FRAN', name: 'Français & Expression Écrite', defaultCoef: 4, weeklyHours: 6, status: 'CONFIRME' },
      { code: 'MATH', name: 'Mathématiques', defaultCoef: 4, weeklyHours: 5, status: 'CONFIRME' },
      { code: 'HIST', name: 'Histoire-Géographie', defaultCoef: 2, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'SVT', name: 'Sciences de la Vie et de la Terre', defaultCoef: 2, weeklyHours: 2, status: 'CONFIRME' },
      { code: 'ANG', name: 'Anglais (LV1)', defaultCoef: 2, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'ECM', name: 'Éducation Civique & Morale', defaultCoef: 1, weeklyHours: 1, status: 'CONFIRME' },
      { code: 'ARTS', name: 'Éducation Musicale & Arts Plastiques', defaultCoef: 1, weeklyHours: 2, status: 'PROVISOIRE' },
      { code: 'EPS', name: 'Éducation Physique & Sportive', defaultCoef: 2, weeklyHours: 2, status: 'CONFIRME' },
    ],
  },
  {
    code: '5EME',
    levelName: '5ème',
    name: 'Classe de 5ème — Consolidation',
    cycleName: 'COLLÈGE',
    description: 'Année charnière introduisant les Sciences Physiques et approfondissant les notions fondamentales du premier cycle.',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Programmes Officiels MEPSA — Enseignement Secondaire 1er Cycle Congo',
    sourceUrl: 'https://ecolesaucongo.com/college.html',
    subjects: [
      { code: 'FRAN', name: 'Français & Littérature', defaultCoef: 4, weeklyHours: 6, status: 'CONFIRME' },
      { code: 'MATH', name: 'Mathématiques', defaultCoef: 4, weeklyHours: 5, status: 'CONFIRME' },
      { code: 'PC', name: 'Physique-Chimie & Technologie', defaultCoef: 2, weeklyHours: 2, status: 'CONFIRME' },
      { code: 'HIST', name: 'Histoire-Géographie', defaultCoef: 2, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'SVT', name: 'Sciences de la Vie et de la Terre', defaultCoef: 2, weeklyHours: 2, status: 'CONFIRME' },
      { code: 'ANG', name: 'Anglais (LV1)', defaultCoef: 2, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'ECM', name: 'Éducation Civique & Morale', defaultCoef: 1, weeklyHours: 1, status: 'CONFIRME' },
      { code: 'EPS', name: 'Éducation Physique & Sportive', defaultCoef: 2, weeklyHours: 2, status: 'CONFIRME' },
    ],
  },
  {
    code: '4EME',
    levelName: '4ème',
    name: 'Classe de 4ème — Orientation & Approfondissement',
    cycleName: 'COLLÈGE',
    description: 'Classe d’approfondissement scientifique et littéraire avec l’introduction potentielle d’une seconde langue vivante (LV2).',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Programmes Officiels MEPSA — Enseignement Secondaire 1er Cycle Congo',
    sourceUrl: 'https://ecolesaucongo.com/college.html',
    subjects: [
      { code: 'FRAN', name: 'Français', defaultCoef: 4, weeklyHours: 5, status: 'CONFIRME' },
      { code: 'MATH', name: 'Mathématiques', defaultCoef: 4, weeklyHours: 5, status: 'CONFIRME' },
      { code: 'PC', name: 'Physique-Chimie', defaultCoef: 3, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'HIST', name: 'Histoire-Géographie', defaultCoef: 3, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'SVT', name: 'Sciences de la Vie et de la Terre', defaultCoef: 3, weeklyHours: 2, status: 'CONFIRME' },
      { code: 'ANG', name: 'Anglais (LV1)', defaultCoef: 3, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'LV2', name: 'Langue Vivante 2 (Espagnol / Allemand)', defaultCoef: 2, weeklyHours: 2, status: 'PROVISOIRE' },
      { code: 'ECM', name: 'Éducation Civique & Morale', defaultCoef: 1, weeklyHours: 1, status: 'CONFIRME' },
      { code: 'EPS', name: 'Éducation Physique & Sportive', defaultCoef: 2, weeklyHours: 2, status: 'CONFIRME' },
    ],
  },
  {
    code: '3EME',
    levelName: '3ème',
    name: 'Classe de 3ème — Classe d’Examen (BEPC)',
    cycleName: 'COLLÈGE',
    description: 'Dernière classe du collège sanctionnée par l’examen national du Brevet d’Études du Premier Cycle (BEPC).',
    validationStatus: 'CONFIRME',
    sourceTitle: 'Programmes Officiels & Examens Nationaux MEPSA — BEPC Congo',
    sourceUrl: 'https://ecolesaucongo.com/college.html',
    subjects: [
      { code: 'FRAN', name: 'Français & Composition Française', defaultCoef: 5, weeklyHours: 5, status: 'CONFIRME' },
      { code: 'MATH', name: 'Mathématiques', defaultCoef: 5, weeklyHours: 5, status: 'CONFIRME' },
      { code: 'PC', name: 'Physique-Chimie', defaultCoef: 3, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'HIST', name: 'Histoire-Géographie', defaultCoef: 3, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'SVT', name: 'Sciences de la Vie et de la Terre', defaultCoef: 3, weeklyHours: 2, status: 'CONFIRME' },
      { code: 'ANG', name: 'Anglais (LV1)', defaultCoef: 3, weeklyHours: 3, status: 'CONFIRME' },
      { code: 'LV2', name: 'Langue Vivante 2 (Espagnol / Allemand)', defaultCoef: 2, weeklyHours: 2, status: 'PROVISOIRE' },
      { code: 'ECM', name: 'Éducation Civique & Morale', defaultCoef: 1, weeklyHours: 1, status: 'CONFIRME' },
      { code: 'EPS', name: 'Éducation Physique & Sportive', defaultCoef: 2, weeklyHours: 2, status: 'CONFIRME' },
    ],
  },
];

export const OFFICIAL_COLLEGE_CLASSES: string[] = CONGO_COLLEGE_CATALOG.map((c) => c.code);

export const MONTANT_MIN = 1;
export const MONTANT_MAX = 1000000;


