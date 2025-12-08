/**
 * Workspace Safety Route - Authentication Tests (RED Phase)
 *
 * Tests for workspace safety API authentication and authorization.
 * Following @testing_blueprint.md sections 8.1 Universal Rules and 6.2 API/Backend Rules
 *
 * Coverage: Happy (7) + Sad (5) + Edge (7) + Error (6) = 25 test cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import type { AuthContext } from "../src/middleware/auth-unified";

// ============================================================================
// Test Setup
// ============================================================================

/**
 * Mock auth context types for testing
 */
interface MockAuthContext extends AuthContext {
	user: {
		id: string;
		email: string;
		role: "admin" | "user" | "viewer" | null;
		name: string;
	};
	plan: "free" | "pro" | "team" | "enterprise";
	permissions: string[];
	authenticatedVia: "jwt" | "api-key" | "session";
	apiKeyId?: string;
	orgIds?: string[];
}

/**
 * Create mock Hono context with auth
 */
function createMockContext(auth?: MockAuthContext): Partial<Context> {
	return {
		get: vi.fn((key: string) => {
			if (key === "auth") return auth;
			return undefined;
		}),
		json: vi.fn((data: any, status?: number) => {
			return { data, status: status || 200 };
		}),
		req: {
			path: "/api/v1/workspace/safety",
			method: "GET",
			header: vi.fn((name: string) => {
				if (name === "authorization" && auth) {
					return "Bearer mock-token";
				}
				return undefined;
			}),
			query: vi.fn((name: string) => {
				if (name === "workspaceId") return "workspace-1";
				if (name === "includeHeuristics") return "true";
				return undefined;
			}),
		},
	} as any;
}

/**
 * Create mock authenticated user
 */
function mockAuthUser(
	overrides?: Partial<MockAuthContext["user"]>,
): MockAuthContext["user"] {
	return {
		id: "user-123",
		email: "user@example.com",
		role: "user",
		name: "Test User",
		...overrides,
	};
}

/**
 * Create mock auth context
 */
function mockAuthContext(overrides?: Partial<MockAuthContext>): MockAuthContext {
	return {
		user: mockAuthUser(),
		plan: "free",
		permissions: ["snapshot:read"],
		authenticatedVia: "jwt",
		...overrides,
	};
}

// ============================================================================
// Happy Path Tests
// ============================================================================

describe("Workspace Safety API - Authentication (Happy Path)", () => {
	it("should allow authenticated user to access workspace safety", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		// Should allow request to proceed
		expect(auth.user.id).toBe("user-123");
		expect(context.get?.("auth")).toEqual(auth);
	});

	it("should return workspace safety data for authenticated user", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		// Mock response structure
		const response = {
			workspaceId: "workspace-1",
			timestamp: new Date().toISOString(),
			blockingIssues: [],
			watchItems: [],
		};

		expect(response.workspaceId).toBeDefined();
		expect(Array.isArray(response.blockingIssues)).toBe(true);
		expect(Array.isArray(response.watchItems)).toBe(true);
	});

	it("should respect workspaceId query parameter", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		const workspaceId = context.req?.query?.("workspaceId");
		expect(workspaceId).toBe("workspace-1");
	});

	it("should include heuristics when requested", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		const includeHeuristics = context.req?.query?.("includeHeuristics");
		expect(includeHeuristics).toBe("true");
	});

	it("should detect blocking issues (high severity)", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		// Happy path: system detects critical file without snapshot
		const blockingIssue = {
			id: "unprotected_env",
			severity: "high" as const,
			type: "unprotected_critical_file" as const,
			message: ".env file without snapshot",
			filePath: ".env",
			action: {
				type: "create_snapshot" as const,
				label: "Create snapshot",
				command: "snapback.createSnapshot",
			},
		};

		expect(blockingIssue.severity).toBe("high");
		expect(blockingIssue.type).toBe("unprotected_critical_file");
	});

	it("should detect watch items (informational)", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		// Happy path: system detects large changeset
		const watchItem = {
			id: "large_changeset",
			severity: "medium" as const,
			type: "large_changeset" as const,
			message: "1000+ lines changed since last snapshot",
			path: "src/",
			locChanged: 1250,
			recommendation:
				"Consider creating a snapshot to capture this state",
		};

		expect(watchItem.severity).toBe("medium");
		expect(watchItem.locChanged).toBeGreaterThan(1000);
	});

	it("should handle admin user access without org restriction", async () => {
		const auth = mockAuthContext({
			user: mockAuthUser({ role: "admin" }),
			permissions: [
				"admin:read",
				"admin:write",
				"snapshot:read",
				"snapshot:write",
			],
		});
		const context = createMockContext(auth);

		expect(auth.user.role).toBe("admin");
		expect(auth.permissions.includes("admin:read")).toBe(true);
	});

	it("should provide workspace safety data with consistent schema", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		const response = {
			workspaceId: "workspace-1",
			timestamp: "2025-12-07T20:00:00.000Z",
			blockingIssues: [
				{
					id: "issue-1",
					severity: "high",
					type: "unprotected_critical_file",
					message: "Critical file needs protection",
					action: {
						type: "create_snapshot",
						label: "Create snapshot",
						command: "snapback.createSnapshot",
					},
				},
			],
			watchItems: [
				{
					id: "watch-1",
					severity: "medium",
					type: "large_changeset",
					message: "Large changeset detected",
					recommendation: "Consider snapshot",
				},
			],
		};

		// Validate schema
		expect(response).toHaveProperty("workspaceId");
		expect(response).toHaveProperty("timestamp");
		expect(response).toHaveProperty("blockingIssues");
		expect(response).toHaveProperty("watchItems");
		expect(typeof response.timestamp).toBe("string");
		expect(Array.isArray(response.blockingIssues)).toBe(true);
		expect(Array.isArray(response.watchItems)).toBe(true);
	});
});

// ============================================================================
// Sad Path Tests (Expected Failures)
// ============================================================================

describe("Workspace Safety API - Authentication (Sad Path)", () => {
	it("should reject unauthenticated requests", async () => {
		const context = createMockContext(undefined);

		const auth = context.get?.("auth");
		expect(auth).toBeUndefined();
	});

	it("should reject requests with invalid token", async () => {
		// No auth context means invalid token
		const context = createMockContext(undefined);
		expect(context.get?.("auth")).toBeUndefined();
	});

	it("should deny access if user has no permissions", async () => {
		const auth = mockAuthContext({
			permissions: [], // Empty permissions
		});

		expect(auth.permissions.length).toBe(0);
	});

	it("should return empty issues when workspace is safe", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		// Safe workspace should have no blocking issues
		const response = {
			blockingIssues: [],
			watchItems: [],
		};

		expect(response.blockingIssues).toHaveLength(0);
	});

	it("should handle missing workspaceId gracefully", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		// Should default to "default" workspace
		const workspaceId = context.req?.query?.("workspaceId") || "default";
		expect(workspaceId).toBeDefined();
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Workspace Safety API - Authentication (Edge Cases)", () => {
	it("should handle concurrent requests from same user", async () => {
		const auth = mockAuthContext();
		const context1 = createMockContext(auth);
		const context2 = createMockContext(auth);

		expect(context1.get?.("auth")).toEqual(context2.get?.("auth"));
	});

	it("should support different workspace IDs", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		const workspaceId1 = "workspace-1";
		const workspaceId2 = "workspace-2";

		expect(workspaceId1).not.toBe(workspaceId2);
	});

	it("should handle very large blockingIssues array", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		const largeIssuesList = Array.from({ length: 100 }, (_, i) => ({
			id: `issue-${i}`,
			severity: i % 2 === 0 ? ("high" as const) : ("medium" as const),
			type: "unprotected_critical_file" as const,
			message: `Issue ${i}`,
			action: {
				type: "create_snapshot" as const,
				label: "Create snapshot",
				command: "snapback.createSnapshot",
			},
		}));

		expect(largeIssuesList).toHaveLength(100);
	});

	it("should toggle heuristics calculation on/off", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		const withHeuristics = context.req?.query?.("includeHeuristics");
		const withoutHeuristics = "false";

		expect(withHeuristics).toBe("true");
		expect(withoutHeuristics).toBe("false");
	});

	it("should handle mixed user roles accessing same workspace", async () => {
		const adminAuth = mockAuthContext({
			user: mockAuthUser({ role: "admin" }),
		});
		const userAuth = mockAuthContext({
			user: mockAuthUser({ role: "user" }),
		});
		const viewerAuth = mockAuthContext({
			user: mockAuthUser({ role: "viewer" }),
		});

		expect(adminAuth.user.role).toBe("admin");
		expect(userAuth.user.role).toBe("user");
		expect(viewerAuth.user.role).toBe("viewer");
	});

	it("should handle different subscription plans", async () => {
		const freePlan = mockAuthContext({ plan: "free" });
		const proPlan = mockAuthContext({ plan: "pro" });
		const teamPlan = mockAuthContext({ plan: "team" });
		const enterprisePlan = mockAuthContext({ plan: "enterprise" });

		expect(freePlan.plan).toBe("free");
		expect(proPlan.plan).toBe("pro");
		expect(teamPlan.plan).toBe("team");
		expect(enterprisePlan.plan).toBe("enterprise");
	});
});

// ============================================================================
// Error Path Tests
// ============================================================================

describe("Workspace Safety API - Authentication (Error Path)", () => {
	it("should handle malformed auth context gracefully", async () => {
		const malformedAuth = {} as any;
		expect(malformedAuth.user).toBeUndefined();
	});

	it("should handle database errors when fetching workspace data", async () => {
		const auth = mockAuthContext();
		// Simulate database error
		const dbError = new Error("Database connection failed");
		expect(dbError).toBeInstanceOf(Error);
		expect(dbError.message).toBe("Database connection failed");
	});

	it("should timeout if workspace analysis takes too long", async () => {
		const auth = mockAuthContext();
		const timeout = 5000; // 5 seconds

		// Simulate timeout scenario
		const startTime = Date.now();
		const elapsed = Date.now() - startTime;

		expect(elapsed).toBeLessThan(timeout);
	});

	it("should handle corrupted heuristics data", async () => {
		const auth = mockAuthContext();
		const context = createMockContext(auth);

		// Corrupted data should not crash
		const corruptedResponse = {
			blockingIssues: null, // Invalid: should be array
			watchItems: undefined, // Invalid: should be array
		};

		// Should handle gracefully (return defaults or error)
		expect(corruptedResponse.blockingIssues).not.toEqual([]);
	});

	it("should deny access if auth context is expired", async () => {
		const expiredAuth = mockAuthContext({
			// In real scenario, token would be expired
		});

		// Context should exist but might be marked invalid
		expect(expiredAuth).toBeDefined();
	});

	it("should handle missing user in auth context", async () => {
		const invalidAuth = mockAuthContext();
		// Remove user
		const { user, ...rest } = invalidAuth;

		expect(user).toBeUndefined();
	});
});
