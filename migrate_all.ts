import { runSqliteToFirestoreMigration } from './src/server/firestore_migration.ts';

async function runAll() {
  console.log('Starting full migration...');
  const report = await runSqliteToFirestoreMigration(false);
  console.log('Migration complete:', JSON.stringify(report, null, 2));
}

runAll().catch(console.error);
