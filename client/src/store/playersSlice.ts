import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Player } from '../types';

/**
 * PlayersSlice - Normalized player database
 */

export interface PlayersState {
  // All players indexed by ID
  byId: Record<string, Player>;

  // Array of player IDs for ordering
  allIds: string[];

  // Loading and error state
  loading: boolean;
  error: string | null;
}

const initialState: PlayersState = {
  byId: {},
  allIds: [],
  loading: false,
  error: null,
};

export const playersSlice = createSlice({
  name: 'players',
  initialState,
  reducers: {
    /**
     * Set all players (from server fetch)
     */
    setPlayers: (state, action: PayloadAction<Player[]>) => {
      state.byId = {};
      state.allIds = [];

      for (const player of action.payload) {
        state.byId[player.id] = player;
        state.allIds.push(player.id);
      }

      state.loading = false;
      state.error = null;
    },

    /**
     * Add single player
     */
    addPlayer: (state, action: PayloadAction<Player>) => {
      const playerId = action.payload.id;
      if (!state.byId[playerId]) {
        state.allIds.push(playerId);
      }
      state.byId[playerId] = action.payload;
    },

    /**
     * Update single player
     */
    updatePlayer: (state, action: PayloadAction<Partial<Player> & { id: string }>) => {
      const playerId = action.payload.id;
      if (state.byId[playerId]) {
        state.byId[playerId] = {
          ...state.byId[playerId],
          ...action.payload,
        };
      }
    },

    /**
     * Remove player by ID
     */
    removePlayer: (state, action: PayloadAction<string>) => {
      const playerId = action.payload;
      delete state.byId[playerId];
      state.allIds = state.allIds.filter((id) => id !== playerId);
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setPlayers, addPlayer, updatePlayer, removePlayer, setLoading, setError } =
  playersSlice.actions;

export default playersSlice.reducer;
