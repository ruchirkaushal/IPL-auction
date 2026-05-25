import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RoomState, TeamState, TeamId, Player, AuctionState, ChatMessage } from '../types';

/**
 * AuctionSlice - Normalized auction and room state
 * Replaces deeply nested state with flat, indexed structure
 */

export interface AuctionStateSlice {
  // Normalized rooms - indexed by roomCode
  rooms: Record<string, RoomState>;

  // Current room the user is viewing
  currentRoomCode: string | null;

  // UI state
  loading: boolean;
  error: string | null;
  lastAction: string | null;
}

const initialState: AuctionStateSlice = {
  rooms: {},
  currentRoomCode: null,
  loading: false,
  error: null,
  lastAction: null,
};

export const auctionSlice = createSlice({
  name: 'auction',
  initialState,
  reducers: {
    // =========================================================================
    // ROOM OPERATIONS
    // =========================================================================

    /**
     * Set current room (user joined a room)
     */
    setCurrentRoom: (state, action: PayloadAction<string | null>) => {
      state.currentRoomCode = action.payload;
    },

    /**
     * Update entire room state (from server broadcast)
     * Only triggers rerenders for this specific room
     */
    updateRoomState: (state, action: PayloadAction<RoomState>) => {
      const roomCode = action.payload.roomCode;
      state.rooms[roomCode] = action.payload;
      state.lastAction = `room_state_${roomCode}`;
    },

    /**
     * Create new room locally
     */
    createRoom: (state, action: PayloadAction<RoomState>) => {
      state.rooms[action.payload.roomCode] = action.payload;
      state.currentRoomCode = action.payload.roomCode;
    },

    /**
     * Delete room (after leaving or auction complete)
     */
    deleteRoom: (state, action: PayloadAction<string>) => {
      delete state.rooms[action.payload];
      if (state.currentRoomCode === action.payload) {
        state.currentRoomCode = null;
      }
    },

    // =========================================================================
    // GRANULAR UPDATES (Only affected component rerenders)
    // =========================================================================

    /**
     * Update auction state only (not teams, not players)
     * Prevents rerenders of team/player components
     */
    updateAuction: (
      state,
      action: PayloadAction<{
        roomCode: string;
        auction: Partial<AuctionState>;
      }>
    ) => {
      const room = state.rooms[action.payload.roomCode];
      if (room) {
        room.auction = {
          ...room.auction,
          ...action.payload.auction,
        };
        state.lastAction = `auction_${action.payload.roomCode}`;
      }
    },

    /**
     * Update timer ticks only
     * Prevents rerenders of everything except timer display
     */
    updateTimerTicks: (
      state,
      action: PayloadAction<{
        roomCode: string;
        ticks: number;
      }>
    ) => {
      const room = state.rooms[action.payload.roomCode];
      if (room) {
        room.auction.ticks = action.payload.ticks;
        state.lastAction = `timer_tick_${action.payload.roomCode}`;
      }
    },

    /**
     * Update single team only
     * Other teams and auction state not affected
     */
    updateTeam: (
      state,
      action: PayloadAction<{
        roomCode: string;
        teamId: TeamId;
        team: Partial<TeamState>;
      }>
    ) => {
      const room = state.rooms[action.payload.roomCode];
      if (room && room.teams[action.payload.teamId]) {
        room.teams[action.payload.teamId] = {
          ...room.teams[action.payload.teamId],
          ...action.payload.team,
        };
        state.lastAction = `team_${action.payload.teamId}_${action.payload.roomCode}`;
      }
    },

    /**
     * Update multiple teams at once
     */
    updateTeams: (
      state,
      action: PayloadAction<{
        roomCode: string;
        teams: Record<TeamId, Partial<TeamState>>;
      }>
    ) => {
      const room = state.rooms[action.payload.roomCode];
      if (room) {
        for (const [teamId, updates] of Object.entries(action.payload.teams)) {
          if (room.teams[teamId as TeamId]) {
            room.teams[teamId as TeamId] = {
              ...room.teams[teamId as TeamId],
              ...updates,
            };
          }
        }
        state.lastAction = `teams_${action.payload.roomCode}`;
      }
    },

    /**
     * Update chat messages
     * Isolated from auction state
     */
    updateChat: (
      state,
      action: PayloadAction<{
        roomCode: string;
        messages: ChatMessage[];
      }>
    ) => {
      const room = state.rooms[action.payload.roomCode];
      if (room) {
        room.chat = action.payload.messages;
        state.lastAction = `chat_${action.payload.roomCode}`;
      }
    },

    /**
     * Add single chat message
     */
    addChatMessage: (
      state,
      action: PayloadAction<{
        roomCode: string;
        message: ChatMessage;
      }>
    ) => {
      const room = state.rooms[action.payload.roomCode];
      if (room) {
        room.chat.push(action.payload.message);
        // Keep only last 100 messages
        if (room.chat.length > 100) {
          room.chat = room.chat.slice(-100);
        }
        state.lastAction = `chat_add_${action.payload.roomCode}`;
      }
    },

    /**
     * Update room lock status
     */
    setRoomLocked: (
      state,
      action: PayloadAction<{
        roomCode: string;
        isLocked: boolean;
      }>
    ) => {
      const room = state.rooms[action.payload.roomCode];
      if (room) {
        room.isLocked = action.payload.isLocked;
      }
    },

    // =========================================================================
    // UI STATE
    // =========================================================================

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.lastAction = `error_${action.payload}`;
      }
    },

    clearError: (state) => {
      state.error = null;
    },
  },
});

// Export actions
export const {
  setCurrentRoom,
  updateRoomState,
  createRoom,
  deleteRoom,
  updateAuction,
  updateTimerTicks,
  updateTeam,
  updateTeams,
  updateChat,
  addChatMessage,
  setRoomLocked,
  setLoading,
  setError,
  clearError,
} = auctionSlice.actions;

// Export reducer
export default auctionSlice.reducer;
