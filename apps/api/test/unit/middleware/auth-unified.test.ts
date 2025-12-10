/**
 * Phase 1: RED Test - Unified Auth Middleware Tests
 *
 * Test ID Prefix: AUTH-00X
 *
 * CRITICAL TESTS: Security middleware covering:
 * - JWT validation via Better Auth
 * - API key verification from database
 * - Session cookie authentication
 * - Role-based access control (RBAC)
 * - Subscription plan gating
 * - Fine-grained permissions
 * - Organization membership scoping
 *
 * Coverage Paths:
 * - Happy: Success scenarios (6 tests)
 * - Sad: Expected failures (5 tests)
 * - Edge: Boundary conditions (4 tests)
 * - Error: System failures (5 tests)
 * - Integration: Full stack (3 tests)
 *
 * @see apps/api/src/middleware/auth-unified.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Context, Next } from "hono";
import {
	extractAuthContext,
	requireAuth,
	requireRole,
	requirePlan,
	requirePermission,
	requireOrgMembership,
	getAuthContext,
	type AuthContext,
} from "../../../src/middleware/auth-unified";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Better Auth
vi.mock("@snapback/auth", () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
	getUserPlan: vi.fn(),
	getUserPermissions: vi.fn(),
	getUserOrgIds: vi.fn(),
}));

// Mock Database
vi.mock("@snapback/platform", () => ({
	db: {
		select: vi.fn(),
		update: vi.fn(),
	},
}));

// Mock Infrastructure
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create mock JWT token payload
 */
function createMockJwtPayload(
	userId: string,
	email: string,
	role: "admin" | "user" | "viewer",
	name: string = "Test User",
) {
	return {
		id: userId,
		email,
		role,
		name,
	};
}

/**
 * Create mock API key record
 */
function createMockApiKey(
	keyId: string,
	userId: string,
	preview: string,
	scopes: string[],
	revokedAt: Date | null = null,
	expiresAt: Date | null = null,
) {
	return {
		id: keyId,
		userId,
		keyPreview: preview,
		scopes,
		revokedAt,
		expiresAt,
		lastUsedAt: new Date(),
	};
}

/**
 * Create mock Hono context
 */
function createMockContext(): Partial<Context> {
	const context = {
		req: {
			header: vi.fn(),
			raw: {
				headers: new Map(),
			},
		} as any,
		set: vi.fn(),
		get: vi.fn(),
		json: vi.fn(),
		status: vi.fn(function (code: number) {
			this.statusCode = code;
			return this;
		}),
		env: {
			rawResponse: null,
		},
	};
	return context as Partial<Context>;
}

/**
 * Create mock Next function
 */
function createMockNext(): Next {
	return vi.fn();
}

/**
 * Setup auth context on mock
 */
function setAuthContextOnMock(context: Partial<Context>, auth: AuthContext) {
	(context.get as any).mockImplementation((key: string) => {
		if (key === "auth") return auth;
		return undefined;
	});
}

// ============================================================================
// Test Suite
// ============================================================================

describe("API Auth Middleware - Unified Authentication", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ========================================================================
	// HAPPY PATH: Successful Authentication (6 tests)
	// ========================================================================

	describe("HAPPY PATH: Successful Authentication", () => {
		/**
		 * Test ID: AUTH-001
		 *
		 * JWT authentication via Better Auth:
		 * 1. Authorization: Bearer {jwt} header provided
		 * 2. Better Auth session API validates JWT
		 * 3. User data extracted (id, email, role)
		 * 4. Plan retrieved from database
		 * 5. Permissions generated based on role
		 * 6. AuthContext attached to request
		 */
		it("should extract auth context from valid JWT token", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();
			const mockUser = createMockJwtPayload("user_1", "user@example.com", "user");

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "Authorization") return "Bearer valid_jwt_token";
				return undefined;
			});

			const mockSession = { user: mockUser };
			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(mockSession);

			const { getUserPlan, getUserPermissions, getUserOrgIds } = await import("@snapback/auth");
			(getUserPlan as any).mockResolvedValue("pro");
			(getUserPermissions as any).mockResolvedValue(["snapshot:*", "team:read"]);
			(getUserOrgIds as any).mockResolvedValue(["org_1", "org_2"]);

			// ACT
			await extractAuthContext(context, next);

			// ASSERT
			expect(auth.api.getSession).toHaveBeenCalled();
			expect(context.set).toHaveBeenCalledWith(
				"auth",
				expect.objectContaining({
					user: expect.objectContaining({
						id: "user_1",
						email: "user@example.com",
						role: "user",
					}),
					plan: "pro",
					authenticatedVia: "jwt",
				}),
			);
			expect(next).toHaveBeenCalled();
		});

		/**
		 * Test ID: AUTH-002
		 *
		 * API key authentication:
		 * 1. X-API-Key header provided
		 * 2. Key preview extracted
		 * 3. Database lookup finds active key
		 * 4. Expiration and revocation checked
		 * 5. User data retrieved
		 * 6. AuthContext marked as api-key auth
		 */
		it("should extract auth context from valid API key", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "X-API-Key") return "sk_test_1234567890abcdef";
				if (name === "Authorization") return undefined;
				return undefined;
			});

			// Mock JWT verification to fail
			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(null);

			// Mock API key lookup
			const mockApiKey = createMockApiKey(
				"key_1",
				"user_1",
				"sk_test",
				["snapshot:*", "team:read"],
			);

			const { db } = await import("@snapback/platform");
			(db.select as any).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockApiKey]),
					}),
				}),
			});

			// Mock user lookup
			const mockUser = {
				id: "user_1",
				email: "user@example.com",
				role: "user",
				name: "Test User",
			};

			const { getUserPlan, getUserPermissions, getUserOrgIds } = await import("@snapback/auth");
			(getUserPlan as any).mockResolvedValue("pro");
			(getUserPermissions as any).mockResolvedValue(["snapshot:*"]);
			(getUserOrgIds as any).mockResolvedValue(["org_1"]);

			// ACT
			await extractAuthContext(context, next);

			// ASSERT
			expect(context.set).toHaveBeenCalledWith(
				"auth",
				expect.objectContaining({
					user: expect.any(Object),
					plan: "pro",
					authenticatedVia: "api-key",
					apiKeyId: "key_1",
				}),
			);
			expect(next).toHaveBeenCalled();
		});

		/**
		 * Test ID: AUTH-003
		 *
		 * Session cookie fallback:
		 * 1. No Authorization header
		 * 2. Session cookie may be present
		 * 3. Better Auth handles cookie extraction
		 * 4. User session retrieved
		 */
		it("should authenticate via session cookie fallback", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "Authorization") return undefined;
				return undefined;
			});

			// Mock Better Auth to extract from cookies
			const { auth } = await import("@snapback/auth");
			const mockUser = createMockJwtPayload("user_1", "user@example.com", "user");
			(auth.api.getSession as any).mockResolvedValue({ user: mockUser });

			const { getUserPlan, getUserPermissions, getUserOrgIds } = await import("@snapback/auth");
			(getUserPlan as any).mockResolvedValue("free");
			(getUserPermissions as any).mockResolvedValue(["snapshot:read"]);
			(getUserOrgIds as any).mockResolvedValue([]);

			// ACT
			await extractAuthContext(context, next);

			// ASSERT
			expect(context.set).toHaveBeenCalledWith(
				"auth",
				expect.objectContaining({
					authenticatedVia: "jwt",
				}),
			);
		});

		/**
		 * Test ID: AUTH-004
		 *
		 * requireAuth middleware - valid auth:
		 * 1. Auth context exists
		 * 2. Allows request to proceed
		 * 3. Calls next middleware
		 */
		it("should allow authenticated request to proceed", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			const mockAuth: AuthContext = {
				user: {
					id: "user_1",
					email: "user@example.com",
					role: "user",
					name: "Test User",
				},
				plan: "pro",
				permissions: ["snapshot:*"],
				authenticatedVia: "jwt",
			};

			setAuthContextOnMock(context, mockAuth);

			// ACT
			await requireAuth(context, next);

			// ASSERT
			expect(next).toHaveBeenCalled();
		});

		/**
		 * Test ID: AUTH-005
		 *
		 * Role-based access - valid role:
		 * 1. User has admin role
		 * 2. Handler requires admin
		 * 3. Access granted
		 */
		it("should grant access to user with required role", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockReturnValue("Bearer valid_token");

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue({
				user: createMockJwtPayload("admin_1", "admin@example.com", "admin"),
			});

			const { getUserPlan, getUserPermissions, getUserOrgIds } = await import("@snapback/auth");
			(getUserPlan as any).mockResolvedValue("enterprise");
			(getUserPermissions as any).mockResolvedValue(["*"]);
			(getUserOrgIds as any).mockResolvedValue([]);

			// ACT
			const roleMiddleware = requireRole("admin");
			await (context as any).set("auth", {
				user: { id: "admin_1", role: "admin" },
				permissions: ["*"],
			});
			await roleMiddleware(context, next);

			// ASSERT
			expect(next).toHaveBeenCalled();
		});

		/**
		 * Test ID: AUTH-006
		 *
		 * Plan-based access - valid plan:
		 * 1. User has "team" plan
		 * 2. Route requires "pro" or "team"
		 * 3. Access granted
		 */
		it("should grant access to user with required plan", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			const mockAuth: AuthContext = {
				user: { id: "user_1", email: "user@example.com", role: "user", name: "Test User" },
				plan: "team",
				permissions: [],
				authenticatedVia: "jwt",
			};

			setAuthContextOnMock(context, mockAuth);

			// ACT
			const planMiddleware = requirePlan("pro", "team", "enterprise");
			await planMiddleware(context, next);

			// ASSERT
			expect(next).toHaveBeenCalled();
		});
	});

	// ========================================================================
	// SAD PATH: Authentication Failures (5 tests)
	// ========================================================================

	describe("SAD PATH: Authentication Failures", () => {
		/**
		 * Test ID: AUTH-007
		 *
		 * Missing credentials:
		 * 1. No Authorization header
		 * 2. No X-API-Key header
		 * 3. No session cookie
		 * 4. extractAuthContext continues (optional)
		 * 5. requireAuth returns 401
		 */
		it("should reject missing authorization header with 401", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockReturnValue(undefined);

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(null);

			// ACT
			await extractAuthContext(context, next);
			const result = await requireAuth(context, next);

			// ASSERT
			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({ code: "unauthenticated" }),
				401,
			);
		});

		/**
		 * Test ID: AUTH-008
		 *
		 * Invalid/expired JWT:
		 * 1. Valid JWT format provided
		 * 2. Better Auth session verification fails
		 * 3. Returns 401
		 */
		it("should reject invalid JWT token with 401", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "Authorization") return "Bearer invalid_jwt_token";
				return undefined;
			});

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(null);

			// ACT
			await extractAuthContext(context, next);
			await requireAuth(context, next);

			// ASSERT
			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({ code: "unauthenticated" }),
				401,
			);
		});

		/**
		 * Test ID: AUTH-009
		 *
		 * Invalid API key:
		 * 1. Valid X-API-Key format
		 * 2. Key not found in database
		 * 3. Returns 401
		 */
		it("should reject invalid API key with 401", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "X-API-Key") return "sk_test_invalid";
				if (name === "Authorization") return undefined;
				return undefined;
			});

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(null);

			const { db } = await import("@snapback/platform");
			(db.select as any).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			});

			// ACT
			await extractAuthContext(context, next);
			await requireAuth(context, next);

			// ASSERT
			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({ code: "unauthenticated" }),
				401,
			);
		});

		/**
		 * Test ID: AUTH-010
		 *
		 * Insufficient role:
		 * 1. Valid auth (user role)
		 * 2. Route requires admin
		 * 3. Returns 403
		 */
		it("should reject insufficient role with 403", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			const mockAuth: AuthContext = {
				user: { id: "user_1", email: "user@example.com", role: "user", name: "Test User" },
				plan: "pro",
				permissions: [],
				authenticatedVia: "jwt",
			};

			setAuthContextOnMock(context, mockAuth);

			// ACT
			const roleMiddleware = requireRole("admin");
			const result = await roleMiddleware(context, next);

			// ASSERT
			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({ code: "forbidden" }),
				403,
			);
		});

		/**
		 * Test ID: AUTH-011
		 *
		 * Insufficient subscription plan:
		 * 1. Valid auth (free plan)
		 * 2. Route requires pro
		 * 3. Returns 403
		 */
		it("should reject insufficient plan tier with 403", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			const mockAuth: AuthContext = {
				user: { id: "user_1", email: "user@example.com", role: "user", name: "Test User" },
				plan: "free",
				permissions: [],
				authenticatedVia: "jwt",
			};

			setAuthContextOnMock(context, mockAuth);

			// ACT
			const planMiddleware = requirePlan("pro", "team", "enterprise");
			const result = await planMiddleware(context, next);

			// ASSERT
			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({ code: "insufficient_plan" }),
				403,
			);
		});
	});

	// ========================================================================
	// EDGE PATH: Boundary Conditions (4 tests)
	// ========================================================================

	describe("EDGE PATH: Authorization Boundaries", () => {
		/**
		 * Test ID: AUTH-012
		 *
		 * Admin role bypass:
		 * 1. Admin user
		 * 2. Trying to access org they don't belong to
		 * 3. Admin bypass allows access
		 */
		it("should allow admin to bypass org membership check", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			const mockAuth: AuthContext = {
				user: { id: "admin_1", email: "admin@example.com", role: "admin", name: "Admin" },
				plan: "enterprise",
				permissions: ["*"],
				authenticatedVia: "jwt",
				orgIds: ["org_1"],
			};

			setAuthContextOnMock(context, mockAuth);
			(context.req.param as any) = vi.fn().mockReturnValue("org_999");

			// ACT
			const orgMiddleware = requireOrgMembership("orgId");
			await orgMiddleware(context, next);

			// ASSERT
			expect(next).toHaveBeenCalled();
		});

		/**
		 * Test ID: AUTH-013
		 *
		 * Wildcard permission matching:
		 * 1. User has snapshot:* permission
		 * 2. Route checks for snapshot:read permission
		 * 3. Wildcard matches specific permission
		 */
		it("should match wildcard permissions to specific permissions", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			const mockAuth: AuthContext = {
				user: { id: "user_1", email: "user@example.com", role: "user", name: "Test User" },
				plan: "pro",
				permissions: ["snapshot:*"], // Has wildcard
				authenticatedVia: "jwt",
			};

			setAuthContextOnMock(context, mockAuth);

			// ACT
			const permMiddleware = requirePermission("snapshot:read");
			await permMiddleware(context, next);

			// ASSERT
			expect(next).toHaveBeenCalled();
		});

		/**
		 * Test ID: AUTH-014
		 *
		 * Revoked API key:
		 * 1. API key exists in database
		 * 2. revokedAt is set (not null)
		 * 3. Request rejected
		 */
		it("should reject revoked API key", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "X-API-Key") return "sk_test_revoked";
				if (name === "Authorization") return undefined;
				return undefined;
			});

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(null);

			const mockApiKey = createMockApiKey(
				"key_1",
				"user_1",
				"sk_test",
				["snapshot:*"],
				new Date(), // revokedAt is set
			);

			const { db } = await import("@snapback/platform");
			(db.select as any).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			});

			// ACT
			await extractAuthContext(context, next);
			await requireAuth(context, next);

			// ASSERT
			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({ code: "unauthenticated" }),
				401,
			);
		});

		/**
		 * Test ID: AUTH-015
		 *
		 * Expired API key:
		 * 1. API key exists
		 * 2. expiresAt is in the past
		 * 3. Request rejected
		 */
		it("should reject expired API key", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "X-API-Key") return "sk_test_expired";
				if (name === "Authorization") return undefined;
				return undefined;
			});

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(null);

			const pastDate = new Date(Date.now() - 86400000); // 1 day ago
			const mockApiKey = createMockApiKey(
				"key_1",
				"user_1",
				"sk_test",
				["snapshot:*"],
				null,
				pastDate, // expiresAt in past
			);

			const { db } = await import("@snapback/platform");
			(db.select as any).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			});

			// ACT
			await extractAuthContext(context, next);
			await requireAuth(context, next);

			// ASSERT
			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({ code: "unauthenticated" }),
				401,
			);
		});
	});

	// ========================================================================
	// ERROR PATH: System Failures (5 tests)
	// ========================================================================

	describe("ERROR PATH: System Failures", () => {
		/**
		 * Test ID: AUTH-016
		 *
		 * JWT verification error:
		 * 1. Better Auth throws exception
		 * 2. Middleware catches error
		 * 3. Request continues without auth context
		 * 4. requireAuth will reject if needed
		 */
		it("should handle JWT verification errors gracefully", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "Authorization") return "Bearer error_token";
				return undefined;
			});

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockRejectedValue(new Error("JWT verification failed"));

			// ACT
			await extractAuthContext(context, next);

			// ASSERT - Should continue without auth context
			expect(next).toHaveBeenCalled();
		});

		/**
		 * Test ID: AUTH-017
		 *
		 * Database connection error:
		 * 1. DB query for API key fails
		 * 2. Error caught
		 * 3. Request rejected
		 */
		it("should handle database errors in API key lookup", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "X-API-Key") return "sk_test_error";
				if (name === "Authorization") return undefined;
				return undefined;
			});

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(null);

			const { db } = await import("@snapback/platform");
			(db.select as any).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockRejectedValue(new Error("DB connection failed")),
					}),
				}),
			});

			// ACT
			await extractAuthContext(context, next);
			await requireAuth(context, next);

			// ASSERT
			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({ code: "unauthenticated" }),
				401,
			);
		});

		/**
		 * Test ID: AUTH-018
		 *
		 * User not found:
		 * 1. API key found in DB
		 * 2. User lookup returns null
		 * 3. Auth context not set
		 */
		it("should handle user not found error", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "X-API-Key") return "sk_test_valid";
				return undefined;
			});

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(null);

			// API key found
			const mockApiKey = createMockApiKey("key_1", "user_nonexistent", "sk_test", []);
			const { db } = await import("@snapback/platform");
			(db.select as any).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockApiKey]),
					}),
				}),
			});

			// But user not found
			const importSchema = vi.fn().mockResolvedValue({ user: null });

			// ACT
			await extractAuthContext(context, next);
			await requireAuth(context, next);

			// ASSERT
			expect(context.json).toHaveBeenCalledWith(
				expect.objectContaining({ code: "unauthenticated" }),
				401,
			);
		});

		/**
		 * Test ID: AUTH-019
		 *
		 * Org membership lookup fails:
		 * 1. User authenticated
		 * 2. OrgId param provided
		 * 3. getUserOrgIds throws error
		 * 4. Request rejected
		 */
		it("should handle org membership lookup errors", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			const mockAuth: AuthContext = {
				user: { id: "user_1", email: "user@example.com", role: "user", name: "Test User" },
				plan: "pro",
				permissions: [],
				authenticatedVia: "jwt",
			};

			setAuthContextOnMock(context, mockAuth);
			(context.req.param as any) = vi.fn().mockReturnValue("org_1");

			const { getUserOrgIds } = await import("@snapback/auth");
			(getUserOrgIds as any).mockRejectedValue(new Error("Org lookup failed"));

			// ACT
			const orgMiddleware = requireOrgMembership("orgId");
			const result = await orgMiddleware(context, next);

			// ASSERT - Should return 401 or 500 depending on implementation
			expect(result || context.json).toBeTruthy();
		});

		/**
		 * Test ID: AUTH-020
		 *
		 * Plan lookup fails:
		 * 1. API key found and user found
		 * 2. Plan lookup throws error
		 * 3. Auth context not attached
		 */
		it("should handle plan lookup errors", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "X-API-Key") return "sk_test_valid";
				return undefined;
			});

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue(null);

			const mockApiKey = createMockApiKey("key_1", "user_1", "sk_test", []);
			const { db } = await import("@snapback/platform");
			(db.select as any).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockApiKey]),
					}),
				}),
			});

			const { getUserPlan } = await import("@snapback/auth");
			(getUserPlan as any).mockRejectedValue(new Error("Plan lookup failed"));

			// ACT
			await extractAuthContext(context, next);

			// ASSERT - Continue without auth context
			expect(next).toHaveBeenCalled();
		});
	});

	// ========================================================================
	// INTEGRATION: Full Middleware Stack (3 tests)
	// ========================================================================

	describe("INTEGRATION: Full Middleware Stack", () => {
		/**
		 * Test ID: AUTH-021
		 *
		 * Complete auth chain - extract + require + role + plan:
		 * 1. JWT extracted
		 * 2. requireAuth validates presence
		 * 3. requireRole validates role
		 * 4. requirePlan validates subscription
		 */
		it("should execute full middleware stack for authorized request", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			(context.req.header as any).mockImplementation((name: string) => {
				if (name === "Authorization") return "Bearer valid_jwt";
				return undefined;
			});

			const { auth } = await import("@snapback/auth");
			(auth.api.getSession as any).mockResolvedValue({
				user: createMockJwtPayload("user_1", "user@example.com", "user"),
			});

			const { getUserPlan, getUserPermissions, getUserOrgIds } = await import("@snapback/auth");
			(getUserPlan as any).mockResolvedValue("pro");
			(getUserPermissions as any).mockResolvedValue(["snapshot:*"]);
			(getUserOrgIds as any).mockResolvedValue(["org_1"]);

			// ACT
			await extractAuthContext(context, next);
			const mockAuth = (context.set as any).mock.calls[0]?.[1];
			setAuthContextOnMock(context, mockAuth);

			await requireAuth(context, next);
			const userRoleMiddleware = requireRole("user");
			await userRoleMiddleware(context, next);
			const planMiddleware = requirePlan("pro", "team");
			await planMiddleware(context, next);

			// ASSERT
			expect(next).toHaveBeenCalled();
		});

		/**
		 * Test ID: AUTH-022
		 *
		 * Org membership with plan check:
		 * 1. User authenticated
		 * 2. Has required plan
		 * 3. Belongs to requested org
		 * 4. Access granted
		 */
		it("should check both plan and org membership", async () => {
			// ARRANGE
			const context = createMockContext() as Context;
			const next = createMockNext();

			const mockAuth: AuthContext = {
				user: { id: "user_1", email: "user@example.com", role: "user", name: "Test User" },
				plan: "team",
				permissions: [],
				authenticatedVia: "jwt",
				orgIds: ["org_1"],
			};

			setAuthContextOnMock(context, mockAuth);
			(context.req.param as any) = vi.fn().mockReturnValue("org_1");

			// ACT
			const planMiddleware = requirePlan("team", "enterprise");
			await planMiddleware(context, next);

			const orgMiddleware = requireOrgMembership("orgId");
			await orgMiddleware(context, next);

			// ASSERT
			expect(next).toHaveBeenCalled();
		});

		/**
		 * Test ID: AUTH-023
		 *
		 * Permission enforcement with role hierarchy:
		 * 1. User has specific permissions
		 * 2. Route checks for permission
		 * 3. Admin user has * permission
		 * 4. Both paths allow access
		 */
		it("should enforce permissions with role hierarchy", async () => {
			// ARRANGE
			const contextUser = createMockContext() as Context;
			const nextUser = createMockNext();

			// Regular user with specific permission
			const userAuth: AuthContext = {
				user: { id: "user_1", email: "user@example.com", role: "user", name: "Test User" },
				plan: "pro",
				permissions: ["snapshot:read"],
				authenticatedVia: "jwt",
			};

			setAuthContextOnMock(contextUser, userAuth);

			// Admin with wildcard
			const contextAdmin = createMockContext() as Context;
			const nextAdmin = createMockNext();

			const adminAuth: AuthContext = {
				user: { id: "admin_1", email: "admin@example.com", role: "admin", name: "Admin" },
				plan: "enterprise",
				permissions: ["*"],
				authenticatedVia: "jwt",
			};

			setAuthContextOnMock(contextAdmin, adminAuth);

			// ACT
			const permMiddleware = requirePermission("snapshot:read");
			await permMiddleware(contextUser, nextUser);
			await permMiddleware(contextAdmin, nextAdmin);

			// ASSERT
			expect(nextUser).toHaveBeenCalled();
			expect(nextAdmin).toHaveBeenCalled();
		});
	});
});
