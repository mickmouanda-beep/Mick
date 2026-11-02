import { db as firestoreDb } from './firestore_db.ts';
type Database = any;

export async function hydrateSqliteFromFirestore(sqliteDb: Database): Promise<void> {
  try {
    console.log('[Hydration] Début de la synchronisation Firestore -> SQLite...');

    // 1. Synchroniser les établissements
    const estSnap = await firestoreDb.collection('establishments').get();
    
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
          'school_announcements', 'parent_students', 'audit_logs', 'teacher_schedules'
        ];

        for (const subCol of subCollections) {
          try {
            const subSnap = await firestoreDb.collection(`establishments/${estDoc.id}/${subCol}`).get();
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
                    sd.birth_place || '',
                    sd.address || null,
                    sd.guardian_name || null,
                    sd.guardian_phone || null,
                    sd.guardian_email || null,
                    sd.guardian_relation || null,
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
                    id, establishment_id, academic_year, name, cycle_code, level_code,
                    serie_code, room, capacity, main_teacher_id, status
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
                    sd.main_teacher_id || null,
                    sd.status || 'ACTIVE'
                  ]
                );
              } else if (subCol === 'subjects') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO subjects (
                    id, establishment_id, class_id, name, code, coefficient, teacher_id
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.class_id || null,
                    sd.name || '',
                    sd.code || '',
                    sd.coefficient || 1,
                    sd.teacher_id || null
                  ]
                );
              } else if (subCol === 'payments') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO payments (
                    id, establishment_id, student_id, amount, amount_in_words, payment_date,
                    payment_type, payment_method, reference, cashier_id, academic_year, status,
                    cancellation_reason, cancelled_at, cancelled_by, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.student_id || '',
                    sd.amount || 0,
                    sd.amount_in_words || '',
                    sd.payment_date || new Date().toISOString(),
                    sd.payment_type || 'FRAIS_MENSUELS',
                    sd.payment_method || 'ESPECES',
                    sd.reference || null,
                    sd.cashier_id || null,
                    sd.academic_year || '2025-2026',
                    sd.status || 'VALIDE',
                    sd.cancellation_reason || null,
                    sd.cancelled_at || null,
                    sd.cancelled_by || null,
                    sd.created_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'fee_structures') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO fee_structures (
                    id, establishment_id, cycle_code, level_code, fee_type, total_amount, due_date
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.cycle_code || 'COLLEGE',
                    sd.level_code || '6ème',
                    sd.fee_type || 'INSCRIPTION',
                    sd.total_amount || 0,
                    sd.due_date || null
                  ]
                );
              } else if (subCol === 'teacher_schedules') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO teacher_schedules (
                    id, teacher_id, class_id, subject_id, day_of_week, start_time,
                    end_time, room, establishment_id, is_published, academic_year, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.teacher_id || '',
                    sd.class_id || '',
                    sd.subject_id || '',
                    sd.day_of_week || 1,
                    sd.start_time || '08:00',
                    sd.end_time || '10:00',
                    sd.room || null,
                    sd.establishment_id || estDoc.id,
                    sd.is_published !== undefined ? sd.is_published : 1,
                    sd.academic_year || '2025-2026',
                    sd.updated_at || new Date().toISOString()
                  ]
                );
              } else if (subCol === 'evaluations') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO evaluations (
                    id, establishment_id, class_id, subject_id, title, eval_type,
                    max_score, weight, eval_date, academic_year, locked
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.class_id || '',
                    sd.subject_id || '',
                    sd.title || '',
                    sd.eval_type || 'INTERROGATION',
                    sd.max_score || 20,
                    sd.weight || 1,
                    sd.eval_date || new Date().toISOString(),
                    sd.academic_year || '2025-2026',
                    sd.locked || 0
                  ]
                );
              } else if (subCol === 'grades') {
                sqliteDb.run(
                  `INSERT OR REPLACE INTO grades (
                    id, establishment_id, evaluation_id, student_id, score, comments
                  ) VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    sd.id || subDoc.id,
                    sd.establishment_id || estDoc.id,
                    sd.evaluation_id || '',
                    sd.student_id || '',
                    sd.score || 0,
                    sd.comments || null
                  ]
                );
              }
            }
          } catch (subErr: any) {
            if (subErr?.code === 7 || String(subErr?.message || subErr).includes('PERMISSION_DENIED')) {
              console.error(`[Hydration FATAL] PERMISSION_DENIED sur sous-collection establishments/${estDoc.id}/${subCol}:`, JSON.stringify(subErr, Object.getOwnPropertyNames(subErr)));
              throw subErr;
            }
          }
        }
      } catch (estErr: any) {
        if (estErr?.code === 7 || String(estErr?.message || estErr).includes('PERMISSION_DENIED')) {
          console.error(`[Hydration FATAL] PERMISSION_DENIED sur etablissement ${estDoc.id}:`, JSON.stringify(estErr, Object.getOwnPropertyNames(estErr)));
          throw estErr;
        }
      }
    }

    // 2. Synchroniser les utilisateurs globaux
    const usersSnap = await firestoreDb.collection('users').get();
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
            ud.establishment_id || 'ECO-HQ',
            ud.username || '',
            ud.email || null,
            ud.password_hash || 'PENDING_SYNC',
            ud.full_name || '',
            ud.phone || null,
            ud.role || 'ADMIN_GENERAL',
            ud.status || 'ACTIVE',
            ud.created_at || new Date().toISOString(),
            ud.updated_at || new Date().toISOString()
          ]
        );
      } catch (uErr: any) {
        console.error(`[Hydration] Erreur insertion utilisateur ${uDoc.id}:`, uErr);
      }
    }

    console.log('[Hydration] Synchronisation Firestore -> SQLite terminée avec succès.');
  } catch (err: any) {
    const fullSerialized = JSON.stringify(err, Object.getOwnPropertyNames(err));
    console.error('[Hydration FATAL] Erreur globale de hydratation Firestore (aucun repli silencieux):', fullSerialized);
    throw err;
  }
}
