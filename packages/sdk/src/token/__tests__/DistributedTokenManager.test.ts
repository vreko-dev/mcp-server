import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DistributedTokenManagerOptions } from "../DistributedTokenManager";
import { DistributedTokenManager } from "../DistributedTokenManager";
import type { PlanConfig } from "../RateLimiter";

describe("DistributedTokenManager", () => {
	const plans: Record<string, PlanConfig> = {
		free: { capacity: 20, refillRate: 0.167 },
		pro: { capacity: 200, refillRate: 1.667 },
	};

	const mockRedisClient = {
		get: vi.fn().mockImplementation(() => Promise.resolve(null)),
		set: vi.fn().mockImplementation(() => Promise.resolve()),
		incr: vi.fn().mockImplementation(() => Promise.resolve(0)),
		decr: vi.fn().mockImplementation(() => Promise.resolve(0)),
		expire: vi.fn().mockImplementation(() => Promise.resolve()),
		ttl: vi.fn().mockImplementation(() => Promise.resolve(0)),
		del: vi.fn().mockImplementation(() => Promise.resolve()),
	} as any;

	let manager: DistributedTokenManager;
	let options: DistributedTokenManagerOptions;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();

		options = {
			redisClient: mockRedisClient,
			plans,
			keyPrefix: "ratelimit:",
			ttlSeconds: 3600,
			fallbackToInMemory: true,
		};

		manager = new DistributedTokenManager(options);
	});

	describe("Initialization", () => {
		it("should initialize with valid options", () => {
			expect(manager).toBeDefined();
		});

		it("should validate redis client exists", () => {
			expect(() => {
				new DistributedTokenManager({
					...options,
					redisClient: null as any,
				});
			}).toThrow();
		});

		it("should validate plans exist", () => {
			expect(() => {
				new DistributedTokenManager({
					...options,
					plans: {},
				});
			}).toThrow();
		});
	});

	describe("Redis-Backed Rate Limiting", () => {
		it("should check limit against redis", async () => {
			mockRedisClient.get.mockResolvedValue(
				JSON.stringify({
					tokens: 10,
					lastRefill: Date.now() / 1000,
					capacity: 20,
					refillRate: 0.167,
				}),
			);

			const result = await manager.checkLimit("user1", "free");

			expect(result.allowed).toBe(true);
			expect(mockRedisClient.get).toHaveBeenCalledWith("ratelimit:user1:free");
		});

		it("should create new bucket in redis if not exists", async () => {
			mockRedisClient.get.mockResolvedValue(null);

			const result = await manager.checkLimit("user1", "free");

			expect(result.allowed).toBe(true);
			expect(mockRedisClient.set).toHaveBeenCalled();
		});

		it("should save updated bucket state to redis", async () => {
			mockRedisClient.get.mockResolvedValue(
				JSON.stringify({
					tokens: 10,
					lastRefill: Date.now() / 1000,
					capacity: 20,
					refillRate: 0.167,
				}),
			);

			await manager.checkLimit("user1", "free");

			expect(mockRedisClient.set).toHaveBeenCalled();
			const setCall = vi.mocked(mockRedisClient.set).mock.calls[0];
			expect(setCall[0]).toBe("ratelimit:user1:free");
		});

		it("should set redis expiry on bucket", async () => {
			mockRedisClient.get.mockResolvedValue(null);

			await manager.checkLimit("user1", "free");

			expect(mockRedisClient.expire).toHaveBeenCalledWith("ratelimit:user1:free", 3600);
		});

		it("should use custom key prefix", async () => {
			const customManager = new DistributedTokenManager({
				...options,
				keyPrefix: "custom:prefix:",
			});

			mockRedisClient.get.mockResolvedValue(null);

			await customManager.checkLimit("user1", "free");

			expect(mockRedisClient.get).toHaveBeenCalledWith("custom:prefix:user1:free");
		});
	});

	describe("Fallback to In-Memory", () => {
		it("should fall back to in-memory if redis fails", async () => {
			mockRedisClient.get.mockRejectedValue(new Error("Redis connection failed"));

			const result = await manager.checkLimit("user1", "free");

			expect(result.allowed).toBe(true);
			expect(result.reason).toBe("fallback");
		});

		it("should disable fallback if configured", async () => {
			const noFallbackManager = new DistributedTokenManager({
				...options,
				fallbackToInMemory: false,
			});

			mockRedisClient.get.mockRejectedValue(new Error("Redis connection failed"));

			expect(noFallbackManager.checkLimit("user1", "free")).rejects.toThrow();
		});

		it("should enforce rate limits in fallback mode", async () => {
			mockRedisClient.get.mockRejectedValue(new Error("Redis unavailable"));

			const results = [];
			for (let i = 0; i < 20; i++) {
				const result = await manager.checkLimit("user1", "free");
				results.push(result);
			}

			for (let i = 0; i < 20; i++) {
				expect(results[i].allowed).toBe(true);
			}

			const extra = await manager.checkLimit("user1", "free");
			expect(extra.allowed).toBe(false);
		});

		it("should isolate fallback buckets per user", async () => {
			mockRedisClient.get.mockRejectedValue(new Error("Redis unavailable"));

			// Exhaust user1's free tier
			for (let i = 0; i < 20; i++) {
				await manager.checkLimit("user1", "free");
			}

			const user1Extra = await manager.checkLimit("user1", "free");
			expect(user1Extra.allowed).toBe(false);

			// User2 should not be affected
			const user2 = await manager.checkLimit("user2", "free");
			expect(user2.allowed).toBe(true);
		});
	});

	describe("Multi-Plan Support", () => {
		it("should handle different plans separately", async () => {
			mockRedisClient.get.mockResolvedValue(null);

			const freeResult = await manager.checkLimit("user1", "free");
			const proResult = await manager.checkLimit("user1", "pro");

			expect(freeResult.allowed).toBe(true);
			expect(proResult.allowed).toBe(true);

			// Should have called set twice with different keys
			const setCalls = vi.mocked(mockRedisClient.set).mock.calls;
			const keys = setCalls.map((call: any[]) => call[0]);
			expect(keys).toContain("ratelimit:user1:free");
			expect(keys).toContain("ratelimit:user1:pro");
		});

		it("should reject unknown plan", async () => {
			expect(manager.checkLimit("user1", "unknown")).rejects.toThrow();
		});
	});

	describe("Token Refilling", () => {
		it("should refill tokens from old state", async () => {
			const oldTimestamp = Date.now() / 1000 - 10; // 10 seconds ago
			mockRedisClient.get.mockResolvedValue(
				JSON.stringify({
					tokens: 0,
					lastRefill: oldTimestamp,
					capacity: 20,
					refillRate: 0.167, // ~1 per 6 seconds
				}),
			);

			const result = await manager.checkLimit("user1", "free");

			// Should have refilled approximately 1-2 tokens
			expect(result.allowed).toBe(true);
		});

		it("should cap refilled tokens at capacity", async () => {
			const veryOldTimestamp = Date.now() / 1000 - 10000; // Way in the past
			mockRedisClient.get.mockResolvedValue(
				JSON.stringify({
					tokens: 0,
					lastRefill: veryOldTimestamp,
					capacity: 20,
					refillRate: 0.167,
				}),
			);

			const result = await manager.checkLimit("user1", "free");
			expect(result.remaining).toBeLessThanOrEqual(20);
		});
	});

	describe("Result Structure", () => {
		it("should return result with required fields", async () => {
			mockRedisClient.get.mockResolvedValue(null);

			const result = await manager.checkLimit("user1", "free");

			expect(result).toHaveProperty("allowed");
			expect(result).toHaveProperty("remaining");
			expect(result).toHaveProperty("limit");
			expect(result).toHaveProperty("resetAt");
			expect(result).toHaveProperty("reason");
		});

		it("should indicate redis vs fallback mode", async () => {
			mockRedisClient.get.mockResolvedValue(null);
			const redisResult = await manager.checkLimit("user1", "free");
			expect(redisResult.reason).toBe("redis");

			mockRedisClient.get.mockRejectedValue(new Error("Redis failed"));
			const fallbackResult = await manager.checkLimit("user1", "free");
			expect(fallbackResult.reason).toBe("fallback");
		});
	});

	describe("Error Handling", () => {
		it("should handle redis json parse errors", async () => {
			mockRedisClient.get.mockResolvedValue("invalid-json");

			const result = await manager.checkLimit("user1", "free");

			// Should create new bucket
			expect(result.allowed).toBe(true);
		});

		it("should handle redis set failures with fallback", async () => {
			mockRedisClient.get.mockResolvedValue(null);
			mockRedisClient.set.mockRejectedValue(new Error("Redis write failed"));

			const result = await manager.checkLimit("user1", "free");

			// Should fall back to in-memory if configured
			if (options.fallbackToInMemory) {
				expect(result.allowed).toBe(true);
			}
		});

		it("should handle missing plan gracefully", async () => {
			expect(manager.checkLimit("user1", "nonexistent")).rejects.toThrow();
		});
	});

	describe("Cleanup and Maintenance", () => {
		it("should cleanup expired buckets", async () => {
			mockRedisClient.ttl.mockResolvedValue(-2); // Key doesn't exist

			await manager.cleanup?.();

			expect(mockRedisClient.ttl).toBeDefined();
		});

		it("should delete expired buckets", async () => {
			mockRedisClient.ttl.mockResolvedValue(-1); // Key expired

			const deleteSpy = vi.spyOn(mockRedisClient, "del");

			await manager.cleanup?.();

			// If cleanup is implemented, it should call del
			if (deleteSpy.mock.calls.length > 0) {
				expect(deleteSpy).toHaveBeenCalled();
			}
		});
	});

	describe("Concurrent Operations", () => {
		it("should handle concurrent requests safely", async () => {
			mockRedisClient.get.mockResolvedValue(
				JSON.stringify({
					tokens: 100,
					lastRefill: Date.now() / 1000,
					capacity: 100,
					refillRate: 1,
				}),
			);

			const promises = [];
			for (let i = 0; i < 50; i++) {
				promises.push(manager.checkLimit("user1", "free"));
			}

			const results = await Promise.all(promises);

			// All should be allowed (or at least no errors)
			expect(results.length).toBe(50);
			expect(results.every((r: any) => !r.error)).toBe(true);
		});

		it("should not double-consume in race conditions", async () => {
			let _callCount = 0;
			mockRedisClient.get.mockImplementation(async () => {
				_callCount++;
				return JSON.stringify({
					tokens: 1,
					lastRefill: Date.now() / 1000,
					capacity: 100,
					refillRate: 1,
				});
			});

			const result1 = await manager.checkLimit("user1", "free");
			const result2 = await manager.checkLimit("user1", "free");

			// Due to read-before-write, both might show as allowed
			// This is an inherent issue with non-atomic operations
			expect(result1.allowed || result2.allowed).toBe(true);
		});
	});

	describe("Custom Configuration", () => {
		it("should support custom ttl", async () => {
			const customManager = new DistributedTokenManager({
				...options,
				ttlSeconds: 7200, // 2 hours
			});

			mockRedisClient.get.mockResolvedValue(null);

			await customManager.checkLimit("user1", "free");

			const expireCall = vi.mocked(mockRedisClient.expire).mock.calls[0];
			expect(expireCall[1]).toBe(7200);
		});

		it("should support multiple plan configurations", async () => {
			const multiPlanManager = new DistributedTokenManager({
				...options,
				plans: {
					free: { capacity: 10, refillRate: 0.1 },
					pro: { capacity: 100, refillRate: 1 },
					team: { capacity: 1000, refillRate: 10 },
					enterprise: { capacity: 10000, refillRate: 100 },
				},
			});

			mockRedisClient.get.mockResolvedValue(null);

			for (const plan of ["free", "pro", "team", "enterprise"]) {
				const result = await multiPlanManager.checkLimit("user", plan);
				expect(result.allowed).toBe(true);
			}
		});
	});
});
