import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketContext } from '../SocketContext';
import type { Player, TeamId } from '../types';
import toast from 'react-hot-toast';
import { INITIAL_PURSE_LAKHS, MAX_OVERSEAS_PLAYERS, MAX_SQUAD_SIZE } from '../../../shared/auctionConfig';
import { formatAuctionMoney } from '../../../shared/auctionPricing';
import { TEAMS } from '../constants/teams';

export default function Summary() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { roomState, resetRoom, socket } = useSocketContext();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [copiedTeam, setCopiedTeam] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3005'}/api/players`)
      .then(res => res.json())
      .then(data => setAllPlayers(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleReset = () => {
      navigate(`/lobby/${roomCode}`);
    };
    socket.on('room_reset', handleReset);
    return () => {
      socket.off('room_reset', handleReset);
    };
  }, [socket, navigate, roomCode]);

  useEffect(() => {
    if (socket && (!roomState || allPlayers.length === 0)) {
      const playerName = localStorage.getItem('playerName');
      if (!playerName) {
        navigate(`/?roomCode=${roomCode}`);
        return;
      }
      const timer = setTimeout(() => {
        if (!roomState) {
          navigate(`/?roomCode=${roomCode}`);
        }
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [socket, roomState, allPlayers.length, roomCode, navigate]);

  const { teamData, mostExpensivePlayer } = useMemo(() => {
    if (!roomState || allPlayers.length === 0) return { teamData: [], mostExpensivePlayer: null as { player: Player, teamId: TeamId, price: number } | null };
    
    let maxPrice = -1;
    let maxPlayer: { player: Player, teamId: TeamId, price: number } | null = null;

    const data = Object.entries(roomState.teams).map(([id, team]) => {
      const squadPlayers = team.squad.map(item => {
        const p = allPlayers.find(p => p.id === item.id);
        if (p && item.price > maxPrice) {
          maxPrice = item.price;
          maxPlayer = { player: p, teamId: id as TeamId, price: item.price };
        }
        return p ? { ...p, soldPrice: item.price } : null;
      }).filter(Boolean) as (Player & { soldPrice: number })[];
      
      const roles = {
        BAT: squadPlayers.filter(p => p.role === 'BAT'),
        WK: squadPlayers.filter(p => p.role === 'WK'),
        AR: squadPlayers.filter(p => p.role === 'AR'),
        BOWL: squadPlayers.filter(p => p.role === 'BOWL'),
      };
      
      const spent = INITIAL_PURSE_LAKHS - team.purseRemaining;
      
      return {
        id: id as TeamId,
        team,
        squadPlayers,
        roles,
        spent,
      };
    });

    return { teamData: data, mostExpensivePlayer: maxPlayer };
  }, [roomState, allPlayers]);

  const handleCopySquad = (teamId: string, teamName: string, roles: any, spent: number, remaining: number) => {
    const formatRoleLine = (players: any[]) => {
      return players.map(p => `${p.name} (${formatAuctionMoney(p.soldPrice)})`).join(', ') || 'None';
    };

    const batText = formatRoleLine(roles.BAT);
    const wkText = formatRoleLine(roles.WK);
    const arText = formatRoleLine(roles.AR);
    const bowlText = formatRoleLine(roles.BOWL);

    const text = `--- ${teamName.toUpperCase()} SQUAD ---
* Batsmen: ${batText}
* Wicket Keepers: ${wkText}
* All-Rounders: ${arText}
* Bowlers: ${bowlText}
Total Spent: ${formatAuctionMoney(spent)} | Purse Remaining: ${formatAuctionMoney(remaining)}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedTeam(teamId);
      setTimeout(() => setCopiedTeam(null), 2000);
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'BAT': return 'Batsmen';
      case 'WK': return 'Wicket Keepers';
      case 'AR': return 'All Rounders';
      case 'BOWL': return 'Bowlers';
      default: return role;
    }
  };

  if (!roomState || allPlayers.length === 0) {
    return <div className="p-8 text-white flex justify-center items-center h-screen bg-gray-950">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold tracking-widest uppercase text-emerald-400">Generating Summary...</p>
      </div>
    </div>;
  }

  const isHost = roomState.hostId === socket?.id;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans overflow-y-auto selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
              <span className="text-xs font-black tracking-[0.4em] uppercase text-emerald-500">Post-Auction Report</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
              AUCTION <span className="text-gray-500">SUMMARY</span>
            </h1>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            {mostExpensivePlayer && (
              <div className="glass px-6 py-4 rounded-3xl border-emerald-500/20 flex items-center gap-4 bg-emerald-500/[0.03]">
                 <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl">🏆</div>
                 <div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Most Expensive</p>
                    <p className="text-sm font-black text-white">{mostExpensivePlayer.player.name}</p>
                    <p className="text-xs font-bold text-gray-400 font-outfit">{formatAuctionMoney(mostExpensivePlayer.price)} ({mostExpensivePlayer.teamId})</p>
                 </div>
              </div>
            )}

            <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
               <div className="text-right">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Players Sold</p>
                 <p className="text-2xl font-black text-white">{Object.values(roomState.teams).reduce((acc, t) => acc + t.squad.length, 0)}</p>
               </div>
               <div className="w-px h-8 bg-white/10"></div>
               <div className="text-right">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Room Code</p>
                 <p className="text-2xl font-black text-blue-400 font-mono">{roomCode}</p>
               </div>
            </div>

            <button 
              onClick={() => {
                if (isHost) {
                  if (roomCode) resetRoom(roomCode);
                } else {
                  toast.error('Only the Host can start a new auction!', {
                    style: { borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #1e293b' }
                  });
                }
              }}
              className={`group relative overflow-hidden px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${
                isHost 
                  ? 'bg-white text-black' 
                  : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              <span className="relative z-10">Start New Auction</span>
              {isHost && <div className="absolute inset-0 bg-emerald-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamData.map((data) => {
            const teamInfo = TEAMS[data.id];
            const primaryColor = teamInfo?.primaryColor || '#121212';
            
            return (
              <div 
                key={data.id} 
                className="group rounded-[2.5rem] bg-[#0c0c0c] border border-white/5 overflow-hidden flex flex-col transition-all hover:border-white/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative"
                style={{ 
                  boxShadow: `inset 0 0 40px ${primaryColor}10`
                }}
              >
                {/* Visual Accent Top Line using Team Color */}
                <div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }} />

                {/* Card Header */}
                <div className="p-8 pb-5 bg-white/[0.02] border-b border-white/5 relative overflow-hidden flex justify-between items-start">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1.5">
                      {teamInfo?.logoUrl && (
                        <img src={teamInfo.logoUrl} alt={teamInfo.name} className="w-8 h-8 object-contain" />
                      )}
                      <h2 className="text-3xl font-black tracking-tight uppercase" style={{ color: primaryColor }}>
                        {teamInfo?.shortName || data.id}
                      </h2>
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {data.team.ownerName ? `Manager: ${data.team.ownerName}` : 'AI Franchise'}
                    </p>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Purse Left</p>
                    <p className="text-2xl font-black font-outfit text-[#F5A623] tracking-tighter">
                      {formatAuctionMoney(data.team.purseRemaining)}
                    </p>
                  </div>
                </div>
                
                {/* Card Stats Bar */}
                <div className="px-8 py-3.5 bg-white/[0.01] border-b border-white/5 flex justify-between items-center">
                  <div className="text-center">
                     <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Spent</p>
                     <p className="text-xs font-bold text-white font-outfit">{formatAuctionMoney(data.spent)}</p>
                  </div>
                  <div className="w-px h-6 bg-white/10"></div>
                  <div className="text-center">
                     <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Squad Size</p>
                     <p className="text-xs font-bold text-white">{data.team.squad.length}/{MAX_SQUAD_SIZE}</p>
                  </div>
                  <div className="w-px h-6 bg-white/10"></div>
                  <div className="text-center">
                     <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Overseas</p>
                     <p className="text-xs font-bold text-purple-400">{data.team.overseasCount}/{MAX_OVERSEAS_PLAYERS}</p>
                  </div>
                </div>

                {/* Squad List */}
                <div className="p-8 flex-grow">
                  <div className="space-y-5">
                    {Object.entries(data.roles).map(([role, players]) => {
                      if (players.length === 0) return null;

                      return (
                        <div key={role} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-[#00e5ff] tracking-widest uppercase">
                              {getRoleLabel(role)}
                            </span>
                            <span className="text-[10px] font-bold text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                              {players.length}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {players.map(p => (
                              <div 
                                key={p.id} 
                                className="flex items-center justify-between py-1.5 px-2.5 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl text-xs font-medium transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-5 h-5 rounded-full overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center">
                                    <img 
                                      src={p.image || p.photoUrl} 
                                      alt={p.name} 
                                      className="w-full h-full object-cover object-top"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png';
                                      }}
                                    />
                                  </div>
                                  <span className="text-white/90 truncate">{p.name}</span>
                                  {p.isOverseas && <span className="text-[9px] opacity-60">✈️</span>}
                                </div>
                                <span className="font-bold text-gray-400 font-outfit shrink-0 ml-2">
                                  {formatAuctionMoney(p.soldPrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    
                    {data.squadPlayers.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 opacity-20">
                        <div className="w-12 h-12 border border-dashed border-white rounded-full mb-4"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">No Players Bought</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Copy Squad Action Bar */}
                <div className="p-6 pt-0 bg-transparent relative z-10 mt-auto">
                  <button
                    onClick={() => handleCopySquad(
                      data.id,
                      teamInfo?.name || data.id,
                      data.roles,
                      data.spent,
                      data.team.purseRemaining
                    )}
                    className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">
                      {copiedTeam === data.id ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedTeam === data.id ? 'Copied!' : 'Copy Squad'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
