/**
 * IPL AUCTION SET CLASSIFICATION & GROUPING SYSTEM
 * 
 * Automatic classification of players into realistic IPL auction sets
 * with support for marquee, capped, uncapped, and specialty categories.
 */

export type AuctionSetCode = 
  | 'M1' | 'M2'                           // Marquee
  | 'BA1' | 'BA2'                         // Capped Batters
  | 'WK1' | 'WK2'                         // Capped Wicketkeepers
  | 'AL1' | 'AL2'                         // Capped All-Rounders
  | 'FA1' | 'FA2'                         // Capped Fast Bowlers
  | 'SP1' | 'SP2'                         // Capped Spinners
  | 'UBA1'                                // Uncapped Batters
  | 'UAL1'                                // Uncapped All-Rounders
  | 'UWK1'                                // Uncapped Wicketkeepers
  | 'UFA1'                                // Uncapped Fast Bowlers
  | 'USP1'                                // Uncapped Spinners
  | 'ACC';                                // Accelerated Auction

export interface AuctionSetMetadata {
  code: AuctionSetCode;
  title: string;
  description: string;
  order: number;
  category: 'marquee' | 'capped' | 'uncapped' | 'special';
  estimatedPlayerCount: number;
}

export interface AuctionSet {
  code: AuctionSetCode;
  title: string;
  description: string;
  order: number;
  category: 'marquee' | 'capped' | 'uncapped' | 'special';
  playerIds: string[];
  playerCount: number;
  estimatedDuration: number; // minutes
}

export interface ClassificationResult {
  playerId: string;
  playerName: string;
  assignedSet: AuctionSetCode;
  confidence: number; // 0-100
  reasons: string[];
}

// ============================================================================
// AUCTION SET DEFINITIONS & ORDER
// ============================================================================

export const AUCTION_SET_METADATA: Record<AuctionSetCode, AuctionSetMetadata> = {
  // MARQUEE PLAYERS
  M1: {
    code: 'M1',
    title: 'Marquee Players (1)',
    description: 'Elite international superstars',
    order: 1,
    category: 'marquee',
    estimatedPlayerCount: 10,
  },
  M2: {
    code: 'M2',
    title: 'Marquee Players (2)',
    description: 'Star Indian players & premium overseas',
    order: 2,
    category: 'marquee',
    estimatedPlayerCount: 10,
  },

  // CAPPED BATTERS
  BA1: {
    code: 'BA1',
    title: 'Capped Batters (1)',
    description: 'Elite Indian batsmen',
    order: 3,
    category: 'capped',
    estimatedPlayerCount: 15,
  },
  BA2: {
    code: 'BA2',
    title: 'Capped Batters (2)',
    description: 'Overseas & domestic batsmen',
    order: 4,
    category: 'capped',
    estimatedPlayerCount: 15,
  },

  // CAPPED WICKETKEEPERS
  WK1: {
    code: 'WK1',
    title: 'Capped Wicketkeepers (1)',
    description: 'Premium Indian & overseas wicketkeepers',
    order: 5,
    category: 'capped',
    estimatedPlayerCount: 8,
  },
  WK2: {
    code: 'WK2',
    title: 'Capped Wicketkeepers (2)',
    description: 'Domestic wicketkeepers',
    order: 6,
    category: 'capped',
    estimatedPlayerCount: 8,
  },

  // CAPPED ALL-ROUNDERS
  AL1: {
    code: 'AL1',
    title: 'Capped All-Rounders (1)',
    description: 'Elite all-rounders (Indian)',
    order: 7,
    category: 'capped',
    estimatedPlayerCount: 12,
  },
  AL2: {
    code: 'AL2',
    title: 'Capped All-Rounders (2)',
    description: 'All-rounders (Overseas & domestic)',
    order: 8,
    category: 'capped',
    estimatedPlayerCount: 12,
  },

  // CAPPED FAST BOWLERS
  FA1: {
    code: 'FA1',
    title: 'Capped Fast Bowlers (1)',
    description: 'Premium pace bowlers',
    order: 9,
    category: 'capped',
    estimatedPlayerCount: 15,
  },
  FA2: {
    code: 'FA2',
    title: 'Capped Fast Bowlers (2)',
    description: 'Other pace bowlers',
    order: 10,
    category: 'capped',
    estimatedPlayerCount: 15,
  },

  // CAPPED SPINNERS
  SP1: {
    code: 'SP1',
    title: 'Capped Spinners (1)',
    description: 'Premium spinners',
    order: 11,
    category: 'capped',
    estimatedPlayerCount: 12,
  },
  SP2: {
    code: 'SP2',
    title: 'Capped Spinners (2)',
    description: 'Other spinners',
    order: 12,
    category: 'capped',
    estimatedPlayerCount: 12,
  },

  // UNCAPPED PLAYERS
  UBA1: {
    code: 'UBA1',
    title: 'Uncapped Batters',
    description: 'Young uncapped batting talent',
    order: 13,
    category: 'uncapped',
    estimatedPlayerCount: 20,
  },
  UAL1: {
    code: 'UAL1',
    title: 'Uncapped All-Rounders',
    description: 'Uncapped all-rounders',
    order: 14,
    category: 'uncapped',
    estimatedPlayerCount: 12,
  },
  UWK1: {
    code: 'UWK1',
    title: 'Uncapped Wicketkeepers',
    description: 'Uncapped wicketkeeping talent',
    order: 15,
    category: 'uncapped',
    estimatedPlayerCount: 8,
  },
  UFA1: {
    code: 'UFA1',
    title: 'Uncapped Fast Bowlers',
    description: 'Uncapped fast bowling prospects',
    order: 16,
    category: 'uncapped',
    estimatedPlayerCount: 15,
  },
  USP1: {
    code: 'USP1',
    title: 'Uncapped Spinners',
    description: 'Uncapped spinning talent',
    order: 17,
    category: 'uncapped',
    estimatedPlayerCount: 12,
  },

  // ACCELERATED AUCTION
  ACC: {
    code: 'ACC',
    title: 'Accelerated Auction',
    description: 'Remaining players (batch mode)',
    order: 18,
    category: 'special',
    estimatedPlayerCount: 100,
  },
};

/**
 * Official IPL auction set order
 */
export const OFFICIAL_AUCTION_ORDER: AuctionSetCode[] = [
  'M1', 'M2',
  'BA1', 'BA2',
  'WK1', 'WK2',
  'AL1', 'AL2',
  'FA1', 'FA2',
  'SP1', 'SP2',
  'UBA1',
  'UAL1',
  'UWK1',
  'UFA1',
  'USP1',
  'ACC',
];

// ============================================================================
// CLASSIFICATION HEURISTICS & LOGIC
// ============================================================================

export interface Player {
  id: string;
  name: string;
  role: 'BAT' | 'BOWL' | 'AR' | 'WK';
  country: string;
  isOverseas: boolean;
  basePrice: number;
  photoUrl?: string;
  stats?: Record<string, any>;
  starRating: number;
  isCapped: boolean;
  auctionSet?: number | string;
}

/**
 * Check if player is marquee material
 */
const isMarqueePlayer = (player: Player): boolean => {
  // Superstars with high rating and base price
  if (player.starRating >= 5 && player.basePrice >= 150) return true;
  
  // Known superstars (heuristic)
  const superstars = [
    'ms dhoni', 'virat kohli', 'rohit sharma', 'jasprit bumrah',
    'ab de villiers', 'steve smith', 'pat cummins', 'dale steyn',
    'babar azam', 'kane williamson', 'david warner', 'joe root',
    'virat', 'ms ', 'dhoni', 'bumrah'
  ];
  
  const nameLower = player.name.toLowerCase();
  if (superstars.some(name => nameLower.includes(name))) return true;
  
  return false;
};

/**
 * Classify bowling style
 */
const bowlingStyleFromName = (playerName: string): 'fast' | 'spin' | 'medium' | 'unknown' => {
  const nameLower = playerName.toLowerCase();
  
  // Fast bowling indicators
  const fastIndicators = ['bumrah', 'cummins', 'starc', 'archer', 'steyn', 'malinga', 'bhuvneshwar', 'deep', 'avesh', 'umran'];
  if (fastIndicators.some(ind => nameLower.includes(ind))) return 'fast';
  
  // Spin bowling indicators
  const spinIndicators = ['ashwin', 'harbhajan', 'yadav', 'chahal', 'rashid', 'nortje', 'kuldeep', 'bishnoi', 'sundar', 'konkona', 'chakravarthy'];
  if (spinIndicators.some(ind => nameLower.includes(ind))) return 'spin';
  
  return 'medium';
};

/**
 * Classify role and assign auction set
 */
export const classifyPlayer = (player: Player): { set: AuctionSetCode; confidence: number; reasons: string[] } => {
  const reasons: string[] = [];
  let confidence = 0;

  // ========== MARQUEE CLASSIFICATION ==========
  if (isMarqueePlayer(player)) {
    reasons.push('Superstar status (high rating/price)');
    confidence = 95;
    return {
      set: player.starRating > 4.5 ? 'M1' : 'M2',
      confidence,
      reasons,
    };
  }

  // ========== WICKETKEEPER CLASSIFICATION ==========
  if (player.role === 'WK') {
    if (player.isCapped) {
      reasons.push('Wicketkeeper (Capped)');
      confidence = 90;
      if (player.basePrice >= 50 && player.starRating >= 3) {
        reasons.push('Premium wicketkeeper (high price/rating)');
        return { set: 'WK1', confidence, reasons };
      }
      return { set: 'WK2', confidence, reasons };
    } else {
      reasons.push('Wicketkeeper (Uncapped)');
      confidence = 85;
      return { set: 'UWK1', confidence, reasons };
    }
  }

  // ========== BATTER CLASSIFICATION ==========
  if (player.role === 'BAT') {
    if (player.isCapped) {
      reasons.push('Batter (Capped)');
      if (player.starRating >= 3 && player.basePrice >= 50) {
        reasons.push('Elite batter (high rating/price)');
        confidence = 85;
        return { set: 'BA1', confidence, reasons };
      }
      confidence = 75;
      return { set: 'BA2', confidence, reasons };
    } else {
      reasons.push('Batter (Uncapped)');
      confidence = 70;
      return { set: 'UBA1', confidence, reasons };
    }
  }

  // ========== ALL-ROUNDER CLASSIFICATION ==========
  if (player.role === 'AR') {
    if (player.isCapped) {
      reasons.push('All-rounder (Capped)');
      if (player.starRating >= 3 && player.basePrice >= 75) {
        reasons.push('Elite all-rounder');
        confidence = 85;
        return { set: 'AL1', confidence, reasons };
      }
      confidence = 75;
      return { set: 'AL2', confidence, reasons };
    } else {
      reasons.push('All-rounder (Uncapped)');
      confidence = 70;
      return { set: 'UAL1', confidence, reasons };
    }
  }

  // ========== BOWLER CLASSIFICATION ==========
  if (player.role === 'BOWL') {
    const bowlingStyle = bowlingStyleFromName(player.name);
    
    if (player.isCapped) {
      if (bowlingStyle === 'fast') {
        reasons.push('Fast Bowler (Capped)');
        if (player.starRating >= 3 && player.basePrice >= 50) {
          reasons.push('Premium fast bowler');
          confidence = 85;
          return { set: 'FA1', confidence, reasons };
        }
        confidence = 75;
        return { set: 'FA2', confidence, reasons };
      } else if (bowlingStyle === 'spin' || bowlingStyle === 'medium') {
        reasons.push('Spinner (Capped)');
        if (player.starRating >= 3 && player.basePrice >= 50) {
          reasons.push('Premium spinner');
          confidence = 85;
          return { set: 'SP1', confidence, reasons };
        }
        confidence = 75;
        return { set: 'SP2', confidence, reasons };
      }
    } else {
      if (bowlingStyle === 'fast') {
        reasons.push('Fast Bowler (Uncapped)');
        confidence = 70;
        return { set: 'UFA1', confidence, reasons };
      } else {
        reasons.push('Spinner (Uncapped)');
        confidence = 70;
        return { set: 'USP1', confidence, reasons };
      }
    }
  }

  // ========== FALLBACK ==========
  reasons.push('Fallback classification');
  confidence = 30;
  return { set: 'ACC', confidence, reasons };
};

/**
 * Group players by auction set
 */
export const groupPlayersByAuctionSet = (players: Player[]): Map<AuctionSetCode, Player[]> => {
  const groups = new Map<AuctionSetCode, Player[]>();

  // Initialize all sets
  for (const code of OFFICIAL_AUCTION_ORDER) {
    groups.set(code, []);
  }

  // Classify and group each player
  players.forEach(player => {
    const { set } = classifyPlayer(player);
    const group = groups.get(set) || [];
    group.push(player);
    groups.set(set, group);
  });

  return groups;
};

/**
 * Create structured auction sets from players
 */
export const createAuctionSets = (players: Player[]): AuctionSet[] => {
  const groups = groupPlayersByAuctionSet(players);
  const sets: AuctionSet[] = [];

  for (const code of OFFICIAL_AUCTION_ORDER) {
    const playerIds = (groups.get(code) || []).map(p => p.id);
    const metadata = AUCTION_SET_METADATA[code];

    if (playerIds.length > 0 || code !== 'ACC') {
      sets.push({
        code,
        title: metadata.title,
        description: metadata.description,
        order: metadata.order,
        category: metadata.category,
        playerIds,
        playerCount: playerIds.length,
        estimatedDuration: Math.ceil(playerIds.length * 1.5), // ~1.5 min per player
      });
    }
  }

  // Add ACC with remaining if needed
  const allAssignedIds = new Set(sets.flatMap(s => s.playerIds));
  const remainingIds = players
    .filter(p => !allAssignedIds.has(p.id))
    .map(p => p.id);

  if (remainingIds.length > 0) {
    const metadata = AUCTION_SET_METADATA['ACC'];
    sets.push({
      code: 'ACC',
      title: metadata.title,
      description: metadata.description,
      order: metadata.order,
      category: metadata.category,
      playerIds: remainingIds,
      playerCount: remainingIds.length,
      estimatedDuration: Math.ceil(remainingIds.length * 0.5), // ~0.5 min per player (batch)
    });
  }

  return sets;
};

/**
 * Create auction queue (ordered player IDs across all sets)
 */
export const createAuctionQueue = (sets: AuctionSet[]): string[] => {
  const queue: string[] = [];
  
  // Shuffle within each set
  const shuffle = (arr: string[]): string[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Add players set by set
  for (const set of sets) {
    queue.push(...shuffle(set.playerIds));
  }

  return queue;
};

/**
 * Get upcoming sets info
 */
export const getUpcomingSets = (
  currentSetCode: AuctionSetCode,
  count: number = 3
): AuctionSetMetadata[] => {
  const currentIndex = OFFICIAL_AUCTION_ORDER.indexOf(currentSetCode);
  if (currentIndex === -1) return [];

  return OFFICIAL_AUCTION_ORDER
    .slice(currentIndex + 1, currentIndex + 1 + count)
    .map(code => AUCTION_SET_METADATA[code]);
};

/**
 * Get auction statistics
 */
export const getAuctionStats = (sets: AuctionSet[]) => {
  return {
    totalPlayers: sets.reduce((sum, s) => sum + s.playerCount, 0),
    totalSets: sets.length,
    setBreakdown: sets.map(s => ({
      code: s.code,
      title: s.title,
      playerCount: s.playerCount,
      estimatedDuration: s.estimatedDuration,
    })),
    totalEstimatedDuration: sets.reduce((sum, s) => sum + s.estimatedDuration, 0),
  };
};
