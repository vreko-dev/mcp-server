/**
 * TDD Unified Auth Middleware Tests
 * Minimal focused tests for authentication flows
 */

import type { Context, Next } from "hono";
import { jwtVerify } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractAuthContext, requireAuth, requirePermission, requireRole } from "../auth-unified";

// Mock dependencies
vi.mock("jose", () => ({
	jwtVerify: vi.fn(),
}));

vi.mock("@snapback/infrastructure", () => ({
	logger: {
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

vi.mock("@snapback/platform/db/queries/auth", () => ({
	getUserById: vi.fn(),
	getApiKeyByPrefix: vi.fn(),
	getUserPlan: vi.fn(),
	getUserPermissions: vi.fn(),
	getUserOrgIds: vi.fn(),
	updateApiKeyLastUsed: vi.fn(),
}));

// Mock Context and Next
const mockContext = (): Partial<Context> =>
	({
		req: {
			header: vi.fn((name: string) => {
				const headers: Record<string, string | undefined> = {
					Authorization: "Bearer token123",
					"X-API-Key": "sk_live_abc",
				};
				return headers[name];
			}),
			path: "/api/users",
			method: "GET",
		} as any,
		get: vi.fn(),
		set: vi.fn(),
		json: vi.fn((data: any, status: number) => ({ status, data })),
	}) as any;

const mockNext: Next = vi.fn();

describe("Auth Middleware - Unified", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================
	// extractAuthContext
	// ============================================================
	describe("extractAuthContext", () => {
		it("should extract JWT token from Authorization header", async () => {
			const mockJwtPayload = { sub: "user-123", email: "test@example.com" };

			vi.mocked(jwtVerify).mockResolvedValue({
				payload: mockJwtPayload,
			} as any);

			const context = mockContext() as any;
			await extractAuthContext(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should extract API key from X-API-Key header", async () => {
			const context = mockContext() as any;
			context.req.header = vi.fn((name: string) => {
				if (name === "X-API-Key") {
					return "sk_live_abc";
				}
				if (name === "Authorization") {
					return undefined;
				}
				return undefined;
			});

			await extractAuthContext(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should continue without auth context if no credentials", async () => {
			const context = mockContext() as any;
			context.req.header = vi.fn().mockReturnValue(undefined);

			await extractAuthContext(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(context.set).not.toHaveBeenCalledWith("auth", expect.anything());
		});

		it("should handle JWT verification errors gracefully", async () => {
			vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid JWT"));

			const context = mockContext() as any;
			await extractAuthContext(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	// ============================================================
	// requireAuth
	// ============================================================
	describe("requireAuth", () => {
		it("should allow request with auth context", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", email: "test@example.com", role: "user", name: "Test" },
				plan: "pro",
				permissions: ["snapshot:create"],
			});

			await requireAuth(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should return 401 without auth context", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue(undefined);

			await requireAuth(context, mockNext);

			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({
					code: "unauthenticated",
				}),
				401,
			);
			expect(mockNext).not.toHaveBeenCalled();
		});
	});

	// ============================================================
	// requireRole
	// ============================================================
	describe("requireRole", () => {
		it("should allow request with correct role", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "admin", email: "admin@example.com", name: "Admin" },
				plan: "enterprise",
				permissions: ["admin:*"],
			});

			const middleware = requireRole("admin");
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should deny request with insufficient role", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "free",
				permissions: [],
			});

			const middleware = requireRole("admin");
			await middleware(context, mockNext);

			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({
					code: "forbidden",
				}),
				403,
			);
		});

		it("should return 401 if not authenticated", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue(undefined);

			const middleware = requireRole("admin");
			await middleware(context, mockNext);

			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({
					code: "unauthenticated",
				}),
				401,
			);
		});
	});

	// ============================================================
	// requirePermission
	// ============================================================
	describe("requirePermission", () => {
		it("should allow request with required permission", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "pro",
				permissions: ["snapshot:create", "snapshot:read"],
			});

			const middleware = requirePermission("snapshot:create");
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should deny request without required permission", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "free",
				permissions: ["snapshot:view"],
			});

			const middleware = requirePermission("admin:write");
			await middleware(context, mockNext);

			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({
					code: "forbidden",
				}),
				403,
			);
		});

		it("should support wildcard permissions", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "enterprise",
				permissions: ["snapshot:*"],
			});

			const middleware = requirePermission("snapshot:create");
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should support admin wildcard", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "admin", email: "admin@example.com", name: "Admin" },
				plan: "enterprise",
				permissions: ["*"],
			});

			const middleware = requirePermission("any:permission");
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should return 401 if not authenticated", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue(undefined);

			const middleware = requirePermission("snapshot:create");
			await middleware(context, mockNext);

			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({
					code: "unauthenticated",
				}),
				401,
			);
		});
	});

	// ============================================================
	// Plan-based access (via permissions)
	// ============================================================
	describe("Plan-based access control", () => {
		it("should grant free plan permissions", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "free",
				permissions: ["snapshot:create:5/day"],
			});

			const middleware = requirePermission("snapshot:create:5/day");
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should grant pro plan permissions", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "pro",
				permissions: ["snapshot:*", "api:webhooks"],
			});

			const middleware = requirePermission("api:webhooks");
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should grant enterprise plan permissions", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockReturnValue({
				user: { id: "user-123", role: "user", email: "user@example.com", name: "User" },
				plan: "enterprise",
				permissions: ["sso:enabled", "audit:enabled"],
			});

			const middleware = requirePermission("sso:enabled");
			await middleware(context, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	// ============================================================
	// Error handling
	// ============================================================
	describe("Error handling", () => {
		it("should handle context get errors", async () => {
			const context = mockContext() as any;
			context.get = vi.fn().mockImplementation(() => {
				throw new Error("Context error");
			});

			await extractAuthContext(context, mockNext);

			// Should still call next
			expect(mockNext).toHaveBeenCalled();
		});
	});
});
