"use strict";
/**
 * RoomManager.ts
 * Owns the rooms Map, reconnect grace-period timeouts,
 * and all room-lifecycle helpers (create, emit, stale-check, cleanup).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeHandleLeaveRoom = exports.startFreezeWatchdog = exports.makeRoom = exports.makeInitialRoomState = exports.emitRoomState = exports.initRoomManager = exports.syncAuctionDerivedState = exports.clearAllTimers = exports.getRoomOrNotify = exports.emitRoomUnavailable = exports.isRoomStale = exports.getReconnectKey = exports.generateRoomCode = exports.reconnectTimeouts = exports.rooms = void 0;
const constants_1 = require("../constants");
const auctionConfig_1 = require("../../shared/auctionConfig");
const Telemetry_1 = require("./Telemetry");
// ---------------------------------------------------------------------------
// Shared state — exported so AuctionEngine can reference them
// ---------------------------------------------------------------------------
exports.rooms = new Map();
exports.reconnectTimeouts = new Map();
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
exports.generateRoomCode = generateRoomCode;
const getReconnectKey = (roomCode, player) => `${roomCode}_${player.userId ?? player.name}`;
exports.getReconnectKey = getReconnectKey;
const isRoomStale = (room, roomCode) => {
    const currentRoom = exports.rooms.get(roomCode);
    if (!currentRoom)
        return true;
    if (currentRoom.roomGeneration !== room.roomGeneration)
        return true;
    return false;
};
exports.isRoomStale = isRoomStale;
const emitRoomUnavailable = (socket, roomCode, source) => {
    console.warn(`[Room Missing] source=${source} room=${roomCode} socket=${socket.id}`);
    socket.emit('room_unavailable', {
        roomCode,
        source,
        message: 'Room not found on server. It may have restarted or expired.',
    });
};
exports.emitRoomUnavailable = emitRoomUnavailable;
const getRoomOrNotify = (socket, roomCode, source) => {
    const room = exports.rooms.get(roomCode);
    if (!room) {
        (0, exports.emitRoomUnavailable)(socket, roomCode, source);
        return null;
    }
    return room;
};
exports.getRoomOrNotify = getRoomOrNotify;
// ---------------------------------------------------------------------------
// Timer cleanup
// ---------------------------------------------------------------------------
const clearAllTimers = (room) => {
    if (room.timerInterval)
        clearInterval(room.timerInterval);
    if (room.autoAdvanceTimeout)
        clearTimeout(room.autoAdvanceTimeout);
    if (room.biddingStartTimeout)
        clearTimeout(room.biddingStartTimeout);
    room.aiTimeouts.forEach(clearTimeout);
    room.timerInterval = null;
    room.autoAdvanceTimeout = null;
    room.biddingStartTimeout = null;
    room.aiTimeouts = [];
    (0, Telemetry_1.unregisterInterval)(room, 'timerInterval');
    (0, Telemetry_1.unregisterInterval)(room, 'autoAdvanceTimeout');
    (0, Telemetry_1.unregisterInterval)(room, 'biddingStartTimeout');
    (0, Telemetry_1.unregisterInterval)(room, 'aiTimeouts');
};
exports.clearAllTimers = clearAllTimers;
// ---------------------------------------------------------------------------
// Emit room state
// ---------------------------------------------------------------------------
const syncAuctionDerivedState = (state, getAuthoritativeNextBid) => {
    state.auction.nextBidAmount = getAuthoritativeNextBid(state);
};
exports.syncAuctionDerivedState = syncAuctionDerivedState;
let _io;
const initRoomManager = (io) => { _io = io; };
exports.initRoomManager = initRoomManager;
const emitRoomState = (roomCode, getAuthoritativeNextBid) => {
    try {
        const room = exports.rooms.get(roomCode);
        if (!room) {
            console.warn(`[Socket Emission] Room ${roomCode} not found - emission skipped`);
            return;
        }
        (0, exports.syncAuctionDerivedState)(room.state, getAuthoritativeNextBid);
        const socketsInRoom = _io.sockets.adapter.rooms.get(roomCode);
        const clientCount = socketsInRoom ? socketsInRoom.size : 0;
        _io.to(roomCode).emit('room_state_update', room.state);
        (0, Telemetry_1.logAuctionEvent)(room, 'room_state_emitted', { clientCount });
    }
    catch (error) {
        console.error(`[DIAGNOSTICS: ERROR] [CRITICAL] Error emitting room state for ${roomCode}:`, error);
    }
};
exports.emitRoomState = emitRoomState;
// ---------------------------------------------------------------------------
// Room creation factory
// ---------------------------------------------------------------------------
const makeInitialRoomState = (roomCode, hostSocketId, hostUserId, hostName) => {
    const initialTeams = {};
    constants_1.ALL_TEAM_IDS.forEach(id => {
        initialTeams[id] = {
            teamId: id,
            ownerId: null,
            ownerName: null,
            purseRemaining: auctionConfig_1.INITIAL_PURSE_LAKHS,
            squad: [],
            overseasCount: 0,
            status: 'idle'
        };
    });
    return {
        roomCode,
        hostId: hostSocketId,
        players: [{ socketId: hostSocketId, userId: hostUserId, name: hostName, teamId: null, isHost: true, isReady: false }],
        teams: initialTeams,
        auction: {
            isStarted: false,
            currentPlayerIndex: 0,
            auctionQueue: [],
            currentBid: 0,
            nextBidAmount: null,
            highestBidderId: null,
            ticks: constants_1.AUCTION_START_TICKS,
            phase: 'waiting',
            passedTeams: [],
            isAdvancing: false,
            currentSetName: '',
            isPaused: false
        },
        chat: [],
        isLocked: false
    };
};
exports.makeInitialRoomState = makeInitialRoomState;
const makeRoom = (state) => ({
    state,
    timerInterval: null,
    autoAdvanceTimeout: null,
    biddingStartTimeout: null,
    aiTimeouts: [],
    roomGeneration: Date.now(),
    lifecycleTimeline: [],
    intervalRegistry: {}
});
exports.makeRoom = makeRoom;
// ---------------------------------------------------------------------------
// Freeze Watchdog
// ---------------------------------------------------------------------------
const lastObservedTicks = new Map();
const startFreezeWatchdog = () => {
    setInterval(() => {
        try {
            exports.rooms.forEach((room, roomCode) => {
                const state = room.state.auction;
                if (state.phase === 'bidding' && !state.isPaused && !state.isAdvancing) {
                    const lastObserved = lastObservedTicks.get(roomCode);
                    if (lastObserved) {
                        if (lastObserved.ticks === state.ticks) {
                            const timeSinceStuck = Date.now() - lastObserved.timestamp;
                            if (timeSinceStuck > 10000) {
                                console.error(`[DIAGNOSTICS: FREEZE WATCHDOG] CRITICAL: Room ${roomCode} timer is frozen for ${timeSinceStuck}ms!`);
                                console.error(`[DIAGNOSTICS: FREEZE WATCHDOG] Room State Dump:`, {
                                    auction: state,
                                    playersCount: room.state.players.length,
                                    activePlayersCount: room.state.players.filter(p => p.socketId !== '').length,
                                    hasTimerInterval: room.timerInterval !== null,
                                    hasAutoAdvance: room.autoAdvanceTimeout !== null,
                                    hasBiddingStart: room.biddingStartTimeout !== null,
                                    intervalRegistry: room.intervalRegistry,
                                    lifecycleTimeline: room.lifecycleTimeline
                                });
                                lastObserved.timestamp = Date.now();
                            }
                        }
                        else {
                            lastObservedTicks.set(roomCode, { ticks: state.ticks, timestamp: Date.now() });
                        }
                    }
                    else {
                        lastObservedTicks.set(roomCode, { ticks: state.ticks, timestamp: Date.now() });
                    }
                }
                else {
                    lastObservedTicks.delete(roomCode);
                }
            });
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] Watchdog failure:`, err);
        }
    }, 5000);
};
exports.startFreezeWatchdog = startFreezeWatchdog;
// ---------------------------------------------------------------------------
// handleLeaveRoom
// ---------------------------------------------------------------------------
const makeHandleLeaveRoom = (io, emitState) => {
    const handleLeaveRoom = (socketId, isDisconnect = false) => {
        try {
            exports.rooms.forEach((room, roomCode) => {
                const playerIndex = room.state.players.findIndex(p => p.socketId === socketId);
                if (playerIndex === -1)
                    return;
                const player = room.state.players[playerIndex];
                if (isDisconnect) {
                    player.socketId = '';
                    emitState(roomCode);
                    const key = (0, exports.getReconnectKey)(roomCode, player);
                    const oldTimeout = exports.reconnectTimeouts.get(key);
                    if (oldTimeout)
                        clearTimeout(oldTimeout);
                    const timeout = setTimeout(() => {
                        exports.reconnectTimeouts.delete(key);
                        const currentRoom = exports.rooms.get(roomCode);
                        if (!currentRoom)
                            return;
                        const currentPlayerIndex = currentRoom.state.players.findIndex(p => p.userId === player.userId || p.name === player.name);
                        if (currentPlayerIndex === -1)
                            return;
                        const currentPlayer = currentRoom.state.players[currentPlayerIndex];
                        if (currentPlayer.socketId !== '')
                            return; // Reconnected already
                        const activePlayers = currentRoom.state.players.filter(p => p.socketId !== '');
                        if (currentPlayer.isHost && !currentRoom.state.isLocked) {
                            currentPlayer.isHost = false;
                            if (activePlayers.length > 0) {
                                const nextHost = activePlayers[0];
                                nextHost.isHost = true;
                                currentRoom.state.hostId = nextHost.socketId;
                            }
                        }
                        if (!currentRoom.state.isLocked) {
                            if (currentPlayer.teamId) {
                                currentRoom.state.teams[currentPlayer.teamId].ownerId = null;
                                currentRoom.state.teams[currentPlayer.teamId].ownerName = null;
                            }
                            currentRoom.state.players.splice(currentPlayerIndex, 1);
                        }
                        const remainingActive = currentRoom.state.players.filter(p => p.socketId !== '');
                        if (remainingActive.length === 0) {
                            if (currentRoom.deletionTimeout)
                                clearTimeout(currentRoom.deletionTimeout);
                            currentRoom.deletionTimeout = setTimeout(() => {
                                const checkRoom = exports.rooms.get(roomCode);
                                if (checkRoom && checkRoom.state.players.every(p => p.socketId === '')) {
                                    console.log(`[Room Lifecycle] Deleting room ${roomCode} due to inactivity.`);
                                    (0, exports.clearAllTimers)(checkRoom);
                                    checkRoom.roomGeneration++;
                                    console.error(`[DIAGNOSTICS: ROOM DESTRUCTION] Trigger: Empty player cleanup timeout`, { roomCode, phase: checkRoom.state.auction.phase });
                                    exports.rooms.delete(roomCode);
                                    (0, Telemetry_1.recordLifecycle)(checkRoom, 'room_deleted_timeout');
                                }
                            }, 3600000);
                        }
                        emitState(roomCode);
                    }, 300000); // 5-min grace period
                    exports.reconnectTimeouts.set(key, timeout);
                    return;
                }
                // Explicit leave during locked (live) auction → treat as disconnect
                if (!isDisconnect && room.state.isLocked) {
                    const clientSocket = io.sockets.sockets.get(socketId);
                    if (clientSocket)
                        clientSocket.leave(roomCode);
                    handleLeaveRoom(socketId, true);
                    return;
                }
                // Explicit leave (lobby)
                const explicitKey = (0, exports.getReconnectKey)(roomCode, player);
                const legacyExplicitKey = `${roomCode}_${player.name}`;
                [explicitKey, legacyExplicitKey].forEach(key => {
                    const pending = exports.reconnectTimeouts.get(key);
                    if (pending) {
                        clearTimeout(pending);
                        exports.reconnectTimeouts.delete(key);
                    }
                });
                if (player.teamId) {
                    room.state.teams[player.teamId].ownerId = null;
                    room.state.teams[player.teamId].ownerName = null;
                }
                room.state.players.splice(playerIndex, 1);
                const clientSocket = io.sockets.sockets.get(socketId);
                if (clientSocket)
                    clientSocket.leave(roomCode);
                const activePlayers = room.state.players.filter(p => p.socketId !== '');
                if (room.state.players.length === 0) {
                    (0, exports.clearAllTimers)(room);
                    room.roomGeneration++;
                    console.error(`[DIAGNOSTICS: ROOM DESTRUCTION] Trigger: Immediate explicit leave`, { roomCode, phase: room.state.auction.phase });
                    exports.rooms.delete(roomCode);
                    (0, Telemetry_1.recordLifecycle)(room, 'room_deleted_immediate');
                }
                else if (activePlayers.length === 0) {
                    if (room.deletionTimeout)
                        clearTimeout(room.deletionTimeout);
                    room.deletionTimeout = setTimeout(() => {
                        const checkRoom = exports.rooms.get(roomCode);
                        if (checkRoom && checkRoom.state.players.every(p => p.socketId === '')) {
                            (0, exports.clearAllTimers)(checkRoom);
                            checkRoom.roomGeneration++;
                            console.error(`[DIAGNOSTICS: ROOM DESTRUCTION] Trigger: Explicit leave timeout`, { roomCode, phase: checkRoom.state.auction.phase });
                            exports.rooms.delete(roomCode);
                            (0, Telemetry_1.recordLifecycle)(checkRoom, 'room_deleted_timeout');
                        }
                    }, 3600000);
                }
                else if (player.isHost) {
                    const nextHost = activePlayers[0];
                    nextHost.isHost = true;
                    room.state.hostId = nextHost.socketId;
                    console.log(`[Room] Host left room ${roomCode}, new host is ${nextHost.name}`);
                    emitState(roomCode);
                }
                else {
                    console.log(`[Room] Player ${player.name} left room ${roomCode}`);
                    emitState(roomCode);
                }
            });
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] handleLeaveRoom failed:`, err);
        }
    };
    return handleLeaveRoom;
};
exports.makeHandleLeaveRoom = makeHandleLeaveRoom;
