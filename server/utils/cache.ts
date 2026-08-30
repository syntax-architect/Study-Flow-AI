interface CacheItem<T> {
  value: T;
  expiry: number;
}

export class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private sweepInterval: NodeJS.Timeout | null = null;
  private maxSize: number;

  constructor(sweepIntervalMs: number = 5 * 60 * 1000, maxSize: number = 1000) {
    this.maxSize = maxSize;
    if (sweepIntervalMs > 0) {
      this.sweepInterval = setInterval(() => this.sweep(), sweepIntervalMs);
      // Ensure the interval doesn't prevent the Node process from exiting
      if (this.sweepInterval.unref) {
        this.sweepInterval.unref();
      }
    }
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number = 3600): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Simplistic LRU: map preserves insertion order, so first key is oldest inserted
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  entries(): IterableIterator<[string, CacheItem<any>]> {
    return this.cache.entries();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    this.clear();
  }
}

export const appCache = new MemoryCache();
