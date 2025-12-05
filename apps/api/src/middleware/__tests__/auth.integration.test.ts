/**
 * Auth Middleware Integration Tests
 *
 * Tests REAL authentication flow with JWT validation.
 * These are NOT unit tests - they test complete auth middleware behavior.
 *
 * Run with: pnpm test:integration
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { SignJWT } from "jose";
import {
	requireAuth,
	requireRole,
	requirePlan,
	requireOrgMembership,
	hasPermission,
} from "../auth.js";

describe("Auth Middleware Integration", () => {
	let app: Hono;
	const secret = new TextEncoder().encode("test-secret-key-min-32-characters-long");

	// Helper to create valid JWT tokens
	async function createToken(payload: {
		sub: string;
		email: string;
		role?: string;
		plan?: string;
		orgId?: string;
	}): Promise<string> {
		return await new SignJWT({
			sub: payload.sub,
			email: payload.email,
			role: payload.role || "user",
			plan: payload.plan || "free",
			orgId: payload.orgId,
		})
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime("1h")
			.sign(secret);
	}

	beforeEach(() => {
		app = new Hono();
		// Set the secret for testing
		process.env.BETTER_AUTH_SECRET = "test-secret-key-min-32-characters-long";
	});

	describe("requireAuth - Basic Authentication", () => {
		beforeEach(() => {
			app.use("/protected/*", requireAuth);
			app.get("/protected/resource", (c: Context) =>
				c.json({ message: "success", user: (c.env as any).auth?.user }),
			);
		});

		it("should allow access with valid Bearer token", async () => {
			const token = await createToken({
				sub: "user_123",
				email: "test@example.com",
			});

			const response = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe("success");
			expect(body.user).toBeDefined();
			expect(body.user.id).toBe("user_123");
			expect(body.user.email).toBe("test@example.com");
		});

		it("should reject request without Authorization header", async () => {
			const response = await app.request("/protected/resource", {
				method: "GET",
			});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.code).toBe("unauthorized");
			expect(body.message).toBe("Authentication required");
		});

		it("should reject invalid Bearer token format", async () => {
			const response = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: "InvalidFormat token123",
				},
			});

			expect(response.status).toBe(401);
		});

		it("should reject malformed JWT token", async () => {
			const response = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: "Bearer invalid.jwt.token",
				},
			});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.message).toContain("Invalid or expired");
		});

		it("should attach auth context to request", async () => {
			const token = await createToken({
				sub: "user_456",
				email: "context@example.com",
				role: "admin",
			});

			const response = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			const body = await response.json();
			expect(body.user).toMatchObject({
				id: "user_456",
				email: "context@example.com",
				role: "admin",
			});
		});
	});

	describe("requireRole - Role-Based Access Control", () => {
		beforeEach(() => {
			app.use("/admin/*", requireRole("admin"));
			app.get("/admin/dashboard", (c: Context) =>
				c.json({ message: "admin access granted" }),
			);
		});

		it("should allow access for matching role", async () => {
			const token = await createToken({
				sub: "admin_001",
				email: "admin@example.com",
				role: "admin",
			});

			const response = await app.request("/admin/dashboard", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe("admin access granted");
		});

		it("should deny access for non-matching role", async () => {
			const token = await createToken({
				sub: "user_002",
				email: "user@example.com",
				role: "user",
			});

			const response = await app.request("/admin/dashboard", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.code).toBe("forbidden");
			expect(body.message).toContain("Required role");
		});

		it("should support multiple allowed roles", async () => {
			app = new Hono();
			app.use("/moderator/*", requireRole("admin", "user"));
			app.get("/moderator/panel", (c: Context) => c.json({ message: "ok" }));

			// Admin should have access
			const adminToken = await createToken({
				sub: "admin_003",
				email: "admin@example.com",
				role: "admin",
			});

			const adminResponse = await app.request("/moderator/panel", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${adminToken}`,
				},
			});

			expect(adminResponse.status).toBe(200);

			// Regular user should also have access
			const userToken = await createToken({
				sub: "user_004",
				email: "user@example.com",
				role: "user",
			});

			const userResponse = await app.request("/moderator/panel", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${userToken}`,
				},
			});

			expect(userResponse.status).toBe(200);

			// Viewer should be denied
			const viewerToken = await createToken({
				sub: "viewer_005",
				email: "viewer@example.com",
				role: "viewer",
			});

			const viewerResponse = await app.request("/moderator/panel", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${viewerToken}`,
				},
			});

			expect(viewerResponse.status).toBe(403);
		});
	});

	describe("requirePlan - Plan-Based Access Control", () => {
		beforeEach(() => {
			app.use("/pro/*", requirePlan("pro", "enterprise"));
			app.get("/pro/feature", (c: Context) =>
				c.json({ message: "pro feature" }),
			);
		});

		it("should allow access for matching plan", async () => {
			const token = await createToken({
				sub: "user_pro",
				email: "pro@example.com",
				plan: "pro",
			});

			const response = await app.request("/pro/feature", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(200);
		});

		it("should deny access for lower-tier plan", async () => {
			const token = await createToken({
				sub: "user_free",
				email: "free@example.com",
				plan: "free",
			});

			const response = await app.request("/pro/feature", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.message).toContain("Required plan");
		});

		it("should allow enterprise plan for pro features", async () => {
			const token = await createToken({
				sub: "user_enterprise",
				email: "enterprise@example.com",
				plan: "enterprise",
			});

			const response = await app.request("/pro/feature", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(200);
		});
	});

	describe("requireOrgMembership - Organization Access Control", () => {
		beforeEach(() => {
			app.use("/org/:orgId/*", requireOrgMembership("orgId"));
			app.get("/org/:orgId/dashboard", (c: Context) =>
				c.json({ message: "org dashboard", orgId: c.req.param("orgId") }),
			);
		});

		it("should allow access for matching organization", async () => {
			const token = await createToken({
				sub: "user_org",
				email: "user@org.com",
				orgId: "org_123",
			});

			const response = await app.request("/org/org_123/dashboard", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.orgId).toBe("org_123");
		});

		it("should deny access for different organization", async () => {
			const token = await createToken({
				sub: "user_org2",
				email: "user@org2.com",
				orgId: "org_456",
			});

			const response = await app.request("/org/org_123/dashboard", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.message).toContain("Access to this organization denied");
		});

		it("should allow admin access to any organization", async () => {
			const token = await createToken({
				sub: "admin_global",
				email: "admin@example.com",
				role: "admin",
				orgId: "org_999",
			});

			const response = await app.request("/org/org_123/dashboard", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(200);
		});
	});

	describe("Permission Generation", () => {
		beforeEach(() => {
			app.use("/protected/*", requireAuth);
			app.get("/protected/check-permission", (c: Context) => {
				const canCreateSnapshot = hasPermission(c, "snapshot:create");
				const canManageOrg = hasPermission(c, "org:manage");

				return c.json({
					canCreateSnapshot,
					canManageOrg,
					permissions: (c.env as any).auth?.permissions || [],
				});
			});
		});

		it("should generate permissions for admin role", async () => {
			const token = await createToken({
				sub: "admin_perm",
				email: "admin@example.com",
				role: "admin",
			});

			const response = await app.request("/protected/check-permission", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			const body = await response.json();
			expect(body.canCreateSnapshot).toBe(true);
			expect(body.canManageOrg).toBe(true);
			expect(body.permissions).toContain("admin:read");
			expect(body.permissions).toContain("org:manage");
		});

		it("should generate permissions for user role", async () => {
			const token = await createToken({
				sub: "user_perm",
				email: "user@example.com",
				role: "user",
			});

			const response = await app.request("/protected/check-permission", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			const body = await response.json();
			expect(body.canCreateSnapshot).toBe(true);
			expect(body.canManageOrg).toBe(false);
		});

		it("should include plan-based permissions", async () => {
			const token = await createToken({
				sub: "user_enterprise",
				email: "enterprise@example.com",
				role: "user",
				plan: "enterprise",
			});

			const response = await app.request("/protected/check-permission", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			const body = await response.json();
			expect(body.permissions).toContain("sso:enabled");
			expect(body.permissions).toContain("audit:enabled");
			expect(body.permissions).toContain("compliance:enabled");
		});
	});

	describe("Complex Authorization Scenarios", () => {
		it("should handle chained middleware correctly", async () => {
			app.use("/api/*", requireAuth);
			app.use("/api/admin/*", requireRole("admin"));
			app.use("/api/admin/pro/*", requirePlan("pro", "enterprise"));

			app.get("/api/admin/pro/feature", (c: Context) =>
				c.json({ message: "exclusive feature" }),
			);

			// Admin with pro plan should succeed
			const validToken = await createToken({
				sub: "admin_pro",
				email: "admin@example.com",
				role: "admin",
				plan: "pro",
			});

			const validResponse = await app.request("/api/admin/pro/feature", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${validToken}`,
				},
			});

			expect(validResponse.status).toBe(200);

			// Admin with free plan should fail at plan check
			const freeToken = await createToken({
				sub: "admin_free",
				email: "admin@example.com",
				role: "admin",
				plan: "free",
			});

			const freeResponse = await app.request("/api/admin/pro/feature", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${freeToken}`,
				},
			});

			expect(freeResponse.status).toBe(403);
		});
	});
});
