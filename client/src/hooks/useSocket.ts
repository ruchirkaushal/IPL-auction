import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useVideoManager } from './useVideoManager';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { auctionActions } from '../store/auctionSlice';
import { playersActions } from '../store/playersSlice';
import type {
  RoomState,
  TeamId,
  BidPlacedPayload,
  BidRejectedPayload,
  PlayerSoldPayload,
  PlayerUnsoldPayload,
  TimerUpdatePayload,
  PlayerAdvancingPayload,
  RoomUnavailablePayload,
} from '../types';

const VITE_SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3005' : window.location.origin);
type TimerTickListener = (ticks: number) => void;

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const roomState = useAppSelector((state) => state.auction.roomState);
  const allPlayers = useAppSelector((state) => state.players.allPlayers);
  const myTeamId = useAppSelector((state) => state.auction.myTeamId);
  const lastBid = useAppSelector((state) => state.auction.lastBid);
  const lastBidRejected = useAppSelector((state) => state.auction.lastBidRejected);
  const lastSold = useAppSelector((state) => state.auction.lastSold);
  const lastUnsold = useAppSelector((state) => state.auction.lastUnsold);
  const lastAdvancing = useAppSelector((state) => state.auction.lastAdvancing);
  const isConnected = useAppSelector((state) => state.auction.isConnected);
  const socketError = useAppSelector((state) => state.auction.socketError);
  const [socket, setSocket] = useState<Socket | null>(null);

  const videoManager = useVideoManager();
  const videoManagerRef = useRef(videoManager);
  const pendingTimerTicksRef = useRef<number | null>(null);
  const timerListenersRef = useRef(new Set<TimerTickListener>());
  const lastLoggedSecondRef = useRef<number | null>(null);
  const roomStateRef = useRef<RoomState | null>(null);
  const lastServerActivityAtRef = useRef<number>(Date.now());

  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  useEffect(() => {
    if (!roomState || !socket) return;
    const me = roomState.players.find((player) => player.socketId === socket.id) ?? null;
    dispatch(auctionActions.setMyTeamId(me?.teamId ?? null));
  }, [roomState, socket, dispatch]);

  const subscribeTimerTicks = useCallback((listener: TimerTickListener) => {
    timerListenersRef.current.add(listener);
    return () => {
      timerListenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    videoManagerRef.current = videoManager;
  }, [videoManager]);

  useEffect(() => {
    if (videoManager.graphicsReady && pendingTimerTicksRef.current !== null) {
      const pendingTicks = pendingTimerTicksRef.current;
      pendingTimerTicksRef.current = null;
      if (pendingTicks === 0) {
        videoManager.onTimerExpired();
      }
    }
  }, [videoManager.graphicsReady, videoManager]);

  useEffect(() => {
    if (!import.meta.env.DEV && !import.meta.env.VITE_SERVER_URL) {
      console.warn('[Socket] VITE_SERVER_URL not set in production. Falling back to current origin.');
    }

    fetch(`${VITE_SERVER_URL}/api/players`)
      .then(res => res.json())
      .then(data => dispatch(playersActions.setAllPlayers(data)))
      .catch(err => console.error('Failed to fetch players:', err));

    const newSocket = io(VITE_SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`[Socket] connected ${newSocket.id}`);
      lastServerActivityAtRef.current = Date.now();
      dispatch(auctionActions.setSocketConnected(true));
      dispatch(auctionActions.setSocketError(null));
      const match = window.location.pathname.match(/\/(lobby|auction|summary)\/([^/]+)/);
      if (match) {
        const roomCode = match[2];
        const playerName = localStorage.getItem('playerName');
        let userId = localStorage.getItem('ipl_auction_user_id');
        if (!userId) {
          userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('ipl_auction_user_id', userId);
        }
        if (roomCode && (!playerName || !userId)) {
          window.location.href = `/?roomCode=${roomCode}`;
          return;
        }
        if (roomCode && playerName && userId) {
          newSocket.emit('join_room', { roomCode, playerName, userId });
        }
      }
    });
    newSocket.on('disconnect', (reason, details) => {
      const disconnectDetails = details as { message?: string; description?: string } | undefined;
      console.warn('[Socket] disconnected', {
        reason,
        message: disconnectDetails?.message,
        description: disconnectDetails?.description,
      });
      dispatch(auctionActions.setSocketConnected(false));
    });
    newSocket.on('connect_error', (error: Error) => {
      dispatch(auctionActions.setSocketError(error.message || 'Socket connection failed.'));
      console.error('Socket connect error:', error);
    });
    newSocket.on('connect_timeout', () => {
      dispatch(auctionActions.setSocketError('Socket connection timed out.'));
      console.error('Socket connection timed out');
    });
    newSocket.on('reconnect_failed', () => {
      dispatch(auctionActions.setSocketError('Socket reconnect failed.'));
      console.error('Socket reconnect failed');
    });
    newSocket.io.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket] reconnect attempt ${attempt}`);
    });
    newSocket.io.on('reconnect', (attempt) => {
      console.log(`[Socket] reconnected after ${attempt} attempts`);
    });

    newSocket.on('room_state_update', (state: RoomState) => {
      lastServerActivityAtRef.current = Date.now();
      dispatch(auctionActions.setSocketError(null));
      roomStateRef.current = state;
      dispatch(auctionActions.setRoomState(state));
      const currentPlayerId = state.auction.auctionQueue[state.auction.currentPlayerIndex] ?? null;
      console.log(
        `[RoomState ${state.roomCode}] phase=${state.auction.phase} idx=${state.auction.currentPlayerIndex}/${state.auction.auctionQueue.length} paused=${state.auction.isPaused} ticks=${state.auction.ticks} current=${currentPlayerId ?? 'none'}`
      );
      const me = state.players.find(p => p.socketId === newSocket.id);
      if (me) {
        dispatch(auctionActions.setMyTeamId(me.teamId));
        localStorage.setItem('ipl_auction_room_code', state.roomCode);
        localStorage.setItem('playerName', me.name);
        if (me.teamId) {
          localStorage.setItem('ipl_auction_selected_team', me.teamId);
        } else {
          localStorage.removeItem('ipl_auction_selected_team');
        }
        localStorage.setItem('ipl_auction_is_host', me.isHost ? 'true' : 'false');
        localStorage.setItem('ipl_auction_session_state', JSON.stringify({
          roomId: state.roomCode,
          username: me.name,
          selectedTeam: me.teamId,
          isHost: me.isHost
        }));
      }
    });

    newSocket.on('timer_update', (payload: TimerUpdatePayload) => {
      lastServerActivityAtRef.current = Date.now();
      dispatch(auctionActions.setTimerTicks(payload.ticks));
      videoManagerRef.current.updateTimerTicks(payload.ticks);
      timerListenersRef.current.forEach((listener) => {
        try {
          listener(payload.ticks);
        } catch (listenerError) {
          console.error('[Socket] timer listener failed:', listenerError);
        }
      });

      if (payload.ticks > 0 && payload.ticks % 10 === 0 && lastLoggedSecondRef.current !== payload.ticks) {
        lastLoggedSecondRef.current = payload.ticks;
        console.log(`[Timer] ticks=${payload.ticks}`);
      }

      if (videoManagerRef.current.getGraphicsReady()) {
        if (payload.ticks === 0) {
          videoManagerRef.current.onTimerExpired();
        }
      } else {
        pendingTimerTicksRef.current = payload.ticks;
      }
    });

    newSocket.on('bid_placed', (payload: BidPlacedPayload) => {
      lastServerActivityAtRef.current = Date.now();
      dispatch(auctionActions.setLastBid(payload));
      const phase = videoManagerRef.current.getVideoPhase();
      if (
        phase !== 'OUTRO_PLAYING' &&
        phase !== 'RESULT_SHOWN'
      ) {
        videoManagerRef.current.onBidPlaced(payload.teamId);
      }
    });

    newSocket.on('bid_rejected', (payload: BidRejectedPayload) => {
      dispatch(auctionActions.setLastBidRejected(payload));
    });

    // ─── KEY CHANGE ───────────────────────────────────────────────────────
    // player_sold and player_unsold no longer trigger enterWaitingEnd()
    // These events just store the result data for the overlay.
    // The video switch is handled entirely by:
    //   - timer hitting 0 → onTimerExpired()
    //   - start.mp4 ending with no bids → loadEndVideoStatic() internally
    // ─────────────────────────────────────────────────────────────────────
    newSocket.on('player_sold', (payload: PlayerSoldPayload) => {
      lastServerActivityAtRef.current = Date.now();
      dispatch(auctionActions.setLastSold(payload));
      // DO NOT call enterWaitingEnd() here
    });

    newSocket.on('player_unsold', (payload: PlayerUnsoldPayload) => {
      lastServerActivityAtRef.current = Date.now();
      dispatch(auctionActions.setLastUnsold(payload));
      // DO NOT call enterWaitingEnd() here
    });

    newSocket.on('player_advancing', (payload: PlayerAdvancingPayload) => {
      lastServerActivityAtRef.current = Date.now();
      dispatch(auctionActions.setLastAdvancing(payload));
    });

    newSocket.on('ai_bid_incoming', (_payload: { teamId: TeamId }) => {
      // optional visual hint
    });

    newSocket.on('auction_complete', (state: RoomState) => {
      lastServerActivityAtRef.current = Date.now();
      roomStateRef.current = state;
      dispatch(auctionActions.setRoomState(state));
    });

    newSocket.on('room_unavailable', (payload: RoomUnavailablePayload) => {
      console.error('[Socket] room_unavailable', payload);
      dispatch(auctionActions.setRoomState(null));
      roomStateRef.current = null;
      dispatch(auctionActions.setSocketError(
        payload.message || 'Auction room is unavailable on server. Please rejoin from lobby.'
      ));
    });

    newSocket.on('kicked', () => {
      localStorage.removeItem('ipl_auction_room_code');
      localStorage.removeItem('ipl_auction_selected_team');
      localStorage.removeItem('ipl_auction_is_host');
      localStorage.removeItem('ipl_auction_session_state');
      toast.error('You have been kicked from the room by the host.', {
        duration: 5000,
        style: { borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #1e293b' }
      });
      window.location.href = '/';
    });

    newSocket.on('room_reset', () => {
      dispatch(auctionActions.clearTransientRoomState());
    });

    newSocket.on('error', (payload: { message: string }) => {
      dispatch(auctionActions.setSocketError(payload.message));
      console.error('Socket error:', payload.message);
    });

    const staleStreamInterval = window.setInterval(() => {
      const state = roomStateRef.current;
      if (!state || !newSocket.connected) return;
      if (document.visibilityState !== 'visible') return;
      if (!state.auction.isStarted || state.auction.isPaused) return;
      if (state.auction.phase !== 'bidding') return;

      const staleForMs = Date.now() - lastServerActivityAtRef.current;
      if (staleForMs > 15000) {
        console.warn(`[Socket] stale stream for ${staleForMs}ms, forcing reconnect`);
        newSocket.disconnect();
        newSocket.connect();
        return;
      }
      if (staleForMs > 7000) {
        console.warn(`[Socket] stale stream for ${staleForMs}ms, requesting room state`);
        newSocket.emit('request_room_state', { roomCode: state.roomCode });
      }
    }, 2000);

    const tryReconnectOnVisibility = () => {
      if (document.visibilityState === 'visible' && !newSocket.connected) {
        console.log('[Socket] tab visible; forcing reconnect');
        newSocket.connect();
      }
      const state = roomStateRef.current;
      if (state && newSocket.connected) {
        newSocket.emit('visibility_change', {
          roomCode: state.roomCode,
          hidden: document.visibilityState === 'hidden'
        });
      }
    };

    const tryReconnectOnOnline = () => {
      if (!newSocket.connected) {
        console.log('[Socket] browser online; forcing reconnect');
        newSocket.connect();
      }
    };

    document.addEventListener('visibilitychange', tryReconnectOnVisibility);
    window.addEventListener('online', tryReconnectOnOnline);

    return () => {
      document.removeEventListener('visibilitychange', tryReconnectOnVisibility);
      window.removeEventListener('online', tryReconnectOnOnline);
      window.clearInterval(staleStreamInterval);
      timerListenersRef.current.clear();
      newSocket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    localStorage.setItem('playerName', playerName);
    let userId = localStorage.getItem('ipl_auction_user_id');
    if (!userId) {
      userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ipl_auction_user_id', userId);
    }
    if (socket) socket.emit('create_room', { playerName, userId });
  }, [socket]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    localStorage.setItem('playerName', playerName);
    let userId = localStorage.getItem('ipl_auction_user_id');
    if (!userId) {
      userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ipl_auction_user_id', userId);
    }
    if (socket) socket.emit('join_room', { roomCode, playerName, userId });
  }, [socket]);

  const selectTeam = useCallback((roomCode: string, teamId: TeamId) => {
    if (socket) socket.emit('select_team', { roomCode, teamId });
  }, [socket]);

  const startAuction = useCallback((roomCode: string) => {
    if (socket) socket.emit('start_auction', { roomCode });
  }, [socket]);

  const placeBid = useCallback((roomCode: string) => {
    if (socket) socket.emit('place_bid', { roomCode });
  }, [socket]);

  const passBid = useCallback((roomCode: string) => {
    if (socket) socket.emit('pass_bid', { roomCode });
  }, [socket]);

  const resetRoom = useCallback((roomCode: string) => {
    if (socket) socket.emit('reset_room', { roomCode });
  }, [socket]);

  const togglePause = useCallback((roomCode: string) => {
    if (socket) socket.emit('toggle_pause', { roomCode });
  }, [socket]);

  const endAuction = useCallback((roomCode: string) => {
    if (socket) socket.emit('end_auction', { roomCode });
  }, [socket]);

  const sendChat = useCallback((roomCode: string, text: string) => {
    if (socket) socket.emit('send_chat', { roomCode, text });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('ipl_auction_room_code');
    localStorage.removeItem('ipl_auction_selected_team');
    localStorage.removeItem('ipl_auction_is_host');
    localStorage.removeItem('ipl_auction_session_state');
    if (socket) socket.emit('leave_room');
  }, [socket]);

  const kickPlayer = useCallback((roomCode: string, targetSocketId: string) => {
    if (socket) socket.emit('kick_player', { roomCode, targetSocketId });
  }, [socket]);

  return {
    socket,
    roomState,
    allPlayers,
    myTeamId,
    lastBid,
    lastBidRejected,
    lastSold,
    lastUnsold,
    lastAdvancing,
    isConnected,
    socketError,
    createRoom,
    joinRoom,
    selectTeam,
    startAuction,
    placeBid,
    passBid,
    resetRoom,
    togglePause,
    endAuction,
    sendChat,
    leaveRoom,
    kickPlayer,
    subscribeTimerTicks,
    videoManager,
  };
};
