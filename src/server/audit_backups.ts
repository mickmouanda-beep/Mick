import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import initSqlJs from 'sql.js';

async function auditBackups() {
  console.log('=== AUDIT COMPLÉMENTAIRE DES SAUVEGARDES (LECTURE SEULE) ===');
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    console.log('Dossier de sauvegarde introuvable.');
    return;
  }

  const files = fs.readdirSync(backupDir);
  console.log('Fichiers trouvés dans /data/backups :', files);

  for (const file of files) {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const sha256 = hashSum.digest('hex');

    console.log(`\n--- Fichier : ${file} ---`);
    console.log(`Chemin exact : ${filePath}`);
    console.log(`Date de création : ${stats.birthtime.toISOString()}`);
    console.log(`Taille réelle : ${stats.size} octets`);
    console.log(`Empreinte SHA-256 : ${sha256}`);

    // Si c'est un SQLite backup
    if (file.endsWith('.sqlite') || file.includes('.sqlite.backup_')) {
      try {
        const SQL = await initSqlJs();
        const db = new SQL.Database(fileBuffer);
        
        const getCount = (tbl: string) => {
          try {
            const res = db.exec(`SELECT COUNT(*) FROM ${tbl};`);
            return res[0]?.values[0]?.[0] || 0;
          } catch {
            return 'Table absente';
          }
        };

        console.log('  [SQLite Counts]:');
        console.log(`   - establishments : ${getCount('establishments')}`);
        console.log(`   - users : ${getCount('users')}`);
        console.log(`   - students : ${getCount('students')}`);
        console.log(`   - classes : ${getCount('classes')}`);
        console.log(`   - payments : ${getCount('payments')}`);
        console.log(`   - school_tariff_plans : ${getCount('school_tariff_plans')}`);
        db.close();
      } catch (e) {
        console.log('  Erreur lecture SQLite:', e);
      }
    }

    // Si c'est un Firestore JSON backup
    if (file.endsWith('.json')) {
      try {
        const jsonContent = JSON.parse(fileBuffer.toString('utf-8'));
        console.log('  [Firestore JSON Summary]:');
        console.log(`   - Exported At : ${jsonContent.exportedAt}`);
        console.log(`   - Project ID : ${jsonContent.projectId}`);
        if (jsonContent.collections) {
          for (const colName of Object.keys(jsonContent.collections)) {
            const docs = jsonContent.collections[colName];
            const docKeys = Object.keys(docs);
            console.log(`   - Collection racine '${colName}' : ${docKeys.length} documents`);
            if (colName === 'establishments') {
              let totalSubDocs = 0;
              for (const estId of docKeys) {
                const subcols = docs[estId].subcollections || {};
                for (const subName of Object.keys(subcols)) {
                  totalSubDocs += Object.keys(subcols[subName]).length;
                }
              }
              console.log(`     -> Total documents dans sous-collections d'établissements : ${totalSubDocs}`);
            }
          }
        }
      } catch (e) {
        console.log('  Erreur lecture JSON Firestore:', e);
      }
    }
  }
}

auditBackups().catch(console.error);
