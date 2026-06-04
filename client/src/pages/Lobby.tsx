import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketContext } from '../SocketContext';
import { TEAMS, ALL_TEAM_IDS } from '../constants/teams';
import type { TeamId } from '../types';
import toast from 'react-hot-toast';
import ChatPanel from '../components/ChatPanel';
import useDeviceDetect from '../hooks/useDeviceDetect';
import RotateDeviceOverlay from '../components/RotateDeviceOverlay';

export default function Lobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { roomState, myTeamId, selectTeam, startAuction, kickPlayer, socket, socketError } = useSocketContext();
  const { isPhone, isPortrait } = useDeviceDetect();

  useEffect(() => {
    if (roomState?.auction.isStarted && roomCode) {
      navigate(`/auction/${roomCode}`);
    }
  }, [roomState?.auction.isStarted, roomCode, navigate]);

  // Toast for player join/leave using stable user IDs to avoid reconnect bounce alerts
  const prevPlayerIds = useRef<string[]>([]);
  useEffect(() => {
    if (!roomState) return;
    const currentPlayerIds = roomState.players.map(p => p.userId ?? p.name);
    const newIds = currentPlayerIds.filter(id => !prevPlayerIds.current.includes(id));
    if (newIds.length > 0 && prevPlayerIds.current.length > 0) {
      const newestId = newIds[newIds.length - 1];
      const newest = roomState.players.find(p => (p.userId ?? p.name) === newestId);
      if (newest) {
        toast(`${newest.name} joined the arena! 🏟️`, { 
          duration: 3000,
          style: { borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #1e293b' }
        });
      }
    }
    prevPlayerIds.current = currentPlayerIds;
  }, [roomState?.players]);

  useEffect(() => {
    if (!socketError || roomState) return;
    toast.error(socketError, {
      duration: 5000,
      style: { borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #1e293b' }
    });
    const timer = setTimeout(() => {
      if (!roomState) {
        navigate(`/?roomCode=${roomCode}`);
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [socketError, roomState, roomCode, navigate]);

  if (!roomState) return <div className="h-screen bg-gray-950 flex items-center justify-center">
     <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>;

  const me = roomState.players.find(p => p.socketId === socket?.id);
  const myRole = me?.role ?? 'spectator';
  const isHost = me?.isHost;
  const managers = roomState.players.filter(p => p.role === 'manager');
  const spectators = roomState.players.filter(p => p.role === 'spectator');
  const allReady = managers.length > 0 && managers.every(p => p.isReady && p.teamId !== null);

  if (isPhone && isPortrait) {
    return <RotateDeviceOverlay />;
  }

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden">
      <div className="flex-1 flex flex-col p-4 min-h-0">
        
        {/* Header Section */}
        <div className="flex flex-row justify-between items-center mb-4 gap-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-6 h-0.5 bg-blue-500 rounded-full"></span>
              <span className="text-[10px] font-black tracking-[0.4em] uppercase text-blue-500">Lobby Room</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
              WAITING <span className="text-gray-500">AREA</span>
            </h1>
            {myRole === 'spectator' && (
              <p className="mt-3 text-sm uppercase tracking-[0.25em] text-cyan-300 font-black">You are spectating until you select a team.</p>
            )}
          </div>
          
          <div className="bg-white/5 px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-md flex items-center gap-4 shadow-2xl">
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Access Code</p>
              <h2 className="text-lg md:text-2xl font-black font-mono tracking-tighter text-blue-400">{roomCode}</h2>
            </div>
            <button 
              onClick={() => {
                const joinUrl = `${window.location.origin}/lobby/${roomCode}`;
                navigator.clipboard.writeText(joinUrl);
                toast.success('Referral link copied!', { style: { borderRadius: '12px', background: '#0f172a', color: '#fff' } });
              }}
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-12 gap-4 flex-1 min-h-0 overflow-y-auto md:overflow-visible custom-scrollbar">
          
          {/* Players Panel / Stats Bar */}
          <div className="md:col-span-3 glass rounded-2xl md:rounded-[2rem] border-white/5 md:overflow-hidden flex flex-col md:p-4 shrink-0">
            {/* Desktop Header */}
            <div className="hidden md:flex justify-between items-center mb-4">
               <h3 className="text-base font-black tracking-tight">Managers <span className="text-gray-500 ml-1">({managers.length}/10)</span></h3>
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            </div>
            
            {/* Mobile Stats Bar */}
            <div className="md:hidden flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">group</span> Managers</span>
                <span className="text-sm font-black text-white">{managers.length} / 10</span>
              </div>
              <div className="w-px h-6 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">visibility</span> Spectators</span>
                <span className="text-sm font-black text-white">{spectators.length}</span>
              </div>
              <div className="w-px h-6 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">Room Status</span>
                <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> WAITING</span>
              </div>
            </div>

            {/* Desktop Detailed Player List */}
            <div className="hidden md:flex md:flex-col space-y-2.5 flex-grow overflow-y-auto custom-scrollbar">
              {roomState.players.map(p => (
                <div key={p.socketId} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group transition-all hover:bg-white/[0.08]">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black p-1 bg-white/5 ${p.teamId ? 'border border-white/10' : 'text-white/20 border border-dashed border-white/20'}`}>
                    {p.teamId ? (
                      <img src={TEAMS[p.teamId].logoUrl} alt={p.teamId} className="w-[85%] h-[85%] object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                    ) : (
                      p.name[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="relative group/status flex items-center">
                        <div className={`w-2 h-2 rounded-full ${p.socketId ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-gray-500'}`}></div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/status:block px-2 py-1 bg-black/90 backdrop-blur-sm text-white text-[9px] uppercase tracking-widest font-black rounded border border-white/10 whitespace-nowrap z-50">
                           {p.socketId ? 'Online' : 'Offline / Disconnected'}
                        </div>
                      </div>
                      <p className="font-bold text-sm truncate">{p.name}</p>
                      {p.isHost && <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-blue-500/30">Host</span>}
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5 truncate">
                      {p.teamId ? TEAMS[p.teamId].name : 'SPECTATOR'}
                    </p>
                  </div>
                  {isHost && p.socketId !== socket?.id && (
                    <button
                      onClick={() => roomCode && kickPlayer(roomCode, p.socketId)}
                      className="text-white/20 group-hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/25 rounded-xl flex items-center justify-center"
                      title="Kick Player"
                    >
                      <span className="material-symbols-outlined text-lg">person_remove</span>
                    </button>
                  )}
                  {p.isReady && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                       <span className="material-symbols-outlined text-emerald-400 text-xs font-bold">check</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isHost && (
              <div className="mt-4 md:mt-4">
                <button 
                  onClick={() => roomCode && startAuction(roomCode)}
                  disabled={!allReady}
                  className="w-full relative overflow-hidden bg-white text-black font-black text-[11px] md:text-sm py-3.5 md:py-3.5 rounded-2xl md:rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-20 disabled:hover:translate-y-0 active:scale-95 group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    INITIALIZE AUCTION
                    <span className="material-symbols-outlined text-base md:text-[20px]">rocket_launch</span>
                  </span>
                  <div className="absolute inset-0 bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
              </div>
            )}
          </div>

          {/* Teams Selection Panel */}
          <div className="md:col-span-6 glass rounded-2xl md:rounded-[2rem] border-white/5 md:overflow-y-auto custom-scrollbar p-3 md:p-4 flex flex-col shrink-0">
            <div className="mb-4 flex items-center justify-between">
               <div>
                 <h3 className="text-sm md:text-base font-black tracking-tight uppercase">Choose Your Franchise</h3>
                 <p className="text-[9px] md:text-[10px] text-gray-500 mt-0.5 font-medium tracking-wide">Select an available team to become a manager.</p>
               </div>
               <div className="hidden md:flex items-center gap-3">
                 <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div><span className="text-[10px] font-bold text-gray-400">Available</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span className="text-[10px] font-bold text-gray-400">Taken</span></div>
               </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {ALL_TEAM_IDS.map((teamId: TeamId) => {
                const team = TEAMS[teamId];
                const teamState = roomState.teams[teamId];
                const isTaken = teamState.ownerId !== null;
                const isMine = myTeamId === teamId;
                
                return (
                  <div 
                    key={teamId}
                    onClick={() => !isTaken && roomCode && selectTeam(roomCode, teamId)}
                    className={`relative group h-36 md:h-32 rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ${
                      isTaken && !isMine ? 'opacity-40 grayscale cursor-not-allowed border-transparent' : 
                      isMine ? 'ring-2 ring-blue-500 scale-105 shadow-2xl bg-blue-500/10' : 
                      'bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02]'
                    }`}
                  >
                    {/* Team Color Background */}
                    <div className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: team.primaryColor }}></div>
                    
                    <div className="absolute inset-0 p-3 md:p-4 flex flex-col items-center justify-center text-center">
                      <div 
                        className="w-16 h-16 md:w-12 md:h-12 rounded-xl mb-2 flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 duration-500 p-2 md:p-2 bg-white/10 backdrop-blur-sm border border-white/10" 
                        style={{ boxShadow: `0 10px 30px ${team.primaryColor}40` }}
                      >
                         <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
                      </div>
                      <p className="font-black text-xs md:text-xs uppercase tracking-widest leading-tight mb-1">{team.shortName}</p>
                      
                      {/* Badges */}
                      <div className="mt-auto">
                        {isMine ? (
                          <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">
                            YOU (MANAGER)
                          </span>
                        ) : isTaken ? (
                          <span className="text-[8px] font-black uppercase tracking-widest text-red-400 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">
                            TAKEN
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                            AVAILABLE
                          </span>
                        )}
                      </div>
                      
                      {isTaken && !isMine && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                           <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                           <span className="text-[7px] font-black uppercase tracking-widest text-white/70">{teamState.ownerName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="md:col-span-3 rounded-2xl md:rounded-[2rem] border border-white/5 overflow-hidden flex flex-col bg-[#0a0a0a] h-96 md:h-auto shrink-0 mb-4 md:mb-0">
            {roomCode && <ChatPanel roomCode={roomCode} showSystemMessages={false} />}
          </div>

        </div>
      </div>
    </div>
  );
}
