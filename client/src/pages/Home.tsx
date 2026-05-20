import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../SocketContext';
import toast from 'react-hot-toast';

export default function Home() {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { createRoom, joinRoom, socket } = useSocketContext();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('roomCode');
    if (code) {
      setJoinCode(code.toUpperCase());
      setIsJoining(true);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleRoomCreated = ({ roomCode }: { roomCode: string }) => navigate(`/lobby/${roomCode}`);
    const handleRoomJoined = ({ roomCode }: { roomCode: string }) => navigate(`/lobby/${roomCode}`);
    const handleError = ({ message }: { message: string }) => toast.error(message, { duration: 4000 });

    socket.on('room_created', handleRoomCreated);
    socket.on('room_joined', handleRoomJoined);
    socket.on('error', handleError);

    return () => {
      socket.off('room_created', handleRoomCreated);
      socket.off('room_joined', handleRoomJoined);
      socket.off('error', handleError);
    };
  }, [socket, navigate]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden selection:bg-blue-600 selection:text-white font-body-md">
      
      {/* Premium HD Background */}
      <div className="fixed inset-0 z-[-3] bg-black pointer-events-none"></div>
      
      {/* High-Quality Cricket/Stadium Background Image */}
      <div 
        className="fixed inset-0 z-[-2] bg-cover bg-center pointer-events-none opacity-50 transition-opacity duration-1000 mix-blend-screen scale-105 animate-[pulse_10s_ease-in-out_infinite]"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2560&q=80')" }}
      ></div>

      {/* Atmospheric Gradients */}
      <div className="fixed inset-0 z-[-1] bg-gradient-to-tr from-blue-900/60 via-transparent to-yellow-600/20 pointer-events-none"></div>
      <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none"></div>
      
      {/* TopAppBar */}
      <header className="absolute top-0 w-full z-50 px-6 md:px-12 py-6">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-6 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-50 transition-opacity"></div>
              <img 
                alt="IPL Auction Logo" 
                className="h-12 md:h-16 object-contain relative z-10 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105" 
                src="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/9c3773cb-5629-4145-b044-4ef6f9090376/df0pxkt-cbc20ad7-b514-43f5-99bd-31a3a351520a.png/v1/fill/w_927,h_862/tata_ipl_auction_logo_by_harshmore7781_df0pxkt-pre.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTA4MCIsInBhdGgiOiIvZi85YzM3NzNjYi01NjI5LTQxNDUtYjA0NC00ZWY2ZjkwOTAzNzYvZGYwcHhrdC1jYmMyMGFkNy1iNTE0LTQzZjUtOTliZC0zMWEzYTM1MTUyMGEucG5nIiwid2lkdGgiOiI8PTExNjEifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.2g756-i28rBf1t-DSn5g6_qN8vYzoI_FooR503fHiPA"
              />
            </div>
            <div className="hidden md:block w-[2px] h-12 bg-white/10 rounded-full"></div>
            <div className="hidden md:flex flex-col">
              <span className="font-headline-md text-3xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-lg">
                AUCTION
              </span>
              <span className="text-white/50 text-xs font-label-bold tracking-[0.3em] uppercase -mt-1">
                Arena 2026
              </span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content - Centered Interaction */}
      <main className="flex-grow flex flex-col relative z-20 items-center justify-center pt-32 pb-20 px-6">
        {/* Glassmorphic Container */}
        <div className="w-full max-w-[550px] relative">
          
          {/* Animated decorative blobs behind container */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/30 rounded-full blur-[80px] pointer-events-none mix-blend-screen animate-[pulse_4s_ease-in-out_infinite]"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-yellow-500/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]"></div>

          <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col items-center">
            
            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

            <div className="space-y-4 mb-10 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-200 text-xs font-label-bold uppercase tracking-widest shadow-[0_0_15px_rgba(0,75,160,0.5)]">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                <span className="w-2 h-2 rounded-full bg-blue-400 absolute"></span>
                Live Multiplayer
              </div>
              <h1 className="font-headline-xl text-5xl md:text-6xl text-white uppercase tracking-tight leading-[1.1] mt-4">
                THE ULTIMATE <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 drop-shadow-[0_0_20px_rgba(233,195,73,0.4)]">
                  SHOWDOWN
                </span>
              </h1>
              <p className="text-white/60 text-base md:text-lg max-w-[320px] font-light leading-relaxed mt-4">
                Step into the shoes of an IPL franchise owner. Strategize, outbid, and conquer.
              </p>
            </div>
            
            {/* Interaction Form */}
            <div className="w-full relative z-10 flex flex-col gap-5">
              
              {/* Name Input */}
              <div className="space-y-2 text-left w-full">
                <label className="text-xs font-bold text-white/50 uppercase tracking-[0.2em] ml-2" htmlFor="player-name">Manager Alias</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-2xl blur opacity-0 group-focus-within:opacity-30 transition-opacity duration-500"></div>
                  <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex items-center focus-within:border-white/40 transition-all duration-300 shadow-inner">
                    <span className="material-symbols-outlined text-white/40 pl-5 pr-2 group-focus-within:text-blue-400 transition-colors">account_circle</span>
                    <input 
                      className="w-full bg-transparent border-0 text-white font-body-lg text-lg px-2 py-4 focus:ring-0 placeholder-white/20 outline-none" 
                      id="player-name" 
                      placeholder="e.g. Master Tactician" 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Room Code Input (Smooth fade in) */}
              <div className={`space-y-2 text-left w-full transition-all duration-500 overflow-hidden ${isJoining ? 'max-h-[120px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <label className="text-xs font-bold text-white/50 uppercase tracking-[0.2em] ml-2" htmlFor="room-code">Room Code</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-2xl blur opacity-0 group-focus-within:opacity-30 transition-opacity duration-500"></div>
                  <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex items-center focus-within:border-white/40 transition-all duration-300 shadow-inner">
                    <span className="material-symbols-outlined text-white/40 pl-5 pr-2 group-focus-within:text-yellow-400 transition-colors">key</span>
                    <input 
                      className="w-full bg-transparent border-0 text-white font-body-lg text-lg px-2 py-4 focus:ring-0 placeholder-white/20 outline-none uppercase tracking-widest font-mono" 
                      id="room-code" 
                      placeholder="ENTER CODE" 
                      type="text"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-4 mt-6">
                {isJoining ? (
                  <button 
                    className="w-full relative overflow-hidden bg-white text-black font-headline-md text-xl py-5 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-30 disabled:hover:translate-y-0"
                    onClick={() => name && joinCode && joinRoom(joinCode, name)}
                    disabled={!name || !joinCode || joinCode.length < 4}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      ENTER ROOM
                      <span className="material-symbols-outlined text-[24px]">login</span>
                    </span>
                  </button>
                ) : (
                  <button 
                    className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 text-white font-headline-md text-xl py-5 rounded-2xl shadow-[0_10px_40px_rgba(0,75,160,0.5)] hover:shadow-[0_15px_50px_rgba(0,75,160,0.7)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-40 disabled:hover:translate-y-0 group"
                    onClick={() => name && createRoom(name)}
                    disabled={!name}
                  >
                    <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    <span className="relative z-10 flex items-center justify-center gap-3 tracking-wide">
                      CREATE NEW ROOM
                      <span className="material-symbols-outlined text-[24px]">add_circle</span>
                    </span>
                  </button>
                )}
                
                {!isJoining && (
                  <div className="relative flex items-center justify-center py-2">
                    <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <span className="relative bg-black/40 px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest rounded-full">Or</span>
                  </div>
                )}
                
                <button 
                  className={`w-full bg-white/5 backdrop-blur-md text-white font-headline-md text-lg py-4 rounded-2xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3 group ${isJoining ? 'opacity-70 hover:opacity-100' : ''}`}
                  onClick={() => setIsJoining(!isJoining)}
                >
                  {isJoining ? 'BACK TO CREATE' : 'JOIN EXISTING ROOM'}
                  {!isJoining && <span className="material-symbols-outlined text-[20px] group-hover:translate-x-2 transition-transform">arrow_forward</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Minimal Footer */}
      <footer className="absolute bottom-0 w-full z-20 pointer-events-none pb-6 px-6">
        <div className="flex flex-col md:flex-row justify-center items-center w-full max-w-7xl mx-auto gap-4 text-xs font-medium text-white/40 pointer-events-auto">
          <div className="tracking-widest uppercase">
            © 2026 IPL AUCTION.
          </div>
        </div>
      </footer>
    </div>
  );
}
