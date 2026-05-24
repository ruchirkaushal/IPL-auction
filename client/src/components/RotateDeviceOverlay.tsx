export default function RotateDeviceOverlay() {
  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-8 text-white font-sans selection:bg-blue-500/30">
      <div className="flex flex-col items-center max-w-sm text-center">
        {/* Animated Rotate Icon */}
        <div className="relative w-32 h-32 mb-8 animate-[spin_3s_ease-in-out_infinite] group">
          <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-xl"></div>
          <div className="relative w-20 h-32 mx-auto bg-[#1a1a1a] border-4 border-white/20 rounded-3xl flex items-center justify-center shadow-2xl">
            <div className="w-8 h-8 rounded-full border-4 border-t-blue-500 border-r-cyan-500 border-b-transparent border-l-transparent"></div>
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tighter uppercase mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
          Rotate Device
        </h1>
        
        <p className="text-white/60 font-medium text-lg leading-relaxed">
          The IPL Auction requires a landscape view for the best experience.
        </p>

        <div className="mt-12 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-400 animate-pulse">screen_rotation</span>
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">Turn phone sideways to continue</span>
        </div>
      </div>
    </div>
  );
}
