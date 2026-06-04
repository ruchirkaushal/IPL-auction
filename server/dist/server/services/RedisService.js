"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
class RedisService {
    constructor() {
        this.cache = new Map();
        this.channels = new Map();
    }
    async cacheRoom(roomCode, roomState) {
        this.cache.set(roomCode, JSON.parse(JSON.stringify(roomState)));
    }
    async getCachedRoom(roomCode) {
        return this.cache.get(roomCode) ?? null;
    }
    async publishRoomState(roomCode, payload) {
        const subscribers = this.channels.get(roomCode);
        if (!subscribers)
            return;
        subscribers.forEach(cb => cb(payload));
    }
    subscribeToRoom(roomCode, subscriber) {
        if (!this.channels.has(roomCode)) {
            this.channels.set(roomCode, new Set());
        }
        this.channels.get(roomCode)?.add(subscriber);
    }
    unsubscribeFromRoom(roomCode, subscriber) {
        this.channels.get(roomCode)?.delete(subscriber);
    }
    async setSession(key, value) {
        this.cache.set(key, JSON.parse(JSON.stringify(value)));
    }
    async getSession(key) {
        return this.cache.get(key) ?? null;
    }
    async recordMetric(name, payload) {
        console.log(`[RedisService] metric ${name}`, payload);
    }
    async healthCheck() {
        return { status: 'ok' };
    }
}
exports.RedisService = RedisService;
