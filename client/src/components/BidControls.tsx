import type { TeamId } from '../types';
import { formatAuctionMoney } from '../../../shared/auctionPricing';

interface BidControlsProps {
  canBid: boolean;
  nextBidAmount: number | null;
  myTeamId: TeamId | null;
  passedTeams: TeamId[];
  onPlaceBid: () => void;
  onPassBid: () => void;
}

export default function BidControls({ 
  canBid, 
  nextBidAmount, 
  myTeamId, 
  passedTeams, 
  onPlaceBid, 
  onPassBid 
}: BidControlsProps) {
  return (
    <div className="mt-6 flex gap-6 justify-center">
      <button 
        className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-10 py-5 rounded-xl text-2xl font-extrabold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
        disabled={!canBid}
        onClick={onPlaceBid}
      >
        BID {nextBidAmount === null ? 'READY' : formatAuctionMoney(nextBidAmount)}
      </button>
      <button 
        className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white px-10 py-5 rounded-xl text-2xl font-extrabold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
        disabled={!canBid || (myTeamId && passedTeams.includes(myTeamId)) || false}
        onClick={onPassBid}
      >
        PASS
      </button>
    </div>
  );
}
