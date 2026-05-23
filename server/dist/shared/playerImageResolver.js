"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANUAL_OVERRIDES = exports.DEFAULT_FALLBACK_IMAGE = void 0;
exports.resolveAllPlayerImages = resolveAllPlayerImages;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CACHE_FILE = path_1.default.join(process.cwd(), 'imageCache.json');
const YEARS = ['2026', '2025', '2024', '2023', '2022'];
exports.DEFAULT_FALLBACK_IMAGE = 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png';
exports.MANUAL_OVERRIDES = {
    // Manual Overrides for specific cases
    'unsold-18': 'https://documents.iplt20.com/playerheadshot/ipl/210/271.png', // Steve Smith
    'unsold-67': 'https://documents.iplt20.com/playerheadshot/ipl/284/201.png', // Shakib Al Hasan
    // The following players have entirely mismatched Image IDs vs PIDs on the IPL website.
    // We explicitly override them with their true image paths extracted from their profiles.
    'unsold-15': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/21.png', // Umesh Yadav
    'unsold-6': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/134.png', // Mujeeb Ur Rahman
    'unsold-91': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/618.png', // Pathum Nissanka
    'unsold-119': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/848.png', // Cooper Connolly
    'unsold-105': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/139.png', // Sarfaraz Khan
    'unsold-48': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/3372.png', // Jordan Cox
    'unsold-12': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/530.png', // Tom Banton
    'unsold-7': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/311.png', // Adil Rashid
    'unsold-14': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/639.png', // Naveen Ul Haq
    'unsold-21': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/71.png', // Matt Henry
    'unsold-29': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/722.png', // Akeal Hosein
    'unsold-36': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/59.png', // Jhye Richardson
    'unsold-118': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/228.png', // Sandeep Warrier
    'unsold-20': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/309.png', // Tom Curran
    'unsold-146': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/149.png', // Piyush Chawla
    'unsold-32': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/217.png', // Mohammad Nabi
    // Custom Overrides for User Provided List
    'unsold-1': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/214.png', // David Warner
    'unsold-10': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/1426.png', // Rilee Rossouw
    'unsold-11': 'https://media.crictracker.com/media/featureimage/2018/07/James-Vince.jpg', // James Vince
    'unsold-17': 'https://www.iplt20.com/players/evin-lewis/872', // Evin Lewis
    'unsold-23': 'https://www.iplt20.com/players/rassie-van-der-dussen/20619', // Rassie Van Der Dussen
    'unsold-51': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/820.png', // Sikandar Raza
    'unsold-52': 'https://images.dream11.com/eyJrZXkiOiJmYy1wbGF5ZXItaW1hZ2VzLzg0MjIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7ImZpdCI6ImNvdmVyIiwicG9zaXRpb24iOiJ0b3AiLCJ3aWR0aCI6MjAwLCJoZWlnaHQiOjIwMH0sIndlYnAiOnsicXVhbGl0eSI6NjAsImxvc3NsZXNzIjpmYWxzZX19LCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIn0=', // Will Young
    'unsold-30': 'https://www.iplt20.com/players/sam-billings/2756', // Sam Billings
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
    'unsold-9': exports.DEFAULT_FALLBACK_IMAGE, // Ben Duckett
    'unsold-94': exports.DEFAULT_FALLBACK_IMAGE, // Litton Das
    'unsold-96': exports.DEFAULT_FALLBACK_IMAGE, // Ollie Pope
    'unsold-33': exports.DEFAULT_FALLBACK_IMAGE, // Tom Latham
    'unsold-19': exports.DEFAULT_FALLBACK_IMAGE, // Gus Atkinson
    'unsold-24': exports.DEFAULT_FALLBACK_IMAGE, // Sean Abbott
    'unsold-42': exports.DEFAULT_FALLBACK_IMAGE, // Daniel Worrall
    'unsold-43': exports.DEFAULT_FALLBACK_IMAGE, // Matthew Potts
    'unsold-45': exports.DEFAULT_FALLBACK_IMAGE, // John Turner
    'unsold-55': exports.DEFAULT_FALLBACK_IMAGE, // Ashton Agar
    'unsold-73': exports.DEFAULT_FALLBACK_IMAGE, // Wayne Parnell
    'kkr-18': exports.DEFAULT_FALLBACK_IMAGE, // Shivam Shukla
    // New Players (scraped from IPL profile pages)
    'dc-20': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/1462.png', // Mukesh Kumar
    'unsold-171': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/3104.png', // Sakib Hussain
    'unsold-346': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/1041.png', // Corbin Bosch
    'unsold-216': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/4556.png', // Salil Arora
    'unsold-211': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/1487.png', // Akshat Raghuwanshi
    'unsold-396': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/4540.png', // Kartik Sharma
    'unsold-397': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/200.png', // Devdutt Padikkal
    'unsold-398': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/148.png', // Nitish Rana
    'unsold-399': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/635.png', // Glenn Phillips
    'unsold-400': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/329.png', // Rovman Powell
    'unsold-401': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/4543.png', // Auqib Nabi
    'unsold-402': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/2032.png', // Matthew William Short
    'unsold-403': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/869.png', // Jacob Bethell
    'unsold-404': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/4541.png', // Prashant Veer
    'unsold-405': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/550.png', // Cameron Green
    'unsold-406': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/637.png', // Umran Malik
    'unsold-407': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/1701.png', // Jacob Duffy
    'unsold-408': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/4549.png', // Mukul Choudhary
    'unsold-409': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/743.png', // Ryan Rickelton
    'unsold-410': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/1941.png', // Will Jacks
    'unsold-411': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/69.png', // Lockie Ferguson
    'unsold-412': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/220.png', // Sandeep Sharma
    'unsold-413': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/4554.png', // Mangesh Yadav
};
async function probeUrl(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        return res.ok && res.status === 200;
    }
    catch {
        return false;
    }
}
async function resolveAllPlayerImages(players) {
    let cache = {};
    if (fs_1.default.existsSync(CACHE_FILE)) {
        try {
            cache = JSON.parse(fs_1.default.readFileSync(CACHE_FILE, 'utf-8'));
        }
        catch (e) {
            console.error('Failed to parse image cache:', e);
        }
    }
    let cacheUpdated = false;
    const BATCH_SIZE = 20; // Concurrently check 20 players at a time
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
        const batch = players.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (player) => {
            // 1. Manual Override
            if (exports.MANUAL_OVERRIDES[player.id]) {
                player.photoUrl = exports.MANUAL_OVERRIDES[player.id];
                player.image = exports.MANUAL_OVERRIDES[player.id];
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
                if (match)
                    pid = match[1];
            }
            if (!pid) {
                cache[player.id] = exports.DEFAULT_FALLBACK_IMAGE;
                player.photoUrl = exports.DEFAULT_FALLBACK_IMAGE;
                player.image = exports.DEFAULT_FALLBACK_IMAGE;
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
            const finalUrl = foundUrl || exports.DEFAULT_FALLBACK_IMAGE;
            cache[player.id] = finalUrl;
            player.photoUrl = finalUrl;
            player.image = finalUrl;
            cacheUpdated = true;
            console.log(`[Image Resolver] Found image for ${player.name} (${player.id}): ${finalUrl}`);
        }));
    }
    if (cacheUpdated) {
        fs_1.default.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
        console.log('[Image Resolver] Image cache successfully generated and saved to imageCache.json.');
    }
    else {
        console.log('[Image Resolver] All player images loaded from cache successfully.');
    }
}
