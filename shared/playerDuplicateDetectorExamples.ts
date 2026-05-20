/**
 * Player Duplicate Detector - Usage Examples & Integration Guide
 * 
 * Shows how to use the duplicate detection system in various scenarios:
 * 1. One-off database scanning
 * 2. Import-time validation
 * 3. Continuous monitoring
 * 4. Batch duplicate fixing
 */

import {
  normalizePlayerName,
  levenshteinDistance,
  stringSimilarity,
  fuzzyMatchScore,
  generateDuplicateReport,
  formatDuplicateReport,
  scanExactDuplicates,
  scanFuzzyDuplicates,
  getManualReviewList,
} from './playerDuplicateDetector';

// ============================================================================
// EXAMPLE 1: One-off Database Scan
// ============================================================================

export function example1_ScanEntireDatabase() {
  console.log('\n📊 EXAMPLE 1: Scan entire database');

  // In real usage, you'd load from ALL_PLAYERS
  const mockPlayers = [
    { id: '1', name: 'Virat Kohli' },
    { id: '2', name: 'virat kohli' }, // exact duplicate, different case
    { id: '3', name: 'V. Kohli' }, // fuzzy duplicate
    { id: '4', name: 'Rohit Sharma' },
    { id: '5', name: 'Ms Dhoni' }, // typo
    { id: '6', name: 'M.S Dhoni' }, // period variation
    { id: '7', name: 'K.S Bharat' },
    { id: '8', name: 'KS Bharat' }, // period removed
  ];

  const report = generateDuplicateReport(mockPlayers, 85);
  const formattedReport = formatDuplicateReport(report);

  console.log(formattedReport);
  console.log(`\n✅ Found ${report.exactDuplicates.length} exact duplicate groups`);
  console.log(`⚠️  Found ${report.fuzzyDuplicateCount} possible duplicate pairs`);
}

// ============================================================================
// EXAMPLE 2: Import-Time Validation
// ============================================================================

export function example2_ValidateNewImport(newPlayers: any[]) {
  console.log('\n🔄 EXAMPLE 2: Validate import before adding to database');

  const exactDups = scanExactDuplicates(newPlayers);
  const fuzzyDups = scanFuzzyDuplicates(newPlayers, 90);

  if (exactDups.length > 0) {
    console.log('⚠️  IMPORT BLOCKED: Exact duplicates detected within import!');
    exactDups.forEach((dup) => {
      console.log(
        `   "${dup.originalNames.join('" vs "')}" - ${dup.count} entries`
      );
    });
    return false; // Block import
  }

  if (fuzzyDups.length > 0) {
    console.log(
      '⚠️  WARNING: High-confidence fuzzy duplicates detected in import'
    );
    fuzzyDups.slice(0, 3).forEach((match) => {
      console.log(
        `   "${match.name1}" ↔ "${match.name2}" (${match.similarity}% similar)`
      );
    });
    console.log('   ⚠️  Proceed with caution - manual review recommended');
  }

  console.log('✅ Import validation passed');
  return true; // Allow import
}

// ============================================================================
// EXAMPLE 3: Check for Cross-Database Duplicates
// ============================================================================

export function example3_CheckAgainstExistingDatabase(
  existingPlayers: any[],
  newImportPlayers: any[]
) {
  console.log('\n🔍 EXAMPLE 3: Check new import against existing database');

  const crossDuplicates: {
    newPlayer: string;
    existingPlayer: string;
    similarity: number;
  }[] = [];

  newImportPlayers.forEach((newPlayer) => {
    existingPlayers.forEach((existing) => {
      const similarity = fuzzyMatchScore(newPlayer.name, existing.name);

      // Flag if similarity > 88
      if (similarity > 88) {
        crossDuplicates.push({
          newPlayer: newPlayer.name,
          existingPlayer: existing.name,
          similarity,
        });
      }
    });
  });

  if (crossDuplicates.length > 0) {
    console.log(`⚠️  Found ${crossDuplicates.length} potential duplicates`);
    crossDuplicates.slice(0, 5).forEach((dup) => {
      console.log(
        `   "${dup.newPlayer}" matches "${dup.existingPlayer}" (${dup.similarity}%)`
      );
    });
  } else {
    console.log('✅ No cross-database duplicates detected');
  }

  return crossDuplicates;
}

// ============================================================================
// EXAMPLE 4: Batch Deduplication
// ============================================================================

export function example4_BatchDeduplication(players: any[]) {
  console.log('\n🧹 EXAMPLE 4: Deduplicate list (keep first of each group)');

  const deduped: any[] = [];
  const seenNormalized = new Set<string>();

  players.forEach((player) => {
    const normalized = normalizePlayerName(player.name);

    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      deduped.push(player);
    }
  });

  console.log(`   Original: ${players.length} players`);
  console.log(`   After dedup: ${deduped.length} unique players`);
  console.log(`   Removed: ${players.length - deduped.length} duplicates`);

  return deduped;
}

// ============================================================================
// EXAMPLE 5: Manual Duplicate Resolution
// ============================================================================

export interface DuplicateResolution {
  normalizedName: string;
  keepIndex: number; // which entry to keep
  mergeIndices: number[]; // which entries to remove
  reason: string;
}

export function example5_ResolveDuplicates(
  players: any[],
  resolutions: DuplicateResolution[]
): any[] {
  console.log('\n✏️  EXAMPLE 5: Manually resolve duplicates');

  const indicesToRemove = new Set<number>();

  resolutions.forEach((resolution) => {
    resolution.mergeIndices.forEach((idx) => {
      indicesToRemove.add(idx);
    });
  });

  const resolved = players.filter((_, idx) => !indicesToRemove.has(idx));

  console.log(`   Original: ${players.length} players`);
  console.log(`   After manual resolution: ${resolved.length} players`);
  console.log(`   Removed: ${indicesToRemove.size} duplicates`);

  return resolved;
}

// ============================================================================
// EXAMPLE 6: Monitoring & Alerts
// ============================================================================

export interface DuplicateAlert {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  count: number;
}

export function example6_MonitoringAndAlerts(
  report: ReturnType<typeof generateDuplicateReport>
): DuplicateAlert[] {
  console.log('\n🚨 EXAMPLE 6: Generate alerts from scan results');

  const alerts: DuplicateAlert[] = [];

  // Critical: exact duplicates
  if (report.exactDuplicates.length > 0) {
    alerts.push({
      severity: 'critical',
      message: `Found ${report.exactDuplicates.length} exact duplicate groups`,
      count: report.exactDuplicateCount,
    });
  }

  // Warning: fuzzy duplicates
  if (report.fuzzyDuplicateCount > 0) {
    const veryHighConfidence = report.fuzzyDuplicates.filter(
      (f) => f.similarity >= 92
    );
    if (veryHighConfidence.length > 0) {
      alerts.push({
        severity: 'warning',
        message: `Found ${veryHighConfidence.length} very likely duplicates (90%+ similar)`,
        count: veryHighConfidence.length,
      });
    }
  }

  // Info: general stats
  if (report.uniqueCount < report.totalPlayers) {
    alerts.push({
      severity: 'info',
      message: `Database has ${report.totalPlayers - report.uniqueCount} duplicate entries`,
      count: report.totalPlayers - report.uniqueCount,
    });
  }

  alerts.forEach((alert) => {
    const emoji = { critical: '🔴', warning: '🟡', info: '🔵' }[alert.severity];
    console.log(`${emoji} ${alert.message} (${alert.count})`);
  });

  return alerts;
}

// ============================================================================
// NAME NORMALIZATION EXAMPLES
// ============================================================================

export function example7_NameNormalization() {
  console.log('\n🔤 EXAMPLE 7: Name normalization in action');

  const testNames = [
    'K.S Bharat',
    'KS Bharat',
    ' k.s  bharat ',
    'Rassie Van Der Dussen',
    'Rassie van der Dussen',
    'Mohd. Arshad Khan',
    'Mohammed Arshad Khan',
  ];

  testNames.forEach((name) => {
    const normalized = normalizePlayerName(name);
    console.log(`   "${name}" → "${normalized}"`);
  });
}

// ============================================================================
// SIMILARITY SCORING EXAMPLES
// ============================================================================

export function example8_SimilarityScoring() {
  console.log('\n📊 EXAMPLE 8: Similarity scoring');

  const pairs: [string, string][] = [
    ['Virat Kohli', 'virat kohli'],
    ['K.S Bharat', 'KS Bharat'],
    ['Rohit Sharma', 'Rohit Sharma'],
    ['Ms Dhoni', 'M.S Dhoni'],
    ['Virat Kohli', 'Rohit Sharma'],
  ];

  pairs.forEach(([name1, name2]) => {
    const similarity = stringSimilarity(name1, name2);
    const distance = levenshteinDistance(name1, name2);
    const fuzzyScore = fuzzyMatchScore(name1, name2);

    console.log(`\n   "${name1}" vs "${name2}"`);
    console.log(`   • String similarity: ${similarity}%`);
    console.log(`   • Levenshtein distance: ${distance}`);
    console.log(`   • Fuzzy match score: ${fuzzyScore}%`);
  });
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export function runAllExamples() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║            Player Duplicate Detector - Usage Examples                     ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  example1_ScanEntireDatabase();
  example7_NameNormalization();
  example8_SimilarityScoring();

  // Example 2 with mock data
  const mockImport = [
    { id: '101', name: 'Jasprit Bumrah' },
    { id: '102', name: 'jasiprit bumrah' }, // typo
  ];
  example2_ValidateNewImport(mockImport);

  // Example 4 with mock data
  const mockPlayers = [
    { id: '1', name: 'Virat Kohli' },
    { id: '2', name: 'VIRAT KOHLI' },
    { id: '3', name: 'Rohit Sharma' },
  ];
  example4_BatchDeduplication(mockPlayers);

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    Examples completed successfully!                        ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
