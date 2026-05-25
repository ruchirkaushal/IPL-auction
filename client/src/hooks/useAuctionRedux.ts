import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  updateRoomState,
  updateAuction,
  updateTimerTicks,
  updateTeam,
  updateTeams,
  addChatMessage,
  setError,
  clearError,
} from '../store/auctionSlice';
import { setPlayers } from '../store/playersSlice';
import type { RoomState, TeamId, TeamState, ChatMessage, Player, AuctionState } from '../types';

/**
 * useAuctionDispatch - Hook for dispatching auction-related actions
 * Provides type-safe, memoized dispatch functions
 */
export const useAuctionDispatch = () => {
  const dispatch = useDispatch<AppDispatch>();

  return {
    /**
     * Update entire room state
     */
    updateRoomState: useCallback(
      (state: RoomState) => dispatch(updateRoomState(state)),
      [dispatch]
    ),

    /**
     * Update auction state only (timer, phase, queue progress)
     */
    updateAuction: useCallback(
      (roomCode: string, auction: Partial<AuctionState>) =>
        dispatch(updateAuction({ roomCode, auction })),
      [dispatch]
    ),

    /**
     * Update timer ticks only
     * Fastest path for timer updates
     */
    updateTimerTicks: useCallback(
      (roomCode: string, ticks: number) =>
        dispatch(updateTimerTicks({ roomCode, ticks })),
      [dispatch]
    ),

    /**
     * Update single team
     */
    updateTeam: useCallback(
      (roomCode: string, teamId: TeamId, team: Partial<TeamState>) =>
        dispatch(updateTeam({ roomCode, teamId, team })),
      [dispatch]
    ),

    /**
     * Update multiple teams at once
     */
    updateTeams: useCallback(
      (roomCode: string, teams: Record<TeamId, Partial<TeamState>>) =>
        dispatch(updateTeams({ roomCode, teams })),
      [dispatch]
    ),

    /**
     * Add chat message
     */
    addChatMessage: useCallback(
      (roomCode: string, message: ChatMessage) =>
        dispatch(addChatMessage({ roomCode, message })),
      [dispatch]
    ),

    /**
     * Set all players
     */
    setPlayers: useCallback((players: Player[]) => dispatch(setPlayers(players)), [dispatch]),

    /**
     * Set error message
     */
    setError: useCallback(
      (error: string | null) => dispatch(setError(error)),
      [dispatch]
    ),

    /**
     * Clear error message
     */
    clearError: useCallback(() => dispatch(clearError()), [dispatch]),
  };
};

/**
 * useAuctionSelectors - Hook for selecting auction data
 */
export const useAuctionSelectors = () => {
  return {
    /**
     * Get current room code
     */
    useCurrentRoomCode: () => useSelector((state: RootState) => state.auction.currentRoomCode),

    /**
     * Get current room state
     */
    useCurrentRoom: () => {
      const roomCode = useSelector((state: RootState) => state.auction.currentRoomCode);
      return useSelector((state: RootState) =>
        roomCode ? state.auction.rooms[roomCode] : null
      );
    },

    /**
     * Get room by code
     */
    useRoomByCode: (roomCode: string | null) =>
      useSelector((state: RootState) =>
        roomCode ? state.auction.rooms[roomCode] : null
      ),

    /**
     * Get auction state for current room
     */
    useCurrentAuctionState: () =>
      useSelector((state: RootState) => {
        const roomCode = state.auction.currentRoomCode;
        return roomCode ? state.auction.rooms[roomCode]?.auction : null;
      }),

    /**
     * Get teams for current room
     */
    useCurrentTeams: () =>
      useSelector((state: RootState) => {
        const roomCode = state.auction.currentRoomCode;
        return roomCode ? state.auction.rooms[roomCode]?.teams : null;
      }),

    /**
     * Get single team
     */
    useTeam: (roomCode: string | null, teamId: TeamId) =>
      useSelector((state: RootState) =>
        roomCode ? state.auction.rooms[roomCode]?.teams[teamId] : null
      ),

    /**
     * Get chat for current room
     */
    useCurrentChat: () =>
      useSelector((state: RootState) => {
        const roomCode = state.auction.currentRoomCode;
        return roomCode ? state.auction.rooms[roomCode]?.chat : [];
      }),

    /**
     * Get timer ticks
     */
    useTimerTicks: (roomCode: string | null) =>
      useSelector((state: RootState) =>
        roomCode ? state.auction.rooms[roomCode]?.auction.ticks : 0
      ),

    /**
     * Get all players
     */
    useAllPlayers: () =>
      useSelector((state: RootState) =>
        state.players.allIds.map((id) => state.players.byId[id])
      ),

    /**
     * Get player by ID
     */
    usePlayer: (playerId: string | null) =>
      useSelector((state: RootState) =>
        playerId ? state.players.byId[playerId] : null
      ),

    /**
     * Get loading state
     */
    useLoading: () => useSelector((state: RootState) => state.auction.loading),

    /**
     * Get error state
     */
    useError: () => useSelector((state: RootState) => state.auction.error),
  };
};

/**
 * useAuctionStateAndDispatch - Combined hook for state and dispatch
 */
export const useAuctionStateAndDispatch = () => {
  return {
    ...useAuctionDispatch(),
    ...useAuctionSelectors(),
  };
};
