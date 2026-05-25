# IPL Auction Engine - Complete Architecture Analysis

**Last Updated:** May 25, 2026  
**Scope:** Full backend auction engine exploration  
**Primary File:** `/server/index.ts` (1000+ lines)

---

## 📋 Quick Navigation

1. [Core Architecture](#core-architecture)
2. [Data Models](#data-models)
3. [Socket Event Handlers](#socket-event-handlers)
4. [Auction State Machine](#auction-state-machine)
5. [Timer System](#timer-system)
6. [Bidding & Resolution](#bidding--resolution)
7. [Room Lifecycle](#room-lifecycle)
8. [Error Handling](#error-handling)
9. [Reconnection Logic](#reconnection-logic)
10. [Key Files Reference](#key-files-reference)

---

## Core Architecture

### Server Stack
- **Framework:** Express.js + Socket.IO 4.8.1
- **Language:** TypeScript 5.7
- **Environment:** Node.js with ts-node for development
- **CORS:** Enabled for all origins (`origin: '*'`)

### Key Components

```
┌─────────────────────────────────────────────┐
│  Express Server (REST + Socket.IO)          │
├─────────────────────────────────────────────┤
│  GET /api/players → Returns all 232 players │
│  Socket.IO Events (see handlers below)      │
└────────┬────────────────────────────────────┘
         │
         ├─ Rooms Map: Map<roomCode, Room>
         │   └─ Stores live game state
         │
         ├─ Reconnect Timeouts: Map<key, Timeout>
         │   └─ 120s grace period for reconnects
         │
         └─ Player Database: ALL_PLAYERS[]
             └─ 232 IPL players (from lib/allPlayers.ts)
```

### Room Structure
```typescript
interface Room {
  state: RoomState;                    // Game state snapshot
  timerInterval: NodeJS.Timeout | null;      // Bidding countdown
  autoAdvanceTimeout: NodeJS.Timeout | null; // Auto-advance after resolve
  biddingStartTimeout: NodeJS.Timeout | null;// Delayed bidding start
  aiTimeouts: NodeJS.Timeout[];               // AI bids (disabled)
  deletionTimeout?: NodeJS.Timeout | null;    // 60-min room cleanup
}
```

---

## Data Models

### RoomState (Complete Auction State)
```typescript
{
  roomCode: "ABC123"
  hostId: "socket-id-123"
  isLocked: false                    // true when auction starts
  players: [
    {
      socketId: "socket-id-1",
      userId: "user-id-1",           // Stable identity for reconnect
      name: "Alice",
      teamId: "MI",                  // null until selected
      isHost: true,
      isReady: true                  // true when team selected
    }
    // ... up to 10 players
  ]
  teams: {
    "MI": {
      teamId: "MI",
      ownerId: "socket-id-1",
      ownerName: "Alice",
      purseRemaining: 12000,         // In Lakhs
      squad: [
        { id: "player-id-1", price: 150 }
      ],
      overseasCount: 2,
      status: "leading"              // 'idle', 'leading', 'passed'
    }
    // ... 10 teams total
  }
  auction: AuctionState              // See below
  chat: ChatMessage[]
}
```

### AuctionState (Phase Machine)
```typescript
{
  isStarted: true
  currentPlayerIndex: 42             // Position in auction queue
  auctionQueue: ["player-1", "player-2", ...]  // Full shuffled queue
  currentBid: 150                    // Highest bid (Lakhs)
  nextBidAmount: 160                 // Next valid bid
  highestBidderId: "MI"              // Team leading
  ticks: 87                          // Countdown timer (87/100 = 0.87s)
  phase: "bidding"                   // bidding | sold | unsold | advancing | waiting
  passedTeams: ["CSK", "RCB"]        // Teams that passed
  isAdvancing: false                 // Safety flag during transition
  currentSetName: "BL1 — Capped Bowlers"
  isPaused: false                    // Host paused auction
}
```

### AuctionSet (Set Definitions)
```typescript
interface AuctionSet {
  setNumber: number;      // 1-12
  setName: string;        // "M1 — Marquee Players"
  playerIds: string[];    // Players in this set
}
```

**Complete Set Order:**
1. **M1** - Marquee Domestic (starRating=5, not overseas)
2. **M2** - Marquee Overseas (starRating=5, overseas)
3. **BA1** - Capped Batters (starRating 3-4)
4. **WK1** - Capped Wicketkeepers (starRating 3-4)
5. **BL1** - Capped Bowlers (starRating 3-4) ← Transition point
6. **AL1** - Capped All-Rounders (starRating 4+)
7. **BA2** - Capped Batters (starRating 1-2)
8. **WK2** - Capped Wicketkeepers (starRating 1-2)
9. **BL2** - Capped Bowlers (starRating 1-2)
10. **AL2** - Capped All-Rounders (starRating 1-3)
11. **UBA1/UWK1/UBL1/UAL1** - Uncapped categories
12. **OTHER** - Unsold pool

---

## Socket Event Handlers

### 1. Room Creation & Management

#### `create_room`
**Initiator:** Any socket | **Response:** 'room_created'

```typescript
Input:  { playerName: string, userId: string }
Output: { roomCode: "ABC123" }

Actions:
1. Generate 6-char random room code
2. Initialize 10 empty teams (purse=12000 Lakhs each)
3. Create initial RoomState with caller as host
4. Store room in Map
5. Emit 'room_created' back to socket
6. Broadcast emitRoomState(roomCode) to all in room
```

**Error Handling:** None (room creation always succeeds)

---

#### `join_room`
**Initiator:** Any socket | **Response:** 'room_joined' or 'room_unavailable'

```typescript
Input:  { roomCode: string, playerName: string, userId: string }
Output: { roomCode: "ABC123" }

Validations:
✗ Room does not exist    → emit 'room_unavailable'
✗ Room is locked & new   → emit error (can't join during auction)
✗ Room full (10 players) → emit error
✗ Not ready to reconnect → proceed as new

Key Logic (Reconnect Detection):
- Check if player exists by: userId OR (legacy) playerName
- If REJOINING:
  - Reuse RoomPlayer record
  - Update socketId (was empty string during disconnect)
  - Clear the 120s reconnect timeout
  - Restore team ownership
  - Restore host status if applicable
- If NEW:
  - Push new RoomPlayer to array
  - If first player: set as host

Cleanup:
- Clear room.deletionTimeout (room not being deleted anymore)
```

**Error Handling:**
- Checks room existence via getRoomOrNotify()
- Validates locked/full status before adding

---

#### `select_team`
**Requires:** Valid room, socket in room | **Host:** No | **Locked:** Yes

```typescript
Input:  { roomCode: string, teamId: TeamId }

Validations:
✗ Team already owned   → emit error
✗ Player not in room   → return silently

Actions:
1. Release old team ownership (if had one)
2. Mark player as isReady=true
3. Assign team to player
4. Set team owner info (ownerId, ownerName)
5. Broadcast emitRoomState()
```

---

### 2. Auction Control

#### `start_auction`
**Requires:** Host | **Protection:** Yes | **Response:** 'auction_started'

```typescript
Pre-conditions:
✗ Caller not host       → return
✗ Not all ready         → emit error "All managers must select team"
✗ Any player no team    → emit error

Actions:
1. Clear all timers (defensive)
2. Set isLocked = true (no more joins/leaves except reconnect)
3. Create auction queue via createAuctionQueue()
   → Shuffles players WITHIN each set
   → Respects set order (M1→M2→BA1→WK1→BL1→AL1→BA2→WK2→BL2→AL2→Uncapped→Other)
4. Reset auction state:
   - isStarted = true
   - currentPlayerIndex = 0
   - phase = 'waiting'
   - isPaused = false
5. Get first player, set currentBid = normalizeBasePrice()
6. Set currentSetName = "M1 — Marquee Players"
7. phase = 'bidding'
8. Call startTimer(room) to begin countdown
9. scheduleAiBids(room) [disabled - does nothing]
10. Broadcast emitRoomState()
```

**Error Handling:** Validates all players ready before starting

---

#### `toggle_pause`
**Requires:** Host | **Protection:** Yes

```typescript
PAUSE (isPaused: false → true):
1. clearInterval(timerInterval)
2. clearTimeout(autoAdvanceTimeout)
3. clearTimeout(biddingStartTimeout)
4. room.aiTimeouts.forEach(clearTimeout)
5. Set all to null
6. Log 'auction_paused'
7. emitRoomState()

RESUME (isPaused: true → false):
Based on current phase:
  - 'bidding':              startTimer(room)
  - 'sold'/'unsold':        scheduleAutoAdvance(4s, reason)
  - 'advancing':            scheduleAutoAdvance(1s, reason)
  - 'waiting'/else:         no action
8. Log 'auction_resumed'
9. emitRoomState()
```

**Key Point:** All timers stopped during pause; state preserved

---

#### `end_auction`
**Requires:** Host | **Protection:** Yes

```typescript
Actions:
1. clearAllTimers(room)
2. Jump to end: currentPlayerIndex = auctionQueue.length
3. Set phase = 'waiting'
4. Emit 'auction_complete'
5. emitRoomState()
```

---

### 3. Bidding Events

#### `place_bid`
**Requires:** Player in room with team | **Validation:** Complex

```typescript
Input:  { roomCode: string }

Validation Chain (must ALL pass):
✗ Room missing          → getRoomOrNotify() → return
✗ Player not found      → return
✗ No team selected      → return
[Then delegate to placeBid(room, teamId)]

Call: placeBid(room, teamId, isAI=false)
```

**See "Bidding & Resolution" section for placeBid() details**

---

#### `pass_bid`
**Requires:** Player in room with team, phase='bidding'

```typescript
Input:  { roomCode: string }

Validations:
✗ Phase not 'bidding'   → return
✗ Player not found      → return
✗ No team               → return

Actions:
1. Add teamId to passedTeams array (if not already there)
2. Set team.status = 'passed'
3. emitRoomState()

Note: If ALL teams pass, current bid stays 0 → player unsold
```

---

#### `send_chat`
**Requires:** Player in room

```typescript
Input:  { roomCode: string, text: string }

Actions:
1. Find player by socketId
2. Create ChatMessage:
   - type: 'user'
   - sender: playerName
   - text: input
   - teamId: player.teamId
   - id: auto-generated
   - timestamp: Date.now()
3. Push to room.state.chat
4. Keep max 100 messages (FIFO)
5. emitRoomState() [broadcasts to all]
```

---

### 4. Room Cleanup

#### `reset_room`
**Requires:** Host | **Protection:** Yes

```typescript
Pre-condition: Host only

Actions:
1. clearAllTimers(room)
2. Reset auction state → all defaults
3. Reset all 10 teams:
   - ownerId = null, ownerName = null
   - purseRemaining = 12000
   - squad = []
   - overseasCount = 0
   - status = 'idle'
4. Reset all players:
   - teamId = null, isReady = false
5. Clear chat
6. Set isLocked = false
7. Emit 'room_reset' (clients go to lobby)
8. emitRoomState()
```

---

#### `leave_room`
**Any player** | **Triggers:** handleLeaveRoom(socketId, isDisconnect=false)

```typescript
Explicit Leave Actions:
1. Cancel any pending reconnect timeout
2. Release team ownership
3. Remove player from roster
4. Socket leaves room
5. If was host: transfer to first active
6. If room now empty: delete room immediately
7. emitRoomState()

During Locked Auction:
- Treat as temporary disconnect (120s grace)
```

---

#### `kick_player`
**Requires:** Host | **Protection:** Yes

```typescript
Input:  { roomCode: string, targetSocketId: string }

Actions:
1. Find player by socketId
2. Release team ownership
3. Remove player from roster
4. Emit 'kicked' event to target socket
5. Socket forcibly leaves room
6. emitRoomState()
```

---

### 5. State Requests

#### `request_room_state`
**Used for:** Client reconnect sync, stale detection recovery

```typescript
Input:  { roomCode: string }

Actions:
1. Join socket to room (if not already)
2. emitRoomState(roomCode)
```

---

## Auction State Machine

### Phases & Transitions

```
┌─────────────────────────────────────────────────────┐
│ 'waiting'                                           │
│ (before auction or after complete)                  │
└──────────────────────┬────────────────────────────┬─
                       │                            │
                       │ start_auction()            │ auction_complete()
                       ▼                            │
         ┌──────────────────────────┐               │
         │ 'bidding'                │◄──────────────┘
         │ Timer counting down      │
         │ Teams can bid/pass       │
         └──────────┬────────────┬──┘
                    │            │
        Timer = 0   │            │ Manual end_auction
                    ▼            │ or all passed
         ┌──────────────────┐    │
         │ RESOLVE PLAYER   │    │
         └──────┬───────────┘    │
                │                │
     ┌──────────┴────────┐       │
     │                   │       │
     ▼                   ▼       │
 'sold'             'unsold'     │
 (had bid)          (no bid)     │
     │                   │       │
     └───┬───────────┬───┘       │
         │           │          │
    4s delay autoAdvance        │
         │           │          │
         └─────┬─────┘          │
              │                │
              ▼                │
         'advancing'           │
         (internal state)      │
              │                │
         1s delay              │
              │                │
              └────┬───────────┤
                   │           │
                   ▼           ▼
              'bidding' ←──────┘
              (next player)
```

### State Persistence
- **RoomState** persists across phases
- **Auction-specific fields** reset on advance:
  - `currentBid = 0`
  - `nextBidAmount = null`
  - `highestBidderId = null`
  - `passedTeams = []`

---

## Timer System

### Timer Configuration
```typescript
AUCTION_START_TICKS = 100             // 100 ticks = 10 seconds
AUCTION_TIMER_TICK_MS = 100           // Each tick = 100ms
AUCTION_DELAY_RESOLVE_TO_NEXT_MS = 4000     // 4s after sold/unsold
AUCTION_DELAY_ADVANCE_TO_BIDDING_MS = 1000  // 1s before next bidding starts
AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS = 200  // Recovery delay
```

### Timer Display
- **Server ticks:** 100 (100ms × 100 = 10 seconds)
- **Client display:** `ticks / 10` (shows 10.0 seconds)
- **Emit rate:** Every tick (every 100ms)
- **Log rate:** Every 10 ticks (every 1 second)

### startTimer(room)

**Pre-conditions (guards):**
```
if (isPaused) return;
if (timerInterval already active) return;
if (isAdvancing) return;
if (phase !== 'bidding') return;
if (currentPlayerIndex >= auctionQueue.length) return;
```

**Operation:**
```typescript
timerInterval = setInterval(() => {
  // Check conditions again (state might change)
  if (isPaused || phase !== 'bidding') {
    clearInterval & return;
  }
  
  if (currentPlayerIndex >= queue.length) {
    clearInterval;
    emit 'auction_complete';
    return;
  }
  
  // Core timer logic
  ticks -= 1;
  emit 'timer_update' { ticks };
  
  // Log every second
  if (ticks > 0 && ticks % 10 === 0) {
    log `[Timer] ticks=${ticks}`;
  }
  
  // Timer expired
  if (ticks <= 0) {
    clearInterval;
    isAdvancing = true;
    resolveCurrentPlayer(room);
  }
}, AUCTION_TIMER_TICK_MS);
```

**Error Handling:**
```typescript
try {
  // timer loop
} catch (tickError) {
  clearInterval(timerInterval);
  timerInterval = null;
  console.error('[CRITICAL] Timer loop failure:', tickError);
}
```

### scheduleAutoAdvance(room, delayMs, reason)
Schedules delayed auto-progression:
```typescript
if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout);

autoAdvanceTimeout = setTimeout(() => {
  autoAdvanceTimeout = null;
  advanceToNextPlayer(room, reason);
}, delayMs);

logAuctionEvent(room, 'auto_advance_scheduled', { delayMs, reason });
```

**Used for:**
- After 'sold' phase: 4s delay to show results
- After 'unsold' phase: 4s delay to show results
- From 'advancing': 1s delay before bidding UI appears

---

## Bidding & Resolution

### placeBid(room, teamId, isAI = false)

**Returns:** `boolean` (success/failure)

**Validation Chain:**
```typescript
if (isPaused) return false;
if (phase !== 'bidding') return false;
if (isAdvancing) return false;

const player = getCurrentAuctionPlayer(state);
if (!player) return false;

const normalizedAmount = getAuthoritativeNextBid(state);
if (normalizedAmount === null) return false;

// ⚠️ AI bids ALWAYS rejected (human-only system)
if (isAI) return false;

// Team ownership check
const owningPlayer = state.players.find(p => p.teamId === teamId);
if (!owningPlayer || team.ownerId !== owningPlayer.socketId) return false;

// Financial check
if (team.purseRemaining < normalizedAmount) return false;

// Squad size check
if (team.squad.length >= MAX_SQUAD_SIZE) return false;  // 25

// Overseas check
if (player.isOverseas && team.overseasCount >= MAX_OVERSEAS_PLAYERS) return false;  // 8
```

**State Mutations:**
```typescript
state.auction.currentBid = normalizedAmount;
state.auction.highestBidderId = teamId;

// Update all team statuses
ALL_TEAM_IDS.forEach(id => {
  if (state.teams[id].status === 'leading')
    state.teams[id].status = 'idle';
});
team.status = 'leading';

// Reset timer
state.auction.ticks = AUCTION_START_TICKS;  // 100

// Recalculate next bid
syncAuctionDerivedState(state);
```

**Broadcasts:**
```typescript
emit 'bid_placed' { teamId, teamName, amount, isAI }
addChatMessage(room, {
  type: 'system_bid',
  teamId,
  playerName: player.name,
  amount: normalizedAmount
});
emitRoomState(roomCode);
scheduleAiBids(room);  // disabled
```

---

### resolveCurrentPlayer(room)

**Validates player exists:**
```typescript
const playerId = getCurrentPlayerId(state);
if (!playerId) {
  // Recovery: schedule retry in 200ms
  state.auction.isAdvancing = false;
  scheduleAutoAdvance(room, AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS, 'missing_player_id');
  return;
}

const player = getPlayerById(playerId);
if (!player) {
  // Recovery: schedule retry in 200ms
  state.auction.isAdvancing = false;
  scheduleAutoAdvance(room, AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS, 'missing_player_record');
  return;
}
```

**If Sold (highestBidderId exists):**
```typescript
state.auction.phase = 'sold';
const team = state.teams[highestBidderId];
const amountPaid = toSafeLakhs(currentBid);

team.purseRemaining -= amountPaid;
team.squad.push({ id: player.id, price: amountPaid });

if (player.isOverseas) team.overseasCount += 1;

emit 'player_sold' {
  teamId, teamName, amount, playerName, playerId
};

addChatMessage(room, {
  type: 'system_sold',
  teamId,
  playerName,
  amount
});
```

**If Unsold (no highestBidderId):**
```typescript
state.auction.phase = 'unsold';

emit 'player_unsold' { playerName, playerId };

addChatMessage(room, {
  type: 'system_unsold',
  playerName
});
```

**Both Paths:**
```typescript
// Reset team statuses
ALL_TEAM_IDS.forEach(id => {
  state.teams[id].status = 'idle';
});

emitRoomState(roomCode);

// Schedule next progression (4s delay for results display)
scheduleAutoAdvance(room, AUCTION_DELAY_RESOLVE_TO_NEXT_MS, 'resolve_complete');
```

**Error Handling:**
```typescript
try {
  // resolution logic
} catch (error) {
  console.error(`[CRITICAL] Error in resolveCurrentPlayer for room ${room.state.roomCode}:`, error);
}
```

---

### advanceToNextPlayer(room, reason = 'unknown')

**Initialization:**
```typescript
state.auction.isAdvancing = true;

if (biddingStartTimeout) {
  clearTimeout(biddingStartTimeout);
  biddingStartTimeout = null;
}
```

**Increment & Validate:**
```typescript
state.auction.phase = 'advancing';
state.auction.currentPlayerIndex += 1;

// Reset bidding state
state.auction.currentBid = 0;
state.auction.nextBidAmount = null;
state.auction.highestBidderId = null;
state.auction.passedTeams = [];
state.auction.isAdvancing = false;

// Skip invalid players (shouldn't happen, but defensive)
while (currentPlayerIndex < queue.length) {
  const candidateId = queue[currentPlayerIndex];
  if (candidateId && getPlayerById(candidateId)) break;
  
  logAuctionEvent(room, 'advance_skipping_invalid_player', { candidateId, reason });
  currentPlayerIndex += 1;
}
```

**Check if Auction Complete:**
```typescript
if (currentPlayerIndex >= auctionQueue.length) {
  logAuctionEvent(room, 'auction_complete', { reason });
  emit 'auction_complete';
  return;  // Stop here
}
```

**Notify Advancing:**
```typescript
const nextPlayerId = queue[currentPlayerIndex];
logAuctionEvent(room, 'player_advancing', { nextPlayerId, reason });
emit 'player_advancing' { nextPlayerId, nextPlayerIndex };
emitRoomState();
```

**Schedule Delayed Bidding Start:**
```typescript
biddingStartTimeout = setTimeout(() => {
  biddingStartTimeout = null;
  
  // Check pause condition
  if (state.auction.isPaused) {
    logAuctionEvent(room, 'bidding_start_deferred_due_pause', { nextPlayerId });
    return;  // Wait until resumed
  }
  
  // Validate player again
  const nextPlayer = getPlayerById(nextPlayerId);
  if (!nextPlayer) {
    logAuctionEvent(room, 'advance_missing_next_player', { nextPlayerId });
    advanceToNextPlayer(room, 'missing_next_player_post_delay');
    return;
  }
  
  // Transition to bidding phase
  state.auction.currentBid = normalizeBasePrice(nextPlayer.basePrice);
  state.auction.currentSetName = getSetNameForPlayer(nextPlayerId);
  state.auction.phase = 'bidding';
  
  // Ensure ticks valid
  if (ticks <= 0 || isNaN(ticks)) {
    state.auction.ticks = AUCTION_START_TICKS;
  }
  
  emitRoomState();
  startTimer(room);
  scheduleAiBids(room);  // disabled
}, AUCTION_DELAY_ADVANCE_TO_BIDDING_MS);  // 1s
```

**Error Handling:**
```typescript
try {
  // outer advance logic
} catch (error) {
  console.error(`[CRITICAL] Error in advanceToNextPlayer:`, error);
}

// Inside delayed start:
try {
  // delayed logic
} catch (innerError) {
  console.error(`[CRITICAL] Error in advanceToNextPlayer delayed start:`, innerError);
}
```

---

## BL1 Set Transition Logic

### Set Definitions (auctionSets.ts)
```typescript
{
  setName: 'BL1 — Capped Bowlers',
  filter: (p: Player) => belongsToSet(p, 'BL1', (p) =>
    p.isCapped &&
    p.role === 'BOWL' &&
    (p.starRating === 4 || p.starRating === 3)
  )
}
```

### Manual Promotion to BL1
```typescript
const MANUAL_SET_OVERRIDES: Record<string, string> = {
  'Lockie Ferguson': 'BL1',
  'Sandeep Sharma': 'BL1',
  // ... other overrides
};
```

### Transition Mechanism
**No special BL1-specific transition code.** Transition is automatic:

1. During `createAuctionQueue()`:
   - Set definitions are processed in order
   - BL1 players are collected and shuffled
   - BL1 is queued between AL1 and BA2
   
2. During `advanceToNextPlayer()`:
   - `getSetNameForPlayer(nextPlayerId)` looks up which set player belongs to
   - Returns "BL1 — Capped Bowlers"
   - Stored in `state.auction.currentSetName`
   - Emitted with 'player_advancing' event
   
3. Client receives set name and displays it visually

### Key Point
- Set transitions are **natural** - just next player in queue
- No special pause, animation, or delay for BL1 specifically
- Just part of normal set progression

---

## Room Lifecycle

### Room Creation → Initialization
```
connect → create_room → Room stored in Map
                           ├─ timerInterval = null
                           ├─ autoAdvanceTimeout = null
                           ├─ biddingStartTimeout = null
                           ├─ aiTimeouts = []
                           └─ deletionTimeout = undefined
```

### Room During Auction
```
join_room → start_auction → isLocked = true
                              ├─ timerInterval active
                              ├─ autoAdvanceTimeout may be set
                              └─ biddingStartTimeout may be set
```

### Room After Auction
```
end_auction or complete → clearAllTimers()
                          phase = 'waiting'
                          isLocked may still be true
```

### Room Cleanup (Player Disconnect)

#### Temporary Disconnect (isDisconnect=true)
```
disconnect or
leave_room during locked room
    ↓
handleLeaveRoom(socketId, isDisconnect=true)
    ├─ Mark socketId = '' (offline)
    ├─ Emit room state (shows offline)
    ├─ Clear old reconnect timeout
    └─ Set NEW reconnect timeout (120s)
         ├─ After 120s, if still offline:
         │   ├─ If host & NOT locked: transfer host
         │   ├─ If NOT locked: remove player
         │   └─ If empty & all offline: set deletion timeout (60min)
         └─ If reconnected: clear timeout, restore state
```

#### Explicit Leave (isDisconnect=false)
```
leave_room during unlocked room
    ↓
handleLeaveRoom(socketId, isDisconnect=false)
    ├─ Cancel reconnect timeout
    ├─ Release team immediately
    ├─ Remove player immediately
    ├─ Transfer host if needed
    └─ Delete room if empty
```

### Room Deletion
```
All players offline & empty room
    ↓
Set deletionTimeout = 3600000ms (60 minutes)
    ├─ If any player comes online: clear timeout
    └─ If still empty after 60min: delete room from Map
```

---

## Room Deletion Scenarios
| Scenario | Deletion Timing | Notes |
|----------|-----------------|-------|
| All explicit leave | Immediate | Can rejoin only if host kept room |
| Last player offline | 120s + 60min | 120s grace for reconnect, then 60min cleanup |
| Empty room exists | 60min inactivity | Hosts can keep room indefinitely by staying online |
| All players offline | 60min | Conservative cleanup window |

---

## Host Transfer Logic

### When Transferred
1. **Current host disconnects** during unlocked room
   - After 120s grace period
   - If still offline: transfer to first active player
   
2. **Host leaves explicitly** during unlocked room
   - Immediate transfer to first active

### When NOT Transferred
- Host disconnects during **locked room** (auction ongoing)
  - Host privileges preserved
  - Just socketId marked offline
  - If host reconnects: restored with same privileges
  
- No more active players remain
  - No host to transfer to
  - First to reconnect becomes new host

---

## Error Handling

### 1. Room Validation Pattern
```typescript
const getRoomOrNotify = (socket, roomCode, source) => {
  const room = rooms.get(roomCode);
  if (!room) {
    emitRoomUnavailable(socket, roomCode, source);
    return null;
  }
  return room;
};

// Usage
socket.on('some_event', ({ roomCode }) => {
  const room = getRoomOrNotify(socket, roomCode, 'some_event');
  if (!room) return;  // Early exit on missing room
  // ... proceed with room
});
```

### 2. Player Validation Pattern
```typescript
const player = room.state.players.find(p => p.socketId === socket.id);
if (!player || !player.teamId) return;  // Silent exit if not found
```

### 3. Critical Section Try-Catch

#### resolveCurrentPlayer()
```typescript
try {
  // resolution logic
  // - get player by ID (with recovery)
  // - update squad or mark unsold
  // - schedule auto-advance
} catch (error) {
  console.error(`[CRITICAL] Error in resolveCurrentPlayer for room ${room.state.roomCode}:`, error);
}
```

#### advanceToNextPlayer()
```typescript
try {
  // outer advance logic
  // - increment index
  // - validate player
  // - emit advancing event
} catch (error) {
  console.error(`[CRITICAL] Error in advanceToNextPlayer:`, error);
}

// Inner try-catch in delayed callback
biddingStartTimeout = setTimeout(() => {
  try {
    // delayed bidding start logic
  } catch (innerError) {
    console.error(`[CRITICAL] Error in advanceToNextPlayer delayed start:`, innerError);
  }
}, AUCTION_DELAY_ADVANCE_TO_BIDDING_MS);
```

#### Timer Loop
```typescript
try {
  // tick logic
  // - decrement ticks
  // - emit update
  // - resolve if expired
} catch (tickError) {
  clearInterval(timerInterval);
  timerInterval = null;
  console.error(`[CRITICAL] Timer loop failure for room ${room.state.roomCode}:`, tickError);
}
```

### 4. Recovery Mechanisms

#### Missing Player in Queue
```typescript
if (!playerId) {
  logAuctionEvent(room, 'resolve_missing_player_id');
  state.auction.isAdvancing = false;
  scheduleAutoAdvance(room, AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS, 'missing_player_id');
  return;
}
```
**Result:** Retries in 200ms

#### Missing Player Record
```typescript
if (!player) {
  logAuctionEvent(room, 'resolve_missing_player_record', { playerId });
  state.auction.isAdvancing = false;
  scheduleAutoAdvance(room, AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS, 'missing_player_record');
  return;
}
```
**Result:** Retries in 200ms

#### Invalid Player in Queue During Advance
```typescript
while (currentPlayerIndex < queue.length) {
  const candidateId = queue[currentPlayerIndex];
  if (candidateId && getPlayerById(candidateId)) break;  // Valid found
  
  logAuctionEvent(room, 'advance_skipping_invalid_player', { candidateId, reason });
  currentPlayerIndex += 1;  // Auto-skip invalid
}
```
**Result:** Automatically skips to next valid player

---

## Reconnection Logic

### Server-Side Reconnect Handler

#### Join Room with Reconnect Detection
```typescript
socket.on('join_room', ({ roomCode, playerName, userId }) => {
  const room = rooms.get(roomCode);
  if (!room) {
    emitRoomUnavailable(socket, roomCode, 'join_room');
    return;
  }

  // Clear deletion timeout (room's not being deleted now)
  if (room.deletionTimeout) {
    clearTimeout(room.deletionTimeout);
    room.deletionTimeout = null;
  }

  // Check for existing player
  const reconnectKey = `${roomCode}_${userId}`;
  const legacyKey = `${roomCode}_${playerName}`;
  
  [reconnectKey, legacyKey].forEach((key) => {
    const pendingTimeout = reconnectTimeouts.get(key);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      reconnectTimeouts.delete(key);
    }
  });

  // Detect existing player
  const existingPlayerIndex = room.state.players.findIndex(
    p => p.userId === userId || 
         (p.userId === undefined && p.name === playerName)
  );
  const isRejoining = existingPlayerIndex !== -1;

  if (isRejoining) {
    // Restore player state
    const oldPlayer = room.state.players[existingPlayerIndex];
    oldPlayer.socketId = socket.id;  // Restore socketId
    
    if (oldPlayer.teamId) {
      room.state.teams[oldPlayer.teamId].ownerId = socket.id;
    }
    
    if (oldPlayer.isHost) {
      room.state.hostId = socket.id;
    }
  } else {
    // New player (if not locked)
    if (!room.state.isLocked && room.state.players.filter(p => p.socketId !== '').length < 10) {
      room.state.players.push({
        socketId: socket.id,
        userId,
        name: playerName,
        teamId: null,
        isHost: room.state.players.length === 0,
        isReady: false
      });
    }
  }

  socket.join(roomCode);
  emitRoomState(roomCode);
});
```

### Disconnect Handler with Grace Period
```typescript
socket.on('disconnect', () => {
  handleLeaveRoom(socket.id, isDisconnect=true);
});

const handleLeaveRoom = (socketId, isDisconnect) => {
  rooms.forEach((room, roomCode) => {
    const playerIndex = room.state.players.findIndex(p => p.socketId === socketId);
    if (playerIndex === -1) return;

    const player = room.state.players[playerIndex];

    if (isDisconnect) {
      // Mark offline but keep in roster
      player.socketId = '';
      
      if (player.teamId && !room.state.isLocked) {
        room.state.teams[player.teamId].ownerId = null;
      }

      emitRoomState(roomCode);

      // Set up 120-second grace period
      const key = getReconnectKey(roomCode, player);
      const oldTimeout = reconnectTimeouts.get(key);
      if (oldTimeout) clearTimeout(oldTimeout);

      const timeout = setTimeout(() => {
        reconnectTimeouts.delete(key);

        const currentRoom = rooms.get(roomCode);
        if (!currentRoom) return;

        const currentPlayerIndex = currentRoom.state.players.findIndex(
          p => p.userId === player.userId || p.name === player.name
        );
        if (currentPlayerIndex === -1) return;

        const currentPlayer = currentRoom.state.players[currentPlayerIndex];
        
        // Check if they reconnected
        if (currentPlayer.socketId !== '') {
          return;  // They reconnected, do nothing
        }

        // Permanent disconnect after grace period
        // ... (cleanup logic - see earlier section)
      }, 120000);  // 120 seconds

      reconnectTimeouts.set(key, timeout);
    }
  });
};
```

### Client-Side Reconnect (useSocket.ts)

#### Socket Configuration
```typescript
const newSocket = io(VITE_SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
});
```

#### Automatic Reconnect on Tab Visibility
```typescript
const tryReconnectOnVisibility = () => {
  if (document.visibilityState === 'visible' && !newSocket.connected) {
    console.log('[Socket] tab visible; forcing reconnect');
    newSocket.connect();
  }
};

const tryReconnectOnOnline = () => {
  if (!newSocket.connected) {
    console.log('[Socket] browser online; forcing reconnect');
    newSocket.connect();
  }
};

document.addEventListener('visibilitychange', tryReconnectOnVisibility);
window.addEventListener('online', tryReconnectOnOnline);
```

#### Stale Stream Detection
```typescript
const staleStreamInterval = window.setInterval(() => {
  const state = roomStateRef.current;
  if (!state || !newSocket.connected) return;
  if (document.visibilityState !== 'visible') return;
  if (!state.auction.isStarted || state.auction.isPaused) return;
  if (state.auction.phase !== 'bidding') return;

  const staleForMs = Date.now() - lastServerActivityAtRef.current;
  
  if (staleForMs > 15000) {
    console.warn(`[Socket] stale stream for ${staleForMs}ms, forcing reconnect`);
    newSocket.disconnect();
    newSocket.connect();
  } else if (staleForMs > 7000) {
    console.warn(`[Socket] stale stream for ${staleForMs}ms, requesting room state`);
    newSocket.emit('request_room_state', { roomCode: state.roomCode });
  }
}, 2000);
```

**Detection Thresholds:**
- 7s+ without update: Request room state (non-disruptive)
- 15s+ without update: Force disconnect/reconnect

---

## Key Files Reference

### Backend Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| [server/index.ts](server/index.ts) | Main server, Socket handlers, room management | All socket events, room state machine |
| [server/lib/auctionSets.ts](server/lib/auctionSets.ts) | Auction queue builder, set definitions | `createAuctionQueue()`, `getAuctionSets()` |
| [server/lib/allPlayers.ts](server/lib/allPlayers.ts) | Complete 232-player database | `ALL_PLAYERS` array |
| [shared/auctionConfig.ts](shared/auctionConfig.ts) | Game rules constants | `INITIAL_PURSE_LAKHS`, `MAX_SQUAD_SIZE`, `MAX_OVERSEAS_PLAYERS` |
| [shared/auctionPricing.ts](shared/auctionPricing.ts) | Bid calculations | `getNextBid()`, `normalizeBasePrice()`, `getBidIncrement()` |

### Client Files

| File | Purpose | Key Hooks/Functions |
|------|---------|-------------------|
| [client/src/SocketContext.tsx](client/src/SocketContext.tsx) | React Context wrapper | `SocketProvider`, `useSocketContext` |
| [client/src/hooks/useSocket.ts](client/src/hooks/useSocket.ts) | Socket connection management | All socket event subscriptions, bidding/room actions |

---

## Configuration Environment Variables

```bash
# Timing (milliseconds)
AUCTION_START_TICKS=100
AUCTION_TIMER_TICK_MS=100
AUCTION_DELAY_RESOLVE_TO_NEXT_MS=4000
AUCTION_DELAY_ADVANCE_TO_BIDDING_MS=1000
AUCTION_DELAY_MISSING_PLAYER_RECOVERY_MS=200

# Socket (milliseconds)
SOCKET_PING_INTERVAL_MS=25000
SOCKET_PING_TIMEOUT_MS=120000
SOCKET_RECOVERY_WINDOW_MS=120000

# Server
PORT=3005 (default)
VITE_SERVER_URL=http://localhost:3005 (or production URL)
```

---

## Summary: Complete Event Flow

### Create Room → Auction → Resolution

```
1. Client emits 'create_room'
   → Server: Generate code, init room, emit 'room_created'

2. Clients emit 'join_room'
   → Server: Add to room, emit 'room_joined'

3. Clients emit 'select_team'
   → Server: Assign teams, mark ready

4. Host emits 'start_auction'
   → Server: Create queue, lock room, set phase='bidding', startTimer()

5. Timer runs (100 ticks = 10s)
   → Server: Emit 'timer_update' every 100ms
   → Client: Update UI countdown

6. While bidding, client emits 'place_bid' or 'pass_bid'
   → Server: Validate, update state, broadcast 'bid_placed'

7. Timer expires (ticks ≤ 0)
   → Server: Stop timer, resolveCurrentPlayer()
   → If bid: phase='sold', emit 'player_sold'
   → If no bid: phase='unsold', emit 'player_unsold'

8. Auto-advance after 4s
   → Server: advanceToNextPlayer(), phase='advancing'
   → Emit 'player_advancing'

9. Auto-advance after 1s
   → Server: phase='bidding', set new player, startTimer()

10. Repeat steps 5-9 for each player in queue

11. Queue exhausted
    → Server: Emit 'auction_complete'
    → Client: Show results, allow reset
```

---

## Critical Safety Patterns

### isAdvancing Flag
Prevents double-resolution during state transitions:
```typescript
if (room.state.auction.isAdvancing) return false;  // Bid rejected
room.state.auction.isAdvancing = true;              // Set during resolve
room.state.auction.isAdvancing = false;             // Clear during advance
```

### isPaused Flag
Blocks all timer operations:
```typescript
if (state.auction.isPaused) {
  clearInterval(timerInterval);
  return;  // Stop timer
}
```

### clearAllTimers()
Ensures clean state before major transitions:
```typescript
function clearAllTimers(room: Room) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
  if (room.biddingStartTimeout) clearTimeout(room.biddingStartTimeout);
  room.aiTimeouts.forEach(clearTimeout);
  
  room.timerInterval = null;
  room.autoAdvanceTimeout = null;
  room.biddingStartTimeout = null;
  room.aiTimeouts = [];
}
```

### isLocked Flag
Prevents mid-game joins/leaves:
```typescript
if (!isRejoining && room.state.isLocked) {
  socket.emit('error', { message: 'Room is locked' });
  return;
}
```

---

## Performance Considerations

### Timer Broadcasts
- Every 100ms: emit 'timer_update' to all players
- Every second: log timer tick
- Expected: ~10 emissions per player per second per room

### State Broadcasts
- After every significant event: emitRoomState()
- Contains: full room state, chat history, all team states
- Size: ~1-2KB per broadcast
- Frequency: ~10-20 times per auction (depends on bidding intensity)

### Reconnect Memory
- `reconnectTimeouts`: One entry per disconnected player
- Cleared after 120s or reconnect
- Max size: ≤ rooms × 10 players × potentially many concurrent disconnects

### Room Cleanup
- Rooms marked for deletion after 60 min of zero active players
- Deletion timeout cleared if any player comes online
- Conservative approach prevents accidental loss of room state

