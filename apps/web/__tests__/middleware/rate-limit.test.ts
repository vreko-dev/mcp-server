import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "../../app/middleware/rate-limit.js";

// Mock Redis client
const mockRedisClient = {
	get: vi.fn(),
	set: vi.fn(),
};

vi.mock("@snapback/api-service/lib/redis-client", () => ({
	getRedisClient: vi.fn().mockResolvedValue(mockRedisClient),
}));

describe("Rate Limiting Middleware", () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
	});

	it("should allow request when tokens are available", async () => {
		// Mock Redis to return a bucket with sufficient tokens
		mockRedisClient.get.mockResolvedValue(
			JSON.stringify({
				tokens: 50,
				lastRefill: Date.now() / 1000,
				capacity: 100,
				refillRate: 0.0278,
			}),
		);

		const result = await checkRateLimit("test-key", 1);

		expect(result.allowed).toBe(true);
		expect(result.tokens).toBeGreaterThanOrEqual(0);
		expect(result.capacity).toBe(100);
		expect(mockRedisClient.set).toHaveBeenCalled();
	});

	it("should block request when no tokens are available", async () => {
		// Mock Redis to return a bucket with no tokens
		mockRedisClient.get.mockResolvedValue(
			JSON.stringify({
				tokens: 0,
				lastRefill: Date.now() / 1000,
				capacity: 100,
				refillRate: 0.0278,
			}),
		);

		const result = await checkRateLimit("test-key", 1);

		expect(result.allowed).toBe(false);
		expect(result.tokens).toBe(0);
		expect(result.capacity).toBe(100);
		expect(result.retryAfter).toBeGreaterThan(0);
	});

	it("should handle high capacity buckets", async () => {
		// Mock Redis to return a bucket with sufficient tokens
		mockRedisClient.get.mockResolvedValue(
			JSON.stringify({
				tokens: 500,
				lastRefill: Date.now() / 1000,
				capacity: 1000,
				refillRate: 0.2778,
			}),
		);

		const result = await checkRateLimit("test-key", 1);

		expect(result.allowed).toBe(true);
		expect(result.tokens).toBeGreaterThanOrEqual(0);
		expect(result.capacity).toBe(1000);
		expect(mockRedisClient.set).toHaveBeenCalled();
	});

	it("should refill tokens over time", async () => {
		// Mock Redis to return a bucket that should be refilled
		const oldTimestamp = Date.now() / 1000 - 3600; // 1 hour ago
		mockRedisClient.get.mockResolvedValue(
			JSON.stringify({
				tokens: 50,
				lastRefill: oldTimestamp,
				capacity: 100,
				refillRate: 0.0278,
			}),
		);

		const result = await checkRateLimit("test-key", 1);

		// Should have more tokens after refill
		expect(result.allowed).toBe(true);
		expect(result.tokens).toBeGreaterThan(50);
		expect(mockRedisClient.set).toHaveBeenCalled();
	});

	it("should handle concurrent requests", async () => {
		// Mock Redis to return a bucket with exactly enough tokens for one request
		mockRedisClient.get.mockResolvedValue(
			JSON.stringify({
				tokens: 1,
				lastRefill: Date.now() / 1000,
				capacity: 100,
				refillRate: 0.0278,
			}),
		);

		// Make two concurrent requests
		const result1 = await checkRateLimit("test-key", 1);
		const result2 = await checkRateLimit("test-key", 1);

		// First should be allowed, second should be blocked
		expect(result1.allowed).toBe(true);
		expect(result2.allowed).toBe(false);
	});
});
