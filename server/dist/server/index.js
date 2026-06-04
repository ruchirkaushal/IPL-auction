"use strict";
/**
 * index.ts — Slim Orchestrator
 *
 * All business logic has been extracted to:
 *   server/services/Telemetry.ts
 *   server/services/RoomManager.ts
 *   server/services/AuctionEngine.ts
 *
 * This file is responsible only for:
 *   1. Creating the Express + Socket.IO server
 *   2. Wiring up REST routes
 *   3. Binding socket events to service functions
 *   4. Starting the HTTP server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const playerImageResolver_1 = require("../shared/playerImageResolver");
const auctionSets_1 = require("./lib/auctionSets");
const auctionPricing_1 = require("../shared/auctionPricing");
const auctionPricing_2 = require("../shared/auctionPricing");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
// Services
const RoomManager_1 = require("./services/RoomManager");
const AuctionEngine_1 = require("./services/AuctionEngine");
const Telemetry_1 = require("./services/Telemetry");
const RoomService_1 = require("./services/RoomService");
const AuctionTimer_1 = require("./services/AuctionTimer");
const RedisService_1 = require("./services/RedisService");
const SocketEventHandling_1 = require("./services/SocketEventHandling");
const auctionConfig_1 = require("../shared/auctionConfig");
// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*' },
    pingInterval: constants_1.SOCKET_PING_INTERVAL_MS,
    pingTimeout: constants_1.SOCKET_PING_TIMEOUT_MS,
    connectionStateRecovery: {
        maxDisconnectionDuration: constants_1.SOCKET_RECOVERY_WINDOW_MS,
        skipMiddlewares: true,
    },
});
io.engine.on('connection_error', (err) => {
    console.error('[Socket.IO connection_error]', { code: err.code, message: err.message, context: err.context });
});
// Bind io to services
const roomService = new RoomService_1.RoomService();
const timerManager = new AuctionTimer_1.TimerManager();
const redisService = new RedisService_1.RedisService();
const socketEventQueue = new SocketEventHandling_1.SocketEventQueue();
const rateLimiter = new SocketEventHandling_1.RateLimiter(120, 60000);
void (async () => {
    try {
        const restoredRooms = await roomService.loadAllRooms();
        restoredRooms.forEach((state, roomCode) => {
            const restoredRoom = (0, RoomManager_1.makeRoom)(state);
            RoomManager_1.rooms.set(roomCode, restoredRoom);
            console.log(`[Phase 3] Restored persisted room ${roomCode} from RoomService`);
        });
    }
    catch (err) {
        console.warn('[Phase 3] Failed to restore persisted rooms', err);
    }
})();
const emit = (roomCode) => {
    (0, RoomManager_1.emitRoomState)(roomCode, AuctionEngine_1.getAuthoritativeNextBid);
    const room = RoomManager_1.rooms.get(roomCode);
    if (room) {
        redisService.cacheRoom(roomCode, room.state).catch(err => {
            console.warn('[RedisService] cacheRoom failed', err);
        });
        redisService.publishRoomState(roomCode, room.state).catch(err => {
            console.warn('[RedisService] publishRoomState failed', err);
        });
    }
};
(0, RoomManager_1.initRoomManager)(io);
(0, AuctionEngine_1.initAuctionEngine)(io, emit, timerManager);
(0, RoomManager_1.startFreezeWatchdog)();
// Expose basic service health for Phase 3 readiness
redisService.healthCheck().then(() => {
    console.log('[Phase 3] RedisService is ready');
}).catch(err => {
    console.warn('[Phase 3] RedisService health check failed', err);
});
// ---------------------------------------------------------------------------
// REST Routes
// ---------------------------------------------------------------------------
app.get('/api/players', (_req, res) => {
    res.json(constants_1.PLAYERS);
});
app.get('/health', async (_req, res) => {
    const redisHealth = await redisService.healthCheck().catch(err => ({ status: 'unhealthy', error: String(err) }));
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        activeRooms: RoomManager_1.rooms.size,
        redisHealth,
        timestamp: new Date().toISOString()
    });
});
// ---------------------------------------------------------------------------
// Startup logging
// ---------------------------------------------------------------------------
console.log(`Loaded ${constants_1.PLAYERS.length} players from the IPL database`);
// ---------------------------------------------------------------------------
// Socket event handlers
// ---------------------------------------------------------------------------
const handleLeaveRoom = (0, RoomManager_1.makeHandleLeaveRoom)(io, emit, roomService);
io.on('connection', (socket) => {
    socket.use((packet, next) => {
        const eventName = packet[0];
        if (typeof eventName === 'string' && !rateLimiter.allow(socket.id)) {
            socket.emit('error', { message: 'Rate limit exceeded' });
            return;
        }
        next();
    });
    const enqueueSocketHandler = (eventName, handler) => {
        socket.on(eventName, (payload) => {
            socketEventQueue.enqueue({
                socketId: socket.id,
                event: eventName,
                payload,
                receivedAt: Date.now(),
                handler: () => Promise.resolve(handler(payload))
            });
        });
    };
    // -- create_room --
    enqueueSocketHandler('create_room', async ({ playerName, userId }) => {
        try {
            const roomCode = (0, RoomManager_1.generateRoomCode)();
            const roomState = (0, RoomManager_1.makeInitialRoomState)(roomCode, socket.id, userId, playerName);
            const newRoom = (0, RoomManager_1.makeRoom)(roomState);
            RoomManager_1.rooms.set(roomCode, newRoom);
            (0, Telemetry_1.recordLifecycle)(newRoom, 'room_created');
            console.log(`[DIAGNOSTICS: ROOM] Room ${roomCode} created by ${socket.id}`);
            socket.join(roomCode);
            socket.emit('room_created', { roomCode });
            console.log(`[DIAGNOSTICS: ROOM] Created room ${roomCode} for ${playerName} (${userId})`);
            emit(roomCode);
            roomService.updatePlayerSession(roomCode, userId, 'connected').catch(err => console.warn('[RoomService] updatePlayerSession failed', err));
            roomService.saveRoom(newRoom).catch(err => console.error('[RoomService] saveRoom failed', err));
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(create_room) failed:`, err);
        }
    });
    // -- join_room --
    enqueueSocketHandler('join_room', async ({ roomCode, playerName, userId }) => {
        try {
            let room = RoomManager_1.rooms.get(roomCode);
            if (!room) {
                const persistedState = await roomService.loadRoom(roomCode);
                if (persistedState) {
                    const restoredRoom = (0, RoomManager_1.makeRoom)(persistedState);
                    RoomManager_1.rooms.set(roomCode, restoredRoom);
                    room = restoredRoom;
                    console.log(`[Room] Restored persisted room ${roomCode} for join attempt by ${playerName}`);
                }
            }
            if (!room) {
                (0, RoomManager_1.emitRoomUnavailable)(socket, roomCode, 'join_room');
                socket.emit('error', { message: 'Room not found' });
                console.log(`[Room] Join failed: room ${roomCode} not found for ${playerName}`);
                return;
            }
            if (room.deletionTimeout) {
                clearTimeout(room.deletionTimeout);
                room.deletionTimeout = null;
            }
            // Clear reconnect timeouts (by userId and by name for legacy)
            const reconnectKey = `${roomCode}_${userId}`;
            const legacyKey = `${roomCode}_${playerName}`;
            [reconnectKey, legacyKey].forEach(key => {
                const pendingTimeout = RoomManager_1.reconnectTimeouts.get(key);
                if (pendingTimeout) {
                    clearTimeout(pendingTimeout);
                    RoomManager_1.reconnectTimeouts.delete(key);
                }
            });
            const existingPlayerIndex = room.state.players.findIndex(p => p.userId === userId || (p.userId === undefined && p.name === playerName));
            const isRejoining = existingPlayerIndex !== -1;
            if (!isRejoining && room.state.players.filter(p => p.socketId !== '').length >= 10) {
                socket.emit('error', { message: 'Room is full' });
                return;
            }
            if (isRejoining) {
                const oldPlayer = room.state.players[existingPlayerIndex];
                console.log(`[Room] Player ${playerName} rejoining room ${roomCode} (was offline)`);
                oldPlayer.socketId = socket.id;
                oldPlayer.presenceStatus = 'active';
                if (oldPlayer.teamId) {
                    room.state.teams[oldPlayer.teamId].ownerId = socket.id;
                    room.state.teams[oldPlayer.teamId].ownerName = oldPlayer.name;
                    room.state.teams[oldPlayer.teamId].availability = 'occupied';
                }
                if (oldPlayer.isHost) {
                    room.state.hostId = socket.id;
                    console.log(`[Room] Host ${playerName} reconnected to room ${roomCode}`);
                }
            }
            else {
                console.log(`[Room] New player ${playerName} joined room ${roomCode}`);
                room.state.players.push({ socketId: socket.id, userId, name: playerName, teamId: null, role: 'spectator', isHost: room.state.players.length === 0, isReady: false, presenceStatus: 'active' });
                if (room.state.players.length === 1)
                    room.state.hostId = socket.id;
            }
            socket.join(roomCode);
            socket.emit('room_joined', { roomCode });
            emit(roomCode);
            roomService.updatePlayerSession(roomCode, userId, 'connected').catch(err => console.warn('[RoomService] updatePlayerSession failed', err));
            roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(join_room) failed:`, err);
        }
    });
    // -- select_team --
    enqueueSocketHandler('select_team', async ({ roomCode, teamId }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'select_team');
            if (!room)
                return;
            const player = room.state.players.find(p => p.socketId === socket.id);
            if (!player)
                return;
            if (room.state.teams[teamId].ownerId !== null) {
                socket.emit('error', { message: 'Team already taken' });
                return;
            }
            if (player.teamId) {
                room.state.teams[player.teamId].ownerId = null;
                room.state.teams[player.teamId].ownerName = null;
                room.state.teams[player.teamId].availability = 'available';
            }
            player.teamId = teamId;
            player.role = 'manager';
            player.isReady = true;
            room.state.teams[teamId].ownerId = socket.id;
            room.state.teams[teamId].ownerName = player.name;
            room.state.teams[teamId].availability = 'occupied';
            emit(roomCode);
            roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(select_team) failed:`, err);
        }
    });
    // -- start_auction --
    enqueueSocketHandler('start_auction', async ({ roomCode }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'start_auction');
            if (!room)
                return;
            if (room.state.hostId !== socket.id) {
                console.warn(`[Auction] Start rejected: ${socket.id} is not host in room ${roomCode}`);
                socket.emit('error', { message: 'Only host can start auction' });
                return;
            }
            const managerPlayers = room.state.players.filter(p => p.role === 'manager');
            if (managerPlayers.length === 0 || !managerPlayers.every(p => p.isReady && p.teamId !== null)) {
                socket.emit('error', { message: 'All managers must select a team before starting the auction.' });
                return;
            }
            (0, RoomManager_1.clearAllTimers)(room);
            const auctionQueue = (0, auctionSets_1.createAuctionQueue)();
            room.state.auction = {
                isStarted: true,
                currentPlayerIndex: 0,
                auctionQueue,
                currentBid: 0,
                nextBidAmount: null,
                highestBidderId: null,
                ticks: constants_1.AUCTION_START_TICKS,
                phase: 'waiting',
                passedTeams: [],
                isAdvancing: false,
                currentSetName: '',
                isPaused: false
            };
            const firstPlayerId = room.state.auction.auctionQueue[0];
            const firstPlayer = (0, utils_1.getPlayerById)(firstPlayerId);
            if (firstPlayer)
                room.state.auction.currentBid = (0, auctionPricing_1.normalizeBasePrice)(firstPlayer.basePrice);
            room.state.auction.currentSetName = (0, utils_1.getSetNameForPlayer)(firstPlayerId);
            room.state.auction.phase = 'bidding';
            (0, Telemetry_1.logAuctionEvent)(room, 'auction_started');
            console.log(`[Auction] Started in room ${roomCode}. Queue: ${auctionQueue.length}, First: ${firstPlayerId}`);
            emit(roomCode);
            roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
            (0, AuctionEngine_1.startTimer)(room);
            (0, AuctionEngine_1.scheduleAiBids)(room);
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(start_auction) failed:`, err);
        }
    });
    // -- place_bid --
    enqueueSocketHandler('place_bid', async ({ roomCode }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'place_bid');
            if (!room)
                return;
            const player = room.state.players.find(p => p.socketId === socket.id);
            if (!player || player.role !== 'manager' || !player.teamId) {
                socket.emit('error', { message: 'Only managers can place bids.' });
                return;
            }
            if (room.state.auction.phase !== 'bidding') {
                socket.emit('error', { message: 'Bids are only allowed while the auction is open.' });
                return;
            }
            if (!(0, AuctionEngine_1.placeBid)(room, player.teamId)) {
                const expectedBid = (0, AuctionEngine_1.getAuthoritativeNextBid)(room.state);
                socket.emit('bid_rejected', {
                    reason: expectedBid === null ? 'Invalid bid' : `Invalid bid. Next valid amount is ${(0, auctionPricing_2.formatAuctionMoney)(expectedBid)}.`,
                });
            }
            else {
                roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
            }
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(place_bid) failed:`, err);
        }
    });
    // -- pass_bid --
    enqueueSocketHandler('pass_bid', async ({ roomCode }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'pass_bid');
            if (!room)
                return;
            if (room.state.auction.phase !== 'bidding') {
                socket.emit('error', { message: 'You can only pass during bidding.' });
                return;
            }
            const player = room.state.players.find(p => p.socketId === socket.id);
            if (!player || player.role !== 'manager' || !player.teamId) {
                socket.emit('error', { message: 'Only managers can pass on a bid.' });
                return;
            }
            if (!room.state.auction.passedTeams.includes(player.teamId)) {
                room.state.auction.passedTeams.push(player.teamId);
                room.state.teams[player.teamId].status = 'passed';
                emit(roomCode);
                roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
            }
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(pass_bid) failed:`, err);
        }
    });
    // -- reset_room --
    enqueueSocketHandler('reset_room', async ({ roomCode }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'reset_room');
            if (!room || room.state.hostId !== socket.id)
                return;
            (0, RoomManager_1.clearAllTimers)(room);
            room.state.auction = {
                isStarted: false, currentPlayerIndex: 0, auctionQueue: [], currentBid: 0,
                nextBidAmount: null, highestBidderId: null, ticks: constants_1.AUCTION_START_TICKS,
                phase: 'waiting', passedTeams: [], isAdvancing: false, currentSetName: '', isPaused: false
            };
            room.state.isLocked = false;
            constants_1.ALL_TEAM_IDS.forEach(teamId => {
                room.state.teams[teamId].ownerId = null;
                room.state.teams[teamId].ownerName = null;
                room.state.teams[teamId].purseRemaining = auctionConfig_1.INITIAL_PURSE_LAKHS;
                room.state.teams[teamId].squad = [];
                room.state.teams[teamId].overseasCount = 0;
                room.state.teams[teamId].status = 'idle';
                room.state.teams[teamId].availability = 'available';
            });
            room.state.players = room.state.players.map(p => ({ ...p, teamId: null, role: 'spectator', isReady: false }));
            io.to(roomCode).emit('room_reset');
            emit(roomCode);
            roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(reset_room) failed:`, err);
        }
    });
    // -- send_chat --
    enqueueSocketHandler('send_chat', async ({ roomCode, text }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'send_chat');
            if (!room)
                return;
            const player = room.state.players.find(p => p.socketId === socket.id);
            if (!player)
                return;
            (0, AuctionEngine_1.addChatMessage)(room, { type: 'user', sender: player.name, text, teamId: player.teamId || undefined });
            emit(roomCode);
            roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
            roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(send_chat) failed:`, err);
        }
    });
    // -- toggle_pause --
    enqueueSocketHandler('toggle_pause', async ({ roomCode }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'toggle_pause');
            if (!room)
                return;
            if (room.state.hostId !== socket.id) {
                socket.emit('error', { message: 'Only host can pause/resume' });
                return;
            }
            const currentPaused = room.state.auction.isPaused;
            room.state.auction.isPaused = !currentPaused;
            if (room.state.auction.isPaused) {
                (0, RoomManager_1.clearAllTimers)(room);
                (0, Telemetry_1.logAuctionEvent)(room, 'auction_paused');
            }
            else {
                const phase = room.state.auction.phase;
                console.log(`[Pause] Resuming auction in room ${roomCode}, phase: ${phase}`);
                if (phase === 'bidding') {
                    (0, AuctionEngine_1.startTimer)(room);
                    (0, AuctionEngine_1.scheduleAiBids)(room);
                }
                else if (phase === 'sold' || phase === 'unsold') {
                    (0, AuctionEngine_1.scheduleAutoAdvance)(room, 5000, 'resume_from_result_phase'); // brief delay so host sees resumed state
                }
                else if (phase === 'advancing') {
                    (0, AuctionEngine_1.scheduleAutoAdvance)(room, 1000, 'resume_from_advancing_phase');
                }
                (0, Telemetry_1.logAuctionEvent)(room, 'auction_resumed', { phase });
            }
            emit(roomCode);
            roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(toggle_pause) failed:`, err);
        }
    });
    // -- end_auction --
    enqueueSocketHandler('end_auction', async ({ roomCode }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'end_auction');
            if (!room || room.state.hostId !== socket.id)
                return;
            (0, RoomManager_1.clearAllTimers)(room);
            room.state.auction.currentPlayerIndex = room.state.auction.auctionQueue.length;
            room.state.auction.phase = 'waiting';
            io.to(roomCode).emit('auction_complete', room.state);
            emit(roomCode);
            roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(end_auction) failed:`, err);
        }
    });
    // -- leave_room --
    enqueueSocketHandler('leave_room', async () => {
        handleLeaveRoom(socket.id, false);
    });
    // -- kick_player --
    enqueueSocketHandler('kick_player', async ({ roomCode, targetSocketId }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'kick_player');
            if (!room || room.state.hostId !== socket.id)
                return;
            const playerIndex = room.state.players.findIndex(p => p.socketId === targetSocketId);
            if (playerIndex !== -1) {
                const player = room.state.players[playerIndex];
                if (player.teamId) {
                    room.state.teams[player.teamId].ownerId = null;
                    room.state.teams[player.teamId].ownerName = null;
                    room.state.teams[player.teamId].availability = 'available';
                }
                room.state.players.splice(playerIndex, 1);
                io.to(targetSocketId).emit('kicked');
                const targetSocket = io.sockets.sockets.get(targetSocketId);
                if (targetSocket)
                    targetSocket.leave(roomCode);
                emit(roomCode);
                roomService.saveRoom(room).catch(err => console.error('[RoomService] saveRoom failed', err));
            }
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(kick_player) failed:`, err);
        }
    });
    // -- visibility_change (AFK tracking) --
    enqueueSocketHandler('visibility_change', async ({ roomCode, hidden }) => {
        try {
            const room = RoomManager_1.rooms.get(roomCode);
            if (!room)
                return;
            const player = room.state.players.find(p => p.socketId === socket.id);
            if (!player)
                return;
            player.presenceStatus = hidden ? 'afk' : 'active';
            emit(roomCode);
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(visibility_change) failed:`, err);
        }
    });
    // -- disconnect --
    socket.on('disconnect', () => {
        handleLeaveRoom(socket.id, true);
    });
    // -- request_room_state --
    enqueueSocketHandler('request_room_state', async ({ roomCode }) => {
        try {
            const room = (0, RoomManager_1.getRoomOrNotify)(socket, roomCode, 'request_room_state');
            if (!room)
                return;
            socket.join(roomCode);
            emit(roomCode);
        }
        catch (err) {
            console.error(`[DIAGNOSTICS: ERROR] socket.on(request_room_state) failed:`, err);
        }
    });
});
// ---------------------------------------------------------------------------
// Global error handlers
// ---------------------------------------------------------------------------
process.on('uncaughtException', (error) => {
    console.error('[CRITICAL] Uncaught Exception - Server continuing:', error);
    console.error('Stack:', error.stack);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection:', reason);
    console.error('Promise:', promise);
});
// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT ? Number(process.env.PORT) : 3005;
async function startServer() {
    console.log('Initializing automatic IPL player image resolution system...');
    await (0, playerImageResolver_1.resolveAllPlayerImages)(constants_1.PLAYERS);
    httpServer.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
        console.log(`[Server] Active room supervision enabled with stale reference detection`);
        console.log(`[Server] Global error handlers active`);
        // Keep-alive self-ping (prevents Render free-tier spin-down)
        const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
        if (RENDER_URL) {
            const keepAliveInterval = 10 * 60 * 1000; // 10 minutes
            setInterval(async () => {
                try {
                    const pingUrl = `${RENDER_URL}/health`;
                    const response = await fetch(pingUrl);
                    const data = await response.json();
                    console.log(`[Keep-Alive] Self-ping OK — uptime=${Math.floor(data.uptime)}s, activeRooms=${data.activeRooms}`);
                }
                catch (err) {
                    console.warn(`[Keep-Alive] Self-ping failed:`, err);
                }
            }, keepAliveInterval);
            console.log(`[Keep-Alive] Self-ping enabled → ${RENDER_URL}/health every 10 minutes`);
        }
        else {
            console.log(`[Keep-Alive] RENDER_EXTERNAL_URL not set — self-ping disabled (local dev mode)`);
        }
    });
}
startServer();
