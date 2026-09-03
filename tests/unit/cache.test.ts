import { MemoryCache } from '../../server/utils/cache';

describe('Semantic cache LRU eviction', () => {
  it('should evict the oldest entry when exceeding maxSize', () => {
    // Initialize cache with 0 sweep interval (disable background sweep) and maxSize 500
    const cache = new MemoryCache(0, 500);

    // Insert 500 entries
    for (let i = 1; i <= 500; i++) {
      cache.set(`key_${i}`, `value_${i}`);
    }

    // Cache size should be 500
    expect(Array.from(cache.entries()).length).toBe(500);
    // Oldest key is key_1
    expect(cache.get('key_1')).toBe('value_1');

    // Insert 501st entry
    cache.set('key_501', 'value_501');

    // Cache size should still be 500
    expect(Array.from(cache.entries()).length).toBe(500);

    // key_1 should be evicted (as it was the oldest)
    expect(cache.get('key_1')).toBeNull();

    // key_2 should still be present
    expect(cache.get('key_2')).toBe('value_2');

    // key_501 should be present
    expect(cache.get('key_501')).toBe('value_501');

    cache.destroy();
  });
});
