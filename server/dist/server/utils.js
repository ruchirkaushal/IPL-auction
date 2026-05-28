"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetNameForPlayer = exports.shuffleArray = exports.getPlayerById = void 0;
const constants_1 = require("./constants");
const auctionSets_1 = require("./lib/auctionSets");
const getPlayerById = (id) => constants_1.PLAYERS.find(p => p.id === id);
exports.getPlayerById = getPlayerById;
const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};
exports.shuffleArray = shuffleArray;
const getSetNameForPlayer = (playerId) => {
    const sets = (0, auctionSets_1.getAuctionSets)();
    const match = sets.find(s => s.playerIds.includes(playerId));
    return match ? match.setName : '';
};
exports.getSetNameForPlayer = getSetNameForPlayer;
