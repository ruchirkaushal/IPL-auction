import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { ALL_PLAYERS } from './lib/allPlayers.ts';
import { resolveAllPlayerImages } from '../shared/playerImageResolver.ts';
import { createAuctionQueue, getAuctionSets } from './lib/auctionSets.ts';
import {
  INITIAL_PURSE_LAKHS,
  MAX_OVERSEAS_PLAYERS,
  MAX_SQUAD_SIZE,
} from '../shared/auctionConfig.ts';
import {
  formatAuctionMoney,
  getNextBid,
  isValidBidAmount,
  normalizeBasePrice,
  toSafeLakhs,
} from '../shared/auctionPricing.ts';

// Types (Imported from client or duplicated)
export type TeamId = 'MI' | 'CSK' | 'RCB' | 'KKR' | 'DC' | 'RR' | 'PBKS' | 'SRH' | 'GT' | 'LSG';
export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export type AuctionPhase = 'bidding' | 'sold' | 'unsold' | 'advancing' | 'waiting';

export interface ChatMessage {
  id: string;
  type: 'user' | 'system_bid' | 'system_sold' | 'system_unsold';
  sender?: string;
  text?: string;
  teamId?: TeamId;
  playerName?: string;
  amount?: number;
  timestamp: number;
}

export interface Player { id: string; name: string; role: PlayerRole; country: string; isOverseas: boolean; basePrice: number; photoUrl: string; image?: string; stats: Record<string, any>; starRating: number; isCapped: boolean; auctionSet: number; }
export interface TeamState { 
  teamId: TeamId; 
  ownerId: string | null; 
  ownerName: string | null; 
  purseRemaining: number; 
  squad: { id: string, price: number }[]; 
  overseasCount: number; 
  status: 'idle' | 'leading' | 'passed'; 
}
export interface AuctionState { isStarted: boolean; currentPlayerIndex: number; auctionQueue: string[]; currentBid: number; nextBidAmount: number | null; highestBidderId: TeamId | null; ticks: number; phase: AuctionPhase; passedTeams: TeamId[]; isAdvancing: boolean; currentSetName: string; isPaused: boolean; }
export interface RoomPlayer { socketId: string; name: string; teamId: TeamId | null; isHost: boolean; isReady: boolean; }
export interface RoomState { roomCode: string; hostId: string; players: RoomPlayer[]; teams: Record<TeamId, TeamState>; auction: AuctionState; chat: ChatMessage[]; isLocked: boolean; }

// Constants
const ALL_TEAM_IDS: TeamId[] = ['MI', 'CSK', 'RCB', 'KKR', 'DC', 'RR', 'PBKS', 'SRH', 'GT', 'LSG'];
// Full 232-player database from all 10 IPL teams
const PLAYERS: Player[] = ALL_PLAYERS;

const getPlayerById = (id: string) => PLAYERS.find(p => p.id === id);
// Helper to shuffle an array
const shuffleArray = (array: string[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Helper to derive the set name for a given player ID
const getSetNameForPlayer = (playerId: string): string => {
  const sets = getAuctionSets();
  const match = sets.find(s => s.playerIds.includes(playerId));
  return match ? match.setName : '';
};



interface Room {
  state: RoomState;
  timerInterval: NodeJS.Timeout | null;
  autoAdvanceTimeout: NodeJS.Timeout | null;
  aiTimeouts: NodeJS.Timeout[];
}

const rooms = new Map<string, Room>();

const app = express();
app.use(cors());
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// REST API endpoint to get all players
app.get('/api/players', (_req, res) => {
  res.json(PLAYERS);
});

console.log(`Loaded ${PLAYERS.length} players from the IPL database`);

const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const getCurrentAuctionPlayer = (state: RoomState) => {
  const playerId = state.auction.auctionQueue[state.auction.currentPlayerIndex];
  return playerId ? getPlayerById(playerId) : undefined;
};

const getAuthoritativeNextBid = (state: RoomState): number | null => {
  if (state.auction.phase !== 'bidding') return null;

  const currentPlayer = getCurrentAuctionPlayer(state);
  if (!currentPlayer) return null;

  // If no team has placed a bid yet on the current player, the first bid is the base price!
  if (!state.auction.highestBidderId) {
    return normalizeBasePrice(currentPlayer.basePrice);
  }

  return getNextBid(state.auction.currentBid, currentPlayer.basePrice);
};

const syncAuctionDerivedState = (state: RoomState) => {
  state.auction.nextBidAmount = getAuthoritativeNextBid(state);
};

const emitRoomState = (roomCode: string) => {
  const room = rooms.get(roomCode);
  if (room) {
    syncAuctionDerivedState(room.state);
    io.to(roomCode).emit('room_state_update', room.state);
  }
};

const clearAllTimers = (room: Room) => {
  if (room.timerInterval) clearInterval(room.timerInterval);
  if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
  room.aiTimeouts.forEach(clearTimeout);
  room.timerInterval = null;
  room.autoAdvanceTimeout = null;
  room.aiTimeouts = [];
};

const AI_PREFS: Record<TeamId, { targetIds: string[], roles: PlayerRole[] }> = {
  MI:   { targetIds: ['mi-23', 'mi-11', 'mi-4', 'mi-1', 'mi-12', 'mi-17'], roles: ['BAT', 'BOWL'] },
  CSK:  { targetIds: ['csk-1', 'csk-18', 'csk-19', 'csk-11', 'csk-13'], roles: ['AR', 'WK'] },
  RCB:  { targetIds: ['rcb-2', 'rcb-3', 'rcb-8', 'rcb-15', 'rcb-1'], roles: ['BAT', 'BOWL'] },
  KKR:  { targetIds: ['kkr-13', 'kkr-12', 'kkr-20', 'kkr-15', 'kkr-4'], roles: ['AR', 'BOWL'] },
  DC:   { targetIds: ['dc-1', 'dc-8', 'dc-22', 'dc-17', 'dc-3'], roles: ['WK', 'BOWL'] },
  RR:   { targetIds: ['rr-1', 'rr-7', 'rr-12', 'rr-9', 'rr-11'], roles: ['WK', 'BAT'] },
  PBKS: { targetIds: ['pbks-4', 'pbks-22', 'pbks-24', 'pbks-16', 'pbks-11'], roles: ['BAT', 'BOWL'] },
  SRH:  { targetIds: ['srh-8', 'srh-7', 'srh-17', 'srh-15', 'srh-13'], roles: ['BAT', 'AR'] },
  GT:   { targetIds: ['gt-1', 'gt-7', 'gt-26', 'gt-18', 'gt-6'], roles: ['BAT', 'BOWL'] },
  LSG:  { targetIds: ['lsg-4', 'lsg-7', 'lsg-24', 'lsg-5', 'lsg-8'], roles: ['WK', 'AR'] }
};

const scheduleAiBids = (room: Room) => {
  room.aiTimeouts.forEach(clearTimeout);
  room.aiTimeouts = [];
  // AI bidding is completely disabled per client's strict HUMAN-ONLY BIDDING SYSTEM requirement.
};

const addChatMessage = (room: Room, msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
  const newMsg: ChatMessage = {
    ...msg,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now()
  };
  room.state.chat.push(newMsg);
  if (room.state.chat.length > 100) {
    room.state.chat.shift();
  }
};

const placeBid = (room: Room, teamId: TeamId, isAI: boolean = false): boolean => {
  const state = room.state;
  if (state.auction.isPaused) return false;
  if (state.auction.phase !== 'bidding') return false;
  if (state.auction.isAdvancing) return false;
  
  const player = getCurrentAuctionPlayer(state);
  if (!player) return false;
  
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

  if (team.purseRemaining < normalizedAmount) return false;
  if (team.squad.length >= MAX_SQUAD_SIZE) return false;
  if (player.isOverseas && team.overseasCount >= MAX_OVERSEAS_PLAYERS) return false;

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

const resolveCurrentPlayer = (room: Room) => {
  const state = room.state;
  const player = getPlayerById(state.auction.auctionQueue[state.auction.currentPlayerIndex]);
  if (!player) return;

  if (state.auction.highestBidderId) {
    state.auction.phase = 'sold';
    const team = state.teams[state.auction.highestBidderId];
    const amountPaid = toSafeLakhs(state.auction.currentBid);
    team.purseRemaining = toSafeLakhs(team.purseRemaining - amountPaid);
    team.squad.push({ id: player.id, price: amountPaid });
    if (player.isOverseas) team.overseasCount += 1;
    
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
  } else {
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

const advanceToNextPlayer = (room: Room) => {
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
      state.auction.currentBid = normalizeBasePrice(nextPlayer.basePrice);
    }
    state.auction.currentSetName = getSetNameForPlayer(nextPlayerId);
    state.auction.phase = 'bidding';
    emitRoomState(state.roomCode);
    startTimer(room);
    scheduleAiBids(room);
  }, 1000);
};

const startTimer = (room: Room) => {
  if (room.state.auction.isPaused) return;
  if (room.timerInterval) return;
  if (room.state.auction.isAdvancing) return;

  if (room.state.auction.ticks <= 0) {
    room.state.auction.ticks = 100;
  }
  
  room.timerInterval = setInterval(() => {
    if (room.state.auction.isPaused) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      room.timerInterval = null;
      return;
    }
    room.state.auction.ticks -= 1;
    io.to(room.state.roomCode).emit('timer_update', { ticks: room.state.auction.ticks, timer: room.state.auction.ticks / 10 });
    
    if (room.state.auction.ticks <= 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      room.timerInterval = null;
      
      if (room.state.auction.isAdvancing) return;
      room.state.auction.isAdvancing = true;
      resolveCurrentPlayer(room);
    }
  }, 100);
};

io.on('connection', (socket: Socket) => {
  socket.on('create_room', ({ playerName }: { playerName: string }) => {
    const roomCode = generateRoomCode();
    
    const initialTeams = {} as Record<TeamId, TeamState>;
    ALL_TEAM_IDS.forEach(id => {
      initialTeams[id] = {
        teamId: id,
        ownerId: null,
        ownerName: null,
        purseRemaining: INITIAL_PURSE_LAKHS,
        squad: [],
        overseasCount: 0,
        status: 'idle'
      };
    });

    const roomState: RoomState = {
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

  socket.on('join_room', ({ roomCode, playerName }: { roomCode: string, playerName: string }) => {
    const room = rooms.get(roomCode);
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    if (room.state.isLocked) { socket.emit('error', { message: 'Room is locked' }); return; }
    if (room.state.players.length >= 10) { socket.emit('error', { message: 'Room is full' }); return; }

    room.state.players.push({ socketId: socket.id, name: playerName, teamId: null, isHost: false, isReady: false });
    socket.join(roomCode);
    socket.emit('room_joined', { roomCode });
    emitRoomState(roomCode);
  });

  socket.on('select_team', ({ roomCode, teamId }: { roomCode: string, teamId: TeamId }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const player = room.state.players.find(p => p.socketId === socket.id);
    if (!player) return;

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

  socket.on('start_auction', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode);
    if (!room || room.state.hostId !== socket.id) return;
    
    // Check if all players ready
    if (!room.state.players.every(p => p.isReady)) {
      socket.emit('error', { message: 'Not all players are ready' });
      return;
    }

    room.state.isLocked = true;
    room.state.auction.isStarted = true;
    room.state.auction.auctionQueue = createAuctionQueue();
    
    const firstPlayerId = room.state.auction.auctionQueue[0];
    const firstPlayer = getPlayerById(firstPlayerId);
    if (firstPlayer) {
      room.state.auction.currentBid = normalizeBasePrice(firstPlayer.basePrice);
    }
    room.state.auction.currentSetName = getSetNameForPlayer(firstPlayerId);
    room.state.auction.phase = 'bidding';
    
    emitRoomState(roomCode);
    startTimer(room);
    scheduleAiBids(room);
  });

  socket.on('place_bid', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const player = room.state.players.find(p => p.socketId === socket.id);
    if (!player || !player.teamId) return;

    if (!placeBid(room, player.teamId)) {
      const expectedBid = getAuthoritativeNextBid(room.state);

      socket.emit('bid_rejected', {
        reason: expectedBid === null
          ? 'Invalid bid'
          : `Invalid bid. Next valid amount is ${formatAuctionMoney(expectedBid)}.`,
      });
    }
  });

  socket.on('pass_bid', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode);
    if (!room || room.state.auction.phase !== 'bidding') return;
    
    const player = room.state.players.find(p => p.socketId === socket.id);
    if (!player || !player.teamId) return;

    if (!room.state.auction.passedTeams.includes(player.teamId)) {
      room.state.auction.passedTeams.push(player.teamId);
      room.state.teams[player.teamId].status = 'passed';
      emitRoomState(roomCode);
    }
  });

  socket.on('reset_room', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode);
    if (!room || room.state.hostId !== socket.id) return;
    
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
      room.state.teams[teamId].purseRemaining = INITIAL_PURSE_LAKHS;
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

  socket.on('send_chat', ({ roomCode, text }: { roomCode: string, text: string }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const player = room.state.players.find(p => p.socketId === socket.id);
    if (!player) return;

    addChatMessage(room, {
      type: 'user',
      sender: player.name,
      text,
      teamId: player.teamId || undefined
    });

    emitRoomState(roomCode);
  });

  socket.on('toggle_pause', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode);
    if (!room || room.state.hostId !== socket.id) return;

    const currentPaused = room.state.auction.isPaused;
    room.state.auction.isPaused = !currentPaused;

    if (room.state.auction.isPaused) {
      // Pause: clear all active timers/timeouts
      clearAllTimers(room);
    } else {
      // Resume: restart timers based on the current phase
      const phase = room.state.auction.phase;
      if (phase === 'bidding') {
        startTimer(room);
        scheduleAiBids(room);
      } else if (phase === 'sold' || phase === 'unsold') {
        room.autoAdvanceTimeout = setTimeout(() => {
          advanceToNextPlayer(room);
        }, 4000);
      } else if (phase === 'advancing') {
        room.autoAdvanceTimeout = setTimeout(() => {
          advanceToNextPlayer(room);
        }, 1000);
      }
    }

    emitRoomState(roomCode);
  });

  socket.on('end_auction', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode);
    if (!room || room.state.hostId !== socket.id) return;

    clearAllTimers(room);
    room.state.auction.currentPlayerIndex = room.state.auction.auctionQueue.length;
    room.state.auction.phase = 'waiting'; // Skip to results
    io.to(roomCode).emit('auction_complete', room.state);
    emitRoomState(roomCode);
  });

  const handleLeaveRoom = (socketId: string) => {
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
        } else if (player.isHost) {
          room.state.players[0].isHost = true;
          room.state.hostId = room.state.players[0].socketId;
          emitRoomState(roomCode);
        } else {
          emitRoomState(roomCode);
        }
      }
    });
  };

  socket.on('leave_room', () => {
    handleLeaveRoom(socket.id);
  });

  socket.on('kick_player', ({ roomCode, targetSocketId }: { roomCode: string, targetSocketId: string }) => {
    const room = rooms.get(roomCode);
    if (!room || room.state.hostId !== socket.id) return;
    
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
  await resolveAllPlayerImages(PLAYERS);
  
  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
