export interface PendingSocketEvent {
  socketId: string;
  event: string;
  payload: any;
  receivedAt: number;
  handler: () => Promise<void> | void;
}

export class SocketEventQueue {
  private queue: PendingSocketEvent[] = [];
  private isProcessing = false;

  enqueue(event: PendingSocketEvent) {
    this.queue.push(event);
    void this.processNext();
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const event = this.queue.shift();
    if (event) {
      try {
        await Promise.resolve(event.handler());
      } catch (err) {
        console.error('[SocketEventQueue] handler failed for', event.event, err);
      }
    }
    this.isProcessing = false;
    if (this.queue.length > 0) {
      void this.processNext();
    }
  }

  flush() {
    this.queue = [];
    this.isProcessing = false;
  }
}

export class RateLimiter {
  private requests = new Map<string, { count: number; windowStart: number }>();

  constructor(private maxRequests = 100, private windowMs = 60000) {}

  allow(socketId: string): boolean {
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

export class SocketMessageVersion {
  private versions = new Map<string, number>();

  getVersion(socketId: string): number {
    return this.versions.get(socketId) ?? 0;
  }

  bumpVersion(socketId: string) {
    const version = this.getVersion(socketId) + 1;
    this.versions.set(socketId, version);
    return version;
  }
}
