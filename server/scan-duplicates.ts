#!/usr/bin/env ts-node

/**
 * Player Database Duplicate Scanner CLI
 * 
 * Usage:
 *   npm run scan-duplicates -- ./reports
 *   ts-node scan-duplicates.ts ./reports
 * 
 * Outputs:
 *   - duplicate-report.txt (human-readable)
 *   - duplicate-report.json (machine-readable)
 *   - unique-players.json (cleaned unique list)
 *   - manual-review.json (items requiring human verification)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { DuplicateReport } from '../shared/playerDuplicateDetector.ts';
import {
  generateDuplicateReport,
  formatDuplicateReport,
  exportDuplicateReportJSON,
  getManualReviewList,
  normalizePlayerName,
  scanExactDuplicates,
} from '../shared/playerDuplicateDetector.ts';

// Get directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// LOAD PLAYER DATABASE
// ============================================================================

/**
 * Dynamically import the player database
 */
async function loadPlayerDatabase(): Promise<any[]> {
  try {
    const module = await import('./lib/allPlayers.ts');
    return module.ALL_PLAYERS;
  } catch (error) {
    console.error('❌ Error loading player database:', error);
    process.exit(1);
  }
}

// ============================================================================
// GENERATE OUTPUT FILES
// ============================================================================

/**
 * Ensure output directory exists
 */
function ensureOutputDir(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }
}

/**
 * Get unique players (deduplicated by normalized name)
 */
function getUniquePlayersList(
  players: any[],
  exactDuplicates: any[]
): any[] {
  const seenNormalized = new Set<string>();
  const uniquePlayers: any[] = [];

  // First pass: add all non-duplicate entries
  players.forEach((player, index) => {
    const normalized = normalizePlayerName(player.name);

    // Check if this player is part of an exact duplicate group
    let isDuplicate = false;
    for (const dupGroup of exactDuplicates) {
      if (dupGroup.indices.includes(index)) {
        isDuplicate = true;
        break;
      }
    }

    // If not a duplicate, add it
    if (!isDuplicate) {
      if (!seenNormalized.has(normalized)) {
        seenNormalized.add(normalized);
        uniquePlayers.push({
          ...player,
          _normalizedName: normalized,
        });
      }
    }
  });

  return uniquePlayers.sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Save report files
 */
function saveReports(
  report: DuplicateReport,
  uniquePlayers: any[],
  manualReviewList: any[],
  outputDir: string
): void {
  // Human-readable text report
  const textReport = formatDuplicateReport(report);
  const textPath = path.join(outputDir, 'duplicate-report.txt');
  fs.writeFileSync(textPath, textReport);
  console.log(`✅ Text report saved to: ${textPath}`);

  // Machine-readable JSON report
  const jsonReport = exportDuplicateReportJSON(report);
  const jsonPath = path.join(outputDir, 'duplicate-report.json');
  fs.writeFileSync(jsonPath, jsonReport);
  console.log(`✅ JSON report saved to: ${jsonPath}`);

  // Unique players list (cleaned)
  const uniquePath = path.join(outputDir, 'unique-players.json');
  fs.writeFileSync(
    uniquePath,
    JSON.stringify(
      {
        count: uniquePlayers.length,
        players: uniquePlayers,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`✅ Unique players list saved to: ${uniquePath}`);

  // Manual review list
  const manualReviewPath = path.join(outputDir, 'manual-review.json');
  fs.writeFileSync(
    manualReviewPath,
    JSON.stringify(
      {
        count: manualReviewList.length,
        items: manualReviewList,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`✅ Manual review list saved to: ${manualReviewPath}`);

  // Summary stats
  const summaryPath = path.join(outputDir, 'summary.json');
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        totalPlayers: report.totalPlayers,
        uniquePlayers: report.uniqueCount,
        exactDuplicatesFound: report.exactDuplicates.length,
        exactDuplicateEntries: report.exactDuplicateCount,
        fuzzyDuplicatesFound: report.fuzzyDuplicateCount,
        manualReviewItemsCount: manualReviewList.length,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`✅ Summary saved to: ${summaryPath}`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║              IPL PLAYER DATABASE DUPLICATE SCANNER v1.0                    ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  // Get output directory from CLI args
  const outputDir = process.argv[2] || path.join(__dirname, 'duplicate-reports');

  console.log(`📂 Output directory: ${outputDir}`);
  ensureOutputDir(outputDir);

  // Load player database
  console.log('\n🔄 Loading player database...');
  const players = await loadPlayerDatabase();
  console.log(`   Loaded ${players.length} total players`);

  // Generate duplicate report
  console.log('\n🔍 Scanning for duplicates...');
  const report = generateDuplicateReport(players, 85);

  // Get unique players
  console.log('\n🧹 Generating unique players list...');
  const uniquePlayers = getUniquePlayersList(players, report.exactDuplicates);

  // Get manual review list
  const manualReviewList = getManualReviewList(report);

  // Save all reports
  console.log('\n💾 Saving reports...');
  saveReports(report, uniquePlayers, manualReviewList, outputDir);

  // Print summary to console
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                              SCAN RESULTS                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 Database Statistics
   Total players:           ${report.totalPlayers}
   Unique players:          ${report.uniqueCount}
   Duplicate entries:       ${report.exactDuplicateCount}

🔴 Exact Duplicates
   Groups found:            ${report.exactDuplicates.length}
   ${report.exactDuplicates.length > 0 ? report.exactDuplicates.map((d) => `   • "${d.normalizedName}" (${d.count} entries)`).join('\n') : '   ✅ None found'}

🟡 Fuzzy Duplicates
   Possible matches:        ${report.fuzzyDuplicateCount}
   ${report.fuzzyDuplicateCount > 0 ? `   ${report.fuzzyDuplicates.slice(0, 5).map((d) => `   • "${d.name1}" ↔ "${d.name2}" (${d.similarity}%)`).join('\n')}${report.fuzzyDuplicateCount > 5 ? `\n   ... and ${report.fuzzyDuplicateCount - 5} more` : ''}` : '   ✅ None found'}

📋 Manual Review
   Items requiring review:  ${manualReviewList.length}

✅ All reports saved to: ${outputDir}

📁 Files created:
   • duplicate-report.txt   (human-readable summary)
   • duplicate-report.json  (detailed data)
   • unique-players.json    (cleaned unique list)
   • manual-review.json     (items for review)
   • summary.json           (quick stats)
`);

  console.log(`\n✨ Scan completed at ${new Date().toLocaleString()}\n`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
