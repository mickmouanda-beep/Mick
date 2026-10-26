import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function verifyAndPrepareDownloads() {
  console.log('=== VÉRIFICATION ET PRÉPARATION DES COPIES DE SÉCURITÉ ===');
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  const exportDir = path.resolve(process.cwd(), 'public', 'downloads');

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const sqliteOriginal = path.join(backupDir, 'faith_school.sqlite.backup_2026-10-24T13-05-07-189Z');
  const jsonOriginal = path.join(backupDir, 'firestore_backup_2026-10-24T13-05-07-189Z.json');

  if (!fs.existsSync(sqliteOriginal) || !fs.existsSync(jsonOriginal)) {
    console.error('ERREUR: Un ou plusieurs fichiers originaux de sauvegarde sont introuvables.');
    process.exit(1);
  }

  // Calcul SQLite
  const sqliteBuffer = fs.readFileSync(sqliteOriginal);
  const sqliteStats = fs.statSync(sqliteOriginal);
  const sqliteHash = crypto.createHash('sha256').update(sqliteBuffer).digest('hex');

  // Calcul JSON
  const jsonBuffer = fs.readFileSync(jsonOriginal);
  const jsonStats = fs.statSync(jsonOriginal);
  const jsonHash = crypto.createHash('sha256').update(jsonBuffer).digest('hex');

  console.log('--- Fichier SQLite ---');
  console.log(`Chemin : ${sqliteOriginal}`);
  console.log(`Taille : ${sqliteStats.size} octets`);
  console.log(`SHA-256 : ${sqliteHash}`);

  console.log('--- Fichier JSON Firestore ---');
  console.log(`Chemin : ${jsonOriginal}`);
  console.log(`Taille : ${jsonStats.size} octets`);
  console.log(`SHA-256 : ${jsonHash}`);

  // Copie vers public/downloads pour permettre un accès HTTP direct sécurisé et téléchargeable via le navigateur mobile
  const sqliteCopy = path.join(exportDir, 'faith_school.sqlite.backup');
  const jsonCopy = path.join(exportDir, 'firestore_backup.json');

  fs.copyFileSync(sqliteOriginal, sqliteCopy);
  fs.copyFileSync(jsonOriginal, jsonCopy);

  console.log('Copies de téléchargement préparées avec succès dans /public/downloads/');
}

verifyAndPrepareDownloads().catch(console.error);
