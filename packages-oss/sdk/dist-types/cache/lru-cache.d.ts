export interface CacheConfig {
    enabled: boolean;
    ttl: Record<string, number>;
    maxSize?: number;
}
export declare class LRUCache {
    private cache;
    private config;
    constructor(config: CacheConfig);
    /**
     * Get a value from the cache
     */
    get(key: string): any;
    /**
     * Set a value in the cache
     */
    set(key: string, value: any, ttlSeconds?: number): void;
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