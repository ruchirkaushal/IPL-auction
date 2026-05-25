export type TeamId = 'MI' | 'CSK' | 'RCB' | 'KKR' | 'DC' | 'RR' | 'PBKS' | 'SRH' | 'GT' | 'LSG';
export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export type ClipType = 'bid' | 'win' | 'pass' | 'idle' | 'auctioneer' | 'start' | 'end';
export type AuctionPhase = 'bidding' | 'sold' | 'unsold' | 'advancing' | 'waiting';
export type VideoPhase =
  | 'INTRO'           // start.mp4 playing, 0.00 to 2.90s — everything frozen
  | 'BIDDING_OPEN'    // start.mp4 still playing OR team video playing — bids allowed
  | 'TEAM_BIDDING'    // a team's video playing after a bid
  | 'WAITING_END'     // end.mp4 loaded but PAUSED/STATIC — waiting for timer to hit 0
  | 'OUTRO_PLAYING'   // end.mp4 actually playing — timer already 0
  | 'RESULT_SHOWN'    // SOLD/UNSOLD overlay visible — at 2.60s into end.mp4
  | 'BID_COOLDOWN';   // 0.80s freeze after ANY bid is placed


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

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  country: string;
  isOverseas: boolean;
  basePrice: number; // in Lakhs
  photoUrl: string;
  image?: string;
  stats: Record<string, any>;
  starRating: number;
  isCapped: boolean;
  auctionSet: number;
}

export interface TeamInfo {
  id: TeamId;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export interface TeamState {
  teamId: TeamId;
  ownerId: string | null;
  ownerName: string | null;
  purseRemaining: number; // in Lakhs
  squad: { id: string, price: number }[]; // player ids with sold price
  overseasCount: number;
  status: 'idle' | 'leading' | 'passed';
}

export interface AuctionState {
  isStarted: boolean;
  currentPlayerIndex: number;
  auctionQueue: string[]; // player ids
  currentBid: number; // in Lakhs
  nextBidAmount: number | null; // server-authoritative next legal bid
  highestBidderId: TeamId | null;
  ticks: number; // integer ALWAYS
  phase: AuctionPhase;
  passedTeams: TeamId[];
  isAdvancing: boolean;
  currentSetName: string;
  isPaused: boolean;
}

export interface RoomPlayer {
  socketId: string;
  userId: string;
  name: string;
  teamId: TeamId | null;
  isHost: boolean;
  isReady: boolean;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  players: RoomPlayer[];
  teams: Record<TeamId, TeamState>;
  auction: AuctionState;
  chat: ChatMessage[];
  isLocked: boolean;
}

export interface BidPlacedPayload {
  teamId: TeamId;
  teamName: string;
  amount: number;
  isAI: boolean;
}

export interface PlayerSoldPayload {
  teamId: TeamId;
  teamName: string;
  amount: number;
  playerName: string;
  playerId: string;
}

export interface PlayerUnsoldPayload {
  playerName: string;
  playerId: string;
}

export interface TimerUpdatePayload {
  ticks: number;
  timer: number;
}

export interface PlayerAdvancingPayload {
  nextPlayerId: string;
  nextPlayerIndex: number;
}

export interface BidRejectedPayload {
  reason: string;
}
