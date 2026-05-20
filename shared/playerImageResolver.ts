import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.join(__dirname, 'imageCache.json');

const YEARS = ['2026', '2025', '2024', '2023', '2022'];
export const DEFAULT_FALLBACK_IMAGE = 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png';

export const MANUAL_OVERRIDES: Record<string, string> = {
  // Manual Overrides for specific cases
  'unsold-18': 'https://documents.iplt20.com/playerheadshot/ipl/210/271.png', // Steve Smith
  'unsold-67': 'https://documents.iplt20.com/playerheadshot/ipl/284/201.png', // Shakib Al Hasan

  // The following players have entirely mismatched Image IDs vs PIDs on the IPL website.
  // We explicitly override them with their true image paths extracted from their profiles.
  'unsold-15': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/21.png',   // Umesh Yadav
  'unsold-6':  'https://documents.iplt20.com/ipl/IPLHeadshot2025/134.png',  // Mujeeb Ur Rahman
  'unsold-91': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/618.png',  // Pathum Nissanka
  'unsold-119':'https://documents.iplt20.com/ipl/IPLHeadshot2026/848.png',  // Cooper Connolly
  'unsold-105':'https://documents.iplt20.com/ipl/IPLHeadshot2026/139.png',  // Sarfaraz Khan
  'unsold-48': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/3372.png', // Jordan Cox
  'unsold-12': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/530.png',  // Tom Banton
  'unsold-7':  'https://documents.iplt20.com/ipl/IPLHeadshot2023/311.png',  // Adil Rashid
  'unsold-14': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/639.png',  // Naveen Ul Haq
  'unsold-21': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/71.png',   // Matt Henry
  'unsold-29': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/722.png',  // Akeal Hosein
  'unsold-36': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/59.png',   // Jhye Richardson
  'unsold-118':'https://documents.iplt20.com/ipl/IPLHeadshot2024/228.png',  // Sandeep Warrier
  'unsold-20': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/309.png',  // Tom Curran
  'unsold-146':'https://documents.iplt20.com/ipl/IPLHeadshot2024/149.png',  // Piyush Chawla
  'unsold-32': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/217.png',  // Mohammad Nabi
  
  // Custom Overrides for User Provided List
  'unsold-1': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/214.png', // David Warner
  'unsold-10': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/1426.png', // Rilee Rossouw
  'unsold-11': 'https://media.crictracker.com/media/featureimage/2018/07/James-Vince.jpg', // James Vince
  'unsold-17': 'https://assets.iplt20.com/ipl/IPLHeadshot2022/872.png?v=1.34', // Evin Lewis
  'unsold-23': 'https://assets.iplt20.com/ipl/IPLHeadshot2022/20619.png?v=1.34', // Rassie Van Der Dussen
  'unsold-51': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/820.png', // Sikandar Raza
  'unsold-52': 'https://images.dream11.com/eyJrZXkiOiJmYy1wbGF5ZXItaW1hZ2VzLzg0MjIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7ImZpdCI6ImNvdmVyIiwicG9zaXRpb24iOiJ0b3AiLCJ3aWR0aCI6MjAwLCJoZWlnaHQiOjIwMH0sIndlYnAiOnsicXVhbGl0eSI6NjAsImxvc3NsZXNzIjpmYWxzZX19LCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIn0=', // Will Young
  'unsold-30': 'https://assets.iplt20.com/ipl/IPLHeadshot2022/2756.png?v=1.34', // Sam Billings
  'unsold-47': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/268.png', // Shai Hope
  'unsold-61': 'https://documents.iplt20.com/playerheadshot/ipl/210/3882.png', // Alex Carey
  'unsold-16': 'https://documents.iplt20.com/playerheadshot/ipl/210/3309.png', // Tabraiz Shamsi
  'unsold-25': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/157.png', // Adam Milne
  'unsold-37': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/1465.png', // Michael Bracewell

  'unsold-109': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/207.png', // Navdeep Saini
  'unsold-31': 'https://images.dream11.com/eyJrZXkiOiJmYy1wbGF5ZXItaW1hZ2VzLzIwNjQucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7ImZpdCI6ImNvdmVyIiwicG9zaXRpb24iOiJ0b3AiLCJ3aWR0aCI6MjAwLCJoZWlnaHQiOjIwMH0sIndlYnAiOnsicXVhbGl0eSI6NjAsImxvc3NsZXNzIjpmYWxzZX19LCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIn0=', // Mark Chapman
  'unsold-34': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/726.png', // Kyle Mayers
  'unsold-39': 'https://documents.iplt20.com/playerheadshot/ipl/210/971.png', // Jimmy Neesham
  'unsold-53': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/645.png', // Obed McCoy
  'unsold-62': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/86.png', // Ashton Turner
  'unsold-63': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/179.png', // Krishnappa Gowtham
  'unsold-77': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/347.png', // Keshav Maharaj
  
  // Generic Fallbacks for missing/logo URLs
  'unsold-9': DEFAULT_FALLBACK_IMAGE, // Ben Duckett
  'unsold-94': DEFAULT_FALLBACK_IMAGE, // Litton Das
  'unsold-96': DEFAULT_FALLBACK_IMAGE, // Ollie Pope
  'unsold-33': DEFAULT_FALLBACK_IMAGE, // Tom Latham
  'unsold-19': DEFAULT_FALLBACK_IMAGE, // Gus Atkinson
  'unsold-24': DEFAULT_FALLBACK_IMAGE, // Sean Abbott
  'unsold-42': DEFAULT_FALLBACK_IMAGE, // Daniel Worrall
  'unsold-43': DEFAULT_FALLBACK_IMAGE, // Matthew Potts
  'unsold-45': DEFAULT_FALLBACK_IMAGE, // John Turner
  'unsold-55': DEFAULT_FALLBACK_IMAGE, // Ashton Agar
  'unsold-73': DEFAULT_FALLBACK_IMAGE, // Wayne Parnell
  'kkr-18': DEFAULT_FALLBACK_IMAGE, // Shivam Shukla
};

async function probeUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return res.ok && res.status === 200;
  } catch {
    return false;
  }
}

export async function resolveAllPlayerImages(players: any[]) {
  let cache: Record<string, string> = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch (e) {
      console.error('Failed to parse image cache:', e);
    }
  }

  let cacheUpdated = false;

  const BATCH_SIZE = 20; // Concurrently check 20 players at a time
  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    const batch = players.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (player) => {
      // 1. Manual Override
      if (MANUAL_OVERRIDES[player.id]) {
        player.photoUrl = MANUAL_OVERRIDES[player.id];
        player.image = MANUAL_OVERRIDES[player.id];
        return;
      }

      // 2. Cache Hit
      if (cache[player.id]) {
        player.photoUrl = cache[player.id];
        player.image = cache[player.id];
        return;
      }

      // 3. Needs Resolution
      let pid = '';
      if (player.photoUrl) {
        const match = player.photoUrl.match(/\/(\d+)\.png$/);
        if (match) pid = match[1];
      }

      if (!pid) {
        cache[player.id] = DEFAULT_FALLBACK_IMAGE;
        player.photoUrl = DEFAULT_FALLBACK_IMAGE;
        player.image = DEFAULT_FALLBACK_IMAGE;
        cacheUpdated = true;
        return;
      }

      let foundUrl = null;
      for (const year of YEARS) {
        const testUrl = `https://documents.iplt20.com/ipl/IPLHeadshot${year}/${pid}.png`;
        if (await probeUrl(testUrl)) {
          foundUrl = testUrl;
          break;
        }
      }

      const finalUrl = foundUrl || DEFAULT_FALLBACK_IMAGE;
      cache[player.id] = finalUrl;
      player.photoUrl = finalUrl;
      player.image = finalUrl;
      cacheUpdated = true;
      console.log(`[Image Resolver] Found image for ${player.name} (${player.id}): ${finalUrl}`);
    }));
  }

  if (cacheUpdated) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('[Image Resolver] Image cache successfully generated and saved to imageCache.json.');
  } else {
    console.log('[Image Resolver] All player images loaded from cache successfully.');
  }
}
