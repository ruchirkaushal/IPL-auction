"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketMessageVersion = exports.RateLimiter = exports.SocketEventQueue = void 0;
class SocketEventQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }
    enqueue(event) {
        this.queue.push(event);
        this.processNext();
    }
    async processNext() {
        if (this.isProcessing || this.queue.length === 0)
            return;
        this.isProcessing = true;
        const event = this.queue.shift();
        if (event) {
            await Promise.resolve();
        }
        this.isProcessing = false;
        if (this.queue.length > 0) {
            this.processNext();
        }
    }
    flush() {
        this.queue = [];
        this.isProcessing = false;
    }
}
exports.SocketEventQueue = SocketEventQueue;
class RateLimiter {
    constructor(maxRequests = 100, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }
    allow(socketId) {
        const now = Date.now();
        const record = this.requests.get(socketId);
        if (!record || now - record.windowStart >= this.windowMs) {
            this.requests.set(socketId, { count: 1, windowStart: now });
            return true;
        }
        if (record.count >= this.maxRequests) {
            return false;
        }
        record.count += 1;
        return true;
    }
}
exports.RateLimiter = RateLimiter;
class SocketMessageVersion {
    constructor() {
        this.versions = new Map();
    }
    getVersion(socketId) {
        return this.versions.get(socketId) ?? 0;
    }
    bumpVersion(socketId) {
        const version = this.getVersion(socketId) + 1;
        this.versions.set(socketId, version);
        return version;
    }
}
exports.SocketMessageVersion = SocketMessageVersion;
