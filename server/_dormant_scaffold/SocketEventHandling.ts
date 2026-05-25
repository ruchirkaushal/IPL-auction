import { Socket } from 'socket.io';

/**
 * SocketEventQueue - Ensures socket events are processed in order
 * Prevents race conditions from concurrent socket messages
 */
export class SocketEventQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing: boolean = false;
  private socketId: string;

  constructor(socketId: string) {
    this.socketId = socketId;
  }

  /**
   * Enqueue an async operation
   */
  async enqueue(handler: () => Promise<void>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await handler();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const handler = this.queue.shift();
        if (handler) {
          await handler();
        }
      }
    } catch (error) {
      console.error(`[SocketEventQueue ${this.socketId}] Error processing queue:`, error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * RateLimiter - Prevents socket spam/DoS
 */
export class RateLimiter {
  private limits: Map<string, { count: number; resetTime: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;

  /**
   * @param maxRequests - Max requests per window
   * @param windowMs - Time window in milliseconds
   */
  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if action is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const limit = this.limits.get(key);

    if (!limit || now > limit.resetTime) {
      // Reset window
      this.limits.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (limit.count < this.maxRequests) {
      limit.count++;
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string): number {
    const limit = this.limits.get(key);
    if (!limit || Date.now() > limit.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - limit.count);
  }

  /**
   * Reset limit for key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all limits (for cleanup)
   */
  clear(): void {
    this.limits.clear();
  }
}

/**
 * Socket Event Handlers with rate limiting
 */
export const createRateLimitedHandler = (
  rateLimiter: RateLimiter,
  handler: (socket: Socket, data: any, callback: (response: any) => void) => Promise<void>
) => {
  return async (socket: Socket, data: any, callback: (response: any) => void) => {
    const key = `${socket.id}:${Date.now()}`;

    if (!rateLimiter.isAllowed(socket.id)) {
      callback({
        success: false,
        error: 'Too many requests. Please slow down.',
        remaining: rateLimiter.getRemaining(socket.id),
      });
      return;
    }

    try {
      await handler(socket, data, callback);
    } catch (error) {
      console.error('[RateLimitedHandler] Error:', error);
      callback({
        success: false,
        error: 'An error occurred. Please try again.',
      });
    }
  };
};

/**
 * Socket Message Versioning
 * Prevents processing of stale messages
 */
export class SocketMessageVersion {
  private lastProcessedVersion: Map<string, number> = new Map();

  /**
   * Check if message should be processed
   */
  shouldProcess(socketId: string, version: number): boolean {
    const lastVersion = this.lastProcessedVersion.get(socketId) || 0;
    if (version > lastVersion) {
      this.lastProcessedVersion.set(socketId, version);
      return true;
    }
    return false;
  }

  /**
   * Reset version for socket
   */
  reset(socketId: string): void {
    this.lastProcessedVersion.delete(socketId);
  }

  /**
   * Clear all versions
   */
  clear(): void {
    this.lastProcessedVersion.clear();
  }
}
