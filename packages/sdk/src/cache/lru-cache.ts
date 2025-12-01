import QuickLRU from "quick-lru";

export interface CacheConfig {
	enabled: boolean;
	ttl: Record<string, number>;
	maxSize?: number;
}

export class LRUCache {
	private cache: QuickLRU<string, { value: any; expiry: number }>;
	private config: CacheConfig;

	constructor(config: CacheConfig) {
		this.config = {
			maxSize: 1000,
			...config,
		};

		this.cache = new QuickLRU({
			maxSize: this.config.maxSize || 1000,
		});
	}

	/**
	 * Get a value from the cache
	 */
	get(key: string): any {
		if (!this.config.enabled) {
			return null;
		}

		const item = this.cache.get(key);
		if (!item) {
			return null;
		}

		// Check if item has expired (atomic check)
		const now = Date.now();
		if (now > item.expiry) {
			this.cache.delete(key);
			return null;
		}

		return item.value;
	}

	/**
	 * Set a value in the cache
	 */
	set(key: string, value: any, ttlSeconds = 300): void {
		if (!this.config.enabled) {
			return;
		}

		const expiry = Date.now() + ttlSeconds * 1000;
		this.cache.set(key, { value, expiry });
	}

	/**
	 * Check if a key exists in the cache and is not expired
	 */
	has(key: string): boolean {
		if (!this.config.enabled) {
			return false;
		}

		const item = this.cache.get(key);
		if (!item) {
			return false;
		}

		// Check if item has expired (atomic check)
		const now = Date.now();
		if (now > item.expiry) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Delete a key from the cache
	 */
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all items from the cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get the number of items in the cache
	 */
	size(): number {
		return this.cache.size;
	}
}
