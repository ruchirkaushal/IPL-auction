import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Player } from '../types';

interface PlayersState {
  allPlayers: Player[];
}

const initialState: PlayersState = {
  allPlayers: [],
};

export const playersSlice = createSlice({
  name: 'players',
  initialState,
  reducers: {
    setAllPlayers(state, action: PayloadAction<Player[]>) {
      state.allPlayers = action.payload;
    },
  },
});

export const playersActions = playersSlice.actions;
export default playersSlice.reducer;
