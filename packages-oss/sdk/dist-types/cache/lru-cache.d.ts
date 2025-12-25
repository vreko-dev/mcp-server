export interface CacheConfig {
    enabled: boolean;
    ttl: Record<string, number>;
    maxSize?: number;
}
/**
 * Generic LRU cache with TTL support
 * @template T - The type of values stored in the cache
 */
export declare class LRUCache<T = unknown> {
    private cache;
    private config;
    constructor(config: CacheConfig);
    /**
     * Get a value from the cache
     * @returns The cached value or null if not found/expired
     */
    get(key: string): T | null;
    /**
     * Set a value in the cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttlSeconds - Time to live in seconds (default: 300)
     */
    set(key: string, value: T, ttlSeconds?: number): void;
    /**
     * Check if a key exists in the cache and is not expired
     */
    has(key: string): boolean;
    /**
     * Delete a key from the cache
     */
    delete(key: string): boolean;
    /**
     * Clear all items from the cache
     */
    clear(): void;
    /**
     * Get the number of items in the cache
     */
    size(): number;
}
//# sourceMappingURL=lru-cache.d.ts.map