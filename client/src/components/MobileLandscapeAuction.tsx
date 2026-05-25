import { useState } from 'react';
import type { RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import type { RoomState, Player, VideoPhase } from '../types';
import toast from 'react-hot-toast';
import TeamPanel from './TeamPanel';
import VideoPlayer from './VideoPlayer';
import ChatPanel from './ChatPanel';
import PlayerDatabase from './PlayerDatabase';
import { TEAMS } from '../constants/teams';
import '../mobileLandscape.css';

type VideoManager = {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoPhase: VideoPhase;
  introFrozen: boolean;
  markGraphicsReady: () => void;
  auctionReadyForBids: boolean;
  bidCooldownFrozen: boolean;
};

interface AuctionLayoutProps {
  roomCode: string;
  roomState: RoomState;
  allPlayers: Player[];
  myTeamId: string | null;
  socket: Socket | null;
  videoManager: VideoManager;
  canBid: boolean;
  canUserBid: boolean;
  isHost: boolean;
  soldPlayers: { playerId: string; teamId: string; amount: number }[];
  unsoldPlayers: string[];
  highestBidderId: string | null;
  actions: {
    placeBid: (code: string) => void;
    togglePause: (code: string) => void;
    skipCurrentSet: (code: string) => void;
    endAuction: (code: string) => void;
    resetRoom: (code: string) => void;
    leaveRoom: () => void;
    navigate: (path: string) => void;
  };
}

export default function MobileLandscapeAuction({
  roomCode,
  roomState,
  allPlayers,
  videoManager,
  canUserBid,
  isHost,
  soldPlayers,
  unsoldPlayers,
  highestBidderId,
  actions
}: AuctionLayoutProps) {
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);

  return (
    <div className="mobile-landscape-mode flex flex-row w-screen h-[100dvh] bg-[#050505] text-white overflow-hidden font-sans selection:bg-blue-500/30 text-xs">

      {/* Left panel: Team Standings (Compact) */}
      <div className="w-[26%] h-full border-r border-white/5 bg-[#0a0a0a] z-20 shadow-xl overflow-hidden">
        <div className="h-full overflow-y-auto custom-scrollbar scale-[0.85] origin-top-left w-[117.6%]">
          <TeamPanel teams={roomState.teams} allPlayers={allPlayers} />
        </div>
      </div>

      {/* Center panel: Auction Stage — video fills full height */}
      <div className="center-auction-stage w-[48%] h-full relative overflow-hidden bg-black">

        {/* Floating top header — absolute, zero layout impact */}
        <div className="top-header-overlay absolute top-2 left-2 right-2 z-40 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10 pointer-events-auto">
            <img 
              src="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/9c3773cb-5629-4145-b044-4ef6f9090376/df0pxkt-cbc20ad7-b514-43f5-99bd-31a3a351520a.png/v1/fill/w_927,h_862/tata_ipl_auction_logo_by_harshmore7781_df0pxkt-pre.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTA4MCIsInBhdGgiOiIvZi85YzM3NzNjYi01NjI5LTQxNDUtYjA0NC00ZWY2ZjkwOTAzNzYvZGYwcHhrdC1jYmMyMGFkNy1iNTE0LTQzZjUtOTliZC0zMWEzYTM1MTUyMGEucG5nIiwid2lkdGgiOiI8PTExNjEifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.2g756-i28rBf1t-DSn5g6_qN8vYzoI_FooR503fHiPA"
              alt="IPL Logo"
              className="h-4 w-auto object-contain opacity-85"
            />
            <div className="h-3 w-[1px] bg-white/20 mx-0.5"></div>
            <div className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[7px] font-black uppercase tracking-widest text-white/95">Live</span>
            </div>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={() => setIsDatabaseOpen(true)}
              className="w-7 h-7 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full border border-white/20 shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-white/90 text-[14px]">menu</span>
            </button>
            <button
              onClick={() => {
                if (isHost) {
                  actions.togglePause(roomCode || '');
                } else {
                  toast.error('Only Host can pause!', { style: { fontSize: '10px' } });
                }
              }}
              className="w-7 h-7 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full border border-white/20 shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-white/90 text-[14px]">
                {roomState.auction.isPaused ? 'play_arrow' : 'pause'}
              </span>
            </button>
            <button
              onClick={() => {
                if (isHost) {
                  actions.skipCurrentSet(roomCode || '');
                } else {
                  toast.error('Only Host can skip the current set!', { style: { fontSize: '10px' } });
                }
              }}
              className="w-7 h-7 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full border border-yellow-500/20 shadow-md active:scale-95"
              title="Skip Current Set"
            >
              <span className="material-symbols-outlined text-yellow-300 text-[14px]">fast_forward</span>
            </button>
          </div>
        </div>

        {/* Video — fills the ENTIRE center column */}
        <div className="video-wrapper absolute inset-0 z-10">
          <VideoPlayer
            videoRef={videoManager.videoRef}
            videoPhase={videoManager.videoPhase}
            introFrozen={videoManager.introFrozen}
            onGraphicsReady={videoManager.markGraphicsReady}
          />
        </div>

        {/* Bid controls — absolute overlay at the very bottom of video */}
        {/* Overlaps video — visually connected, no empty space below */}
        <div className="bottom-controls-area absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
          {/* Leading team logo */}
          <div className="w-10 h-10 flex items-center justify-center pointer-events-auto">
            {roomState.auction.phase === 'bidding' && highestBidderId && (
              <div className="w-9 h-9 bg-[#001120]/90 border border-[#00e5ff] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(0,229,255,0.3)]">
                <img
                  src={TEAMS[highestBidderId as keyof typeof TEAMS]?.logoUrl}
                  className="w-[75%] h-[75%] object-contain"
                  alt={highestBidderId}
                />
              </div>
            )}
          </div>

          {/* BID button */}
          <div className="z-30 pointer-events-auto">
            {roomState.auction.phase === 'bidding' && (
              <button
                onClick={() => {
                  if (!roomCode || !canUserBid) return;
                  actions.placeBid(roomCode);
                }}
                disabled={!canUserBid}
                className={`
                  bid-btn w-24 h-9 rounded-lg font-black text-xs tracking-widest uppercase 
                  transition-all active:scale-95 border
                  ${canUserBid
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_12px_rgba(0,229,255,0.4)] border-[#00e5ff]'
                    : 'bg-white/5 text-gray-600 cursor-not-allowed border-white/10'
                  }
                `}
              >
                BID
              </button>
            )}
          </div>

          {/* Balance placeholder */}
          <div className="w-10 h-10" />
        </div>

        {/* Pause Overlay */}
        {roomState.auction.isPaused && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center w-full max-w-[200px] px-2">
              <h1 className="text-lg font-black tracking-tight text-white uppercase mb-2">
                Paused
              </h1>
              
              <div className="space-y-2 w-full">
                {isHost && (
                  <>
                    <button
                      onClick={() => actions.togglePause(roomCode || '')}
                      className="w-full py-2 px-3 font-bold uppercase text-[10px] rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Skip the rest of the current set and move to the next set?")) actions.skipCurrentSet(roomCode || '');
                      }}
                      className="w-full py-2 px-3 font-bold uppercase text-[10px] rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300"
                    >
                      Skip Current Set
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Restart the auction?")) actions.resetRoom(roomCode || '');
                      }}
                      className="w-full py-2 px-3 font-bold uppercase text-[10px] rounded-lg bg-white/5 border border-white/10 text-white"
                    >
                      Restart
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("End the auction?")) actions.endAuction(roomCode || '');
                      }}
                      className="w-full py-2 px-3 font-bold uppercase text-[10px] rounded-lg bg-red-500/15 border border-red-500/30 text-red-400"
                    >
                      End
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    if (confirm("Leave auction? If you are the only player, the room may be deleted. You can rejoin within 2 minutes using the same room code.")) {
                      actions.leaveRoom();
                      actions.navigate('/');
                    }
                  }}
                  className="w-full py-2 px-3 font-bold uppercase text-[10px] rounded-lg bg-white/5 border border-white/10 text-white"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: Chat Commentary (Compact) */}
      <div className="w-[26%] h-full border-l border-white/5 bg-[#0a0a0a] z-20 shadow-xl overflow-hidden">
        <div className="h-full scale-[0.85] origin-top-left w-[117.6%]">
          <ChatPanel roomCode={roomCode || ''} />
        </div>
      </div>

      <PlayerDatabase
        isOpen={isDatabaseOpen}
        onClose={() => setIsDatabaseOpen(false)}
        allPlayers={allPlayers}
        auctionQueue={roomState.auction.auctionQueue}
        currentIndex={roomState.auction.currentPlayerIndex}
        soldPlayers={soldPlayers}
        unsoldPlayers={unsoldPlayers}
      />
    </div>
  );
}
