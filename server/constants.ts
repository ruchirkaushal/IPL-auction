import { TeamId, Player } from './types';
import { ALL_PLAYERS } from './lib/allPlayers';

export const ALL_TEAM_IDS: TeamId[] = ['MI', 'CSK', 'RCB', 'KKR', 'DC', 'RR', 'PBKS', 'SRH', 'GT', 'LSG'];
export const PLAYERS: Player[] = ALL_PLAYERS;
export const AUCTION_START_TICKS = Number(process.env.AUCTION_START_TICKS ?? 100);
export const AUCTION_TIMER_TICK_MS = Number(process.env.AUCTION_TIMER_TICK_MS ?? 100);
export const AUCTION_DELAY_RESOLVE_TO_NEXT_MS = Number(process.env.AUCTION_DELAY_RESOLVE_TO_NEXT_MS ?? 4000);
export const AUCTION_DELAY_ADVANCE_TO_BIDDING_MS = Number(process.env.AUCTION_DELAY_ADVANCE_TO_BIDDING_MS ?? 1000);
export const AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS = Number(process.env.AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS ?? 200);
export const SOCKET_PING_INTERVAL_MS = Number(process.env.SOCKET_PING_INTERVAL_MS ?? 25000);
export const SOCKET_PING_TIMEOUT_MS = Number(process.env.SOCKET_PING_TIMEOUT_MS ?? 120000);
export const SOCKET_RECOVERY_WINDOW_MS = Number(process.env.SOCKET_RECOVERY_WINDOW_MS ?? 120000);
