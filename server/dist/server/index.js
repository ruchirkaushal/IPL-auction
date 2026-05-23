"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const allPlayers_1 = require("./lib/allPlayers");
const playerImageResolver_1 = require("../shared/playerImageResolver");
const auctionSets_1 = require("./lib/auctionSets");
const auctionConfig_1 = require("../shared/auctionConfig");
const auctionPricing_1 = require("../shared/auctionPricing");
// Constants
const ALL_TEAM_IDS = ['MI', 'CSK', 'RCB', 'KKR', 'DC', 'RR', 'PBKS', 'SRH', 'GT', 'LSG'];
// Full 232-player database from all 10 IPL teams
const PLAYERS = allPlayers_1.ALL_PLAYERS;
const getPlayerById = (id) => PLAYERS.find(p => p.id === id);
// Helper to shuffle an array
const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};
// Helper to derive the set name for a given player ID
const getSetNameForPlayer = (playerId) => {
    const sets = (0, auctionSets_1.getAuctionSets)();
    const match = sets.find(s => s.playerIds.includes(playerId));
    return match ? match.setName : '';
};
const rooms = new Map();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, { cors: { origin: '*' } });
// REST API endpoint to get all players
app.get('/api/players', (_req, res) => {
    res.json(PLAYERS);
});
console.log(`Loaded ${PLAYERS.length} players from the IPL database`);
const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const getCurrentAuctionPlayer = (state) => {
    const playerId = state.auction.auctionQueue[state.auction.currentPlayerIndex];
    return playerId ? getPlayerById(playerId) : undefined;
};
const getAuthoritativeNextBid = (state) => {
    if (state.auction.phase !== 'bidding')
        return null;
    const currentPlayer = getCurrentAuctionPlayer(state);
    if (!currentPlayer)
        return null;
    // If no team has placed a bid yet on the current player, the first bid is the base price!
    if (!state.auction.highestBidderId) {
        return (0, auctionPricing_1.normalizeBasePrice)(currentPlayer.basePrice);
    }
    return (0, auctionPricing_1.getNextBid)(state.auction.currentBid, currentPlayer.basePrice);
};
const syncAuctionDerivedState = (state) => {
    state.auction.nextBidAmount = getAuthoritativeNextBid(state);
};
const emitRoomState = (roomCode) => {
    const room = rooms.get(roomCode);
    if (room) {
        syncAuctionDerivedState(room.state);
        io.to(roomCode).emit('room_state_update', room.state);
    }
};
const clearAllTimers = (room) => {
    if (room.timerInterval)
        clearInterval(room.timerInterval);
    if (room.autoAdvanceTimeout)
        clearTimeout(room.autoAdvanceTimeout);
    room.aiTimeouts.forEach(clearTimeout);
    room.timerInterval = null;
    room.autoAdvanceTimeout = null;
    room.aiTimeouts = [];
};
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
    // AI bidding is completely disabled per client's strict HUMAN-ONLY BIDDING SYSTEM requirement.
};
const addChatMessage = (room, msg) => {
    const newMsg = {
        ...msg,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now()
    };
    room.state.chat.push(newMsg);
    if (room.state.chat.length > 100) {
        room.state.chat.shift();
    }
};
const placeBid = (room, teamId, isAI = false) => {
    const state = room.state;
    if (state.auction.isPaused)
        return false;
    if (state.auction.phase !== 'bidding')
        return false;
    if (state.auction.isAdvancing)
        return false;
    const player = getCurrentAuctionPlayer(state);
    if (!player)
        return false;
    const normalizedAmount = getAuthoritativeNextBid(state);
    if (normalizedAmount === null) {
        return false;
    }
    // AI bidding is completely disabled. Reject all AI bids.
    if (isAI) {
        return false;
    }
    const team = state.teams[teamId];
    // Verify team is owned by an active human player in the room
    const owningPlayer = state.players.find(p => p.teamId === teamId);
    if (!owningPlayer || team.ownerId !== owningPlayer.socketId) {
        return false;
    }
    if (team.purseRemaining < normalizedAmount)
        return false;
    if (team.squad.length >= auctionConfig_1.MAX_SQUAD_SIZE)
        return false;
    if (player.isOverseas && team.overseasCount >= auctionConfig_1.MAX_OVERSEAS_PLAYERS)
        return false;
    state.auction.currentBid = normalizedAmount;
    state.auction.highestBidderId = teamId;
    ALL_TEAM_IDS.forEach(id => {
        if (state.teams[id].status === 'leading') {
            state.teams[id].status = 'idle';
        }
    });
    team.status = 'leading';
    state.auction.ticks = 100;
    syncAuctionDerivedState(state);
    io.to(state.roomCode).emit('bid_placed', { teamId, teamName: teamId, amount: normalizedAmount, isAI });
    addChatMessage(room, {
        type: 'system_bid',
        teamId,
        playerName: player.name,
        amount: normalizedAmount
    });
    emitRoomState(state.roomCode);
    scheduleAiBids(room);
    return true;
};
const resolveCurrentPlayer = (room) => {
    const state = room.state;
    const player = getPlayerById(state.auction.auctionQueue[state.auction.currentPlayerIndex]);
    if (!player)
        return;
    if (state.auction.highestBidderId) {
        state.auction.phase = 'sold';
        const team = state.teams[state.auction.highestBidderId];
        const amountPaid = (0, auctionPricing_1.toSafeLakhs)(state.auction.currentBid);
        team.purseRemaining = (0, auctionPricing_1.toSafeLakhs)(team.purseRemaining - amountPaid);
        team.squad.push({ id: player.id, price: amountPaid });
        if (player.isOverseas)
            team.overseasCount += 1;
        io.to(state.roomCode).emit('player_sold', {
            teamId: team.teamId,
            teamName: team.teamId,
            amount: amountPaid,
            playerName: player.name,
            playerId: player.id
        });
        addChatMessage(room, {
            type: 'system_sold',
            teamId: team.teamId,
            playerName: player.name,
            amount: amountPaid
        });
    }
    else {
        state.auction.phase = 'unsold';
        io.to(state.roomCode).emit('player_unsold', {
            playerName: player.name,
            playerId: player.id
        });
        addChatMessage(room, {
            type: 'system_unsold',
            playerName: player.name
        });
    }
    ALL_TEAM_IDS.forEach(id => { state.teams[id].status = 'idle'; });
    emitRoomState(state.roomCode);
    room.autoAdvanceTimeout = setTimeout(() => {
        advanceToNextPlayer(room);
    }, 4000);
};
const advanceToNextPlayer = (room) => {
    const state = room.state;
    state.auction.phase = 'advancing';
    state.auction.currentPlayerIndex += 1;
    state.auction.currentBid = 0;
    state.auction.nextBidAmount = null;
    state.auction.highestBidderId = null;
    state.auction.passedTeams = [];
    state.auction.isAdvancing = false;
    if (state.auction.currentPlayerIndex >= state.auction.auctionQueue.length) {
        io.to(state.roomCode).emit('auction_complete', state);
        return;
    }
    const nextPlayerId = state.auction.auctionQueue[state.auction.currentPlayerIndex];
    io.to(state.roomCode).emit('player_advancing', { nextPlayerId, nextPlayerIndex: state.auction.currentPlayerIndex });
    emitRoomState(state.roomCode);
    setTimeout(() => {
        const nextPlayer = getPlayerById(nextPlayerId);
        if (nextPlayer) {
            state.auction.currentBid = (0, auctionPricing_1.normalizeBasePrice)(nextPlayer.basePrice);
        }
        state.auction.currentSetName = getSetNameForPlayer(nextPlayerId);
        state.auction.phase = 'bidding';
        emitRoomState(state.roomCode);
        startTimer(room);
        scheduleAiBids(room);
    }, 1000);
};
const startTimer = (room) => {
    if (room.state.auction.isPaused)
        return;
    if (room.timerInterval)
        return;
    if (room.state.auction.isAdvancing)
        return;
    if (room.state.auction.ticks <= 0) {
        room.state.auction.ticks = 100;
    }
    room.timerInterval = setInterval(() => {
        if (room.state.auction.isPaused) {
            if (room.timerInterval)
                clearInterval(room.timerInterval);
            room.timerInterval = null;
            return;
        }
        room.state.auction.ticks -= 1;
        io.to(room.state.roomCode).emit('timer_update', { ticks: room.state.auction.ticks, timer: room.state.auction.ticks / 10 });
        if (room.state.auction.ticks <= 0) {
            if (room.timerInterval)
                clearInterval(room.timerInterval);
            room.timerInterval = null;
            if (room.state.auction.isAdvancing)
                return;
            room.state.auction.isAdvancing = true;
            resolveCurrentPlayer(room);
        }
    }, 100);
};
io.on('connection', (socket) => {
    socket.on('create_room', ({ playerName }) => {
        const roomCode = generateRoomCode();
        const initialTeams = {};
        ALL_TEAM_IDS.forEach(id => {
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
        const roomState = {
            roomCode,
            hostId: socket.id,
            players: [{ socketId: socket.id, name: playerName, teamId: null, isHost: true, isReady: false }],
            teams: initialTeams,
            auction: {
                isStarted: false,
                currentPlayerIndex: 0,
                auctionQueue: [],
                currentBid: 0,
                nextBidAmount: null,
                highestBidderId: null,
                ticks: 100,
                phase: 'waiting',
                passedTeams: [],
                isAdvancing: false,
                currentSetName: '',
                isPaused: false
            },
            chat: [],
            isLocked: false
        };
        rooms.set(roomCode, {
            state: roomState,
            timerInterval: null,
            autoAdvanceTimeout: null,
            aiTimeouts: []
        });
        socket.join(roomCode);
        socket.emit('room_created', { roomCode });
        emitRoomState(roomCode);
    });
    socket.on('join_room', ({ roomCode, playerName }) => {
        const room = rooms.get(roomCode);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        if (room.state.isLocked) {
            socket.emit('error', { message: 'Room is locked' });
            return;
        }
        if (room.state.players.length >= 10) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }
        room.state.players.push({ socketId: socket.id, name: playerName, teamId: null, isHost: false, isReady: false });
        socket.join(roomCode);
        socket.emit('room_joined', { roomCode });
        emitRoomState(roomCode);
    });
    socket.on('select_team', ({ roomCode, teamId }) => {
        const room = rooms.get(roomCode);
        if (!room)
            return;
        const player = room.state.players.find(p => p.socketId === socket.id);
        if (!player)
            return;
        if (room.state.teams[teamId].ownerId !== null) {
            socket.emit('error', { message: 'Team already taken' });
            return;
        }
        // Release old team if any
        if (player.teamId) {
            room.state.teams[player.teamId].ownerId = null;
            room.state.teams[player.teamId].ownerName = null;
        }
        player.teamId = teamId;
        player.isReady = true;
        room.state.teams[teamId].ownerId = socket.id;
        room.state.teams[teamId].ownerName = player.name;
        emitRoomState(roomCode);
    });
    socket.on('start_auction', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room || room.state.hostId !== socket.id)
            return;
        // Check if all players ready
        if (!room.state.players.every(p => p.isReady)) {
            socket.emit('error', { message: 'Not all players are ready' });
            return;
        }
        room.state.isLocked = true;
        room.state.auction.isStarted = true;
        room.state.auction.auctionQueue = (0, auctionSets_1.createAuctionQueue)();
        const firstPlayerId = room.state.auction.auctionQueue[0];
        const firstPlayer = getPlayerById(firstPlayerId);
        if (firstPlayer) {
            room.state.auction.currentBid = (0, auctionPricing_1.normalizeBasePrice)(firstPlayer.basePrice);
        }
        room.state.auction.currentSetName = getSetNameForPlayer(firstPlayerId);
        room.state.auction.phase = 'bidding';
        emitRoomState(roomCode);
        startTimer(room);
        scheduleAiBids(room);
    });
    socket.on('place_bid', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room)
            return;
        const player = room.state.players.find(p => p.socketId === socket.id);
        if (!player || !player.teamId)
            return;
        if (!placeBid(room, player.teamId)) {
            const expectedBid = getAuthoritativeNextBid(room.state);
            socket.emit('bid_rejected', {
                reason: expectedBid === null
                    ? 'Invalid bid'
                    : `Invalid bid. Next valid amount is ${(0, auctionPricing_1.formatAuctionMoney)(expectedBid)}.`,
            });
        }
    });
    socket.on('pass_bid', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room || room.state.auction.phase !== 'bidding')
            return;
        const player = room.state.players.find(p => p.socketId === socket.id);
        if (!player || !player.teamId)
            return;
        if (!room.state.auction.passedTeams.includes(player.teamId)) {
            room.state.auction.passedTeams.push(player.teamId);
            room.state.teams[player.teamId].status = 'passed';
            emitRoomState(roomCode);
        }
    });
    socket.on('reset_room', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room || room.state.hostId !== socket.id)
            return;
        clearAllTimers(room);
        // Reset auction state
        room.state.auction = {
            isStarted: false,
            currentPlayerIndex: 0,
            auctionQueue: [],
            currentBid: 0,
            nextBidAmount: null,
            highestBidderId: null,
            ticks: 100,
            phase: 'waiting',
            passedTeams: [],
            isAdvancing: false,
            currentSetName: '',
            isPaused: false
        };
        // Reset team states
        ALL_TEAM_IDS.forEach(teamId => {
            room.state.teams[teamId].ownerId = null;
            room.state.teams[teamId].ownerName = null;
            room.state.teams[teamId].purseRemaining = auctionConfig_1.INITIAL_PURSE_LAKHS;
            room.state.teams[teamId].squad = [];
            room.state.teams[teamId].overseasCount = 0;
            room.state.teams[teamId].status = 'idle';
        });
        // Reset player states
        room.state.players = room.state.players.map(p => ({
            ...p,
            teamId: null,
            isReady: false
        }));
        room.state.chat = [];
        // Inform all clients to go to lobby
        io.to(roomCode).emit('room_reset');
        emitRoomState(roomCode);
    });
    socket.on('send_chat', ({ roomCode, text }) => {
        const room = rooms.get(roomCode);
        if (!room)
            return;
        const player = room.state.players.find(p => p.socketId === socket.id);
        if (!player)
            return;
        addChatMessage(room, {
            type: 'user',
            sender: player.name,
            text,
            teamId: player.teamId || undefined
        });
        emitRoomState(roomCode);
    });
    socket.on('toggle_pause', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room || room.state.hostId !== socket.id)
            return;
        const currentPaused = room.state.auction.isPaused;
        room.state.auction.isPaused = !currentPaused;
        if (room.state.auction.isPaused) {
            // Pause: clear all active timers/timeouts
            clearAllTimers(room);
        }
        else {
            // Resume: restart timers based on the current phase
            const phase = room.state.auction.phase;
            if (phase === 'bidding') {
                startTimer(room);
                scheduleAiBids(room);
            }
            else if (phase === 'sold' || phase === 'unsold') {
                room.autoAdvanceTimeout = setTimeout(() => {
                    advanceToNextPlayer(room);
                }, 4000);
            }
            else if (phase === 'advancing') {
                room.autoAdvanceTimeout = setTimeout(() => {
                    advanceToNextPlayer(room);
                }, 1000);
            }
        }
        emitRoomState(roomCode);
    });
    socket.on('end_auction', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room || room.state.hostId !== socket.id)
            return;
        clearAllTimers(room);
        room.state.auction.currentPlayerIndex = room.state.auction.auctionQueue.length;
        room.state.auction.phase = 'waiting'; // Skip to results
        io.to(roomCode).emit('auction_complete', room.state);
        emitRoomState(roomCode);
    });
    const handleLeaveRoom = (socketId) => {
        rooms.forEach((room, roomCode) => {
            const playerIndex = room.state.players.findIndex(p => p.socketId === socketId);
            if (playerIndex !== -1) {
                const player = room.state.players[playerIndex];
                if (player.teamId) {
                    room.state.teams[player.teamId].ownerId = null;
                    room.state.teams[player.teamId].ownerName = null;
                }
                room.state.players.splice(playerIndex, 1);
                const clientSocket = io.sockets.sockets.get(socketId);
                if (clientSocket) {
                    clientSocket.leave(roomCode);
                }
                if (room.state.players.length === 0) {
                    clearAllTimers(room);
                    rooms.delete(roomCode);
                }
                else if (player.isHost) {
                    room.state.players[0].isHost = true;
                    room.state.hostId = room.state.players[0].socketId;
                    emitRoomState(roomCode);
                }
                else {
                    emitRoomState(roomCode);
                }
            }
        });
    };
    socket.on('leave_room', () => {
        handleLeaveRoom(socket.id);
    });
    socket.on('kick_player', ({ roomCode, targetSocketId }) => {
        const room = rooms.get(roomCode);
        if (!room || room.state.hostId !== socket.id)
            return;
        // Find player and remove them
        const playerIndex = room.state.players.findIndex(p => p.socketId === targetSocketId);
        if (playerIndex !== -1) {
            const player = room.state.players[playerIndex];
            if (player.teamId) {
                room.state.teams[player.teamId].ownerId = null;
                room.state.teams[player.teamId].ownerName = null;
            }
            room.state.players.splice(playerIndex, 1);
            // Emit kicked event to that specific socket
            io.to(targetSocketId).emit('kicked');
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.leave(roomCode);
            }
            emitRoomState(roomCode);
        }
    });
    socket.on('disconnect', () => {
        handleLeaveRoom(socket.id);
    });
});
const PORT = 3005;
async function startServer() {
    console.log('Initializing automatic IPL player image resolution system...');
    await (0, playerImageResolver_1.resolveAllPlayerImages)(PLAYERS);
    httpServer.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}
startServer();
