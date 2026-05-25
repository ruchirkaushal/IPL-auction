import { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketContext } from '../SocketContext';
import { useAuctionState } from '../hooks/useAuctionState';
import useDeviceDetect from '../hooks/useDeviceDetect';
import toast from 'react-hot-toast';

import DesktopAuctionLayout from '../components/DesktopAuctionLayout';
import MobileLandscapeAuction from '../components/MobileLandscapeAuction';
import RotateDeviceOverlay from '../components/RotateDeviceOverlay';

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
    skipCurrentSet,
    endAuction,
    resetRoom,
    leaveRoom,
    socket,
    socketError
  } = useSocketContext();
  const { canBid } = useAuctionState(roomState, myTeamId, allPlayers);
  const { isPhone, isPortrait } = useDeviceDetect();

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
  const prevIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!roomState?.auction.isStarted) return;

    const currentIndex = roomState.auction.currentPlayerIndex;

    if (currentIndex !== prevIndexRef.current && prevIndexRef.current !== -1) {
      prevIndexRef.current = currentIndex;
      videoManager.startPlayerIntro();
    }

    if (prevIndexRef.current === -1 && roomState.auction.isStarted) {
      prevIndexRef.current = currentIndex;
    }
  }, [roomState?.auction.currentPlayerIndex, roomState?.auction.isStarted]);

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
    if (!socket) return;
    const handleAuctionComplete = () => {
      if (roomCode) {
        navigate(`/summary/${roomCode}`);
      }
    };
    socket.on('auction_complete', handleAuctionComplete);
    return () => {
      socket.off('auction_complete', handleAuctionComplete);
    };
  }, [socket, navigate, roomCode]);

  useEffect(() => {
    if (!socketError || roomState) return;
    toast.error(socketError, { duration: 5000 });
    const timer = setTimeout(() => {
      if (!roomState) {
        navigate(`/?roomCode=${roomCode}`);
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [socketError, roomState, roomCode, navigate]);

  if (!roomState) return (
    <div className="p-8 text-white flex justify-center items-center h-screen bg-gray-950">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold tracking-widest uppercase text-blue-400">Loading Auction...</p>
      </div>
    </div>
  );

  const highestBidderId = roomState.auction.highestBidderId;

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

  const layoutProps = {
    roomCode: roomCode || '',
    roomState,
    allPlayers,
    myTeamId,
    socket,
    videoManager,
    canBid,
    canUserBid,
    isHost,
    soldPlayers,
    unsoldPlayers,
    highestBidderId,
    actions: {
      placeBid,
      togglePause,
      skipCurrentSet,
      endAuction,
      resetRoom,
      leaveRoom,
      navigate
    }
  };

  if (isPhone && isPortrait) {
    return <RotateDeviceOverlay />;
  }

  if (isPhone && !isPortrait) {
    return <MobileLandscapeAuction {...layoutProps} />;
  }

  return <DesktopAuctionLayout {...layoutProps} />;
}

