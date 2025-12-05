import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RedisClientType } from "redis";

// Mock redis module
const mockConnect = vi.fn();
const mockQuit = vi.fn();
const mockOn = vi.fn();

const mockRedisClient = {
	connect: mockConnect,
	quit: mockQuit,
	on: mockOn,
} as unknown as RedisClientType;

vi.mock("redis", () => ({
	createClient: vi.fn(() => mockRedisClient),
}));

// Mock logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("Redis Client", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(async () => {
		// Save original env
		originalEnv = process.env;
		process.env = { ...originalEnv };

		// Reset mocks
		vi.clearAllMocks();

		// Reset module state
		vi.resetModules();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("getRedisClient", () => {
		it("should create and connect to Redis with valid URL", async () => {
			process.env.REDIS_URL = "redis://default:password@localhost:6379";

			const { getRedisClient } = await import("../redis-client.js");

			mockConnect.mockResolvedValueOnce(undefined);

			const client = await getRedisClient();

			expect(client).toBe(mockRedisClient);
			expect(mockConnect).toHaveBeenCalledOnce();
			expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
		});

		it("should reuse existing client on subsequent calls", async () => {
			process.env.REDIS_URL = "redis://default:password@localhost:6379";

			const { getRedisClient } = await import("../redis-client.js");

			mockConnect.mockResolvedValue(undefined);

			const client1 = await getRedisClient();
			const client2 = await getRedisClient();

			expect(client1).toBe(client2);
			expect(mockConnect).toHaveBeenCalledOnce(); // Only once for singleton
		});

		it("should throw error if REDIS_URL is not set", async () => {
			delete process.env.REDIS_URL;

			const { getRedisClient } = await import("../redis-client.js");

			await expect(getRedisClient()).rejects.toThrow(
				"REDIS_URL environment variable is not set",
			);
		});

		it("should parse Redis URL correctly", async () => {
			const testUrl = "redis://testuser:testpass@redis.example.com:6380";
			process.env.REDIS_URL = testUrl;

			const { createClient } = await import("redis");
			const { getRedisClient } = await import("../redis-client.js");

			mockConnect.mockResolvedValueOnce(undefined);

			await getRedisClient();

			expect(createClient).toHaveBeenCalledWith({
				username: "testuser",
				password: "testpass",
				socket: {
					host: "redis.example.com",
					port: 6380,
				},
			});
		});

		it("should use 'default' username if not provided in URL", async () => {
			process.env.REDIS_URL = "redis://:password@localhost:6379";

			const { createClient } = await import("redis");
			const { getRedisClient } = await import("../redis-client.js");

			mockConnect.mockResolvedValueOnce(undefined);

			await getRedisClient();

			expect(createClient).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "default",
				}),
			);
		});

		it("should log error event from Redis client", async () => {
			process.env.REDIS_URL = "redis://default:password@localhost:6379";

			const { logger } = await import("@snapback/infrastructure");
			const { getRedisClient } = await import("../redis-client.js");

			mockConnect.mockResolvedValueOnce(undefined);

			await getRedisClient();

			// Simulate error event
			const errorHandler = mockOn.mock.calls.find(
				(call) => call[0] === "error",
			)?.[1];
			expect(errorHandler).toBeDefined();

			const testError = new Error("Connection lost");
			errorHandler?.(testError);

			expect(logger.error).toHaveBeenCalledWith(
				"Redis Client Error:",
				testError,
			);
		});
	});

	describe("initializeRedisClient", () => {
		it("should initialize Redis successfully", async () => {
			process.env.REDIS_URL = "redis://default:password@localhost:6379";

			const { logger } = await import("@snapback/infrastructure");
			const { initializeRedisClient } = await import("../redis-client.js");

			mockConnect.mockResolvedValueOnce(undefined);

			await initializeRedisClient();

			expect(mockConnect).toHaveBeenCalledOnce();
			expect(logger.info).toHaveBeenCalledWith(
				"✅ Redis client initialized successfully",
			);
		});

		it("should warn and return early if REDIS_URL not set", async () => {
			delete process.env.REDIS_URL;

			const { logger } = await import("@snapback/infrastructure");
			const { initializeRedisClient } = await import("../redis-client.js");

			await initializeRedisClient();

			expect(logger.warn).toHaveBeenCalledWith(
				"REDIS_URL not configured - rate limiting will use in-memory fallback",
			);
			expect(mockConnect).not.toHaveBeenCalled();
		});

		it("should log error but not throw on connection failure", async () => {
			process.env.REDIS_URL = "redis://default:password@localhost:6379";

			const { logger } = await import("@snapback/infrastructure");
			const { initializeRedisClient } = await import("../redis-client.js");

			const connectionError = new Error("ECONNREFUSED");
			mockConnect.mockRejectedValueOnce(connectionError);

			// Should not throw
			await expect(initializeRedisClient()).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledWith(
				"Failed to initialize Redis client",
				{
					error: "ECONNREFUSED",
				},
			);
		});
	});

	describe("closeRedisClient", () => {
		it("should close Redis client gracefully", async () => {
			process.env.REDIS_URL = "redis://default:password@localhost:6379";

			const { logger } = await import("@snapback/infrastructure");
			const { getRedisClient, closeRedisClient } = await import(
				"../redis-client.js"
			);

			mockConnect.mockResolvedValueOnce(undefined);
			mockQuit.mockResolvedValueOnce(undefined);

			await getRedisClient();
			await closeRedisClient();

			expect(mockQuit).toHaveBeenCalledOnce();
			expect(logger.info).toHaveBeenCalledWith("Redis client closed");
		});

		it("should handle close errors gracefully", async () => {
			process.env.REDIS_URL = "redis://default:password@localhost:6379";

			const { logger } = await import("@snapback/infrastructure");
			const { getRedisClient, closeRedisClient } = await import(
				"../redis-client.js"
			);

			mockConnect.mockResolvedValueOnce(undefined);
			const closeError = new Error("Already closed");
			mockQuit.mockRejectedValueOnce(closeError);

			await getRedisClient();
			await closeRedisClient();

			expect(logger.error).toHaveBeenCalledWith(
				"Error closing Redis client",
				{
					error: "Already closed",
				},
			);
		});

		it("should do nothing if client was never initialized", async () => {
			const { logger } = await import("@snapback/infrastructure");
			const { closeRedisClient } = await import("../redis-client.js");

			await closeRedisClient();

			expect(mockQuit).not.toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalledWith("Redis client closed");
		});
	});

	describe("Integration with rate limiting", () => {
		it("should support rate limiting fallback when Redis unavailable", async () => {
			// This test verifies the contract for rate limiting middleware
			delete process.env.REDIS_URL;

			const { initializeRedisClient } = await import("../redis-client.js");

			// Should not throw - allows in-memory fallback
			await expect(initializeRedisClient()).resolves.toBeUndefined();
		});
	});
});
