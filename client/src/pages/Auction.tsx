import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketContext } from '../SocketContext';
import { useAuctionState } from '../hooks/useAuctionState';
import toast from 'react-hot-toast';
import TeamPanel from '../components/TeamPanel';
import VideoPlayer from '../components/VideoPlayer';
import ChatPanel from '../components/ChatPanel';
import PlayerDatabase from '../components/PlayerDatabase';
import { TEAMS } from '../constants/teams';

export default function Auction() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const {
    roomState,
    allPlayers,
    myTeamId,
    placeBid,
    videoManager,
    togglePause,
    endAuction,
    resetRoom,
    leaveRoom,
    socket
  } = useSocketContext();
  const { canBid } = useAuctionState(roomState, myTeamId, allPlayers);

  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [isLocalPaused, setIsLocalPaused] = useState(false);

  const isHost = roomState?.hostId === socket?.id;

  // Compute sold and unsold players
  const soldPlayers = useMemo(() => {
    if (!roomState) return [];
    const sold: { playerId: string; teamId: string; amount: number }[] = [];
    Object.values(roomState.teams).forEach(team => {
      team.squad.forEach(player => {
        sold.push({ playerId: player.id, teamId: team.teamId, amount: player.price });
      });
    });
    return sold;
  }, [roomState?.teams]);

  const unsoldPlayers = useMemo(() => {
    if (!roomState) return [];
    const pastPlayers = roomState.auction.auctionQueue.slice(0, roomState.auction.currentPlayerIndex);
    const soldIds = soldPlayers.map(sp => sp.playerId);
    return pastPlayers.filter(id => !soldIds.includes(id));
  }, [roomState?.auction.auctionQueue, roomState?.auction.currentPlayerIndex, soldPlayers]);

  // Navigate to summary when auction complete
  useEffect(() => {
    if (!roomState) return;
    if (
      roomState.auction.currentPlayerIndex >= roomState.auction.auctionQueue.length &&
      roomState.auction.auctionQueue.length > 0
    ) {
      navigate(`/summary/${roomCode}`);
    }
  }, [roomState?.auction.currentPlayerIndex, roomState?.auction.auctionQueue.length, navigate, roomCode]);

  // ─── VIDEO TRIGGER 1: Auction first starts ───────────────────────────────
  // Tracks whether we've fired intro for isStarted=true so it only fires once
  const auctionStartedRef = useRef(false);

  useEffect(() => {
    if (roomState?.auction.isStarted === true && !auctionStartedRef.current) {
      auctionStartedRef.current = true;
      videoManager.startPlayerIntro();
    }
    // Reset if auction stops (room reset etc)
    if (roomState?.auction.isStarted === false) {
      auctionStartedRef.current = false;
    }
  }, [roomState?.auction.isStarted]);

  // ─── VIDEO TRIGGER 2: Player advances (index changes) ────────────────────
  // Use ref to track previous index — prevents firing on re-renders
  const prevIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!roomState?.auction.isStarted) return;

    const currentIndex = roomState.auction.currentPlayerIndex;

    // Only fire when index ACTUALLY changes to a new higher value
    // AND we've already handled auction start (prevIndexRef !== -1 means
    // startPlayerIntro already called for index 0 via Trigger 1)
    if (currentIndex !== prevIndexRef.current && prevIndexRef.current !== -1) {
      prevIndexRef.current = currentIndex;
      videoManager.startPlayerIntro();
    }

    // First time: set prevIndex to 0 (already handled by Trigger 1)
    if (prevIndexRef.current === -1 && roomState.auction.isStarted) {
      prevIndexRef.current = currentIndex;
    }
  }, [roomState?.auction.currentPlayerIndex, roomState?.auction.isStarted]);

  // Reset prevIndexRef when auction resets
  useEffect(() => {
    if (!roomState?.auction.isStarted) {
      prevIndexRef.current = -1;
    }
  }, [roomState?.auction.isStarted]);

  // Listen to room_reset event to redirect back to lobby
  useEffect(() => {
    if (!socket) return;
    const handleRoomReset = () => {
      navigate(`/lobby/${roomCode}`);
    };
    socket.on('room_reset', handleRoomReset);
    return () => {
      socket.off('room_reset', handleRoomReset);
    };
  }, [socket, navigate, roomCode]);

  useEffect(() => {
    if (socket && !roomState) {
      const timer = setTimeout(() => {
        if (!roomState) {
          navigate(`/?roomCode=${roomCode}`);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [socket, roomState, roomCode, navigate]);

  if (!roomState) return (
    <div className="p-8 text-white flex justify-center items-center h-screen bg-gray-950">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold tracking-widest uppercase text-blue-400">Loading Auction...</p>
      </div>
    </div>
  );

  const highestBidderId = roomState.auction.highestBidderId;

  // Bid is only allowed when:
  // 1. Server says canBid (purse, overseas, squad checks)
  // 2. intro freeze is over (2.9s after player reveal)
  // 3. no bid cooldown (0.8s after any bid)
  // 4. video phase allows it (BIDDING_OPEN or TEAM_BIDDING only)
  // 5. Auction is NOT paused
  const canUserBid = !!(
    canBid &&
    !roomState.auction.isPaused &&
    videoManager.auctionReadyForBids &&
    !videoManager.bidCooldownFrozen &&
    (
      videoManager.videoPhase === 'BIDDING_OPEN' ||
      videoManager.videoPhase === 'TEAM_BIDDING' ||
      videoManager.videoPhase === 'WAITING_END'
    )
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-blue-500/30">

      {/* Left panel: Team Standings */}
      <div className="w-full lg:w-[24%] h-[20%] lg:h-full border-b lg:border-b-0 lg:border-r border-white/5 bg-[#0a0a0a] z-20 shadow-2xl">
        <div className="h-full overflow-y-auto custom-scrollbar">
          <TeamPanel teams={roomState.teams} allPlayers={allPlayers} />
        </div>
      </div>

      {/* Center panel: Auction Stage */}
      <div className="flex-grow h-full flex flex-col relative overflow-hidden bg-black">

        {/* Floating top header */}
        <div className="absolute top-6 left-6 right-6 z-40 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 pointer-events-auto shadow-lg hover:bg-black/50 transition-all">
            <img 
              src="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/9c3773cb-5629-4145-b044-4ef6f9090376/df0pxkt-cbc20ad7-b514-43f5-99bd-31a3a351520a.png/v1/fill/w_927,h_862/tata_ipl_auction_logo_by_harshmore7781_df0pxkt-pre.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTA4MCIsInBhdGgiOiIvZi85YzM3NzNjYi01NjI5LTQxNDUtYjA0NC00ZWY2ZjkwOTAzNzYvZGYwcHhrdC1jYmMyMGFkNy1iNTE0LTQzZjUtOTliZC0zMWEzYTM1MTUyMGEucG5nIiwid2lkdGgiOiI8PTExNjEifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.2g756-i28rBf1t-DSn5g6_qN8vYzoI_FooR503fHiPA"
              alt="IPL Auction Logo Bug"
              className="h-7 w-auto object-contain opacity-85 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            />
            <div className="h-4 w-[1px] bg-white/20 mx-1"></div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/95">Live</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 pointer-events-auto items-end">
            <button
              onClick={() => setIsDatabaseOpen(true)}
              className="w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full border border-white/20 transition-all hover:scale-110 shadow-lg group"
              title="Player Database"
            >
              <span className="material-symbols-outlined text-white/90 text-[20px] group-hover:text-white transition-colors">menu</span>
            </button>


            <button
              onClick={() => {
                if (isHost) {
                  togglePause(roomCode || '');
                } else {
                  toast.error('Only the Host can pause/resume the auction!', {
                    style: { borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #1e293b' }
                  });
                }
              }}
              className="w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full border border-white/20 transition-all hover:scale-110 shadow-lg group"
              title={roomState.auction.isPaused ? "Resume Auction" : "Pause Auction"}
            >
              <span className="material-symbols-outlined text-white/90 text-[20px] group-hover:text-white transition-colors">
                {roomState.auction.isPaused ? 'play_arrow' : 'pause'}
              </span>
            </button>
          </div>
        </div>

        {/* Video + Overlays */}
        <div className="flex-grow relative h-full">
          <VideoPlayer
            videoRef={videoManager.videoRef}
            videoPhase={videoManager.videoPhase}
            introFrozen={videoManager.introFrozen}
            onGraphicsReady={videoManager.markGraphicsReady}
          />

          {/* Leading team logo — bottom left */}
          {roomState.auction.phase === 'bidding' && highestBidderId && (
            <div className="absolute bottom-48 left-10 z-30 flex items-center justify-center w-20 h-20 bg-[#001120]/80 border-2 border-[#00e5ff] rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.3),inset_0_0_10px_rgba(0,229,255,0.2)] backdrop-blur-md animate-in fade-in zoom-in duration-300">
              <img
                src={TEAMS[highestBidderId as keyof typeof TEAMS]?.logoUrl}
                className="w-[75%] h-[75%] object-contain"
                alt={highestBidderId}
              />
            </div>
          )}

          {/* BID button — bottom right */}
          {roomState.auction.phase === 'bidding' && (
            <div className="absolute bottom-48 right-10 z-30">
              <button
                onClick={() => {
                  if (!roomCode || !canUserBid) return;
                  placeBid(roomCode);
                }}
                disabled={!canUserBid}
                className={`
                  w-40 h-16 rounded-2xl font-black tracking-widest uppercase 
                  transition-all duration-300 border-2
                  ${canUserBid
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 hover:scale-[1.05] active:scale-[0.95] shadow-[0_0_30px_rgba(0,229,255,0.5)] border-[#00e5ff]'
                    : 'bg-white/5 text-gray-600 cursor-not-allowed border-white/10'
                  }
                `}
              >
                BID
              </button>
            </div>
          )}
        </div>

        {/* Pause Screen Overlay */}
        {(roomState.auction.isPaused || isLocalPaused) && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="text-center max-w-md px-6 select-none">
              <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse">
                <span className="material-symbols-outlined text-red-500 text-[40px]">pause</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase mb-2">
                {roomState.auction.isPaused ? "Auction Paused" : "Menu"}
              </h1>
              <p className="text-sm text-gray-400 mb-8 font-medium">
                {roomState.auction.isPaused 
                  ? "The Host has paused the session. Bidding and timers are frozen." 
                  : "Auction is running in the background. Take a break or return to the main lobby."
                }
              </p>

              <div className="space-y-3 w-64 mx-auto pointer-events-auto">
                {roomState.auction.isPaused ? (
                  <>
                    {isHost && (
                      <>
                        <button
                          onClick={() => togglePause(roomCode || '')}
                          className="w-full py-3 px-4 font-bold uppercase text-xs tracking-wider rounded-xl transition-all hover:scale-105 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to completely restart the auction? This will reset all squads, bids, and purses.")) {
                              resetRoom(roomCode || '');
                            }
                          }}
                          className="w-full py-3 px-4 font-bold uppercase text-xs tracking-wider rounded-xl transition-all hover:scale-105 bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                        >
                          Restart Auction
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to end the auction? Everyone will be redirected to the Final Results page.")) {
                              endAuction(roomCode || '');
                            }
                          }}
                          className="w-full py-3 px-4 font-bold uppercase text-xs tracking-wider rounded-xl transition-all hover:scale-105 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400"
                        >
                          End Auction
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {!isHost && (
                      <button
                        onClick={() => setIsLocalPaused(false)}
                        className="w-full py-3 px-4 font-bold uppercase text-xs tracking-wider rounded-xl transition-all hover:scale-105 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                      >
                        Resume
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to leave the auction? You will be disconnected and return to the main menu.")) {
                      leaveRoom();
                      navigate('/');
                    }
                  }}
                  className="w-full py-3 px-4 font-bold uppercase text-xs tracking-wider rounded-xl transition-all hover:scale-105 bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                >
                  Go Back To Main Menu
                </button>

                {roomState.auction.isPaused && !isHost && (
                  <div className="pt-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    Waiting for host to resume...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: Chat Commentary */}
      <div className="w-full lg:w-[24%] h-[30%] lg:h-full border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0a0a0a] z-20 shadow-2xl">
        <ChatPanel roomCode={roomCode || ''} />
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
