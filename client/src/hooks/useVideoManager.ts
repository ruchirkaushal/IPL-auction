import { useState, useRef, useCallback, useEffect } from 'react';
import type { TeamId, VideoPhase } from '../types';

export const useVideoManager = () => {
  const videoPhaseRef = useRef<VideoPhase>('INTRO');
  const [videoPhase, setVideoPhase] = useState<VideoPhase>('INTRO');
  const [introFrozen, setIntroFrozen] = useState(true);
  const [bidCooldownFrozen, setBidCooldownFrozen] = useState(false);
  const [graphicsReady, setGraphicsReady] = useState(false);
  const [auctionReadyForBids, setAuctionReadyForBids] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const introTimeoutRef = useRef<any>(null);
  const resultTimeoutRef = useRef<any>(null);
  const bidCooldownRef = useRef<any>(null);
  const timerTicksRef = useRef<number>(100);
  const graphicsReadyRef = useRef<boolean>(false);
  const auctionReadyForBidsRef = useRef<boolean>(false);

  const getVideoPhase = useCallback(() => videoPhaseRef.current, []);
  const updateTimerTicks = useCallback((ticks: number) => {
    timerTicksRef.current = ticks;
  }, []);
  const getGraphicsReady = useCallback(() => graphicsReadyRef.current, []);
  const setGraphicsReadyState = useCallback((value: boolean) => {
    graphicsReadyRef.current = value;
    setGraphicsReady(value);
  }, []);
  const setAuctionReadyForBidsState = useCallback((value: boolean) => {
    auctionReadyForBidsRef.current = value;
    setAuctionReadyForBids(value);
  }, []);
  const resetGraphicsReadyState = useCallback(() => {
    setGraphicsReadyState(false);
    setAuctionReadyForBidsState(false);
  }, [setGraphicsReadyState, setAuctionReadyForBidsState]);
  const markGraphicsReady = useCallback(() => {
    if (!graphicsReadyRef.current) {
      setGraphicsReadyState(true);
    }
    if (!auctionReadyForBidsRef.current) {
      setAuctionReadyForBidsState(true);
    }
  }, [setGraphicsReadyState, setAuctionReadyForBidsState]);

  const setPhase = useCallback((phase: VideoPhase) => {
    videoPhaseRef.current = phase;
    setVideoPhase(phase);
  }, []);

  const loadEndVideoStatic = useCallback(() => {
    const phase = videoPhaseRef.current;
    if (
      phase === 'WAITING_END' ||
      phase === 'OUTRO_PLAYING' ||
      phase === 'RESULT_SHOWN'
    ) return;

    videoPhaseRef.current = 'WAITING_END';
    setVideoPhase('WAITING_END');

    if (videoRef.current) {
      const video = videoRef.current;
      video.onended = null;
      video.loop = false;

      // Load end.mp4 and pause immediately on first frame.
      // This should act as a static broadcast camera feed while the timer is still > 0.
      video.oncanplay = () => {
        if (videoPhaseRef.current === 'WAITING_END') {
          video.pause();
          video.currentTime = 0;
          video.oncanplay = null;
        }
      };

      video.src = '/videos/end.mp4';
      video.load();
    }
  }, []);

  // Called when new player starts
  const startPlayerIntro = useCallback(() => {
    [introTimeoutRef, resultTimeoutRef, bidCooldownRef]
      .forEach(ref => { if (ref.current) clearTimeout(ref.current); });

    resetGraphicsReadyState();
    setPhase('INTRO');
    setIntroFrozen(true);
    setBidCooldownFrozen(false);

    if (videoRef.current) {
      videoRef.current.onended = null;
      videoRef.current.oncanplay = null;
      videoRef.current.loop = false;
      videoRef.current.src = '/videos/start.mp4';
      videoRef.current.currentTime = 0;

      videoRef.current.onended = () => {
        if (videoPhaseRef.current === 'BIDDING_OPEN') {
          // start.mp4 ended with no bids — switch to end.mp4 STATIC
          loadEndVideoStatic();
        }
      };

      videoRef.current.play()?.catch(err => console.log('start.mp4:', err));
    }

    introTimeoutRef.current = setTimeout(() => {
      setIntroFrozen(false);
      setPhase('BIDDING_OPEN');
    }, 2900);
  }, [resetGraphicsReadyState]);

  // Called on bid_placed — switches to team video
  const onBidPlaced = useCallback((teamId: TeamId) => {
    const phase = videoPhaseRef.current;

    if (
      phase === 'OUTRO_PLAYING' ||
      phase === 'RESULT_SHOWN'
    ) return;

    // 800ms cooldown on bid button
    setBidCooldownFrozen(true);
    if (bidCooldownRef.current) clearTimeout(bidCooldownRef.current);
    bidCooldownRef.current = setTimeout(() => setBidCooldownFrozen(false), 800);

    if (
      phase === 'BIDDING_OPEN' ||
      phase === 'TEAM_BIDDING' ||
      phase === 'WAITING_END' ||
      phase === 'INTRO'
    ) {
      const ext = teamId === 'SRH' ? 'mov' : 'mp4';
      if (videoRef.current) {
        videoRef.current.onended = null;
        videoRef.current.oncanplay = null;
        videoRef.current.loop = false;
        videoRef.current.src = `/videos/${teamId}.${ext}`;
        videoRef.current.currentTime = 0;
        videoRef.current.onended = () => {
          if (videoPhaseRef.current === 'TEAM_BIDDING' && timerTicksRef.current > 0) {
            loadEndVideoStatic();
          }
        };
        videoRef.current.play()?.catch(err => console.log('team video:', err));
      }
      setPhase('TEAM_BIDDING');
    }
  }, []);

  // Called when timer hits 0 (ticks === 0 from timer_update)
  //
  // TWO SCENARIOS when this fires:
  //
  // SCENARIO A — no one bid at all OR start.mp4 ended first:
  //   videoPhase is already 'WAITING_END' (set by onended of start.mp4)
  //   end.mp4 is already loaded and paused
  //   → just play it now
  //
  // SCENARIO B — someone bid, team video is looping, timer ran out:
  //   videoPhase is 'TEAM_BIDDING'
  //   → switch to end.mp4, load it, play it immediately
  //   (no static pause needed — we go straight to playing)
  //
  const onTimerExpired = useCallback(() => {
    const phase = videoPhaseRef.current;

    // Already past this point — do nothing
    if (phase === 'OUTRO_PLAYING' || phase === 'RESULT_SHOWN') return;

    // Set phase immediately
    videoPhaseRef.current = 'OUTRO_PLAYING';
    setVideoPhase('OUTRO_PLAYING');
    setBidCooldownFrozen(true);

    if (videoRef.current) {
      const video = videoRef.current;
      video.onended = null;
      video.oncanplay = null;
      video.loop = false;

      if (phase === 'WAITING_END') {
        // SCENARIO A: end.mp4 already loaded and paused — just play
        video.currentTime = 0;
        video.play()?.catch(err => console.log('end.mp4 play (A):', err));
      } else {
        // SCENARIO B: team video was playing — switch to end.mp4 and play
        video.oncanplay = () => {
          video.oncanplay = null;
          if (videoPhaseRef.current === 'OUTRO_PLAYING') {
            video.currentTime = 0;
            video.play()?.catch(err => console.log('end.mp4 play (B):', err));
          }
        };
        video.src = '/videos/end.mp4';
        video.load();
      }
    }

    // Show SOLD/UNSOLD overlay 2900ms into end.mp4 playback
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    resultTimeoutRef.current = setTimeout(() => {
      videoPhaseRef.current = 'RESULT_SHOWN';
      setVideoPhase('RESULT_SHOWN');
    }, 2900);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      [introTimeoutRef, resultTimeoutRef, bidCooldownRef]
        .forEach(ref => { if (ref.current) clearTimeout(ref.current); });
      if (videoRef.current) {
        videoRef.current.onended = null;
        videoRef.current.oncanplay = null;
      }
    };
  }, []);

  return {
    startPlayerIntro,
    onBidPlaced,
    enterWaitingEnd: loadEndVideoStatic, // kept same name for socket wiring compat
    onTimerExpired,
    updateTimerTicks,
    markGraphicsReady,
    getGraphicsReady,
    graphicsReady,
    auctionReadyForBids,
    introFrozen,
    bidCooldownFrozen,
    videoPhase,
    videoRef,
    getVideoPhase,
  };
};
