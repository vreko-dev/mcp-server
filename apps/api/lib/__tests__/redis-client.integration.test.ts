/**
 * Redis Client Integration Tests
 *
 * Tests REAL Redis connections and fallback behavior.
 * These are NOT unit tests - they test actual Redis integration.
 *
 * Run with: pnpm test:integration
 * Requires: Redis running on localhost:6379 OR fallback to in-memory
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	closeRedisClient,
	getRedisClient,
	initializeRedisClient,
} from "../../lib/redis-client";

describe("Redis Client Integration", () => {
	let originalEnv: NodeJS.ProcessEnv;
	let redisAvailable = false;

	beforeAll(async () => {
		originalEnv = process.env;

		// Try to connect to real Redis
		if (process.env.REDIS_URL) {
			try {
				const client = await getRedisClient();
				await client.ping();
				redisAvailable = true;
				console.log("✓ Real Redis available for integration tests");
			} catch (error) {
				console.log(
					"⚠ Redis not available, testing graceful fallback",
				);
			}
		}
	});

	afterAll(async () => {
		process.env = originalEnv;
		await closeRedisClient();
	});

	beforeEach(async () => {
		// Reset Redis state between tests
		if (redisAvailable) {
			try {
				const client = await getRedisClient();
				await client.flushDb();
			} catch (error) {
				// Ignore cleanup errors
			}
		}
	});

	describe("Real Redis Connection", () => {
		it("should connect to real Redis when URL provided", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			process.env.REDIS_URL = "redis://localhost:6379";

			const client = await getRedisClient();

			// Test actual Redis operations
			await client.set("test:key", "test-value");
			const value = await client.get("test:key");

			expect(value).toBe("test-value");

			// Cleanup
			await client.del("test:key");
		});

		it("should handle Redis SET/GET operations", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			const client = await getRedisClient();

			// Test string operations
			await client.set("user:123", "John Doe");
			const userName = await client.get("user:123");
			expect(userName).toBe("John Doe");

			// Test with expiry
			await client.setEx("session:456", 60, "session-data");
			const sessionData = await client.get("session:456");
			expect(sessionData).toBe("session-data");

			// Verify TTL was set
			const ttl = await client.ttl("session:456");
			expect(ttl).toBeGreaterThan(0);
			expect(ttl).toBeLessThanOrEqual(60);
		});

		it("should handle Redis INCR for counters", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			const client = await getRedisClient();

			// Test counter increment
			await client.set("counter:requests", "0");
			await client.incr("counter:requests");
			await client.incr("counter:requests");
			await client.incr("counter:requests");

			const count = await client.get("counter:requests");
			expect(count).toBe("3");
		});

		it("should handle Redis HSET/HGET for hashes", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			const client = await getRedisClient();

			// Test hash operations
			await client.hSet("user:789", "name", "Alice");
			await client.hSet("user:789", "email", "alice@example.com");

			const name = await client.hGet("user:789", "name");
			const email = await client.hGet("user:789", "email");

			expect(name).toBe("Alice");
			expect(email).toBe("alice@example.com");

			// Test HGETALL
			const userData = await client.hGetAll("user:789");
			expect(userData).toEqual({
				name: "Alice",
				email: "alice@example.com",
			});
		});

		it("should handle Redis connection errors gracefully", async () => {
			// Test with invalid URL
			process.env.REDIS_URL = "redis://invalid-host:9999";

			// Reset module to force new connection attempt
			await closeRedisClient();

			// Should throw error for invalid connection
			await expect(getRedisClient()).rejects.toThrow();
		});
	});

	describe("Graceful Fallback Behavior", () => {
		it("should warn when REDIS_URL not configured", async () => {
			delete process.env.REDIS_URL;

			await closeRedisClient();

			// Should complete without error
			await expect(initializeRedisClient()).resolves.toBeUndefined();
		});

		it("should handle initialization failure gracefully", async () => {
			process.env.REDIS_URL = "redis://unreachable-host:6379";

			await closeRedisClient();

			// Should not throw - allows fallback
			await expect(initializeRedisClient()).resolves.toBeUndefined();
		});
	});

	describe("Rate Limiting Integration", () => {
		it("should support rate limiting with Lua script", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			const client = await getRedisClient();
			const key = "ratelimit:test-ip";
			const now = Date.now();
			const burstLimit = 10;
			const burstWindow = 10000; // 10 seconds

			// Execute rate limit Lua script
			const result = (await client.eval(
				`
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local burst_limit = tonumber(ARGV[2])
        local burst_window = tonumber(ARGV[3])

        local data = redis.call('HGETALL', key)
        local request_count = tonumber(data[2] or 0)
        local window_start = tonumber(data[4] or now)

        if now - window_start > burst_window then
          request_count = 0
          window_start = now
        end

        if request_count >= burst_limit then
          local reset_time = window_start + burst_window
          return {0, 0, reset_time}
        end

        request_count = request_count + 1
        redis.call('HSET', key, 'count', request_count, 'start', window_start)
        redis.call('EXPIRE', key, burst_window / 1000 + 1)

        local remaining = math.max(0, burst_limit - request_count)
        local reset_time = window_start + burst_window
        return {1, remaining, reset_time}
      `,
				{
					keys: [key],
					arguments: [String(now), String(burstLimit), String(burstWindow)],
				},
			)) as number[];

			expect(result[0]).toBe(1); // Allowed
			expect(result[1]).toBe(9); // Remaining (10 - 1)

			// Make more requests
			for (let i = 0; i < 9; i++) {
				await client.eval(
					`
          local key = KEYS[1]
          local now = tonumber(ARGV[1])
          local burst_limit = tonumber(ARGV[2])
          local burst_window = tonumber(ARGV[3])

          local data = redis.call('HGETALL', key)
          local request_count = tonumber(data[2] or 0)
          local window_start = tonumber(data[4] or now)

          if now - window_start > burst_window then
            request_count = 0
            window_start = now
          end

          if request_count >= burst_limit then
            local reset_time = window_start + burst_window
            return {0, 0, reset_time}
          end

          request_count = request_count + 1
          redis.call('HSET', key, 'count', request_count, 'start', window_start)
          redis.call('EXPIRE', key, burst_window / 1000 + 1)

          local remaining = math.max(0, burst_limit - request_count)
          local reset_time = window_start + burst_window
          return {1, remaining, reset_time}
        `,
					{
						keys: [key],
						arguments: [String(now + i), String(burstLimit), String(burstWindow)],
					},
				);
			}

			// 11th request should be blocked
			const blockedResult = (await client.eval(
				`
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local burst_limit = tonumber(ARGV[2])
        local burst_window = tonumber(ARGV[3])

        local data = redis.call('HGETALL', key)
        local request_count = tonumber(data[2] or 0)
        local window_start = tonumber(data[4] or now)

        if now - window_start > burst_window then
          request_count = 0
          window_start = now
        end

        if request_count >= burst_limit then
          local reset_time = window_start + burst_window
          return {0, 0, reset_time}
        end

        request_count = request_count + 1
        redis.call('HSET', key, 'count', request_count, 'start', window_start)
        redis.call('EXPIRE', key, burst_window / 1000 + 1)

        local remaining = math.max(0, burst_limit - request_count)
        local reset_time = window_start + burst_window
        return {1, remaining, reset_time}
      `,
				{
					keys: [key],
					arguments: [String(now + 10), String(burstLimit), String(burstWindow)],
				},
			)) as number[];

			expect(blockedResult[0]).toBe(0); // Blocked
			expect(blockedResult[1]).toBe(0); // No remaining
		});
	});

	describe("Connection Lifecycle", () => {
		it("should reuse existing connection (singleton)", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			const client1 = await getRedisClient();
			const client2 = await getRedisClient();

			// Should be same instance
			expect(client1).toBe(client2);
		});

		it("should close connection gracefully", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			const client = await getRedisClient();

			await closeRedisClient();

			// After close, getting client should create new connection
			const newClient = await getRedisClient();
			expect(newClient).toBeDefined();
		});
	});
});
