import type { Player } from '../types';

export const PLAYERS: Player[] = [
  { id: 'p1', name: 'Rohit Sharma', role: 'BAT', country: 'India', isOverseas: false, basePrice: 200, photoUrl: '', stats: { matches: 250, runs: 6500 }, starRating: 5, isCapped: true, auctionSet: 9 },
  { id: 'p2', name: 'Virat Kohli', role: 'BAT', country: 'India', isOverseas: false, basePrice: 200, photoUrl: '', stats: { matches: 245, runs: 7500 }, starRating: 5, isCapped: true, auctionSet: 9 },
  { id: 'p3', name: 'Jasprit Bumrah', role: 'BOWL', country: 'India', isOverseas: false, basePrice: 200, photoUrl: '', stats: { matches: 130, wickets: 150 }, starRating: 5, isCapped: true, auctionSet: 9 },
  { id: 'p4', name: 'Pat Cummins', role: 'BOWL', country: 'Australia', isOverseas: true, basePrice: 200, photoUrl: '', stats: { matches: 50, wickets: 60 }, starRating: 4, isCapped: true, auctionSet: 9 },
  { id: 'p5', name: 'Ravindra Jadeja', role: 'AR', country: 'India', isOverseas: false, basePrice: 200, photoUrl: '', stats: { matches: 220, runs: 2800, wickets: 140 }, starRating: 5, isCapped: true, auctionSet: 9 },
  { id: 'p6', name: 'MS Dhoni', role: 'WK', country: 'India', isOverseas: false, basePrice: 200, photoUrl: '', stats: { matches: 260, runs: 5200 }, starRating: 5, isCapped: true, auctionSet: 9 }
];

export const getPlayerById = (id: string): Player | undefined => {
  return PLAYERS.find(p => p.id === id);
};

export const createAuctionQueue = (): string[] => {
  const ids = PLAYERS.map(p => p.id);
  // Shuffle array
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
};
