/**
 * Telemetry.ts
 * In-room lifecycle tracking, interval registry, and auction event logging.
 * Zero dependencies on io — pure server-side diagnostics.
 */

import { Room, RoomState } from '../types';

// ---------------------------------------------------------------------------
// Interval Registry Helpers
// ---------------------------------------------------------------------------

export const recordLifecycle = (room: Room, event: string, context?: any) => {
  room.lifecycleTimeline.push({ time: Date.now(), event, context });
  if (room.lifecycleTimeline.length > 50) room.lifecycleTimeline.shift();
  console.log(`[LIFECYCLE: ${room.state.roomCode}] ${event}`, context ? JSON.stringify(context) : '');
};

export const registerInterval = (room: Room, key: string, purpose: string) => {
  room.intervalRegistry[key] = { purpose, createdAt: Date.now(), lastExecutedAt: 0 };
};

export const markIntervalExecuted = (room: Room, key: string) => {
  if (room.intervalRegistry[key]) room.intervalRegistry[key].lastExecutedAt = Date.now();
};

export const unregisterInterval = (room: Room, key: string) => {
  delete room.intervalRegistry[key];
};

// ---------------------------------------------------------------------------
// Auction Event Logger
// ---------------------------------------------------------------------------

export const getCurrentPlayerId = (state: RoomState): string | null => {
  return state.auction.auctionQueue[state.auction.currentPlayerIndex] ?? null;
};

export const logAuctionEvent = (room: Room, event: string, meta: Record<string, unknown> = {}) => {
  const auction = room.state.auction;
  const currentPlayerId = getCurrentPlayerId(room.state);
  console.log(
    `[DIAGNOSTICS: AUCTION] ${room.state.roomCode} :: ${event} :: phase=${auction.phase} idx=${auction.currentPlayerIndex}/${auction.auctionQueue.length} ticks=${auction.ticks} paused=${auction.isPaused} advancing=${auction.isAdvancing} current=${currentPlayerId ?? 'none'} ${JSON.stringify(meta)}`
  );
};

// ---------------------------------------------------------------------------
// Global Event-Loop Lag Monitor
// ---------------------------------------------------------------------------

let lastTickTime = Date.now();
setInterval(() => {
  const currentTime = Date.now();
  const lag = currentTime - lastTickTime - 2000;
  if (lag > 100) {
    console.warn(`[DIAGNOSTICS: PERFORMANCE] Event loop lag detected: ${lag}ms`);
    if (lag > 500) {
      console.warn(`[DIAGNOSTICS: MEMORY] Heavy lag snapshot:`, process.memoryUsage());
    }
  }
  lastTickTime = currentTime;
}, 2000);
