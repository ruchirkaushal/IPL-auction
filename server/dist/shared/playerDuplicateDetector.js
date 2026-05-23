"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManualReviewList = exports.exportDuplicateReportJSON = exports.formatDuplicateReport = exports.generateDuplicateReport = exports.scanFuzzyDuplicates = exports.scanExactDuplicates = exports.fuzzyMatchScore = exports.tokenOverlapSimilarity = exports.getNameTokens = exports.stringSimilarity = exports.levenshteinDistance = exports.getNormalizedKey = exports.normalizePlayerName = void 0;
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
const normalizePlayerName = (name) => {
    if (!name || typeof name !== 'string')
        return '';
    return name
        .toLowerCase()
        .trim()
        .replace(/\./g, '') // remove periods (K.S → KS)
        .replace(/[()[\]{}]/g, '') // remove brackets/parens
        .replace(/\s+/g, ' ') // collapse multiple spaces to single
        .trim();
};
exports.normalizePlayerName = normalizePlayerName;
/**
 * Create a normalized key for grouping similar names
 */
const getNormalizedKey = (name) => {
    return (0, exports.normalizePlayerName)(name);
};
exports.getNormalizedKey = getNormalizedKey;
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
const levenshteinDistance = (s1, s2) => {
    const str1 = (0, exports.normalizePlayerName)(s1);
    const str2 = (0, exports.normalizePlayerName)(s2);
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1)
        .fill(null)
        .map(() => Array(len1 + 1).fill(0));
    for (let i = 0; i <= len1; i++)
        matrix[0][i] = i;
    for (let j = 0; j <= len2; j++)
        matrix[j][0] = j;
    for (let j = 1; j <= len2; j++) {
        for (let i = 1; i <= len1; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
        }
    }
    return matrix[len2][len1];
};
exports.levenshteinDistance = levenshteinDistance;
/**
 * Calculate string similarity as percentage (0-100)
 * Based on Levenshtein distance
 */
const stringSimilarity = (s1, s2) => {
    const n1 = (0, exports.normalizePlayerName)(s1);
    const n2 = (0, exports.normalizePlayerName)(s2);
    const maxLen = Math.max(n1.length, n2.length);
    if (maxLen === 0)
        return 100;
    const distance = (0, exports.levenshteinDistance)(n1, n2);
    return Math.round(((maxLen - distance) / maxLen) * 100);
};
exports.stringSimilarity = stringSimilarity;
/**
 * Extract tokens from a normalized name
 * Example: "virat kohli" → ["virat", "kohli"]
 */
const getNameTokens = (name) => {
    return (0, exports.normalizePlayerName)(name)
        .split(/\s+/)
        .filter((token) => token.length > 0);
};
exports.getNameTokens = getNameTokens;
/**
 * Calculate token overlap similarity
 * Useful for detecting transposed names or extra words
 */
const tokenOverlapSimilarity = (s1, s2) => {
    const tokens1 = new Set((0, exports.getNameTokens)(s1));
    const tokens2 = new Set((0, exports.getNameTokens)(s2));
    if (tokens1.size === 0 && tokens2.size === 0)
        return 100;
    if (tokens1.size === 0 || tokens2.size === 0)
        return 0;
    const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);
    return Math.round((intersection.size / union.size) * 100);
};
exports.tokenOverlapSimilarity = tokenOverlapSimilarity;
/**
 * Comprehensive fuzzy match scoring
 * Combines multiple algorithms for robust detection
 */
const fuzzyMatchScore = (s1, s2) => {
    const similarity = (0, exports.stringSimilarity)(s1, s2);
    const tokenSimilarity = (0, exports.tokenOverlapSimilarity)(s1, s2);
    // Weighted average: 60% Levenshtein, 40% token overlap
    return Math.round(similarity * 0.6 + tokenSimilarity * 0.4);
};
exports.fuzzyMatchScore = fuzzyMatchScore;
/**
 * Scan player database for exact duplicates (same normalized name)
 */
const scanExactDuplicates = (players) => {
    const nameMap = new Map();
    players.forEach((player, index) => {
        const normalized = (0, exports.getNormalizedKey)(player.name);
        if (!nameMap.has(normalized)) {
            nameMap.set(normalized, {
                originalNames: [],
                normalizedName: normalized,
                count: 0,
                indices: [],
            });
        }
        const entry = nameMap.get(normalized);
        if (!entry.originalNames.includes(player.name)) {
            entry.originalNames.push(player.name);
        }
        entry.count += 1;
        entry.indices.push(index);
    });
    // Filter to only actual duplicates
    return Array.from(nameMap.values()).filter((entry) => entry.count > 1);
};
exports.scanExactDuplicates = scanExactDuplicates;
/**
 * Scan for fuzzy duplicates using Levenshtein distance
 *
 * Thresholds:
 * - similarity >= 92: very likely duplicate
 * - similarity >= 85: likely duplicate
 * - similarity >= 75: possible duplicate
 */
const scanFuzzyDuplicates = (players, similarityThreshold = 85) => {
    const matches = [];
    const checked = new Set();
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const key = `${i}-${j}`;
            if (checked.has(key))
                continue;
            checked.add(key);
            const name1 = players[i].name;
            const name2 = players[j].name;
            // Skip if exact same (already caught by exact duplicate scan)
            if ((0, exports.normalizePlayerName)(name1) === (0, exports.normalizePlayerName)(name2)) {
                continue;
            }
            const similarity = (0, exports.fuzzyMatchScore)(name1, name2);
            const distance = (0, exports.levenshteinDistance)(name1, name2);
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
exports.scanFuzzyDuplicates = scanFuzzyDuplicates;
/**
 * Generate comprehensive duplicate report
 */
const generateDuplicateReport = (players, fuzzyThreshold = 85) => {
    const exactDuplicates = (0, exports.scanExactDuplicates)(players);
    const fuzzyDuplicates = (0, exports.scanFuzzyDuplicates)(players, fuzzyThreshold);
    // Get unique names
    const uniqueNormalized = new Set();
    const uniqueOriginal = new Set();
    players.forEach((player) => {
        const normalized = (0, exports.normalizePlayerName)(player.name);
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
exports.generateDuplicateReport = generateDuplicateReport;
// ============================================================================
// REPORTING & FORMATTING
// ============================================================================
/**
 * Format duplicate report as readable text
 */
const formatDuplicateReport = (report) => {
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
    }
    else {
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
    }
    else {
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
exports.formatDuplicateReport = formatDuplicateReport;
/**
 * Export duplicate report as JSON
 */
const exportDuplicateReportJSON = (report) => {
    return JSON.stringify(report, null, 2);
};
exports.exportDuplicateReportJSON = exportDuplicateReportJSON;
/**
 * Get recommended duplicates for manual review
 * Combines exact duplicates and high-confidence fuzzy matches
 */
const getManualReviewList = (report) => {
    const reviewList = [];
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
exports.getManualReviewList = getManualReviewList;
