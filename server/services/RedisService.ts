import Redis from 'ioredis';
import type { RoomState } from '../../shared/types';

/**
 * RedisService - Handles caching and pub/sub for scalable room distribution
 */
export class RedisService {
  private client: Redis;
  private pubClient: Redis;
  private subClient: Redis;
  private isConnected: boolean = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.pubClient = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.subClient = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('[Redis] Connected');
    });

    this.client.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      console.log('[Redis] Disconnected');
    });
  }

  /**
   * Check if Redis is connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Cache room state with TTL
   */
  async cacheRoom(roomCode: string, state: RoomState, ttlSeconds: number = 3600): Promise<void> {
    try {
      const key = `room:${roomCode}`;
      const value = JSON.stringify(state);
      await this.client.setex(key, ttlSeconds, value);
      console.log(`[Redis] Cached room ${roomCode} with TTL ${ttlSeconds}s`);
    } catch (error) {
      console.error(`[Redis] Failed to cache room ${roomCode}:`, error);
    }
  }

  /**
   * Get cached room state
   */
  async getCachedRoom(roomCode: string): Promise<RoomState | null> {
    try {
      const key = `room:${roomCode}`;
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error(`[Redis] Failed to get cached room ${roomCode}:`, error);
      return null;
    }
  }

  /**
   * Delete cached room
   */
  async deleteCache(roomCode: string): Promise<void> {
    try {
      const key = `room:${roomCode}`;
      await this.client.del(key);
      console.log(`[Redis] Deleted cached room ${roomCode}`);
    } catch (error) {
      console.error(`[Redis] Failed to delete cache for ${roomCode}:`, error);
    }
  }

  /**
   * Publish room state to all instances
   */
  async publishRoomState(roomCode: string, state: RoomState): Promise<void> {
    try {
      const channel = `room:${roomCode}`;
      const message = JSON.stringify(state);
      await this.pubClient.publish(channel, message);
    } catch (error) {
      console.error(`[Redis] Failed to publish room state ${roomCode}:`, error);
    }
  }

  /**
   * Subscribe to room state updates
   */
  async subscribeToRoom(
    roomCode: string,
    handler: (state: RoomState) => void
  ): Promise<void> {
    try {
      const channel = `room:${roomCode}`;

      await this.subClient.subscribe(channel, (err, count) => {
        if (err) {
          console.error(`[Redis] Failed to subscribe to ${channel}:`, err);
        } else {
          console.log(`[Redis] Subscribed to ${channel} (total subscriptions: ${count})`);
        }
      });

      this.subClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const state = JSON.parse(message);
            handler(state);
          } catch (parseError) {
            console.error(`[Redis] Failed to parse message from ${channel}:`, parseError);
          }
        }
      });
    } catch (error) {
      console.error(`[Redis] Failed to subscribe to room ${roomCode}:`, error);
    }
  }

  /**
   * Unsubscribe from room
   */
  async unsubscribeFromRoom(roomCode: string): Promise<void> {
    try {
      const channel = `room:${roomCode}`;
      await this.subClient.unsubscribe(channel);
      console.log(`[Redis] Unsubscribed from ${channel}`);
    } catch (error) {
      console.error(`[Redis] Failed to unsubscribe from ${roomCode}:`, error);
    }
  }

  /**
   * Set session data with TTL
   */
  async setSession(
    userId: string,
    roomCode: string,
    socketId: string,
    ttlSeconds: number = 7200
  ): Promise<void> {
    try {
      const key = `session:${userId}:${roomCode}`;
      const value = JSON.stringify({ socketId, timestamp: Date.now() });
      await this.client.setex(key, ttlSeconds, value);
    } catch (error) {
      console.error(`[Redis] Failed to set session:`, error);
    }
  }

  /**
   * Get session data
   */
  async getSession(userId: string, roomCode: string): Promise<{ socketId: string; timestamp: number } | null> {
    try {
      const key = `session:${userId}:${roomCode}`;
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error(`[Redis] Failed to get session:`, error);
      return null;
    }
  }

  /**
   * Clear session
   */
  async clearSession(userId: string, roomCode: string): Promise<void> {
    try {
      const key = `session:${userId}:${roomCode}`;
      await this.client.del(key);
    } catch (error) {
      console.error(`[Redis] Failed to clear session:`, error);
    }
  }

  /**
   * Increment counter (for rate limiting)
   */
  async incrementCounter(key: string, ttlSeconds: number = 60): Promise<number> {
    try {
      const count = await this.client.incr(key);
      if (count === 1) {
        // First increment, set TTL
        await this.client.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      console.error(`[Redis] Failed to increment counter ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get counter value
   */
  async getCounter(key: string): Promise<number> {
    try {
      const value = await this.client.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error(`[Redis] Failed to get counter ${key}:`, error);
      return 0;
    }
  }

  /**
   * Store metrics
   */
  async recordMetric(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    try {
      const key = `metric:${name}:${Date.now()}`;
      const data = { value, tags, timestamp: Date.now() };
      await this.client.setex(key, 86400, JSON.stringify(data)); // 24 hour TTL
    } catch (error) {
      console.error(`[Redis] Failed to record metric ${name}:`, error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('[Redis] Health check failed:', error);
      return false;
    }
  }

  /**
   * Close all connections
   */
  async shutdown(): Promise<void> {
    try {
      await Promise.all([this.client.quit(), this.pubClient.quit(), this.subClient.quit()]);
      console.log('[Redis] Shutdown complete');
    } catch (error) {
      console.error('[Redis] Error during shutdown:', error);
    }
  }
}
