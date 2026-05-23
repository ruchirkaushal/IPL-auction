import { ALL_PLAYERS } from './allPlayers';
import type { Player } from '../index';

export interface AuctionSet {
  setNumber: number;
  setName: string;
  playerIds: string[];
}

const MANUAL_SET_OVERRIDES: Record<string, string> = {
  // AL1 OVERRIDES (Promoted capped all-rounders)
  'Rachin Ravindra': 'AL1',
  'Mitchell Marsh': 'AL1',
  'Marcus Stoinis': 'AL1',
  'Marco Jansen': 'AL1',
  'Wanindu Hasaranga': 'AL1',
  'Liam Livingstone': 'AL1',
  'Tim David': 'AL1',
  'Moeen Ali': 'AL1',
  'Mitchell Santner': 'AL1',
  'Romario Shepherd': 'AL1',
  'Shivam Dube': 'AL1',
  'Washington Sundar': 'AL1',
  'Venkatesh Iyer': 'AL1',
  'Harshal Patel': 'AL1',
  'Abhishek Sharma': 'AL1',
  'Deepak Hooda': 'AL1',
  'Rahul Tewatia': 'AL1',
  'Ayush Badoni': 'AL1',
  'Shardul Thakur': 'AL1',
  'Krunal Pandya': 'AL1',
  'Nitish Kumar Reddy': 'AL1',
  'Daryl Mitchell': 'AL1',

  // Unsold Pool -> Active Sets Overrides
  'David Warner': 'BA1',
  'Kane Williamson': 'BA1',
  'Finn Allen': 'BA1',
  'Steve Smith': 'BA1',
  'Prithvi Shaw': 'BA1',

  'Mujeeb Ur Rahman': 'AL1',
  'Jason Holder': 'AL1',

  'Umesh Yadav': 'BL1',
  'Alzarri Joseph': 'BL1',

  'Tom Banton': 'WK2',
  'Tom Latham': 'WK2',
  'Sam Billings': 'WK2',
  'Jordan Cox': 'WK2',
  'Alex Carey': 'WK2',
  'K.S Bharat': 'WK2',
  'Shai Hope': 'WK2',

  'Naveen Ul Haq': 'BL2',
  'Adil Rashid': 'BL2',
  'Tabraiz Shamsi': 'BL2',
  'Gus Atkinson': 'BL2',
  'Matt Henry': 'BL2',
  'Sean Abbott': 'BL2',
  'Adam Milne': 'BL2',
  'Chris Jordan': 'BL2',
  'Tymal Mills': 'BL2',
  'Akeal Hosein': 'BL2',
  'Jason Behrendorff': 'BL2',
  'Jhye Richardson': 'BL2',
  'Michael Bracewell': 'BL2',
  'Tim Southee': 'BL2',
  'Ashton Agar': 'BL2',

  'Wayne Parnell': 'BL2',
  'Shivam Mavi': 'BL2',
  'Navdeep Saini': 'BL2',
  'Sandeep Warrier': 'BL2',
  'Piyush Chawla': 'BL2',
  'Kartik Tyagi': 'BL2',
  'Siddharth Kaul': 'BL2',
  'Daniel Worrall': 'BL2',
  'Matthew Potts': 'BL2',
  'John Turner': 'BL2',

  'Evin Lewis': 'BA2',
  'Rassie Van Der Dussen': 'BA2',
  'Sikandar Raza': 'BA2',
  'Ben Duckett': 'BA2',
  'Rilee Rossouw': 'BA2',
  'James Vince': 'BA2',
  'Will Young': 'BA2',
  'Mayank Agarwal': 'BA2',
  'Pathum Nissanka': 'BA2',
  'Bhanuka Rajapaksa': 'BA2',
  'Litton Das': 'BA2',
  'Ollie Pope': 'BA2',
  'Cooper Connolly': 'BA2',
  'Sarfaraz Khan': 'BA2',
  'Kartik Sharma': 'BA2',
  'Devdutt Padikkal': 'BA2',

  'Nitish Rana': 'BA1',
  'Glenn Phillips': 'BA1',
  'Rovman Powell': 'BA1',

  'Tom Curran': 'AL2',
  'Mohammad Nabi': 'AL2',
  'Kyle Mayers': 'AL2',
  'Jimmy Neesham': 'AL2',
  'Daniel Sams': 'AL2',
  'Riley Meredith': 'AL2',
  'Obed McCoy': 'AL2',
  'Shakib Al Hasan': 'AL2',
  'Keshav Maharaj': 'AL2',
  'Odean Smith': 'AL2',
  'Mark Chapman': 'AL2',
  'Ashton Turner': 'AL2',
  'Krishnappa Gowtham': 'AL2',
  'Matthew William Short': 'AL2',
  'Jacob Bethell': 'AL2',
  'Corbin Bosch': 'AL2',
  'Prashant Veer': 'AL2',

  'Cameron Green': 'M2',

  'Umran Malik': 'BL2',
  'Jacob Duffy': 'BL2',

  'Mukul Choudhary': 'UWK1',
  'Salil Arora': 'UWK1',

  'Akshat Raghuwanshi': 'UBA1',

  'Ryan Rickelton': 'WK1',

  'Will Jacks': 'AL1',

  'Lockie Ferguson': 'BL1',
  'Sandeep Sharma': 'BL1',

  'Mukesh Kumar': 'UBL1',
  'Auqib Nabi': 'UBL1',
  'Sakib Hussain': 'UBL1',

  'Mangesh Yadav': 'UAL1',
};

// Apply manual promotions: force starRating
for (const player of ALL_PLAYERS) {
  const override = MANUAL_SET_OVERRIDES[player.name];
  if (override === 'AL1') {
    player.starRating = Math.max(player.starRating, 4);
  } else if (override && ['BA1', 'BL1', 'WK1'].includes(override)) {
    player.starRating = Math.max(player.starRating, 3);
  }
}

// ─── Classification Engine ─────────────────────────────────────────────────────

// Helper function to check if a player strictly belongs to a specific set
function belongsToSet(p: Player, expectedPrefix: string, autoLogic: (p: Player) => boolean): boolean {
  // 1. Manual override always wins
  const override = MANUAL_SET_OVERRIDES[p.name];
  if (override) {
    return override === expectedPrefix;
  }
  
  // 2. Unsold pool check (if not overridden, unsold players are ignored by active sets)
  if (p.id.startsWith('unsold-')) {
    return false;
  }
  
  // 3. Fallback to auto logic
  return autoLogic(p);
}

const SET_DEFINITIONS = [
  {
    setName: 'M1 — Marquee Players',
    filter: (p: Player) => belongsToSet(p, 'M1', (p) => p.starRating === 5 && !p.isOverseas)
  },
  {
    setName: 'M2 — Marquee Players',
    filter: (p: Player) => belongsToSet(p, 'M2', (p) => p.starRating === 5 && p.isOverseas)
  },
  {
    setName: 'BA1 — Capped Batters',
    filter: (p: Player) => belongsToSet(p, 'BA1', (p) => p.isCapped && p.role === 'BAT' && (p.starRating === 4 || p.starRating === 3))
  },
  {
    setName: 'WK1 — Capped Wicketkeepers',
    filter: (p: Player) => belongsToSet(p, 'WK1', (p) => p.isCapped && p.role === 'WK' && (p.starRating === 4 || p.starRating === 3))
  },
  {
    setName: 'BL1 — Capped Bowlers',
    filter: (p: Player) => belongsToSet(p, 'BL1', (p) => p.isCapped && p.role === 'BOWL' && (p.starRating === 4 || p.starRating === 3))
  },
  {
    setName: 'AL1 — Capped All-Rounders',
    filter: (p: Player) => belongsToSet(p, 'AL1', (p) => p.isCapped && p.role === 'AR' && p.starRating >= 4) // >= 4 to catch AL1 auto
  },
  {
    setName: 'BA2 — Capped Batters',
    filter: (p: Player) => belongsToSet(p, 'BA2', (p) => p.isCapped && p.role === 'BAT' && p.starRating <= 2)
  },
  {
    setName: 'WK2 — Capped Wicketkeepers',
    filter: (p: Player) => belongsToSet(p, 'WK2', (p) => p.isCapped && p.role === 'WK' && p.starRating <= 2)
  },
  {
    setName: 'BL2 — Capped Bowlers',
    filter: (p: Player) => belongsToSet(p, 'BL2', (p) => p.isCapped && p.role === 'BOWL' && p.starRating <= 2)
  },
  {
    setName: 'AL2 — Capped All-Rounders',
    filter: (p: Player) => belongsToSet(p, 'AL2', (p) => p.isCapped && p.role === 'AR' && p.starRating <= 3)
  },
  {
    setName: 'UBA1 — Uncapped Batters',
    filter: (p: Player) => belongsToSet(p, 'UBA1', (p) => !p.isCapped && p.role === 'BAT')
  },
  {
    setName: 'UWK1 — Uncapped Wicketkeepers',
    filter: (p: Player) => belongsToSet(p, 'UWK1', (p) => !p.isCapped && p.role === 'WK')
  },
  {
    setName: 'UBL1 — Uncapped Bowlers',
    filter: (p: Player) => belongsToSet(p, 'UBL1', (p) => !p.isCapped && p.role === 'BOWL')
  },
  {
    setName: 'UAL1 — Uncapped All-Rounders',
    filter: (p: Player) => belongsToSet(p, 'UAL1', (p) => !p.isCapped && p.role === 'AR')
  }
];

// ─── Display Sorting ───────────────────────────────────────────────────────────

function sortByStarAndPrice(a: Player, b: Player): number {
  if (b.starRating !== a.starRating) return b.starRating - a.starRating;
  return b.basePrice - a.basePrice;
}

// ─── Build Sets ────────────────────────────────────────────────────────────────

function buildSets(): { setNumber: number; setName: string; players: Player[] }[] {
  const sets: { setNumber: number; setName: string; players: Player[] }[] = [];
  const assigned = new Set<string>();

  let setNum = 1;
  for (const def of SET_DEFINITIONS) {
    const players = ALL_PLAYERS
      .filter(p => !assigned.has(p.id) && def.filter(p))
      .sort(sortByStarAndPrice);

    for (const p of players) {
      assigned.add(p.id);
    }

    if (players.length > 0) {
      sets.push({
        setNumber: setNum++,
        setName: def.setName,
        players
      });
    }
  }

  // Unsold pool (Strictly unsold players that weren't reassigned via overrides)
  const unsold = ALL_PLAYERS
    .filter(p => p.id.startsWith('unsold-') && !assigned.has(p.id))
    .sort(sortByStarAndPrice);

  if (unsold.length > 0) {
    sets.push({
      setNumber: setNum++,
      setName: 'OTHER — Other Pool',
      players: unsold
    });
  }

  return sets;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function createAuctionQueue(): string[] {
  const sets = buildSets();
  const queue: string[] = [];

  const shuffle = (arr: string[]): string[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  for (const set of sets) {
    // Players INSIDE each set are shuffled
    const ids = shuffle(set.players.map(p => p.id));
    queue.push(...ids);
  }

  return queue;
}

export function getAuctionSets(): AuctionSet[] {
  const sets = buildSets();

  return sets.map(s => ({
    setNumber: s.setNumber,
    setName: s.setName,
    // Database UI receives sorted arrays (starRating DESC, basePrice DESC)
    playerIds: s.players.map(p => p.id),
  }));
}
