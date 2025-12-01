/**
 * Rate Limiting Tests
 *
 * Comprehensive test coverage for the rate limiting utility
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("Rate Limiting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Rate Limiting", () => {
		it("should allow first request", () => {
			const result = checkRateLimit("test-user-1");

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(9); // 10 max - 1 used
			expect(result.resetAt).toBeGreaterThan(Date.now());
		});

		it("should track attempts correctly", () => {
			const identifier = "test-user-2";

			// First 5 attempts
			for (let i = 0; i < 5; i++) {
				const result = checkRateLimit(identifier);
				expect(result.allowed).toBe(true);
				expect(result.remaining).toBe(9 - i);
			}
		});

		it("should block after max attempts", () => {
			const identifier = "test-user-3";

			// Use up all 10 attempts
			for (let i = 0; i < 10; i++) {
				const result = checkRateLimit(identifier);
				expect(result.allowed).toBe(true);
			}

			// 11th attempt should be blocked
			const blocked = checkRateLimit(identifier);
			expect(blocked.allowed).toBe(false);
			expect(blocked.remaining).toBe(0);
		});

		it("should maintain separate limits per identifier", () => {
			checkRateLimit("user-a");
			checkRateLimit("user-a");

			const userA = checkRateLimit("user-a");
			const userB = checkRateLimit("user-b");

			expect(userA.remaining).toBe(7); // 3 attempts used
			expect(userB.remaining).toBe(9); // 1 attempt used
		});
	});

	describe("Rate Limit Reset", () => {
		it("should reset rate limit for identifier", () => {
			const identifier = "test-user-4";

			// Use 5 attempts
			for (let i = 0; i < 5; i++) {
				checkRateLimit(identifier);
			}

			// Reset
			resetRateLimit(identifier);

			// Should have full limit again
			const result = checkRateLimit(identifier);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(9);
		});

		it("should not affect other identifiers", () => {
			checkRateLimit("user-x");
			checkRateLimit("user-x");
			checkRateLimit("user-y");

			resetRateLimit("user-x");

			const userX = checkRateLimit("user-x");
			const userY = checkRateLimit("user-y");

			expect(userX.remaining).toBe(9); // Reset
			expect(userY.remaining).toBe(8); // Not reset
		});
	});

	describe("Performance", () => {
		it("should handle high volume efficiently", () => {
			const start = performance.now();

			// 1000 checks across 100 users
			for (let i = 0; i < 1000; i++) {
				checkRateLimit(`perf-user-${i % 100}`);
			}

			const duration = performance.now() - start;

			// Should complete in reasonable time (< 100ms for 1000 operations)
			expect(duration).toBeLessThan(100);
		});
	});
});
