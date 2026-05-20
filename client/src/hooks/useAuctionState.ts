import { useMemo } from 'react';
import type { RoomState, TeamId, Player } from '../types';
import { MAX_OVERSEAS_PLAYERS, MAX_SQUAD_SIZE } from '../../../shared/auctionConfig';

export const useAuctionState = (roomState: RoomState | null, myTeamId: TeamId | null, allPlayers: Player[]) => {
  const currentPlayer = useMemo(() => {
    if (!roomState || !roomState.auction.isStarted || allPlayers.length === 0) return null;
    const playerId = roomState.auction.auctionQueue[roomState.auction.currentPlayerIndex];
    return allPlayers.find(p => p.id === playerId) || null;
  }, [roomState, allPlayers]);

  const myTeam = useMemo(() => {
    if (!roomState || !myTeamId) return null;
    return roomState.teams[myTeamId] || null;
  }, [roomState, myTeamId]);

  const nextBidAmount = useMemo(() => {
    return roomState?.auction.nextBidAmount ?? null;
  }, [roomState?.auction.nextBidAmount]);

  const canBid = useMemo(() => {
    if (!roomState || !myTeam || !currentPlayer) return false;
    if (roomState.auction.phase !== 'bidding') return false;
    if (roomState.auction.isAdvancing) return false;
    if (roomState.auction.highestBidderId === myTeam.teamId) return false;
    if (roomState.auction.passedTeams.includes(myTeam.teamId)) return false;
    if (myTeam.squad.length >= MAX_SQUAD_SIZE) return false;
    if (currentPlayer.isOverseas && myTeam.overseasCount >= MAX_OVERSEAS_PLAYERS) return false;
    if (nextBidAmount !== null && myTeam.purseRemaining < nextBidAmount) return false;
    return true;
  }, [roomState, myTeam, currentPlayer, nextBidAmount]);

  return {
    currentPlayer,
    myTeam,
    canBid,
    nextBidAmount,
  };
};
