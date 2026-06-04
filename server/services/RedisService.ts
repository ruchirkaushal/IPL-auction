export class RedisService {
  private cache = new Map<string, any>();
  private channels = new Map<string, Set<(payload: any) => void>>();

  async cacheRoom(roomCode: string, roomState: any): Promise<void> {
    this.cache.set(roomCode, JSON.parse(JSON.stringify(roomState)));
  }

  async getCachedRoom(roomCode: string): Promise<any | null> {
    return this.cache.get(roomCode) ?? null;
  }

  async publishRoomState(roomCode: string, payload: any): Promise<void> {
    const subscribers = this.channels.get(roomCode);
    if (!subscribers) return;
    subscribers.forEach(cb => cb(payload));
  }

  subscribeToRoom(roomCode: string, subscriber: (payload: any) => void): void {
    if (!this.channels.has(roomCode)) {
      this.channels.set(roomCode, new Set());
    }
    this.channels.get(roomCode)?.add(subscriber);
  }

  unsubscribeFromRoom(roomCode: string, subscriber: (payload: any) => void): void {
    this.channels.get(roomCode)?.delete(subscriber);
  }

  async setSession(key: string, value: any): Promise<void> {
    this.cache.set(key, JSON.parse(JSON.stringify(value)));
  }

  async getSession(key: string): Promise<any | null> {
    return this.cache.get(key) ?? null;
  }

  async recordMetric(name: string, payload: any): Promise<void> {
    console.log(`[RedisService] metric ${name}`, payload);
  }

  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }
}
