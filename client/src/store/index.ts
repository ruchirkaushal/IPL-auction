import { configureStore } from '@reduxjs/toolkit';
import auctionReducer from './auctionSlice';
import playersReducer from './playersSlice';

export const store = configureStore({
  reducer: {
    auction: auctionReducer,
    players: playersReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
