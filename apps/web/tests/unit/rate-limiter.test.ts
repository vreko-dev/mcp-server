import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock the RateLimiter class
class RateLimiter {
	createBucket(options: {
		capacity: number;
		refillRate: number;
		tokens: number;
	}) {
		return {
			getAvailableTokens: () => options.tokens,
		};
	}

	createSlidingWindow(options: { windowMs: number; limit: number }) {
		let requests = 0;
		return {
			tryConsume: () => {
				if (requests < options.limit) {
					requests++;
					return true;
				}
				return false;
			},
		};
	}
}

describe("RateLimiter", () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		rateLimiter = new RateLimiter();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("token bucket refills correctly", () => {
		const bucket = rateLimiter.createBucket({
			capacity: 10,
			refillRate: 1, // 1 per second
			tokens: 0,
		});

		// After 5 seconds, should have 5 tokens
		vi.advanceTimersByTime(5000);
		expect(bucket.getAvailableTokens()).toBe(5);

		// Can't exceed capacity
		vi.advanceTimersByTime(20000);
		expect(bucket.getAvailableTokens()).toBe(10);
	});

	test("sliding window tracks correctly", () => {
		const window = rateLimiter.createSlidingWindow({
			windowMs: 60000, // 1 minute
			limit: 10,
		});

		// Make 10 requests
		for (let i = 0; i < 10; i++) {
			expect(window.tryConsume()).toBe(true);
		}

		// 11th fails
		expect(window.tryConsume()).toBe(false);

		// After 30 seconds, still fails (within window)
		vi.advanceTimersByTime(30000);
		expect(window.tryConsume()).toBe(false);

		// After 61 seconds, succeeds (outside window)
		vi.advanceTimersByTime(31000);
		expect(window.tryConsume()).toBe(true);
	});
});
