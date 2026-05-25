import { Pool, QueryResult } from 'pg';
import type { RoomState, TeamId } from '../../shared/types';

export interface RoomRecord {
  id: string;
  room_code: string;
  host_id: string;
  state: RoomState;
  is_locked: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface AuctionEventRecord {
  id: string;
  room_id: string;
  event_type: string;
  player_id: string | null;
  player_name: string | null;
  team_id: TeamId | null;
  team_name: string | null;
  amount: number | null;
  metadata: Record<string, any> | null;
  timestamp: Date;
}

/**
 * RoomService - Handles all database operations for rooms
 * Provides persistence layer for auction state
 */
export class RoomService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Load room from database by room code
   */
  async loadRoom(roomCode: string): Promise<RoomState | null> {
    try {
      const result = await this.pool.query(
        'SELECT state FROM rooms WHERE room_code = $1 AND deleted_at IS NULL',
        [roomCode]
      );
      return result.rows[0]?.state || null;
    } catch (error) {
      console.error(`[RoomService] Failed to load room ${roomCode}:`, error);
      return null;
    }
  }

  /**
   * Load room with metadata
   */
  async loadRoomWithMetadata(roomCode: string): Promise<RoomRecord | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM rooms WHERE room_code = $1 AND deleted_at IS NULL',
        [roomCode]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error(`[RoomService] Failed to load room metadata ${roomCode}:`, error);
      return null;
    }
  }

  /**
   * Load all active rooms (useful on server restart)
   */
  async loadAllRooms(): Promise<Map<string, RoomState>> {
    try {
      const result = await this.pool.query(
        'SELECT room_code, state FROM rooms WHERE deleted_at IS NULL AND is_locked = true'
      );
      const rooms = new Map<string, RoomState>();
      for (const row of result.rows) {
        rooms.set(row.room_code, row.state);
      }
      console.log(`[RoomService] Loaded ${rooms.size} active rooms from database`);
      return rooms;
    } catch (error) {
      console.error('[RoomService] Failed to load all rooms:', error);
      return new Map();
    }
  }

  /**
   * Create or update room (upsert)
   */
  async saveRoom(roomCode: string, state: RoomState): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO rooms (room_code, host_id, state, is_locked)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (room_code)
         DO UPDATE SET state = $3, is_locked = $4, updated_at = NOW()`,
        [roomCode, state.hostId, JSON.stringify(state), state.isLocked]
      );
    } catch (error) {
      console.error(`[RoomService] Failed to save room ${roomCode}:`, error);
      throw error;
    }
  }

  /**
   * Record audit event for bid/sale/unsold
   */
  async recordEvent(
    roomCode: string,
    eventType: string,
    data: {
      playerId?: string;
      playerName?: string;
      teamId?: TeamId;
      teamName?: string;
      amount?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      // Get room ID from room code
      const roomResult = await this.pool.query(
        'SELECT id FROM rooms WHERE room_code = $1',
        [roomCode]
      );

      if (roomResult.rows.length === 0) {
        console.warn(`[RoomService] Room ${roomCode} not found, event not recorded`);
        return;
      }

      const roomId = roomResult.rows[0].id;

      await this.pool.query(
        `INSERT INTO auction_events 
         (room_id, event_type, player_id, player_name, team_id, team_name, amount, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          roomId,
          eventType,
          data.playerId || null,
          data.playerName || null,
          data.teamId || null,
          data.teamName || null,
          data.amount || null,
          data.metadata ? JSON.stringify(data.metadata) : null,
        ]
      );
    } catch (error) {
      console.error(`[RoomService] Failed to record event for ${roomCode}:`, error);
      // Don't throw - events are nice-to-have, not critical
    }
  }

  /**
   * Update player session (track reconnects and sockets)
   */
  async updatePlayerSession(
    userId: string,
    roomCode: string,
    socketId: string
  ): Promise<void> {
    try {
      const roomResult = await this.pool.query(
        'SELECT id FROM rooms WHERE room_code = $1',
        [roomCode]
      );

      if (roomResult.rows.length === 0) {
        console.warn(`[RoomService] Room ${roomCode} not found for session update`);
        return;
      }

      const roomId = roomResult.rows[0].id;

      await this.pool.query(
        `INSERT INTO player_sessions (user_id, room_id, socket_id, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (user_id, room_id)
         DO UPDATE SET 
           socket_id = $3, 
           last_activity = NOW(), 
           is_active = true,
           reconnect_count = reconnect_count + 1`,
        [userId, roomId, socketId]
      );
    } catch (error) {
      console.error(`[RoomService] Failed to update session ${userId}/${roomCode}:`, error);
    }
  }

  /**
   * Mark player as inactive (disconnected)
   */
  async markPlayerInactive(userId: string, roomCode: string): Promise<void> {
    try {
      const roomResult = await this.pool.query(
        'SELECT id FROM rooms WHERE room_code = $1',
        [roomCode]
      );

      if (roomResult.rows.length === 0) return;

      const roomId = roomResult.rows[0].id;

      await this.pool.query(
        `UPDATE player_sessions 
         SET is_active = false, last_activity = NOW()
         WHERE user_id = $1 AND room_id = $2`,
        [userId, roomId]
      );
    } catch (error) {
      console.error(`[RoomService] Failed to mark player inactive:`, error);
    }
  }

  /**
   * Create room snapshot for recovery
   */
  async createSnapshot(roomCode: string, state: RoomState): Promise<void> {
    try {
      const roomResult = await this.pool.query(
        'SELECT id FROM rooms WHERE room_code = $1',
        [roomCode]
      );

      if (roomResult.rows.length === 0) return;

      const roomId = roomResult.rows[0].id;

      await this.pool.query(
        `INSERT INTO room_snapshots (room_id, state, current_player_index)
         VALUES ($1, $2, $3)`,
        [roomId, JSON.stringify(state), state.auction.currentPlayerIndex]
      );
    } catch (error) {
      console.error(`[RoomService] Failed to create snapshot for ${roomCode}:`, error);
    }
  }

  /**
   * Get audit trail for a room
   */
  async getAuditTrail(roomCode: string, limit: number = 1000): Promise<AuctionEventRecord[]> {
    try {
      const result = await this.pool.query(
        `SELECT ae.* FROM auction_events ae
         JOIN rooms r ON ae.room_id = r.id
         WHERE r.room_code = $1
         ORDER BY ae.timestamp DESC
         LIMIT $2`,
        [roomCode, limit]
      );
      return result.rows;
    } catch (error) {
      console.error(`[RoomService] Failed to get audit trail for ${roomCode}:`, error);
      return [];
    }
  }

  /**
   * Soft delete room (mark as deleted, don't actually remove)
   */
  async softDeleteRoom(roomCode: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE rooms SET deleted_at = NOW() WHERE room_code = $1`,
        [roomCode]
      );
      console.log(`[RoomService] Soft deleted room ${roomCode}`);
    } catch (error) {
      console.error(`[RoomService] Failed to delete room ${roomCode}:`, error);
    }
  }

  /**
   * Cleanup stale rooms (no activity for N hours)
   */
  async cleanupStaleRooms(hoursOld: number = 24): Promise<number> {
    try {
      const result = await this.pool.query(
        `UPDATE rooms 
         SET deleted_at = NOW()
         WHERE deleted_at IS NULL 
         AND updated_at < NOW() - INTERVAL '1 hour' * $1
         AND is_locked = false`,
        [hoursOld]
      );
      console.log(
        `[RoomService] Cleaned up ${result.rowCount} stale rooms (inactive > ${hoursOld}h)`
      );
      return result.rowCount || 0;
    } catch (error) {
      console.error('[RoomService] Failed to cleanup stale rooms:', error);
      return 0;
    }
  }

  /**
   * Get room statistics
   */
  async getRoomStatistics(): Promise<any> {
    try {
      const result = await this.pool.query('SELECT * FROM room_statistics');
      return result.rows;
    } catch (error) {
      console.error('[RoomService] Failed to get room statistics:', error);
      return [];
    }
  }

  /**
   * Health check - ensure database is connected
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('[RoomService] Health check failed:', error);
      return false;
    }
  }
}
