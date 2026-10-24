import { hashPassword } from './auth.ts';
import { run, saveDb } from './db.ts';

/**
 * Ce script est déclenché UNIQUEMENT sur demande explicite de l'utilisateur
 * via le bouton "Initialiser l'environnement de test" ou l'API de développement.
 * Au démarrage initial, la base de données reste 100% vierge.
 */
export async function populateDemoData(): Promise<void> {
  const establishmentId = 'EST-DEMO-01';
  const hashedPass = await hashPassword('Faith2026!');

  // Établissement
  run(`
    INSERT OR REPLACE INTO establishments (
      id, name, code, country, city, address, phone, email, motto, academic_year, currency, active_cycles
    ) VALUES (
      ?, 'Complexe Scolaire La Renaissance', 'CS-REN-BZV', 'Congo-Brazzaville', 'Brazzaville',
      'Avenue de la Paix, Moungali', '+242 06 900 11 22', 'contact@cs-renaissance.cg',
      'Discipline - Travail - Succès', '2026-2027', 'FCFA',
      '["PRE_SCOLAIRE","PRIMAIRE","COLLEGE","LYCEE"]'
    )
  `, [establishmentId]);

  // Création des 9 profils distincts
  const users = [
    { id: 'USR-PROM-01', username: 'promoteur', email: 'promoteur@cs-renaissance.cg', name: 'M. Jean-Paul NGOUABI', role: 'PROMOTEUR', phone: '+242 05 510 20 30', stuId: null },
    { id: 'USR-DG-01', username: 'dg', email: 'dg@cs-renaissance.cg', name: 'Dr. Antoinette MOUKOKO', role: 'DIRECTEUR_GENERAL', phone: '+242 06 620 30 40', stuId: null },
    { id: 'USR-DE-01', username: 'de', email: 'de@cs-renaissance.cg', name: 'Prof. Patrice LOUBAKI', role: 'DIRECTEUR_ETUDES', phone: '+242 05 730 40 50', stuId: null },
    { id: 'USR-GEST-01', username: 'gestionnaire', email: 'scolarite@cs-renaissance.cg', name: 'Mme. Blandine MBEMBA', role: 'GESTIONNAIRE', phone: '+242 06 840 50 60', stuId: null },
    { id: 'USR-COMPT-01', username: 'comptable', email: 'finance@cs-renaissance.cg', name: 'M. Rodrigue ONDONGO', role: 'COMPTABLE', phone: '+242 05 950 60 70', stuId: null },
    { id: 'USR-SURV-01', username: 'surveillant', email: 'discipline@cs-renaissance.cg', name: 'M. Sylvain BASSINGA', role: 'SURVEILLANT', phone: '+242 06 160 70 80', stuId: null },
    { id: 'USR-ENS-01', username: 'prof.maths', email: 'alain.massamba@cs-renaissance.cg', name: 'M. Alain MASSAMBA', role: 'ENSEIGNANT', phone: '+242 05 270 80 90', stuId: null },
    { id: 'USR-ENS-02', username: 'prof.francais', email: 'claudine.kodia@cs-renaissance.cg', name: 'Mme. Claudine KODIA', role: 'ENSEIGNANT', phone: '+242 06 380 90 01', stuId: null },
    { id: 'USR-ELEVE-01', username: 'eleve', email: 'eleve@cs-renaissance.cg', name: 'Aïcha OKEMBA (Élève - 3ème A)', role: 'ELEVE', phone: '+242 06 911 22 33', stuId: 'STU-001' },
    { id: 'USR-PARENT-01', username: 'parent', email: 'parent@cs-renaissance.cg', name: 'M. Michel OKEMBA (Parent d\'Élève)', role: 'PARENT', phone: '+242 06 911 22 33', stuId: null },
  ];

  for (const u of users) {
    run(`
      INSERT OR REPLACE INTO users (
        id, establishment_id, username, email, password_hash, full_name, phone, role, student_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [u.id, establishmentId, u.username, u.email, hashedPass, u.name, u.phone, u.role, u.stuId]);
  }

  // Classes de démonstration
  const classes = [
    { id: 'CLS-CP1-A', name: 'CP1 A', cycle: 'PRIMAIRE', level: 'CP1', serie: null, room: 'Salle 01', teacher: 'USR-ENS-02' },
    { id: 'CLS-6EME-A', name: '6ème A', cycle: 'COLLEGE', level: '6ème', serie: null, room: 'Salle 12', teacher: 'USR-ENS-01' },
    { id: 'CLS-3EME-A', name: '3ème A', cycle: 'COLLEGE', level: '3ème', serie: null, room: 'Salle 15', teacher: 'USR-ENS-01' },
    { id: 'CLS-2NDE-C', name: 'Seconde C', cycle: 'LYCEE', level: 'Seconde', serie: 'C', room: 'Salle 21', teacher: 'USR-ENS-01' },
    { id: 'CLS-TLE-D', name: 'Terminale D', cycle: 'LYCEE', level: 'Terminale', serie: 'D', room: 'Salle 24', teacher: 'USR-ENS-01' },
    { id: 'CLS-TLE-G2', name: 'Terminale G2 (Comptabilité)', cycle: 'LYCEE', level: 'Terminale', serie: 'G2', room: 'Salle Technique 03', teacher: 'USR-ENS-01' },
  ];

  for (const c of classes) {
    run(`
      INSERT OR REPLACE INTO classes (
        id, establishment_id, academic_year, name, cycle_code, level_code, serie_code, room, capacity, main_teacher_id
      ) VALUES (?, ?, '2026-2027', ?, ?, ?, ?, ?, 45, ?)
    `, [c.id, establishmentId, c.name, c.cycle, c.level, c.serie, c.room, c.teacher]);
  }

  // Matières
  const subjects = [
    { id: 'SUB-FRAN', code: 'FRAN', name: 'Français & Expression', cycle: 'COLLEGE', coef: 4 },
    { id: 'SUB-MATH', code: 'MATH', name: 'Mathématiques', cycle: 'COLLEGE', coef: 4 },
    { id: 'SUB-PC', code: 'PC', name: 'Physique-Chimie', cycle: 'COLLEGE', coef: 2 },
    { id: 'SUB-SVT', code: 'SVT', name: 'Sciences de la Vie et de la Terre', cycle: 'COLLEGE', coef: 2 },
    { id: 'SUB-ANG', code: 'ANG', name: 'Anglais', cycle: 'COLLEGE', coef: 2 },
    { id: 'SUB-HIST', code: 'HIST', name: 'Histoire-Géographie', cycle: 'COLLEGE', coef: 2 },
  ];

  for (const s of subjects) {
    run(`
      INSERT OR REPLACE INTO subjects (
        id, establishment_id, code, name, cycle_code, default_coefficient
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [s.id, establishmentId, s.code, s.name, s.cycle, s.coef]);
  }

  // Association des matières à 3ème A
  for (const s of subjects) {
    run(`
      INSERT OR REPLACE INTO class_subjects (
        id, class_id, subject_id, teacher_id, coefficient, weekly_hours
      ) VALUES (?, 'CLS-3EME-A', ?, ?, ?, 4.0)
    `, [`CS-3A-${s.code}`, s.id, s.code === 'MATH' || s.code === 'PC' ? 'USR-ENS-01' : 'USR-ENS-02', s.coef]);
  }

  // Grille tarifaire
  const fees = [
    { id: 'FEE-INSC-COL', cycle: 'COLLEGE', level: '3ème', type: 'INSCRIPTION', name: "Frais d'inscription Collège", amount: 25000, due: '2026-10-01' },
    { id: 'FEE-SCOL-T1-COL', cycle: 'COLLEGE', level: '3ème', type: 'SCOLARITE_T1', name: 'Scolarité 1er Trimestre', amount: 65000, due: '2026-10-15' },
    { id: 'FEE-SCOL-T2-COL', cycle: 'COLLEGE', level: '3ème', type: 'SCOLARITE_T2', name: 'Scolarité 2ème Trimestre', amount: 65000, due: '2027-01-10' },
    { id: 'FEE-SCOL-T3-COL', cycle: 'COLLEGE', level: '3ème', type: 'SCOLARITE_T3', name: 'Scolarité 3ème Trimestre', amount: 65000, due: '2027-04-10' },
  ];

  for (const f of fees) {
    run(`
      INSERT OR REPLACE INTO fee_structures (
        id, establishment_id, academic_year, cycle_code, level_code, fee_type, name, amount, due_date
      ) VALUES (?, ?, '2026-2027', ?, ?, ?, ?, ?, ?)
    `, [f.id, establishmentId, f.cycle, f.level, f.type, f.name, f.amount, f.due]);
  }

  // Élèves de test
  const students = [
    { id: 'STU-001', mat: 'FSM-2026-0001', first: 'Aïcha', last: 'OKEMBA', post: 'Grâce', gen: 'F', birth: '2011-04-12', place: 'Brazzaville', guard: 'Michel OKEMBA', phone: '+242 06 911 22 33', rel: 'Père', classId: 'CLS-3EME-A' },
    { id: 'STU-002', mat: 'FSM-2026-0002', first: 'Junior', last: 'MOUKASSA', post: 'Dieudonné', gen: 'M', birth: '2010-11-25', place: 'Pointe-Noire', guard: 'Chantal MOUKASSA', phone: '+242 05 822 33 44', rel: 'Mère', classId: 'CLS-3EME-A' },
    { id: 'STU-003', mat: 'FSM-2026-0003', first: 'Christelle', last: 'KOLELAS', post: 'Mariette', gen: 'F', birth: '2011-01-08', place: 'Dolisie', guard: 'Bernard KOLELAS', phone: '+242 06 733 44 55', rel: 'Tuteur', classId: 'CLS-3EME-A' },
    { id: 'STU-004', mat: 'FSM-2026-0004', first: 'Emmanuel', last: 'NGOMA', post: 'Séverin', gen: 'M', birth: '2010-08-19', place: 'Brazzaville', guard: 'Jeanne NGOMA', phone: '+242 05 644 55 66', rel: 'Mère', classId: 'CLS-3EME-A' },
  ];

  for (const s of students) {
    run(`
      INSERT OR REPLACE INTO students (
        id, establishment_id, matricule, first_name, last_name, post_name, gender, birth_date, birth_place,
        address, guardian_name, guardian_phone, guardian_relation, class_id, academic_year, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Brazzaville', ?, ?, ?, ?, '2026-2027', 'INSCRIT')
    `, [s.id, establishmentId, s.mat, s.first, s.last, s.post, s.gen, s.birth, s.place, s.guard, s.phone, s.rel, s.classId]);
  }

  // Paiement de test
  run(`
    INSERT OR REPLACE INTO payments (
      id, establishment_id, receipt_number, student_id, amount, payment_method, cashier_id, cashier_name, status, notes
    ) VALUES (
      'PAY-2026-001', ?, 'REC-2026-1001', 'STU-001', 90000, 'AIRTEL_MONEY', 'USR-COMPT-01', 'M. Rodrigue ONDONGO', 'VALIDE', 'Inscription + 1er Trimestre complet'
    )
  `, [establishmentId]);

  // Évaluation et notes de test
  run(`
    INSERT OR REPLACE INTO evaluations (
      id, establishment_id, class_id, subject_id, academic_year, term, eval_type, title, date, max_score, coefficient, is_locked, created_by
    ) VALUES (
      'EVAL-3A-MATH-01', ?, 'CLS-3EME-A', 'SUB-MATH', '2026-2027', 'TRIMESTRE_1', 'DEVOIR', 'Devoir surveillé N°1 : Théorème de Pythagore', '2026-10-10', 20.0, 2.0, 0, 'USR-ENS-01'
    )
  `, [establishmentId]);

  const grades = [
    { stu: 'STU-001', score: 17.5, rem: 'Excellent travail, rigoureux' },
    { stu: 'STU-002', score: 14.0, rem: 'Bon niveau d ensemble' },
    { stu: 'STU-003', score: 9.5, rem: 'Des lacunes en calcul, doit persévérer' },
    { stu: 'STU-004', score: 12.0, rem: 'Passable, attention aux démonstrations' },
  ];

  for (const g of grades) {
    run(`
      INSERT OR REPLACE INTO grades (
        id, evaluation_id, student_id, score, remarks, updated_by
      ) VALUES (?, 'EVAL-3A-MATH-01', ?, ?, ?, 'USR-ENS-01')
    `, [`GRD-${g.stu}`, g.stu, g.score, g.rem]);
  }

  // Présences
  const today = new Date().toISOString().split('T')[0];
  run(`
    INSERT OR REPLACE INTO student_attendances (id, establishment_id, student_id, class_id, date, status, recorded_by)
    VALUES 
      ('ATT-001', ?, 'STU-001', 'CLS-3EME-A', ?, 'PRESENT', 'USR-SURV-01'),
      ('ATT-002', ?, 'STU-002', 'CLS-3EME-A', ?, 'RETARD', 'USR-SURV-01'),
      ('ATT-003', ?, 'STU-003', 'CLS-3EME-A', ?, 'PRESENT', 'USR-SURV-01'),
      ('ATT-004', ?, 'STU-004', 'CLS-3EME-A', ?, 'ABSENT', 'USR-SURV-01')
  `, [establishmentId, today, establishmentId, today, establishmentId, today, establishmentId, today]);

  // Liaison Parent -> Enfants (Michel OKEMBA est parent d'Aïcha OKEMBA et Junior MOUKASSA)
  run(`
    INSERT OR REPLACE INTO parent_students (id, parent_user_id, student_id, relation)
    VALUES
      ('PRNT-STU-01', 'USR-PARENT-01', 'STU-001', 'Père'),
      ('PRNT-STU-02', 'USR-PARENT-01', 'STU-002', 'Tuteur légal')
  `);

  // Emploi du temps de la 3ème A
  const schedules = [
    { id: 'SCH-01', day: 1, start: '07:30', end: '09:30', sub: 'SUB-FRAN', teacher: 'USR-ENS-02', room: 'Salle 15' },
    { id: 'SCH-02', day: 1, start: '09:45', end: '11:45', sub: 'SUB-MATH', teacher: 'USR-ENS-01', room: 'Salle 15' },
    { id: 'SCH-03', day: 2, start: '07:30', end: '09:30', sub: 'SUB-PC', teacher: 'USR-ENS-01', room: 'Labo 02' },
    { id: 'SCH-04', day: 2, start: '09:45', end: '11:45', sub: 'SUB-ANG', teacher: 'USR-ENS-02', room: 'Salle 15' },
    { id: 'SCH-05', day: 3, start: '07:30', end: '09:30', sub: 'SUB-MATH', teacher: 'USR-ENS-01', room: 'Salle 15' },
    { id: 'SCH-06', day: 4, start: '07:30', end: '09:30', sub: 'SUB-SVT', teacher: 'USR-ENS-01', room: 'Salle 15' },
    { id: 'SCH-07', day: 5, start: '07:30', end: '09:30', sub: 'SUB-HIST', teacher: 'USR-ENS-02', room: 'Salle 15' },
  ];
  for (const sc of schedules) {
    run(`
      INSERT OR REPLACE INTO teacher_schedules (id, teacher_id, class_id, subject_id, day_of_week, start_time, end_time, room)
      VALUES (?, ?, 'CLS-3EME-A', ?, ?, ?, ?, ?)
    `, [sc.id, sc.teacher, sc.sub, sc.day, sc.start, sc.end, sc.room]);
  }

  // Cahier de texte & devoirs à la maison
  run(`
    INSERT OR REPLACE INTO lesson_logs (
      id, establishment_id, class_id, subject_id, teacher_id, date, title, content, summary_content, homework,
      curriculum_chapter, start_time, end_time, academic_year, day_of_week, status
    ) VALUES (
      'LES-3A-01', ?, 'CLS-3EME-A', 'SUB-MATH', 'USR-ENS-01', '2026-10-12',
      'Théorème de Pythagore et réciproque',
      'Démonstration géométrique du théorème de Pythagore, calculs de l hypoténuse dans les triangles rectangles.',
      'Démonstration géométrique du théorème de Pythagore, calculs de l hypoténuse dans les triangles rectangles.',
      'Exercices 14, 15 et 18 page 45 du manuel CIAM. À rendre le vendredi 17 octobre.',
      'Chapitre 2 : Triangle rectangle', '09:45', '11:45', '2026-2027', 'Lundi', 'VALIDE'
    ),
    (
      'LES-3A-02', ?, 'CLS-3EME-A', 'SUB-FRAN', 'USR-ENS-02', '2026-10-13',
      'L étude de texte : Les figures de style',
      'Repérage des métaphores, comparaisons et anaphores dans un extrait de Soundiata Keïta.',
      'Repérage des métaphores, comparaisons et anaphores dans un extrait de Soundiata Keïta.',
      'Rédiger un paragraphe argumenté de 15 lignes en réinvestissant 3 métaphores.',
      'Séquence 1 : Littérature africaine', '07:30', '09:30', '2026-2027', 'Mardi', 'VALIDE'
    )
  `, [establishmentId, establishmentId]);

  // Annonces de l'établissement
  run(`
    INSERT OR REPLACE INTO school_announcements (
      id, establishment_id, title, content, target_audience, category, author_id, author_name, is_published
    ) VALUES (
      'ANN-01', ?, 'Réunion solennelle des parents d élèves de 3ème',
      'Chers parents, la direction vous convie ce samedi à 09h00 pour la présentation du programme d orientation et de préparation au BEPC 2027.',
      'PARENTS', 'EVENEMENT', 'USR-DG-01', 'Dr. Antoinette MOUKOKO', 1
    ),
    (
      'ANN-02', ?, 'Planning des devoirs surveillés communs du 1er Trimestre',
      'Les épreuves communes de Mathématiques et Français se tiendront du 18 au 22 novembre 2026. Révisions obligatoires.',
      'ALL', 'PEDAGOGIQUE', 'USR-DE-01', 'Prof. Patrice LOUBAKI', 1
    )
  `, [establishmentId, establishmentId]);

  // Abonnement
  run(`
    INSERT OR REPLACE INTO subscriptions (
      id, establishment_id, plan_name, status, max_students, max_users, expires_at
    ) VALUES (
      'SUB-001', ?, 'STANDARD', 'ACTIVE', 500, 50, '2027-09-30'
    )
  `, [establishmentId]);

  // Grilles tarifaires de référence configurées par le Promoteur (Partie II)
  run(`
    INSERT OR REPLACE INTO school_tariff_plans (
      id, establishment_id, academic_year, cycle_code, level_code, class_id,
      inscription_new_fee, reinscription_fee, monthly_tuition, months_count,
      payment_schedule, trimester_1_fee, trimester_2_fee, trimester_3_fee,
      annex_fees, annex_fees_details, annual_total_new, annual_total_old, is_active, updated_by
    ) VALUES 
    (
      'TRF-PRIM-01', ?, '2026-2027', 'PRIMAIRE', 'CP1', 'CLS-CP1-A',
      20000, 15000, 25000, 9, 'MENSUEL', 75000, 75000, 75000, 15000, 'Assurance scolaire & tenue d’uniforme',
      260000, 255000, 1, 'USR-PROM-01'
    ),
    (
      'TRF-COL-01', ?, '2026-2027', 'COLLEGE', '3ème', 'CLS-3EME-A',
      25000, 20000, 30000, 9, 'MENSUEL', 90000, 90000, 90000, 20000, 'Frais d’examen blanc BEPC & badge magnétique',
      315000, 310000, 1, 'USR-PROM-01'
    ),
    (
      'TRF-LYC-01', ?, '2026-2027', 'LYCEE', 'Terminale', 'CLS-TLE-D',
      35000, 25000, 40000, 9, 'MENSUEL', 120000, 120000, 120000, 25000, 'Frais de TP sciences physiques & livret scolaire',
      420000, 410000, 1, 'USR-PROM-01'
    )
  `, [establishmentId, establishmentId, establishmentId]);

  // Règles de pointage du personnel configurées par le Promoteur (Partie III)
  run(`
    INSERT OR REPLACE INTO staff_attendance_rules (
      id, establishment_id, work_start_time, work_end_time, tolerance_minutes,
      absence_deduction_rate_per_hour, overtime_hourly_bonus,
      checkin_mode_preschool_primary, checkin_mode_college_lycee, updated_by
    ) VALUES (
      'RULES-01', ?, '07:30', '17:30', 15, 2500, 3500, 'JOURNALIER', 'PAR_SEANCE', 'USR-PROM-01'
    )
  `, [establishmentId]);

  // Paramètres de rémunération configurés par le Promoteur (Partie IV)
  run(`
    INSERT OR REPLACE INTO staff_salary_parameters (
      id, establishment_id, user_id, wage_type, base_salary, hourly_rate,
      transport_allowance, responsibility_bonus, seniority_bonus, overtime_rate, active, updated_by
    ) VALUES 
    (
      'SAL-ENS-01', ?, 'USR-ENS-01', 'MENSUEL_FIXE', 180000, 3500, 25000, 15000, 10000, 4000, 1, 'USR-PROM-01'
    ),
    (
      'SAL-ENS-02', ?, 'USR-ENS-02', 'HORAIRE', 0, 3500, 20000, 10000, 5000, 4000, 1, 'USR-PROM-01'
    ),
    (
      'SAL-SURV-01', ?, 'USR-SURV-01', 'MENSUEL_FIXE', 140000, 0, 20000, 0, 0, 3000, 1, 'USR-PROM-01'
    ),
    (
      'SAL-COMPT-01', ?, 'USR-COMPT-01', 'MENSUEL_FIXE', 170000, 0, 25000, 10000, 5000, 3500, 1, 'USR-PROM-01'
    )
  `, [establishmentId, establishmentId, establishmentId, establishmentId]);

  saveDb();
}
