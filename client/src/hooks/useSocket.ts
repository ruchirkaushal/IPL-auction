import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useVideoManager } from './useVideoManager';
import type {
  RoomState,
  TeamId,
  Player,
  BidPlacedPayload,
  BidRejectedPayload,
  PlayerSoldPayload,
  PlayerUnsoldPayload,
  TimerUpdatePayload,
  PlayerAdvancingPayload
} from '../types';

const VITE_SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3005' : window.location.origin);

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [myTeamId, setMyTeamId] = useState<TeamId | null>(null);
  const [timerTicks, setTimerTicks] = useState<number>(100);
  const [lastBid, setLastBid] = useState<BidPlacedPayload | null>(null);
  const [lastBidRejected, setLastBidRejected] = useState<BidRejectedPayload | null>(null);
  const [lastSold, setLastSold] = useState<PlayerSoldPayload | null>(null);
  const [lastUnsold, setLastUnsold] = useState<PlayerUnsoldPayload | null>(null);
  const [lastAdvancing, setLastAdvancing] = useState<PlayerAdvancingPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  const videoManager = useVideoManager();
  const videoManagerRef = useRef(videoManager);
  const pendingTimerTicksRef = useRef<number | null>(null);

  useEffect(() => {
    videoManagerRef.current = videoManager;
  }, [videoManager]);

  useEffect(() => {
    if (videoManager.graphicsReady && pendingTimerTicksRef.current !== null) {
      const pendingTicks = pendingTimerTicksRef.current;
      pendingTimerTicksRef.current = null;
      setTimerTicks(pendingTicks);
      if (pendingTicks === 0) {
        videoManager.onTimerExpired();
      }
    }
  }, [videoManager.graphicsReady, videoManager]);

  useEffect(() => {
    fetch(`${VITE_SERVER_URL}/api/players`)
      .then(res => res.json())
      .then(data => setAllPlayers(data))
      .catch(err => console.error('Failed to fetch players:', err));

    const newSocket = io(VITE_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setSocketError(null);
      const match = window.location.pathname.match(/\/(lobby|auction|summary)\/([^/]+)/);
      if (match) {
        const roomCode = match[2];
        const playerName = localStorage.getItem('playerName');
        let userId = localStorage.getItem('ipl_auction_user_id');
        if (!userId) {
          userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('ipl_auction_user_id', userId);
        }
        if (roomCode && playerName && userId) {
          newSocket.emit('join_room', { roomCode, playerName, userId });
        }
      }
    });
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('room_state_update', (state: RoomState) => {
      setSocketError(null);
      setRoomState(state);
      const me = state.players.find(p => p.socketId === newSocket.id);
      if (me) {
        setMyTeamId(me.teamId);
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
      videoManagerRef.current.updateTimerTicks(payload.ticks);

      if (videoManagerRef.current.getGraphicsReady()) {
        setTimerTicks(payload.ticks);
        if (payload.ticks === 0) {
          videoManagerRef.current.onTimerExpired();
        }
      } else {
        pendingTimerTicksRef.current = payload.ticks;
      }
    });

    newSocket.on('bid_placed', (payload: BidPlacedPayload) => {
      setLastBid(payload);
      const phase = videoManagerRef.current.getVideoPhase();
      if (
        phase !== 'OUTRO_PLAYING' &&
        phase !== 'RESULT_SHOWN'
      ) {
        videoManagerRef.current.onBidPlaced(payload.teamId);
      }
    });

    newSocket.on('bid_rejected', (payload: BidRejectedPayload) => {
      setLastBidRejected(payload);
    });

    // ─── KEY CHANGE ───────────────────────────────────────────────────────
    // player_sold and player_unsold no longer trigger enterWaitingEnd()
    // These events just store the result data for the overlay.
    // The video switch is handled entirely by:
    //   - timer hitting 0 → onTimerExpired()
    //   - start.mp4 ending with no bids → loadEndVideoStatic() internally
    // ─────────────────────────────────────────────────────────────────────
    newSocket.on('player_sold', (payload: PlayerSoldPayload) => {
      setLastSold(payload);
      // DO NOT call enterWaitingEnd() here
    });

    newSocket.on('player_unsold', (payload: PlayerUnsoldPayload) => {
      setLastUnsold(payload);
      // DO NOT call enterWaitingEnd() here
    });

    newSocket.on('player_advancing', (payload: PlayerAdvancingPayload) => {
      setLastAdvancing(payload);
    });

    newSocket.on('ai_bid_incoming', (_payload: { teamId: TeamId }) => {
      // optional visual hint
    });

    newSocket.on('auction_complete', (state: RoomState) => {
      setRoomState(state);
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
      setMyTeamId(null);
      setLastBid(null);
      setLastBidRejected(null);
      setLastSold(null);
      setLastUnsold(null);
      setLastAdvancing(null);
    });

    newSocket.on('error', (payload: { message: string }) => {
      setSocketError(payload.message);
      console.error('Socket error:', payload.message);
    });

    return () => {
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
    timerTicks,
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
    videoManager,
  };
};
