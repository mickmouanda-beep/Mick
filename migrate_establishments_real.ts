import { getDb, queryAll } from './src/server/db.ts';
import { db, checkEstablishmentExists, setEstablishment, getEstablishment } from './src/server/firestore_db.ts';
import fs from 'fs';
import path from 'path';

interface EstablishmentRecord {
  id: string;
  name: string;
  code: string;
  country: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  motto?: string | null;
  academic_year: string;
  currency: string;
  active_cycles: any;
  logo_url?: string | null;
  status?: string | null;
  promoter_id?: string | null;
  promoter_name?: string | null;
  promoter_email?: string | null;
  promoter_phone?: string | null;
  created_at?: string | null;
}

interface MigrationResult {
  id: string;
  name: string;
  code: string;
  action: 'MIGRATED' | 'SKIPPED_EXISTS' | 'FAILED';
  details: string;
}

async function runRealEstablishmentsMigration() {
  console.log('===============================================================');
  console.log('   ECO GES — MIGRATION EFFECTIVE DES ÉTABLISSEMENTS VERS FIRESTORE');
  console.log('===============================================================\n');

  // 1. Vérification de la sauvegarde préalable de SQLite
  const backupFile = path.resolve(process.cwd(), 'data/faith_school.sqlite.bak');
  if (!fs.existsSync(backupFile)) {
    console.error('❌ ERREUR CRITIQUE: Le fichier de sauvegarde data/faith_school.sqlite.bak est introuvable.');
    console.error('Abandon de la migration pour préserver les données.');
    process.exit(1);
  }
  const backupStats = fs.statSync(backupFile);
  console.log(`✅ Sauvegarde SQLite confirmée : data/faith_school.sqlite.bak (${backupStats.size} octets)\n`);

  // 2. Lecture des établissements depuis SQLite
  await getDb();
  const establishments = queryAll<EstablishmentRecord>('SELECT * FROM establishments ORDER BY created_at ASC');
  console.log(`📋 ${establishments.length} établissements identifiés dans SQLite :\n`);

  const results: MigrationResult[] = [];

  for (const est of establishments) {
    console.log(`➡️  Traitement établissement : [${est.id}] "${est.name}" (Code: ${est.code})`);
    
    try {
      // 3. Vérification d'existence préalable dans Firestore (Garde anti-écrasement)
      const alreadyExists = await checkEstablishmentExists(est.id);

      if (alreadyExists) {
        console.log(`   ⚠️  ATTENTION : Le document existe déjà dans Firestore. Ignoré pour éviter tout écrasement accidentel.`);
        results.push({
          id: est.id,
          name: est.name,
          code: est.code,
          action: 'SKIPPED_EXISTS',
          details: 'Document déjà présent dans Firestore (préservation active)'
        });
        continue;
      }

      // 4. Préparation de la charge utile Firestore normalisée
      let cycles = est.active_cycles;
      if (typeof cycles === 'string') {
        try {
          cycles = JSON.parse(cycles);
        } catch {
          cycles = [cycles];
        }
      }

      const firestorePayload = {
        id: est.id,
        name: est.name,
        code: est.code,
        country: est.country || 'Congo-Brazzaville',
        city: est.city || 'Brazzaville',
        address: est.address || '',
        phone: est.phone || '',
        email: est.email || '',
        motto: est.motto || '',
        academic_year: est.academic_year || '2024-2025',
        currency: est.currency || 'FCFA',
        active_cycles: Array.isArray(cycles) ? cycles : [],
        logo_url: est.logo_url || '',
        status: est.status || 'ACTIVE',
        promoter_id: est.promoter_id || null,
        promoter_name: est.promoter_name || '',
        promoter_email: est.promoter_email || '',
        promoter_phone: est.promoter_phone || '',
        created_at: est.created_at || new Date().toISOString(),
        migrated_at: new Date().toISOString(),
        source_system: 'ECO_GES_SQLITE'
      };

      // 5. Écriture sécurisée dans Firestore
      await setEstablishment(est.id, firestorePayload);

      // 6. Vérification immédiate de relecture (Read-After-Write Verification)
      const verified = await getEstablishment(est.id);
      if (verified && verified.id === est.id) {
        console.log(`   ✅ Migration réussie et vérifiée dans Firestore.`);
        results.push({
          id: est.id,
          name: est.name,
          code: est.code,
          action: 'MIGRATED',
          details: 'Document transféré et relecture validée avec succès'
        });
      } else {
        throw new Error('Vérification de relecture échouée après écriture');
      }

    } catch (err: any) {
      console.error(`   ❌ Échec pour ${est.id}: ${err.message || err}`);
      results.push({
        id: est.id,
        name: est.name,
        code: est.code,
        action: 'FAILED',
        details: err.message || String(err)
      });
    }
  }

  // 7. Bilan récapitulatif
  console.log('\n===============================================================');
  console.log('             RAPPORT D\'EXÉCUTION DE LA MIGRATION');
  console.log('===============================================================');
  console.log(`Total analysé dans SQLite   : ${establishments.length}`);
  console.log(`Migrés avec succès          : ${results.filter(r => r.action === 'MIGRATED').length}`);
  console.log(`Déjà existants (ignorés)    : ${results.filter(r => r.action === 'SKIPPED_EXISTS').length}`);
  console.log(`Erreurs / Échecs            : ${results.filter(r => r.action === 'FAILED').length}`);
  console.log('---------------------------------------------------------------');
  console.log('Détail par établissement :');
  results.forEach((r, idx) => {
    const symbol = r.action === 'MIGRATED' ? '✅' : r.action === 'SKIPPED_EXISTS' ? '⚠️' : '❌';
    console.log(` ${idx + 1}. ${symbol} [${r.id}] ${r.name.padEnd(40)} -> ${r.action} (${r.details})`);
  });
  console.log('===============================================================\n');

  process.exit(results.some(r => r.action === 'FAILED') ? 1 : 0);
}

runRealEstablishmentsMigration().catch((err) => {
  console.error('Erreur non interceptée pendant la migration:', err);
  process.exit(1);
});
