"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimerManager = exports.AuctionTimer = void 0;
const events_1 = require("events");
class AuctionTimer extends events_1.EventEmitter {
    constructor(initialTicks, tickDurationMs = 1000) {
        super();
        this.interval = null;
        this.paused = false;
        this.currentTicks = initialTicks;
        this.tickDurationMs = tickDurationMs;
    }
    start() {
        if (this.interval)
            return;
        this.paused = false;
        this.emit('timer:resumed', { ticks: this.currentTicks });
        this.interval = setInterval(() => this.tick(), this.tickDurationMs);
    }
    tick() {
        if (this.paused || this.currentTicks <= 0)
            return;
        this.currentTicks -= 1;
        this.emit('timer:tick', { ticks: this.currentTicks });
        if (this.currentTicks <= 0) {
            this.stop();
            this.emit('timer:expired');
        }
    }
    pause() {
        if (this.paused || !this.interval)
            return;
        this.paused = true;
        clearInterval(this.interval);
        this.interval = null;
        this.emit('timer:paused', { ticks: this.currentTicks });
    }
    resume() {
        if (!this.paused || this.interval)
            return;
        this.paused = false;
        this.emit('timer:resumed', { ticks: this.currentTicks });
        this.interval = setInterval(() => this.tick(), 1000);
    }
    reset(ticks) {
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
exports.AuctionTimer = AuctionTimer;
class TimerManager {
    constructor() {
        this.timers = new Map();
    }
    createTimer(roomCode, initialTicks, tickDurationMs = 1000) {
        const existing = this.timers.get(roomCode);
        if (existing) {
            existing.destroy();
        }
        const timer = new AuctionTimer(initialTicks, tickDurationMs);
        this.timers.set(roomCode, timer);
        return timer;
    }
    getTimer(roomCode) {
        return this.timers.get(roomCode) ?? null;
    }
    destroyTimer(roomCode) {
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
exports.TimerManager = TimerManager;
