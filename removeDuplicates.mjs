import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server/lib/unsold.ts');
let content = fs.readFileSync(file, 'utf-8');

const idsToRemove = [
  'unsold-79',
  'unsold-236',
  'unsold-192',
  'unsold-89',
  'unsold-13',
  'unsold-81',
  'unsold-127',
  'unsold-261',
  'unsold-117',
  'unsold-5',
  'unsold-249',
  'unsold-38',
  'unsold-2',
  'unsold-111',
  'unsold-98',
  'unsold-46',
  'unsold-50',
  'unsold-49',
  'unsold-129',
  'unsold-180',
  'unsold-125',
  'unsold-297',
  'unsold-262'
];

let removedCount = 0;
const lines = content.split('\n');
const newLines = lines.filter(line => {
  for (const id of idsToRemove) {
    // Look for P('unsold-79', or similar
    if (line.includes(`'${id}'`)) {
      removedCount++;
      console.log(`Removed: ${line.trim()}`);
      return false;
    }
  }
  return true;
});

fs.writeFileSync(file, newLines.join('\n'), 'utf-8');
console.log(`\nSuccessfully removed ${removedCount} duplicate entries from unsold.ts.`);
