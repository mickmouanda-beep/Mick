import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import {
  db,
  checkDocExists,
  setDocData
} from '../src/server/firestore_db.ts';

async function runMigration() {
  console.log('=== DÉBUT DE LA MIGRATION SOUVERAINE SQLITE -> FIRESTORE ===');

  const dbPath = path.resolve(process.cwd(), 'data/faith_school.sqlite');
  if (!fs.existsSync(dbPath)) {
    console.log('Aucun fichier SQLite trouvé sur disque. Rien à migrer.');
    return;
  }

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(dbPath);
  const sqliteDb = new SQL.Database(fileBuffer);

  const queryAll = (sql: string, params: any[] = []): any[] => {
    try {
      const stmt = sqliteDb.prepare(sql);
      stmt.bind(params);
      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } catch (e) {
      return [];
    }
  };

  const report = {
    establishmentsFound: 0,
    establishmentsMigrated: 0,
    usersFound: 0,
    usersMigrated: 0,
    studentsFound: 0,
    studentsMigrated: 0,
    classesFound: 0,
    classesMigrated: 0,
    subjectsFound: 0,
    subjectsMigrated: 0,
    paymentsFound: 0,
    paymentsMigrated: 0,
    schedulesFound: 0,
    schedulesMigrated: 0,
    creationAuthorizationsFound: 0,
    creationAuthorizationsMigrated: 0,
  };

  // 1. Établissements
  const establishments = queryAll('SELECT * FROM establishments');
  report.establishmentsFound = establishments.length;
  console.log(`[Migration] ${establishments.length} établissements trouvés dans SQLite.`);

  for (const est of establishments) {
    const exists = await checkDocExists('establishments', est.id);
    if (!exists) {
      let activeCycles = [];
      try {
        activeCycles = typeof est.active_cycles === 'string' ? JSON.parse(est.active_cycles) : est.active_cycles;
      } catch {
        activeCycles = ['PRE_SCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'];
      }
      await setDocData('establishments', est.id, {
        ...est,
        active_cycles: activeCycles
      });
      report.establishmentsMigrated++;
      console.log(`+ Migré établissement : ${est.name} (${est.id})`);
    } else {
      console.log(`= Établissement déjà présent dans Firestore : ${est.name} (${est.id})`);
    }

    // 2. Utilisateurs par établissement
    const users = queryAll('SELECT * FROM users WHERE establishment_id = ?', [est.id]);
    report.usersFound += users.length;
    for (const u of users) {
      const tenantPath = `establishments/${est.id}/users`;
      const tenantExists = await checkDocExists(tenantPath, u.id);
      if (!tenantExists) {
        await setDocData(tenantPath, u.id, u);
        await setDocData('users', u.id, u);
        report.usersMigrated++;
        console.log(`  + Migré utilisateur : ${u.username} (${u.role})`);
      }
      // Index global users
      const globalExists = await checkDocExists('users', u.id);
      if (!globalExists) {
        await setDocData('users', u.id, u);
      }
    }

    // 3. Élèves par établissement
    const students = queryAll('SELECT * FROM students WHERE establishment_id = ?', [est.id]);
    report.studentsFound += students.length;
    for (const s of students) {
      const path = `establishments/${est.id}/students`;
      const exists = await checkDocExists(path, s.id);
      if (!exists) {
        await setDocData(path, s.id, s);
        report.studentsMigrated++;
      }
    }

    // 4. Classes
    const classes = queryAll('SELECT * FROM classes WHERE establishment_id = ?', [est.id]);
    report.classesFound += classes.length;
    for (const c of classes) {
      const path = `establishments/${est.id}/classes`;
      const exists = await checkDocExists(path, c.id);
      if (!exists) {
        await setDocData(path, c.id, c);
        report.classesMigrated++;
      }
    }

    // 5. Matières
    const subjects = queryAll('SELECT * FROM subjects WHERE establishment_id = ?', [est.id]);
    report.subjectsFound += subjects.length;
    for (const sub of subjects) {
      const path = `establishments/${est.id}/subjects`;
      const exists = await checkDocExists(path, sub.id);
      if (!exists) {
        await setDocData(path, sub.id, sub);
        report.subjectsMigrated++;
      }
    }

    // 6. Paiements
    const payments = queryAll('SELECT * FROM payments WHERE establishment_id = ?', [est.id]);
    report.paymentsFound += payments.length;
    for (const p of payments) {
      const path = `establishments/${est.id}/payments`;
      const exists = await checkDocExists(path, p.id);
      if (!exists) {
        await setDocData(path, p.id, p);
        report.paymentsMigrated++;
      }
    }

    // 7. Emplois du temps
    const schedules = queryAll('SELECT * FROM teacher_schedules WHERE establishment_id = ?', [est.id]);
    report.schedulesFound += schedules.length;
    for (const sched of schedules) {
      const path = `establishments/${est.id}/teacher_schedules`;
      const exists = await checkDocExists(path, sched.id);
      if (!exists) {
        await setDocData(path, sched.id, sched);
        report.schedulesMigrated++;
      }
    }
  }

  // 8. Codes d'autorisation
  const authCodes = queryAll('SELECT * FROM creation_authorizations');
  report.creationAuthorizationsFound = authCodes.length;
  for (const ac of authCodes) {
    const exists = await checkDocExists('creation_authorizations', ac.id);
    if (!exists) {
      await setDocData('creation_authorizations', ac.id, ac);
      report.creationAuthorizationsMigrated++;
    }
  }

  console.log('\n================ RAPPORT FINAL DE MIGRATION ================');
  console.log(`Établissements : ${report.establishmentsMigrated} migrés / ${report.establishmentsFound} existants en SQLite`);
  console.log(`Utilisateurs   : ${report.usersMigrated} migrés / ${report.usersFound} existants en SQLite`);
  console.log(`Élèves         : ${report.studentsMigrated} migrés / ${report.studentsFound} existants en SQLite`);
  console.log(`Classes        : ${report.classesMigrated} migrées / ${report.classesFound} existantes en SQLite`);
  console.log(`Matières       : ${report.subjectsMigrated} migrées / ${report.subjectsFound} existantes en SQLite`);
  console.log(`Paiements      : ${report.paymentsMigrated} migrés / ${report.paymentsFound} existants en SQLite`);
  console.log(`Emplois temps  : ${report.schedulesMigrated} migrés / ${report.schedulesFound} existants en SQLite`);
  console.log(`Codes Auth     : ${report.creationAuthorizationsMigrated} migrés / ${report.creationAuthorizationsFound} existants en SQLite`);
  console.log('============================================================\n');

  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Erreur fatale lors de la migration:', err);
  process.exit(1);
});
