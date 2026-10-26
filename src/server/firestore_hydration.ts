import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from './firestore_db.ts';
import initSqlJs from 'sql.js';
type Database = any;
import { saveDb } from './db.ts';

export async function hydrateSqliteFromFirestore(sqliteDb: Database): Promise<void> {
  try {
    console.log('[Hydration] Début de la synchronisation Firestore -> SQLite...');

    // 1. Synchroniser les établissements
    const estRef = collection(firestoreDb, 'establishments');
    const estSnap = await getDocs(estRef);
    
    for (const estDoc of estSnap.docs) {
      const d = estDoc.data();
      try {
        sqliteDb.run(
          `INSERT OR REPLACE INTO establishments (
            id, name, code, country, city, address, phone, email, motto,
            academic_year, currency, active_cycles, logo_url, created_at,
            status, activated_at, suspended_at, suspension_reason, suspended_by,
            deleted_at, deletion_reason, auth_code_used, promoter_id, promoter_name,
            promoter_email, promoter_phone
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            d.id || estDoc.id,
            d.name || '',
            d.code || '',
            d.country || 'Congo-Brazzaville',
            d.city || 'Brazzaville',
            d.address || null,
            d.phone || null,
            d.email || null,
            d.motto || null,
            d.academic_year || '2025-2026',
            d.currency || 'FCFA',
            typeof d.active_cycles === 'string' ? d.active_cycles : JSON.stringify(d.active_cycles || []),
            d.logo_url || null,
            d.created_at || new Date().toISOString(),
            d.status || 'ACTIVE',
            d.activated_at || null,
            d.suspended_at || null,
            d.suspension_reason || null,
            d.suspended_by || null,
            d.deleted_at || null,
            d.deletion_reason || null,
            d.auth_code_used || null,
            d.promoter_id || null,
            d.promoter_name || null,
            d.promoter_email || null,
            d.promoter_phone || null
          ]
        );

        // Synchroniser les sous-collections de l'établissement
        const subCollections = [
          'users', 'students', 'classes', 'subjects', 'class_subjects',
          'payments', 'fee_structures', 'school_tariff_plans', 'evaluations',
          'grades', 'student_attendances', 'teacher_attendances',
          'disciplinary_incidents', 'payroll_records', 'lesson_logs',
          'school_announcements', 'parent_students', 'audit_logs'
        ];

        for (const subCol of subCollections) {
          try {
            const subRef = collection(firestoreDb, `establishments/${estDoc.id}/${subCol}`);
            const subSnap = await getDocs(subRef);
            for (const subDoc of subSnap.docs) {
              const sd = subDoc.data();
              if (subCol === 'users') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO users (
                    id, establishment_id, username, email, password_hash,
                    full_name, phone, role, status, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.username || '',
                    sd.email || null,
                    sd.password_hash || 'PENDING_SYNC',
                    sd.full_name || '',
                    sd.phone || null,
                    sd.role || 'PROMOTEUR',
                    sd.status || 'ACTIVE',
                    sd.created_at || new Date().toISOString(),
                    sd.updated_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'students') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO students (
                    id, establishment_id, matricule, first_name, last_name, post_name,
                    gender, birth_date, birth_place, address, guardian_name, guardian_phone,
                    guardian_email, guardian_relation, class_id, academic_year, status,
                    photo_data, enrollment_date, notes, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.matricule || '',
                    sd.first_name || '',
                    sd.last_name || '',
                    sd.post_name || null,
                    sd.gender || 'M',
                    sd.birth_date || '2010-01-01',
                    sd.birth_place || null,
                    sd.address || null,
                    sd.guardian_name || '',
                    sd.guardian_phone || '',
                    sd.guardian_email || null,
                    sd.guardian_relation || 'Parent',
                    sd.class_id || null,
                    sd.academic_year || '2025-2026',
                    sd.status || 'INSCRIT',
                    sd.photo_data || null,
                    sd.enrollment_date || new Date().toISOString(),
                    sd.notes || null,
                    sd.created_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'classes') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO classes (
                    id, establishment_id, academic_year, name, cycle_code,
                    level_code, serie_code, room, capacity, status, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.academic_year || '2025-2026',
                    sd.name || '',
                    sd.cycle_code || 'COLLEGE',
                    sd.level_code || '6ème',
                    sd.serie_code || null,
                    sd.room || null,
                    sd.capacity || 40,
                    sd.status || 'ACTIVE',
                    sd.created_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'payments') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO payments (
                    id, establishment_id, receipt_number, student_id, fee_structure_id,
                    payment_type, amount, payment_method, transaction_reference, notes,
                    cashier_id, cashier_name, status, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.receipt_number || 'REC-000',
                    sd.student_id || '',
                    sd.fee_structure_id || null,
                    sd.payment_type || 'FRAIS_MENSUELS',
                    sd.amount || 0,
                    sd.payment_method || 'ESPECES',
                    sd.transaction_reference || null,
                    sd.notes || null,
                    sd.cashier_id || '',
                    sd.cashier_name || '',
                    sd.status || 'VALIDE',
                    sd.created_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'school_tariff_plans') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO school_tariff_plans (
                    id, establishment_id, academic_year, cycle_code, level_code,
                    inscription_new_fee, reinscription_fee, monthly_tuition, months_count,
                    payment_schedule, annual_total_new, annual_total_old, updated_by, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.academic_year || '2025-2026',
                    sd.cycle_code || 'COLLEGE',
                    sd.level_code || null,
                    sd.inscription_new_fee || 0,
                    sd.reinscription_fee || 0,
                    sd.monthly_tuition || 0,
                    sd.months_count || 9,
                    sd.payment_schedule || 'MENSUEL',
                    sd.annual_total_new || 0,
                    sd.annual_total_old || 0,
                    sd.updated_by || 'SYSTEM',
                    sd.updated_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'subjects') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO subjects (
                    id, establishment_id, code, name, cycle_code, default_coefficient, level_code, serie_code, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.code || '',
                    sd.name || '',
                    sd.cycle_code || 'COLLEGE',
                    sd.default_coefficient || 1.0,
                    sd.level_code || null,
                    sd.serie_code || null,
                    sd.created_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'class_subjects') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO class_subjects (
                    id, class_id, subject_id, teacher_id, coefficient, weekly_hours
                  ) VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.class_id || '',
                    sd.subject_id || '',
                    sd.teacher_id || null,
                    sd.coefficient || 1.0,
                    sd.weekly_hours || 2.0
                  ]
                );
              } else if (subCol === 'teacher_schedules') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO teacher_schedules (
                    id, establishment_id, teacher_id, class_id, subject_id, day_of_week, start_time, end_time, room
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.teacher_id || '',
                    sd.class_id || '',
                    sd.subject_id || '',
                    sd.day_of_week || 1,
                    sd.start_time || '08:00',
                    sd.end_time || '10:00',
                    sd.room || null
                  ]
                );
              } else if (subCol === 'evaluations') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO evaluations (
                    id, establishment_id, class_id, subject_id, academic_year, term,
                    eval_type, title, date, max_score, coefficient, is_locked, created_by, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.class_id || '',
                    sd.subject_id || '',
                    sd.academic_year || '2025-2026',
                    sd.term || 'TRIMESTRE_1',
                    sd.eval_type || 'DEVOIR',
                    sd.title || '',
                    sd.date || new Date().toISOString().split('T')[0],
                    sd.max_score || 20.0,
                    sd.coefficient || 1.0,
                    sd.is_locked || 0,
                    sd.created_by || 'SYSTEM',
                    sd.created_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'grades') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO grades (
                    id, evaluation_id, student_id, score, is_absent, remarks, updated_by, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.evaluation_id || '',
                    sd.student_id || '',
                    sd.score !== undefined ? sd.score : null,
                    sd.is_absent ? 1 : 0,
                    sd.remarks || null,
                    sd.updated_by || 'SYSTEM',
                    sd.updated_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'student_attendances') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO student_attendances (
                    id, establishment_id, student_id, class_id, date, status, is_justified, justification_reason, recorded_by, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.student_id || '',
                    sd.class_id || '',
                    sd.date || new Date().toISOString().split('T')[0],
                    sd.status || 'PRESENT',
                    sd.is_justified ? 1 : 0,
                    sd.justification_reason || null,
                    sd.recorded_by || 'SYSTEM',
                    sd.created_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'parent_students') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO parent_students (
                    id, parent_user_id, student_id, relation, created_at
                  ) VALUES (?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.parent_user_id || '',
                    sd.student_id || '',
                    sd.relation || 'Parent',
                    sd.created_at || new Date().toISOString()
                  ]
                );
              }
            }
          } catch (subErr) {
            // Ignorer sous-collections vides
          }
        }
      } catch (estErr) {
        console.error(`[Hydration] Erreur establishment ${estDoc.id}:`, estErr);
      }
    }

    // 2. Synchroniser les utilisateurs globaux
    const usersRef = collection(firestoreDb, 'users');
    const usersSnap = await getDocs(usersRef);
    for (const uDoc of usersSnap.docs) {
      const ud = uDoc.data();
      try {
        sqliteDb.run(
          `INSERT OR REPLACE INTO users (
            id, establishment_id, username, email, password_hash,
            full_name, phone, role, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ud.id || uDoc.id,
            ud.establishment_id || 'EST-ECO-HQ',
            ud.username || '',
            ud.email || null,
            ud.password_hash || 'PENDING_SYNC',
            ud.full_name || '',
            ud.phone || null,
            ud.role || 'PROMOTEUR',
            ud.status || 'ACTIVE',
            ud.created_at || new Date().toISOString(),
            ud.updated_at || new Date().toISOString()
          ]
        );
      } catch {}
    }

    saveDb();
    console.log('[Hydration] Synchronisation Firestore -> SQLite terminée avec succès.');
  } catch (err) {
    console.error('[Hydration] Erreur générale lors de la synchronisation Firestore -> SQLite:', err);
  }
}
