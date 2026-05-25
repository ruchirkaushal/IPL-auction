import { useMemo, useCallback, CSSProperties } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { Player } from '../types';

interface VirtualPlayerListProps {
  players: Player[];
  onSelectPlayer?: (player: Player) => void;
  isLoading?: boolean;
  searchTerm?: string;
  sortBy?: 'name' | 'price' | 'role';
}

/**
 * VirtualPlayerList - Efficiently renders 232+ player items using virtual scrolling
 * Only renders visible items, preventing UI freeze
 */
export const VirtualPlayerList = ({
  players,
  onSelectPlayer,
  isLoading = false,
  searchTerm = '',
  sortBy = 'name',
}: VirtualPlayerListProps) => {
  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let result = players;

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          p.id.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply sort
    const sorted = [...result];
    if (sortBy === 'price') {
      sorted.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortBy === 'role') {
      sorted.sort((a, b) => a.role.localeCompare(b.role));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [players, searchTerm, sortBy]);

  // Render individual player item
  const PlayerRow = useCallback(
    ({ index, style }: { index: number; style: CSSProperties }) => {
      const player = filteredPlayers[index];
      if (!player) return null;

      return (
        <div style={style} className="player-row-virtual">
          <PlayerItemVirtual player={player} onSelect={() => onSelectPlayer?.(player)} />
        </div>
      );
    },
    [filteredPlayers, onSelectPlayer]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin">⏳ Loading players...</div>
      </div>
    );
  }

  if (filteredPlayers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No players found
      </div>
    );
  }

  return (
    <List
      height={600} // Adjust based on container height
      itemCount={filteredPlayers.length}
      itemSize={80} // Each player item is 80px tall
      width="100%"
      className="virtual-player-list"
    >
      {PlayerRow}
    </List>
  );
};

/**
 * PlayerItemVirtual - Memoized player item for virtual list
 */
const PlayerItemVirtual = ({
  player,
  onSelect,
}: {
  player: Player;
  onSelect: () => void;
}) => {
  return (
    <div
      className="player-item-virtual flex items-center gap-3 p-2 border-b border-gray-700 hover:bg-gray-800 cursor-pointer"
      onClick={onSelect}
    >
      {/* Player image */}
      <img
        src={player.photoUrl}
        alt={player.name}
        className="w-12 h-12 rounded object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/placeholder-player.png';
        }}
      />

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white truncate">{player.name}</h4>
        <p className="text-xs text-gray-400">
          {player.role} • {player.country}
        </p>
      </div>

      {/* Price and star rating */}
      <div className="text-right">
        <p className="font-bold text-yellow-400">{player.basePrice}L</p>
        <p className="text-xs text-orange-400">{'⭐'.repeat(player.starRating)}</p>
      </div>
    </div>
  );
};

// Export memoized version
export const PlayerItemVirtualMemo = React.memo(PlayerItemVirtual, (prev, next) => {
  return (
    prev.player.id === next.player.id &&
    prev.player.photoUrl === next.player.photoUrl &&
    prev.player.basePrice === next.player.basePrice
  );
});
