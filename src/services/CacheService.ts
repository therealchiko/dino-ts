// using a generic here because this data can be anything, for now it's parkSTatus but we can extend it.
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// a very short lived cache (in memory) for 30 seconds to counter some probably unlikley big loads due to zone computations

export class CacheService {
  private static cache: Map<string, CacheEntry<any>> = new Map();
  private static DEFAULT_TTL = 30 * 1000; // 30 seconds

  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data; // T
  }

  static invalidate(key: string): void {
    this.cache.delete(key);
  }
}