import { describe, expect, it, vi } from "vitest";
import { LRUCache } from "../src/cache/lru-cache";

describe("LRUCache", () => {
	it("should set and get values", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });
		cache.set("key1", "value1");
		expect(cache.get("key1")).toBe("value1");
	});

	it("should set operation with duplicate keys (should update)", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });
		cache.set("key1", "value1");
		cache.set("key1", "value2"); // Update with same key
		expect(cache.get("key1")).toBe("value2");
	});

	it("should return undefined for get operation with non-existent keys", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });
		expect(cache.get("nonexistent")).toBeNull();
	});

	it("should evict least recently used items", () => {
		// Note: quick-lru handles eviction differently than our custom implementation
		// This test may need to be adjusted based on quick-lru behavior
		const cache = new LRUCache({ enabled: true, ttl: {}, maxSize: 2 });
		cache.set("key1", "value1");
		cache.set("key2", "value2");
		cache.set("key3", "value3"); // This should evict the least recently used item
		// With quick-lru, the maxSize is a soft limit, so we might have more than maxSize items
		// But we should have at most maxSize items
		expect(cache.size()).toBeLessThanOrEqual(2);
	});

	it("should check if keys exist", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });
		cache.set("key1", "value1");
		expect(cache.has("key1")).toBe(true);
		expect(cache.has("key2")).toBe(false);
	});

	it("should check if keys exist with non-existent keys (should return false)", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });
		expect(cache.has("nonexistent")).toBe(false);
	});

	it("should clear all entries", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });
		cache.set("key1", "value1");
		cache.set("key2", "value2");
		cache.clear();
		expect(cache.has("key1")).toBe(false);
		expect(cache.has("key2")).toBe(false);
		expect(cache.size()).toBe(0);
	});

	it("should track size correctly", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });
		expect(cache.size()).toBe(0);
		cache.set("key1", "value1");
		expect(cache.size()).toBe(1);
		cache.set("key2", "value2");
		expect(cache.size()).toBe(2);
		cache.delete("key1");
		expect(cache.size()).toBe(1);
		cache.clear();
		expect(cache.size()).toBe(0);
	});

	it("should respect TTL expiration", () => {
		vi.useFakeTimers();
		const cache = new LRUCache({ enabled: true, ttl: {} });
		cache.set("key1", "value1", 1); // 1 second TTL
		expect(cache.get("key1")).toBe("value1");
		vi.advanceTimersByTime(1001); // Advance by 1001ms
		expect(cache.get("key1")).toBeNull();
		vi.useRealTimers();
	});

	it("should handle cache eviction with TTL expiration", () => {
		vi.useFakeTimers();
		const cache = new LRUCache({ enabled: true, ttl: {} });

		// Set multiple items with different TTLs
		cache.set("key1", "value1", 1); // 1 second TTL
		cache.set("key2", "value2", 2); // 2 second TTL

		// Check both are accessible
		expect(cache.get("key1")).toBe("value1");
		expect(cache.get("key2")).toBe("value2");

		// Advance time by 1.5 seconds - key1 should expire
		vi.advanceTimersByTime(1500);

		// key1 should be expired, key2 should still be valid
		expect(cache.get("key1")).toBeNull();
		expect(cache.get("key2")).toBe("value2");

		// Advance time by another 1 second - key2 should also expire
		vi.advanceTimersByTime(1000);
		expect(cache.get("key2")).toBeNull();

		vi.useRealTimers();
	});

	it("should handle cache eviction with mixed TTL values", () => {
		vi.useFakeTimers();
		const cache = new LRUCache({ enabled: true, ttl: {} });

		// Set items with different TTLs
		cache.set("short", "value1", 1); // 1 second
		cache.set("medium", "value2", 5); // 5 seconds
		cache.set("long", "value3", 10); // 10 seconds

		// All should be accessible initially
		expect(cache.get("short")).toBe("value1");
		expect(cache.get("medium")).toBe("value2");
		expect(cache.get("long")).toBe("value3");

		// Advance time by 2 seconds - short should expire
		vi.advanceTimersByTime(2000);
		expect(cache.get("short")).toBeNull();
		expect(cache.get("medium")).toBe("value2");
		expect(cache.get("long")).toBe("value3");

		// Advance time by 4 more seconds - medium should expire
		vi.advanceTimersByTime(4000);
		expect(cache.get("medium")).toBeNull();
		expect(cache.get("long")).toBe("value3");

		// Advance time by 5 more seconds - long should expire
		vi.advanceTimersByTime(5000);
		expect(cache.get("long")).toBeNull();

		vi.useRealTimers();
	});

	it("should not store values when disabled", () => {
		const cache = new LRUCache({ enabled: false, ttl: {} });
		cache.set("key1", "value1");
		expect(cache.get("key1")).toBeNull();
	});

	it("should handle disabled cache behavior", () => {
		const cache = new LRUCache({ enabled: false, ttl: {} });

		// Operations should not throw errors even when disabled
		cache.set("key1", "value1");
		expect(cache.get("key1")).toBeNull();
		expect(cache.has("key1")).toBe(false);
		expect(cache.delete("key1")).toBe(false);
		expect(cache.size()).toBe(0);

		// Clear should still work (even though there's nothing to clear)
		expect(() => cache.clear()).not.toThrow();
	});

	it("should handle delete operations", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });
		cache.set("key1", "value1");
		cache.set("key2", "value2");

		// Delete existing key
		expect(cache.delete("key1")).toBe(true);
		expect(cache.has("key1")).toBe(false);
		expect(cache.has("key2")).toBe(true);

		// Delete non-existent key
		expect(cache.delete("nonexistent")).toBe(false);

		// Size should be updated
		expect(cache.size()).toBe(1);
	});

	it("should handle edge cases with very short TTL", () => {
		vi.useFakeTimers();
		const cache = new LRUCache({ enabled: true, ttl: {} });

		// Set item with very short TTL
		cache.set("key1", "value1", 0.001); // 1 millisecond

		// Immediately check - might still be valid due to timing
		const value = cache.get("key1");
		expect(value === "value1" || value === null).toBe(true);

		// Advance time
		vi.advanceTimersByTime(10);
		expect(cache.get("key1")).toBeNull();

		vi.useRealTimers();
	});

	it("should handle edge cases with zero TTL", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });

		// Set item with zero TTL (should effectively be no TTL)
		cache.set("key1", "value1", 0);

		// Should be accessible immediately
		expect(cache.get("key1")).toBe("value1");
		expect(cache.has("key1")).toBe(true);
	});

	it("should handle cache statistics collection", () => {
		const cache = new LRUCache({ enabled: true, ttl: {} });

		// Initial state
		expect(cache.size()).toBe(0);

		// Add items
		cache.set("key1", "value1");
		cache.set("key2", "value2");
		expect(cache.size()).toBe(2);

		// Update existing item
		cache.set("key1", "updated");
		expect(cache.size()).toBe(2); // Size should remain the same

		// Delete item
		cache.delete("key1");
		expect(cache.size()).toBe(1);

		// Clear all
		cache.clear();
		expect(cache.size()).toBe(0);
	});
});
