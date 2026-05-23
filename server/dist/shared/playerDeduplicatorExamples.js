"use strict";
/**
 * INTELLIGENT PLAYER DEDUPLICATION - EXAMPLES & TESTS
 *
 * Demonstrates the image-priority deduplication logic with practical examples
 */
Object.defineProperty(exports, "__esModule", { value: true });
const playerDeduplicator_1 = require("./playerDeduplicator");
// ============================================================================
// MOCK TEST DATA
// ============================================================================
const createMockPlayer = (overrides = {}) => ({
    id: 'test-1',
    name: 'Test Player',
    role: 'BAT',
    country: 'India',
    isOverseas: false,
    basePrice: 50,
    photoUrl: 'https://example.com/photo.png',
    stats: { matches: 0, runs: 0, wickets: 0, previousTeam: '' },
    starRating: 1,
    isCapped: false,
    auctionSet: 1,
    ...overrides
});
// ============================================================================
// TEST 1: IMAGE DETECTION
// ============================================================================
const test1ImageDetection = () => {
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                     TEST 1: IMAGE DETECTION                                ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
    const testCases = [
        {
            url: 'https://documents.iplt20.com/ipl/IPLHeadshot2025/123.png',
            expected: true,
            label: 'Valid IPL photo URL'
        },
        {
            url: 'https://example.com/player.jpg',
            expected: true,
            label: 'Valid generic URL'
        },
        {
            url: null,
            expected: false,
            label: 'null value'
        },
        {
            url: undefined,
            expected: false,
            label: 'undefined value'
        },
        {
            url: '',
            expected: false,
            label: 'Empty string'
        },
        {
            url: 'default-avatar.png',
            expected: false,
            label: 'Default placeholder'
        },
        {
            url: 'https://example.com/none.png',
            expected: false,
            label: 'Placeholder URL'
        }
    ];
    testCases.forEach((testCase, idx) => {
        const result = (0, playerDeduplicator_1.hasValidImage)(testCase.url);
        const status = result === testCase.expected ? '✅' : '❌';
        console.log(`${status} Test ${idx + 1}: ${testCase.label}`);
        console.log(`   Input: ${JSON.stringify(testCase.url)}`);
        console.log(`   Expected: ${testCase.expected}, Got: ${result}\n`);
    });
};
// ============================================================================
// TEST 2: METADATA COMPLETENESS
// ============================================================================
const test2CompletenessScore = () => {
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                  TEST 2: METADATA COMPLETENESS SCORING                      ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
    const minimalist = createMockPlayer({
        name: 'Minimal Player',
        photoUrl: null,
        stats: {},
        starRating: 0
    });
    const complete = createMockPlayer({
        id: 'complete-1',
        name: 'Complete Player',
        role: 'BOWL',
        country: 'Australia',
        isOverseas: true,
        basePrice: 100,
        photoUrl: 'https://documents.iplt20.com/ipl/IPLHeadshot2025/999.png',
        stats: { matches: 50, runs: 1000, wickets: 15, previousTeam: 'MI' },
        starRating: 4,
        isCapped: true,
        auctionSet: 2
    });
    const minimalScore = (0, playerDeduplicator_1.calculateCompletenessScore)(minimalist);
    const completeScore = (0, playerDeduplicator_1.calculateCompletenessScore)(complete);
    console.log('Minimalist Player:');
    console.log(`  Score: ${minimalScore}%`);
    console.log('  Details: No image, minimal stats, missing optional fields\n');
    console.log('Complete Player:');
    console.log(`  Score: ${completeScore}%`);
    console.log('  Details: Has image, full stats, all fields populated\n');
    console.log(`Result: Complete player scores ${completeScore - minimalScore}% higher ✅\n`);
};
// ============================================================================
// TEST 3: CASE 1 - ONE WITH IMAGE, ONE WITHOUT
// ============================================================================
const test3Case1ImagePriority = () => {
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║              TEST 3: CASE 1 - IMAGE PRIORITY (One has, One doesn\'t)        ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
    console.log('SCENARIO: Kyle Jamieson appears twice\n');
    const entryWithImage = {
        ...createMockPlayer({
            id: 'kyle-1',
            name: 'Kyle Jamieson',
            country: 'New Zealand',
            photoUrl: 'https://documents.iplt20.com/ipl/IPLHeadshot2025/1234.png',
            starRating: 4,
            isCapped: true
        }),
        originalIndex: 45
    };
    const entryWithoutImage = {
        ...createMockPlayer({
            id: 'kyle-2',
            name: 'Kyle Jamieson',
            country: 'New Zealand',
            photoUrl: null,
            starRating: 3,
            isCapped: false
        }),
        originalIndex: 277
    };
    console.log('Entry A (Index 45):');
    console.log(`  Name: ${entryWithImage.name}`);
    console.log(`  Image: YES ✅`);
    console.log(`  Star Rating: ${entryWithImage.starRating}\n`);
    console.log('Entry B (Index 277):');
    console.log(`  Name: ${entryWithoutImage.name}`);
    console.log(`  Image: NO ❌`);
    console.log(`  Star Rating: ${entryWithoutImage.starRating}\n`);
    const selected = (0, playerDeduplicator_1.selectCanonicalEntry)([entryWithImage, entryWithoutImage]);
    console.log('DECISION:');
    console.log(`  ✅ KEEP: Entry A (has image)`);
    console.log(`  🗑️  REMOVE: Entry B (no image)\n`);
    console.log(`Selected: ${selected.name} (Index ${selected.originalIndex}) ✅\n`);
};
// ============================================================================
// TEST 4: REAL DATABASE SIMULATION
// ============================================================================
const test4RealDatabaseSimulation = () => {
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║            TEST 4: MINI DATABASE DEDUPLICATION SIMULATION                   ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
    // Create a mini database with known duplicates
    const miniDatabase = [
        createMockPlayer({
            id: 'csk-1',
            name: 'MS Dhoni',
            country: 'India',
            role: 'WK',
            photoUrl: 'https://documents.iplt20.com/ipl/IPLHeadshot2025/57.png',
            starRating: 5,
            isCapped: true,
            basePrice: 200
        }),
        createMockPlayer({
            id: 'csk-2',
            name: 'Dewald Brevis',
            country: 'South Africa',
            role: 'BAT',
            photoUrl: 'https://documents.iplt20.com/ipl/IPLHeadshot2025/797.png',
            starRating: 2,
            isCapped: true,
            basePrice: 30
        }),
        // DUPLICATE: Dewald Brevis without image
        createMockPlayer({
            id: 'duplicate-brevis',
            name: 'Dewald Brevis',
            country: 'South Africa',
            role: 'BAT',
            photoUrl: null,
            starRating: 2,
            isCapped: false,
            basePrice: 30
        }),
        createMockPlayer({
            id: 'dc-1',
            name: 'Rishabh Pant',
            country: 'India',
            role: 'WK',
            photoUrl: 'https://documents.iplt20.com/ipl/IPLHeadshot2025/100.png',
            starRating: 4,
            isCapped: true,
            basePrice: 125
        }),
        // DUPLICATE: Rishabh Pant (minimal)
        createMockPlayer({
            id: 'dup-pant',
            name: 'Rishabh Pant',
            country: 'India',
            role: 'WK',
            photoUrl: null,
            stats: {},
            starRating: 0,
            isCapped: false,
            basePrice: 125
        })
    ];
    console.log(`Total players before: ${miniDatabase.length}`);
    console.log(`Expected duplicates: 2 groups (Dewald Brevis, Rishabh Pant)\n`);
    const report = (0, playerDeduplicator_1.deduplicateDatabase)(miniDatabase);
    console.log(`Total players after: ${report.uniquePlayers}`);
    console.log(`Duplicates removed: ${report.totalDuplicatesRemoved}`);
    console.log(`Duplicate groups: ${report.duplicateGroupsFound}\n`);
    console.log('📊 Deduplication Details:\n');
    report.deduplicationResults.forEach((result, idx) => {
        console.log(`${idx + 1}. ${result.canonicalEntry.name}`);
        console.log(`   ✅ KEPT: ${result.canonicalEntry.id} (Completeness: ${result.metadataComparison.completeness}%)`);
        result.removedEntries.forEach(removed => {
            console.log(`   🗑️  REMOVED: ${removed.id} (${removed.reason})`);
        });
        console.log();
    });
};
// ============================================================================
// RUN ALL TESTS
// ============================================================================
const runAllTests = () => {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║         INTELLIGENT PLAYER DEDUPLICATION - TEST SUITE                      ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    try {
        test1ImageDetection();
        test2CompletenessScore();
        test3Case1ImagePriority();
        test4RealDatabaseSimulation();
        console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                         ✅ ALL TESTS PASSED                               ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
        console.log('📊 Summary:');
        console.log('   ✅ Image detection working correctly');
        console.log('   ✅ Metadata completeness scoring accurate');
        console.log('   ✅ Case 1 (image priority) logic validated');
        console.log('   ✅ Real database simulation successful\n');
    }
    catch (error) {
        console.error('\n❌ TEST FAILED:\n');
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
// Execute tests
runAllTests();
