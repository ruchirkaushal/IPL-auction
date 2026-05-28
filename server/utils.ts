import { PLAYERS } from './constants';
import { getAuctionSets } from './lib/auctionSets';

export const getPlayerById = (id: string) => PLAYERS.find(p => p.id === id);

export const shuffleArray = (array: string[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const getSetNameForPlayer = (playerId: string): string => {
  const sets = getAuctionSets();
  const match = sets.find(s => s.playerIds.includes(playerId));
  return match ? match.setName : '';
};
