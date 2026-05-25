import { EventEmitter } from 'events';

/**
 * AuctionTimer - Simple, reliable timer using EventEmitter pattern
 * Replaces the complex 11+ timeout system with a single, clean interface
 */
export class AuctionTimer extends EventEmitter {
  private tickInterval: NodeJS.Timeout | null = null;
  private ticks: number = 0;
  private isPaused: boolean = false;
  private isRunning: boolean = false;
  private roomCode: string;
  private roomGeneration: number;
  private tickDurationMs: number;
  private initialTicks: number;

  /**
   * Create a new auction timer
   * @param roomCode - The room code this timer belongs to
   * @param roomGeneration - The generation number to detect stale timers
   * @param initialTicks - How many ticks to start with (default 100 = 10 seconds @ 100ms)
   * @param tickDurationMs - How long each tick is (default 100ms)
   */
  constructor(
    roomCode: string,
    roomGeneration: number,
    initialTicks: number = 100,
    tickDurationMs: number = 100
  ) {
    super();
    this.roomCode = roomCode;
    this.roomGeneration = roomGeneration;
    this.initialTicks = initialTicks;
    this.tickDurationMs = tickDurationMs;
    this.ticks = initialTicks;
  }

  /**
   * Start the timer
   * Emits 'timer:started' event
   */
  start(): void {
    if (this.isRunning) {
      console.warn(`[AuctionTimer ${this.roomCode}] Timer already running`);
      return;
    }

    if (this.isPaused) {
      console.warn(`[AuctionTimer ${this.roomCode}] Timer is paused, cannot start`);
      return;
    }

    this.isRunning = true;
    this.ticks = this.initialTicks;

    this.tickInterval = setInterval(() => this.onTick(), this.tickDurationMs);

    this.emit('timer:started', {
      roomCode: this.roomCode,
      ticks: this.ticks,
      timestamp: Date.now(),
    });

    console.log(`[AuctionTimer ${this.roomCode}] Timer started (${this.ticks} ticks)`);
  }

  /**
   * Stop the timer completely
   * Emits 'timer:stopped' event
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.isRunning = false;
    this.isPaused = false;

    this.emit('timer:stopped', {
      roomCode: this.roomCode,
      timestamp: Date.now(),
    });

    console.log(`[AuctionTimer ${this.roomCode}] Timer stopped`);
  }

  /**
   * Pause the timer (can be resumed)
   * Emits 'timer:paused' event
   */
  pause(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.isPaused = true;
    this.isRunning = false;

    this.emit('timer:paused', {
      roomCode: this.roomCode,
      ticks: this.ticks,
      timestamp: Date.now(),
    });

    console.log(`[AuctionTimer ${this.roomCode}] Timer paused (${this.ticks} ticks remaining)`);
  }

  /**
   * Resume from pause
   * Emits 'timer:resumed' event
   */
  resume(): void {
    if (!this.isPaused) {
      console.warn(`[AuctionTimer ${this.roomCode}] Timer is not paused`);
      return;
    }

    this.isPaused = false;
    this.isRunning = true;

    this.tickInterval = setInterval(() => this.onTick(), this.tickDurationMs);

    this.emit('timer:resumed', {
      roomCode: this.roomCode,
      ticks: this.ticks,
      timestamp: Date.now(),
    });

    console.log(`[AuctionTimer ${this.roomCode}] Timer resumed (${this.ticks} ticks remaining)`);
  }

  /**
   * Reset timer to a new tick value
   * Emits 'timer:reset' event
   */
  reset(newTicks: number = this.initialTicks): void {
    this.ticks = newTicks;

    this.emit('timer:reset', {
      roomCode: this.roomCode,
      ticks: this.ticks,
      timestamp: Date.now(),
    });

    console.log(
      `[AuctionTimer ${this.roomCode}] Timer reset to ${this.ticks} ticks`
    );
  }

  /**
   * Internal tick handler
   * Called every tickDurationMs milliseconds
   */
  private onTick(): void {
    // NOTE: Room validation should be done by caller
    // If room is stale (deleted or generation mismatch), caller should destroy this timer

    this.ticks -= 1;

    // Emit tick event (backends might log every 10th tick)
    if (this.ticks % 10 === 0 || this.ticks <= 0) {
      this.emit('timer:tick', {
        roomCode: this.roomCode,
        ticks: this.ticks,
        secondsRemaining: (this.ticks * this.tickDurationMs) / 1000,
        timestamp: Date.now(),
      });
    }

    // When timer expires
    if (this.ticks <= 0) {
      this.stop();
      this.emit('timer:expired', {
        roomCode: this.roomCode,
        timestamp: Date.now(),
      });

      console.log(`[AuctionTimer ${this.roomCode}] Timer expired`);
    }
  }

  /**
   * Get current tick value
   */
  getTicks(): number {
    return this.ticks;
  }

  /**
   * Get time remaining in seconds
   */
  getSecondsRemaining(): number {
    return (this.ticks * this.tickDurationMs) / 1000;
  }

  /**
   * Check if timer is currently running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check if timer is paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get room code this timer belongs to
   */
  getRoomCode(): string {
    return this.roomCode;
  }

  /**
   * Get room generation number (for stale detection)
   */
  getRoomGeneration(): number {
    return this.roomGeneration;
  }

  /**
   * Destroy the timer completely
   * Removes all listeners and clears interval
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
    console.log(`[AuctionTimer ${this.roomCode}] Timer destroyed`);
  }

  /**
   * Get timer state as JSON (for debugging/logging)
   */
  getState(): Record<string, any> {
    return {
      roomCode: this.roomCode,
      roomGeneration: this.roomGeneration,
      ticks: this.ticks,
      secondsRemaining: this.getSecondsRemaining(),
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      tickDurationMs: this.tickDurationMs,
    };
  }
}

/**
 * TimerManager - Manages multiple auction timers (one per room)
 */
export class TimerManager {
  private timers: Map<string, AuctionTimer> = new Map();

  /**
   * Create and start a new timer for a room
   */
  createTimer(
    roomCode: string,
    roomGeneration: number,
    initialTicks: number = 100
  ): AuctionTimer {
    // Destroy old timer if exists
    this.destroyTimer(roomCode);

    const timer = new AuctionTimer(roomCode, roomGeneration, initialTicks);
    this.timers.set(roomCode, timer);

    return timer;
  }

  /**
   * Get existing timer for a room
   */
  getTimer(roomCode: string): AuctionTimer | undefined {
    return this.timers.get(roomCode);
  }

  /**
   * Destroy timer for a room
   */
  destroyTimer(roomCode: string): void {
    const timer = this.timers.get(roomCode);
    if (timer) {
      timer.destroy();
      this.timers.delete(roomCode);
    }
  }

  /**
   * Get count of active timers
   */
  getActiveTimerCount(): number {
    return Array.from(this.timers.values()).filter((t) => t.getIsRunning()).length;
  }

  /**
   * Get count of all timers (running + paused)
   */
  getTotalTimerCount(): number {
    return this.timers.size;
  }

  /**
   * Destroy all timers
   */
  destroyAll(): void {
    for (const timer of this.timers.values()) {
      timer.destroy();
    }
    this.timers.clear();
    console.log('[TimerManager] All timers destroyed');
  }

  /**
   * Get summary of all timers
   */
  getSummary(): Record<string, any> {
    const timers = Array.from(this.timers.values());
    return {
      totalTimers: timers.length,
      activeTimers: timers.filter((t) => t.getIsRunning()).length,
      pausedTimers: timers.filter((t) => t.getIsPaused()).length,
      timers: timers.map((t) => t.getState()),
    };
  }
}
