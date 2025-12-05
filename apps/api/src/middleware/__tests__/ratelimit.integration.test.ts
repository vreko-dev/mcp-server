/**
 * Rate Limiting Integration Tests
 *
 * Tests REAL rate limiting with Redis integration and fallback behavior.
 * These are NOT unit tests - they test complete request flow with rate limiting.
 *
 * Run with: pnpm test:integration
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { createRateLimitMiddleware } from "../ratelimit.js";
import {
	closeRedisClient,
	getRedisClient,
	initializeRedisClient,
} from "../../../lib/redis-client.js";

describe("Rate Limiting Integration", () => {
	let app: Hono;
	let redisAvailable = false;

	beforeAll(async () => {
		// Try to initialize Redis
		if (process.env.REDIS_URL) {
			try {
				await initializeRedisClient();
				const client = await getRedisClient();
				await client.ping();
				redisAvailable = true;
				console.log("✓ Redis available for rate limiting tests");
			} catch (error) {
				console.log("⚠ Redis not available, testing in-memory fallback");
			}
		} else {
			console.log("⚠ REDIS_URL not set, testing in-memory fallback");
		}
	});

	afterAll(async () => {
		await closeRedisClient();
	});

	beforeEach(async () => {
		// Create fresh Hono app for each test
		app = new Hono();

		// Clear rate limit buckets if Redis is available
		if (redisAvailable) {
			try {
				const client = await getRedisClient();
				const keys = await client.keys("ratelimit:*");
				if (keys.length > 0) {
					for (const key of keys) {
						await client.del(key);
					}
				}
			} catch (error) {
				// Ignore cleanup errors
			}
		}
	});

	describe("In-Memory Rate Limiting (No Redis)", () => {
		beforeEach(() => {
			// Create app with in-memory rate limiter
			const middleware = createRateLimitMiddleware();
			app.use("*", middleware);
			app.get("/test", (c: Context) => c.json({ message: "success" }));
		});

		it("should allow requests under burst limit", async () => {
			// Make 5 requests (under limit of 10)
			for (let i = 0; i < 5; i++) {
				const response = await app.request("/test", {
					method: "GET",
					headers: {
						"X-Forwarded-For": "192.168.1.100",
					},
				});

				expect(response.status).toBe(200);
				expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
				expect(Number(response.headers.get("X-RateLimit-Remaining"))).toBeGreaterThanOrEqual(0);
			}
		});

		it("should block requests exceeding burst limit", async () => {
			const clientIp = "192.168.1.101";

			// Make 10 requests (at limit)
			for (let i = 0; i < 10; i++) {
				await app.request("/test", {
					method: "GET",
					headers: {
						"X-Forwarded-For": clientIp,
					},
				});
			}

			// 11th request should be blocked
			const blockedResponse = await app.request("/test", {
				method: "GET",
				headers: {
					"X-Forwarded-For": clientIp,
				},
			});

			expect(blockedResponse.status).toBe(429);
			expect(blockedResponse.headers.get("X-RateLimit-Remaining")).toBe("0");
			expect(blockedResponse.headers.has("Retry-After")).toBe(true);

			const body = await blockedResponse.json();
			expect(body.error).toBe("Too Many Requests");
		});

		it("should track different IPs independently", async () => {
			// IP 1 makes 10 requests
			for (let i = 0; i < 10; i++) {
				await app.request("/test", {
					method: "GET",
					headers: {
						"X-Forwarded-For": "192.168.1.102",
					},
				});
			}

			// IP 2 should still have full quota
			const response = await app.request("/test", {
				method: "GET",
				headers: {
					"X-Forwarded-For": "192.168.1.103",
				},
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("X-RateLimit-Remaining")).toBe("9");
		});

		it("should refill tokens over time", async () => {
			const clientIp = "192.168.1.104";

			// Consume some tokens
			for (let i = 0; i < 5; i++) {
				await app.request("/test", {
					method: "GET",
					headers: {
						"X-Forwarded-For": clientIp,
					},
				});
			}

			// Wait for token refill (1 token per 1 second)
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Should have more tokens now
			const response = await app.request("/test", {
				method: "GET",
				headers: {
					"X-Forwarded-For": clientIp,
				},
			});

			expect(response.status).toBe(200);
		});

		it("should include rate limit headers in response", async () => {
			const response = await app.request("/test", {
				method: "GET",
				headers: {
					"X-Forwarded-For": "192.168.1.105",
				},
			});

			expect(response.headers.has("X-RateLimit-Limit")).toBe(true);
			expect(response.headers.has("X-RateLimit-Remaining")).toBe(true);
			expect(response.headers.has("X-RateLimit-Reset")).toBe(true);
		});
	});

	describe("Redis-Backed Rate Limiting", () => {
		beforeEach(async () => {
			if (!redisAvailable) return;

			// Create app with Redis-backed rate limiter
			const client = await getRedisClient();
			const middleware = createRateLimitMiddleware(client);
			app.use("*", middleware);
			app.get("/test", (c: Context) => c.json({ message: "success" }));
		});

		it("should use Redis for distributed rate limiting", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			const clientIp = "192.168.1.200";

			// Make requests
			for (let i = 0; i < 5; i++) {
				const response = await app.request("/test", {
					method: "GET",
					headers: {
						"X-Forwarded-For": clientIp,
					},
				});

				expect(response.status).toBe(200);
			}

			// Verify Redis has the rate limit data
			const client = await getRedisClient();
			const keys = await client.keys(`ratelimit:${clientIp}`);
			expect(keys.length).toBeGreaterThan(0);

			const data = await client.hGetAll(`ratelimit:${clientIp}`);
			expect(data.count).toBeDefined();
			expect(Number(data.count)).toBeGreaterThan(0);
		});

		it("should enforce limits across Redis", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			const clientIp = "192.168.1.201";

			// Consume all tokens
			for (let i = 0; i < 10; i++) {
				await app.request("/test", {
					method: "GET",
					headers: {
						"X-Forwarded-For": clientIp,
					},
				});
			}

			// Next request should be blocked
			const response = await app.request("/test", {
				method: "GET",
				headers: {
					"X-Forwarded-For": clientIp,
				},
			});

			expect(response.status).toBe(429);
		});

		it("should fall back to in-memory if Redis fails", async () => {
			if (!redisAvailable) {
				console.log("⏭ Skipping - Redis not available");
				return;
			}

			// Close Redis connection to simulate failure
			await closeRedisClient();

			// Requests should still work with in-memory fallback
			const response = await app.request("/test", {
				method: "GET",
				headers: {
					"X-Forwarded-For": "192.168.1.202",
				},
			});

			expect(response.status).toBe(200);

			// Reconnect Redis for other tests
			await initializeRedisClient();
		});
	});

	describe("Rate Limit Bypass for Exempt Paths", () => {
		beforeEach(() => {
			const middleware = createRateLimitMiddleware();
			app.use("*", middleware);
			app.get("/health", (c: Context) => c.json({ status: "ok" }));
			app.get("/api/test", (c: Context) => c.json({ message: "success" }));
		});

		it("should not rate limit health check endpoints", async () => {
			// Make many requests to health endpoint
			for (let i = 0; i < 20; i++) {
				const response = await app.request("/health", {
					method: "GET",
					headers: {
						"X-Forwarded-For": "192.168.1.106",
					},
				});

				expect(response.status).toBe(200);
				// Should not have rate limit headers for exempt paths
			}
		});
	});

	describe("Rate Limit Error Responses", () => {
		beforeEach(() => {
			const middleware = createRateLimitMiddleware();
			app.use("*", middleware);
			app.get("/test", (c: Context) => c.json({ message: "success" }));
		});

		it("should return proper error format when rate limited", async () => {
			const clientIp = "192.168.1.107";

			// Exceed limit
			for (let i = 0; i < 11; i++) {
				await app.request("/test", {
					method: "GET",
					headers: {
						"X-Forwarded-For": clientIp,
					},
				});
			}

			const response = await app.request("/test", {
				method: "GET",
				headers: {
					"X-Forwarded-For": clientIp,
				},
			});

			expect(response.status).toBe(429);

			const body = await response.json();
			expect(body).toHaveProperty("error");
			expect(body).toHaveProperty("message");
			expect(body).toHaveProperty("retryAfter");
			expect(body.error).toBe("Too Many Requests");
		});
	});

	describe("Concurrent Request Handling", () => {
		beforeEach(() => {
			const middleware = createRateLimitMiddleware();
			app.use("*", middleware);
			app.get("/test", (c: Context) => c.json({ message: "success" }));
		});

		it("should handle concurrent requests correctly", async () => {
			const clientIp = "192.168.1.108";

			// Make concurrent requests
			const requests = Array.from({ length: 5 }, () =>
				app.request("/test", {
					method: "GET",
					headers: {
						"X-Forwarded-For": clientIp,
					},
				}),
			);

			const responses = await Promise.all(requests);

			// All should succeed (under limit)
			for (const response of responses) {
				expect(response.status).toBe(200);
			}
		});
	});
});
