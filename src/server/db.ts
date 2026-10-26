import initSqlJs from 'sql.js';
type Database = any;
import fs from 'fs';
import path from 'path';
import { hydrateSqliteFromFirestore } from './firestore_hydration.ts';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'faith_school.sqlite');

let dbInstance: Database | null = null;

// Official Congolese school series and levels constants
export { OFFICIAL_CYCLES, OFFICIAL_LYCEE_SERIES, CONGO_SERIES_CATALOG, CONGO_COLLEGE_CATALOG } from '../constants.ts';
import { CONGO_SERIES_CATALOG, CONGO_COLLEGE_CATALOG } from '../constants.ts';

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Run schema migrations
  initSchema(dbInstance);
  saveDb();

  // Hydrater SQLite depuis Cloud Firestore en arrière-plan sans bloquer le démarrage HTTP
  hydrateSqliteFromFirestore(dbInstance)
    .then(() => {
      console.log('[getDb] Hydratation Firestore -> SQLite terminée.');
    })
    .catch((err) => {
      console.error('[getDb] Avertissement hydratation SQLite depuis Firestore:', err);
    });

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de la base de données:', err);
  }
}

function initSchema(db: Database): void {
  try {
    db.run("ALTER TABLE payments ADD COLUMN payment_type TEXT DEFAULT 'FRAIS_MENSUELS';");
  } catch {}

  db.run(`
    -- Établissements (multi-écoles prêt)
    CREATE TABLE IF NOT EXISTS establishments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      country TEXT NOT NULL DEFAULT 'Congo-Brazzaville',
      city TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      motto TEXT,
      academic_year TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'FCFA',
      active_cycles TEXT NOT NULL, -- JSON array
      logo_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_establishments_code ON establishments(code);

    -- Utilisateurs & Profils
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL, -- 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE', 'COMPTABLE', 'SURVEILLANT', 'ENSEIGNANT'
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED'
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      UNIQUE(establishment_id, username)
    );

    -- Journal d'audit (sécurité et traçabilité)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- File d'attente de synchronisation et repli sécurisé Firestore
    CREATE TABLE IF NOT EXISTS firestore_sync_queue (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      collection_path TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      operation TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
      payload TEXT NOT NULL,   -- JSON
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SYNCED', 'FAILED'
      retry_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON firestore_sync_queue(status);

    -- Classes ouvertes dans l'établissement
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      name TEXT NOT NULL,
      cycle_code TEXT NOT NULL, -- 'PRE_SCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'
      level_code TEXT NOT NULL, -- 'CP1', '6ème', 'Terminale', etc.
      serie_code TEXT, -- 'A', 'D', 'C', 'G1', etc. (pour lycée)
      room TEXT,
      capacity INTEGER NOT NULL DEFAULT 40,
      main_teacher_id TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (main_teacher_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(establishment_id, academic_year, name)
    );

    -- Référentiel des Matières
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      cycle_code TEXT NOT NULL,
      default_coefficient REAL NOT NULL DEFAULT 1.0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      UNIQUE(establishment_id, code)
    );

    -- Matières associées à une classe (avec enseignant et coefficient)
    CREATE TABLE IF NOT EXISTS class_subjects (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      teacher_id TEXT,
      coefficient REAL NOT NULL DEFAULT 1.0,
      weekly_hours REAL NOT NULL DEFAULT 2.0,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(class_id, subject_id)
    );

    -- Élèves
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      matricule TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      post_name TEXT,
      gender TEXT NOT NULL, -- 'M', 'F'
      birth_date TEXT NOT NULL,
      birth_place TEXT,
      address TEXT,
      guardian_name TEXT NOT NULL,
      guardian_phone TEXT NOT NULL,
      guardian_email TEXT,
      guardian_relation TEXT NOT NULL DEFAULT 'Parent', -- 'Père', 'Mère', 'Tuteur'
      class_id TEXT,
      academic_year TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'INSCRIT', -- 'INSCRIT', 'REINSCRIT', 'TRANSFERE', 'ARCHIVE'
      photo_data TEXT,
      enrollment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      transfer_reason TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
      UNIQUE(establishment_id, matricule)
    );

    -- Documents élèves
    CREATE TABLE IF NOT EXISTS student_documents (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL, -- 'ACTE_NAISSANCE', 'BULLETIN_ANTERIEUR', 'CERTIFICAT_MEDICAL', 'PHOTO'
      file_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- Emplois du temps des enseignants
    CREATE TABLE IF NOT EXISTS teacher_schedules (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL, -- 1: Lundi, 2: Mardi, ..., 6: Samedi
      start_time TEXT NOT NULL, -- '08:00'
      end_time TEXT NOT NULL,   -- '10:00'
      room TEXT,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- Heures d'enseignement réellement effectuées (cahier de texte / suivi des charges)
    CREATE TABLE IF NOT EXISTS teacher_course_logs (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      date TEXT NOT NULL,
      hours_done REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'EFFECTUE', -- 'EFFECTUE', 'ABSENT', 'RETARD', 'REMPLACE'
      replacement_teacher_id TEXT,
      topic TEXT,
      remarks TEXT,
      validated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- Évaluations (Devoirs, Interrogations, Compositions, Examens)
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      term TEXT NOT NULL, -- 'TRIMESTRE_1', 'TRIMESTRE_2', 'TRIMESTRE_3'
      eval_type TEXT NOT NULL, -- 'INTERROGATION', 'DEVOIR', 'COMPOSITION', 'EXAMEN'
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      max_score REAL NOT NULL DEFAULT 20.0,
      coefficient REAL NOT NULL DEFAULT 1.0,
      is_locked INTEGER NOT NULL DEFAULT 0, -- 1 = verrouillé par le DE
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- Notes des élèves
    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      evaluation_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      score REAL, -- null si absent
      is_absent INTEGER NOT NULL DEFAULT 0,
      remarks TEXT,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(evaluation_id, student_id)
    );

    -- Présences et Assiduité des Élèves
    CREATE TABLE IF NOT EXISTS student_attendances (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL, -- 'PRESENT', 'ABSENT', 'RETARD'
      is_justified INTEGER NOT NULL DEFAULT 0,
      justification_reason TEXT,
      recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      UNIQUE(student_id, date)
    );

    -- Incidents disciplinaires
    CREATE TABLE IF NOT EXISTS disciplinary_incidents (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      incident_type TEXT NOT NULL, -- 'RETARD_REPETE', 'INDISCIPLINE', 'BAGARRE', 'DEGRADATION', 'AUTRE'
      description TEXT NOT NULL,
      sanction TEXT,
      recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- Grille Tarifaire / Frais de scolarité
    CREATE TABLE IF NOT EXISTS fee_structures (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      cycle_code TEXT,
      level_code TEXT,
      class_id TEXT,
      fee_type TEXT NOT NULL, -- 'INSCRIPTION', 'REINSCRIPTION', 'SCOLARITE_T1', 'SCOLARITE_T2', 'SCOLARITE_T3', 'FRAIS_ANNEXES', 'UNIFORME'
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
    );

    -- Paiements et Reçus (Traces financières immuables)
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      receipt_number TEXT UNIQUE NOT NULL,
      student_id TEXT NOT NULL,
      fee_structure_id TEXT,
      payment_type TEXT NOT NULL DEFAULT 'FRAIS_MENSUELS',
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL, -- 'ESPECES', 'AIRTEL_MONEY', 'MTN_MOMO', 'CHEQUE', 'VIREMENT'
      transaction_reference TEXT,
      notes TEXT,
      cashier_id TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'VALIDE', -- 'VALIDE', 'ANNULE'
      cancellation_reason TEXT,
      cancelled_by TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT
    );

    -- Migration safe for existing db
    -- SQLite ALTER TABLE ADD COLUMN


    -- Dépenses & Sorties de Caisse
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      expense_number TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL, -- 'FOURNITURES', 'MAINTENANCE', 'SALAIRES', 'EAU_ELECTRICITE', 'AUTRES_BESOINS', 'AUTRE'
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      beneficiary TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
    );

    -- Renforcement et Apports de Caisse (Entrées non-scolaires par le Promoteur)
    CREATE TABLE IF NOT EXISTS cash_injections (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      injection_number TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      provider_name TEXT NOT NULL, -- Ex: Nom du Promoteur
      payment_method TEXT NOT NULL DEFAULT 'ESPECES',
      notes TEXT,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
    );

    -- Abonnements commerciaux & Multi-écoles
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      plan_name TEXT NOT NULL DEFAULT 'STANDARD', -- 'STARTER', 'STANDARD', 'PREMIUM'
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'TRIAL', 'ACTIVE', 'SUSPENDED'
      max_students INTEGER NOT NULL DEFAULT 500,
      max_users INTEGER NOT NULL DEFAULT 50,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
    );

    -- Paie et Salaires des Enseignants et Personnels
    CREATE TABLE IF NOT EXISTS payroll_records (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      user_id TEXT,
      employee_code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      department TEXT NOT NULL, -- 'ENSEIGNEMENT', 'ADMINISTRATION', 'SURVEILLANCE', 'TECHNIQUE'
      contract_type TEXT NOT NULL DEFAULT 'CDI', -- 'CDI', 'CDD', 'VACATAIRE', 'STAGIAIRE'
      hire_date TEXT,
      period TEXT NOT NULL, -- 'YYYY-MM'
      base_salary REAL NOT NULL DEFAULT 0,
      bonuses REAL NOT NULL DEFAULT 0,
      overtime_hours REAL NOT NULL DEFAULT 0,
      overtime_amount REAL NOT NULL DEFAULT 0,
      advances REAL NOT NULL DEFAULT 0,
      deductions REAL NOT NULL DEFAULT 0,
      gross_amount REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'BROUILLON', -- 'BROUILLON', 'EN_ATTENTE_VALIDATION', 'VALIDE', 'PAYE'
      payment_date TEXT,
      payment_method TEXT DEFAULT 'ESPECES',
      transaction_ref TEXT,
      validated_by TEXT,
      validated_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Cahier de texte officiel des enseignants (21 champs normalisés)
    CREATE TABLE IF NOT EXISTS lesson_logs (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 120,
      title TEXT NOT NULL,
      chapter TEXT,
      sub_chapter TEXT,
      general_objective TEXT,
      specific_objectives TEXT,
      summary_content TEXT NOT NULL,
      pedagogical_method TEXT,
      student_activities TEXT,
      participation_conduct TEXT,
      difficulties TEXT,
      exercises_done TEXT,
      homework TEXT,
      teacher_observation TEXT,
      status TEXT NOT NULL DEFAULT 'VUE_TERMINEE', -- 'NON_COMMENCEE', 'EN_COURS', 'VUE_TERMINEE', 'PARTIELLEMENT_VUE', 'A_REVOIR', 'NON_TERMINEE', 'REPORTEE'
      next_lesson TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- Observations du Directeur des Études sur le Cahier de Texte
    CREATE TABLE IF NOT EXISTS lesson_observations (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      lesson_log_id TEXT NOT NULL,
      inspector_id TEXT NOT NULL,
      date TEXT NOT NULL,
      observation TEXT NOT NULL,
      strengths TEXT,
      weaknesses TEXT,
      recommendations TEXT,
      corrective_action TEXT,
      deadline TEXT,
      status TEXT NOT NULL DEFAULT 'EN_ATTENTE', -- 'EN_ATTENTE', 'EN_COURS', 'RESOLU', 'CLOTURE'
      teacher_response TEXT,
      teacher_response_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_log_id) REFERENCES lesson_logs(id) ON DELETE CASCADE,
      FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Décisions administratives & demandes de direction (DG & Promoteur)
    CREATE TABLE IF NOT EXISTS administrative_decisions (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      service TEXT NOT NULL,
      request_date TEXT NOT NULL,
      description TEXT NOT NULL,
      supporting_docs TEXT,
      decision TEXT NOT NULL DEFAULT 'EN_ATTENTE', -- 'EN_ATTENTE', 'APPROUVE', 'REFUSE', 'EN_REVISION'
      reason TEXT,
      assigned_to TEXT,
      deadline TEXT,
      status TEXT NOT NULL DEFAULT 'OUVERT', -- 'OUVERT', 'EN_COURS', 'CLOTURE'
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- Pointage et émargement des enseignants (Espace Surveillant)
    -- Pointage et émargement des enseignants (Espace Surveillant)
    CREATE TABLE IF NOT EXISTS teacher_attendances (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      date TEXT NOT NULL,
      scheduled_hours REAL NOT NULL DEFAULT 2.0,
      hours_done REAL NOT NULL DEFAULT 2.0,
      status TEXT NOT NULL DEFAULT 'PRESENT', -- 'PRESENT', 'ABSENT', 'RETARD', 'REMPLACE'
      replacement_teacher_id TEXT,
      is_justified INTEGER NOT NULL DEFAULT 0,
      justification_reason TEXT,
      recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT,
      UNIQUE(teacher_id, date)
    );

    -- Réclamations & Signalements (Surveillance, Enseignants, Direction)
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      complaint_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      concerned_person TEXT NOT NULL,
      category TEXT NOT NULL, -- 'POINTAGE', 'DISCIPLINE', 'PEDAGOGIQUE', 'ADMINISTRATIF', 'FINANCIER', 'HARCELEMENT', 'AUTRE'
      description TEXT NOT NULL,
      supporting_doc TEXT,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      assigned_to_id TEXT,
      assigned_to_name TEXT,
      priority TEXT NOT NULL DEFAULT 'NORMALE', -- 'FAIBLE', 'NORMALE', 'HAUTE', 'URGENTE'
      is_confidential INTEGER NOT NULL DEFAULT 0,
      response TEXT,
      responded_by TEXT,
      responded_at TEXT,
      status TEXT NOT NULL DEFAULT 'RECUE', -- 'RECUE', 'EN_COURS', 'TRANSMISE', 'RESOLUE', 'CLOTUREE'
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  try {
    db.run('ALTER TABLE students ADD COLUMN photo_data TEXT;');
  } catch {
    // Colonne déjà existante
  }

  // Support des emplois du temps multi-établissements et métadonnées matières
  try {
    db.run('ALTER TABLE teacher_schedules ADD COLUMN establishment_id TEXT;');
  } catch {}
  try {
    db.run('ALTER TABLE teacher_schedules ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1;');
  } catch {}
  try {
    db.run('ALTER TABLE teacher_schedules ADD COLUMN academic_year TEXT;');
  } catch {}
  try {
    db.run('ALTER TABLE teacher_schedules ADD COLUMN updated_at TEXT;');
  } catch {}
  try {
    db.run('ALTER TABLE subjects ADD COLUMN level_code TEXT;');
  } catch {}
  try {
    db.run('ALTER TABLE subjects ADD COLUMN serie_code TEXT;');
  } catch {}
  try {
    db.run('ALTER TABLE users ADD COLUMN first_name TEXT;');
  } catch {}
  try {
    db.run('ALTER TABLE users ADD COLUMN last_name TEXT;');
  } catch {}

  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_teacher_schedules_class ON teacher_schedules(class_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_teacher_schedules_teacher ON teacher_schedules(teacher_id);');
  } catch {}

  // Incidents disciplinaires champs complets
  const incidentCols = [
    'action_taken TEXT',
    'assigned_to TEXT',
    "status TEXT DEFAULT 'SIGNOLE'",
    'time TEXT',
    'motif TEXT',
    'supporting_doc TEXT',
    "justification_status TEXT DEFAULT 'NON_JUSTIFIE'",
    'observation TEXT'
  ];
  incidentCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE disciplinary_incidents ADD COLUMN ${col};`);
    } catch {
      // Ignorer si déjà présent
    }
  });

  // Pointage des enseignants champs complets
  const teacherAttCols = [
    'subject_id TEXT',
    'class_ids TEXT',
    'expected_arrival_time TEXT',
    'actual_arrival_time TEXT',
    'expected_departure_time TEXT',
    'actual_departure_time TEXT',
    'delay_minutes INTEGER DEFAULT 0',
    'early_departure_minutes INTEGER DEFAULT 0',
    'presence_hours REAL DEFAULT 0',
    'taught_hours REAL DEFAULT 0',
    'is_absent INTEGER DEFAULT 0',
    'supporting_doc TEXT',
    'observations TEXT',
    "validation_status TEXT DEFAULT 'EN_ATTENTE'",
    'teacher_comment TEXT',
    'contest_reason TEXT',
    'previous_value TEXT',
    'correction_reason TEXT'
  ];
  teacherAttCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE teacher_attendances ADD COLUMN ${col};`);
    } catch {
      // Ignorer si déjà présent
    }
  });

  // Quittances de paiement: réimpression et nom du payeur
  const paymentCols = [
    'payer_name TEXT',
    'reprint_count INTEGER DEFAULT 0',
    'last_reprinted_at TEXT',
    "payment_type TEXT DEFAULT 'FRAIS_MENSUELS'"
  ];
  paymentCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE payments ADD COLUMN ${col};`);
    } catch {
      // Ignorer si déjà présent
    }
  });

  // Cahier de texte champs complets
  const lessonCols = [
    'academic_year TEXT',
    'day_of_week TEXT',
    'cycle_code TEXT',
    'level_code TEXT',
    'serie_code TEXT',
    'start_time TEXT',
    'end_time TEXT',
    'content TEXT',
    'curriculum_chapter TEXT',
    'planned_duration_minutes INTEGER DEFAULT 120',
    'effective_duration_minutes INTEGER DEFAULT 120',
    'session_number INTEGER DEFAULT 1',
    'curriculum_reference TEXT',
    'textbook_reference TEXT',
    'official_curriculum_title TEXT'
  ];
  lessonCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE lesson_logs ADD COLUMN ${col};`);
    } catch {
      // Ignorer si déjà présent
    }
  });

  // Profils Élève & Parent/Tuteur
  try {
    db.run('ALTER TABLE users ADD COLUMN student_id TEXT;');
  } catch {
    // Déjà présent
  }

  db.run(`
    -- Justifications d'absence soumises par Élève ou Parent
    CREATE TABLE IF NOT EXISTS absence_justifications (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      attendance_id TEXT,
      date TEXT NOT NULL,
      reason TEXT NOT NULL,
      document_url TEXT,
      submitted_by_id TEXT NOT NULL,
      submitted_by_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
      review_note TEXT,
      reviewed_by_id TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- Annonces et circulaires de l'établissement
    CREATE TABLE IF NOT EXISTS school_announcements (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_audience TEXT NOT NULL DEFAULT 'ALL',
      category TEXT NOT NULL DEFAULT 'GENERAL',
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS parent_students (
      id TEXT PRIMARY KEY,
      parent_user_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'Parent',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(parent_user_id, student_id)
    );

    -- Table des autorisations de création & codes d'activation uniques (Développeur)
    CREATE TABLE IF NOT EXISTS creation_authorizations (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      promoter_name TEXT NOT NULL,
      promoter_email TEXT,
      promoter_phone TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'USED', 'EXPIRED', 'REVOKED'
      created_by_user_id TEXT,
      created_by_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      used_at TEXT,
      used_by_user_id TEXT,
      used_by_username TEXT,
      created_establishment_id TEXT,
      created_establishment_name TEXT,
      revoked_at TEXT,
      revoked_by TEXT,
      revocation_reason TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_creation_authorizations_code ON creation_authorizations(code);
  `);

  // Colonnes de cycle de vie et d'attribution sur les établissements
  const estCols = [
    "status TEXT DEFAULT 'ACTIVE'",
    'activated_at TEXT',
    'suspended_at TEXT',
    'suspension_reason TEXT',
    'suspended_by TEXT',
    'deleted_at TEXT',
    'deletion_reason TEXT',
    'auth_code_used TEXT',
    'promoter_id TEXT',
    'promoter_name TEXT',
    'promoter_email TEXT',
    'promoter_phone TEXT'
  ];
  estCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE establishments ADD COLUMN ${col};`);
    } catch {
      // Ignorer si déjà présent
    }
  });

  // Colonnes étendues pour les licences commerciales sur subscriptions
  const subCols = [
    "formula TEXT DEFAULT 'EXCELLENCE'",
    "formula_name TEXT DEFAULT 'Formule Excellence — Illimité'",
    'license_ref TEXT',
    'price_fcfa REAL',
    'duration_months INTEGER DEFAULT 12',
    'activated_at TEXT',
    'renewed_at TEXT',
    'renewal_count INTEGER DEFAULT 0',
    'modules_included TEXT'
  ];
  subCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE subscriptions ADD COLUMN ${col};`);
    } catch {
      // Ignorer si déjà présent
    }
  });

  // Historique des renouvellements de licences
  db.run(`
    CREATE TABLE IF NOT EXISTS license_renewals (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      establishment_id TEXT NOT NULL,
      formula TEXT NOT NULL,
      duration_months INTEGER NOT NULL DEFAULT 12,
      previous_expires_at TEXT,
      new_expires_at TEXT NOT NULL,
      notes TEXT,
      renewed_by_user_id TEXT,
      renewed_by_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS commercial_formulas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subtitle TEXT,
      max_students INTEGER NOT NULL,
      max_staff INTEGER NOT NULL,
      duration_months INTEGER NOT NULL DEFAULT 12,
      price_fcfa REAL,
      modules_included TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Nouvelles tables du Prompt Maître Unique Congo-Brazzaville
  db.run(`
    -- Référentiel National Officiel Pédagogique (Congo-Brazzaville)
    CREATE TABLE IF NOT EXISTS pedagogical_references (
      id TEXT PRIMARY KEY,
      cycle_code TEXT NOT NULL,
      level_code TEXT NOT NULL,
      serie_code TEXT,
      specialty_name TEXT NOT NULL,
      description TEXT,
      validation_status TEXT NOT NULL DEFAULT 'CONFIRME', -- 'CONFIRME', 'PROVISOIRE', 'A_VERIFIER'
      source_title TEXT NOT NULL,
      source_url TEXT NOT NULL,
      notes TEXT,
      subjects_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Paramètres tarifaires par classe ou cycle (Promoteur)
    CREATE TABLE IF NOT EXISTS school_tariff_plans (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      cycle_code TEXT NOT NULL,
      level_code TEXT,
      class_id TEXT,
      inscription_new_fee REAL NOT NULL DEFAULT 0,
      reinscription_fee REAL NOT NULL DEFAULT 0,
      monthly_tuition REAL NOT NULL DEFAULT 0,
      months_count INTEGER NOT NULL DEFAULT 9,
      payment_schedule TEXT NOT NULL DEFAULT 'MENSUEL',
      trimester_1_fee REAL NOT NULL DEFAULT 0,
      trimester_2_fee REAL NOT NULL DEFAULT 0,
      trimester_3_fee REAL NOT NULL DEFAULT 0,
      annex_fees REAL NOT NULL DEFAULT 0,
      annex_fees_details TEXT,
      annual_total_new REAL NOT NULL DEFAULT 0,
      annual_total_old REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
    );
  `);

  try {
    db.run("ALTER TABLE school_tariff_plans ADD COLUMN created_at TEXT;");
    db.run("UPDATE school_tariff_plans SET created_at = COALESCE(updated_at, datetime('now')) WHERE created_at IS NULL;");
  } catch (e) {
    // Colonne déjà existante
  }

  db.run(`
    -- Règles de pointage du personnel (Promoteur & Direction)
    CREATE TABLE IF NOT EXISTS staff_attendance_rules (
      id TEXT PRIMARY KEY,
      establishment_id TEXT UNIQUE NOT NULL,
      work_start_time TEXT NOT NULL DEFAULT '07:30',
      work_end_time TEXT NOT NULL DEFAULT '17:30',
      tolerance_minutes INTEGER NOT NULL DEFAULT 15,
      absence_deduction_rate_per_hour REAL NOT NULL DEFAULT 2500,
      overtime_hourly_bonus REAL NOT NULL DEFAULT 3500,
      checkin_mode_preschool_primary TEXT NOT NULL DEFAULT 'JOURNALIER',
      checkin_mode_college_lycee TEXT NOT NULL DEFAULT 'PAR_SEANCE',
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
    );

    -- Paramètres de rémunération des enseignants et personnels (Promoteur & Direction)
    CREATE TABLE IF NOT EXISTS staff_salary_parameters (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      wage_type TEXT NOT NULL DEFAULT 'MENSUEL_FIXE', -- 'MENSUEL_FIXE', 'HORAIRE'
      base_salary REAL NOT NULL DEFAULT 150000,
      hourly_rate REAL NOT NULL DEFAULT 3500,
      transport_allowance REAL NOT NULL DEFAULT 20000,
      responsibility_bonus REAL NOT NULL DEFAULT 0,
      seniority_bonus REAL NOT NULL DEFAULT 0,
      overtime_rate REAL NOT NULL DEFAULT 4000,
      active INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(establishment_id, user_id)
    );
  `);

  // Seeder le référentiel national congolais officiel (Lycée et Collège)
  try {
    for (const serie of CONGO_SERIES_CATALOG) {
      const id = `REF-${serie.code}`;
      const subjectsJson = JSON.stringify(serie.subjects);
      db.run(
        `INSERT OR IGNORE INTO pedagogical_references (id, cycle_code, level_code, serie_code, specialty_name, description, validation_status, source_title, source_url, subjects_json)
         VALUES (?, 'LYCEE', 'Terminale', ?, ?, ?, ?, ?, ?, ?)`,
        [id, serie.code, serie.name, serie.description, serie.validationStatus, serie.sourceTitle, serie.sourceUrl, subjectsJson]
      );
    }
    for (const col of CONGO_COLLEGE_CATALOG) {
      const id = `REF-COL-${col.code}`;
      const subjectsJson = JSON.stringify(col.subjects);
      db.run(
        `INSERT OR IGNORE INTO pedagogical_references (id, cycle_code, level_code, serie_code, specialty_name, description, validation_status, source_title, source_url, subjects_json)
         VALUES (?, 'COLLEGE', ?, NULL, ?, ?, ?, ?, ?, ?)`,
        [id, col.levelName, col.name, col.description, col.validationStatus, col.sourceTitle, col.sourceUrl, subjectsJson]
      );
    }
  } catch (err) {
    console.error("Erreur initialisation référentiel national:", err);
  }

  // Seeder les 3 formules officielles si absentes
  try {
    const existing = db.exec("SELECT COUNT(*) as c FROM commercial_formulas");
    const count = existing[0]?.values[0]?.[0] || 0;
    if (count === 0) {
      db.run(`
        INSERT INTO commercial_formulas (id, name, subtitle, max_students, max_staff, duration_months, price_fcfa, modules_included)
        VALUES 
        ('EXCELLENCE', 'Formule Excellence — Illimité', 'Plafond effectif jusqu''à 1 500 élèves et 150 membres du personnel', 1500, 150, 12, NULL, '["SCOLARITE","NOTES","PAIE","FINANCE","SURVEILLANCE","CAHIER_TEXTE","DECISIONS"]'),
        ('PACK_MOYEN', 'Formule Pack Moyen', 'Plafond effectif jusqu''à 700 élèves et 80 membres du personnel', 700, 80, 12, NULL, '["SCOLARITE","NOTES","FINANCE","SURVEILLANCE","CAHIER_TEXTE"]'),
        ('START', 'Formule Start', 'Plafond effectif jusqu''à 400 élèves et 50 membres du personnel', 400, 50, 12, NULL, '["SCOLARITE","NOTES","FINANCE"]');
      `);
    }
  } catch (err) {
    console.error("Erreur initialisation formules commerciales:", err);
  }
}

// Helpers for executing SQL and returning typed JavaScript objects
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Base de données non initialisée');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): void {
  if (!dbInstance) throw new Error('Base de données non initialisée');
  dbInstance.run(sql, params);
  saveDb();
}
