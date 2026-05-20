// auctionSetClassifier.ts
// Strict QUALITY-TIER + ROLE-TIER classification engine

export type AuctionSetCode =
  | 'M1' | 'M2'
  | 'BA1' | 'WK1' | 'BL1' | 'AL1'
  | 'BA2' | 'WK2' | 'BL2' | 'AL2'
  | 'UBA1' | 'UWK1' | 'UBL1' | 'UAL1'
  | 'OTHER';

export type SetCategory = 'marquee' | 'capped' | 'uncapped' | 'special';

export interface AuctionSet {
  code: AuctionSetCode;
  title: string;
  description: string;
  order: number;
  category: SetCategory;
  playerIds: string[]; // Sorted by starRating desc -> basePrice desc for DISPLAY
}

export const SET_ORDER: AuctionSetCode[] = [
  'M1', 'M2',
  'BA1', 'WK1', 'BL1', 'AL1',
  'BA2', 'WK2', 'BL2', 'AL2',
  'UBA1', 'UWK1', 'UBL1', 'UAL1',
  'OTHER'
];

export const SET_META: Record<AuctionSetCode, { title: string; description: string; category: SetCategory }> = {
  M1: { title: 'Marquee Players', description: 'Elite domestic stars', category: 'marquee' },
  M2: { title: 'Marquee Players', description: 'Elite overseas stars', category: 'marquee' },
  BA1: { title: 'Capped Batters', description: 'Premium 4★ and 3★', category: 'capped' },
  WK1: { title: 'Capped Wicketkeepers', description: 'Premium 4★ and 3★', category: 'capped' },
  BL1: { title: 'Capped Bowlers', description: 'Premium 4★ and 3★', category: 'capped' },
  AL1: { title: 'Capped All-Rounders', description: 'Premium 4★', category: 'capped' },
  BA2: { title: 'Capped Batters', description: 'Mid-tier 2★', category: 'capped' },
  WK2: { title: 'Capped Wicketkeepers', description: 'Mid-tier 2★', category: 'capped' },
  BL2: { title: 'Capped Bowlers', description: 'Mid-tier 2★', category: 'capped' },
  AL2: { title: 'Capped All-Rounders', description: 'Remaining Capped', category: 'capped' },
  UBA1: { title: 'Uncapped Batters', description: 'Emerging Domestic', category: 'uncapped' },
  UWK1: { title: 'Uncapped Wicketkeepers', description: 'Emerging Domestic', category: 'uncapped' },
  UBL1: { title: 'Uncapped Bowlers', description: 'Emerging Domestic', category: 'uncapped' },
  UAL1: { title: 'Uncapped All-Rounders', description: 'Emerging Domestic', category: 'uncapped' },
  OTHER: { title: 'Other Pool', description: 'Unsold Players', category: 'special' },
};

const MANUAL_SET_OVERRIDES: Record<string, AuctionSetCode> = {
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
  'James Anderson': 'BL2',
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
};

// ─── Classification Engine ──────────────────────────────────────────────────

function isMarquee(p: any): boolean {
  return p.starRating === 5 && !p.id.startsWith('unsold-');
}

export function classifyPlayer(p: any): AuctionSetCode {
  // 1. Check strict manual overrides FIRST
  if (MANUAL_SET_OVERRIDES[p.name]) {
    return MANUAL_SET_OVERRIDES[p.name];
  }

  // 2. Unsold pool checking (only if not overridden)
  if (p.id.startsWith('unsold-')) return 'OTHER';

  const isCapped = p.isCapped ?? true;
  const isOverseas = p.isOverseas ?? false;
  const role = p.role;
  const starRating = p.starRating;

  // 3. Marquee
  if (isMarquee(p)) {
    return isOverseas ? 'M2' : 'M1';
  }

  // 4. Automatic Classification
  if (isCapped) {
    if (role === 'BAT') return starRating >= 3 ? 'BA1' : 'BA2';
    if (role === 'WK') return starRating >= 3 ? 'WK1' : 'WK2';
    if (role === 'BOWL') return starRating >= 3 ? 'BL1' : 'BL2';
    if (role === 'AR') {
      if (starRating >= 4) return 'AL1';
      return 'AL2';
    }
  } else {
    // Uncapped
    if (role === 'BAT') return 'UBA1';
    if (role === 'WK') return 'UWK1';
    if (role === 'BOWL') return 'UBL1';
    if (role === 'AR') return 'UAL1';
  }

  // Fallback to OTHER
  return 'OTHER';
}

function sortByStarAndPrice(a: any, b: any): number {
  if (b.starRating !== a.starRating) return b.starRating - a.starRating;
  return b.basePrice - a.basePrice;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildAuctionSets(players: any[]): AuctionSet[] {
  const playersCopy = players.map(p => {
    // Force 4 star rating for ANY player explicitly manually promoted to AL1
    if (MANUAL_SET_OVERRIDES[p.name] === 'AL1') {
      return { ...p, starRating: Math.max(p.starRating, 4) };
    }
    // Boost sorting priority of premium players pulled from Unsold
    if (MANUAL_SET_OVERRIDES[p.name]) {
      const code = MANUAL_SET_OVERRIDES[p.name];
      if (['BA1', 'BL1', 'WK1'].includes(code)) {
        return { ...p, starRating: Math.max(p.starRating, 3) };
      }
    }
    return p;
  });

  const grouped: Record<string, any[]> = {};
  for (const code of SET_ORDER) grouped[code] = [];

  for (const player of playersCopy) {
    const code = classifyPlayer(player);
    if (grouped[code]) {
      grouped[code].push(player);
    } else {
      // In case of unexpected fallback, push to OTHER
      if (grouped['OTHER']) {
        grouped['OTHER'].push(player);
      }
    }
  }

  return SET_ORDER
    .map((code, idx) => {
      const sortedPlayers = [...grouped[code]].sort(sortByStarAndPrice);
      return {
        code,
        title: SET_META[code].title,
        description: SET_META[code].description,
        order: idx + 1,
        category: SET_META[code].category,
        playerIds: sortedPlayers.map((p: any) => p.id),
      };
    })
    .filter(set => set.playerIds.length > 0);
}

export function buildAuctionQueue(auctionSets: AuctionSet[]): string[] {
  const queue: string[] = [];
  for (const set of auctionSets) {
    const shuffledIds = shuffle(set.playerIds);
    queue.push(...shuffledIds);
  }
  return queue;
}

export function getCurrentSetForIndex(
  auctionSets: AuctionSet[],
  queue: string[],
  currentIndex: number
): AuctionSet | null {
  if (currentIndex >= queue.length) return null;
  const playerId = queue[currentIndex];
  return auctionSets.find(s => s.playerIds.includes(playerId)) ?? null;
}

export function getUpcomingSets(
  auctionSets: AuctionSet[],
  queue: string[],
  currentIndex: number
): AuctionSet[] {
  const current = getCurrentSetForIndex(auctionSets, queue, currentIndex);
  if (!current) return [];
  return auctionSets.filter(s => s.order > current.order);
}