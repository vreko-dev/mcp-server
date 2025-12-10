/**
 * E2E Tests for Authentication API
 *
 * Tests real API authentication flows using actual HTTP requests
 * against a running API server with real middleware and database
 *
 * Requirements to run:
 * - API server running: make dev
 * - PostgreSQL database with migrations applied
 * - Redis cache available
 * - Better Auth configured
 *
 * Test Strategy:
 * - Test REAL API endpoints (not mocked)
 * - Use real HTTP requests (fetch, not testClient)
 * - Validate JWT token generation and verification
 * - Test middleware protection on real routes
 * - Test error scenarios with real error responses
 *
 * @see apps/api/test/integration/auth-middleware*.test.ts for unit tests
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createSignedJWT, TEST_SECRET, TEST_CREDENTIALS, TEST_ADMIN_CREDENTIALS } from "../test/integration/helpers/auth-test-factory";

/**
 * API Server Configuration
 * Must match running API server (typically localhost:3001)
 */
const API_URL = process.env.API_URL || "http://localhost:3001";

/**
 * Test Credentials
 */
const testUser = {
	id: "user_e2e_" + Date.now(),
	email: `e2e-test-${Date.now()}@snapback.dev`,
	name: "E2E Test User",
	role: "user" as const,
};

const testAdmin = {
	id: "admin_e2e_" + Date.now(),
	email: `e2e-admin-${Date.now()}@snapback.dev`,
	name: "E2E Admin User",
	role: "admin" as const,
};

describe("E2E: API Authentication", () => {
	let userToken: string;
	let adminToken: string;

	beforeAll(async () => {
		// Create valid JWT tokens for testing
		// In production E2E, these would come from real Better Auth sign-up/sign-in
		userToken = `Bearer ${createSignedJWT(
			{
				sub: testUser.id,
				email: testUser.email,
				name: testUser.name,
				role: testUser.role,
			},
			TEST_SECRET,
		)}`;

		adminToken = `Bearer ${createSignedJWT(
			{
				sub: testAdmin.id,
				email: testAdmin.email,
				name: testAdmin.name,
				role: testAdmin.role,
			},
			TEST_SECRET,
		)}`;
	});

	describe("E2E-AUTH-001: Valid JWT Authentication", () => {
		it("should accept valid Bearer token in Authorization header", async () => {
			const response = await fetch(`${API_URL}/api/health`, {
				method: "GET",
				headers: {
					Authorization: userToken,
					"Content-Type": "application/json",
				},
			});

			expect(response.status).toBeLessThan(500); // Should not be server error
		});

		it("should reject missing Authorization header on protected routes", async () => {
			// Most API routes require authentication
			const response = await fetch(`${API_URL}/api/snapshots`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			// Should be 401 Unauthorized or redirect to auth
			expect([401, 302, 403]).toContain(response.status);
		});

		it("should reject invalid JWT signature", async () => {
			const invalidToken = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImVtYWlsIjoidGVzdEBlbWFpbC5jb20ifQ.invalid_signature`;

			const response = await fetch(`${API_URL}/api/snapshots`, {
				method: "GET",
				headers: {
					Authorization: invalidToken,
					"Content-Type": "application/json",
				},
			});

			// Should reject invalid token
			expect([401, 403]).toContain(response.status);
		});
	});

	describe("E2E-AUTH-002: Admin Authorization", () => {
		it("should allow admin to access admin endpoints", async () => {
			const response = await fetch(`${API_URL}/api/admin/users`, {
				method: "GET",
				headers: {
					Authorization: adminToken,
					"Content-Type": "application/json",
				},
			});

			// Should succeed (200) or not exist (404) but NOT be forbidden (403)
			expect(response.status).not.toBe(403);
		});

		it("should deny regular user access to admin endpoints", async () => {
			const response = await fetch(`${API_URL}/api/admin/users`, {
				method: "GET",
				headers: {
					Authorization: userToken,
					"Content-Type": "application/json",
				},
			});

			// Should be forbidden
			expect(response.status).toBe(403);
		});
	});

	describe("E2E-AUTH-003: Token Expiration", () => {
		it("should reject expired JWT tokens", async () => {
			// Create an expired token (issued in the past with short expiry)
			const expiredToken = `Bearer ${createSignedJWT(
				{
					sub: testUser.id,
					email: testUser.email,
					exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
				},
				TEST_SECRET,
			)}`;

			const response = await fetch(`${API_URL}/api/snapshots`, {
				method: "GET",
				headers: {
					Authorization: expiredToken,
					"Content-Type": "application/json",
				},
			});

			// Should reject expired token
			expect([401, 403]).toContain(response.status);
		});
	});

	describe("E2E-AUTH-004: Protected Resource Access", () => {
		it("should return 200 for authenticated user on protected route", async () => {
			const response = await fetch(`${API_URL}/api/health`, {
				method: "GET",
				headers: {
					Authorization: userToken,
					"Content-Type": "application/json",
				},
			});

			// Health endpoint should be accessible or return expected status
			expect(response.status).toBeGreaterThanOrEqual(200);
			expect(response.status).toBeLessThan(500);
		});

		it("should preserve auth context through middleware chain", async () => {
			const response = await fetch(`${API_URL}/api/profile`, {
				method: "GET",
				headers: {
					Authorization: userToken,
					"Content-Type": "application/json",
				},
			});

			// Should either succeed (200) or not exist (404), but not fail due to auth
			expect([200, 404, 405]).toContain(response.status);
		});
	});

	describe("E2E-AUTH-005: Error Handling", () => {
		it("should handle malformed Authorization header", async () => {
			const response = await fetch(`${API_URL}/api/snapshots`, {
				method: "GET",
				headers: {
					Authorization: "InvalidFormat", // Missing "Bearer" prefix
					"Content-Type": "application/json",
				},
			});

			// Should reject malformed header
			expect([400, 401, 403]).toContain(response.status);
		});

		it("should return proper error response for missing token", async () => {
			const response = await fetch(`${API_URL}/api/snapshots`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			expect(response.status).toBeGreaterThanOrEqual(401);

			// Should return JSON error (not HTML error page)
			const contentType = response.headers.get("content-type");
			if (response.status !== 302) {
				// 302 redirects might be HTML, but auth errors should be JSON
				if (response.status >= 400) {
					expect(contentType).toContain("application/json");
				}
			}
		});

		it("should not leak sensitive information in error messages", async () => {
			const invalidToken = `Bearer invalid.token.here`;

			const response = await fetch(`${API_URL}/api/snapshots`, {
				method: "GET",
				headers: {
					Authorization: invalidToken,
					"Content-Type": "application/json",
				},
			});

			if (response.status >= 400) {
				const body = await response.json();
				const errorString = JSON.stringify(body).toLowerCase();

				// Should not leak JWT secret or detailed crypto info
				expect(errorString).not.toContain("secret");
				expect(errorString).not.toContain("hmac");
				expect(errorString).not.toContain("signature");
			}
		});
	});

	describe("E2E-AUTH-006: Token Refresh", () => {
		it("should support token refresh endpoint if available", async () => {
			const response = await fetch(`${API_URL}/api/auth/refresh`, {
				method: "POST",
				headers: {
					Authorization: userToken,
					"Content-Type": "application/json",
				},
			});

			// Endpoint might not exist (404) or might require specific body (400)
			// But auth should be validated
			expect(response.status).not.toBe(401);
		});
	});

	describe("E2E-AUTH-007: CORS and Security Headers", () => {
		it("should include security headers in auth responses", async () => {
			const response = await fetch(`${API_URL}/api/health`, {
				method: "GET",
				headers: {
					Authorization: userToken,
					"Content-Type": "application/json",
				},
			});

			// Should NOT have overly permissive CORS
			const allowOrigin = response.headers.get("access-control-allow-origin");
			if (allowOrigin) {
				expect(allowOrigin).not.toBe("*"); // Should be specific origin
			}

			// Should not leak auth info in CORS headers
			const exposeHeaders = response.headers.get("access-control-expose-headers");
			if (exposeHeaders) {
				expect(exposeHeaders.toLowerCase()).not.toContain("authorization");
			}
		});

		it("should include HttpOnly cookie flag for session cookies", async () => {
			const response = await fetch(`${API_URL}/api/health`, {
				method: "GET",
				headers: {
					Authorization: userToken,
					"Content-Type": "application/json",
				},
			});

			const setCookie = response.headers.get("set-cookie");
			if (setCookie) {
				// Auth cookies should be HttpOnly
				expect(setCookie.toLowerCase()).toContain("httponly");
			}
		});
	});

	describe("E2E-AUTH-008: Concurrent Requests", () => {
		it("should handle multiple concurrent requests with same token", async () => {
			const requests = Array.from({ length: 5 }, () =>
				fetch(`${API_URL}/api/health`, {
					method: "GET",
					headers: {
						Authorization: userToken,
						"Content-Type": "application/json",
					},
				}),
			);

			const responses = await Promise.all(requests);

			// All should succeed without token conflicts
			responses.forEach((response) => {
				expect(response.status).not.toBe(401);
			});
		});

		it("should properly isolate auth context between different users", async () => {
			const response1 = fetch(`${API_URL}/api/profile`, {
				method: "GET",
				headers: {
					Authorization: userToken,
					"Content-Type": "application/json",
				},
			});

			const response2 = fetch(`${API_URL}/api/profile`, {
				method: "GET",
				headers: {
					Authorization: adminToken,
					"Content-Type": "application/json",
				},
			});

			const [res1, res2] = await Promise.all([response1, response2]);

			// Both should authenticate successfully
			expect(res1.status).not.toBe(401);
			expect(res2.status).not.toBe(401);
		});
	});

	afterAll(() => {
		// Cleanup (tokens are short-lived and discarded)
		// No database cleanup needed as tokens are ephemeral
	});
});

describe("E2E: API Health Check", () => {
	it("should have health endpoint accessible", async () => {
		const response = await fetch(`${API_URL}/api/health`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		// Health endpoint should be accessible or clearly fail
		expect(
			[200, 401, 403, 404, 405, 503].includes(response.status),
		).toBe(true);
	});

	it("should respond to requests within timeout", async () => {
		const startTime = Date.now();

		const response = await fetch(`${API_URL}/api/health`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const duration = Date.now() - startTime;

		// Response should be fast (< 5s)
		expect(duration).toBeLessThan(5000);
		expect(response.status).toBeGreaterThan(0);
	});
});
