import { getDb, queryAll } from './src/server/db.ts';

async function simulateMigration() {
  console.log('--- Démarrage de la simulation de migration des établissements ---');
  
  const db = await getDb();
  const establishments = queryAll('SELECT * FROM establishments');
  
  console.log(`Nombre d'établissements trouvés dans SQLite: ${establishments.length}`);
  
  for (const est of establishments) {
    console.log(`- Simulation de migration pour : ${est.name} (ID: ${est.id})`);
    // Ici on simulerait la vérification dans Firestore
  }
  
  console.log('--- Fin de la simulation ---');
}

simulateMigration().catch(console.error);
