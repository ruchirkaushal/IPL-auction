"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const events_1 = require("events");
class RoomService extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.persistenceCache = new Map();
    }
    async loadRoom(roomCode) {
        const cached = this.persistenceCache.get(roomCode);
        if (cached) {
            return JSON.parse(JSON.stringify(cached));
        }
        return null;
    }
    async loadAllRooms() {
        const snapshot = new Map();
        this.persistenceCache.forEach((state, roomCode) => {
            snapshot.set(roomCode, JSON.parse(JSON.stringify(state)));
        });
        return snapshot;
    }
    async saveRoom(room) {
        this.persistenceCache.set(room.state.roomCode, JSON.parse(JSON.stringify(room.state)));
        await this.recordEvent(room, 'room_saved', { players: room.state.players.length });
    }
    async recordEvent(room, event, context) {
        const timelineEvent = {
            time: Date.now(),
            event,
            context: context ?? {}
        };
        room.lifecycleTimeline.push(timelineEvent);
        this.emit('room_event', { roomCode: room.state.roomCode, event, context });
    }
    async updatePlayerSession(roomCode, userId, status) {
        this.emit('session_update', { roomCode, userId, status });
    }
    async createSnapshot(room) {
        await this.recordEvent(room, 'snapshot_created', { snapshotSize: room.state.players.length });
    }
    async cleanupStaleRooms() {
        const cutoff = Date.now() - 1000 * 60 * 60;
        this.persistenceCache.forEach((state, roomCode) => {
            if (state.auction.phase === 'waiting' && state.auction.currentPlayerIndex === 0) {
                this.persistenceCache.delete(roomCode);
            }
        });
    }
}
exports.RoomService = RoomService;
