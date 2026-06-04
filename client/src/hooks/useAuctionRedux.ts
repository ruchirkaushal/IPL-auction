import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { auctionActions } from '../store/auctionSlice';

export const useAuctionRedux = () => {
  const dispatch = useAppDispatch();
  const roomState = useAppSelector((state) => state.auction.roomState);
  const myTeamId = useAppSelector((state) => state.auction.myTeamId);
  const allPlayers = useAppSelector((state) => state.players.allPlayers);
  const isConnected = useAppSelector((state) => state.auction.isConnected);
  const socketError = useAppSelector((state) => state.auction.socketError);

  const currentPlayerId = useMemo(
    () => roomState?.auction.auctionQueue[roomState.auction.currentPlayerIndex] ?? null,
    [roomState]
  );

  return {
    roomState,
    myTeamId,
    allPlayers,
    isConnected,
    socketError,
    currentPlayerId,
    setRoomState: (state: typeof roomState) => dispatch(auctionActions.setRoomState(state)),
    setMyTeamId: (teamId: typeof myTeamId) => dispatch(auctionActions.setMyTeamId(teamId)),
    clearTransientRoomState: () => dispatch(auctionActions.clearTransientRoomState()),
  };
};
