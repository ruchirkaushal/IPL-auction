"use strict";
// Combined IPL 2025/2026 Player Database - All 10 Teams
// Sources: https://www.iplt20.com/teams/*/squad/2025
// Photo URL pattern: https://documents.iplt20.com/ipl/IPLHeadshot2025/{playerID}.png
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PLAYERS = exports.UNSOLD = exports.SRH = exports.RCB = exports.RR = exports.PBKS = exports.MI = exports.LSG = exports.KKR = exports.GT = exports.DC = exports.CSK = void 0;
const players_1 = require("./players");
Object.defineProperty(exports, "CSK", { enumerable: true, get: function () { return players_1.CSK; } });
Object.defineProperty(exports, "DC", { enumerable: true, get: function () { return players_1.DC; } });
const players_gt_kkr_lsg_1 = require("./players-gt-kkr-lsg");
Object.defineProperty(exports, "GT", { enumerable: true, get: function () { return players_gt_kkr_lsg_1.GT; } });
Object.defineProperty(exports, "KKR", { enumerable: true, get: function () { return players_gt_kkr_lsg_1.KKR; } });
Object.defineProperty(exports, "LSG", { enumerable: true, get: function () { return players_gt_kkr_lsg_1.LSG; } });
const players_mi_pbks_1 = require("./players-mi-pbks");
Object.defineProperty(exports, "MI", { enumerable: true, get: function () { return players_mi_pbks_1.MI; } });
Object.defineProperty(exports, "PBKS", { enumerable: true, get: function () { return players_mi_pbks_1.PBKS; } });
const players_rr_rcb_srh_1 = require("./players-rr-rcb-srh");
Object.defineProperty(exports, "RR", { enumerable: true, get: function () { return players_rr_rcb_srh_1.RR; } });
Object.defineProperty(exports, "RCB", { enumerable: true, get: function () { return players_rr_rcb_srh_1.RCB; } });
Object.defineProperty(exports, "SRH", { enumerable: true, get: function () { return players_rr_rcb_srh_1.SRH; } });
const unsold_1 = require("./unsold");
Object.defineProperty(exports, "UNSOLD", { enumerable: true, get: function () { return unsold_1.UNSOLD; } });
// Combined array of ALL players from all 10 IPL teams
exports.ALL_PLAYERS = [
    ...players_1.CSK, // 26 players
    ...players_1.DC, // 23 players
    ...players_gt_kkr_lsg_1.GT, // 26 players (includes Jos Buttler)
    ...players_gt_kkr_lsg_1.KKR, // 21 players
    ...players_gt_kkr_lsg_1.LSG, // 24 players
    ...players_mi_pbks_1.MI, // 23 players
    ...players_mi_pbks_1.PBKS, // 25 players
    ...players_rr_rcb_srh_1.RR, // 20 players
    ...players_rr_rcb_srh_1.RCB, // 23 players
    ...players_rr_rcb_srh_1.SRH, // 21 players
    ...unsold_1.UNSOLD, // 10 players
];
// Total: 242 players
