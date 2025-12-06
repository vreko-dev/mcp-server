import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTokenBucket } from "../TokenBucket";

describe("TokenBucket", () => {
	let bucket: ReturnType<typeof createTokenBucket>;

	beforeEach(() => {
		vi.useRealTimers();
		bucket = createTokenBucket({ capacity: 100, refillRate: 1 }); // 1 token/sec
	});

	describe("Creation and Initialization", () => {
		it("should create bucket with correct initial state", () => {
			const state = bucket.getState();
			expect(state.tokens).toBe(100);
			expect(state.capacity).toBe(100);
			expect(state.refillRate).toBe(1);
		});

		it("should validate capacity is positive", () => {
			expect(() => createTokenBucket({ capacity: 0, refillRate: 1 })).toThrow("Capacity must be greater than 0");
		});

		it("should validate refill rate is positive", () => {
			expect(() => createTokenBucket({ capacity: 100, refillRate: -1 })).toThrow(
				"Refill rate must be greater than 0",
			);
		});

		it("should validate refill rate is positive (zero)", () => {
			expect(() => createTokenBucket({ capacity: 100, refillRate: 0 })).toThrow(
				"Refill rate must be greater than 0",
			);
		});
	});

	describe("Token Consumption", () => {
		it("should allow consuming tokens when available", () => {
			const result = bucket.tryConsume(10);
			expect(result.allowed).toBe(true);
			expect(result.tokensRemaining).toBe(90);
			expect(result.resetAt).toBeDefined();
		});

		it("should prevent consuming more tokens than available", () => {
			const result = bucket.tryConsume(101);
			expect(result.allowed).toBe(false);
			expect(result.tokensRemaining).toBe(100);
		});

		it("should prevent consuming negative tokens", () => {
			expect(() => bucket.tryConsume(-1)).toThrow("Token amount must be greater than 0");
		});

		it("should prevent consuming zero tokens", () => {
			expect(() => bucket.tryConsume(0)).toThrow("Token amount must be greater than 0");
		});

		it("should consume exact capacity", () => {
			const result = bucket.tryConsume(100);
			expect(result.allowed).toBe(true);
			expect(result.tokensRemaining).toBe(0);
		});

		it("should return false when bucket empty", () => {
			bucket.tryConsume(100);
			const result = bucket.tryConsume(1);
			expect(result.allowed).toBe(false);
			expect(result.tokensRemaining).toBe(0);
		});
	});

	describe("Token Refilling", () => {
		it("should refill tokens over time (1 token per second)", async () => {
			// Use fake timers for deterministic testing
			vi.useFakeTimers();

			bucket.tryConsume(50); // Consume 50 tokens
			expect(bucket.getState().tokens).toBe(50);

			// Advance 10 seconds
			vi.advanceTimersByTime(10000);
			bucket.refill(); // Trigger refill check

			// Should have 60 tokens (50 + 10 tokens over 10 seconds)
			expect(bucket.getState().tokens).toBe(60);

			vi.useRealTimers();
		});

		it("should not exceed capacity when refilling", async () => {
			vi.useFakeTimers();

			bucket.tryConsume(10); // Consume 10, leaving 90
			expect(bucket.getState().tokens).toBe(90);

			vi.advanceTimersByTime(100000); // Advance 100 seconds (100 tokens)
			bucket.refill();

			// Should be capped at 100
			expect(bucket.getState().tokens).toBe(100);

			vi.useRealTimers();
		});

		it("should handle refill with custom refill rate", () => {
			vi.useFakeTimers();

			const fastBucket = createTokenBucket({
				capacity: 100,
				refillRate: 10, // 10 tokens per second
			});

			fastBucket.tryConsume(50);
			vi.advanceTimersByTime(5000); // 5 seconds
			fastBucket.refill();

			// Should have 50 + (5 * 10) = 100 tokens
			expect(fastBucket.getState().tokens).toBe(100);

			vi.useRealTimers();
		});

		it("should handle fractional token refills", () => {
			vi.useFakeTimers();

			const slowBucket = createTokenBucket({
				capacity: 100,
				refillRate: 0.5, // 0.5 tokens per second
			});

			slowBucket.tryConsume(100);
			vi.advanceTimersByTime(1000); // 1 second
			slowBucket.refill();

			// Should have 0 + 0.5 = 0.5 tokens
			expect(slowBucket.getState().tokens).toBeCloseTo(0.5, 5);

			vi.useRealTimers();
		});
	});

	describe("State Management", () => {
		it("should return current state", () => {
			const state = bucket.getState();
			expect(state).toHaveProperty("tokens");
			expect(state).toHaveProperty("capacity");
			expect(state).toHaveProperty("refillRate");
			expect(state).toHaveProperty("lastRefill");
		});

		it("should reset bucket to full capacity", () => {
			bucket.tryConsume(50);
			expect(bucket.getState().tokens).toBe(50);

			bucket.reset();
			expect(bucket.getState().tokens).toBe(100);
		});

		it("should get consumption info", () => {
			const info = bucket.getConsumptionInfo();
			expect(info).toHaveProperty("consumed");
			expect(info).toHaveProperty("remaining");
			expect(info).toHaveProperty("percentageUsed");

			expect(info.consumed).toBe(0);
			expect(info.remaining).toBe(100);
			expect(info.percentageUsed).toBe(0);
		});

		it("should update consumption info after consuming tokens", () => {
			bucket.tryConsume(25);
			const info = bucket.getConsumptionInfo();

			expect(info.consumed).toBe(25);
			expect(info.remaining).toBe(75);
			expect(info.percentageUsed).toBe(25);
		});
	});

	describe("Edge Cases", () => {
		it("should handle very large capacity", () => {
			const largeBucket = createTokenBucket({
				capacity: Number.MAX_SAFE_INTEGER,
				refillRate: 1,
			});

			const state = largeBucket.getState();
			expect(state.capacity).toBe(Number.MAX_SAFE_INTEGER);
			expect(state.tokens).toBe(Number.MAX_SAFE_INTEGER);
		});

		it("should handle very small refill rate", () => {
			vi.useFakeTimers();

			const microBucket = createTokenBucket({
				capacity: 100,
				refillRate: 0.001, // 1 token per 1000 seconds
			});

			microBucket.tryConsume(100);
			vi.advanceTimersByTime(1000);
			microBucket.refill();

			expect(microBucket.getState().tokens).toBeCloseTo(0.001, 5);

			vi.useRealTimers();
		});

		it("should handle rapid-fire consumption attempts", () => {
			const results = [];
			for (let i = 0; i < 100; i++) {
				results.push(bucket.tryConsume(1));
			}

			// First 100 should succeed
			for (let i = 0; i < 100; i++) {
				expect(results[i].allowed).toBe(true);
			}

			// 101st should fail
			const extra = bucket.tryConsume(1);
			expect(extra.allowed).toBe(false);
		});

		it("should handle consumption exactly at boundary", () => {
			bucket.tryConsume(50);
			const result = bucket.tryConsume(50);

			expect(result.allowed).toBe(true);
			expect(result.tokensRemaining).toBe(0);
		});
	});

	describe("Time Tracking", () => {
		it("should track last refill time", () => {
			const state1 = bucket.getState();
			const refill1 = state1.lastRefill;

			vi.useFakeTimers();
			vi.advanceTimersByTime(1000);
			bucket.refill();

			const state2 = bucket.getState();
			expect(state2.lastRefill).toBeGreaterThan(refill1);

			vi.useRealTimers();
		});

		it("should provide reset time in consumption result", () => {
			const result = bucket.tryConsume(1);
			expect(result.resetAt).toBeDefined();
			expect(result.resetAt).toBeInstanceOf(Date);
		});
	});
});
