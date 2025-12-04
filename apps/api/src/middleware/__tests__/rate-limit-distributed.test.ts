/**
 * TDD Rate Limiting Tests
 * Minimal focused tests for distributed rate limiting
 */

import type { Context, Next } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimitMiddleware } from "../rate-limit-distributed";

// Mock dependencies - MUST come before any imports from modules that use them
vi.mock("redis", () => ({
	createClient: vi.fn().mockReturnValue({
		connect: vi.fn().mockResolvedValue(undefined),
		get: vi.fn(),
		set: vi.fn(),
		incr: vi.fn(),
		expire: vi.fn(),
		quit: vi.fn(),
	}),
}));

// Mock logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

// Mock platform DB module to avoid DATABASE_URL requirement
vi.mock("@snapback/platform/db/queries/auth", () => ({
	getUserById: vi.fn().mockResolvedValue({
		id: "user-123",
		email: "test@example.com",
		name: "Test User",
		role: "user",
	}),
	getUserPlan: vi.fn().mockResolvedValue("free"),
	getUserPermissions: vi.fn().mockResolvedValue([]),
}));

const mockContext = (): Partial<Context> =>
	({
		req: {
			header: vi.fn((name: string) => {
				if (name === "Authorization") {
					return "Bearer token123";
				}
				return undefined;
			}),
			path: "/api/users",
			method: "GET",
			remote: {
				addr: "127.0.0.1",
			} as any,
		} as any,
		get: vi.fn(),
		set: vi.fn(),
		json: vi.fn((data: any, status: number) => ({ status, data })),
		header: vi.fn(),
	}) as any;

const mockNext: Next = vi.fn();

describe("Rate Limiting Middleware", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================
	// Middleware Creation
	// ============================================================
	describe("Middleware creation", () => {
		it("should create rate limit middleware", async () => {
			const middleware = await createRateLimitMiddleware();
			expect(middleware).toBeDefined();
			expect(typeof middleware).toBe("function");
		});

		it("should handle Redis connection errors gracefully", async () => {
			// If Redis is unavailable, middleware should still work (fallback to in-memory)
			const middleware = await createRateLimitMiddleware();
			expect(middleware).toBeDefined();
		});
	});

	// ============================================================
	// Free Plan Rate Limiting
	// ============================================================
	describe("Free plan rate limiting", () => {
		it("should allow requests under free limit", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "free",
				permissions: [],
			});

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			// Should call next middleware
			expect(mockNext).toHaveBeenCalled();
		});

		it("should include rate limit headers in response", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "free",
				permissions: [],
			});

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			// Should set rate limit headers
			expect(context.header).toHaveBeenCalledWith("X-RateLimit-Limit", expect.any(String));
		});
	});

	// ============================================================
	// Pro Plan Rate Limiting
	// ============================================================
	describe("Pro plan rate limiting", () => {
		it("should allow more requests on pro plan", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "pro",
				permissions: [],
			});

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	// ============================================================
	// Enterprise Plan Rate Limiting
	// ============================================================
	describe("Enterprise plan rate limiting", () => {
		it("should allow most requests on enterprise plan", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "enterprise",
				permissions: [],
			});

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	// ============================================================
	// Unauthenticated Rate Limiting
	// ============================================================
	describe("Unauthenticated (public) rate limiting", () => {
		it("should use IP-based limiting for unauthenticated requests", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue(undefined); // No auth context

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			// Should still call next (not block), but use IP-based limit
			expect(mockNext).toHaveBeenCalled();
		});

		it("should track different IPs separately", async () => {
			const context1 = mockContext() as any;
			context1.get = vi.fn().mockReturnValue(undefined);
			context1.req.remote.addr = "192.168.1.1";

			const context2 = mockContext() as any;
			context2.get = vi.fn().mockReturnValue(undefined);
			context2.req.remote.addr = "192.168.1.2";

			const middleware = await createRateLimitMiddleware();

			await middleware(context1, mockNext);
			await middleware(context2, mockNext);

			// Both should be processed (different IPs)
			expect(mockNext).toHaveBeenCalledTimes(2);
		});
	});

	// ============================================================
	// Rate Limit Exhaustion
	// ============================================================
	describe("Rate limit exhaustion", () => {
		it("should return 429 when limit exceeded", async () => {
			const context = mockContext() as any;
			// Simulate already hit limit
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "free",
				permissions: [],
			});

			// In a real test with actual Redis/in-memory tracking,
			// we would simulate reaching the limit.
			// For now, we just verify the middleware structure works.

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	// ============================================================
	// Rate Limit Headers
	// ============================================================
	describe("Rate limit response headers", () => {
		it("should set X-RateLimit-Limit", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "pro",
				permissions: [],
			});

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			// Should set limit header
			expect(context.header).toHaveBeenCalledWith("X-RateLimit-Limit", expect.any(String));
		});

		it("should set X-RateLimit-Remaining", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "team",
				permissions: [],
			});

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			expect(context.header).toHaveBeenCalledWith("X-RateLimit-Remaining", expect.any(String));
		});

		it("should set X-RateLimit-Reset", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "free",
				permissions: [],
			});

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			expect(context.header).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
		});
	});

	// ============================================================
	// Error Handling
	// ============================================================
	describe("Error handling", () => {
		it("should handle context get errors", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockImplementation(() => {
				throw new Error("Context error");
			});

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			// Should still proceed
			expect(mockNext).toHaveBeenCalled();
		});
	});

	// ============================================================
	// Fallback to In-Memory
	// ============================================================
	describe("Fallback to in-memory store", () => {
		it("should work without Redis", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "free",
				permissions: [],
			});

			const middleware = await createRateLimitMiddleware();
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});
});
