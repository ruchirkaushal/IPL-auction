/**
 * INTELLIGENT PLAYER DEDUPLICATION SYSTEM
 * 
 * Image-Priority Deduplication Logic:
 * 
 * PRIORITY RULE:
 * Keep the entry that contains a valid player image.
 * Remove the duplicate entry that has NO image.
 * 
 * CASE 1: One has image, one doesn't
 *   → Keep entry WITH image
 *   → Remove entry WITHOUT image
 * 
 * CASE 2: Both have images
 *   → Keep entry with more complete metadata
 *   → OR keep first imported entry
 *   → Remove other duplicate
 * 
 * CASE 3: Both have NO image
 *   → Keep first entry
 *   → Remove other duplicates
 */

import { normalizePlayerName } from './playerDuplicateDetector.ts';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Player {
  id: string;
  name: string;
  role: 'BAT' | 'BOWL' | 'AR' | 'WK';
  country: string;
  isOverseas: boolean;
  basePrice: number;
  photoUrl: string | null | undefined;
  stats: Record<string, any>;
  starRating: number;
  isCapped: boolean;
  auctionSet: number;
}

export interface DuplicateGroup {
  normalizedName: string;
  originalNames: string[];
  indices: number[];
  entries: (Player & { originalIndex: number })[];
}

export interface DeduplicationResult {
  canonicalEntry: Player & { originalIndex: number };
  removedEntries: (Player & { originalIndex: number; reason: string })[];
  metadataComparison: {
    hasImage: boolean;
    fieldCount: number;
    completeness: number;
  };
}

export interface DeduplicationReport {
  totalPlayers: number;
  uniquePlayers: number;
  duplicateGroupsFound: number;
  totalDuplicatesRemoved: number;
  cleanedDatabase: Player[];
  deduplicationResults: DeduplicationResult[];
  backup: Player[];
  reportGeneratedAt: string;
}

// ============================================================================
// IMAGE DETECTION
// ============================================================================

/**
 * Check if a player has a valid image
 * 
 * Returns false for:
 * - null, undefined, empty string
 * - missing field
 * - placeholder/default images
 * - malformed URLs
 */
export const hasValidImage = (photoUrl: string | null | undefined): boolean => {
  if (!photoUrl || typeof photoUrl !== 'string') return false;
  
  const trimmed = photoUrl.trim();
  if (trimmed === '') return false;
  
  // Exclude default/placeholder images
  const defaultPatterns = [
    'default',
    'placeholder',
    'avatar',
    'no-image',
    'missing',
    'none.png',
    'undefined'
  ];
  
  const lower = trimmed.toLowerCase();
  if (defaultPatterns.some(pattern => lower.includes(pattern))) {
    return false;
  }
  
  // Check if it looks like a valid URL
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
};

/**
 * Calculate metadata completeness score (0-100)
 * Higher = more complete entry
 */
export const calculateCompletenessScore = (player: Player): number => {
  let score = 0;
  const totalFields = 12;
  
  // Basic info (4 fields)
  if (player.id && player.id.trim()) score += 1;
  if (player.name && player.name.trim()) score += 1;
  if (player.role) score += 1;
  if (player.country && player.country.trim()) score += 1;
  
  // Extended info (4 fields)
  if (player.basePrice > 0) score += 1;
  if (player.photoUrl && hasValidImage(player.photoUrl)) score += 1;
  if (player.starRating > 0) score += 1;
  if (player.auctionSet > 0) score += 1;
  
  // Stats (2 fields)
  if (player.stats && Object.keys(player.stats).length > 0) score += 1;
  if (player.stats?.matches !== undefined && player.stats.matches > 0) score += 1;
  
  // Player characteristics (2 fields)
  if (typeof player.isCapped === 'boolean') score += 1;
  if (typeof player.isOverseas === 'boolean') score += 1;
  
  return Math.round((score / totalFields) * 100);
};

// ============================================================================
// GROUPING DUPLICATES
// ============================================================================

/**
 * Group players by normalized name to find duplicates
 */
export const groupDuplicatesByName = (
  players: Player[]
): Map<string, (Player & { originalIndex: number })[]> => {
  const groups = new Map<
    string,
    (Player & { originalIndex: number })[]
  >();
  
  players.forEach((player, index) => {
    const normalized = normalizePlayerName(player.name);
    
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    
    groups.get(normalized)!.push({
      ...player,
      originalIndex: index
    });
  });
  
  return groups;
};

/**
 * Filter to only duplicate groups (count > 1)
 */
export const getDuplicateGroups = (
  groups: Map<string, (Player & { originalIndex: number })[]>
): DuplicateGroup[] => {
  const duplicates: DuplicateGroup[] = [];
  
  groups.forEach((entries, normalizedName) => {
    if (entries.length > 1) {
      duplicates.push({
        normalizedName,
        originalNames: [...new Set(entries.map(e => e.name))],
        indices: entries.map(e => e.originalIndex),
        entries
      });
    }
  });
  
  return duplicates;
};

// ============================================================================
// CANONICAL ENTRY SELECTION
// ============================================================================

/**
 * Select the canonical (best) entry from a duplicate group
 * 
 * Priority:
 * 1. Has valid image
 * 2. More complete metadata
 * 3. First entry
 */
export const selectCanonicalEntry = (
  entries: (Player & { originalIndex: number })[]
): (Player & { originalIndex: number }) => {
  if (entries.length === 0) {
    throw new Error('Cannot select canonical entry from empty list');
  }
  
  if (entries.length === 1) {
    return entries[0];
  }
  
  // Separate by image availability
  const withImage = entries.filter(e => hasValidImage(e.photoUrl));
  const withoutImage = entries.filter(e => !hasValidImage(e.photoUrl));
  
  let candidates: (Player & { originalIndex: number })[];
  
  // CASE 1: Some have images, some don't
  if (withImage.length > 0 && withoutImage.length > 0) {
    candidates = withImage;
  }
  // CASE 2: All have images OR all don't have images
  else {
    candidates = entries;
  }
  
  // Among candidates, pick the most complete
  let best = candidates[0];
  let bestScore = calculateCompletenessScore(best);
  
  for (let i = 1; i < candidates.length; i++) {
    const score = calculateCompletenessScore(candidates[i]);
    if (score > bestScore) {
      best = candidates[i];
      bestScore = score;
    }
  }
  
  return best;
};

// ============================================================================
// DEDUPLICATION EXECUTION
// ============================================================================

/**
 * Deduplicate a group of players and return result
 */
export const deduplicateGroup = (
  group: DuplicateGroup
): DeduplicationResult => {
  const canonical = selectCanonicalEntry(group.entries);
  
  const removedEntries = group.entries
    .filter(e => e.originalIndex !== canonical.originalIndex)
    .map(entry => {
      let reason = '';
      
      if (!hasValidImage(entry.photoUrl) && hasValidImage(canonical.photoUrl)) {
        reason = 'Duplicate without image (canonical has image)';
      } else if (calculateCompletenessScore(entry) < calculateCompletenessScore(canonical)) {
        reason = 'Duplicate with less complete metadata';
      } else {
        reason = 'Duplicate entry (first instance kept)';
      }
      
      return {
        ...entry,
        reason
      };
    });
  
  return {
    canonicalEntry: canonical,
    removedEntries,
    metadataComparison: {
      hasImage: hasValidImage(canonical.photoUrl),
      fieldCount: Object.keys(canonical).length,
      completeness: calculateCompletenessScore(canonical)
    }
  };
};

/**
 * Execute full deduplication pipeline
 */
export const deduplicateDatabase = (
  players: Player[]
): DeduplicationReport => {
  // Create backup
  const backup = JSON.parse(JSON.stringify(players));
  
  // Group by normalized name
  const groups = groupDuplicatesByName(players);
  
  // Get only duplicate groups
  const duplicateGroups = getDuplicateGroups(groups);
  
  // Deduplicate each group
  const deduplicationResults: DeduplicationResult[] = duplicateGroups.map(
    group => deduplicateGroup(group)
  );
  
  // Build cleaned database - keep only canonical entries
  const keepIndices = new Set<number>();
  
  // Add all non-duplicate entries
  groups.forEach((entries, normalized) => {
    if (entries.length === 1) {
      keepIndices.add(entries[0].originalIndex);
    }
  });
  
  // Add canonical entries from duplicates
  deduplicationResults.forEach(result => {
    keepIndices.add(result.canonicalEntry.originalIndex);
  });
  
  // Remove indices to maintain original Player structure (without originalIndex)
  const cleanedDatabase = players
    .map((player, index) => ({ ...player, index }))
    .filter(p => keepIndices.has(p.index))
    .map(({ index, ...player }) => player);
  
  // Count removed duplicates
  const totalDuplicatesRemoved = deduplicationResults.reduce(
    (sum, result) => sum + result.removedEntries.length,
    0
  );
  
  return {
    totalPlayers: players.length,
    uniquePlayers: cleanedDatabase.length,
    duplicateGroupsFound: duplicateGroups.length,
    totalDuplicatesRemoved,
    cleanedDatabase,
    deduplicationResults,
    backup,
    reportGeneratedAt: new Date().toISOString()
  };
};

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Format deduplication report as human-readable text
 */
export const formatDeduplicationReport = (report: DeduplicationReport): string => {
  let output = '';
  
  output += '╔════════════════════════════════════════════════════════════════════════════╗\n';
  output += '║              IPL PLAYER INTELLIGENT DEDUPLICATION REPORT                   ║\n';
  output += '╚════════════════════════════════════════════════════════════════════════════╝\n\n';
  
  output += '📊 DEDUPLICATION SUMMARY\n';
  output += '─────────────────────────────────────────────────────────────────────────────\n';
  output += `Total Players (Before):      ${report.totalPlayers}\n`;
  output += `Unique Players (After):      ${report.uniquePlayers}\n`;
  output += `Duplicate Groups Found:      ${report.duplicateGroupsFound}\n`;
  output += `Total Duplicates Removed:    ${report.totalDuplicatesRemoved}\n`;
  output += `Players Cleaned:             ${report.totalPlayers - report.uniquePlayers}\n`;
  output += `Report Generated:            ${new Date(report.reportGeneratedAt).toLocaleString()}\n\n`;
  
  output += '✅ KEPT ENTRIES (Canonical)\n';
  output += '─────────────────────────────────────────────────────────────────────────────\n';
  
  report.deduplicationResults.forEach((result, idx) => {
    const hasImg = result.metadataComparison.hasImage ? '🖼️' : '❌';
    const completeness = result.metadataComparison.completeness;
    
    output += `${idx + 1}. "${result.canonicalEntry.name}" (${result.canonicalEntry.country})\n`;
    output += `   ${hasImg} Image: ${hasValidImage(result.canonicalEntry.photoUrl) ? 'Yes' : 'No'}\n`;
    output += `   📊 Metadata Completeness: ${completeness}%\n`;
    output += `   🏏 Role: ${result.canonicalEntry.role}, ⭐ Rating: ${result.canonicalEntry.starRating}\n`;
    
    if (result.removedEntries.length > 0) {
      output += `   🗑️  Removed ${result.removedEntries.length} duplicate(s):\n`;
      result.removedEntries.forEach(removed => {
        output += `       - "${removed.name}" (Reason: ${removed.reason})\n`;
      });
    }
    output += '\n';
  });
  
  output += '─────────────────────────────────────────────────────────────────────────────\n';
  output += '✨ Deduplication Complete\n\n';
  
  return output;
};

/**
 * Export deduplication report as JSON
 */
export const exportDeduplicationReportJSON = (report: DeduplicationReport): string => {
  return JSON.stringify(report, null, 2);
};

/**
 * Generate detailed cleanup summary
 */
export const generateCleanupSummary = (report: DeduplicationReport): string => {
  const summary = {
    deduplicationDate: new Date(report.reportGeneratedAt).toISOString(),
    statistics: {
      totalPlayersProcessed: report.totalPlayers,
      uniquePlayersRetained: report.uniquePlayers,
      duplicateGroupsFound: report.duplicateGroupsFound,
      totalEntriesRemoved: report.totalDuplicatesRemoved,
      removalPercentage: ((report.totalDuplicatesRemoved / report.totalPlayers) * 100).toFixed(2) + '%'
    },
    deduplicationCriteria: {
      priority1: 'Keep entries with valid images',
      priority2: 'Keep entries with more complete metadata',
      priority3: 'Keep first instance on tie',
      imageValidation: 'URL-based, excludes defaults and placeholders'
    },
    backupCreated: true,
    backupLocation: 'report.backup (in output)'
  };
  
  return JSON.stringify(summary, null, 2);
};

/**
 * Generate kept entries report
 */
export const generateKeptEntriesReport = (report: DeduplicationReport): string => {
  const keptEntries = report.deduplicationResults.map(result => ({
    id: result.canonicalEntry.id,
    name: result.canonicalEntry.name,
    country: result.canonicalEntry.country,
    role: result.canonicalEntry.role,
    hasImage: hasValidImage(result.canonicalEntry.photoUrl),
    imageUrl: result.canonicalEntry.photoUrl,
    starRating: result.canonicalEntry.starRating,
    metadataCompleteness: result.metadataComparison.completeness,
    duplicatesRemoved: result.removedEntries.length,
    removalReasons: result.removedEntries.map(r => r.reason)
  }));
  
  return JSON.stringify(keptEntries, null, 2);
};

/**
 * Generate removed duplicates report
 */
export const generateRemovedDuplicatesReport = (report: DeduplicationReport): string => {
  const removed: any[] = [];
  
  report.deduplicationResults.forEach(result => {
    result.removedEntries.forEach(entry => {
      removed.push({
        id: entry.id,
        name: entry.name,
        country: entry.country,
        role: entry.role,
        hasImage: hasValidImage(entry.photoUrl),
        imageUrl: entry.photoUrl,
        reason: entry.reason,
        keptInsteadOf: result.canonicalEntry.name
      });
    });
  });
  
  return JSON.stringify(removed, null, 2);
};
