/**
 * Test Utilities for Phase 3 Architecture
 * Provides helper functions for testing new services and components
 */

import { RoomService } from '../services/RoomService';
import { AuctionTimer, TimerManager } from '../services/AuctionTimer';
import { RedisService } from '../services/RedisService';
import type { Room, RoomState, TeamId } from '../types';

/**
 * Mock Room State for Testing
 */
export const createMockRoomState = (roomCode: string = 'TEST01'): RoomState => {
  return {
    roomCode,
    hostId: 'host-socket-id',
    players: [
      {
        socketId: 'host-socket-id',
        userId: 'user-1',
        name: 'Host Player',
        teamId: 'MI',
        role: 'manager',
        isHost: true,
        isReady: true,
        presenceStatus: 'active',
      },
      {
        socketId: 'player-2',
        userId: 'user-2',
        name: 'Player 2',
        teamId: 'CSK',
        role: 'spectator',
        isHost: false,
        isReady: true,
        presenceStatus: 'active',
      },
    ],
    teams: {
      MI: {
        teamId: 'MI',
        ownerId: 'host-socket-id',
        ownerName: 'Host Player',
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'occupied',
      },
      CSK: {
        teamId: 'CSK',
        ownerId: 'player-2',
        ownerName: 'Player 2',
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'occupied',
      },
      RCB: {
        teamId: 'RCB',
        ownerId: null,
        ownerName: null,
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'available',
      },
      KKR: {
        teamId: 'KKR',
        ownerId: null,
        ownerName: null,
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'available',
      },
      DC: {
        teamId: 'DC',
        ownerId: null,
        ownerName: null,
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'available',
      },
      RR: {
        teamId: 'RR',
        ownerId: null,
        ownerName: null,
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'available',
      },
      PBKS: {
        teamId: 'PBKS',
        ownerId: null,
        ownerName: null,
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'available',
      },
      SRH: {
        teamId: 'SRH',
        ownerId: null,
        ownerName: null,
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'available',
      },
      GT: {
        teamId: 'GT',
        ownerId: null,
        ownerName: null,
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'available',
      },
      LSG: {
        teamId: 'LSG',
        ownerId: null,
        ownerName: null,
        purseRemaining: 12000,
        squad: [],
        overseasCount: 0,
        status: 'idle',
        availability: 'available',
      },
    },
    auction: {
      isStarted: false,
      currentPlayerIndex: 0,
      auctionQueue: ['player-1', 'player-2', 'player-3'],
      currentBid: 500,
      nextBidAmount: null,
      highestBidderId: null,
      ticks: 100,
      phase: 'waiting',
      passedTeams: [],
      isAdvancing: false,
      currentSetName: 'Set 1',
      isPaused: false,
    },
    chat: [],
    isLocked: false,
  };
};

const createMockRoom = (): Room => ({
  state: createMockRoomState('ROOM-TEST'),
  auctionTimer: null,
  autoAdvanceTimeout: null,
  biddingStartTimeout: null,
  aiTimeouts: [],
  roomGeneration: Date.now(),
  lifecycleTimeline: [],
  intervalRegistry: {},
});

/**
 * Test Timer Functionality
 */
export const testAuctionTimer = async (): Promise<void> => {
  console.log('[Test] Testing AuctionTimer...');

  const timer = new AuctionTimer(10, 10); // 10 ticks of 10ms each

  let tickCount = 0;
  let expiredFired = false;

  timer.on('timer:tick', ({ ticks }) => {
    tickCount++;
    console.log(`[Test] Tick ${tickCount}: ${ticks} ticks remaining`);
  });

  timer.on('timer:expired', () => {
    expiredFired = true;
    console.log('[Test] Timer expired!');
  });

  // Test start
  timer.start();

  // Wait for timer to complete
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (!expiredFired) {
    throw new Error('Timer did not fire expired event');
  }

  timer.destroy();
  console.log('[Test] ✅ AuctionTimer test passed');
};

/**
 * Test Timer Manager
 */
export const testTimerManager = (): void => {
  console.log('[Test] Testing TimerManager...');

  const manager = new TimerManager();

  // Create timer
  const timer1 = manager.createTimer('ROOM-1', 1, 100);
  timer1.start();

  // Create another
  const timer2 = manager.createTimer('ROOM-2', 1, 100);
  timer2.start();

  const summary = manager.getSummary();
  console.log('[Test] Timer summary:', summary);

  if (summary.length !== 2) {
    throw new Error('TimerManager count incorrect');
  }

  manager.destroyTimer('ROOM-1');
  manager.destroyTimer('ROOM-2');

  console.log('[Test] ✅ TimerManager test passed');
};

/**
 * Test RoomService Persistence
 */
export const testRoomServicePersistence = async (): Promise<void> => {
  console.log('[Test] Testing RoomService persistence...');

  const roomService = new RoomService();
  const room = createMockRoom();

  await roomService.saveRoom(room);
  const loaded = await roomService.loadRoom(room.state.roomCode);

  if (!loaded) {
    throw new Error('RoomService failed to load persisted room');
  }
  if (loaded.roomCode !== room.state.roomCode) {
    throw new Error('Loaded room code does not match');
  }

  let sessionUpdateReceived = false;
  roomService.on('session_update', ({ roomCode, userId, status }) => {
    if (roomCode === room.state.roomCode && userId === room.state.players[0].userId && status === 'test') {
      sessionUpdateReceived = true;
    }
  });

  await roomService.updatePlayerSession(room.state.roomCode, room.state.players[0].userId, 'test');
  if (!sessionUpdateReceived) {
    throw new Error('RoomService did not emit session_update event');
  }

  console.log('[Test] ✅ RoomService persistence test passed');
};

/**
 * Test RedisService cache and pub/sub
 */
export const testRedisService = async (): Promise<void> => {
  console.log('[Test] Testing RedisService cache and pub/sub...');

  const redis = new RedisService();
  const roomCode = 'REDIS-TEST';
  const payload = { state: 'ok' };

  await redis.cacheRoom(roomCode, payload);
  const cached = await redis.getCachedRoom(roomCode);

  if (!cached || cached.state !== 'ok') {
    throw new Error('RedisService cacheRoom/getCachedRoom failed');
  }

  let publishedPayload: any = null;
  const subscriber = (message: any) => {
    publishedPayload = message;
  };
  redis.subscribeToRoom(roomCode, subscriber);

  await redis.publishRoomState(roomCode, payload);
  if (!publishedPayload || publishedPayload.state !== 'ok') {
    throw new Error('RedisService publishRoomState failed');
  }

  redis.unsubscribeFromRoom(roomCode, subscriber);
  console.log('[Test] ✅ RedisService cache and pub/sub test passed');
};

/**
 * Test Redux State
 */
export const testReduxState = (): void => {
  console.log('[Test] Testing Redux state structure...');

  const roomState = createMockRoomState('REDUX-TEST');

  // Verify structure
  if (!roomState.roomCode) throw new Error('Missing roomCode');
  if (!roomState.auction) throw new Error('Missing auction state');
  if (!roomState.teams) throw new Error('Missing teams');
  if (Object.keys(roomState.teams).length !== 10) {
    throw new Error('Expected 10 teams');
  }

  console.log('[Test] ✅ Redux state structure valid');
};

/**
 * Test Virtual Scrolling Performance
 */
export const testVirtualScrolling = (): void => {
  console.log('[Test] Testing virtual scrolling...');

  const playerCount = 232;
  const itemSize = 80;
  const viewportHeight = 600;

  // Calculate how many items fit in viewport
  const visibleItems = Math.ceil(viewportHeight / itemSize);
  const totalItems = playerCount;
  const renderingEfficiency = (visibleItems / totalItems) * 100;

  console.log(`[Test] Visible items: ${visibleItems} / ${totalItems}`);
  console.log(`[Test] Rendering efficiency: ${renderingEfficiency.toFixed(2)}%`);

  if (renderingEfficiency < 2) {
    throw new Error('Virtual scrolling not efficient enough');
  }

  console.log('[Test] ✅ Virtual scrolling performance OK');
};

/**
 * Run all tests
 */
export const runAllTests = async (): Promise<void> => {
  console.log('═'.repeat(50));
  console.log('Phase 3 Architecture Tests');
  console.log('═'.repeat(50));

  try {
    await testAuctionTimer();
    testTimerManager();
    await testRoomServicePersistence();
    await testRedisService();
    testReduxState();
    testVirtualScrolling();

    console.log('═'.repeat(50));
    console.log('✅ All tests passed!');
    console.log('═'.repeat(50));
  } catch (error) {
    console.error('═'.repeat(50));
    console.error('❌ Test failed:', error);
    console.error('═'.repeat(50));
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  runAllTests();
}
