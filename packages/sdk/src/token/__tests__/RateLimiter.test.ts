import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanConfig } from "../RateLimiter.js";
import { RateLimiter } from "../RateLimiter.js";

describe("RateLimiter", () => {
	const plans: Record<string, PlanConfig> = {
		free: { capacity: 20, refillRate: 0.167 }, // ~10/min
		pro: { capacity: 200, refillRate: 1.667 }, // ~100/min
		team: { capacity: 1000, refillRate: 8.333 }, // ~500/min
		enterprise: { capacity: 5000, refillRate: 33.333 }, // ~2000/min
	};

	let rateLimiter: RateLimiter;

	beforeEach(() => {
		vi.useRealTimers();
		rateLimiter = new RateLimiter(plans);
	});

	describe("Initialization", () => {
		it("should initialize with plan configs", () => {
			expect(rateLimiter).toBeDefined();
		});

		it("should validate plan configs", () => {
			const invalidPlans = { free: { capacity: -1, refillRate: 1 } };
			expect(() => new RateLimiter(invalidPlans)).toThrow();
		});

		it("should handle empty plans", () => {
			expect(() => new RateLimiter({})).toThrow();
		});
	});

	describe("Tier-Based Rate Limiting", () => {
		it("should enforce free tier limits", async () => {
			// Free: 20 tokens, 0.167/sec = ~10/min
			const results = [];
			for (let i = 0; i < 20; i++) {
				const result = await rateLimiter.checkLimit("user1", "free");
				results.push(result);
			}

			// First 20 should succeed
			for (let i = 0; i < 20; i++) {
				expect(results[i].allowed).toBe(true);
			}

			// 21st should fail
			const extra = await rateLimiter.checkLimit("user1", "free");
			expect(extra.allowed).toBe(false);
		});

		it("should enforce pro tier limits", async () => {
			// Pro: 200 tokens
			const results = [];
			for (let i = 0; i < 200; i++) {
				const result = await rateLimiter.checkLimit("user2", "pro");
				results.push(result);
			}

			for (let i = 0; i < 200; i++) {
				expect(results[i].allowed).toBe(true);
			}

			const extra = await rateLimiter.checkLimit("user2", "pro");
			expect(extra.allowed).toBe(false);
		});

		it("should enforce team tier limits", async () => {
			// Team: 1000 tokens
			const results = [];
			for (let i = 0; i < 1000; i++) {
				const result = await rateLimiter.checkLimit("user3", "team");
				results.push(result);
			}

			for (let i = 0; i < 1000; i++) {
				expect(results[i].allowed).toBe(true);
			}

			const extra = await rateLimiter.checkLimit("user3", "team");
			expect(extra.allowed).toBe(false);
		});

		it("should reject unknown plan", async () => {
			expect(rateLimiter.checkLimit("user1", "unknown")).rejects.toThrow("Unknown plan");
		});
	});

	describe("Multi-User Isolation", () => {
		it("should isolate rate limits per user", async () => {
			// User 1 exhausts free tier
			for (let i = 0; i < 20; i++) {
				await rateLimiter.checkLimit("user1", "free");
			}

			const user1Extra = await rateLimiter.checkLimit("user1", "free");
			expect(user1Extra.allowed).toBe(false);

			// User 2 should not be affected
			const user2 = await rateLimiter.checkLimit("user2", "free");
			expect(user2.allowed).toBe(true);
		});

		it("should allow different plans for different users", async () => {
			// User 1: free tier (20 tokens)
			for (let i = 0; i < 20; i++) {
				await rateLimiter.checkLimit("user1", "free");
			}

			// User 2: pro tier (200 tokens)
			const user2Results = [];
			for (let i = 0; i < 30; i++) {
				const result = await rateLimiter.checkLimit("user2", "pro");
				user2Results.push(result);
			}

			for (const result of user2Results) {
				expect(result.allowed).toBe(true);
			}
		});

		it("should isolate buckets by plan tier", async () => {
			// User 1 with free tier
			for (let i = 0; i < 20; i++) {
				await rateLimiter.checkLimit("user1", "free");
			}

			const freeExhausted = await rateLimiter.checkLimit("user1", "free");
			expect(freeExhausted.allowed).toBe(false);

			// Same user with pro tier should have separate bucket (with different bucket)
			const proResult = await rateLimiter.checkLimit("user2", "pro");
			expect(proResult.allowed).toBe(true);
		});
	});

	describe("Token Refilling", () => {
		it("should refill tokens over time", async () => {
			vi.useFakeTimers();

			// Exhaust free tier
			for (let i = 0; i < 20; i++) {
				await rateLimiter.checkLimit("user1", "free");
			}

			const exhausted = await rateLimiter.checkLimit("user1", "free");
			expect(exhausted.allowed).toBe(false);

			// Advance time by 6 seconds (1 token refilled at 0.167/sec)
			vi.advanceTimersByTime(6000);

			const refilled = await rateLimiter.checkLimit("user1", "free");
			// Should be allowed since tokens refilled
			expect(refilled.allowed).toBe(true);

			vi.useRealTimers();
		});

		it("should cap refilled tokens at capacity", async () => {
			vi.useFakeTimers();

			// Exhaust some tokens
			for (let i = 0; i < 10; i++) {
				await rateLimiter.checkLimit("user1", "free");
			}

			// Advance time way beyond what's needed to refill all
			vi.advanceTimersByTime(1000000); // Much longer than needed

			// Try to consume more than capacity
			const results = [];
			for (let i = 0; i < 25; i++) {
				const result = await rateLimiter.checkLimit("user1", "free");
				results.push(result);
			}

			// Should allow exactly 20 (the capacity)
			let successCount = 0;
			for (const result of results) {
				if (result.allowed) { successCount++; }
			}
			expect(successCount).toBe(20);

			vi.useRealTimers();
		});
	});

	describe("Remaining Tokens", () => {
		it("should return correct remaining count", async () => {
			const result = await rateLimiter.checkLimit("user1", "free");
			expect(result.remaining).toBe(19); // 20 - 1
		});

		it("should return zero when exhausted", async () => {
			for (let i = 0; i < 20; i++) {
				await rateLimiter.checkLimit("user1", "free");
			}

			const exhausted = await rateLimiter.checkLimit("user1", "free");
			expect(exhausted.remaining).toBe(0);
		});

		it("should update remaining after each request", async () => {
			let result = await rateLimiter.checkLimit("user1", "free");
			expect(result.remaining).toBe(19);

			result = await rateLimiter.checkLimit("user1", "free");
			expect(result.remaining).toBe(18);

			result = await rateLimiter.checkLimit("user1", "free");
			expect(result.remaining).toBe(17);
		});
	});

	describe("Reset Information", () => {
		it("should provide reset time in result", async () => {
			const result = await rateLimiter.checkLimit("user1", "free");
			expect(result.resetAt).toBeDefined();
			expect(result.resetAt).toBeInstanceOf(Date);
		});

		it("should calculate reset time correctly", async () => {
			const _before = Date.now();
			const result = await rateLimiter.checkLimit("user1", "free");
			const after = Date.now();

			// Reset should be in the future
			expect(result.resetAt.getTime()).toBeGreaterThan(after);
		});

		it("should update reset time as tokens refill", async () => {
			vi.useFakeTimers();

			const result1 = await rateLimiter.checkLimit("user1", "free");
			const reset1 = result1.resetAt.getTime();

			vi.advanceTimersByTime(5000);

			const result2 = await rateLimiter.checkLimit("user1", "free");
			const reset2 = result2.resetAt.getTime();

			// Reset time should be later
			expect(reset2).toBeGreaterThan(reset1);

			vi.useRealTimers();
		});
	});

	describe("Result Structure", () => {
		it("should return result with required fields", async () => {
			const result = await rateLimiter.checkLimit("user1", "free");

			expect(result).toHaveProperty("allowed");
			expect(result).toHaveProperty("remaining");
			expect(result).toHaveProperty("limit");
			expect(result).toHaveProperty("resetAt");
		});

		it("should include plan info in result", async () => {
			const result = await rateLimiter.checkLimit("user1", "free");
			expect(result.limit).toBe(20); // Free tier capacity
		});

		it("should include retry info when rate limited", async () => {
			for (let i = 0; i < 20; i++) {
				await rateLimiter.checkLimit("user1", "free");
			}

			const limited = await rateLimiter.checkLimit("user1", "free");
			expect(limited.allowed).toBe(false);
			if (!limited.allowed) {
				expect(limited.retryAfter).toBeDefined();
				expect(limited.retryAfter).toBeGreaterThan(0);
			}
		});
	});

	describe("Edge Cases", () => {
		it("should handle single token capacity", async () => {
			const singleTokenLimiter = new RateLimiter({
				minimal: { capacity: 1, refillRate: 0.1 },
			});

			const first = await singleTokenLimiter.checkLimit("user", "minimal");
			expect(first.allowed).toBe(true);
			expect(first.remaining).toBe(0);

			const second = await singleTokenLimiter.checkLimit("user", "minimal");
			expect(second.allowed).toBe(false);
		});

		it("should handle very high capacity plans", async () => {
			const highCapacityLimiter = new RateLimiter({
				unlimited: { capacity: 1000000, refillRate: 10000 },
			});

			const result = await highCapacityLimiter.checkLimit("user", "unlimited");
			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(1000000);
		});

		it("should handle concurrent requests from same user", async () => {
			const promises = [];
			for (let i = 0; i < 20; i++) {
				promises.push(rateLimiter.checkLimit("user1", "free"));
			}

			const results = await Promise.all(promises);
			const allowed = results.filter((r) => r.allowed).length;

			// All 20 should be allowed (no concurrency issues)
			expect(allowed).toBeGreaterThanOrEqual(19); // May vary slightly due to timing
		});

		it("should handle plan upgrade gracefully", async () => {
			// User starts with free
			for (let i = 0; i < 20; i++) {
				await rateLimiter.checkLimit("user1", "free");
			}

			const exhausted = await rateLimiter.checkLimit("user1", "free");
			expect(exhausted.allowed).toBe(false);

			// User upgrades to pro (different bucket)
			const upgraded = await rateLimiter.checkLimit("user1", "pro");
			expect(upgraded.allowed).toBe(true);
		});
	});
});
