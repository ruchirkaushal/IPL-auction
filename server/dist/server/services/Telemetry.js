"use strict";
/**
 * Telemetry.ts
 * In-room lifecycle tracking, interval registry, and auction event logging.
 * Zero dependencies on io — pure server-side diagnostics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuctionEvent = exports.getCurrentPlayerId = exports.unregisterInterval = exports.markIntervalExecuted = exports.registerInterval = exports.recordLifecycle = void 0;
// ---------------------------------------------------------------------------
// Interval Registry Helpers
// ---------------------------------------------------------------------------
const recordLifecycle = (room, event, context) => {
    room.lifecycleTimeline.push({ time: Date.now(), event, context });
    if (room.lifecycleTimeline.length > 50)
        room.lifecycleTimeline.shift();
    console.log(`[LIFECYCLE: ${room.state.roomCode}] ${event}`, context ? JSON.stringify(context) : '');
};
exports.recordLifecycle = recordLifecycle;
const registerInterval = (room, key, purpose) => {
    room.intervalRegistry[key] = { purpose, createdAt: Date.now(), lastExecutedAt: 0 };
};
exports.registerInterval = registerInterval;
const markIntervalExecuted = (room, key) => {
    if (room.intervalRegistry[key])
        room.intervalRegistry[key].lastExecutedAt = Date.now();
};
exports.markIntervalExecuted = markIntervalExecuted;
const unregisterInterval = (room, key) => {
    delete room.intervalRegistry[key];
};
exports.unregisterInterval = unregisterInterval;
// ---------------------------------------------------------------------------
// Auction Event Logger
// ---------------------------------------------------------------------------
const getCurrentPlayerId = (state) => {
    return state.auction.auctionQueue[state.auction.currentPlayerIndex] ?? null;
};
exports.getCurrentPlayerId = getCurrentPlayerId;
const logAuctionEvent = (room, event, meta = {}) => {
    const auction = room.state.auction;
    const currentPlayerId = (0, exports.getCurrentPlayerId)(room.state);
    console.log(`[DIAGNOSTICS: AUCTION] ${room.state.roomCode} :: ${event} :: phase=${auction.phase} idx=${auction.currentPlayerIndex}/${auction.auctionQueue.length} ticks=${auction.ticks} paused=${auction.isPaused} advancing=${auction.isAdvancing} current=${currentPlayerId ?? 'none'} ${JSON.stringify(meta)}`);
};
exports.logAuctionEvent = logAuctionEvent;
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
