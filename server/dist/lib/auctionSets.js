"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuctionQueue = createAuctionQueue;
exports.getAuctionSets = getAuctionSets;
const allPlayers_1 = require("./allPlayers");
function createAuctionQueue() {
    const bySet = {};
    for (const player of allPlayers_1.ALL_PLAYERS) {
        const set = player.auctionSet ?? 9;
        if (!bySet[set])
            bySet[set] = [];
        bySet[set].push(player.id);
    }
    // Shuffle within each set
    const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };
    const queue = [];
    // Sets 1-8 in order, shuffled within each set
    for (let s = 1; s <= 8; s++) {
        if (bySet[s])
            queue.push(...shuffle(bySet[s]));
    }
    // Remaining (set 9) shuffled at end
    if (bySet[9])
        queue.push(...shuffle(bySet[9]));
    return queue;
}
function getAuctionSets() {
    return [
        {
            setNumber: 1,
            setName: 'SET 1 — MARQUEE',
            playerIds: getPlayerIdsByCondition(p => p.starRating === 5 && p.basePrice >= 150),
        },
        {
            setNumber: 2,
            setName: 'SET 2 — ELITE',
            playerIds: getPlayerIdsByCondition(p => p.starRating >= 4 && p.basePrice >= 100 && p.basePrice < 200),
        },
        {
            setNumber: 3,
            setName: 'SET 3 — BATTERS',
            playerIds: getPlayerIdsByCondition(p => (p.role === 'BAT') && p.starRating >= 3 && p.basePrice >= 50),
        },
        {
            setNumber: 4,
            setName: 'SET 4 — ALL-ROUNDERS',
            playerIds: getPlayerIdsByCondition(p => p.role === 'AR' && p.starRating >= 3 && p.basePrice >= 50
                && !getSet1And2Ids().includes(p.id)),
        },
        {
            setNumber: 5,
            setName: 'SET 5 — WICKETKEEPERS',
            playerIds: getPlayerIdsByCondition(p => p.role === 'WK' && !getSet1And2Ids().includes(p.id)),
        },
        {
            setNumber: 6,
            setName: 'SET 6 — FAST BOWLERS',
            playerIds: getPlayerIdsByCondition(p => p.role === 'BOWL' && p.starRating >= 3 && p.basePrice >= 50
                && !getSet1And2Ids().includes(p.id)),
        },
        {
            setNumber: 7,
            setName: 'SET 7 — SPIN BOWLERS',
            playerIds: getPlayerIdsByCondition(p => p.role === 'BOWL' && p.country !== 'India' && p.starRating >= 2
                && !getSet1And2Ids().includes(p.id)),
        },
        {
            setNumber: 8,
            setName: 'SET 8 — BUDGET PICKS',
            playerIds: getPlayerIdsByCondition(p => p.basePrice <= 40 && p.starRating <= 2
                && !p.id.startsWith('unsold-')),
        },
        {
            setNumber: 9,
            setName: 'SET 9 — UNSOLD POOL',
            playerIds: getPlayerIdsByCondition(p => p.id.startsWith('unsold-')),
        },
    ];
}
function getPlayerIdsByCondition(condition) {
    return allPlayers_1.ALL_PLAYERS
        .filter(condition)
        .map(p => p.id);
}
function getSet1And2Ids() {
    const s1 = allPlayers_1.ALL_PLAYERS
        .filter(p => p.starRating === 5 && p.basePrice >= 150)
        .map(p => p.id);
    const s2 = allPlayers_1.ALL_PLAYERS
        .filter(p => p.starRating >= 4 && p.basePrice >= 100 && p.basePrice < 200)
        .map(p => p.id);
    return [...s1, ...s2];
}
