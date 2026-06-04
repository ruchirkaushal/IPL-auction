import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  RoomState,
  TeamId,
  BidPlacedPayload,
  BidRejectedPayload,
  PlayerSoldPayload,
  PlayerUnsoldPayload,
  PlayerAdvancingPayload,
} from '../types';

export interface AuctionSliceState {
  roomState: RoomState | null;
  myTeamId: TeamId | null;
  lastBid: BidPlacedPayload | null;
  lastBidRejected: BidRejectedPayload | null;
  lastSold: PlayerSoldPayload | null;
  lastUnsold: PlayerUnsoldPayload | null;
  lastAdvancing: PlayerAdvancingPayload | null;
  isConnected: boolean;
  socketError: string | null;
  timerTicks: number | null;
}

const initialState: AuctionSliceState = {
  roomState: null,
  myTeamId: null,
  lastBid: null,
  lastBidRejected: null,
  lastSold: null,
  lastUnsold: null,
  lastAdvancing: null,
  isConnected: false,
  socketError: null,
  timerTicks: null,
};

export const auctionSlice = createSlice({
  name: 'auction',
  initialState,
  reducers: {
    setRoomState(state, action: PayloadAction<RoomState | null>) {
      state.roomState = action.payload;
    },
    setMyTeamId(state, action: PayloadAction<TeamId | null>) {
      state.myTeamId = action.payload;
    },
    setLastBid(state, action: PayloadAction<BidPlacedPayload | null>) {
      state.lastBid = action.payload;
    },
    setLastBidRejected(state, action: PayloadAction<BidRejectedPayload | null>) {
      state.lastBidRejected = action.payload;
    },
    setLastSold(state, action: PayloadAction<PlayerSoldPayload | null>) {
      state.lastSold = action.payload;
    },
    setLastUnsold(state, action: PayloadAction<PlayerUnsoldPayload | null>) {
      state.lastUnsold = action.payload;
    },
    setLastAdvancing(state, action: PayloadAction<PlayerAdvancingPayload | null>) {
      state.lastAdvancing = action.payload;
    },
    setSocketConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
    setSocketError(state, action: PayloadAction<string | null>) {
      state.socketError = action.payload;
    },
    setTimerTicks(state, action: PayloadAction<number>) {
      state.timerTicks = action.payload;
      if (state.roomState) {
        state.roomState.auction.ticks = action.payload;
      }
    },
    clearTransientRoomState(state) {
      state.myTeamId = null;
      state.lastBid = null;
      state.lastBidRejected = null;
      state.lastSold = null;
      state.lastUnsold = null;
      state.lastAdvancing = null;
      state.timerTicks = null;
    },
    resetRoomState(state) {
      state.roomState = null;
      state.myTeamId = null;
      state.lastBid = null;
      state.lastBidRejected = null;
      state.lastSold = null;
      state.lastUnsold = null;
      state.lastAdvancing = null;
      state.isConnected = false;
      state.socketError = null;
      state.timerTicks = null;
    },
  },
});

export const auctionActions = auctionSlice.actions;
export default auctionSlice.reducer;
