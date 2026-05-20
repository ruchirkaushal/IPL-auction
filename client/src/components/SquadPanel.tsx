import type { TeamState } from '../types';
import { useSocketContext } from '../SocketContext';
import { formatAuctionMoney } from '../../../shared/auctionPricing';

interface SquadPanelProps {
  myTeam: TeamState | null;
}

export default function SquadPanel({ myTeam }: SquadPanelProps) {
  const { allPlayers } = useSocketContext();
  
  return (
    <div className="h-full flex flex-col p-6 bg-[#0a0a0a]">
      <div className="mb-8">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-500/60 mb-1">Team Roster</h2>
        <h3 className="text-2xl font-black text-white tracking-tighter">My Squad <span className="text-gray-500">({myTeam?.squad.length || 0})</span></h3>
      </div>
      
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
        {myTeam && myTeam.squad.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
            <div className="w-16 h-16 border border-dashed border-white rounded-full mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-center">Empty Squad</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...(myTeam?.squad || [])].reverse().map(item => {
              const player = allPlayers.find(p => p.id === item.id);
              return (
                <div key={item.id} className="group glass p-4 rounded-2xl border-white/5 hover:border-blue-500/20 transition-all hover:bg-blue-500/[0.02]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white text-sm tracking-tight group-hover:text-blue-400 transition-colors">{player?.name || item.id}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{player?.role}</span>
                        {player?.isOverseas && <span className="text-[9px]">✈️</span>}
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-white font-outfit tracking-tighter">{formatAuctionMoney(item.price)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
