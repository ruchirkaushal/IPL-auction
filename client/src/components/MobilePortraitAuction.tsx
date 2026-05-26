// @ts-nocheck
import React, { useState } from 'react';
import ChatPanel from './ChatPanel';
import BidControls from './BidControls';
import TeamPanel from './TeamPanel';
import SquadPanel from './SquadPanel';
import VideoPlayer from './VideoPlayer';

interface MobilePortraitAuctionProps {
  roomCode: string;
  roomState: any;
  allPlayers: any[];
  myTeamId: string | null;
  socket: any;
  videoManager: any;
  canBid: boolean;
  canUserBid: boolean;
  isHost: boolean;
  soldPlayers: any[];
  unsoldPlayers: any[];
  highestBidderId: string | null;
  actions: any;
}

/**
 * MobilePortraitAuction - Mobile portrait mode layout
 * Stacked vertical layout optimized for portrait viewing
 * - Video at top (smaller than landscape)
 * - Auction info and controls in middle (tabbed)
 * - Chat at bottom
 */
export const MobilePortraitAuction: React.FC<MobilePortraitAuctionProps> = ({
  roomCode,
  roomState,
  allPlayers,
  myTeamId,
  socket,
  videoManager,
  canBid,
  canUserBid,
  isHost,
  actions,
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'squad' | 'bid'>('bid');

  if (!roomState) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white p-2 gap-2">
      {/* Header with room code and leave button */}
      <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded">
        <span className="font-bold text-sm">Room: {roomCode}</span>
        <button
          onClick={() => actions.leaveRoom()}
          className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
        >
          Leave
        </button>
      </div>

      {/* Video player - reduced height for portrait */}
      <div className="bg-black rounded flex-shrink-0" style={{ height: '200px' }}>
        <VideoPlayer videoManager={videoManager} roomState={roomState} allPlayers={allPlayers} />
      </div>

      {/* Auction info - tabs */}
      <div className="flex gap-2 bg-gray-900 rounded p-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab('bid')}
          className={`flex-1 py-1 text-sm font-semibold rounded ${
            activeTab === 'bid' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          Bid
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 py-1 text-sm font-semibold rounded ${
            activeTab === 'team' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          Team
        </button>
        <button
          onClick={() => setActiveTab('squad')}
          className={`flex-1 py-1 text-sm font-semibold rounded ${
            activeTab === 'squad' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          Squad
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-gray-900 rounded p-2 flex-shrink-0 overflow-y-auto max-h-48">
        {activeTab === 'bid' && (
          <div className="space-y-2">
            <BidControls
              roomState={roomState}
              myTeamId={myTeamId}
              canUserBid={canUserBid}
              actions={actions}
            />
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-2">
            <TeamPanel
              roomState={roomState}
              myTeamId={myTeamId}
              highestBidderId={highestBidderId}
            />
          </div>
        )}

        {activeTab === 'squad' && (
          <div className="max-h-32 overflow-y-auto">
            <SquadPanel roomState={roomState} myTeamId={myTeamId} allPlayers={allPlayers} />
          </div>
        )}
      </div>

      {/* Chat - scrollable */}
      <div className="bg-gray-900 rounded flex-1 min-h-0">
        <ChatPanel
          roomCode={roomCode}
          roomState={roomState}
          socket={socket}
          actions={actions}
        />
      </div>

      {/* Host controls at bottom (if host) */}
      {isHost && (
        <div className="flex gap-2 bg-gray-900 px-3 py-2 rounded flex-shrink-0">
          <button
            onClick={() => actions.togglePause()}
            className="flex-1 py-1 text-xs font-semibold bg-yellow-600 hover:bg-yellow-700 rounded"
          >
            {roomState.auction.isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => actions.endAuction()}
            className="flex-1 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 rounded"
          >
            End
          </button>
        </div>
      )}
    </div>
  );
};

export default MobilePortraitAuction;
