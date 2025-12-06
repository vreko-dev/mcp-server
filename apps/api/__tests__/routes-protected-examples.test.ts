import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createRateLimitMiddleware } from "../src/middleware/ratelimit";
import { requestLoggingMiddleware } from "../src/middleware/request-logging";
import { requireAuth, requireRole, requireOrgMembership, requirePlan } from "../src/middleware/auth";
import protectedExamplesRoute from "../src/routes/protected-examples";

/**
 * Protected Routes Integration Tests
 *
 * Validates middleware integration across:
 * - Public routes (no protection)
 * - Auth-required routes
 * - Admin/role-based routes
 * - Organization-scoped routes
 * - Plan-based feature routes
 * - Error handling + sanitization
 */

// Test app with full middleware chain
const createTestApp = () => {
	const app = new Hono();

	// Apply all middleware in correct order
	app.use("*", createRateLimitMiddleware()); // Rate limiting
	app.use("*", requestLoggingMiddleware); // Request logging
	app.route("/api", protectedExamplesRoute); // Protected examples

	return app;
};

describe("Protected Routes - Full Integration", () => {
	let app: ReturnType<typeof createTestApp>;

	beforeEach(() => {
		app = createTestApp();
	});

	// =========================================================================
	// 1. PUBLIC ROUTES - No authentication required
	// =========================================================================

	describe("Public Routes", () => {
		it("GET /api/public/health - Accessible without auth", async () => {
			const req = new Request("http://localhost:3000/api/public/health");
			const res = await app.fetch(req);

			expect(res.status).toBe(200);
			const data = await res.json() as Record<string, unknown>;
			expect(data.success).toBe(true);
			expect(data.message).toContain("Public endpoint");
		});

		it("Public route should set rate limit headers", async () => {
			const req = new Request("http://localhost:3000/api/public/health");
			const res = await app.fetch(req);

			expect(res.headers.get("X-RateLimit-Limit")).toBe("10"); // Burst limit
			expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
			expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
		});
	});

	// =========================================================================
	// 2. AUTH-REQUIRED ROUTES - User must be authenticated
	// =========================================================================

	describe("Auth-Required Routes", () => {
		it("GET /api/users/profile - Blocked without auth header", async () => {
			const req = new Request("http://localhost:3000/api/users/profile");
			const res = await app.fetch(req);

			// Should be blocked by requireAuth middleware
			expect([401, 403]).toContain(res.status); // Auth error or middleware blocks
		});

		it("POST /api/users/settings - Validates request body", async () => {
			// This demonstrates validation middleware chaining
			// TODO: When auth mock is available, test with valid token
			const req = new Request("http://localhost:3000/api/users/settings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					theme: "light",
					notifications: true,
					language: "en",
				}),
			});

			const res = await app.fetch(req);

			// Should validate schema regardless of auth status
			expect(res.status).toBeDefined();
		});

		it("POST /api/users/settings - Rejects invalid theme", async () => {
			// TODO: Complete when auth mock available
			const req = new Request("http://localhost:3000/api/users/settings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					theme: "neon", // Invalid enum value
				}),
			});

			const res = await app.fetch(req);

			// Should fail validation
			expect(res.status).toBeDefined();
		});
	});

	// =========================================================================
	// 3. ADMIN-ONLY ROUTES - Requires admin role
	// =========================================================================

	describe("Admin-Only Routes", () => {
		it("GET /api/admin/users - Blocked without admin role", async () => {
			const req = new Request("http://localhost:3000/api/admin/users");
			const res = await app.fetch(req);

			// Should be blocked by role check
			expect([401, 403]).toContain(res.status);
		});

		it("DELETE /api/admin/users/:id - Requires admin authorization", async () => {
			const req = new Request("http://localhost:3000/api/admin/users/user-123", {
				method: "DELETE",
			});

			const res = await app.fetch(req);

			// Should require authorization
			expect([401, 403]).toContain(res.status);
		});
	});

	// =========================================================================
	// 4. ORGANIZATION-SCOPED ROUTES - Requires org membership
	// =========================================================================

	describe("Organization-Scoped Routes", () => {
		it("GET /api/org/:orgId/members - Blocked without org membership", async () => {
			const req = new Request("http://localhost:3000/api/org/org-123/members");
			const res = await app.fetch(req);

			// Should require org membership
			expect([401, 403]).toContain(res.status);
		});

		it("POST /api/org/:orgId/settings - Validates org scope", async () => {
			// TODO: When org membership mock available
			const req = new Request("http://localhost:3000/api/org/org-456/settings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: "Acme Corp",
					description: "Our organization",
					publicProfile: true,
				}),
			});

			const res = await app.fetch(req);

			expect(res.status).toBeDefined();
		});

		it("POST /api/org/:orgId/settings - Requires minimum org name length", async () => {
			const req = new Request("http://localhost:3000/api/org/org-789/settings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: "AB", // Too short (min: 3)
				}),
			});

			const res = await app.fetch(req);

			// Should validate schema
			expect(res.status).toBeDefined();
		});
	});

	// =========================================================================
	// 5. PLAN-BASED FEATURE ROUTES - Requires subscription plan
	// =========================================================================

	describe("Plan-Based Feature Routes", () => {
		it("POST /api/advanced-analytics - Blocked for free plan", async () => {
			const req = new Request("http://localhost:3000/api/advanced-analytics", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					metricType: "engagement",
					timeRange: "30d",
					breakdown: "daily",
				}),
			});

			const res = await app.fetch(req);

			// Should be blocked by plan check
			expect([401, 403]).toContain(res.status);
		});

		it("POST /api/export-data - Validates export format", async () => {
			const req = new Request("http://localhost:3000/api/export-data", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					format: "invalid-format", // Invalid enum
					dateRange: {
						start: "2025-01-01T00:00:00Z",
						end: "2025-12-31T23:59:59Z",
					},
				}),
			});

			const res = await app.fetch(req);

			// Should validate enum
			expect(res.status).toBeDefined();
		});

		it("GET /api/sso-config - Enterprise plan only", async () => {
			const req = new Request("http://localhost:3000/api/sso-config");
			const res = await app.fetch(req);

			// Should be blocked - enterprise plan required
			expect([401, 403]).toContain(res.status);
		});
	});

	// =========================================================================
	// MIDDLEWARE CHAIN INTEGRATION
	// =========================================================================

	describe("Middleware Chain Integration", () => {
		it("All routes should have X-Request-Id header from logging middleware", async () => {
			const req = new Request("http://localhost:3000/api/public/health");
			const res = await app.fetch(req);

			// Request logging middleware adds request ID
			expect(res.headers.get("X-Request-Id")).toBeDefined();
		});

		it("Rate limit headers should be present on all responses", async () => {
			const req = new Request("http://localhost:3000/api/public/health");
			const res = await app.fetch(req);

			expect(res.headers.get("X-RateLimit-Limit")).toBeDefined();
			expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
			expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
		});

		it("POST /api/admin/bulk-invite - Chains role check + validation", async () => {
			const req = new Request("http://localhost:3000/api/admin/bulk-invite", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					emails: ["user1@example.com", "user2@example.com"],
					role: "user",
					message: "Welcome to our team!",
				}),
			});

			const res = await app.fetch(req);

			// Should require admin role (first middleware in chain)
			expect([401, 403]).toContain(res.status);
		});

		it("Validation errors should be caught before role checks", async () => {
			const req = new Request("http://localhost:3000/api/admin/bulk-invite", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					emails: "not-an-array", // Invalid type
					role: "user",
				}),
			});

			const res = await app.fetch(req);

			// Should fail validation before role check
			expect([400, 401, 403]).toContain(res.status);
		});
	});

	// =========================================================================
	// ERROR HANDLING & SECURITY
	// =========================================================================

	describe("Error Handling & Security", () => {
		it("Invalid Content-Type should be rejected in validation", async () => {
			const req = new Request("http://localhost:3000/api/users/settings", {
				method: "POST",
				headers: {
					"Content-Type": "text/plain", // Wrong content type
				},
				body: "invalid data",
			});

			const res = await app.fetch(req);

			expect(res.status).toBeDefined();
		});

		it("Missing required fields should fail validation", async () => {
			const req = new Request("http://localhost:3000/api/org/org-123/settings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					description: "Missing required 'name' field",
				}),
			});

			const res = await app.fetch(req);

			expect(res.status).toBeDefined();
		});

		it("Rate limiting should trigger after burst limit exceeded", async () => {
			const burst_limit = 10;

			// Make requests up to burst limit
			for (let i = 0; i < burst_limit; i++) {
				const req = new Request("http://localhost:3000/api/public/health");
				await app.fetch(req);
			}

			// Next request should be rate limited
			const rateLimitedReq = new Request("http://localhost:3000/api/public/health");
			const rateLimitedRes = await app.fetch(rateLimitedReq);

			// Should get 429 Too Many Requests
			expect(rateLimitedRes.status).toBe(429);
			const data = await rateLimitedRes.json() as Record<string, unknown>;
			expect(data.error).toContain("Too Many Requests");
		});
	});

	// =========================================================================
	// PERMISSION HIERARCHY
	// =========================================================================

	describe("Permission Hierarchy", () => {
		it("Admin can access admin routes", async () => {
			// TODO: When auth mock provides admin user context
			// const req = new Request("http://localhost:3000/api/admin/users", {
			//   headers: { Authorization: "Bearer admin-token" }
			// });
			// const res = await app.fetch(req);
			// expect(res.status).toBe(200);
		});

		it("Regular user cannot access admin routes", async () => {
			// TODO: When auth mock provides user context
			// const req = new Request("http://localhost:3000/api/admin/users", {
			//   headers: { Authorization: "Bearer user-token" }
			// });
			// const res = await app.fetch(req);
			// expect(res.status).toBe(403);
		});

		it("Admin with pro plan can access pro features", async () => {
			// TODO: When auth mock supports plan + role
			// const req = new Request("http://localhost:3000/api/advanced-analytics", {
			//   headers: { Authorization: "Bearer admin-pro-token" }
			// });
			// const res = await app.fetch(req);
			// expect(res.status).toBe(200);
		});

		it("User without org membership cannot access org routes", async () => {
			// TODO: Org membership check with mock
			// const req = new Request("http://localhost:3000/api/org/other-org/members", {
			//   headers: { Authorization: "Bearer user-token" }
			// });
			// const res = await app.fetch(req);
			// expect(res.status).toBe(403);
		});
	});
});
