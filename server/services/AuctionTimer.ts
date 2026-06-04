import { EventEmitter } from 'events';

type AuctionTimerEvents = 'timer:tick' | 'timer:expired' | 'timer:paused' | 'timer:resumed';

export class AuctionTimer extends EventEmitter {
  private currentTicks: number;
  private interval: NodeJS.Timeout | null = null;
  private paused = false;

  constructor(initialTicks: number) {
    super();
    this.currentTicks = initialTicks;
  }

  start() {
    if (this.interval) return;
    this.paused = false;
    this.emit('timer:resumed', { ticks: this.currentTicks });
    this.interval = setInterval(() => this.tick(), 1000);
  }

  private tick() {
    if (this.paused || this.currentTicks <= 0) return;
    this.currentTicks -= 1;
    this.emit('timer:tick', { ticks: this.currentTicks });
    if (this.currentTicks <= 0) {
      this.stop();
      this.emit('timer:expired');
    }
  }

  pause() {
    if (this.paused || !this.interval) return;
    this.paused = true;
    clearInterval(this.interval);
    this.interval = null;
    this.emit('timer:paused', { ticks: this.currentTicks });
  }

  resume() {
    if (!this.paused || this.interval) return;
    this.paused = false;
    this.emit('timer:resumed', { ticks: this.currentTicks });
    this.interval = setInterval(() => this.tick(), 1000);
  }

  reset(ticks: number) {
    this.currentTicks = ticks;
    this.emit('timer:tick', { ticks: this.currentTicks });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.paused = false;
  }

  destroy() {
    this.stop();
    this.removeAllListeners();
  }
}

export class TimerManager {
  private timers = new Map<string, AuctionTimer>();

  createTimer(roomCode: string, initialTicks: number): AuctionTimer {
    const existing = this.timers.get(roomCode);
    if (existing) {
      existing.destroy();
    }
    const timer = new AuctionTimer(initialTicks);
    this.timers.set(roomCode, timer);
    return timer;
  }

  getTimer(roomCode: string): AuctionTimer | null {
    return this.timers.get(roomCode) ?? null;
  }

  destroyTimer(roomCode: string) {
    const timer = this.timers.get(roomCode);
    if (timer) {
      timer.destroy();
      this.timers.delete(roomCode);
    }
  }

  getSummary() {
    return Array.from(this.timers.entries()).map(([roomCode, timer]) => ({ roomCode, listeners: timer.listenerCount('timer:tick') }));
  }
}
