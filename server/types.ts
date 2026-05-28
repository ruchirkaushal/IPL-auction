export type TeamId = 'MI' | 'CSK' | 'RCB' | 'KKR' | 'DC' | 'RR' | 'PBKS' | 'SRH' | 'GT' | 'LSG';
export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export type AuctionPhase = 'bidding' | 'sold' | 'unsold' | 'advancing' | 'waiting';

export interface ChatMessage {
  id: string;
  type: 'user' | 'system_bid' | 'system_sold' | 'system_unsold';
  sender?: string;
  text?: string;
  teamId?: TeamId;
  playerName?: string;
  amount?: number;
  timestamp: number;
}

export interface Player { id: string; name: string; role: PlayerRole; country: string; isOverseas: boolean; basePrice: number; photoUrl: string; image?: string; stats: Record<string, any>; starRating: number; isCapped: boolean; auctionSet: number; }
export interface TeamState { 
  teamId: TeamId; 
  ownerId: string | null; 
  ownerName: string | null; 
  purseRemaining: number; 
  squad: { id: string, price: number }[]; 
  overseasCount: number; 
  status: 'idle' | 'leading' | 'passed'; 
}
export interface AuctionState { isStarted: boolean; currentPlayerIndex: number; auctionQueue: string[]; currentBid: number; nextBidAmount: number | null; highestBidderId: TeamId | null; ticks: number; phase: AuctionPhase; passedTeams: TeamId[]; isAdvancing: boolean; currentSetName: string; isPaused: boolean; }
export interface RoomPlayer { socketId: string; userId: string; name: string; teamId: TeamId | null; isHost: boolean; isReady: boolean; }
export interface RoomState { roomCode: string; hostId: string; players: RoomPlayer[]; teams: Record<TeamId, TeamState>; auction: AuctionState; chat: ChatMessage[]; isLocked: boolean; }

export interface RoomLifecycleEvent {
  time: number;
  event: string;
  context?: any;
}

export interface IntervalRecord {
  purpose: string;
  createdAt: number;
  lastExecutedAt: number;
}

export interface Room {
  state: RoomState;
  timerInterval: NodeJS.Timeout | null;
  autoAdvanceTimeout: NodeJS.Timeout | null;
  biddingStartTimeout: NodeJS.Timeout | null;
  aiTimeouts: NodeJS.Timeout[];
  deletionTimeout?: NodeJS.Timeout | null;
  roomGeneration: number;
  intervalRegistry: Record<string, IntervalRecord>;
  lifecycleTimeline: RoomLifecycleEvent[];
}
