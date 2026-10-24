import fs from 'fs';

const content = fs.readFileSync('./src/server/api.ts', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('pedagogical') || line.toLowerCase().includes('reference')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
