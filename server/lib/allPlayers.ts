// Combined IPL 2025/2026 Player Database - All 10 Teams
// Sources: https://www.iplt20.com/teams/*/squad/2025
// Photo URL pattern: https://documents.iplt20.com/ipl/IPLHeadshot2025/{playerID}.png

import { normalizeBasePrice } from '../../shared/auctionPricing';

import { CSK, DC } from './players';
import { GT, KKR, LSG } from './players-gt-kkr-lsg';
import { MI, PBKS } from './players-mi-pbks';
import { RR, RCB, SRH } from './players-rr-rcb-srh';
import { UNSOLD } from './unsold';

// Re-export individual teams
export { CSK, DC, GT, KKR, LSG, MI, PBKS, RR, RCB, SRH, UNSOLD };

// Combined array of ALL players from all 10 IPL teams
export const ALL_PLAYERS = [
  ...CSK,   // 26 players
  ...DC,    // 23 players
  ...GT,    // 26 players (includes Jos Buttler)
  ...KKR,   // 21 players
  ...LSG,   // 24 players
  ...MI,    // 23 players
  ...PBKS,  // 25 players
  ...RR,    // 20 players
  ...RCB,   // 23 players
  ...SRH,   // 21 players
  ...UNSOLD,// 10 players
].map((player) => {
  return {
    ...player,
    image: player.photoUrl,
    photoUrl: player.photoUrl,
    basePrice: normalizeBasePrice(player.basePrice),
  };
});
// Total: 242 players
