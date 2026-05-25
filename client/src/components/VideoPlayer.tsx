import { useState, useEffect, useRef } from 'react';
import type { RefObject, TransitionEvent } from 'react';
import type { VideoPhase } from '../types';
import { formatAuctionMoney } from '../../../shared/auctionPricing';
import { useSocketContext } from '../SocketContext';
import { useAuctionState } from '../hooks/useAuctionState';
import { TEAMS } from '../constants/teams';

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoPhase: VideoPhase;
  introFrozen: boolean;
  onGraphicsReady?: () => void;
}

// Animated Number Component for Current Bid
const AnimatedBidValue = ({ 
  value, 
  basePrice, 
  highestBidderId 
}: { 
  value: number; 
  basePrice: number; 
  highestBidderId: string | null;
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [animationKey, setAnimationKey] = useState(0);
  const isNewBid = !!highestBidderId;

  useEffect(() => {
    if (value !== displayValue) {
      setDisplayValue(value);
      if (value > basePrice || (value === basePrice && highestBidderId)) {
        setAnimationKey(prev => prev + 1);
      }
    }
  }, [value, basePrice, displayValue, highestBidderId]);

  return (
      <span 
        key={animationKey}
        className={`inline-block text-[38px] font-[900] tracking-tight font-inter leading-none ${isNewBid ? 'animate-bidPulse' : ''}`}
        style={{ 
          color: isNewBid ? '#F5A623' : '#FFFFFF',
          textShadow: isNewBid ? '0 0 25px rgba(245,166,35,0.7)' : '0 0 20px rgba(255,255,255,0.3)',
        }}
      >
        {formatAuctionMoney(displayValue)}
      </span>
  );
};

export default function VideoPlayer({ videoRef, videoPhase, introFrozen, onGraphicsReady }: VideoPlayerProps) {
  const { roomState, allPlayers, myTeamId, timerTicks, lastSold, lastUnsold } = useSocketContext();
  const { currentPlayer } = useAuctionState(roomState, myTeamId, allPlayers);
  const activeBidAmount = roomState?.auction.currentBid ?? 0;

  const isPaused = roomState?.auction.isPaused;
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      if (videoPhase !== 'WAITING_END' && videoPhase !== 'RESULT_SHOWN') {
        videoRef.current.play().catch(err => console.log('Resume video error:', err));
      }
    }
  }, [isPaused, videoPhase, videoRef]);

  const [portraitLoaded, setPortraitLoaded] = useState(false);
  const transitionCompletedRef = useRef(false);
  const graphicsReadyNotifiedRef = useRef(false);

  const showPlayerInfo = !introFrozen && (
    videoPhase === 'BIDDING_OPEN' ||
    videoPhase === 'TEAM_BIDDING' ||
    videoPhase === 'WAITING_END'
  );
  const showOverlay = videoPhase === 'RESULT_SHOWN';
  const isSold = lastSold && currentPlayer && lastSold.playerId === currentPlayer.id;
  const overlayType = isSold ? 'sold' : 'unsold';

  const timerPercentage = (timerTicks / 100) * 100;
  const timerColor = timerTicks > 50 ? '#00E676' : timerTicks > 20 ? '#F5A623' : '#FF1744';

  useEffect(() => {
    if (!showPlayerInfo || !currentPlayer) {
      setPortraitLoaded(false);
      transitionCompletedRef.current = false;
      graphicsReadyNotifiedRef.current = false;
      return;
    }

    if (showPlayerInfo && portraitLoaded && transitionCompletedRef.current && !graphicsReadyNotifiedRef.current) {
      graphicsReadyNotifiedRef.current = true;
      onGraphicsReady?.();
    }
  }, [showPlayerInfo, portraitLoaded, currentPlayer, onGraphicsReady]);

  useEffect(() => {
    if (!showPlayerInfo || !currentPlayer || graphicsReadyNotifiedRef.current) return;

    const timeout = window.setTimeout(() => {
      if (!graphicsReadyNotifiedRef.current) {
        graphicsReadyNotifiedRef.current = true;
        onGraphicsReady?.();
      }
    }, 420);

    return () => window.clearTimeout(timeout);
  }, [showPlayerInfo, currentPlayer, onGraphicsReady]);

  const renderStats = () => {
    if (!currentPlayer) return null;
    const { stats, role } = currentPlayer;
    const items = [];

    items.push({ label: 'MATCHES', value: stats.matches ?? 'N/A' });

    if (role === 'BAT' || role === 'WK' || role === 'AR') {
      items.push({ label: 'RUNS', value: stats.runs ?? 'N/A' });
    }

    if (role === 'BOWL' || role === 'AR') {
      items.push({ label: 'WICKETS', value: stats.wickets ?? 'N/A' });
    }

    if (stats.previousTeam) {
      items.push({ label: 'PREVIOUS', value: stats.previousTeam });
    }

    return items.map((item, i) => (
      <div key={i} className="flex flex-col items-center justify-center border-r border-[#00e5ff]/30 px-6 last:border-0 w-full h-full">
        <span className="text-white/90 font-bold text-[13px] uppercase tracking-widest mb-0.5">{item.label}</span>
        <span className="text-white font-black text-[36px] leading-none tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{item.value}</span>
      </div>
    ));
  };

  useEffect(() => {
    if (showPlayerInfo) {
      graphicsReadyNotifiedRef.current = false;
    }
  }, [showPlayerInfo]);

  const handleGraphicsTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'opacity') return;
    if (!showPlayerInfo) return;
    transitionCompletedRef.current = true;
    if (portraitLoaded && !graphicsReadyNotifiedRef.current) {
      graphicsReadyNotifiedRef.current = true;
      onGraphicsReady?.();
    }
  };

  return (
    <div className="video-player-container relative w-full h-full bg-black overflow-hidden select-none">
      {/* LAYER 1: VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0 bg-black">
        <video 
          ref={videoRef}
          className="w-full h-full object-cover animate-fade-in duration-500"
          muted
          playsInline
        />
      </div>

      {/* LAYER 3: TIMER BAR */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[rgba(255,255,255,0.08)] z-30">
        <div 
          className={`h-full transition-all duration-100 linear ${timerTicks < 20 ? 'animate-pulse' : ''}`}
          style={{ 
            width: `${timerPercentage}%`, 
            backgroundColor: timerColor,
            boxShadow: `0 0 8px ${timerColor}`
          }}
        />
      </div>

      {/* LAYER 2: PLAYER GRAPHIC OVERLAY */}
      {currentPlayer && (
        <div 
          className="player-graphic-container absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-end pb-0 transform scale-[0.62] origin-bottom"
          style={{
            opacity: showPlayerInfo ? 1 : 0,
            visibility: showPlayerInfo ? 'visible' : 'hidden',
            transition: 'opacity 0.4s ease-in',
            pointerEvents: showPlayerInfo ? 'auto' : 'none',
          }}
          onTransitionEnd={handleGraphicsTransitionEnd}
        >
          {/* Player Portrait Background Pattern */}
          <div className="absolute bottom-[180px] w-[500px] h-[500px] flex items-center justify-center">
             <div className="absolute inset-0 bg-[#00e5ff]/20 rounded-full blur-[80px] mix-blend-screen" />
          </div>

          {/* Player Portrait */}
          <div className="absolute bottom-[170px] w-full flex justify-center z-10 overflow-visible">
            <div className="relative w-[395px] h-[395px]">
               <img
                 key={currentPlayer.id}
                 src={currentPlayer.image || currentPlayer.photoUrl}
                 alt={currentPlayer.name}
                 onLoad={() => setPortraitLoaded(true)}
                 onError={(e) => {
                   e.currentTarget.onerror = null;
                   e.currentTarget.src = 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png';
                 }}
                 className="player-portrait absolute bottom-0 w-full h-full object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] transition-opacity duration-300"
               />
               <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
            </div>
          </div>

          {/* BROADCAST INFO GRAPHIC WRAPPER */}
          <div className="broadcast-graphic-wrapper relative z-20 w-[170%] max-w-[2500px] flex flex-col items-center filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)]">
             
             {/* PANELS ROW */}
             <div className="flex w-full justify-center items-end h-[120px] gap-[4px] relative">
                
                {/* LEFT: BASE PRICE */}
                <div 
                  className="w-[28%] bg-gradient-to-b from-[#003c5a] to-[#001524] relative flex flex-col justify-center items-center shadow-[inset_0_0_30px_rgba(0,229,255,0.3)] backdrop-blur-xl h-[105px]"
                  style={{ 
                    clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0 100%)',
                  }}
                >
                   <div className="absolute inset-0 border-2 border-[#00e5ff]" style={{ clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0 100%)' }} />
                   
                   <span className="text-[13px] tracking-[0.12em] text-[rgba(255,255,255,0.55)] font-bold uppercase mb-[4px]">Base Price</span>
                   <span className="text-white font-[900] text-[38px] font-inter leading-none" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
                     {formatAuctionMoney(currentPlayer.basePrice)}
                   </span>
                </div>

                {/* CENTER: NAME */}
                <div 
                  className="w-[44%] bg-gradient-to-b from-[#003c5a] to-[#001524] relative flex flex-col justify-center items-center shadow-[inset_0_0_40px_rgba(0,229,255,0.4)] backdrop-blur-2xl z-30 transform scale-105 h-[120px]"
                  style={{ 
                    clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0% 100%)',
                  }}
                >
                   <div className="absolute inset-0 border-[3px] border-[#00e5ff]" style={{ clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0% 100%)' }} />
                   <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                   
                   <span className="text-white/90 font-bold tracking-[0.2em] text-3xl uppercase leading-none mb-1">
                     {currentPlayer.name.split(' ')[0]}
                   </span>
                   <span className="text-white font-black text-[62px] tracking-tight uppercase leading-none" style={{ textShadow: '0 0 30px rgba(0,229,255,0.6)' }}>
                     {currentPlayer.name.split(' ').slice(1).join(' ')}
                   </span>
                </div>

                {/* RIGHT: CURRENT BID */}
                <div 
                  className="w-[28%] bg-gradient-to-b from-[#003c5a] to-[#001524] relative flex flex-col justify-center items-center shadow-[inset_0_0_30px_rgba(0,229,255,0.3)] backdrop-blur-xl h-[105px]"
                  style={{ 
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12% 100%)',
                  }}
                >
                   <div className="absolute inset-0 border-2 border-[#00e5ff]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12% 100%)' }} />

                   <span className="text-[13px] tracking-[0.12em] text-[rgba(255,255,255,0.55)] font-bold uppercase mb-[4px]">
                     CURRENT BID
                   </span>
                   <div className="font-inter leading-none">
                     <AnimatedBidValue 
                       value={activeBidAmount || currentPlayer.basePrice} 
                       basePrice={currentPlayer.basePrice}
                       highestBidderId={roomState?.auction.highestBidderId ?? null}
                     />
                   </div>
                </div>

             </div>

             {/* LOWER STATS STRIP */}
             <div className="stats-strip w-[99%] max-w-[2450px] h-[80px] bg-[#001120] border-2 border-[#00e5ff] flex items-stretch justify-center relative overflow-hidden backdrop-blur-lg shadow-[inset_0_0_20px_rgba(0,229,255,0.2),0_10px_20px_rgba(0,0,0,0.5)] mt-1">
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/5 pointer-events-none" />
                
                {roomState?.auction?.currentSetName && (
                   <div className="absolute top-0 left-0 h-full px-4 bg-[#00e5ff]/20 border-r border-[#00e5ff] flex items-center justify-center">
                     <span className="text-[#00e5ff] font-bold text-[12px] uppercase tracking-widest leading-none rotate-180" style={{ writingMode: 'vertical-rl' }}>
                       {roomState.auction.currentSetName}
                     </span>
                   </div>
                )}

                <div className="flex items-center justify-center px-10 ml-8 border-r border-[#00e5ff]/30">
                   <span className="text-white font-bold tracking-[0.25em] uppercase text-xl" style={{ textShadow: '0 0 10px rgba(0,229,255,0.8)' }}>IPL Career</span>
                </div>

                <div className="flex-1 flex justify-evenly items-center py-1">
                   {renderStats()}
                </div>
             </div>

          </div>

        </div>
      )}

      {/* SOLD / UNSOLD OVERLAY */}
      {showOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center transform scale-100 transition-all duration-300">
            {overlayType === 'sold' && lastSold ? (
              <>
                <div className="text-[20px] font-black text-emerald-400 tracking-[0.5em] uppercase mb-2">Acquired By</div>
                <img 
                  src={TEAMS[lastSold.teamId as keyof typeof TEAMS]?.logoUrl} 
                  className="w-32 h-32 object-contain mb-4 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]" 
                  alt={lastSold.teamName}
                />
                <h1 className="text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl">SOLD</h1>
                <div className="mt-4 text-4xl font-black text-[#F5A623] font-outfit">
                  {formatAuctionMoney(lastSold.amount)}
                </div>
              </>
            ) : (
              <>
                <h1 className="text-8xl font-black text-red-500 italic tracking-tighter drop-shadow-2xl">UNSOLD</h1>
                <p className="text-2xl font-black text-gray-400 mt-4 uppercase tracking-widest">{lastUnsold?.playerName || (currentPlayer?.name)}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
