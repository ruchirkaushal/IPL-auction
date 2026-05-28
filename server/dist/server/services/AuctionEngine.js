"use strict";
/**
 * AuctionEngine.ts
 * Owns the complete auction state machine:
 *   startTimer → tick → resolveCurrentPlayer → advanceToNextPlayer
 * Also owns placeBid, addChatMessage, scheduleAutoAdvance, and scheduleAiBids.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTimer = exports.advanceToNextPlayer = exports.resolveCurrentPlayer = exports.placeBid = exports.scheduleAutoAdvance = exports.scheduleAiBids = exports.addChatMessage = exports.getAuthoritativeNextBid = exports.getCurrentAuctionPlayer = exports.initAuctionEngine = void 0;
const constants_1 = require("../constants");
const auctionConfig_1 = require("../../shared/auctionConfig");
const auctionPricing_1 = require("../../shared/auctionPricing");
const utils_1 = require("../utils");
const Telemetry_1 = require("./Telemetry");
const RoomManager_1 = require("./RoomManager");
// ---------------------------------------------------------------------------
// Injected io reference — set at startup
// ---------------------------------------------------------------------------
let _io;
let _emitState;
const initAuctionEngine = (io, emitState) => {
    _io = io;
    _emitState = emitState;
};
exports.initAuctionEngine = initAuctionEngine;
// ---------------------------------------------------------------------------
// Bid pricing helpers
// ---------------------------------------------------------------------------
const getCurrentAuctionPlayer = (state) => {
    const playerId = state.auction.auctionQueue[state.auction.currentPlayerIndex];
    return playerId ? (0, utils_1.getPlayerById)(playerId) : undefined;
};
exports.getCurrentAuctionPlayer = getCurrentAuctionPlayer;
const getAuthoritativeNextBid = (state) => {
    if (state.auction.phase !== 'bidding')
        return null;
    const currentPlayer = (0, exports.getCurrentAuctionPlayer)(state);
    if (!currentPlayer)
        return null;
    if (!state.auction.highestBidderId) {
        return (0, auctionPricing_1.normalizeBasePrice)(currentPlayer.basePrice);
    }
    return (0, auctionPricing_1.getNextBid)(state.auction.currentBid, currentPlayer.basePrice);
};
exports.getAuthoritativeNextBid = getAuthoritativeNextBid;
// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
const addChatMessage = (room, msg) => {
    const newMsg = {
        ...msg,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now()
    };
    room.state.chat.push(newMsg);
    if (room.state.chat.length > 100)
        room.state.chat.shift();
};
exports.addChatMessage = addChatMessage;
// ---------------------------------------------------------------------------
// AI Bids (disabled — human-only)
// ---------------------------------------------------------------------------
const AI_PREFS = {
    MI: { targetIds: ['mi-23', 'mi-11', 'mi-4', 'mi-1', 'mi-12', 'mi-17'], roles: ['BAT', 'BOWL'] },
    CSK: { targetIds: ['csk-1', 'csk-18', 'csk-19', 'csk-11', 'csk-13'], roles: ['AR', 'WK'] },
    RCB: { targetIds: ['rcb-2', 'rcb-3', 'rcb-8', 'rcb-15', 'rcb-1'], roles: ['BAT', 'BOWL'] },
    KKR: { targetIds: ['kkr-13', 'kkr-12', 'kkr-20', 'kkr-15', 'kkr-4'], roles: ['AR', 'BOWL'] },
    DC: { targetIds: ['dc-1', 'dc-8', 'dc-22', 'dc-17', 'dc-3'], roles: ['WK', 'BOWL'] },
    RR: { targetIds: ['rr-1', 'rr-7', 'rr-12', 'rr-9', 'rr-11'], roles: ['WK', 'BAT'] },
    PBKS: { targetIds: ['pbks-4', 'pbks-22', 'pbks-24', 'pbks-16', 'pbks-11'], roles: ['BAT', 'BOWL'] },
    SRH: { targetIds: ['srh-8', 'srh-7', 'srh-17', 'srh-15', 'srh-13'], roles: ['BAT', 'AR'] },
    GT: { targetIds: ['gt-1', 'gt-7', 'gt-26', 'gt-18', 'gt-6'], roles: ['BAT', 'BOWL'] },
    LSG: { targetIds: ['lsg-4', 'lsg-7', 'lsg-24', 'lsg-5', 'lsg-8'], roles: ['WK', 'AR'] }
};
const scheduleAiBids = (room) => {
    room.aiTimeouts.forEach(clearTimeout);
    room.aiTimeouts = [];
    // AI bidding is completely disabled per human-only bidding requirement.
};
exports.scheduleAiBids = scheduleAiBids;
// ---------------------------------------------------------------------------
// scheduleAutoAdvance
// ---------------------------------------------------------------------------
const scheduleAutoAdvance = (room, delayMs, reason) => {
    if (room.autoAdvanceTimeout)
        clearTimeout(room.autoAdvanceTimeout);
    const roomCode = room.state.roomCode;
    const capturedGeneration = room.roomGeneration;
    (0, Telemetry_1.registerInterval)(room, 'autoAdvanceTimeout', reason);
    room.autoAdvanceTimeout = setTimeout(() => {
        room.autoAdvanceTimeout = null;
        try {
            const timeoutRoom = RoomManager_1.rooms.get(roomCode);
            if (timeoutRoom)
                (0, Telemetry_1.markIntervalExecuted)(timeoutRoom, 'autoAdvanceTimeout');
            if (!timeoutRoom || timeoutRoom.roomGeneration !== capturedGeneration) {
                console.log(`[AutoAdvance Timeout] Room ${roomCode} is stale. Aborting auto-advance.`);
                return;
            }
            (0, exports.advanceToNextPlayer)(timeoutRoom, reason);
        }
        catch (error) {
            console.error(`[DIAGNOSTICS: ERROR] scheduleAutoAdvance timeout failed for ${roomCode}:`, error);
        }
    }, delayMs);
    (0, Telemetry_1.logAuctionEvent)(room, 'auto_advance_scheduled', { delayMs, reason });
};
exports.scheduleAutoAdvance = scheduleAutoAdvance;
// ---------------------------------------------------------------------------
// placeBid
// ---------------------------------------------------------------------------
const placeBid = (room, teamId, isAI = false) => {
    try {
        const state = room.state;
        if (state.auction.isPaused)
            return false;
        if (state.auction.phase !== 'bidding')
            return false;
        if (state.auction.isAdvancing)
            return false;
        const player = (0, exports.getCurrentAuctionPlayer)(state);
        if (!player)
            return false;
        const normalizedAmount = (0, exports.getAuthoritativeNextBid)(state);
        if (normalizedAmount === null)
            return false;
        if (isAI)
            return false; // AI bidding disabled
        const team = state.teams[teamId];
        const owningPlayer = state.players.find(p => p.teamId === teamId);
        if (!owningPlayer || team.ownerId !== owningPlayer.socketId)
            return false;
        if (team.purseRemaining < normalizedAmount)
            return false;
        if (team.squad.length >= auctionConfig_1.MAX_SQUAD_SIZE)
            return false;
        if (player.isOverseas && team.overseasCount >= auctionConfig_1.MAX_OVERSEAS_PLAYERS)
            return false;
        state.auction.currentBid = normalizedAmount;
        state.auction.highestBidderId = teamId;
        constants_1.ALL_TEAM_IDS.forEach(id => {
            if (state.teams[id].status === 'leading')
                state.teams[id].status = 'idle';
        });
        team.status = 'leading';
        state.auction.ticks = Number(process.env.AUCTION_START_TICKS ?? 100);
        state.auction.nextBidAmount = (0, exports.getAuthoritativeNextBid)(state);
        _io.to(state.roomCode).emit('bid_placed', { teamId, teamName: teamId, amount: normalizedAmount, isAI });
        (0, exports.addChatMessage)(room, { type: 'system_bid', teamId, playerName: player.name, amount: normalizedAmount });
        _emitState(state.roomCode);
        (0, exports.scheduleAiBids)(room);
        return true;
    }
    catch (error) {
        console.error(`[DIAGNOSTICS: ERROR] placeBid failed for room ${room.state.roomCode}:`, error);
        return false;
    }
};
exports.placeBid = placeBid;
// ---------------------------------------------------------------------------
// resolveCurrentPlayer
// ---------------------------------------------------------------------------
const resolveCurrentPlayer = (room) => {
    try {
        const state = room.state;
        const roomCode = state.roomCode;
        const currentRoom = RoomManager_1.rooms.get(roomCode);
        if (!currentRoom || currentRoom.roomGeneration !== room.roomGeneration) {
            console.log(`[Resolve] Room ${roomCode} is stale. Aborting resolveCurrentPlayer.`);
            return;
        }
        const playerId = (0, Telemetry_1.getCurrentPlayerId)(state);
        if (!playerId) {
            (0, Telemetry_1.logAuctionEvent)(currentRoom, 'resolve_missing_player_id');
            state.auction.isAdvancing = false;
            (0, exports.scheduleAutoAdvance)(currentRoom, constants_1.AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS, 'missing_player_id');
            return;
        }
        const player = (0, utils_1.getPlayerById)(playerId);
        if (!player) {
            (0, Telemetry_1.logAuctionEvent)(currentRoom, 'resolve_missing_player_record', { playerId });
            state.auction.isAdvancing = false;
            (0, exports.scheduleAutoAdvance)(currentRoom, constants_1.AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS, 'missing_player_record');
            return;
        }
        if (state.auction.highestBidderId) {
            state.auction.phase = 'sold';
            const team = state.teams[state.auction.highestBidderId];
            if (!team) {
                console.error(`[Error] resolveCurrentPlayer: Team ${state.auction.highestBidderId} not found`);
                return;
            }
            const amountPaid = (0, auctionPricing_1.toSafeLakhs)(state.auction.currentBid);
            team.purseRemaining = (0, auctionPricing_1.toSafeLakhs)(team.purseRemaining - amountPaid);
            team.squad.push({ id: player.id, price: amountPaid });
            if (player.isOverseas)
                team.overseasCount += 1;
            (0, Telemetry_1.logAuctionEvent)(currentRoom, 'player_sold', { teamId: team.teamId, playerName: player.name, amount: amountPaid });
            const socketsInRoom = _io.sockets.adapter.rooms.get(roomCode);
            console.log(`[Sale] ${player.name} sold to ${team.teamId} for ${amountPaid}L to ${socketsInRoom?.size || 0} clients`);
            _io.to(roomCode).emit('player_sold', {
                teamId: team.teamId, teamName: team.teamId,
                amount: amountPaid, playerName: player.name, playerId: player.id
            });
            (0, exports.addChatMessage)(currentRoom, { type: 'system_sold', teamId: team.teamId, playerName: player.name, amount: amountPaid });
        }
        else {
            state.auction.phase = 'unsold';
            (0, Telemetry_1.logAuctionEvent)(currentRoom, 'player_unsold', { playerName: player.name });
            const socketsInRoom = _io.sockets.adapter.rooms.get(roomCode);
            console.log(`[Unsold] ${player.name} went unsold to ${socketsInRoom?.size || 0} clients`);
            _io.to(roomCode).emit('player_unsold', { playerName: player.name, playerId: player.id });
            (0, exports.addChatMessage)(currentRoom, { type: 'system_unsold', playerName: player.name });
        }
        constants_1.ALL_TEAM_IDS.forEach(id => { state.teams[id].status = 'idle'; });
        _emitState(roomCode);
        (0, exports.scheduleAutoAdvance)(currentRoom, constants_1.AUCTION_DELAY_RESOLVE_TO_NEXT_MS, 'resolve_complete');
    }
    catch (error) {
        console.error(`[DIAGNOSTICS: ERROR] resolveCurrentPlayer failed for room ${room.state.roomCode}:`, error);
    }
};
exports.resolveCurrentPlayer = resolveCurrentPlayer;
// ---------------------------------------------------------------------------
// advanceToNextPlayer
// ---------------------------------------------------------------------------
const advanceToNextPlayer = (room, reason = 'unknown') => {
    try {
        const state = room.state;
        const roomCode = state.roomCode;
        const currentRoom = RoomManager_1.rooms.get(roomCode);
        if (!currentRoom || currentRoom.roomGeneration !== room.roomGeneration) {
            console.log(`[Advance] Room ${roomCode} is stale. Aborting advanceToNextPlayer.`);
            return;
        }
        if (currentRoom.biddingStartTimeout) {
            clearTimeout(currentRoom.biddingStartTimeout);
            currentRoom.biddingStartTimeout = null;
        }
        state.auction.phase = 'advancing';
        state.auction.currentPlayerIndex += 1;
        state.auction.currentBid = 0;
        state.auction.nextBidAmount = null;
        state.auction.highestBidderId = null;
        state.auction.passedTeams = [];
        state.auction.isAdvancing = false;
        // Skip invalid entries
        while (state.auction.currentPlayerIndex < state.auction.auctionQueue.length) {
            const candidateId = state.auction.auctionQueue[state.auction.currentPlayerIndex];
            if (candidateId && (0, utils_1.getPlayerById)(candidateId))
                break;
            (0, Telemetry_1.logAuctionEvent)(currentRoom, 'advance_skipping_invalid_player', { candidateId, reason });
            state.auction.currentPlayerIndex += 1;
        }
        if (state.auction.currentPlayerIndex >= state.auction.auctionQueue.length) {
            (0, Telemetry_1.logAuctionEvent)(currentRoom, 'auction_complete', { reason });
            const socketsInRoom = _io.sockets.adapter.rooms.get(roomCode);
            console.log(`[Advance] Auction complete. Emitting to ${socketsInRoom?.size || 0} clients in ${roomCode}.`);
            _io.to(roomCode).emit('auction_complete', state);
            return;
        }
        const nextPlayerId = state.auction.auctionQueue[state.auction.currentPlayerIndex];
        (0, Telemetry_1.logAuctionEvent)(currentRoom, 'player_advancing', { nextPlayerId, reason });
        console.log(`[Advance] Next player: ${nextPlayerId} (reason: ${reason})`);
        _io.to(roomCode).emit('player_advancing', { nextPlayerId, nextPlayerIndex: state.auction.currentPlayerIndex });
        _emitState(roomCode);
        const startReason = 'bidding_start';
        (0, Telemetry_1.registerInterval)(currentRoom, 'biddingStartTimeout', startReason);
        currentRoom.biddingStartTimeout = setTimeout(() => {
            currentRoom.biddingStartTimeout = null;
            try {
                const timeoutRoom = RoomManager_1.rooms.get(roomCode);
                if (timeoutRoom)
                    (0, Telemetry_1.markIntervalExecuted)(timeoutRoom, 'biddingStartTimeout');
                if (!timeoutRoom || timeoutRoom.roomGeneration !== room.roomGeneration) {
                    console.log(`[Advance Timeout] Room ${roomCode} is stale. Aborting delayed start.`);
                    return;
                }
                if (timeoutRoom.state.auction.isPaused) {
                    (0, Telemetry_1.logAuctionEvent)(timeoutRoom, 'bidding_start_deferred_due_pause', { nextPlayerId });
                    return;
                }
                const nextPlayer = (0, utils_1.getPlayerById)(nextPlayerId);
                if (!nextPlayer) {
                    (0, Telemetry_1.logAuctionEvent)(timeoutRoom, 'advance_missing_next_player', { nextPlayerId });
                    (0, exports.advanceToNextPlayer)(timeoutRoom, 'missing_next_player_post_delay');
                    return;
                }
                timeoutRoom.state.auction.currentBid = (0, auctionPricing_1.normalizeBasePrice)(nextPlayer.basePrice);
                timeoutRoom.state.auction.currentSetName = (0, utils_1.getSetNameForPlayer)(nextPlayerId);
                timeoutRoom.state.auction.phase = 'bidding';
                if (timeoutRoom.state.auction.ticks <= 0 || Number.isNaN(timeoutRoom.state.auction.ticks)) {
                    timeoutRoom.state.auction.ticks = constants_1.AUCTION_START_TICKS;
                }
                _emitState(roomCode);
                (0, exports.startTimer)(timeoutRoom);
                (0, exports.scheduleAiBids)(timeoutRoom);
            }
            catch (innerError) {
                console.error(`[DIAGNOSTICS: ERROR] advanceToNextPlayer delayed start failed for ${roomCode}:`, innerError);
            }
        }, constants_1.AUCTION_DELAY_ADVANCE_TO_BIDDING_MS);
    }
    catch (error) {
        console.error(`[DIAGNOSTICS: ERROR] advanceToNextPlayer failed for room ${room.state.roomCode}:`, error);
    }
};
exports.advanceToNextPlayer = advanceToNextPlayer;
// ---------------------------------------------------------------------------
// startTimer
// ---------------------------------------------------------------------------
const startTimer = (room) => {
    if (room.state.auction.isPaused)
        return;
    if (room.timerInterval)
        return;
    if (room.state.auction.isAdvancing)
        return;
    if (room.state.auction.phase !== 'bidding')
        return;
    if (room.state.auction.currentPlayerIndex >= room.state.auction.auctionQueue.length)
        return;
    if (!Number.isFinite(room.state.auction.ticks) || room.state.auction.ticks <= 0) {
        room.state.auction.ticks = constants_1.AUCTION_START_TICKS;
    }
    const roomCode = room.state.roomCode;
    const capturedGeneration = room.roomGeneration;
    console.log(`[DIAGNOSTICS: TIMER] Starting timer for room ${roomCode}`);
    (0, Telemetry_1.logAuctionEvent)(room, 'timer_started');
    (0, Telemetry_1.registerInterval)(room, 'timerInterval', 'main_auction_timer');
    room.timerInterval = setInterval(() => {
        try {
            const currentRoom = RoomManager_1.rooms.get(roomCode);
            if (!currentRoom || currentRoom.roomGeneration !== capturedGeneration) {
                console.log(`[Timer] Room ${roomCode} is stale (deleted or recreated). Killing interval.`);
                if (room.timerInterval) {
                    clearInterval(room.timerInterval);
                    room.timerInterval = null;
                    (0, Telemetry_1.unregisterInterval)(room, 'timerInterval');
                }
                return;
            }
            (0, Telemetry_1.markIntervalExecuted)(currentRoom, 'timerInterval');
            if (currentRoom.state.auction.isPaused || currentRoom.state.auction.phase !== 'bidding') {
                if (currentRoom.timerInterval)
                    clearInterval(currentRoom.timerInterval);
                currentRoom.timerInterval = null;
                (0, Telemetry_1.unregisterInterval)(currentRoom, 'timerInterval');
                (0, Telemetry_1.logAuctionEvent)(currentRoom, 'timer_stopped_non_bidding_or_paused');
                return;
            }
            if (currentRoom.state.auction.currentPlayerIndex >= currentRoom.state.auction.auctionQueue.length) {
                if (currentRoom.timerInterval)
                    clearInterval(currentRoom.timerInterval);
                currentRoom.timerInterval = null;
                (0, Telemetry_1.unregisterInterval)(currentRoom, 'timerInterval');
                const socketsInRoom = _io.sockets.adapter.rooms.get(roomCode);
                console.log(`[Timer] Queue complete. Emitting auction_complete to ${socketsInRoom?.size || 0} clients in ${roomCode}.`);
                _io.to(roomCode).emit('auction_complete', currentRoom.state);
                (0, Telemetry_1.logAuctionEvent)(currentRoom, 'timer_stopped_queue_complete');
                return;
            }
            currentRoom.state.auction.ticks -= 1;
            if (!Number.isFinite(currentRoom.state.auction.ticks)) {
                currentRoom.state.auction.ticks = constants_1.AUCTION_START_TICKS;
            }
            const socketsInRoom = _io.sockets.adapter.rooms.get(roomCode);
            if (socketsInRoom && socketsInRoom.size > 0) {
                _io.to(roomCode).emit('timer_update', { ticks: currentRoom.state.auction.ticks, timer: currentRoom.state.auction.ticks / 10 });
            }
            if (currentRoom.state.auction.ticks > 0 && currentRoom.state.auction.ticks % 10 === 0) {
                (0, Telemetry_1.logAuctionEvent)(currentRoom, 'timer_tick_second', { ticks: currentRoom.state.auction.ticks });
            }
            if (currentRoom.state.auction.ticks <= 0) {
                if (currentRoom.timerInterval)
                    clearInterval(currentRoom.timerInterval);
                currentRoom.timerInterval = null;
                if (currentRoom.state.auction.isAdvancing) {
                    (0, Telemetry_1.logAuctionEvent)(currentRoom, 'timer_expired_but_already_advancing');
                    return;
                }
                currentRoom.state.auction.isAdvancing = true;
                (0, Telemetry_1.logAuctionEvent)(currentRoom, 'timer_expired_resolving_player');
                (0, exports.resolveCurrentPlayer)(currentRoom);
            }
        }
        catch (tickError) {
            console.error(`[DIAGNOSTICS: ERROR] Timer loop failure for room ${roomCode}:`, tickError);
            const errorRoom = RoomManager_1.rooms.get(roomCode);
            if (errorRoom && errorRoom.timerInterval) {
                clearInterval(errorRoom.timerInterval);
                errorRoom.timerInterval = null;
            }
        }
    }, constants_1.AUCTION_TIMER_TICK_MS);
};
exports.startTimer = startTimer;
