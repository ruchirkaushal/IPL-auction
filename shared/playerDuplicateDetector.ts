/**
 * Player Duplicate Detection & Validation System
 * 
 * Provides three levels of duplicate detection:
 * 1. Exact duplicates (same normalized name)
 * 2. Fuzzy/close duplicates (Levenshtein distance, token matching)
 * 3. Manual review list (suspicious entries)
 * 
 * Safe, non-destructive analysis for data cleaning.
 */

// ============================================================================
// LEVEL 1: NAME NORMALIZATION
// ============================================================================

/**
 * Normalize a player name for comparison
 * 
 * Steps:
 * - lowercase
 * - trim whitespace
 * - remove periods
 * - collapse multiple spaces
 * - remove parentheses and brackets
 */
export const normalizePlayerName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .trim()
    .replace(/\./g, '')          // remove periods (K.S → KS)
    .replace(/[()[\]{}]/g, '')   // remove brackets/parens
    .replace(/\s+/g, ' ')        // collapse multiple spaces to single
    .trim();
};

/**
 * Create a normalized key for grouping similar names
 */
export const getNormalizedKey = (name: string): string => {
  return normalizePlayerName(name);
};

// ============================================================================
// LEVEL 2: FUZZY MATCHING
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar
 * 
 * Distance of 0-2: very likely duplicate
 * Distance of 3-5: possible duplicate
 * Distance of 6+: probably different names
 */
export const levenshteinDistance = (s1: string, s2: string): number => {
  const str1 = normalizePlayerName(s1);
  const str2 = normalizePlayerName(s2);
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  const matrix: number[][] = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[len2][len1];
};

/**
 * Calculate string similarity as percentage (0-100)
 * Based on Levenshtein distance
 */
export const stringSimilarity = (s1: string, s2: string): number => {
  const n1 = normalizePlayerName(s1);
  const n2 = normalizePlayerName(s2);
  const maxLen = Math.max(n1.length, n2.length);
  
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(n1, n2);
  return Math.round(((maxLen - distance) / maxLen) * 100);
};

/**
 * Extract tokens from a normalized name
 * Example: "virat kohli" → ["virat", "kohli"]
 */
export const getNameTokens = (name: string): string[] => {
  return normalizePlayerName(name)
    .split(/\s+/)
    .filter((token) => token.length > 0);
};

/**
 * Calculate token overlap similarity
 * Useful for detecting transposed names or extra words
 */
export const tokenOverlapSimilarity = (s1: string, s2: string): number => {
  const tokens1 = new Set(getNameTokens(s1));
  const tokens2 = new Set(getNameTokens(s2));
  
  if (tokens1.size === 0 && tokens2.size === 0) return 100;
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return Math.round((intersection.size / union.size) * 100);
};

/**
 * Comprehensive fuzzy match scoring
 * Combines multiple algorithms for robust detection
 */
export const fuzzyMatchScore = (s1: string, s2: string): number => {
  const similarity = stringSimilarity(s1, s2);
  const tokenSimilarity = tokenOverlapSimilarity(s1, s2);
  
  // Weighted average: 60% Levenshtein, 40% token overlap
  return Math.round(similarity * 0.6 + tokenSimilarity * 0.4);
};

// ============================================================================
// LEVEL 3: DUPLICATE DETECTION
// ============================================================================

export interface DuplicateEntry {
  originalNames: string[];
  normalizedName: string;
  count: number;
  indices: number[];
}

export interface FuzzyDuplicateMatch {
  name1: string;
  name2: string;
  similarity: number;
  distance: number;
  index1: number;
  index2: number;
  reason: 'levenshtein' | 'token-overlap' | 'combined';
}

export interface DuplicateReport {
  exactDuplicates: DuplicateEntry[];
  exactDuplicateCount: number;
  fuzzyDuplicates: FuzzyDuplicateMatch[];
  fuzzyDuplicateCount: number;
  uniqueNames: string[];
  uniqueCount: number;
  totalPlayers: number;
  reportGeneratedAt: string;
}

/**
 * Scan player database for exact duplicates (same normalized name)
 */
export const scanExactDuplicates = (
  players: { name: string }[]
): DuplicateEntry[] => {
  const nameMap = new Map<string, DuplicateEntry>();
  
  players.forEach((player, index) => {
    const normalized = getNormalizedKey(player.name);
    
    if (!nameMap.has(normalized)) {
      nameMap.set(normalized, {
        originalNames: [],
        normalizedName: normalized,
        count: 0,
        indices: [],
      });
    }
    
    const entry = nameMap.get(normalized)!;
    if (!entry.originalNames.includes(player.name)) {
      entry.originalNames.push(player.name);
    }
    entry.count += 1;
    entry.indices.push(index);
  });
  
  // Filter to only actual duplicates
  return Array.from(nameMap.values()).filter((entry) => entry.count > 1);
};

/**
 * Scan for fuzzy duplicates using Levenshtein distance
 * 
 * Thresholds:
 * - similarity >= 92: very likely duplicate
 * - similarity >= 85: likely duplicate
 * - similarity >= 75: possible duplicate
 */
export const scanFuzzyDuplicates = (
  players: { name: string }[],
  similarityThreshold: number = 85
): FuzzyDuplicateMatch[] => {
  const matches: FuzzyDuplicateMatch[] = [];
  const checked = new Set<string>();
  
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const key = `${i}-${j}`;
      if (checked.has(key)) continue;
      checked.add(key);
      
      const name1 = players[i].name;
      const name2 = players[j].name;
      
      // Skip if exact same (already caught by exact duplicate scan)
      if (normalizePlayerName(name1) === normalizePlayerName(name2)) {
        continue;
      }
      
      const similarity = fuzzyMatchScore(name1, name2);
      const distance = levenshteinDistance(name1, name2);
      
      if (similarity >= similarityThreshold) {
        matches.push({
          name1,
          name2,
          similarity,
          distance,
          index1: i,
          index2: j,
          reason: similarity >= 92 ? 'levenshtein' : 'combined',
        });
      }
    }
  }
  
  // Sort by similarity descending
  return matches.sort((a, b) => b.similarity - a.similarity);
};

/**
 * Generate comprehensive duplicate report
 */
export const generateDuplicateReport = (
  players: { name: string }[],
  fuzzyThreshold: number = 85
): DuplicateReport => {
  const exactDuplicates = scanExactDuplicates(players);
  const fuzzyDuplicates = scanFuzzyDuplicates(players, fuzzyThreshold);
  
  // Get unique names
  const uniqueNormalized = new Set<string>();
  const uniqueOriginal = new Set<string>();
  
  players.forEach((player) => {
    const normalized = normalizePlayerName(player.name);
    uniqueNormalized.add(normalized);
    uniqueOriginal.add(player.name);
  });
  
  const exactDupCount = exactDuplicates.reduce((sum, entry) => sum + entry.count - 1, 0);
  const fuzzyDupCount = fuzzyDuplicates.length;
  
  return {
    exactDuplicates,
    exactDuplicateCount: exactDupCount,
    fuzzyDuplicates,
    fuzzyDuplicateCount: fuzzyDupCount,
    uniqueNames: Array.from(uniqueOriginal).sort(),
    uniqueCount: uniqueOriginal.size,
    totalPlayers: players.length,
    reportGeneratedAt: new Date().toISOString(),
  };
};

// ============================================================================
// REPORTING & FORMATTING
// ============================================================================

/**
 * Format duplicate report as readable text
 */
export const formatDuplicateReport = (report: DuplicateReport): string => {
  let output = `
╔════════════════════════════════════════════════════════════════════════════╗
║                    IPL PLAYER DATABASE DUPLICATE REPORT                    ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 SUMMARY
─────────────────────────────────────────────────────────────────────────────
Total Players:           ${report.totalPlayers}
Unique Players:          ${report.uniqueCount}
Duplicate Entries:       ${report.exactDuplicateCount}
Exact Duplicates Found:  ${report.exactDuplicates.length}
Fuzzy Duplicates Found:  ${report.fuzzyDuplicateCount}
Report Generated:        ${new Date(report.reportGeneratedAt).toLocaleString()}

`;

  if (report.exactDuplicates.length > 0) {
    output += `
🔴 EXACT DUPLICATES (Same normalized name)
─────────────────────────────────────────────────────────────────────────────
`;
    report.exactDuplicates.forEach((dup) => {
      output += `\n  "${dup.normalizedName}" - ${dup.count} entries:\n`;
      dup.originalNames.forEach((name, idx) => {
        output += `    ${idx + 1}. "${name}" (indices: ${dup.indices.join(', ')})\n`;
      });
    });
  } else {
    output += `
✅ EXACT DUPLICATES
   No exact duplicates found!

`;
  }

  if (report.fuzzyDuplicates.length > 0) {
    output += `
🟡 POSSIBLE DUPLICATES (Fuzzy match > 85% similarity)
─────────────────────────────────────────────────────────────────────────────
`;
    report.fuzzyDuplicates.forEach((match, idx) => {
      output += `\n  ${idx + 1}. Similarity: ${match.similarity}% (Distance: ${match.distance})\n`;
      output += `     "${match.name1}" (index ${match.index1})\n`;
      output += `     ↔\n`;
      output += `     "${match.name2}" (index ${match.index2})\n`;
    });
  } else {
    output += `
✅ POSSIBLE DUPLICATES
   No fuzzy duplicates found!

`;
  }

  output += `
─────────────────────────────────────────────────────────────────────────────
End of Report
`;

  return output;
};

/**
 * Export duplicate report as JSON
 */
export const exportDuplicateReportJSON = (report: DuplicateReport): string => {
  return JSON.stringify(report, null, 2);
};

/**
 * Get recommended duplicates for manual review
 * Combines exact duplicates and high-confidence fuzzy matches
 */
export const getManualReviewList = (report: DuplicateReport): {
  description: string;
  action: string;
}[] => {
  const reviewList: { description: string; action: string }[] = [];

  // Add exact duplicates
  report.exactDuplicates.forEach((dup) => {
    reviewList.push({
      description: `Exact duplicate: "${dup.normalizedName}" appears ${dup.count} times with variations: ${dup.originalNames.join(', ')}`,
      action: 'Keep one, mark others as duplicates for removal',
    });
  });

  // Add very high confidence fuzzy matches
  report.fuzzyDuplicates
    .filter((match) => match.similarity >= 92)
    .forEach((match) => {
      reviewList.push({
        description: `Very likely duplicate (${match.similarity}% similar): "${match.name1}" ↔ "${match.name2}"`,
        action: 'Verify and merge if duplicate',
      });
    });

  return reviewList;
};
