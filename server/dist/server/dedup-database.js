#!/usr/bin/env node
"use strict";
/**
 * IPL PLAYER DATABASE INTELLIGENT DEDUPLICATION CLI
 *
 * Safe deduplication with image-priority logic
 *
 * Usage:
 *   npx ts-node dedup-database.ts [output-dir] [--dry-run] [--backup-only]
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const allPlayers_1 = require("./lib/allPlayers");
const playerDeduplicator_1 = require("../shared/playerDeduplicator");
// ============================================================================
// CLI CONFIGURATION
// ============================================================================
const args = process.argv.slice(2);
const outputDir = args[0] || './deduplication-reports';
const isDryRun = args.includes('--dry-run');
const backupOnly = args.includes('--backup-only');
const timestamp = new Date().toISOString().split('T')[0];
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const ensureOutputDir = (dir) => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created output directory: ${dir}\n`);
    }
};
const writeFile = (filePath, content) => {
    fs_1.default.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Saved to: ${filePath}`);
};
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
// ============================================================================
// MAIN EXECUTION
// ============================================================================
const main = async () => {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║           IPL PLAYER DATABASE INTELLIGENT DEDUPLICATION v1.0              ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
    // Ensure output directory exists
    ensureOutputDir(outputDir);
    console.log('📂 Output directory: ' + outputDir);
    if (isDryRun) {
        console.log('🔍 DRY RUN MODE - No files will be modified\n');
    }
    if (backupOnly) {
        console.log('💾 BACKUP ONLY MODE - Creating backup without deduplication\n');
    }
    try {
        // Load players
        console.log('🔄 Loading player database...');
        console.log(`   Loaded ${allPlayers_1.ALL_PLAYERS.length} total players\n`);
        // Run deduplication
        console.log('🧹 Executing intelligent deduplication...');
        console.log('   Priority: Image availability → Metadata completeness\n');
        const report = (0, playerDeduplicator_1.deduplicateDatabase)(allPlayers_1.ALL_PLAYERS);
        // Display summary
        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                         DEDUPLICATION SUMMARY                              ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
        console.log(`📊 Database Statistics`);
        console.log(`   Total players (before):      ${report.totalPlayers}`);
        console.log(`   Unique players (after):      ${report.uniquePlayers}`);
        console.log(`   Duplicate groups found:      ${report.duplicateGroupsFound}`);
        console.log(`   Total entries removed:       ${report.totalDuplicatesRemoved}\n`);
        console.log(`📈 Cleaning Efficiency`);
        const removalRate = ((report.totalDuplicatesRemoved / report.totalPlayers) * 100).toFixed(2);
        console.log(`   Removal rate:                ${removalRate}%`);
        console.log(`   Data retention:              ${(100 - parseFloat(removalRate)).toFixed(2)}%\n`);
        // Generate reports
        if (!backupOnly) {
            console.log('💾 Generating reports...\n');
            const textReport = (0, playerDeduplicator_1.formatDeduplicationReport)(report);
            const jsonReport = (0, playerDeduplicator_1.exportDeduplicationReportJSON)(report);
            const summary = (0, playerDeduplicator_1.generateCleanupSummary)(report);
            const keptEntries = (0, playerDeduplicator_1.generateKeptEntriesReport)(report);
            const removedEntries = (0, playerDeduplicator_1.generateRemovedDuplicatesReport)(report);
            // Save files
            const files = {
                'deduplication-report.txt': textReport,
                'deduplication-report.json': jsonReport,
                'cleanup-summary.json': summary,
                'kept-entries.json': keptEntries,
                'removed-duplicates.json': removedEntries,
                'cleaned-player-database.json': JSON.stringify(report.cleanedDatabase, null, 2),
                'original-backup.json': JSON.stringify(report.backup, null, 2)
            };
            if (isDryRun) {
                console.log('🔍 DRY RUN: Would save the following files:\n');
                Object.keys(files).forEach(fileName => {
                    const content = files[fileName];
                    const size = formatFileSize(Buffer.byteLength(content, 'utf-8'));
                    console.log(`   📄 ${fileName} (${size})`);
                });
                console.log('\n💡 Run without --dry-run to actually save files.\n');
            }
            else {
                Object.entries(files).forEach(([fileName, content]) => {
                    const filePath = path_1.default.join(outputDir, fileName);
                    writeFile(filePath, content);
                    const size = formatFileSize(Buffer.byteLength(content, 'utf-8'));
                    console.log(`   ${size}`);
                });
                console.log();
            }
        }
        // Create backup
        console.log('💾 Creating backup...');
        const backupPath = path_1.default.join(outputDir, `database-backup-${timestamp}.json`);
        if (!isDryRun) {
            writeFile(backupPath, JSON.stringify(report.backup, null, 2));
        }
        else {
            const backupSize = formatFileSize(Buffer.byteLength(JSON.stringify(report.backup), 'utf-8'));
            console.log(`✅ (DRY RUN) Would save: database-backup-${timestamp}.json (${backupSize})`);
        }
        console.log();
        // Detailed breakdown
        if (report.deduplicationResults.length > 0) {
            console.log('🔴 DUPLICATE GROUPS PROCESSED\n');
            report.deduplicationResults.forEach((result, idx) => {
                const hasImage = result.metadataComparison.hasImage ? '🖼️' : '❌';
                console.log(`${idx + 1}. "${result.canonicalEntry.name}" ${hasImage} ` +
                    `(Completeness: ${result.metadataComparison.completeness}%) ` +
                    `[Removed ${result.removedEntries.length}]`);
            });
            console.log();
        }
        // Success
        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                    ✅ DEDUPLICATION SUCCESSFUL                            ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
        console.log(`📁 All reports saved to: ${outputDir}\n`);
        console.log('📋 Generated Files:');
        console.log('   • deduplication-report.txt     (human-readable summary)');
        console.log('   • deduplication-report.json    (detailed analysis)');
        console.log('   • cleaned-player-database.json (deduplicated data)');
        console.log('   • removed-duplicates.json      (removed entries)');
        console.log('   • kept-entries.json            (canonical entries)');
        console.log('   • cleanup-summary.json         (statistics)');
        console.log(`   • database-backup-${timestamp}.json   (original backup)\n`);
        console.log('🚀 Next Steps:');
        console.log('   1. Review removed-duplicates.json for accuracy');
        console.log('   2. Verify cleanup-summary.json statistics');
        console.log('   3. Test cleaned-player-database.json in staging');
        console.log('   4. Deploy to production when ready');
        console.log('   5. Keep database-backup-*.json for rollback\n');
        console.log('✨ Deduplication pipeline complete!\n');
    }
    catch (error) {
        console.error('\n❌ ERROR during deduplication:\n');
        if (error instanceof Error) {
            console.error(error.message);
            console.error(error.stack);
        }
        else {
            console.error(error);
        }
        process.exit(1);
    }
};
// Run
main();
