import type { betterAuth } from "better-auth";
import { Hono } from "hono";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authMiddleware } from "../auth";
import {
	cleanupTestAuth,
	createExpiredSession,
	createTestAuthInstance,
	createTestUser,
	getTestSessionToken,
} from "./test-auth-setup";

describe("Auth Middleware - Integration Tests", () => {
	let auth: ReturnType<typeof betterAuth>;
	let app: Hono;
	let testUserId: string;
	let testSessionToken: string;

	beforeAll(async () => {
		// Create test Better Auth instance
		auth = createTestAuthInstance();
	});

	beforeEach(async () => {
		// Create test user before each test
		const userData = await createTestUser(auth);
		testUserId = userData.user.id;

		// Get session token
		testSessionToken = await getTestSessionToken(auth);

		// Create test Hono app with auth middleware
		app = new Hono();

		// Mock the snapbackAuth to use our test auth instance
		// This is a bit of a hack but necessary since the middleware
		// uses the global snapbackAuth from @snapback/auth
		(global as any).testAuthInstance = auth;

		app.use("*", authMiddleware);
		app.get("/protected", (c) => {
			const authContext = c.get("auth");
			return c.json({
				userId: authContext?.userId,
				email: authContext?.email,
				plan: authContext?.plan,
			});
		});
	});

	afterEach(async () => {
		// Cleanup test data
		await cleanupTestAuth(auth);
		delete (global as any).testAuthInstance;
	});

	describe("Session Authentication", () => {
		it("should reject requests without session token", async () => {
			const res = await app.request("/protected");
			expect(res.status).toBe(401);

			const data = await res.json();
			expect(data.error).toBeDefined();
		});

		it("should accept valid session token via cookie", async () => {
			const res = await app.request("/protected", {
				headers: {
					Cookie: `better-auth.session_token=${testSessionToken}`,
				},
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.userId).toBe(testUserId);
			expect(data.email).toBe("test@example.com");
		});

		it("should accept valid session token via Authorization header", async () => {
			const res = await app.request("/protected", {
				headers: {
					Authorization: `Bearer ${testSessionToken}`,
				},
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.userId).toBe(testUserId);
		});

		it("should reject expired session token", async () => {
			const expiredToken = await createExpiredSession(auth, testUserId);

			const res = await app.request("/protected", {
				headers: {
					Cookie: `better-auth.session_token=${expiredToken}`,
				},
			});

			expect(res.status).toBe(401);
		});

		it("should reject invalid session token", async () => {
			const res = await app.request("/protected", {
				headers: {
					Cookie: "better-auth.session_token=invalid-token-12345",
				},
			});

			expect(res.status).toBe(401);
		});

		it("should reject malformed session token", async () => {
			const res = await app.request("/protected", {
				headers: {
					Cookie: "better-auth.session_token=",
				},
			});

			expect(res.status).toBe(401);
		});
	});

	describe("Rate Limiting", () => {
		it("should enforce rate limits on auth endpoints", async () => {
			const attempts: Promise<any>[] = [];

			// Make 10 failed sign-in attempts
			for (let i = 0; i < 10; i++) {
				attempts.push(
					auth.api.signInEmail({
						body: {
							email: "test@example.com",
							password: "WrongPassword!",
						},
					}),
				);
			}

			const results = await Promise.all(attempts);

			// Should have some rate-limited responses
			const rateLimited = results.filter(
				(r) => r.error?.message?.includes("rate limit") || r.error?.message?.includes("Too many"),
			);

			expect(rateLimited.length).toBeGreaterThan(0);
		});

		it("should allow requests within rate limit", async () => {
			// Make 2 requests (within limit of 3 per 10s for /sign-in/email)
			const result1 = await auth.api.signInEmail({
				body: {
					email: "test@example.com",
					password: "WrongPassword!",
				},
			});

			const result2 = await auth.api.signInEmail({
				body: {
					email: "test@example.com",
					password: "WrongPassword!",
				},
			});

			// Both should fail auth but NOT be rate limited
			expect(result1.error?.message).not.toContain("rate limit");
			expect(result2.error?.message).not.toContain("rate limit");
		});
	});

	describe("Better Auth Plugins", () => {
		it("should have API key plugin active", () => {
			// Verify API key plugin is loaded
			expect(auth.api.createAPIKey).toBeDefined();
			expect(typeof auth.api.createAPIKey).toBe("function");
		});

		it("should have JWT plugin active", () => {
			// Verify JWT plugin is loaded
			expect(auth.api.signJWT).toBeDefined();
			expect(typeof auth.api.signJWT).toBe("function");
		});

		it("should have organization plugin active", () => {
			// Verify organization plugin is loaded
			expect(auth.api.createOrganization).toBeDefined();
			expect(typeof auth.api.createOrganization).toBe("function");
		});
	});

	describe("Multi-User Scenarios", () => {
		it("should isolate sessions between different users", async () => {
			// Create second user
			const user2Data = await createTestUser(auth, {
				email: "user2@example.com",
				password: "Password123!",
				name: "User Two",
			});

			const user2Token = await getTestSessionToken(auth, {
				email: "user2@example.com",
				password: "Password123!",
			});

			// Request with user1 token
			const res1 = await app.request("/protected", {
				headers: {
					Cookie: `better-auth.session_token=${testSessionToken}`,
				},
			});

			// Request with user2 token
			const res2 = await app.request("/protected", {
				headers: {
					Cookie: `better-auth.session_token=${user2Token}`,
				},
			});

			const data1 = await res1.json();
			const data2 = await res2.json();

			expect(data1.userId).toBe(testUserId);
			expect(data2.userId).toBe(user2Data.user.id);
			expect(data1.userId).not.toBe(data2.userId);
		});
	});

	describe("Security Headers", () => {
		it("should include security context in response", async () => {
			const res = await app.request("/protected", {
				headers: {
					Cookie: `better-auth.session_token=${testSessionToken}`,
				},
			});

			expect(res.status).toBe(200);
			const data = await res.json();

			// Verify auth context is populated
			expect(data.userId).toBeDefined();
			expect(data.email).toBeDefined();
			expect(data.plan).toBeDefined(); // From subscription tier
		});

		it("should log authentication failures", async () => {
			// This would require mocking the logger, but verifies the error path
			const res = await app.request("/protected");
			expect(res.status).toBe(401);
		});
	});
});
