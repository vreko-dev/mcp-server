import type { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "../../modules/shared/lib/query-client";

/**
 * TanStack Query Cache Tests
 *
 * Verifies that query caching works correctly:
 * - Cache hits reduce server calls
 * - Stale data triggers refetch
 * - Window focus/reconnect doesn't cause refetch storms
 * - Cache invalidation works
 */

describe("Query Client Cache Behavior", () => {
	let queryClient: QueryClient;
	let _fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		queryClient = createQueryClient();
		_fetchSpy = vi.fn();
		vi.useFakeTimers();
	});

	afterEach(() => {
		queryClient.clear();
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	describe("Cache Hits", () => {
		it("should use cached data for subsequent queries", async () => {
			const queryKey = ["test-cache", "user", "123"];
			const queryFn = vi
				.fn()
				.mockResolvedValue({ id: "123", name: "Test User" });

			// First fetch
			const result1 = await queryClient.fetchQuery({
				queryKey,
				queryFn,
			});

			expect(queryFn).toHaveBeenCalledTimes(1);
			expect(result1).toEqual({ id: "123", name: "Test User" });

			// Second fetch (should use cache)
			const result2 = await queryClient.fetchQuery({
				queryKey,
				queryFn,
			});

			// Should NOT call queryFn again (cache hit)
			expect(queryFn).toHaveBeenCalledTimes(1);
			expect(result2).toEqual({ id: "123", name: "Test User" });
		});

		it("should reduce server calls with proper staleTime", async () => {
			const queryKey = ["api", "checkpoints"];
			const mockFetch = vi
				.fn()
				.mockResolvedValue([{ id: "1", name: "Checkpoint 1" }]);

			// Initial fetch
			await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
				staleTime: 60000, // 1 minute
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Advance time by 30 seconds (still fresh)
			vi.advanceTimersByTime(30000);

			// Fetch again - should use cache
			await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
				staleTime: 60000,
			});

			expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call
		});
	});

	describe("Stale Data Refetch", () => {
		it("should refetch when data is stale", async () => {
			const queryKey = ["api", "user"];
			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({ id: "1", name: "User 1" })
				.mockResolvedValueOnce({ id: "1", name: "User 1 Updated" });

			// Initial fetch
			const result1 = await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
				staleTime: 1000, // 1 second
			});

			expect(result1.name).toBe("User 1");
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Advance time past staleTime
			vi.advanceTimersByTime(2000);

			// Fetch again - should refetch because data is stale
			const result2 = await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
				staleTime: 1000,
			});

			expect(result2.name).toBe("User 1 Updated");
			expect(mockFetch).toHaveBeenCalledTimes(2); // Refetched
		});

		it("should refetch on mount when data is stale", async () => {
			const queryKey = ["mount-test"];
			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({ data: "initial" })
				.mockResolvedValueOnce({ data: "refetched" });

			// Set data that's already stale
			queryClient.setQueryData(queryKey, { data: "initial" });
			queryClient.setQueryDefaults(queryKey, {
				staleTime: 1000,
			});

			// Advance time to make data stale
			vi.advanceTimersByTime(2000);

			// Fetch query (simulating mount)
			const result = await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
			});

			expect(result.data).toBe("refetched");
			expect(mockFetch).toHaveBeenCalledTimes(1); // Refetched on mount
		});
	});

	describe("Window Focus/Reconnect Protection", () => {
		it("should NOT refetch on window focus", async () => {
			const queryKey = ["focus-test"];
			const mockFetch = vi.fn().mockResolvedValue({ data: "test" });

			// Fetch initial data
			await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Simulate window focus
			window.dispatchEvent(new Event("focus"));
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should NOT have refetched (refetchOnWindowFocus: false)
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should NOT refetch on reconnect", async () => {
			const queryKey = ["reconnect-test"];
			const mockFetch = vi.fn().mockResolvedValue({ data: "test" });

			// Fetch initial data
			await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Simulate network reconnect
			window.dispatchEvent(new Event("online"));
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should NOT have refetched (refetchOnReconnect: false)
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("verifies default configuration prevents refetch storms", () => {
			const defaults = queryClient.getDefaultOptions();

			// Verify our custom defaults are set
			expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
			expect(defaults.queries?.refetchOnReconnect).toBe(false);
			expect(defaults.queries?.refetchOnMount).toBe(true);
			expect(defaults.queries?.staleTime).toBe(300000); // 5 minutes
			expect(defaults.queries?.retry).toBe(1);
		});
	});

	describe("Cache Invalidation", () => {
		it("should refetch after invalidation", async () => {
			const queryKey = ["invalidate-test"];
			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({ data: "original" })
				.mockResolvedValueOnce({ data: "updated" });

			// Initial fetch
			await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
				staleTime: Number.POSITIVE_INFINITY, // Never stale
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Invalidate the query
			await queryClient.invalidateQueries({ queryKey });

			// Fetch again - should refetch despite staleTime: Infinity
			const result = await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
				staleTime: Number.POSITIVE_INFINITY,
			});

			expect(result.data).toBe("updated");
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("should refetch multiple queries with prefix", async () => {
			const mockFetch1 = vi.fn().mockResolvedValue({ id: "1" });
			const mockFetch2 = vi.fn().mockResolvedValue({ id: "2" });

			// Fetch multiple queries with same prefix
			await queryClient.fetchQuery({
				queryKey: ["api", "checkpoints", "1"],
				queryFn: mockFetch1,
			});

			await queryClient.fetchQuery({
				queryKey: ["api", "checkpoints", "2"],
				queryFn: mockFetch2,
			});

			expect(mockFetch1).toHaveBeenCalledTimes(1);
			expect(mockFetch2).toHaveBeenCalledTimes(1);

			// Invalidate all queries starting with ["api", "checkpoints"]
			await queryClient.invalidateQueries({
				queryKey: ["api", "checkpoints"],
			});

			// Refetch
			await queryClient.refetchQueries({
				queryKey: ["api", "checkpoints"],
			});

			// Both should have refetched
			expect(mockFetch1).toHaveBeenCalledTimes(2);
			expect(mockFetch2).toHaveBeenCalledTimes(2);
		});
	});

	describe("Error Handling", () => {
		it("should not cache failed queries", async () => {
			const queryKey = ["error-test"];
			const mockFetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce({ data: "success" });

			// First attempt fails
			await expect(
				queryClient.fetchQuery({
					queryKey,
					queryFn: mockFetch,
					retry: false, // Don't retry
				}),
			).rejects.toThrow("Network error");

			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second attempt should retry (not use cached error)
			const result = await queryClient.fetchQuery({
				queryKey,
				queryFn: mockFetch,
				retry: false,
			});

			expect(result.data).toBe("success");
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("Performance", () => {
		it("should handle many queries efficiently", async () => {
			const startTime = Date.now();
			const promises = [];

			// Create 100 queries
			for (let i = 0; i < 100; i++) {
				const queryKey = ["perf-test", i];
				const promise = queryClient.fetchQuery({
					queryKey,
					queryFn: async () => ({ id: i, data: `Item ${i}` }),
				});
				promises.push(promise);
			}

			await Promise.all(promises);
			const endTime = Date.now();

			// Should complete in reasonable time (< 1 second)
			const duration = endTime - startTime;
			expect(duration).toBeLessThan(1000);

			// Verify all queries are cached
			const cache = queryClient.getQueryCache();
			expect(cache.getAll().length).toBe(100);
		});
	});
});
