import fs from 'fs';
import path from 'path';
import { getDb, queryAll } from '../src/server/db.ts';
import {
  checkDocExists,
  setDocData,
  getDocData
} from '../src/server/firestore_db.ts';

interface TableStats {
  table: string;
  sqliteCount: number;
  migrated: number;
  skippedExists: number;
  failed: number;
  verified: number;
}

async function migrateAllData() {
  console.log('========================================================================');
  console.log('   ECO GES — MIGRATION AUTOMATISÉE ET SÉCURISÉE VERS FIRESTORE');
  console.log('========================================================================\n');

  // 1. Contrôle préalable de la sauvegarde SQLite
  const backupFile = path.resolve(process.cwd(), 'data/faith_school.sqlite.bak');
  if (!fs.existsSync(backupFile)) {
    console.error('❌ ERREUR: Le fichier de sauvegarde data/faith_school.sqlite.bak est introuvable.');
    process.exit(1);
  }
  const backupStats = fs.statSync(backupFile);
  console.log(`✅ Sauvegarde intègre validée : data/faith_school.sqlite.bak (${backupStats.size} octets)\n`);

  await getDb();

  const allStats: TableStats[] = [];

  // Helper de migration par table
  async function migrateTable(
    tableName: string,
    getColPath: (row: any) => string,
    getId: (row: any) => string,
    transformRow?: (row: any) => any,
    extraSync?: (row: any, payload: any) => Promise<void>
  ) {
    let rows: any[] = [];
    try {
      rows = queryAll<any>(`SELECT * FROM ${tableName}`);
    } catch (err: any) {
      console.log(`ℹ️  Table ${tableName} inexistante ou vide dans SQLite.`);
      return;
    }

    const stats: TableStats = {
      table: tableName,
      sqliteCount: rows.length,
      migrated: 0,
      skippedExists: 0,
      failed: 0,
      verified: 0,
    };

    console.log(`▶️  Migration de [${tableName}] (${rows.length} lignes)...`);

    for (const row of rows) {
      const docId = getId(row);
      const colPath = getColPath(row);

      try {
        // Garde anti-écrasement
        const exists = await checkDocExists(colPath, docId);
        if (exists) {
          stats.skippedExists++;
          continue;
        }

        const payload = transformRow ? transformRow(row) : { ...row };
        payload.migrated_at = new Date().toISOString();
        payload.source_system = 'ECO_GES_SQLITE';

        await setDocData(colPath, docId, payload);

        if (extraSync) {
          await extraSync(row, payload);
        }

        // Vérification immédiate de relecture (Read-After-Write)
        const check = await getDocData(colPath, docId);
        if (check && (check.id === docId || check.code === docId || check[Object.keys(check)[0]])) {
          stats.migrated++;
          stats.verified++;
        } else {
          throw new Error('Relecture de vérification échouée');
        }
      } catch (err: any) {
        console.error(`   ❌ Échec pour [${tableName}] docId=${docId}: ${err.message || err}`);
        stats.failed++;
      }
    }

    allStats.push(stats);
    console.log(`   ✔️  Terminé : ${stats.migrated} migrés, ${stats.skippedExists} existants, ${stats.failed} échecs\n`);
  }

  // 1. Authorisations de création & licences Développeur
  await migrateTable(
    'creation_authorizations',
    () => 'creation_authorizations',
    r => r.id
  );

  // 2. Formules commerciales
  await migrateTable(
    'commercial_formulas',
    () => 'commercial_formulas',
    r => r.id
  );

  // 3. Subscriptions / Licences d'établissement
  await migrateTable(
    'subscriptions',
    () => 'subscriptions',
    r => r.id
  );

  // 4. Renouvellements de licences
  await migrateTable(
    'license_renewals',
    () => 'license_renewals',
    r => r.id
  );

  // 5. Référentiel Pédagogique National Officiel Congo
  await migrateTable(
    'pedagogical_references',
    () => 'pedagogical_references',
    r => r.id
  );

  // 6. Établissements (déjà migrés, protection anti-écrasement active)
  await migrateTable(
    'establishments',
    () => 'establishments',
    r => r.id,
    row => {
      let cycles = row.active_cycles;
      if (typeof cycles === 'string') {
        try { cycles = JSON.parse(cycles); } catch { cycles = [cycles]; }
      }
      return { ...row, active_cycles: Array.isArray(cycles) ? cycles : [] };
    }
  );

  // 7. Utilisateurs (enregistrés dans le tenant et dans l'index global pour auth rapide)
  await migrateTable(
    'users',
    r => `establishments/${r.establishment_id}/users`,
    r => r.id,
    row => row,
    async (row, payload) => {
      // Synchroniser également dans l'index global /users/{userId}
      await setDocData('users', row.id, payload);
    }
  );

  // 8. Classes
  await migrateTable(
    'classes',
    r => `establishments/${r.establishment_id}/classes`,
    r => r.id
  );

  // 9. Matières (Subjects)
  await migrateTable(
    'subjects',
    r => `establishments/${r.establishment_id}/subjects`,
    r => r.id
  );

  // 10. Matières par classe (Class-Subjects)
  await migrateTable(
    'class_subjects',
    r => {
      // Retrouver l'établissement à partir de la classe
      const cls = queryAll<any>('SELECT establishment_id FROM classes WHERE id = ?', [r.class_id]);
      const estId = cls[0]?.establishment_id || 'UNKNOWN';
      return `establishments/${estId}/class_subjects`;
    },
    r => r.id
  );

  // 11. Emplois du temps des enseignants
  await migrateTable(
    'teacher_schedules',
    r => {
      const cls = queryAll<any>('SELECT establishment_id FROM classes WHERE id = ?', [r.class_id]);
      const estId = cls[0]?.establishment_id || 'UNKNOWN';
      return `establishments/${estId}/teacher_schedules`;
    },
    r => r.id
  );

  // 12. Élèves (Students)
  await migrateTable(
    'students',
    r => `establishments/${r.establishment_id}/students`,
    r => r.id
  );

  // 13. Structures tarifaires
  await migrateTable(
    'fee_structures',
    r => `establishments/${r.establishment_id}/fee_structures`,
    r => r.id
  );

  // 14. Grilles tarifaires détaillées
  await migrateTable(
    'school_tariff_plans',
    r => `establishments/${r.establishment_id}/school_tariff_plans`,
    r => r.id
  );

  // 15. Paiements et Reçus
  await migrateTable(
    'payments',
    r => `establishments/${r.establishment_id}/payments`,
    r => r.id
  );

  // 16. Dépenses
  await migrateTable(
    'expenses',
    r => `establishments/${r.establishment_id}/expenses`,
    r => r.id
  );

  // 17. Évaluations
  await migrateTable(
    'evaluations',
    r => `establishments/${r.establishment_id}/evaluations`,
    r => r.id
  );

  // 18. Notes
  await migrateTable(
    'grades',
    r => {
      const ev = queryAll<any>('SELECT establishment_id FROM evaluations WHERE id = ?', [r.evaluation_id]);
      const estId = ev[0]?.establishment_id || 'UNKNOWN';
      return `establishments/${estId}/grades`;
    },
    r => r.id
  );

  // 19. Assiduité et présences des élèves
  await migrateTable(
    'student_attendances',
    r => `establishments/${r.establishment_id}/student_attendances`,
    r => r.id
  );

  // 20. Incidents disciplinaires
  await migrateTable(
    'disciplinary_incidents',
    r => `establishments/${r.establishment_id}/disciplinary_incidents`,
    r => r.id
  );

  // 21. Annonces scolaires
  await migrateTable(
    'school_announcements',
    r => `establishments/${r.establishment_id}/school_announcements`,
    r => r.id
  );

  // 22. Liens Parents-Élèves
  await migrateTable(
    'parent_students',
    r => {
      const st = queryAll<any>('SELECT establishment_id FROM students WHERE id = ?', [r.student_id]);
      const estId = st[0]?.establishment_id || 'UNKNOWN';
      return `establishments/${estId}/parent_students`;
    },
    r => r.id
  );

  // 23. Paie & Salaires
  await migrateTable(
    'payroll_records',
    r => `establishments/${r.establishment_id}/payroll_records`,
    r => r.id
  );

  // 24. Règles de pointage du personnel
  await migrateTable(
    'staff_attendance_rules',
    r => `establishments/${r.establishment_id}/staff_attendance_rules`,
    r => r.id
  );

  // 25. Paramètres de rémunération
  await migrateTable(
    'staff_salary_parameters',
    r => `establishments/${r.establishment_id}/staff_salary_parameters`,
    r => r.id
  );

  // 26. Cahier de texte (Lesson Logs)
  await migrateTable(
    'lesson_logs',
    r => `establishments/${r.establishment_id}/lesson_logs`,
    r => r.id
  );

  // 27. Pointage des enseignants
  await migrateTable(
    'teacher_attendances',
    r => `establishments/${r.establishment_id}/teacher_attendances`,
    r => r.id
  );

  // 28. Journal d'audit
  await migrateTable(
    'audit_logs',
    r => `establishments/${r.establishment_id}/audit_logs`,
    r => r.id
  );

  // Bilan récapitulatif
  console.log('========================================================================');
  console.log('              BILAN COMPLET DE LA MIGRATION VERS FIRESTORE');
  console.log('========================================================================');
  console.table(allStats);

  const totalSqlite = allStats.reduce((acc, s) => acc + s.sqliteCount, 0);
  const totalMigrated = allStats.reduce((acc, s) => acc + s.migrated, 0);
  const totalSkipped = allStats.reduce((acc, s) => acc + s.skippedExists, 0);
  const totalFailed = allStats.reduce((acc, s) => acc + s.failed, 0);
  const totalVerified = allStats.reduce((acc, s) => acc + s.verified, 0);

  console.log('------------------------------------------------------------------------');
  console.log(`TOTAL Enregistrements SQLite : ${totalSqlite}`);
  console.log(`TOTAL Migrés dans Firestore  : ${totalMigrated}`);
  console.log(`TOTAL Déjà existants         : ${totalSkipped}`);
  console.log(`TOTAL Échecs                 : ${totalFailed}`);
  console.log(`TOTAL Validés par relecture  : ${totalVerified}`);
  console.log('========================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

migrateAllData().catch((err) => {
  console.error('Erreur globale migration:', err);
  process.exit(1);
});
