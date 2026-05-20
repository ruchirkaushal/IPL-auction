import { useState, useEffect, useRef } from 'react';
import { useSocketContext } from '../SocketContext';
import { TEAMS } from '../constants/teams';
import { formatAuctionMoney } from '../../../shared/auctionPricing';

interface ChatPanelProps {
  roomCode: string;
}

export default function ChatPanel({ roomCode }: ChatPanelProps) {
  const { roomState, sendChat, socket } = useSocketContext();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isLockedRef = useRef(true);

  const messages = roomState?.chat || [];

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
    isLockedRef.current = isNearBottom;
  };

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (isLockedRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChat(roomCode, inputText.trim());
    setInputText('');
    isLockedRef.current = true;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-l border-white/5">
      {/* Panel Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00e5ff] mb-1">LIVE COMMENTARY</h2>
          <h3 className="text-xl font-black text-white tracking-tight">DRAFT WAR ROOM</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-wider text-blue-400">Live</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto custom-scrollbar p-5 space-y-3.5"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none px-4">
            <svg className="w-8 h-8 text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs uppercase tracking-wider font-bold">No activity yet</p>
            <p className="text-[10px] text-gray-400 mt-1">Bids and user messages will appear here in real-time.</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system_bid') {
              const team = msg.teamId ? TEAMS[msg.teamId] : null;
              return (
                <div 
                  key={msg.id} 
                  className="flex items-center gap-3 py-2 px-3.5 rounded-xl bg-white/[0.02] border transition-all duration-300"
                  style={{ borderColor: team ? `${team.primaryColor}25` : '#ffffff10' }}
                >
                  {team && (
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center p-0.5">
                      <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-grow min-w-0 text-xs">
                    <span className="font-black tracking-wide" style={{ color: team?.primaryColor || '#ffffff' }}>
                      {team ? team.shortName : 'Someone'}
                    </span>
                    <span className="text-gray-400 mx-1.5 font-medium">bid for</span>
                    <span className="text-white font-bold">{msg.playerName}</span>
                  </div>
                  <span className="text-xs font-black text-[#F5A623] font-outfit shrink-0">
                    {formatAuctionMoney(msg.amount || 0)}
                  </span>
                </div>
              );
            }

            if (msg.type === 'system_sold') {
              const team = msg.teamId ? TEAMS[msg.teamId] : null;
              return (
                <div 
                  key={msg.id} 
                  className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border transition-all duration-300"
                  style={{ 
                    borderColor: team ? `${team.primaryColor}50` : '#10B98130',
                    borderLeft: `5px solid ${team?.primaryColor || '#10B981'}`
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {team && (
                      <div className="w-8 h-8 rounded-lg bg-black/30 border border-white/10 flex-shrink-0 flex items-center justify-center p-1">
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-0.5">Acquired</div>
                      <div className="text-xs text-white font-bold truncate">
                        {msg.playerName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Final Bid</div>
                    <span className="text-sm font-black text-[#F5A623] font-outfit">
                      {formatAuctionMoney(msg.amount || 0)}
                    </span>
                  </div>
                </div>
              );
            }

            if (msg.type === 'system_unsold') {
              return (
                <div 
                  key={msg.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 border-l-[5px] border-l-red-500/50"
                >
                  <div className="text-xs">
                    <span className="text-red-400/90 font-black tracking-wider uppercase text-[10px] block mb-0.5">Passed</span>
                    <span className="text-white font-bold">{msg.playerName}</span>
                  </div>
                  <span className="text-[10px] font-black text-red-400/70 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    Unsold
                  </span>
                </div>
              );
            }

            // User message
            const isMe = socket?.id === msg.sender;
            const senderTeam = msg.teamId ? TEAMS[msg.teamId] : null;
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[9px] font-black text-gray-400 tracking-wide uppercase">
                    {msg.sender}
                  </span>
                  {senderTeam && (
                    <span 
                      className="text-[8px] font-black uppercase px-1 rounded-sm tracking-widest select-none shrink-0" 
                      style={{ 
                        backgroundColor: `${senderTeam.primaryColor}20`, 
                        color: senderTeam.primaryColor,
                        border: `1px solid ${senderTeam.primaryColor}30`
                      }}
                    >
                      {senderTeam.shortName}
                    </span>
                  )}
                </div>
                <div 
                  className={`py-2 px-3.5 rounded-2xl text-xs break-all shadow-md leading-relaxed ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-[#181818] text-white/95 rounded-tl-none border border-white/5'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-[#080808] flex items-center gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message draft room..."
          className="flex-grow bg-white/5 border border-white/10 hover:border-white/15 focus:border-[#00e5ff] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all"
        />
        <button 
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
