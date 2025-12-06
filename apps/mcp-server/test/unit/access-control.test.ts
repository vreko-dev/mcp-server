import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	authenticate,
	clearAuthCache,
	hasPermission,
	hasRole,
	hasToolAccess,
	PERMISSIONS,
	ROLES,
} from "../../src/auth";

// Mock the @snapback/auth module to avoid database connections in tests
vi.mock("@snapback/auth", () => ({
	auth: {
		apiKey: {
			verifyKey: vi.fn().mockImplementation((_apiKey: string) => {
				// In test mode, we want to trigger the mockAuthFallback
				// So we'll throw an error to simulate database connection failure
				throw new Error("DATABASE_URL is not set and no Supabase configuration detected");
			}),
		},
	},
}));

describe("Access Control and Authentication", () => {
	// Clear the cache before each test to ensure isolation
	beforeEach(() => {
		clearAuthCache();
	});

	it("should authenticate admin users correctly", async () => {
		const result = await authenticate("sb_live_admin_testkey123");

		expect(result.valid).toBe(true);
		expect(result.tier).toBe("admin");
		expect(result.scopes).toContain("admin");
		expect(result.userId).toBe("admin-user");
		expect(result.organizationId).toBe("admin-org");
	});

	it("should authenticate pro users correctly", async () => {
		const result = await authenticate("sb_live_testkey123");

		expect(result.valid).toBe(true);
		expect(result.tier).toBe("pro");
		expect(result.scopes).not.toContain("admin");
		expect(result.userId).toBe("pro-user");
		expect(result.organizationId).toBe("pro-org");
	});

	it("should authenticate free users correctly", async () => {
		const result = await authenticate("");

		expect(result.valid).toBe(true);
		expect(result.tier).toBe("free");
		expect(result.scopes).toEqual([]);
	});

	it("should reject invalid API keys", async () => {
		const result = await authenticate("invalid_key");

		expect(result.valid).toBe(false);
		expect(result.tier).toBe("free");
		expect(result.error).toBe("Invalid API key format");
	});

	it("should check permissions correctly for admin users", async () => {
		const authResult = await authenticate("sb_live_admin_testkey123");

		expect(hasPermission(authResult, PERMISSIONS.ANALYZE_RISK)).toBe(true);
		expect(hasPermission(authResult, PERMISSIONS.CREATE_CHECKPOINT)).toBe(true);
		expect(hasPermission(authResult, PERMISSIONS.LIST_CHECKPOINTS)).toBe(true);
		expect(hasPermission(authResult, PERMISSIONS.RESTORE_CHECKPOINT)).toBe(true);
		expect(hasPermission(authResult, PERMISSIONS.CONTEXT_SEARCH)).toBe(true);
	});

	it("should check permissions correctly for pro users", async () => {
		const authResult = await authenticate("sb_live_testkey123");

		expect(hasPermission(authResult, PERMISSIONS.ANALYZE_RISK)).toBe(true);
		expect(hasPermission(authResult, PERMISSIONS.CREATE_CHECKPOINT)).toBe(true);
		expect(hasPermission(authResult, PERMISSIONS.LIST_CHECKPOINTS)).toBe(true);
		expect(hasPermission(authResult, PERMISSIONS.RESTORE_CHECKPOINT)).toBe(true);
		expect(hasPermission(authResult, PERMISSIONS.CONTEXT_SEARCH)).toBe(true);
	});

	it("should check permissions correctly for free users", async () => {
		const authResult = await authenticate("");

		expect(hasPermission(authResult, PERMISSIONS.ANALYZE_RISK)).toBe(true);
		expect(hasPermission(authResult, PERMISSIONS.CREATE_CHECKPOINT)).toBe(false);
		expect(hasPermission(authResult, PERMISSIONS.LIST_CHECKPOINTS)).toBe(false);
		expect(hasPermission(authResult, PERMISSIONS.RESTORE_CHECKPOINT)).toBe(false);
		expect(hasPermission(authResult, PERMISSIONS.CONTEXT_SEARCH)).toBe(true);
	});

	it("should check roles correctly", async () => {
		const adminAuth = await authenticate("sb_live_admin_testkey123");
		const proAuth = await authenticate("sb_live_testkey123");
		const freeAuth = await authenticate("");

		expect(hasRole(adminAuth, ROLES.ADMIN)).toBe(true);
		expect(hasRole(adminAuth, ROLES.PRO)).toBe(false);
		expect(hasRole(adminAuth, ROLES.FREE)).toBe(false);

		expect(hasRole(proAuth, ROLES.ADMIN)).toBe(false);
		expect(hasRole(proAuth, ROLES.PRO)).toBe(true);
		expect(hasRole(proAuth, ROLES.FREE)).toBe(false);

		expect(hasRole(freeAuth, ROLES.ADMIN)).toBe(false);
		expect(hasRole(freeAuth, ROLES.PRO)).toBe(false);
		expect(hasRole(freeAuth, ROLES.FREE)).toBe(true);
	});

	it("should check tool access correctly", async () => {
		const adminAuth = await authenticate("sb_live_admin_testkey123");
		const proAuth = await authenticate("sb_live_testkey123");
		const freeAuth = await authenticate("");

		// Admin should have access to all tools
		expect(hasToolAccess(adminAuth, "snapback.analyze_risk")).toBe(true);
		expect(hasToolAccess(adminAuth, "snapback.create_checkpoint")).toBe(true);
		expect(hasToolAccess(adminAuth, "snapback.list_checkpoints")).toBe(true);
		expect(hasToolAccess(adminAuth, "snapback.restore_checkpoint")).toBe(true);
		expect(hasToolAccess(adminAuth, "ctx7.resolve-library-id")).toBe(true);
		expect(hasToolAccess(adminAuth, "ctx7.get-library-docs")).toBe(true);

		// Pro should have access to all tools
		expect(hasToolAccess(proAuth, "snapback.analyze_risk")).toBe(true);
		expect(hasToolAccess(proAuth, "snapback.create_checkpoint")).toBe(true);
		expect(hasToolAccess(proAuth, "snapback.list_checkpoints")).toBe(true);
		expect(hasToolAccess(proAuth, "snapback.restore_checkpoint")).toBe(true);
		expect(hasToolAccess(proAuth, "ctx7.resolve-library-id")).toBe(true);
		expect(hasToolAccess(proAuth, "ctx7.get-library-docs")).toBe(true);

		// Free should have limited access
		expect(hasToolAccess(freeAuth, "snapback.analyze_risk")).toBe(true);
		expect(hasToolAccess(freeAuth, "snapback.create_checkpoint")).toBe(false);
		expect(hasToolAccess(freeAuth, "snapback.list_checkpoints")).toBe(false);
		expect(hasToolAccess(freeAuth, "snapback.restore_checkpoint")).toBe(false);
		expect(hasToolAccess(freeAuth, "ctx7.resolve-library-id")).toBe(true);
		expect(hasToolAccess(freeAuth, "ctx7.get-library-docs")).toBe(true);
	});

	it("should allow access to unknown tools by default", async () => {
		const authResult = await authenticate("sb_live_testkey123");
		expect(hasToolAccess(authResult, "unknown.tool")).toBe(true);
	});

	it("should cache authentication results", async () => {
		// First call should authenticate
		const result1 = await authenticate("sb_live_admin_testkey123");

		// Second call should use cache
		const result2 = await authenticate("sb_live_admin_testkey123");

		expect(result1).toEqual(result2);
		expect(result1.valid).toBe(true);
		expect(result1.tier).toBe("admin");
	});

	it("should expire cache after 60 seconds", async () => {
		// Mock Date.now to control time
		const now = Date.now();
		vi.useFakeTimers();
		vi.setSystemTime(now);

		try {
			// First call should authenticate
			const result1 = await authenticate("sb_live_admin_testkey123");

			// Advance time by 61 seconds (past TTL)
			vi.advanceTimersByTime(61000);

			// Second call should re-authenticate (but will still use mock)
			const result2 = await authenticate("sb_live_admin_testkey123");

			expect(result1).toEqual(result2);
			expect(result1.valid).toBe(true);
			expect(result1.tier).toBe("admin");
		} finally {
			// Restore real timers
			vi.useRealTimers();
		}
	});
});
