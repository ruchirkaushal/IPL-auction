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

  const me = roomState?.players.find(p => p.socketId === socket?.id);
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
    <div className="chat-panel-root h-full flex flex-col bg-[#0a0a0a] border-l border-white/5">
      {/* Panel Header */}
      <div className="p-2 border-b border-white/5 flex items-center justify-between gap-1">
        <div>
          <h2 className="text-[8px] font-black uppercase tracking-[0.3em] text-[#00e5ff]">Live</h2>
          <h3 className="text-xs font-black text-white tracking-tight leading-tight">War Room</h3>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[7px] font-black uppercase tracking-wider text-blue-400">Live</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="chat-message-container flex-grow overflow-y-auto custom-scrollbar p-1.5 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none px-2">
            <svg className="w-5 h-5 text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-[8px] uppercase tracking-wider font-bold">No activity</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system_bid') {
              const team = msg.teamId ? TEAMS[msg.teamId] : null;
              return (
                <div 
                  key={msg.id} 
                  className="chat-message-item flex items-center gap-2 py-1 px-2 rounded-lg bg-white/[0.02] border transition-all duration-300 text-[8px]"
                  style={{ borderColor: team ? `${team.primaryColor}25` : '#ffffff10' }}
                >
                  {team && (
                    <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center p-0.5">
                      <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-grow min-w-0">
                    <span className="font-black tracking-wide" style={{ color: team?.primaryColor || '#ffffff' }}>
                      {team ? team.shortName : 'Someone'}
                    </span>
                    <span className="text-gray-400 mx-1 font-medium">bid</span>
                    <span className="text-white font-bold">{msg.playerName}</span>
                  </div>
                  <span className="font-black text-[#F5A623] font-outfit shrink-0">
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
                  className="chat-message-item flex items-center justify-between p-1.5 rounded-lg bg-emerald-500/10 border transition-all duration-300 text-[8px]"
                  style={{ 
                    borderColor: team ? `${team.primaryColor}50` : '#10B98130',
                    borderLeft: `3px solid ${team?.primaryColor || '#10B981'}`
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {team && (
                      <div className="w-4 h-4 rounded bg-black/30 border border-white/10 flex-shrink-0 flex items-center justify-center p-0.5">
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[7px] font-black uppercase text-emerald-400 tracking-widest leading-none">Sold</div>
                      <div className="text-[8px] text-white font-bold truncate">
                        {msg.playerName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-1">
                    <span className="font-black text-[#F5A623] font-outfit text-[8px]">
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
                  className="chat-message-item flex items-center justify-between p-1.5 rounded-lg bg-red-500/5 border border-red-500/10 border-l-[3px] border-l-red-500/50 text-[8px]"
                >
                  <div>
                    <span className="text-red-400/90 font-black tracking-wider uppercase text-[7px] block leading-none">Unsold</span>
                    <span className="text-white font-bold text-[8px]">{msg.playerName}</span>
                  </div>
                </div>
              );
            }

            // User message
            const isMe = Boolean(me && msg.sender && me.name === msg.sender);
            const senderTeam = msg.teamId ? TEAMS[msg.teamId] : null;
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="flex items-center gap-1 mb-0.5 px-1">
                  <span className="text-[7px] font-black text-gray-400 tracking-wide uppercase">
                    {msg.sender}
                  </span>
                  {senderTeam && (
                    <span 
                      className="text-[6px] font-black uppercase px-1 rounded-sm tracking-widest select-none shrink-0" 
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
                  className={`chat-message-item py-1 px-2 rounded-lg text-[8px] break-all shadow-md leading-snug ${
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
      <form onSubmit={handleSendMessage} className="p-1.5 border-t border-white/5 bg-[#080808] flex items-center gap-1">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message..."
          className="flex-grow bg-white/5 border border-white/10 hover:border-white/15 focus:border-[#00e5ff] rounded-lg px-2 py-1.5 text-[9px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all"
        />
        <button 
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-lg transition-all shadow-md"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
