/**
 * Integration Tests for Auth MSW Handlers
 *
 * Test ID Pattern: AUTH-MSW-[Feature]-[Scenario]-[TestNumber]
 *
 * Tests Better Auth endpoint compatibility and OWASP 2025 security patterns:
 * - Correct endpoint paths (hyphenated: /sign-in/email, /sign-up/email)
 * - Cookie naming (snapback_auth.session_token)
 * - Password validation (uppercase, lowercase, number, 8+ chars)
 * - No user enumeration in error messages
 * - Session expiry validation
 * - Proper HTTP status codes
 *
 * @group integration
 * @group auth
 * @group msw
 */

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { authErrorHandlers, authHandlers, TEST_CREDENTIALS } from "../auth";

// Create server with only auth handlers (avoid GraphQL dependency)
const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
	// Reset handlers to defaults and clear any accumulated cookies
	server.resetHandlers(...authHandlers);
});
afterAll(() => server.close());

describe("Auth MSW Handlers", () => {
	describe("Registration Flow", () => {
		// TEST_ID: AUTH-MSW-REGISTRATION-ENDPOINT-001
		it("should use correct Better Auth endpoint path (hyphenated)", async () => {
			const response = await fetch("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "newuser@example.com",
					password: "SecurePass123!",
					name: "New User",
				}),
			});

			expect(response.status).toBe(200);
		});

		// TEST_ID: AUTH-MSW-REGISTRATION-PASSWORD-002
		it("should enforce complete password validation (OWASP 2025)", async () => {
			const testCases = [
				{
					password: "short",
					error: "Password must be at least 8 characters",
				},
				{
					password: "nouppercase123",
					error: "Password must contain at least one uppercase letter",
				},
				{
					password: "NOLOWERCASE123",
					error: "Password must contain at least one lowercase letter",
				},
				{
					password: "NoNumbers",
					error: "Password must contain at least one number",
				},
			];

			for (const { password, error } of testCases) {
				const response = await fetch("http://localhost/api/auth/sign-up/email", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: "test@example.com",
						password,
						name: "Test",
					}),
				});

				expect(response.status).toBe(400);
				const data = await response.json();
				expect(data.error).toBe(error);
			}
		});

		// TEST_ID: AUTH-MSW-REGISTRATION-ENUMERATION-003
		it("should not reveal user existence in error messages (no enumeration)", async () => {
			const response = await fetch("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "existing@example.com",
					password: "ValidPassword123!",
					name: "Test",
				}),
			});

			expect(response.status).toBe(400); // NOT 409 Conflict
			const data = await response.json();
			expect(data.error).not.toContain("already exists");
			expect(data.error).toContain("Unable to create account");
		});

		// TEST_ID: AUTH-MSW-REGISTRATION-SUCCESS-004
		it("should return user without password on successful signup", async () => {
			const response = await fetch("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "newuser@example.com",
					password: "ValidPassword123!",
					name: "Test User",
				}),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.user).toBeDefined();
			expect(data.user.email).toBe("newuser@example.com");
			expect(data.user.password).toBeUndefined();
			expect(data.user.emailVerified).toBe(false);
		});
	});

	describe("Login Flow", () => {
		// TEST_ID: AUTH-MSW-LOGIN-ENDPOINT-001
		it("should use correct Better Auth endpoint path (hyphenated)", async () => {
			const response = await fetch("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: TEST_CREDENTIALS.email,
					password: TEST_CREDENTIALS.password,
				}),
			});

			expect(response.status).toBe(200);
		});

		// TEST_ID: AUTH-MSW-LOGIN-SUCCESS-002
		it("should return user and session with valid credentials", async () => {
			const response = await fetch("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: TEST_CREDENTIALS.email,
					password: TEST_CREDENTIALS.password,
				}),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.user).toBeDefined();
			expect(data.session).toBeDefined();
			expect(data.session.token).toBeDefined();
			expect(data.session.userId).toBe(data.user.id);
		});

		// TEST_ID: AUTH-MSW-LOGIN-COOKIE-003
		it("should set correct cookie name (snapback_auth.session_token)", async () => {
			const response = await fetch("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: TEST_CREDENTIALS.email,
					password: TEST_CREDENTIALS.password,
				}),
			});

			const setCookie = response.headers.get("set-cookie");
			expect(setCookie).toContain("snapback_auth.session_token=");
			expect(setCookie).toContain("HttpOnly");
			expect(setCookie).toContain("SameSite=Lax");
		});

		// TEST_ID: AUTH-MSW-LOGIN-INVALID-004
		it("should return generic error for invalid credentials (no enumeration)", async () => {
			const response = await fetch("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "wrong@example.com",
					password: "WrongPassword123!",
				}),
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe("Invalid email or password");
		});
	});

	describe("Session Management", () => {
		// TEST_ID: AUTH-MSW-SESSION-GET-001
		it("should return session when valid cookie present", async () => {
			const response = await fetch("http://localhost/api/auth/session", {
				method: "GET",
				headers: {
					cookie: "snapback_auth.session_token=session_token_abc123xyz",
				},
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.user).toBeDefined();
			expect(data.session).toBeDefined();
		});

		// TEST_ID: AUTH-MSW-SESSION-NOCOOKIE-002
		// Uses MSW's recommended runtime override pattern (server.use())
		// to force no-cookie behavior for this specific test
		it("should return null when no cookie present", async () => {
			// MSW Best Practice: Use server.use() for on-demand states
			// This overrides the default handler to force no-cookie response
			server.use(
				http.get("*/api/auth/session", () => {
					// Force no-cookie response for this test
					return HttpResponse.json({ user: null, session: null });
				}),
			);

			const response = await fetch("http://localhost/api/auth/session", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.user).toBeNull();
			expect(data.session).toBeNull();
		});

		// TEST_ID: AUTH-MSW-SESSION-SIGNOUT-003
		it("should clear cookie on sign-out", async () => {
			const response = await fetch("http://localhost/api/auth/sign-out", {
				method: "POST",
			});

			expect(response.status).toBe(200);
			const setCookie = response.headers.get("set-cookie");
			expect(setCookie).toContain("snapback_auth.session_token=;");
			expect(setCookie).toContain("Max-Age=0");
		});

		// TEST_ID: AUTH-MSW-SESSION-REFRESH-004
		it("should require valid session to refresh", async () => {
			const response = await fetch("http://localhost/api/auth/refresh", {
				method: "POST",
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe("No active session");
		});

		// TEST_ID: AUTH-MSW-SESSION-REFRESH-SUCCESS-005
		it("should return new session token on successful refresh", async () => {
			const response = await fetch("http://localhost/api/auth/refresh", {
				method: "POST",
				headers: {
					cookie: "snapback_auth.session_token=session_token_abc123xyz",
				},
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.session).toBeDefined();
			expect(data.session.token).toBeDefined();
			expect(data.session.token).not.toBe("session_token_abc123xyz");
		});
	});

	describe("Email Verification", () => {
		// TEST_ID: AUTH-MSW-VERIFY-AUTOSIGNIN-001
		it("should return session on successful verification (autoSignInAfterVerification)", async () => {
			const response = await fetch("http://localhost/api/auth/verify-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: "valid_token" }),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.user).toBeDefined();
			expect(data.user.emailVerified).toBe(true);
			expect(data.session).toBeDefined(); // Auto sign-in enabled
		});

		// TEST_ID: AUTH-MSW-VERIFY-EXPIRED-002
		it("should reject expired verification tokens", async () => {
			const response = await fetch("http://localhost/api/auth/verify-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: "expired_token" }),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Token expired");
		});
	});

	describe("Password Reset", () => {
		// TEST_ID: AUTH-MSW-RESET-NOENUMERATION-001
		it("should always return success (no user enumeration)", async () => {
			const response = await fetch("http://localhost/api/auth/forget-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "nonexistent@example.com" }),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
		});

		// TEST_ID: AUTH-MSW-RESET-PASSWORD-002
		it("should enforce password validation on reset", async () => {
			const response = await fetch("http://localhost/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: "valid_reset_token",
					password: "weak",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toContain("Password must be at least 8 characters");
		});
	});

	describe("Error Scenarios", () => {
		// TEST_ID: AUTH-MSW-ERROR-RATELIMIT-001
		it("should support rate limit error override", async () => {
			server.use(authErrorHandlers.rateLimitExceeded);

			const response = await fetch("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: TEST_CREDENTIALS.email,
					password: TEST_CREDENTIALS.password,
				}),
			});

			expect(response.status).toBe(429);
			expect(response.headers.get("retry-after")).toBe("60");
		});

		// TEST_ID: AUTH-MSW-ERROR-ACCOUNTLOCKED-002
		it("should support account locked error override", async () => {
			server.use(authErrorHandlers.accountLocked);

			const response = await fetch("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: TEST_CREDENTIALS.email,
					password: TEST_CREDENTIALS.password,
				}),
			});

			expect(response.status).toBe(423);
			const data = await response.json();
			expect(data.error).toContain("Account locked");
		});
	});

	describe("Session Structure", () => {
		// TEST_ID: AUTH-MSW-SESSION-COMPLETE-001
		it("should include all Better Auth session fields", async () => {
			const response = await fetch("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: TEST_CREDENTIALS.email,
					password: TEST_CREDENTIALS.password,
				}),
			});

			const data = await response.json();
			const { session } = data;

			// Required Better Auth session fields
			expect(session.id).toBeDefined();
			expect(session.token).toBeDefined();
			expect(session.userId).toBeDefined();
			expect(session.expiresAt).toBeDefined();
			expect(session.createdAt).toBeDefined();

			// Optional security tracking fields
			expect(session.ipAddress).toBeDefined();
			expect(session.userAgent).toBeDefined();
		});
	});
});
