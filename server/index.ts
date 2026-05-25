import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { ALL_PLAYERS } from './lib/allPlayers';
import { resolveAllPlayerImages } from '../shared/playerImageResolver';
import { createAuctionQueue, getAuctionSets } from './lib/auctionSets';
import {
  INITIAL_PURSE_LAKHS,
  MAX_OVERSEAS_PLAYERS,
  MAX_SQUAD_SIZE,
} from '../shared/auctionConfig';
import {
  formatAuctionMoney,
  getNextBid,
  isValidBidAmount,
  normalizeBasePrice,
  toSafeLakhs,
} from '../shared/auctionPricing';

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
export interface RoomPlayer { socketId: string; userId: string; name: string; teamId: TeamId | null; isHost: boolean; isReady: boolean; }
export interface RoomState { roomCode: string; hostId: string; players: RoomPlayer[]; teams: Record<TeamId, TeamState>; auction: AuctionState; chat: ChatMessage[]; isLocked: boolean; }

// Constants
const ALL_TEAM_IDS: TeamId[] = ['MI', 'CSK', 'RCB', 'KKR', 'DC', 'RR', 'PBKS', 'SRH', 'GT', 'LSG'];
// Full 232-player database from all 10 IPL teams
const PLAYERS: Player[] = ALL_PLAYERS;
const AUCTION_START_TICKS = Number(process.env.AUCTION_START_TICKS ?? 100);
const AUCTION_TIMER_TICK_MS = Number(process.env.AUCTION_TIMER_TICK_MS ?? 100);
const AUCTION_DELAY_RESOLVE_TO_NEXT_MS = Number(process.env.AUCTION_DELAY_RESOLVE_TO_NEXT_MS ?? 4000);
const AUCTION_DELAY_ADVANCE_TO_BIDDING_MS = Number(process.env.AUCTION_DELAY_ADVANCE_TO_BIDDING_MS ?? 1000);
const AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS = Number(process.env.AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS ?? 200);
const SOCKET_PING_INTERVAL_MS = Number(process.env.SOCKET_PING_INTERVAL_MS ?? 25000);
const SOCKET_PING_TIMEOUT_MS = Number(process.env.SOCKET_PING_TIMEOUT_MS ?? 120000);
const SOCKET_RECOVERY_WINDOW_MS = Number(process.env.SOCKET_RECOVERY_WINDOW_MS ?? 120000);

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
  biddingStartTimeout: NodeJS.Timeout | null;
  aiTimeouts: NodeJS.Timeout[];
  deletionTimeout?: NodeJS.Timeout | null;
  roomGeneration: number; // Invalidates stale references to deleted rooms
}

const rooms = new Map<string, Room>();
const reconnectTimeouts = new Map<string, NodeJS.Timeout>();

const getReconnectKey = (roomCode: string, player: { userId?: string; name: string }) => {
  return `${roomCode}_${player.userId ?? player.name}`;
};

// Helper to check if a room reference is still valid (hasn't been deleted)
const isRoomStale = (room: Room, roomCode: string): boolean => {
  const currentRoom = rooms.get(roomCode);
  if (!currentRoom) return true; // Room was deleted
  if (currentRoom.roomGeneration !== room.roomGeneration) return true; // Room was recreated
  return false;
};

const getCurrentPlayerId = (state: RoomState): string | null => {
  return state.auction.auctionQueue[state.auction.currentPlayerIndex] ?? null;
};

const logAuctionEvent = (room: Room, event: string, meta: Record<string, unknown> = {}) => {
  const auction = room.state.auction;
  const currentPlayerId = getCurrentPlayerId(room.state);
  console.log(
    `[Auction ${room.state.roomCode}] ${event} :: phase=${auction.phase} idx=${auction.currentPlayerIndex}/${auction.auctionQueue.length} ticks=${auction.ticks} paused=${auction.isPaused} advancing=${auction.isAdvancing} current=${currentPlayerId ?? 'none'} ${JSON.stringify(meta)}`
  );
};

const app = express();
app.use(cors());
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  pingInterval: SOCKET_PING_INTERVAL_MS,
  pingTimeout: SOCKET_PING_TIMEOUT_MS,
  connectionStateRecovery: {
    maxDisconnectionDuration: SOCKET_RECOVERY_WINDOW_MS,
    skipMiddlewares: true,
  },
});

io.engine.on('connection_error', (err) => {
  console.error('[Socket.IO connection_error]', {
    code: err.code,
    message: err.message,
    context: err.context,
  });
});

// REST API endpoint to get all players
app.get('/api/players', (_req, res) => {
  res.json(PLAYERS);
});

console.log(`Loaded ${PLAYERS.length} players from the IPL database`);
console.log(
  `Auction timing config: startTicks=${AUCTION_START_TICKS}, tickMs=${AUCTION_TIMER_TICK_MS}, resolveToNextMs=${AUCTION_DELAY_RESOLVE_TO_NEXT_MS}, advanceToBiddingMs=${AUCTION_DELAY_ADVANCE_TO_BIDDING_MS}, missingRecoveryMs=${AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS}`
);
console.log(
  `Socket config: pingIntervalMs=${SOCKET_PING_INTERVAL_MS}, pingTimeoutMs=${SOCKET_PING_TIMEOUT_MS}, recoveryWindowMs=${SOCKET_RECOVERY_WINDOW_MS}`
);

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
  try {
    const room = rooms.get(roomCode);
    if (!room) {
      console.warn(`[Socket Emission] Room ${roomCode} not found - emission skipped`);
      return;
    }
    syncAuctionDerivedState(room.state);
    const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
    const clientCount = socketsInRoom ? socketsInRoom.size : 0;
    io.to(roomCode).emit('room_state_update', room.state);
    logAuctionEvent(room, 'room_state_emitted', { clientCount });
  } catch (error) {
    console.error(`[CRITICAL] Error emitting room state for ${roomCode}:`, error);
  }
};

const emitRoomUnavailable = (socket: Socket, roomCode: string, source: string) => {
  console.warn(`[Room Missing] source=${source} room=${roomCode} socket=${socket.id}`);
  socket.emit('room_unavailable', {
    roomCode,
    source,
    message: 'Room not found on server. It may have restarted or expired.',
  });
};

const getRoomOrNotify = (socket: Socket, roomCode: string, source: string): Room | null => {
  const room = rooms.get(roomCode);
  if (!room) {
    emitRoomUnavailable(socket, roomCode, source);
    return null;
  }
  return room;
};

const clearAllTimers = (room: Room) => {
  if (room.timerInterval) clearInterval(room.timerInterval);
  if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
  if (room.biddingStartTimeout) clearTimeout(room.biddingStartTimeout);
  room.aiTimeouts.forEach(clearTimeout);
  room.timerInterval = null;
  room.autoAdvanceTimeout = null;
  room.biddingStartTimeout = null;
  room.aiTimeouts = [];
};

const scheduleAutoAdvance = (room: Room, delayMs: number, reason: string) => {
  if (room.autoAdvanceTimeout) {
    clearTimeout(room.autoAdvanceTimeout);
  }
  const roomCode = room.state.roomCode;
  const capturedGeneration = room.roomGeneration;
  
  room.autoAdvanceTimeout = setTimeout(() => {
    room.autoAdvanceTimeout = null;
    try {
      // Validate room still exists at timeout execution time
      const timeoutRoom = rooms.get(roomCode);
      if (!timeoutRoom || timeoutRoom.roomGeneration !== capturedGeneration) {
        console.log(`[AutoAdvance Timeout] Room ${roomCode} is stale. Aborting auto-advance.`);
        return;
      }
      advanceToNextPlayer(timeoutRoom, reason);
    } catch (error) {
      console.error(`[CRITICAL] Error in scheduleAutoAdvance timeout for ${roomCode}:`, error);
    }
  }, delayMs);
  logAuctionEvent(room, 'auto_advance_scheduled', { delayMs, reason });
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
  
  state.auction.ticks = AUCTION_START_TICKS;
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
  try {
    const state = room.state;
    const roomCode = state.roomCode;
    
    // Validate room still exists
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || currentRoom.roomGeneration !== room.roomGeneration) {
      console.log(`[Resolve] Room ${roomCode} is stale. Aborting resolveCurrentPlayer.`);
      return;
    }

    const playerId = getCurrentPlayerId(state);
    if (!playerId) {
      logAuctionEvent(currentRoom, 'resolve_missing_player_id');
      state.auction.isAdvancing = false;
      scheduleAutoAdvance(currentRoom, AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS, 'missing_player_id');
      return;
    }

    const player = getPlayerById(playerId);
    if (!player) {
      logAuctionEvent(currentRoom, 'resolve_missing_player_record', { playerId });
      state.auction.isAdvancing = false;
      scheduleAutoAdvance(currentRoom, AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS, 'missing_player_record');
      return;
    }

    if (state.auction.highestBidderId) {
      state.auction.phase = 'sold';
      const team = state.teams[state.auction.highestBidderId];
      if (!team) {
        console.error(`[Error] resolveCurrentPlayer: Team ${state.auction.highestBidderId} not found`);
        return;
      }
      const amountPaid = toSafeLakhs(state.auction.currentBid);
      team.purseRemaining = toSafeLakhs(team.purseRemaining - amountPaid);
      team.squad.push({ id: player.id, price: amountPaid });
      if (player.isOverseas) team.overseasCount += 1;
      
      logAuctionEvent(currentRoom, 'player_sold', { teamId: team.teamId, playerName: player.name, amount: amountPaid });
      const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
      console.log(`[Sale] ${player.name} sold to ${team.teamId} for ${amountPaid}L to ${socketsInRoom?.size || 0} clients`);
      
      io.to(roomCode).emit('player_sold', {
        teamId: team.teamId,
        teamName: team.teamId,
        amount: amountPaid,
        playerName: player.name,
        playerId: player.id
      });

      addChatMessage(currentRoom, {
        type: 'system_sold',
        teamId: team.teamId,
        playerName: player.name,
        amount: amountPaid
      });
    } else {
      state.auction.phase = 'unsold';
      logAuctionEvent(currentRoom, 'player_unsold', { playerName: player.name });
      const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
      console.log(`[Unsold] ${player.name} went unsold to ${socketsInRoom?.size || 0} clients`);
      
      io.to(roomCode).emit('player_unsold', {
        playerName: player.name,
        playerId: player.id
      });

      addChatMessage(currentRoom, {
        type: 'system_unsold',
        playerName: player.name
      });
    }

    ALL_TEAM_IDS.forEach(id => { state.teams[id].status = 'idle'; });
    emitRoomState(roomCode);

    scheduleAutoAdvance(currentRoom, AUCTION_DELAY_RESOLVE_TO_NEXT_MS, 'resolve_complete');
  } catch (error) {
    console.error(`[CRITICAL] Error in resolveCurrentPlayer for room ${room.state.roomCode}:`, error);
  }
};

const advanceToNextPlayer = (room: Room, reason: string = 'unknown') => {
  try {
    const state = room.state;
    const roomCode = state.roomCode;
    
    // Validate room still exists
    const currentRoom = rooms.get(roomCode);
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

    while (state.auction.currentPlayerIndex < state.auction.auctionQueue.length) {
      const candidateId = state.auction.auctionQueue[state.auction.currentPlayerIndex];
      if (candidateId && getPlayerById(candidateId)) {
        break;
      }
      logAuctionEvent(currentRoom, 'advance_skipping_invalid_player', { candidateId, reason });
      state.auction.currentPlayerIndex += 1;
    }

    if (state.auction.currentPlayerIndex >= state.auction.auctionQueue.length) {
      logAuctionEvent(currentRoom, 'auction_complete', { reason });
      const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
      console.log(`[Advance] Auction complete. Emitting to ${socketsInRoom?.size || 0} clients in ${roomCode}.`);
      io.to(roomCode).emit('auction_complete', state);
      return;
    }

    const nextPlayerId = state.auction.auctionQueue[state.auction.currentPlayerIndex];
    logAuctionEvent(currentRoom, 'player_advancing', { nextPlayerId, reason });
    console.log(`[Advance] Next player: ${nextPlayerId} (reason: ${reason})`);
    const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
    io.to(roomCode).emit('player_advancing', { nextPlayerId, nextPlayerIndex: state.auction.currentPlayerIndex });
    
    emitRoomState(roomCode);

    currentRoom.biddingStartTimeout = setTimeout(() => {
      currentRoom.biddingStartTimeout = null;
      try {
        // Validate room still exists at timeout execution time
        const timeoutRoom = rooms.get(roomCode);
        if (!timeoutRoom || timeoutRoom.roomGeneration !== room.roomGeneration) {
          console.log(`[Advance Timeout] Room ${roomCode} is stale. Aborting delayed start.`);
          return;
        }

        if (timeoutRoom.state.auction.isPaused) {
          logAuctionEvent(timeoutRoom, 'bidding_start_deferred_due_pause', { nextPlayerId });
          return;
        }
        const nextPlayer = getPlayerById(nextPlayerId);
        if (!nextPlayer) {
          logAuctionEvent(timeoutRoom, 'advance_missing_next_player', { nextPlayerId });
          advanceToNextPlayer(timeoutRoom, 'missing_next_player_post_delay');
          return;
        }
        timeoutRoom.state.auction.currentBid = normalizeBasePrice(nextPlayer.basePrice);
        timeoutRoom.state.auction.currentSetName = getSetNameForPlayer(nextPlayerId);
        timeoutRoom.state.auction.phase = 'bidding';
        if (timeoutRoom.state.auction.ticks <= 0 || Number.isNaN(timeoutRoom.state.auction.ticks)) {
          timeoutRoom.state.auction.ticks = AUCTION_START_TICKS;
        }
        emitRoomState(roomCode);
        startTimer(timeoutRoom);
        scheduleAiBids(timeoutRoom);
      } catch (innerError) {
        console.error(`[CRITICAL] Error in advanceToNextPlayer delayed start for ${roomCode}:`, innerError);
      }
    }, AUCTION_DELAY_ADVANCE_TO_BIDDING_MS);
  } catch (error) {
    console.error(`[CRITICAL] Error in advanceToNextPlayer for room ${room.state.roomCode}:`, error);
  }
};

const startTimer = (room: Room) => {
  if (room.state.auction.isPaused) return;
  if (room.timerInterval) return;
  if (room.state.auction.isAdvancing) return;
  if (room.state.auction.phase !== 'bidding') return;
  if (room.state.auction.currentPlayerIndex >= room.state.auction.auctionQueue.length) return;

  if (!Number.isFinite(room.state.auction.ticks) || room.state.auction.ticks <= 0) {
    room.state.auction.ticks = AUCTION_START_TICKS;
  }

  const roomCode = room.state.roomCode;
  const capturedGeneration = room.roomGeneration;
  logAuctionEvent(room, 'timer_started');
  
  room.timerInterval = setInterval(() => {
    try {
      // CRITICAL: Verify room still exists and hasn't been recreated
      const currentRoom = rooms.get(roomCode);
      if (!currentRoom || currentRoom.roomGeneration !== capturedGeneration) {
        console.log(`[Timer] Room ${roomCode} is stale (deleted or recreated). Killing interval.`);
        // Clear the original room's interval reference if we somehow have it
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
          room.timerInterval = null;
        }
        return;
      }

      if (currentRoom.state.auction.isPaused || currentRoom.state.auction.phase !== 'bidding') {
        if (currentRoom.timerInterval) clearInterval(currentRoom.timerInterval);
        currentRoom.timerInterval = null;
        logAuctionEvent(currentRoom, 'timer_stopped_non_bidding_or_paused');
        return;
      }

      if (currentRoom.state.auction.currentPlayerIndex >= currentRoom.state.auction.auctionQueue.length) {
        if (currentRoom.timerInterval) clearInterval(currentRoom.timerInterval);
        currentRoom.timerInterval = null;
        const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
        const clientCount = socketsInRoom ? socketsInRoom.size : 0;
        console.log(`[Timer] Queue complete. Emitting auction_complete to ${clientCount} clients in ${roomCode}.`);
        io.to(roomCode).emit('auction_complete', currentRoom.state);
        logAuctionEvent(currentRoom, 'timer_stopped_queue_complete');
        return;
      }

      currentRoom.state.auction.ticks -= 1;
      if (!Number.isFinite(currentRoom.state.auction.ticks)) {
        currentRoom.state.auction.ticks = AUCTION_START_TICKS;
      }
      
      // Emit timer update to all players in room
      const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
      if (socketsInRoom && socketsInRoom.size > 0) {
        io.to(roomCode).emit('timer_update', { ticks: currentRoom.state.auction.ticks, timer: currentRoom.state.auction.ticks / 10 });
      }
      
      if (currentRoom.state.auction.ticks > 0 && currentRoom.state.auction.ticks % 10 === 0) {
        logAuctionEvent(currentRoom, 'timer_tick_second', { ticks: currentRoom.state.auction.ticks });
      }

      if (currentRoom.state.auction.ticks <= 0) {
        if (currentRoom.timerInterval) clearInterval(currentRoom.timerInterval);
        currentRoom.timerInterval = null;
        
        if (currentRoom.state.auction.isAdvancing) {
          logAuctionEvent(currentRoom, 'timer_expired_but_already_advancing');
          return;
        }
        currentRoom.state.auction.isAdvancing = true;
        logAuctionEvent(currentRoom, 'timer_expired_resolving_player');
        resolveCurrentPlayer(currentRoom);
      }
    } catch (tickError) {
      console.error(`[CRITICAL] Timer loop failure for room ${roomCode}:`, tickError);
      // Ensure interval is killed even if error occurred
      const errorRoom = rooms.get(roomCode);
      if (errorRoom && errorRoom.timerInterval) {
        clearInterval(errorRoom.timerInterval);
        errorRoom.timerInterval = null;
      }
    }
  }, AUCTION_TIMER_TICK_MS);
};

io.on('connection', (socket: Socket) => {
  socket.on('create_room', ({ playerName, userId }: { playerName: string, userId: string }) => {
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
      players: [{ socketId: socket.id, userId, name: playerName, teamId: null, isHost: true, isReady: false }],
      teams: initialTeams,
      auction: {
        isStarted: false,
        currentPlayerIndex: 0,
        auctionQueue: [],
        currentBid: 0,
        nextBidAmount: null,
        highestBidderId: null,
        ticks: AUCTION_START_TICKS,
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
      biddingStartTimeout: null,
      aiTimeouts: [],
      deletionTimeout: null,
      roomGeneration: 0
    });

    socket.join(roomCode);
    socket.emit('room_created', { roomCode });
    console.log(`[Room] Created room ${roomCode} for ${playerName} (${userId})`);
    emitRoomState(roomCode);
  });

  socket.on('join_room', ({ roomCode, playerName, userId }: { roomCode: string, playerName: string, userId: string }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      emitRoomUnavailable(socket, roomCode, 'join_room');
      socket.emit('error', { message: 'Room not found' });
      console.log(`[Room] Join failed: room ${roomCode} not found for ${playerName}`);
      return;
    }

    if (room.deletionTimeout) {
      clearTimeout(room.deletionTimeout);
      room.deletionTimeout = null;
    }

    // Clear reconnect timeout if any, using stable user IDs and legacy name fallback.
    const reconnectKey = `${roomCode}_${userId}`;
    const legacyKey = `${roomCode}_${playerName}`;
    [reconnectKey, legacyKey].forEach((key) => {
      const pendingTimeout = reconnectTimeouts.get(key);
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
        reconnectTimeouts.delete(key);
      }
    });

    // Use userId for strong identity. Fallback to name for legacy clients if needed.
    const existingPlayerIndex = room.state.players.findIndex(p => p.userId === userId || (p.userId === undefined && p.name === playerName));
    const isRejoining = existingPlayerIndex !== -1;

    if (!isRejoining && room.state.isLocked) {
      socket.emit('error', { message: 'Room is locked' });
      console.log(`[Room] Join blocked: room ${roomCode} is locked for ${playerName}`);
      return;
    }
    if (!isRejoining && room.state.players.filter(p => p.socketId !== '').length >= 10) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    if (isRejoining) {
      const oldPlayer = room.state.players[existingPlayerIndex];
      console.log(`[Room] Player ${playerName} rejoining room ${roomCode} (was offline)`);
      oldPlayer.socketId = socket.id;
      if (oldPlayer.teamId) {
        room.state.teams[oldPlayer.teamId].ownerId = socket.id;
        room.state.teams[oldPlayer.teamId].ownerName = oldPlayer.name;
      }
      if (oldPlayer.isHost) {
        room.state.hostId = socket.id;
        console.log(`[Room] Host ${playerName} reconnected to room ${roomCode}`);
      }
    } else {
      console.log(`[Room] New player ${playerName} joined room ${roomCode}`);
      room.state.players.push({ socketId: socket.id, userId, name: playerName, teamId: null, isHost: room.state.players.length === 0, isReady: false });
      if (room.state.players.length === 1) {
        room.state.hostId = socket.id;
      }
    }

    socket.join(roomCode);
    socket.emit('room_joined', { roomCode });
    emitRoomState(roomCode);
  });

  socket.on('select_team', ({ roomCode, teamId }: { roomCode: string, teamId: TeamId }) => {
    const room = getRoomOrNotify(socket, roomCode, 'select_team');
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
    const room = getRoomOrNotify(socket, roomCode, 'start_auction');
    if (!room) {
      console.error(`[Auction] Start failed: room ${roomCode} not found`);
      return;
    }
    
    if (room.state.hostId !== socket.id) {
      console.warn(`[Auction] Start rejected: ${socket.id} is not host (host is ${room.state.hostId}) in room ${roomCode}`);
      socket.emit('error', { message: 'Only host can start auction' });
      return;
    }
    
    // Check that every player both selected a team and is ready.
    if (!room.state.players.every(p => p.isReady && p.teamId !== null)) {
      console.warn(`[Auction] Start rejected: not all players ready in room ${roomCode}`);
      socket.emit('error', { message: 'All managers must select a team before starting the auction.' });
      return;
    }

    clearAllTimers(room);
    room.state.isLocked = true;

    const auctionQueue = createAuctionQueue();
    room.state.auction = {
      isStarted: true,
      currentPlayerIndex: 0,
      auctionQueue,
      currentBid: 0,
      nextBidAmount: null,
      highestBidderId: null,
      ticks: AUCTION_START_TICKS,
      phase: 'waiting',
      passedTeams: [],
      isAdvancing: false,
      currentSetName: '',
      isPaused: false
    };
    
    const firstPlayerId = room.state.auction.auctionQueue[0];
    const firstPlayer = getPlayerById(firstPlayerId);
    if (firstPlayer) {
      room.state.auction.currentBid = normalizeBasePrice(firstPlayer.basePrice);
    }
    room.state.auction.currentSetName = getSetNameForPlayer(firstPlayerId);
    room.state.auction.phase = 'bidding';
    logAuctionEvent(room, 'auction_started');
    console.log(`[Auction] Started in room ${roomCode}. Queue length: ${auctionQueue.length}, First player: ${firstPlayerId}`);
    
    emitRoomState(roomCode);
    startTimer(room);
    scheduleAiBids(room);
  });

  socket.on('place_bid', ({ roomCode }: { roomCode: string }) => {
    const room = getRoomOrNotify(socket, roomCode, 'place_bid');
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
    const room = getRoomOrNotify(socket, roomCode, 'pass_bid');
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
    const room = getRoomOrNotify(socket, roomCode, 'reset_room');
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
      ticks: AUCTION_START_TICKS,
      phase: 'waiting',
      passedTeams: [],
      isAdvancing: false,
      currentSetName: '',
      isPaused: false
    };
    room.state.isLocked = false;
    
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
    const room = getRoomOrNotify(socket, roomCode, 'send_chat');
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
    const room = getRoomOrNotify(socket, roomCode, 'toggle_pause');
    if (!room) {
      console.error(`[Pause] Toggle failed: room ${roomCode} not found`);
      return;
    }
    
    if (room.state.hostId !== socket.id) {
      console.warn(`[Pause] Toggle rejected: ${socket.id} is not host (host is ${room.state.hostId}) in room ${roomCode}`);
      socket.emit('error', { message: 'Only host can pause/resume' });
      return;
    }

    const currentPaused = room.state.auction.isPaused;
    room.state.auction.isPaused = !currentPaused;

    if (room.state.auction.isPaused) {
      // Pause: clear all active timers/timeouts
      clearAllTimers(room);
      logAuctionEvent(room, 'auction_paused');
      console.log(`[Pause] Auction paused in room ${roomCode}`);
    } else {
      // Resume: restart timers based on the current phase
      const phase = room.state.auction.phase;
      console.log(`[Pause] Resuming auction in room ${roomCode}, phase: ${phase}`);
      if (phase === 'bidding') {
        startTimer(room);
        scheduleAiBids(room);
      } else if (phase === 'sold' || phase === 'unsold') {
        scheduleAutoAdvance(room, AUCTION_DELAY_RESOLVE_TO_NEXT_MS, 'resume_from_result_phase');
      } else if (phase === 'advancing') {
        scheduleAutoAdvance(room, AUCTION_DELAY_ADVANCE_TO_BIDDING_MS, 'resume_from_advancing_phase');
      }
      logAuctionEvent(room, 'auction_resumed', { phase });
    }

    emitRoomState(roomCode);
  });

  socket.on('end_auction', ({ roomCode }: { roomCode: string }) => {
    const room = getRoomOrNotify(socket, roomCode, 'end_auction');
    if (!room || room.state.hostId !== socket.id) return;

    clearAllTimers(room);
    room.state.auction.currentPlayerIndex = room.state.auction.auctionQueue.length;
    room.state.auction.phase = 'waiting'; // Skip to results
    io.to(roomCode).emit('auction_complete', room.state);
    emitRoomState(roomCode);
  });

  const handleLeaveRoom = (socketId: string, isDisconnect: boolean = false) => {
    rooms.forEach((room, roomCode) => {
      const playerIndex = room.state.players.findIndex(p => p.socketId === socketId);
      if (playerIndex !== -1) {
        const player = room.state.players[playerIndex];

        if (isDisconnect) {
          // 1. Mark socket as empty
          player.socketId = '';
          if (player.teamId && !room.state.isLocked) {
            room.state.teams[player.teamId].ownerId = null;
            room.state.teams[player.teamId].ownerName = null;
          }

          // Emit immediately so other players see they went offline
          emitRoomState(roomCode);

          // 2. Set up the reconnect grace period (120 seconds)
          const key = getReconnectKey(roomCode, player);
          
          // Clear any existing timeout for this player
          const oldTimeout = reconnectTimeouts.get(key);
          if (oldTimeout) clearTimeout(oldTimeout);

          const timeout = setTimeout(() => {
            reconnectTimeouts.delete(key);

            // Fetch the room and player again, in case the room was deleted or player state changed
            const currentRoom = rooms.get(roomCode);
            if (!currentRoom) return;

            const currentPlayerIndex = currentRoom.state.players.findIndex(p => p.userId === player.userId || p.name === player.name);
            if (currentPlayerIndex === -1) return;

            const currentPlayer = currentRoom.state.players[currentPlayerIndex];
            if (currentPlayer.socketId !== '') {
              // They reconnected, do nothing!
              return;
            }

            // They did not reconnect in time. Handle actual leave!
            const activePlayers = currentRoom.state.players.filter(p => p.socketId !== '');

            // Handle Host Transfer if they were the host AND room is NOT locked
            // If room is locked, we want to preserve host privileges even if they are offline.
            if (currentPlayer.isHost && !currentRoom.state.isLocked) {
              currentPlayer.isHost = false;
              if (activePlayers.length > 0) {
                const nextHost = activePlayers[0];
                nextHost.isHost = true;
                currentRoom.state.hostId = nextHost.socketId;
              }
            }

            // Cleanup player if room is NOT locked
            if (!currentRoom.state.isLocked) {
              if (currentPlayer.teamId) {
                currentRoom.state.teams[currentPlayer.teamId].ownerId = null;
                currentRoom.state.teams[currentPlayer.teamId].ownerName = null;
              }
              currentRoom.state.players.splice(currentPlayerIndex, 1);
            }

            // Handle room deletion if no active players are left
            const remainingActive = currentRoom.state.players.filter(p => p.socketId !== '');
            if (remainingActive.length === 0) {
              if (currentRoom.deletionTimeout) clearTimeout(currentRoom.deletionTimeout);
              // Wait 60 minutes instead of 60 seconds before destroying room
              currentRoom.deletionTimeout = setTimeout(() => {
                const checkRoom = rooms.get(roomCode);
                if (checkRoom && checkRoom.state.players.every(p => p.socketId === '')) {
                  console.log(`[Room Lifecycle] Deleting room ${roomCode} due to inactivity. Invalidating ${rooms.size} active rooms if any matched.`);
                  clearAllTimers(checkRoom);
                  // Increment generation number before deletion to invalidate all stale references
                  checkRoom.roomGeneration++;
                  rooms.delete(roomCode);
                  console.log(`[Room Lifecycle] Room ${roomCode} deleted (generation was ${checkRoom.roomGeneration - 1}).`);
                }
              }, 3600000);
            }

            emitRoomState(roomCode);
          }, 120000); // 120 seconds grace period

          reconnectTimeouts.set(key, timeout);
          return;
        }

      if (!isDisconnect && room.state.isLocked) {
        // Treat explicit room leave during a live auction as a temporary disconnect.
        const clientSocket = io.sockets.sockets.get(socketId);
        if (clientSocket) {
          clientSocket.leave(roomCode);
        }
        handleLeaveRoom(socketId, true);
        return;
      }

      // --- Explicit Leave Room (socket.emit('leave_room')) ---
      // Cancel any pending reconnect timeout
      const explicitKey = getReconnectKey(roomCode, player);
      const legacyExplicitKey = `${roomCode}_${player.name}`;
      [explicitKey, legacyExplicitKey].forEach((key) => {
        const pending = reconnectTimeouts.get(key);
        if (pending) {
          clearTimeout(pending);
          reconnectTimeouts.delete(key);
        }
      });

      if (player.teamId) {
        room.state.teams[player.teamId].ownerId = null;
        room.state.teams[player.teamId].ownerName = null;
      }
      room.state.players.splice(playerIndex, 1);
      
      const clientSocket = io.sockets.sockets.get(socketId);
      if (clientSocket) {
        clientSocket.leave(roomCode);
      }

      const activePlayers = room.state.players.filter(p => p.socketId !== '');
      if (activePlayers.length === 0) {
        clearAllTimers(room);
        // Increment generation number before deletion to invalidate all stale references
        room.roomGeneration++;
        rooms.delete(roomCode);
        console.log(`[Room] Room ${roomCode} deleted immediately (no active players). Generation: ${room.roomGeneration - 1}`);
      } else if (player.isHost) {
        const nextHost = activePlayers[0];
        nextHost.isHost = true;
        room.state.hostId = nextHost.socketId;
        console.log(`[Room] Host left room ${roomCode}, new host is ${nextHost.name}`);
        emitRoomState(roomCode);
      } else {
        console.log(`[Room] Player ${player.name} left room ${roomCode}`);
        emitRoomState(roomCode);
      }
      }
    });
  };

  socket.on('leave_room', () => {
    handleLeaveRoom(socket.id, false);
  });

  socket.on('kick_player', ({ roomCode, targetSocketId }: { roomCode: string, targetSocketId: string }) => {
    const room = getRoomOrNotify(socket, roomCode, 'kick_player');
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
    handleLeaveRoom(socket.id, true);
  });

  socket.on('request_room_state', ({ roomCode }: { roomCode: string }) => {
    const room = getRoomOrNotify(socket, roomCode, 'request_room_state');
    if (!room) return;
    socket.join(roomCode);
    emitRoomState(roomCode);
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3005;

// Global error handlers to catch uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[CRITICAL] Uncaught Exception - Server continuing:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection:', reason);
  console.error('Promise:', promise);
});

async function startServer() {
  console.log('Initializing automatic IPL player image resolution system...');
  await resolveAllPlayerImages(PLAYERS);

  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`[Server] Active room supervision enabled with stale reference detection`);
    console.log(`[Server] Global error handlers active for uncaughtException and unhandledRejection`);
  });
}

startServer();
