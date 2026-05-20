import { ALL_PLAYERS } from './server/lib/allPlayers.ts';

const idMap = new Map<string, number>();
const nameMap = new Map<string, string[]>();

for (const player of ALL_PLAYERS) {
  idMap.set(player.id, (idMap.get(player.id) || 0) + 1);
  
  if (!nameMap.has(player.name)) {
    nameMap.set(player.name, []);
  }
  nameMap.get(player.name)!.push(player.id);
}

console.log("=== Duplicate IDs ===");
let hasDupIds = false;
for (const [id, count] of idMap.entries()) {
  if (count > 1) {
    console.log(`ID ${id} appears ${count} times.`);
    hasDupIds = true;
  }
}
if (!hasDupIds) console.log("None.");

console.log("\n=== Duplicate Names ===");
let hasDupNames = false;
for (const [name, ids] of nameMap.entries()) {
  if (ids.length > 1) {
    console.log(`Name "${name}" appears ${ids.length} times. IDs: ${ids.join(', ')}`);
    hasDupNames = true;
  }
}
if (!hasDupNames) console.log("None.");
