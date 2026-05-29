
import { useState } from 'react';
import type { TeamState, Player } from '../types';
import { TEAMS } from '../constants/teams';
import { MAX_SQUAD_SIZE } from '../../../shared/auctionConfig';
import { formatAuctionMoney } from '../../../shared/auctionPricing';

interface TeamPanelProps {
  teams: Record<string, TeamState>;
  allPlayers: Player[];
}

export default function TeamPanel({ teams, allPlayers }: TeamPanelProps) {
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'BAT': return 'BATSMEN';
      case 'WK': return 'WICKET KEEPERS';
      case 'AR': return 'ALL ROUNDERS';
      case 'BOWL': return 'BOWLERS';
      default: return 'OTHER';
    }
  };

  return (
    <div className="team-panel-root h-full flex flex-col p-6 bg-[#0a0a0a] border-r border-white/5">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00e5ff] mb-1">Standings</h2>
          <h3 className="text-2xl font-black text-white tracking-tight">Franchises</h3>
        </div>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Live Squads</span>
      </div>
      
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-3">
        {Object.values(teams).map(team => {
          const teamInfo = TEAMS[team.teamId];
          const isExpanded = !!expandedTeams[team.teamId];
          
          // Map and group squad players
          const squadPlayers = team.squad.map(sq => {
            const p = allPlayers.find(pl => pl.id === sq.id);
            return p ? { ...p, price: sq.price } : null;
          }).filter(Boolean) as (Player & { price: number })[];

          const rolesOrder = ['BAT', 'WK', 'AR', 'BOWL'] as const;
          const groupedPlayers = {
            BAT: squadPlayers.filter(p => p.role === 'BAT'),
            WK: squadPlayers.filter(p => p.role === 'WK'),
            AR: squadPlayers.filter(p => p.role === 'AR'),
            BOWL: squadPlayers.filter(p => p.role === 'BOWL')
          };

          return (
              <div 
                key={team.teamId} 
                className={`team-panel-card relative group rounded-2xl transition-all duration-300 border overflow-hidden ${
                  team.status === 'leading' ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 
                  team.status === 'passed' ? 'bg-red-500/5 border-red-500/20 opacity-60' : 
                  'bg-[#121212] border-white/5 hover:border-white/10'
                }`}
              >
              {/* Colored left bar for team identity */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-[4px]" 
                style={{ backgroundColor: teamInfo.primaryColor }}
              />

              {/* Card Header (Clickable to Toggle Dropdown) */}
              <div 
                onClick={() => toggleTeam(team.teamId)}
                className="team-panel-card-header p-4 pl-5 cursor-pointer flex flex-col select-none"
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <img 
                      src={teamInfo.logoUrl} 
                      alt={teamInfo.name} 
                      className="team-panel-logo w-6 h-6 object-contain"
                    />
                    <p className="font-black text-white tracking-tight text-base uppercase">{teamInfo.name}</p>
                    {team.status === 'leading' && (
                      <div className="px-1.5 py-0.5 bg-emerald-500/25 text-emerald-400 rounded text-[7px] font-black uppercase tracking-wider border border-emerald-500/20">
                        Leading
                      </div>
                    )}
                  </div>
                  
                  {/* Chevron Icon */}
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-white' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="team-panel-stats flex justify-between items-center text-xs mt-2 text-gray-400">
                  <span className="text-[10px] font-medium tracking-wide">
                    Manager: <span className="text-white font-bold">{team.ownerName || 'AI Engine'}</span>
                  </span>
                  <span className="text-[10px] font-medium tracking-wide">
                    Squad: <span className="text-white font-bold">{team.squad.length}</span>/{MAX_SQUAD_SIZE}
                  </span>
                </div>

                <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Purse Remaining</span>
                  <span className="team-panel-purse font-black text-[#F5A623] tracking-tighter text-sm font-outfit">
                    {formatAuctionMoney(team.purseRemaining)}
                  </span>
                </div>
              </div>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="border-t border-white/5 bg-black/40 px-4 py-3 max-h-72 overflow-y-auto custom-scrollbar">
                  {squadPlayers.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-2 text-center">No players bought yet</p>
                  ) : (
                    <div className="space-y-4">
                      {rolesOrder.map(role => {
                        const playersInRole = groupedPlayers[role];
                        if (playersInRole.length === 0) return null;

                        return (
                          <div key={role} className="space-y-1.5">
                            <h4 className="text-[9px] font-black text-[#00e5ff] tracking-widest uppercase border-b border-white/5 pb-1">
                              {getRoleLabel(role)}
                            </h4>
                            
                            <div className="space-y-1">
                              {playersInRole.map(player => (
                                <div 
                                  key={player.id} 
                                  className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                                      <img 
                                        src={player.image || player.photoUrl} 
                                        alt={player.name} 
                                        className="w-full h-full object-cover object-top"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png';
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs text-white font-medium truncate">{player.name}</span>
                                  </div>
                                  <span className="text-xs font-bold text-[#F5A623] font-outfit ml-2">
                                    {formatAuctionMoney(player.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
