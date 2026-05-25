import { configureStore } from '@reduxjs/toolkit';
import auctionReducer from './auctionSlice';
import playersReducer from './playersSlice';

/**
 * Redux Store Configuration
 * Centralized state management for the entire application
 */

export const store = configureStore({
  reducer: {
    auction: auctionReducer,
    players: playersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore timestamp fields that aren't serializable
        ignoredActions: ['auction/updateRoomState', 'auction/createRoom'],
        ignoredPaths: ['auction.rooms'],
      },
    }),
  devTools: process.env.NODE_ENV === 'development',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
