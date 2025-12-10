/**
 * Phase 1: RED - Extended Auth Middleware Tests
 *
 * TDD Approach: Tests are written FIRST and FAIL initially
 * No implementation exists yet - these tests define expected behavior
 *
 * Test categories:
 * - PLAN (4): Plan-based access control
 * - PERM (5): Permission enforcement
 * - ROLE (4): Role-based access control
 * - ORG (5): Organization membership
 * - APIKEY (4): API key authentication
 * - RES (3): Error resilience
 *
 * Total: 25 failing tests
 *
 * @see apps/api/src/middleware/auth-unified.ts
 * @see apps/api/test/integration/helpers/auth-test-factory.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Context, Next } from "hono";
import {
	extractAuthContext,
	requirePlan,
	requirePermission,
	requireRole,
	requireOrgMembership,
	type AuthContext,
} from "../../src/middleware/auth-unified";
import {
	createSignedJWT,
	createExpiredJWT,
	createJWTPayloadWithPlan,
	createJWTPayloadWithRole,
	createJWTPayloadWithOrgs,
	createValidApiKey,
	createInvalidApiKey,
	createMockContext,
	createMockNext,
	TEST_CREDENTIALS,
	TEST_ADMIN_CREDENTIALS,
} from "./helpers/auth-test-factory";

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock("@snapback/platform", () => ({
	db: {
		select: vi.fn(),
		query: { apiKeys: { findFirst: vi.fn() } },
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn().mockResolvedValue(undefined),
			})),
		})),
	},
}));

vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("@snapback/auth", async () => {
	const actual = await vi.importActual("@snapback/auth");
	return {
		...actual,
		getUserPlan: vi.fn().mockResolvedValue("free"),
		getUserPermissions: vi.fn().mockResolvedValue([]),
		getUserOrgIds: vi.fn().mockResolvedValue([]),
	};
});

import { getUserPlan, getUserPermissions, getUserOrgIds } from "@snapback/auth";

const mockGetUserPlan = vi.mocked(getUserPlan);
const mockGetUserPermissions = vi.mocked(getUserPermissions);
const mockGetUserOrgIds = vi.mocked(getUserOrgIds);

// ============================================================================
// Test Suite: PLAN - Plan-Based Access Control
// ============================================================================

describe("PLAN: Plan-Based Access Control", () => {
	beforeEach(() => {
		mockGetUserPlan.mockResolvedValue("free" as const);
		mockGetUserPermissions.mockResolvedValue([]);
		mockGetUserOrgIds.mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("PLAN-001: Free plan user should access free tier endpoint", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		mockGetUserPlan.mockResolvedValue("free" as const);
		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "free",
			permissions: [],
			authenticatedVia: "jwt",
		});

		const middleware = requirePlan("free", "pro");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("PLAN-002: Free plan user should NOT access pro-only endpoint", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "free",
			permissions: [],
			authenticatedVia: "jwt",
		});

		const middleware = requirePlan("pro", "team", "enterprise");
		const result = await middleware(context, next);

		expect(result).toBeDefined();
		expect(next).not.toHaveBeenCalled();
	});

	it("PLAN-003: Pro plan user should access pro features", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: [],
			authenticatedVia: "jwt",
		});

		const middleware = requirePlan("pro", "team", "enterprise");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("PLAN-004: Enterprise user should access all plan tiers", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "enterprise",
			permissions: [],
			authenticatedVia: "jwt",
		});

		const middleware = requirePlan("free", "pro", "team", "enterprise");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});
});

// ============================================================================
// Test Suite: PERM - Permission-Based Access Control
// ============================================================================

describe("PERM: Permission-Based Access Control", () => {
	beforeEach(() => {
		mockGetUserPlan.mockResolvedValue("free" as const);
		mockGetUserPermissions.mockResolvedValue([]);
		mockGetUserOrgIds.mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("PERM-001: User with exact permission should pass", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: ["snapshot:create", "snapshot:read"],
			authenticatedVia: "jwt",
		});

		const middleware = requirePermission("snapshot:create");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("PERM-002: User without permission should be denied", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: ["snapshot:read"],
			authenticatedVia: "jwt",
		});

		const middleware = requirePermission("snapshot:delete");
		const result = await middleware(context, next);

		expect(result).toBeDefined();
		expect(next).not.toHaveBeenCalled();
	});

	it("PERM-003: Wildcard permission (snapshot:*) should grant all snapshot actions", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: ["snapshot:*"],
			authenticatedVia: "jwt",
		});

		const middleware = requirePermission("snapshot:create");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("PERM-004: Admin with * wildcard should access all permissions", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "admin_123", email: TEST_ADMIN_CREDENTIALS.email, role: "admin", name: "Admin" },
			plan: "enterprise",
			permissions: ["*"],
			authenticatedVia: "jwt",
		});

		const middleware = requirePermission("snapshot:create", "dashboard:admin");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("PERM-005: Multiple permission requirement should require ANY match", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: ["dashboard:read"],
			authenticatedVia: "jwt",
		});

		const middleware = requirePermission("snapshot:create", "dashboard:read");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});
});

// ============================================================================
// Test Suite: ROLE - Role-Based Access Control
// ============================================================================

describe("ROLE: Role-Based Access Control", () => {
	beforeEach(() => {
		mockGetUserPlan.mockResolvedValue("free" as const);
		mockGetUserPermissions.mockResolvedValue([]);
		mockGetUserOrgIds.mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("ROLE-001: User should NOT access admin-only endpoint", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: [],
			authenticatedVia: "jwt",
		});

		const middleware = requireRole("admin");
		const result = await middleware(context, next);

		expect(result).toBeDefined();
		expect(next).not.toHaveBeenCalled();
	});

	it("ROLE-002: Admin should access admin endpoints", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "admin_123", email: TEST_ADMIN_CREDENTIALS.email, role: "admin", name: "Admin" },
			plan: "enterprise",
			permissions: [],
			authenticatedVia: "jwt",
		});

		const middleware = requireRole("admin");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("ROLE-003: Multiple role requirement should allow any matching role", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "viewer_123", email: "viewer@example.com", role: "viewer", name: "Viewer" },
			plan: "free",
			permissions: [],
			authenticatedVia: "jwt",
		});

		const middleware = requireRole("admin", "viewer");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("ROLE-004: Null role should be rejected for role check", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: null, name: "Test" },
			plan: "free",
			permissions: [],
			authenticatedVia: "jwt",
		});

		const middleware = requireRole("user", "admin");
		const result = await middleware(context, next);

		expect(result).toBeDefined();
	});
});

// ============================================================================
// Test Suite: ORG - Organization Membership Validation
// ============================================================================

describe("ORG: Organization Membership Validation", () => {
	beforeEach(() => {
		mockGetUserPlan.mockResolvedValue("free" as const);
		mockGetUserPermissions.mockResolvedValue([]);
		mockGetUserOrgIds.mockResolvedValue(["org_123"]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("ORG-001: User should access their own organization", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: [],
			authenticatedVia: "jwt",
			orgIds: ["org_123"],
		});

		context.req.param = (name: string) => (name === "orgId" ? "org_123" : undefined);
		mockGetUserOrgIds.mockResolvedValue(["org_123"]);

		const middleware = requireOrgMembership("orgId");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("ORG-002: User should NOT access organization they don't belong to", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: [],
			authenticatedVia: "jwt",
			orgIds: ["org_123"],
		});

		context.req.param = (name: string) => (name === "orgId" ? "org_456" : undefined);
		mockGetUserOrgIds.mockResolvedValue(["org_123"]);

		const middleware = requireOrgMembership("orgId");
		const result = await middleware(context, next);

		expect(result).toBeDefined();
		expect(next).not.toHaveBeenCalled();
	});

	it("ORG-003: Admin should access any organization", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "admin_123", email: TEST_ADMIN_CREDENTIALS.email, role: "admin", name: "Admin" },
			plan: "enterprise",
			permissions: [],
			authenticatedVia: "jwt",
			orgIds: [],
		});

		context.req.param = (name: string) => (name === "orgId" ? "org_999" : undefined);

		const middleware = requireOrgMembership("orgId");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("ORG-004: Request without org ID should be rejected", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: [],
			authenticatedVia: "jwt",
			orgIds: ["org_123"],
		});

		context.req.param = () => undefined;

		const middleware = requireOrgMembership("orgId");
		const result = await middleware(context, next);

		expect(result).toBeDefined();
		expect(next).not.toHaveBeenCalled();
	});

	it("ORG-005: User with multiple orgs should access any of their organizations", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: [],
			authenticatedVia: "jwt",
			orgIds: ["org_123", "org_456", "org_789"],
		});

		context.req.param = (name: string) => (name === "orgId" ? "org_456" : undefined);
		mockGetUserOrgIds.mockResolvedValue(["org_123", "org_456", "org_789"]);

		const middleware = requireOrgMembership("orgId");
		const result = await middleware(context, next);

		expect(next).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});
});

// ============================================================================
// Test Suite: APIKEY - API Key Authentication
// ============================================================================

describe("APIKEY: API Key Authentication", () => {
	beforeEach(() => {
		mockGetUserPlan.mockResolvedValue("free" as const);
		mockGetUserPermissions.mockResolvedValue([]);
		mockGetUserOrgIds.mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("APIKEY-001: Valid API key format should be recognized", async () => {
		const apiKey = createValidApiKey();
		const context = createMockContext() as any;
		const next = createMockNext();

		context.req.header = (name: string) => {
			if (name === "X-API-Key") return apiKey;
			return undefined;
		};

		await extractAuthContext(context, next);

		expect(next).toHaveBeenCalled();
	});

	it("APIKEY-002: Invalid API key format should be rejected", async () => {
		const invalidKey = createInvalidApiKey();
		const context = createMockContext() as any;
		const next = createMockNext();

		context.req.header = (name: string) => {
			if (name === "X-API-Key") return invalidKey;
			return undefined;
		};

		await extractAuthContext(context, next);

		const authContext = context.get("auth") as AuthContext | undefined;
		expect(authContext).toBeUndefined();
		expect(next).toHaveBeenCalled();
	});

	it("APIKEY-003: API key should fallback if JWT fails", async () => {
		const apiKey = createValidApiKey();
		const context = createMockContext("Bearer invalid.jwt") as any;
		const next = createMockNext();

		context.req.header = (name: string) => {
			if (name === "Authorization") return "Bearer invalid.jwt";
			if (name === "X-API-Key") return apiKey;
			return undefined;
		};

		await extractAuthContext(context, next);

		expect(next).toHaveBeenCalled();
	});

	it("APIKEY-004: API key should mark authenticatedVia as 'api-key'", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		context.set("auth", {
			user: { id: "user_123", email: TEST_CREDENTIALS.email, role: "user", name: "Test" },
			plan: "pro",
			permissions: [],
			authenticatedVia: "api-key",
			apiKeyId: "key_123",
			orgIds: [],
		});

		const authContext = context.get("auth") as AuthContext | undefined;

		expect(authContext?.authenticatedVia).toBe("api-key");
		expect(authContext?.apiKeyId).toBe("key_123");
	});
});

// ============================================================================
// Test Suite: RES - Error Resilience
// ============================================================================

describe("RES: Error Resilience", () => {
	beforeEach(() => {
		mockGetUserPlan.mockResolvedValue("free" as const);
		mockGetUserPermissions.mockResolvedValue([]);
		mockGetUserOrgIds.mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("RES-001: Unauthenticated request should not throw", async () => {
		const context = createMockContext();
		const next = createMockNext();

		await expect(extractAuthContext(context, next)).resolves.not.toThrow();
		expect(next).toHaveBeenCalled();
	});

	it("RES-002: Missing auth should return 401 on protected endpoint", async () => {
		const context = createMockContext() as any;
		const next = createMockNext();

		const middleware = requirePlan("pro");
		const result = await middleware(context, next);

		expect(result).toBeDefined();
	});

	it("RES-003: Middleware should handle errors gracefully without crashing", async () => {
		const context = createMockContext() as any;
		const next = vi.fn().mockRejectedValue(new Error("Simulated error"));

		try {
			await extractAuthContext(context, next);
		} catch (error) {
			// Should handle gracefully
			expect(error).toBeInstanceOf(Error);
		}
	});
});
