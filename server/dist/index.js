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
const auctionSets_1 = require("./lib/auctionSets");
// Constants
const INITIAL_PURSE = 12000;
const MAX_SQUAD = 25;
const MAX_OVERSEAS = 8;
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
const emitRoomState = (roomCode) => {
    const room = rooms.get(roomCode);
    if (room) {
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
const getBidIncrement = (currentBid) => {
    if (currentBid < 100)
        return 20;
    if (currentBid < 200)
        return 25;
    if (currentBid < 500)
        return 50;
    if (currentBid < 1000)
        return 100;
    if (currentBid < 2000)
        return 200;
    return 500;
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
    const state = room.state;
    const player = getPlayerById(state.auction.auctionQueue[state.auction.currentPlayerIndex]);
    if (!player)
        return;
    const currentBid = state.auction.currentBid;
    ALL_TEAM_IDS.forEach(teamId => {
        const team = state.teams[teamId];
        if (team.ownerId !== null)
            return; // Not an AI team
        if (state.auction.highestBidderId === teamId)
            return; // Already highest
        if (state.auction.passedTeams.includes(teamId))
            return; // Passed
        const prefs = AI_PREFS[teamId];
        let maxBid = 0;
        if (prefs.targetIds.includes(player.id)) {
            maxBid = player.basePrice * 3;
        }
        else if (prefs.roles.includes(player.role)) {
            maxBid = player.basePrice * 1.5;
        }
        else if (Math.random() < 0.3) {
            maxBid = player.basePrice * 1.2;
        }
        if (maxBid <= 0 || currentBid >= maxBid)
            return;
        const delay = Math.floor(Math.random() * 1500) + 1500; // 1.5s to 3s
        const timeout = setTimeout(() => {
            // Internal check again
            if (state.auction.phase !== 'bidding')
                return;
            if (state.auction.currentBid >= maxBid)
                return;
            const increment = getBidIncrement(state.auction.currentBid);
            const nextBid = state.auction.currentBid === 0 ? player.basePrice : state.auction.currentBid + increment;
            io.to(state.roomCode).emit('ai_bid_incoming', { teamId });
            setTimeout(() => {
                if (state.auction.phase !== 'bidding')
                    return;
                placeBid(room, teamId, nextBid, true);
            }, 300);
        }, delay);
        room.aiTimeouts.push(timeout);
    });
};
const placeBid = (room, teamId, amount, isAI = false) => {
    const state = room.state;
    if (state.auction.phase !== 'bidding')
        return false;
    if (state.auction.isAdvancing)
        return false;
    if (amount <= state.auction.currentBid && state.auction.currentBid !== 0)
        return false;
    const team = state.teams[teamId];
    if (team.purseRemaining < amount)
        return false;
    if (team.squad.length >= MAX_SQUAD)
        return false;
    const player = getPlayerById(state.auction.auctionQueue[state.auction.currentPlayerIndex]);
    if (!player)
        return false;
    if (player.isOverseas && team.overseasCount >= MAX_OVERSEAS)
        return false;
    state.auction.currentBid = amount;
    state.auction.highestBidderId = teamId;
    ALL_TEAM_IDS.forEach(id => {
        if (state.teams[id].status === 'leading') {
            state.teams[id].status = 'idle';
        }
    });
    team.status = 'leading';
    state.auction.ticks = 100;
    io.to(state.roomCode).emit('bid_placed', { teamId, teamName: teamId, amount, isAI });
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
        const amountPaid = state.auction.currentBid;
        team.purseRemaining -= amountPaid;
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
    }
    else {
        state.auction.phase = 'unsold';
        io.to(state.roomCode).emit('player_unsold', {
            playerName: player.name,
            playerId: player.id
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
            state.auction.currentBid = nextPlayer.basePrice;
        }
        state.auction.currentSetName = getSetNameForPlayer(nextPlayerId);
        state.auction.phase = 'bidding';
        emitRoomState(state.roomCode);
        startTimer(room);
        scheduleAiBids(room);
    }, 1000);
};
const startTimer = (room) => {
    if (room.timerInterval)
        return;
    if (room.state.auction.isAdvancing)
        return;
    room.state.auction.ticks = 100;
    room.timerInterval = setInterval(() => {
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
                purseRemaining: INITIAL_PURSE,
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
                highestBidderId: null,
                ticks: 100,
                phase: 'waiting',
                passedTeams: [],
                isAdvancing: false,
                currentSetName: ''
            },
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
            room.state.auction.currentBid = firstPlayer.basePrice;
        }
        room.state.auction.currentSetName = getSetNameForPlayer(firstPlayerId);
        room.state.auction.phase = 'bidding';
        emitRoomState(roomCode);
        startTimer(room);
        scheduleAiBids(room);
    });
    socket.on('place_bid', ({ roomCode, amount }) => {
        const room = rooms.get(roomCode);
        if (!room)
            return;
        const player = room.state.players.find(p => p.socketId === socket.id);
        if (!player || !player.teamId)
            return;
        if (!placeBid(room, player.teamId, amount)) {
            socket.emit('bid_rejected', { reason: 'Invalid bid' });
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
            highestBidderId: null,
            ticks: 100,
            phase: 'waiting',
            passedTeams: [],
            isAdvancing: false,
            currentSetName: ''
        };
        // Reset team states
        ALL_TEAM_IDS.forEach(teamId => {
            room.state.teams[teamId].purseRemaining = INITIAL_PURSE;
            room.state.teams[teamId].squad = [];
            room.state.teams[teamId].overseasCount = 0;
            room.state.teams[teamId].status = 'idle';
        });
        // Inform all clients to go to lobby
        io.to(roomCode).emit('room_reset');
        emitRoomState(roomCode);
    });
    socket.on('disconnect', () => {
        rooms.forEach((room, roomCode) => {
            const playerIndex = room.state.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                const player = room.state.players[playerIndex];
                if (player.teamId) {
                    room.state.teams[player.teamId].ownerId = null;
                    room.state.teams[player.teamId].ownerName = null;
                }
                room.state.players.splice(playerIndex, 1);
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
    });
});
const PORT = 3005;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
