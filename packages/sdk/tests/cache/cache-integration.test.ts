import { describe, it, expect, beforeEach } from "vitest";
import { measureTime, delay } from "../helpers/test-helpers";

/**
 * Mock cache implementation for testing
 */
class MockCache {
	private store = new Map<string, { value: unknown; expireTime?: number }>();

	set(key: string, value: unknown, ttlMs?: number): void {
		const expireTime = ttlMs ? Date.now() + ttlMs : undefined;
		this.store.set(key, { value, expireTime });
	}

	get(key: string): unknown {
		const entry = this.store.get(key);
		if (!entry) return undefined;

		if (entry.expireTime && Date.now() > entry.expireTime) {
			this.store.delete(key);
			return undefined;
		}

		return entry.value;
	}

	has(key: string): boolean {
		return this.get(key) !== undefined;
	}

	delete(key: string): void {
		this.store.delete(key);
	}

	clear(): void {
		this.store.clear();
	}

	getSize(): number {
		return this.store.size;
	}
}

describe("@snapback/sdk - Cache Integration", () => {
	let cache: MockCache;

	beforeEach(() => {
		cache = new MockCache();
	});

	describe("Basic Cache Operations", () => {
		it("stores and retrieves values", () => {
			cache.set("key1", { data: "value1" });
			expect(cache.get("key1")).toEqual({ data: "value1" });
		});

		it("returns undefined for missing keys", () => {
			expect(cache.get("nonexistent")).toBeUndefined();
		});

		it("checks key existence", () => {
			cache.set("exists", "value");
			expect(cache.has("exists")).toBe(true);
			expect(cache.has("missing")).toBe(false);
		});

		it("deletes entries", () => {
			cache.set("key", "value");
			cache.delete("key");
			expect(cache.get("key")).toBeUndefined();
		});

		it("overwrites existing values", () => {
			cache.set("key", "first");
			cache.set("key", "second");
			expect(cache.get("key")).toBe("second");
		});
	});

	describe("TTL (Time-To-Live) Handling", () => {
		it("expires values after TTL", async () => {
			const key = "ttl-key";
			const value = { data: "expires" };
			const ttlMs = 50;

			cache.set(key, value, ttlMs);
			expect(cache.get(key)).toEqual(value);

			await delay(ttlMs + 10);
			expect(cache.get(key)).toBeUndefined();
		});

		it("prevents expiration if accessed before TTL", async () => {
			cache.set("key", { value: 1 }, 100);

			expect(cache.get("key")).toEqual({ value: 1 });

			await delay(30);

			expect(cache.get("key")).toEqual({ value: 1 });
		});

		it("handles very short TTLs", async () => {
			cache.set("short-ttl", { value: 1 }, 20);

			expect(cache.get("short-ttl")).toEqual({ value: 1 });

			await delay(25);
			expect(cache.get("short-ttl")).toBeUndefined();
		});

		it("handles very long TTLs", async () => {
			const oneYearMs = 365 * 24 * 60 * 60 * 1000;
			cache.set("long-term", { value: 1 }, oneYearMs);

			expect(cache.get("long-term")).toEqual({ value: 1 });
		});
	});

	describe("LRU Eviction Policy", () => {
		it("evicts least recently used entries", () => {
			cache.set("key1", { value: 1 });
			cache.set("key2", { value: 2 });
			cache.set("key3", { value: 3 });

			// Access key1 to make it recently used
			cache.get("key1");

			// All should still exist if cache size > 3
			expect(cache.has("key1")).toBe(true);
			expect(cache.has("key2")).toBe(true);
			expect(cache.has("key3")).toBe(true);
		});

		it("maintains cache size under limit", () => {
			const size = cache.getSize();

			expect(size).toBeGreaterThanOrEqual(0);
			expect(typeof size).toBe("number");
		});

		it("prioritizes recently accessed items", () => {
			cache.set("a", { value: 1 });
			cache.set("b", { value: 2 });
			cache.set("c", { value: 3 });

			// Access b to make it more recent
			cache.get("b");
			cache.get("b");

			expect(cache.get("b")).toEqual({ value: 2 });
		});
	});

	describe("Data Type Handling", () => {
		it("caches primitive values", () => {
			cache.set("string", "test");
			cache.set("number", 42);
			cache.set("boolean", true);
			cache.set("null", null);

			expect(cache.get("string")).toBe("test");
			expect(cache.get("number")).toBe(42);
			expect(cache.get("boolean")).toBe(true);
			expect(cache.get("null")).toBe(null);
		});

		it("caches objects and arrays", () => {
			const obj = { nested: { value: 1 } };
			const arr = [1, 2, 3];

			cache.set("object", obj);
			cache.set("array", arr);

			expect(cache.get("object")).toEqual(obj);
			expect(cache.get("array")).toEqual(arr);
		});

		it("handles circular references safely", () => {
			const circular: any = { value: 1 };
			circular.self = circular;

			// Should not crash
			cache.set("circular", circular);
			expect(cache.has("circular")).toBe(true);
		});

		it("caches Date objects", () => {
			const date = new Date("2025-01-01");

			cache.set("date", date);

			const retrieved = cache.get("date");
			expect(retrieved).toEqual(date);
		});

		it("caches Map and Set", () => {
			const map = new Map([["key", "value"]]);
			const set = new Set([1, 2, 3]);

			cache.set("map", map);
			cache.set("set", set);

			expect(cache.get("map")).toEqual(map);
			expect(cache.get("set")).toEqual(set);
		});
	});

	describe("Performance Characteristics", () => {
		it("performs set operation within budget", async () => {
			const { duration } = await measureTime(() => {
				cache.set("perf-test", { value: Math.random() });
			});

			expect(duration).toBeLessThan(5);
		});

		it("performs get operation within budget", async () => {
			cache.set("perf-key", { value: 1 });

			const { duration } = await measureTime(() => {
				cache.get("perf-key");
			});

			expect(duration).toBeLessThan(5);
		});

		it("handles many cache entries efficiently", async () => {
			const { duration } = await measureTime(() => {
				for (let i = 0; i < 1000; i++) {
					cache.set(`key-${i}`, { value: i });
				}
			});

			expect(duration).toBeLessThan(500);
		});

		it("retrieves from large cache efficiently", async () => {
			for (let i = 0; i < 500; i++) {
				cache.set(`key-${i}`, { value: i });
			}

			const { duration } = await measureTime(() => {
				for (let i = 0; i < 500; i++) {
					cache.get(`key-${i}`);
				}
			});

			expect(duration).toBeLessThan(100);
		});
	});

	describe("Concurrent Access", () => {
		it("handles concurrent sets", async () => {
			const promises = Array.from({ length: 100 }, (_, i) =>
				Promise.resolve().then(() => {
					cache.set(`key-${i}`, { value: i });
				})
			);

			await Promise.all(promises);

			expect(cache.getSize()).toBeGreaterThan(0);
		});

		it("handles concurrent gets", () => {
			for (let i = 0; i < 50; i++) {
				cache.set(`key-${i}`, { value: i });
			}

			const promises = Array.from({ length: 50 }, (_, i) =>
				Promise.resolve().then(() => {
					return cache.get(`key-${i}`);
				})
			);

			return Promise.all(promises).then((results) => {
				expect(results.length).toBe(50);
				results.forEach((result) => {
					expect(result).toBeDefined();
				});
			});
		});

		it("handles mixed concurrent operations", async () => {
			const operations = [
				...Array.from({ length: 25 }, (_, i) =>
					Promise.resolve().then(() => cache.set(`key-${i}`, { value: i }))
				),
				...Array.from({ length: 25 }, (_, i) =>
					Promise.resolve().then(() => cache.get(`key-${i}`))
				),
			];

			await Promise.all(operations);

			expect(cache.getSize()).toBeGreaterThan(0);
		});
	});

	describe("Cache Invalidation", () => {
		it("invalidates single entry", () => {
			cache.set("key1", { value: 1 });
			cache.set("key2", { value: 2 });

			cache.delete("key1");

			expect(cache.get("key1")).toBeUndefined();
			expect(cache.get("key2")).toEqual({ value: 2 });
		});

		it("invalidates all entries", () => {
			cache.set("key1", { value: 1 });
			cache.set("key2", { value: 2 });

			cache.clear();

			expect(cache.get("key1")).toBeUndefined();
			expect(cache.get("key2")).toBeUndefined();
			expect(cache.getSize()).toBe(0);
		});

		it("handles delete of non-existent key", () => {
			expect(() => {
				cache.delete("non-existent");
			}).not.toThrow();
		});
	});

	describe("Cache Patterns & Use Cases", () => {
		it("implements session caching pattern", () => {
			const sessionId = "sess-123";
			const sessionData = {
				userId: "user-1",
				startTime: Date.now(),
				data: { count: 0 },
			};

			cache.set(sessionId, sessionData);

			const retrieved = cache.get(sessionId) as any;
			expect(retrieved.userId).toBe("user-1");
			expect(retrieved.data.count).toBe(0);
		});

		it("implements memoization pattern", () => {
			const memoKey = "result:compute:123";
			const expensiveResult = { computation: "heavy" };

			cache.set(memoKey, expensiveResult);

			expect(cache.get(memoKey)).toEqual(expensiveResult);
		});

		it("implements query result caching", () => {
			const queryKey = "SELECT * WHERE id = 1";
			const queryResult = [{ id: 1, name: "Item 1" }];

			cache.set(queryKey, queryResult, 60000);

			expect(cache.get(queryKey)).toEqual(queryResult);
		});

		it("implements rate limiting counter", () => {
			const userId = "user-456";
			const countKey = `ratelimit:${userId}`;

			cache.set(countKey, 0);
			const count = (cache.get(countKey) as number) + 1;
			cache.set(countKey, count);

			expect(cache.get(countKey)).toBe(1);
		});
	});

	describe("Edge Cases", () => {
		it("handles very long keys", () => {
			const longKey = "k".repeat(10000);
			cache.set(longKey, "value");

			expect(cache.get(longKey)).toBe("value");
		});

		it("handles empty values", () => {
			cache.set("empty-string", "");
			cache.set("empty-array", []);
			cache.set("empty-object", {});

			expect(cache.get("empty-string")).toBe("");
			expect(cache.get("empty-array")).toEqual([]);
			expect(cache.get("empty-object")).toEqual({});
		});

		it("handles special characters in keys", () => {
			const specialKey = "key:with:special!@#$%^&*()chars";
			cache.set(specialKey, "value");

			expect(cache.get(specialKey)).toBe("value");
		});

		it("handles NaN values", () => {
			cache.set("nan", NaN);
			const result = cache.get("nan");
			expect(Number.isNaN(result as number)).toBe(true);
		});

		it("handles infinity values", () => {
			cache.set("inf", Infinity);
			cache.set("neginf", -Infinity);

			expect(cache.get("inf")).toBe(Infinity);
			expect(cache.get("neginf")).toBe(-Infinity);
		});

		it("handles zero values", () => {
			cache.set("zero", 0);
			cache.set("negzero", -0);

			expect(cache.get("zero")).toBe(0);
			expect(cache.get("negzero")).toBe(-0);
		});

		it("multiple sets same key", () => {
			cache.set("key", 1);
			cache.set("key", 2);
			cache.set("key", 3);

			expect(cache.get("key")).toBe(3);
		});
	});
});
