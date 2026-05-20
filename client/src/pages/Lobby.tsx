import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketContext } from '../SocketContext';
import { TEAMS, ALL_TEAM_IDS } from '../constants/teams';
import type { TeamId } from '../types';
import toast from 'react-hot-toast';

export default function Lobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { roomState, myTeamId, selectTeam, startAuction, kickPlayer, socket } = useSocketContext();

  useEffect(() => {
    if (roomState?.auction.isStarted && roomCode) {
      navigate(`/auction/${roomCode}`);
    }
  }, [roomState?.auction.isStarted, roomCode, navigate]);

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

  // Toast for player join/leave
  const prevPlayerCount = useRef(0);
  useEffect(() => {
    if (!roomState) return;
    const currentCount = roomState.players.length;
    if (currentCount > prevPlayerCount.current && prevPlayerCount.current > 0) {
      const newest = roomState.players[currentCount - 1];
      toast(`${newest.name} joined the arena! 🏟️`, { 
        duration: 3000,
        style: { borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #1e293b' }
      });
    }
    prevPlayerCount.current = currentCount;
  }, [roomState?.players.length]);

  useEffect(() => {
    if (!socket) return;
    const handleError = ({ message }: { message: string }) => toast.error(message, { 
      duration: 4000,
      style: { borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #1e293b' }
    });
    socket.on('error', handleError);
    return () => { socket.off('error', handleError); };
  }, [socket]);

  if (!roomState) return <div className="h-screen bg-gray-950 flex items-center justify-center">
     <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>;

  const me = roomState.players.find(p => p.socketId === socket?.id);
  const isHost = me?.isHost;
  const allReady = roomState.players.every(p => p.isReady);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans overflow-y-auto selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-1 bg-blue-500 rounded-full"></span>
              <span className="text-xs font-black tracking-[0.4em] uppercase text-blue-500">Lobby Room</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
              WAITING <span className="text-gray-500">AREA</span>
            </h1>
          </div>
          
          <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 backdrop-blur-md flex items-center gap-6 shadow-2xl">
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Access Code</p>
              <h2 className="text-4xl font-black font-mono tracking-tighter text-blue-400">{roomCode}</h2>
            </div>
            <button 
              onClick={() => {
                const joinUrl = `${window.location.origin}/lobby/${roomCode}`;
                navigator.clipboard.writeText(joinUrl);
                toast.success('Referral link copied!', { style: { borderRadius: '12px', background: '#0f172a', color: '#fff' } });
              }}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Players Panel */}
          <div className="lg:col-span-4 glass rounded-[2.5rem] border-white/5 overflow-hidden flex flex-col p-8">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black tracking-tight">Managers <span className="text-gray-500 ml-2">({roomState.players.length}/10)</span></h3>
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            </div>
            
            <div className="space-y-4 flex-grow">
              {roomState.players.map(p => (
                <div key={p.socketId} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group transition-all hover:bg-white/[0.08]">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black p-1 bg-white/5 ${p.teamId ? 'border border-white/10' : 'text-white/20 border border-dashed border-white/20'}`}>
                    {p.teamId ? (
                      <img src={TEAMS[p.teamId].logoUrl} alt={p.teamId} className="w-[85%] h-[85%] object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                    ) : (
                      p.name[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{p.name}</p>
                      {p.isHost && <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-blue-500/30">Host</span>}
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">
                      {p.teamId ? TEAMS[p.teamId].name : 'Choosing...'}
                    </p>
                  </div>
                  {isHost && p.socketId !== socket?.id && (
                    <button
                      onClick={() => roomCode && kickPlayer(roomCode, p.socketId)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/25 rounded-xl text-red-400 hover:text-red-300 flex items-center justify-center"
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
              <div className="mt-10">
                <button 
                  onClick={() => roomCode && startAuction(roomCode)}
                  disabled={!allReady}
                  className="w-full relative overflow-hidden bg-white text-black font-black text-lg py-5 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-20 disabled:hover:translate-y-0 active:scale-95 group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    INITIALIZE AUCTION
                    <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
                  </span>
                  <div className="absolute inset-0 bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
                <p className="text-[9px] text-center mt-4 font-black uppercase tracking-[0.2em] text-gray-500">
                  Waiting for all managers to pick teams
                </p>
              </div>
            )}
          </div>

          {/* Teams Selection Panel */}
          <div className="lg:col-span-8 glass rounded-[2.5rem] border-white/5 overflow-hidden p-8 flex flex-col">
            <div className="mb-8">
               <h3 className="text-xl font-black tracking-tight">Select Franchise</h3>
               <p className="text-xs text-gray-500 mt-1 font-medium tracking-wide">Each manager must lead a unique IPL franchise.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
              {ALL_TEAM_IDS.map((teamId: TeamId) => {
                const team = TEAMS[teamId];
                const teamState = roomState.teams[teamId];
                const isTaken = teamState.ownerId !== null;
                const isMine = myTeamId === teamId;
                
                return (
                  <div 
                    key={teamId}
                    onClick={() => !isTaken && roomCode && selectTeam(roomCode, teamId)}
                    className={`relative group h-40 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${
                      isTaken && !isMine ? 'opacity-30 grayscale cursor-not-allowed border-transparent' : 
                      isMine ? 'ring-4 ring-blue-500 scale-105 shadow-2xl' : 
                      'bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02]'
                    }`}
                  >
                    {/* Team Color Background */}
                    <div className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: team.primaryColor }}></div>
                    
                    <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center">
                      <div 
                        className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 duration-500 p-2.5 bg-white/10 backdrop-blur-sm border border-white/10" 
                        style={{ boxShadow: `0 10px 30px ${team.primaryColor}40` }}
                      >
                         <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
                      </div>
                      <p className="font-black text-xs uppercase tracking-widest">{team.shortName}</p>
                      {isTaken && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                           <span className="text-[7px] font-black uppercase tracking-widest text-white/70">{teamState.ownerName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
