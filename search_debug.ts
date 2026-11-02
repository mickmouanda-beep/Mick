import fs from 'fs';
import path from 'path';

function searchInDir(dir: string, term: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      searchInDir(fullPath, term);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(term)) {
        console.log(`Found "${term}" in ${fullPath}`);
      }
    }
  }
}

console.log('Searching for debug/schedules and debugInfo...');
searchInDir('./src', 'debug/schedules');
searchInDir('./src', 'debugInfo');
process.exit(0);
