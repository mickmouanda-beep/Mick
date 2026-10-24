import { getDb, queryAll } from '../src/server/db.ts';

async function inspect() {
  await getDb();
  const ests = queryAll("SELECT id, name, code, status FROM establishments");
  console.log("All establishments in DB:", ests);
}

inspect().catch(console.error);
