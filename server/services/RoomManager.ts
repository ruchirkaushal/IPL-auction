/**
 * RoomManager.ts
 * Owns the rooms Map, reconnect grace-period timeouts,
 * and all room-lifecycle helpers (create, emit, stale-check, cleanup).
 */

import { Server, Socket } from 'socket.io';
import {
  Room, RoomState, TeamState, RoomPlayer, AuctionState
} from '../types';
import {
  ALL_TEAM_IDS, AUCTION_START_TICKS, SOCKET_RECOVERY_WINDOW_MS
} from '../constants';
import { INITIAL_PURSE_LAKHS } from '../../shared/auctionConfig';
import { normalizeBasePrice } from '../../shared/auctionPricing';
import { getPlayerById, getSetNameForPlayer } from '../utils';
import {
  recordLifecycle, registerInterval, unregisterInterval,
  logAuctionEvent, getCurrentPlayerId
} from './Telemetry';

// ---------------------------------------------------------------------------
// Shared state — exported so AuctionEngine can reference them
// ---------------------------------------------------------------------------

export const rooms = new Map<string, Room>();
export const reconnectTimeouts = new Map<string, NodeJS.Timeout>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export const getReconnectKey = (roomCode: string, player: { userId?: string; name: string }) =>
  `${roomCode}_${player.userId ?? player.name}`;

export const isRoomStale = (room: Room, roomCode: string): boolean => {
  const currentRoom = rooms.get(roomCode);
  if (!currentRoom) return true;
  if (currentRoom.roomGeneration !== room.roomGeneration) return true;
  return false;
};

export const emitRoomUnavailable = (socket: Socket, roomCode: string, source: string) => {
  console.warn(`[Room Missing] source=${source} room=${roomCode} socket=${socket.id}`);
  socket.emit('room_unavailable', {
    roomCode,
    source,
    message: 'Room not found on server. It may have restarted or expired.',
  });
};

export const getRoomOrNotify = (socket: Socket, roomCode: string, source: string): Room | null => {
  const room = rooms.get(roomCode);
  if (!room) {
    emitRoomUnavailable(socket, roomCode, source);
    return null;
  }
  return room;
};

// ---------------------------------------------------------------------------
// Timer cleanup
// ---------------------------------------------------------------------------

export const clearAllTimers = (room: Room) => {
  if (room.timerInterval) clearInterval(room.timerInterval);
  if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
  if (room.biddingStartTimeout) clearTimeout(room.biddingStartTimeout);
  room.aiTimeouts.forEach(clearTimeout);
  room.timerInterval = null;
  room.autoAdvanceTimeout = null;
  room.biddingStartTimeout = null;
  room.aiTimeouts = [];
  unregisterInterval(room, 'timerInterval');
  unregisterInterval(room, 'autoAdvanceTimeout');
  unregisterInterval(room, 'biddingStartTimeout');
  unregisterInterval(room, 'aiTimeouts');
};

// ---------------------------------------------------------------------------
// Emit room state
// ---------------------------------------------------------------------------

export const syncAuctionDerivedState = (state: RoomState, getAuthoritativeNextBid: (state: RoomState) => number | null) => {
  state.auction.nextBidAmount = getAuthoritativeNextBid(state);
};

let _io: Server;

export const initRoomManager = (io: Server) => { _io = io; };

export const emitRoomState = (roomCode: string, getAuthoritativeNextBid: (state: RoomState) => number | null) => {
  try {
    const room = rooms.get(roomCode);
    if (!room) {
      console.warn(`[Socket Emission] Room ${roomCode} not found - emission skipped`);
      return;
    }
    syncAuctionDerivedState(room.state, getAuthoritativeNextBid);
    const socketsInRoom = _io.sockets.adapter.rooms.get(roomCode);
    const clientCount = socketsInRoom ? socketsInRoom.size : 0;
    _io.to(roomCode).emit('room_state_update', room.state);
    logAuctionEvent(room, 'room_state_emitted', { clientCount });
  } catch (error) {
    console.error(`[DIAGNOSTICS: ERROR] [CRITICAL] Error emitting room state for ${roomCode}:`, error);
  }
};

// ---------------------------------------------------------------------------
// Room creation factory
// ---------------------------------------------------------------------------

export const makeInitialRoomState = (roomCode: string, hostSocketId: string, hostUserId: string, hostName: string): RoomState => {
  const initialTeams = {} as Record<typeof ALL_TEAM_IDS[number], TeamState>;
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
};

export const makeRoom = (state: RoomState): Room => ({
  state,
  timerInterval: null,
  autoAdvanceTimeout: null,
  biddingStartTimeout: null,
  aiTimeouts: [],
  roomGeneration: Date.now(),
  lifecycleTimeline: [],
  intervalRegistry: {}
});

// ---------------------------------------------------------------------------
// Freeze Watchdog
// ---------------------------------------------------------------------------

const lastObservedTicks = new Map<string, { ticks: number, timestamp: number }>();

export const startFreezeWatchdog = () => {
  setInterval(() => {
    try {
      rooms.forEach((room, roomCode) => {
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
            } else {
              lastObservedTicks.set(roomCode, { ticks: state.ticks, timestamp: Date.now() });
            }
          } else {
            lastObservedTicks.set(roomCode, { ticks: state.ticks, timestamp: Date.now() });
          }
        } else {
          lastObservedTicks.delete(roomCode);
        }
      });
    } catch (err) {
      console.error(`[DIAGNOSTICS: ERROR] Watchdog failure:`, err);
    }
  }, 5000);
};

// ---------------------------------------------------------------------------
// handleLeaveRoom
// ---------------------------------------------------------------------------

export const makeHandleLeaveRoom = (
  io: Server,
  emitState: (roomCode: string) => void
) => {
  const handleLeaveRoom = (socketId: string, isDisconnect: boolean = false) => {
    try {
      rooms.forEach((room, roomCode) => {
        const playerIndex = room.state.players.findIndex(p => p.socketId === socketId);
        if (playerIndex === -1) return;

        const player = room.state.players[playerIndex];

        if (isDisconnect) {
          player.socketId = '';
          emitState(roomCode);

          const key = getReconnectKey(roomCode, player);
          const oldTimeout = reconnectTimeouts.get(key);
          if (oldTimeout) clearTimeout(oldTimeout);

          const timeout = setTimeout(() => {
            reconnectTimeouts.delete(key);

            const currentRoom = rooms.get(roomCode);
            if (!currentRoom) return;

            const currentPlayerIndex = currentRoom.state.players.findIndex(
              p => p.userId === player.userId || p.name === player.name
            );
            if (currentPlayerIndex === -1) return;

            const currentPlayer = currentRoom.state.players[currentPlayerIndex];
            if (currentPlayer.socketId !== '') return; // Reconnected already

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
              if (currentRoom.deletionTimeout) clearTimeout(currentRoom.deletionTimeout);
              currentRoom.deletionTimeout = setTimeout(() => {
                const checkRoom = rooms.get(roomCode);
                if (checkRoom && checkRoom.state.players.every(p => p.socketId === '')) {
                  console.log(`[Room Lifecycle] Deleting room ${roomCode} due to inactivity.`);
                  clearAllTimers(checkRoom);
                  checkRoom.roomGeneration++;
                  console.error(`[DIAGNOSTICS: ROOM DESTRUCTION] Trigger: Empty player cleanup timeout`, { roomCode, phase: checkRoom.state.auction.phase });
                  rooms.delete(roomCode);
                  recordLifecycle(checkRoom, 'room_deleted_timeout');
                }
              }, 3600000);
            }

            emitState(roomCode);
          }, 300000); // 5-min grace period

          reconnectTimeouts.set(key, timeout);
          return;
        }

        // Explicit leave during locked (live) auction → treat as disconnect
        if (!isDisconnect && room.state.isLocked) {
          const clientSocket = io.sockets.sockets.get(socketId);
          if (clientSocket) clientSocket.leave(roomCode);
          handleLeaveRoom(socketId, true);
          return;
        }

        // Explicit leave (lobby)
        const explicitKey = getReconnectKey(roomCode, player);
        const legacyExplicitKey = `${roomCode}_${player.name}`;
        [explicitKey, legacyExplicitKey].forEach(key => {
          const pending = reconnectTimeouts.get(key);
          if (pending) { clearTimeout(pending); reconnectTimeouts.delete(key); }
        });

        if (player.teamId) {
          room.state.teams[player.teamId].ownerId = null;
          room.state.teams[player.teamId].ownerName = null;
        }
        room.state.players.splice(playerIndex, 1);

        const clientSocket = io.sockets.sockets.get(socketId);
        if (clientSocket) clientSocket.leave(roomCode);

        const activePlayers = room.state.players.filter(p => p.socketId !== '');
        if (room.state.players.length === 0) {
          clearAllTimers(room);
          room.roomGeneration++;
          console.error(`[DIAGNOSTICS: ROOM DESTRUCTION] Trigger: Immediate explicit leave`, { roomCode, phase: room.state.auction.phase });
          rooms.delete(roomCode);
          recordLifecycle(room, 'room_deleted_immediate');
        } else if (activePlayers.length === 0) {
          if (room.deletionTimeout) clearTimeout(room.deletionTimeout);
          room.deletionTimeout = setTimeout(() => {
            const checkRoom = rooms.get(roomCode);
            if (checkRoom && checkRoom.state.players.every(p => p.socketId === '')) {
              clearAllTimers(checkRoom);
              checkRoom.roomGeneration++;
              console.error(`[DIAGNOSTICS: ROOM DESTRUCTION] Trigger: Explicit leave timeout`, { roomCode, phase: checkRoom.state.auction.phase });
              rooms.delete(roomCode);
              recordLifecycle(checkRoom, 'room_deleted_timeout');
            }
          }, 3600000);
        } else if (player.isHost) {
          const nextHost = activePlayers[0];
          nextHost.isHost = true;
          room.state.hostId = nextHost.socketId;
          console.log(`[Room] Host left room ${roomCode}, new host is ${nextHost.name}`);
          emitState(roomCode);
        } else {
          console.log(`[Room] Player ${player.name} left room ${roomCode}`);
          emitState(roomCode);
        }
      });
    } catch (err) {
      console.error(`[DIAGNOSTICS: ERROR] handleLeaveRoom failed:`, err);
    }
  };

  return handleLeaveRoom;
};
