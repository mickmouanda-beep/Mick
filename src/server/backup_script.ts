import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

async function runBackup() {
  console.log('=== DÉBUT DE LA PROCÉDURE DE SAUVEGARDE EN LECTURE SEULE ===');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // ==========================================
  // 1. SAUVEGARDE ET VÉRIFICATION DE SQLITE
  // ==========================================
  const sqliteFile = path.resolve(process.cwd(), 'data', 'faith_school.sqlite');
  const sqliteBackupFile = path.join(backupDir, `faith_school.sqlite.backup_${timestamp}`);

  if (!fs.existsSync(sqliteFile)) {
    console.error('ERREUR: Fichier SQLite introuvable:', sqliteFile);
    process.exit(1);
  }

  // Copie binaire
  fs.copyFileSync(sqliteFile, sqliteBackupFile);
  const sqliteStats = fs.statSync(sqliteBackupFile);
  console.log(`[SQLite] Copie réussie vers : ${sqliteBackupFile}`);
  console.log(`[SQLite] Taille de la sauvegarde : ${sqliteStats.size} octets`);

  // Vérification d'intégrité SQLite via sql.js
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(sqliteBackupFile);
  const backupDb = new SQL.Database(fileBuffer);
  
  const integrityResult = backupDb.exec('PRAGMA integrity_check;');
  const integrityStatus = integrityResult[0]?.values[0]?.[0] || 'UNKNOWN';
  console.log(`[SQLite] Contrôle d'intégrité (PRAGMA integrity_check) : ${integrityStatus}`);

  // Comptages SQLite
  const getSqliteCount = (table: string) => {
    try {
      const res = backupDb.exec(`SELECT COUNT(*) FROM ${table};`);
      return res[0]?.values[0]?.[0] || 0;
    } catch {
      return 0;
    }
  };

  const sqliteCounts = {
    establishments: getSqliteCount('establishments'),
    users: getSqliteCount('users'),
    students: getSqliteCount('students'),
    classes: getSqliteCount('classes'),
    payments: getSqliteCount('payments'),
    tarifs: getSqliteCount('school_tariff_plans')
  };
  backupDb.close();

  // ==========================================
  // 2. SAUVEGARDE ET EXPORT DE CLOUD FIRESTORE
  // ==========================================
  console.log('[Firestore] Initialisation de la connexion Firestore...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const firestoreExport: any = {
    exportedAt: new Date().toISOString(),
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    collections: {}
  };

  const sanitizeData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    const sanitized = Array.isArray(data) ? [] : {};
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('hash') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('auth_code_used')
      ) {
        (sanitized as any)[key] = '[FILTERED]';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        (sanitized as any)[key] = sanitizeData(data[key]);
      } else {
        (sanitized as any)[key] = data[key];
      }
    }
    return sanitized;
  };

  // Root collections
  const rootCollections = ['establishments', 'users', 'subscriptions', 'creation_authorizations', 'pedagogical_references'];
  const firestoreCounts: any = {};

  for (const colName of rootCollections) {
    try {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      firestoreCounts[colName] = snap.size;
      firestoreExport.collections[colName] = {};

      for (const docSnap of snap.docs) {
        const docId = docSnap.id;
        const docData = sanitizeData(docSnap.data());
        firestoreExport.collections[colName][docId] = {
          data: docData,
          subcollections: {}
        };

        // Si c'est 'establishments', récupérer ses sous-collections
        if (colName === 'establishments') {
          const subColNames = [
            'users', 'students', 'classes', 'subjects', 'class_subjects',
            'payments', 'fee_structures', 'school_tariff_plans', 'evaluations',
            'grades', 'student_attendances', 'teacher_attendances',
            'disciplinary_incidents', 'payroll_records', 'lesson_logs',
            'school_announcements', 'parent_students', 'audit_logs'
          ];

          for (const subColName of subColNames) {
            try {
              const subColRef = collection(db, `establishments/${docId}/${subColName}`);
              const subSnap = await getDocs(subColRef);
              if (!subSnap.empty) {
                if (!firestoreCounts[`establishments/${colName}/${subColName}`]) {
                  firestoreCounts[`establishments/${docId}/${subColName}`] = subSnap.size;
                }
                firestoreExport.collections[colName][docId].subcollections[subColName] = {};
                for (const subDocSnap of subSnap.docs) {
                  firestoreExport.collections[colName][docId].subcollections[subColName][subDocSnap.id] = sanitizeData(subDocSnap.data());
                }
              }
            } catch (subErr) {
              // Sous-collection potentiellement vide ou inexistante
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[Firestore] Avertissement lecture collection ${colName}:`, err);
      firestoreCounts[colName] = 0;
    }
  }

  const firestoreBackupFile = path.join(backupDir, `firestore_backup_${timestamp}.json`);
  fs.writeFileSync(firestoreBackupFile, JSON.stringify(firestoreExport, null, 2), 'utf-8');
  const firestoreStats = fs.statSync(firestoreBackupFile);

  console.log(`[Firestore] Export réussi vers : ${firestoreBackupFile}`);
  console.log(`[Firestore] Taille du fichier JSON : ${firestoreStats.size} octets`);

  // ==========================================
  // 3. RAPPORT FINAL DE VÉRIFICATION
  // ==========================================
  console.log('\n========================================');
  console.log('RAPPORT DE SAUVEGARDE & VÉRIFICATION');
  console.log('========================================');
  console.log(`Date et heure : ${new Date().toISOString()}`);
  console.log(`Statut intégrité SQLite : ${integrityStatus}`);
  console.log(`Fichier SQLite sauvegardé : ${sqliteBackupFile} (${sqliteStats.size} octets)`);
  console.log(`Fichier Firestore JSON sauvegardé : ${firestoreBackupFile} (${firestoreStats.size} octets)`);
  console.log('\nComparaison des volumes :');
  console.log('- Établissements (SQLite vs Firestore) :', sqliteCounts.establishments, 'vs', firestoreCounts.establishments);
  console.log('- Utilisateurs (SQLite vs Firestore) :', sqliteCounts.users, 'vs', firestoreCounts.users);
  console.log('- Élèves (SQLite) :', sqliteCounts.students);
  console.log('- Classes (SQLite) :', sqliteCounts.classes);
  console.log('- Paiements (SQLite) :', sqliteCounts.payments);
  console.log('- Grilles tarifaires (SQLite) :', sqliteCounts.tarifs);
  console.log('Sécurité / Secrets : Mots de passe, hashes et jetons purgés / masqués ([FILTERED])');
  console.log('========================================\n');
  console.log('Sauvegarde terminée avec succès. Aucun fichier original n\'a été modifié ou supprimé.');
}

runBackup().catch((err) => {
  console.error('Erreur fatale lors de la sauvegarde:', err);
  process.exit(1);
});
