import { LRUCache } from "lru-cache";
import { logger } from "./logger";

// Configuration with safe defaults
const snapbackDefaults = {
	mcp: {
		timeoutMs: 5000,
		maxConcurrent: 4,
		retry: { retries: 2, factor: 2, min: 250, max: 1500, jitter: true },
		circuit: {
			enabled: true,
			errorThresholdPercentage: 50,
			volumeThreshold: 10,
			timeoutMs: 5000,
			resetMs: 30000,
			rollingCountMs: 60000,
			rollingCountBuckets: 6,
		},
		cache: {
			maxEntries: 500,
			ttlMs: 60 * 60 * 1000, // 1 hour default
		},
	},
} as const;

export const docCache = new LRUCache<string, any>({
	max: snapbackDefaults.mcp.cache.maxEntries,
	ttl: snapbackDefaults.mcp.cache.ttlMs,
	allowStale: true,
	updateAgeOnGet: true,
});

/**
 * Enhanced cache function with configurable TTL
 * @param key - Cache key
 * @param fetcher - Function to fetch data if not in cache
 * @param ttlMs - Optional TTL in milliseconds (overrides default)
 */
export async function getLibraryDocsCached<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
	// Check cache first
	const hit = docCache.get(key);
	if (hit) {
		logger.debug(`Cache hit for key: ${key}`);
		return hit;
	}

	// Fetch and cache result
	try {
		logger.debug(`Cache miss for key: ${key}, fetching data`);
		const value = await fetcher();

		// Set with custom TTL if provided
		if (ttlMs) {
			docCache.set(key, value, { ttl: ttlMs });
		} else {
			docCache.set(key, value);
		}

		return value;
	} catch (error: unknown) {
		logger.error({ error }, `Failed to fetch data for cache key: ${key}`);
		throw error;
	}
}

/**
 * Cache with hinting support for tools that accept cache parameters
 */
export async function getLibraryDocsCachedWithHint<T>(
	cacheKey: string | undefined,
	ttlMs: number | undefined,
	fetcher: () => Promise<T>,
): Promise<T> {
	// If cache key is provided, use caching
	if (cacheKey) {
		return await getLibraryDocsCached<T>(cacheKey, fetcher, ttlMs);
	}

	// Otherwise, fetch directly
	return await fetcher();
}
