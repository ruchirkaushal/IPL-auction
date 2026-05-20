import { useState, useMemo } from 'react';
import {
  buildAuctionSets,
  getCurrentSetForIndex,
  SET_META,
  type AuctionSet,
  type AuctionSetCode,
  type SetCategory,
} from '../constants/auctionSetClassifier';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
  image?: string;
  basePrice: number;
  isCapped: boolean;
  isOverseas: boolean;
  starRating: number;
  country?: string;
  stats?: Record<string, any>;
}

interface SoldInfo {
  playerId: string;
  teamId: string;
  amount: number;
}

interface PlayerDatabaseProps {
  isOpen: boolean;
  onClose: () => void;
  allPlayers: Player[];
  auctionQueue: string[];
  currentIndex: number;
  soldPlayers: SoldInfo[];
  unsoldPlayers: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatPrice = (lakhs: number): string => {
  if (lakhs < 100) return `₹${lakhs}L`;
  const cr = lakhs / 100;
  return `₹${cr % 1 === 0 ? cr : cr.toFixed(1)}Cr`;
};

const CATEGORY_COLORS: Record<SetCategory, string> = {
  marquee: 'from-amber-500 to-yellow-400',
  capped: 'from-blue-500 to-cyan-400',
  uncapped: 'from-emerald-500 to-teal-400',
  special: 'from-purple-500 to-pink-400',
};

const CATEGORY_PILL: Record<SetCategory, string> = {
  marquee: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  capped: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  uncapped: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  special: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const ROLE_COLORS: Record<string, string> = {
  BAT: 'bg-blue-500/25 text-blue-300 border-blue-400/30',
  WK: 'bg-purple-500/25 text-purple-300 border-purple-400/30',
  AR: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/30',
  BOWL: 'bg-red-500/25 text-red-300 border-red-400/30',
};

function getRoleKey(role: string): string {
  const r = (role || '').toLowerCase();
  if (r.includes('wicket') || r.includes('keeper') || r === 'wk') return 'WK';
  if (r.includes('all') || r === 'ar') return 'AR';
  if (
    r.includes('bowl') ||
    r.includes('fast') ||
    r.includes('spin') ||
    r === 'bowl' ||
    r === 'fa' ||
    r === 'sp'
  ) return 'BOWL';
  return 'BAT';
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`text-[9px] ${i <= count ? 'text-amber-400' : 'text-white/10'}`}>
          ★
        </span>
      ))}
    </div>
  );
}

// ─── Player Row ───────────────────────────────────────────────────────────────

function PlayerRow({
  player,
  isCurrent,
  isNext,
  isSold,
  soldAmount,
  isUnsold,
}: {
  player: Player;
  isCurrent: boolean;
  isNext: boolean;
  isSold: boolean;
  soldAmount?: number;
  isUnsold: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  const roleKey = getRoleKey(player.role);

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all duration-150
        ${isCurrent
          ? 'bg-amber-400/8 border-amber-400/40 shadow-[0_0_16px_rgba(251,191,36,0.1)]'
          : isNext
            ? 'bg-cyan-400/5 border-cyan-400/25'
            : isSold
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : isUnsold
                ? 'opacity-35 border-white/4 bg-white/[0.01]'
                : 'border-white/6 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/12'
        }`}
    >
      {/* Photo */}
      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
        {!imgErr && (player.image || player.photoUrl) ? (
          <img
            src={player.image || player.photoUrl}
            alt={player.name}
            className="w-full h-full object-cover object-top"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg opacity-15">🏏</div>
        )}
        {isCurrent && (
          <div className="absolute inset-0 border-2 border-amber-400 rounded-lg" />
        )}
      </div>

      {/* Name + stars + country */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-white font-semibold text-sm truncate">{player.name}</p>
          {player.isOverseas && (
            <span className="text-[10px] bg-amber-400/15 text-amber-300 border border-amber-400/20 px-1.5 py-0.5 rounded flex-shrink-0" title="Overseas">
              ✈️
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Stars count={player.starRating} />
          <span className="text-white/25 text-[9px]">
            {player.isCapped ? 'Capped' : 'Uncapped'}
          </span>
          {player.country && (
            <span className="text-white/20 text-[9px] truncate">{player.country}</span>
          )}
        </div>
      </div>

      {/* Role badge */}
      <span
        className={`text-[9px] px-2 py-1 rounded-lg border font-bold flex-shrink-0 ${ROLE_COLORS[roleKey] || 'bg-white/10 text-white/40 border-white/8'
          }`}
      >
        {roleKey}
      </span>

      {/* Status / Price */}
      <div className="text-right flex-shrink-0 w-24">
        {isCurrent && (
          <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-black block text-center mb-1 animate-pulse">
            LIVE
          </span>
        )}
        {isNext && !isCurrent && (
          <span className="text-[9px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full font-black block text-center mb-1">
            NEXT
          </span>
        )}
        {isSold ? (
          <>
            <p className="text-emerald-400 font-black text-sm">{formatPrice(soldAmount!)}</p>
            <p className="text-white/20 text-[8px]">SOLD</p>
          </>
        ) : isUnsold ? (
          <p className="text-red-400/70 font-bold text-xs">UNSOLD</p>
        ) : (
          <>
            <p className="text-white/55 text-xs font-semibold">{formatPrice(player.basePrice)}</p>
            <p className="text-white/20 text-[8px]">base</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Set Button (sidebar) ─────────────────────────────────────────────────────

function SetButton({
  set,
  isSelected,
  isCurrentLive,
  onClick,
}: {
  set: AuctionSet;
  isSelected: boolean;
  isCurrentLive: boolean;
  onClick: () => void;
}) {
  const meta = SET_META[set.code];
  const grad = CATEGORY_COLORS[meta.category];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150
        ${isSelected
          ? 'bg-white/10 border-white/18'
          : 'border-transparent hover:bg-white/[0.04] hover:border-white/8'
        }`}
    >
      <div
        className={`w-10 h-8 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}
      >
        <span className="text-black font-black text-[8px] tracking-wider">{set.code}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-[11px] font-semibold truncate leading-none mb-0.5">
          {meta.title}
        </p>
        <p className="text-white/25 text-[9px] truncate">{meta.description}</p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isCurrentLive && (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
        <span
          className={`text-[9px] font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-white/8 text-white/40'
            }`}
        >
          {set.playerIds.length}
        </span>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlayerDatabase({
  isOpen,
  onClose,
  allPlayers,
  auctionQueue,
  currentIndex,
  soldPlayers,
  unsoldPlayers,
}: PlayerDatabaseProps) {
  const [selectedSetCode, setSelectedSetCode] = useState<AuctionSetCode | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'BAT' | 'WK' | 'AR' | 'BOWL'>('all');

  // Player map for O(1) lookup
  const playerMap = useMemo(() => {
    const m: Record<string, Player> = {};
    for (const p of allPlayers) m[p.id] = p;
    return m;
  }, [allPlayers]);

  // Build auction sets — playerIds inside each set are sorted by star+price (display order)
  const auctionSets = useMemo(() => buildAuctionSets(allPlayers), [allPlayers]);

  // Current live set
  const currentLiveSet = useMemo(
    () => getCurrentSetForIndex(auctionSets, auctionQueue, currentIndex),
    [auctionSets, auctionQueue, currentIndex]
  );

  // Effective selected set — fallback to live set → first set
  const effectiveCode: AuctionSetCode | null =
    selectedSetCode ??
    currentLiveSet?.code ??
    auctionSets[0]?.code ??
    null;

  const selectedSet = auctionSets.find(s => s.code === effectiveCode) ?? null;

  // Status lookups
  const soldMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of soldPlayers) m[s.playerId] = s.amount;
    return m;
  }, [soldPlayers]);

  const unsoldSetIds = useMemo(() => new Set(unsoldPlayers), [unsoldPlayers]);

  const currentPlayerId = auctionQueue[currentIndex] ?? null;
  const nextPlayerId = auctionQueue[currentIndex + 1] ?? null;

  // ── Display players ───────────────────────────────────────────────────────
  // playerIds in selectedSet are already sorted: starRating desc → basePrice desc
  // We just filter them (search + role) — do NOT re-sort
  // Exception: always pin CURRENT player at top, NEXT player second
  const displayPlayers = useMemo(() => {
    if (!selectedSet) return [];

    let list = selectedSet.playerIds
      .map(id => playerMap[id])
      .filter((p): p is Player => Boolean(p));

    // Role filter
    if (filterRole !== 'all') {
      list = list.filter(p => getRoleKey(p.role) === filterRole);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }

    // Pin current and next to top — maintain star+price order for everything else
    // (only when no search/filter is active so it's not confusing)
    if (!search.trim() && filterRole === 'all') {
      const current = list.find(p => p.id === currentPlayerId);
      const next = list.find(p => p.id === nextPlayerId && p.id !== currentPlayerId);
      const rest = list.filter(p => p.id !== currentPlayerId && p.id !== nextPlayerId);

      list = [
        ...(current ? [current] : []),
        ...(next ? [next] : []),
        ...rest,
      ];
    }

    return list;
  }, [selectedSet, playerMap, filterRole, search, currentPlayerId, nextPlayerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-4xl h-full bg-[#07090f] border-l border-white/8 flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-[#090c14] flex-shrink-0">
          <div>
            <h2 className="text-white font-black text-base tracking-widest uppercase">
              Player Database
            </h2>
            <p className="text-white/25 text-[10px] tracking-[0.18em] uppercase mt-0.5">
              Official Auction Registry · Set Grouping · Live Queue
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar — set list */}
          <div className="w-56 border-r border-white/6 bg-[#060810] flex flex-col overflow-hidden flex-shrink-0">
            <div className="px-3 pt-4 pb-2 flex-shrink-0">
              <p className="text-white/20 text-[9px] font-bold tracking-[0.2em] uppercase px-1 mb-1">
                Auction Sets · {auctionSets.length}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-0.5">
              {auctionSets.map(set => (
                <SetButton
                  key={set.code}
                  set={set}
                  isSelected={set.code === effectiveCode}
                  isCurrentLive={set.code === currentLiveSet?.code}
                  onClick={() =>
                    setSelectedSetCode(prev => (prev === set.code ? null : set.code))
                  }
                />
              ))}
            </div>
          </div>

          {/* Player list */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Set header + filters */}
            {selectedSet && (
              <div className="px-5 py-4 border-b border-white/6 flex-shrink-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${CATEGORY_PILL[SET_META[selectedSet.code].category]
                          }`}
                      >
                        {selectedSet.code}
                      </span>
                      {selectedSet.code === currentLiveSet?.code && (
                        <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-black animate-pulse">
                          CURRENT SET
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-black text-lg leading-tight">
                      {SET_META[selectedSet.code].title}
                    </h3>
                    <p className="text-white/30 text-xs mt-0.5">
                      {SET_META[selectedSet.code].description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-black text-2xl leading-none">
                      {selectedSet.playerIds.length}
                    </p>
                    <p className="text-white/25 text-[9px] uppercase tracking-widest">players</p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">🔍</span>
                    <input
                      type="text"
                      placeholder="Search player..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-lg pl-7 pr-3 py-1.5 text-white text-[11px] placeholder-white/15 focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>

                  <div className="flex gap-1">
                    {(['all', 'BAT', 'WK', 'AR', 'BOWL'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setFilterRole(r)}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all border ${filterRole === r
                          ? 'bg-white/15 text-white border-white/20'
                          : 'text-white/25 border-transparent hover:text-white/50'
                          }`}
                      >
                        {r === 'all' ? 'ALL' : r}
                      </button>
                    ))}
                  </div>

                  <span className="ml-auto text-white/18 text-[9px] flex-shrink-0">
                    {displayPlayers.length} shown
                  </span>
                </div>
              </div>
            )}

            {/* Player rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-1.5">
              {!selectedSet ? (
                <div className="flex flex-col items-center justify-center h-full text-white/12">
                  <p className="text-4xl mb-3">🏏</p>
                  <p className="font-semibold text-sm">Select a set from the left</p>
                </div>
              ) : displayPlayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/12">
                  <p className="text-3xl mb-3">🔍</p>
                  <p className="font-semibold text-sm">No players match this filter</p>
                </div>
              ) : (
                displayPlayers.map(player => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    isCurrent={player.id === currentPlayerId}
                    isNext={player.id === nextPlayerId && player.id !== currentPlayerId}
                    isSold={player.id in soldMap}
                    soldAmount={soldMap[player.id]}
                    isUnsold={unsoldSetIds.has(player.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-5 px-5 py-3 border-t border-white/6 bg-[#060810] flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-white/30 text-[10px]">
              {Math.max(0, auctionQueue.length - currentIndex)} Remaining
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-white/30 text-[10px]">{soldPlayers.length} Sold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-white/30 text-[10px]">{unsoldPlayers.length} Unsold</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-white/30 text-[10px]">
              {allPlayers.length} Players · {auctionSets.length} Sets
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}