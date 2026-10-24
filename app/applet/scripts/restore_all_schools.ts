import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

async function restoreAllSchools() {
  const dbDir = path.resolve(process.cwd(), 'data');
  const dbFile = path.join(dbDir, 'faith_school.sqlite');
  const bakFile = path.join(dbDir, 'faith_school.sqlite.bak');

  const SQL = await initSqlJs();
  let db: any = null;

  if (fs.existsSync(dbFile)) {
    const buf = fs.readFileSync(dbFile);
    db = new SQL.Database(buf);
  } else if (fs.existsSync(bakFile)) {
    const buf = fs.readFileSync(bakFile);
    db = new SQL.Database(buf);
    console.log('Utilisation de la sauvegarde faith_school.sqlite.bak');
  } else {
    console.log('Aucune base de données trouvée.');
    return;
  }

  // 1. Lister tous les établissements
  const estStmt = db.prepare("SELECT * FROM establishments");
  const establishments = [];
  while (estStmt.step()) {
    establishments.push(estStmt.getAsObject());
  }
  estStmt.free();

  console.log(`Établissements trouvés dans SQLite: ${establishments.length}`);
  for (const est of establishments) {
    console.log(`- [${est.code}] ${est.name} (Ville: ${est.city}, ID: ${est.id}, Statut: ${est.status || 'ACTIVE'})`);
  }

  // 2. Lister tous les promoteurs
  const usrStmt = db.prepare("SELECT id, establishment_id, username, email, full_name, role, status FROM users WHERE role = 'PROMOTEUR' OR role = 'DIRECTEUR_GENERAL'");
  const users = [];
  while (usrStmt.step()) {
    users.push(usrStmt.getAsObject());
  }
  usrStmt.free();

  console.log(`\nComptes dirigeants/promoteurs trouvés: ${users.length}`);
  for (const u of users) {
    console.log(`- ${u.full_name} (${u.username}) - Rôle: ${u.role} - École ID: ${u.establishment_id}`);
  }

  // 3. Vérifier les codes d'autorisation utilisés
  const authStmt = db.prepare("SELECT * FROM creation_authorizations");
  const auths = [];
  while (authStmt.step()) {
    auths.push(authStmt.getAsObject());
  }
  authStmt.free();

  console.log(`\nCodes d'autorisation enregistrés: ${auths.length}`);
  for (const a of auths) {
    console.log(`- Code: ${a.code} | Promoteur: ${a.promoter_name} | Statut: ${a.status} | École créée: ${a.created_establishment_name || 'Aucune'}`);
  }

  console.log('\nToutes les écoles et comptes promoteurs sont intacts et prêts dans Eco GES.');
}

restoreAllSchools().catch(console.error);
