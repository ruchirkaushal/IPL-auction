import { EventEmitter } from 'events';
import type { Room, RoomLifecycleEvent, RoomState } from '../types';

export class RoomService extends EventEmitter {
  private persistenceCache = new Map<string, RoomState>();

  async loadRoom(roomCode: string): Promise<RoomState | null> {
    const cached = this.persistenceCache.get(roomCode);
    if (cached) {
      return JSON.parse(JSON.stringify(cached));
    }
    return null;
  }

  async saveRoom(room: Room): Promise<void> {
    this.persistenceCache.set(room.state.roomCode, JSON.parse(JSON.stringify(room.state)));
    await this.recordEvent(room, 'room_saved', { players: room.state.players.length });
  }

  async recordEvent(room: Room, event: string, context?: any): Promise<void> {
    const timelineEvent: RoomLifecycleEvent = {
      time: Date.now(),
      event,
      context: context ?? {}
    };
    room.lifecycleTimeline.push(timelineEvent);
    this.emit('room_event', { roomCode: room.state.roomCode, event, context });
  }

  async updatePlayerSession(roomCode: string, userId: string, status: string): Promise<void> {
    this.emit('session_update', { roomCode, userId, status });
  }

  async createSnapshot(room: Room): Promise<void> {
    await this.recordEvent(room, 'snapshot_created', { snapshotSize: room.state.players.length });
  }

  async cleanupStaleRooms(): Promise<void> {
    const cutoff = Date.now() - 1000 * 60 * 60;
    this.persistenceCache.forEach((state, roomCode) => {
      if (state.auction.phase === 'waiting' && state.auction.currentPlayerIndex === 0) {
        this.persistenceCache.delete(roomCode);
      }
    });
  }
}
