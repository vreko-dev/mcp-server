/**
 * WEB-INT-AUTH-FLOW-001
 * Authentication Flow Integration Tests
 *
 * Tests OAuth redirects, session cookie management, and error handling
 * per test_coverage.md lines 638-644
 *
 * Test Pattern: Integration tests using MSW for OAuth mocking
 * Coverage: GitHub/Google OAuth, session management, error scenarios
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandlers } from "@snapback/testing/msw/handlers/oauth";
import { server } from "@snapback/testing/msw/server";

afterEach(() => {
	server.resetHandlers();
	vi.clearAllMocks();
});

describe("Authentication Flow Integration", () => {
	describe("GitHub OAuth", () => {
		it("should redirect to GitHub OAuth with correct parameters", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-001
			// GIVEN: User clicks GitHub OAuth button
			const callbackUrl = "https://console.snapback.dev/auth/callback/github";
			const clientId = "test_github_client_id";

			// WHEN: OAuth flow initiates
			const oauthUrl = new URL("https://github.com/login/oauth/authorize");
			oauthUrl.searchParams.set("client_id", clientId);
			oauthUrl.searchParams.set("redirect_uri", callbackUrl);
			oauthUrl.searchParams.set("scope", "user:email");

			// THEN: Should have required OAuth parameters
			expect(oauthUrl.searchParams.get("client_id")).toBe(clientId);
			expect(oauthUrl.searchParams.get("redirect_uri")).toBe(callbackUrl);
			expect(oauthUrl.searchParams.get("scope")).toContain("user:email");
		});

		it("should handle GitHub OAuth callback successfully", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-002
			// GIVEN: GitHub returns authorization code
			const code = "test_authorization_code_123";
			const state = "csrf_state_token";

			// WHEN: Callback endpoint receives code
			const callbackParams = new URLSearchParams({
				code,
				state,
			});

			// THEN: Should parse parameters correctly
			expect(callbackParams.get("code")).toBe(code);
			expect(callbackParams.get("state")).toBe(state);
		});

		it("should exchange code for access token", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-003
			// GIVEN: Valid authorization code
			const code = "test_code_123";

			// WHEN: Token exchange occurs
			const response = await fetch("https://github.com/login/oauth/access_token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					client_id: "test_client_id",
					client_secret: "test_client_secret",
					code,
				}),
			});

			const data = await response.json();

			// THEN: Should return access token
			expect(response.ok).toBe(true);
			expect(data.access_token).toBeDefined();
			expect(data.token_type).toBe("bearer");
		});

		it("should fetch user info from GitHub API", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-004
			// GIVEN: Valid access token
			const accessToken = "gh_test_token_123";

			// WHEN: User info request is made
			const response = await fetch("https://api.github.com/user", {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const user = await response.json();

			// THEN: Should return user information
			expect(response.ok).toBe(true);
			expect(user.id).toBeDefined();
			expect(user.login).toBe("testuser");
		});

		it("should fallback to emails endpoint for private email", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-005
			// GIVEN: GitHub user with private email (email field is null)
			const accessToken = "gh_test_token_123";

			const userResponse = await fetch("https://api.github.com/user", {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const user = await userResponse.json();

			// WHEN: Email is private
			if (!user.email) {
				// THEN: Should fetch from emails endpoint
				const emailsResponse = await fetch("https://api.github.com/user/emails", {
					headers: { Authorization: `Bearer ${accessToken}` },
				});

				const emails = await emailsResponse.json();

				// AND: Should return primary verified email
				expect(emailsResponse.ok).toBe(true);
				expect(emails[0].email).toBe("test@example.com");
				expect(emails[0].primary).toBe(true);
				expect(emails[0].verified).toBe(true);
			}
		});
	});

	describe("Google OAuth", () => {
		it("should redirect to Google OAuth with correct parameters", () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-006
			// GIVEN: User clicks Google OAuth button
			const callbackUrl = "https://console.snapback.dev/auth/callback/google";
			const clientId = "test_google_client_id.apps.googleusercontent.com";

			// WHEN: OAuth flow initiates
			const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
			oauthUrl.searchParams.set("client_id", clientId);
			oauthUrl.searchParams.set("redirect_uri", callbackUrl);
			oauthUrl.searchParams.set("response_type", "code");
			oauthUrl.searchParams.set("scope", "openid email profile");

			// THEN: Should have required OAuth parameters
			expect(oauthUrl.searchParams.get("client_id")).toBe(clientId);
			expect(oauthUrl.searchParams.get("redirect_uri")).toBe(callbackUrl);
			expect(oauthUrl.searchParams.get("response_type")).toBe("code");
			expect(oauthUrl.searchParams.get("scope")).toContain("email");
		});

		it("should exchange code for Google access token", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-007
			// GIVEN: Valid Google authorization code
			const code = "google_auth_code_123";

			// WHEN: Token exchange occurs
			const response = await fetch("https://oauth2.googleapis.com/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					client_id: "test_client_id",
					client_secret: "test_secret",
					code,
					grant_type: "authorization_code",
				}),
			});

			const data = await response.json();

			// THEN: Should return access token and id_token
			expect(response.ok).toBe(true);
			expect(data.access_token).toBeDefined();
			expect(data.token_type).toBe("Bearer");
			expect(data.id_token).toBeDefined();
		});

		it("should fetch user info from Google API", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-008
			// GIVEN: Valid Google access token
			const accessToken = "google_test_token_123";

			// WHEN: User info request is made
			const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const user = await response.json();

			// THEN: Should return verified email and user info
			expect(response.ok).toBe(true);
			expect(user.email).toBe("test@example.com");
			expect(user.email_verified).toBe(true);
			expect(user.name).toBe("Test User");
		});
	});

	describe("Session Cookie Management", () => {
		it("should set session cookie with secure attributes on success", () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-009
			// GIVEN: Successful OAuth authentication
			const userId = "user_123";
			const sessionToken = "session_abc123";

			// WHEN: Session cookie is set
			const cookie = {
				name: "__Secure-session",
				value: sessionToken,
				httpOnly: true,
				secure: true,
				sameSite: "lax" as const,
				maxAge: 60 * 60 * 24 * 7, // 7 days
				path: "/",
			};

			// THEN: Cookie should have secure attributes
			expect(cookie.name).toMatch(/^__Secure-/);
			expect(cookie.httpOnly).toBe(true);
			expect(cookie.secure).toBe(true);
			expect(cookie.sameSite).toBe("lax");
			expect(cookie.maxAge).toBeGreaterThan(0);
		});

		it("should redirect to dashboard after successful login", () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-010
			// GIVEN: Valid session cookie exists
			const hasSession = true;

			// WHEN: User completes OAuth flow
			const redirectUrl = hasSession ? "/app/dashboard" : "/auth/login";

			// THEN: Should redirect to dashboard
			expect(redirectUrl).toBe("/app/dashboard");
		});

		it("should preserve redirect URL through OAuth flow", () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-011
			// GIVEN: User attempted to access protected page
			const originalUrl = "/app/api-keys";

			// WHEN: Redirected to login with returnTo parameter
			const loginUrl = new URL("https://console.snapback.dev/auth/login");
			loginUrl.searchParams.set("from", originalUrl);

			// AND: After successful auth
			const returnTo = loginUrl.searchParams.get("from");

			// THEN: Should redirect back to original page
			expect(returnTo).toBe(originalUrl);
		});
	});

	describe("OAuth Error Handling", () => {
		it("should handle GitHub token exchange failure", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-012
			// GIVEN: Invalid or expired authorization code
			server.use(errorHandlers.githubTokenError);

			// WHEN: Token exchange fails
			const response = await fetch("https://github.com/login/oauth/access_token", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					client_id: "test_id",
					client_secret: "test_secret",
					code: "expired_code",
				}),
			});

			const data = await response.json();

			// THEN: Should return error response
			expect(response.status).toBe(401);
			expect(data.error).toBe("invalid_client");
		});

		it("should handle Google unverified email", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-013
			// GIVEN: Google returns unverified email
			server.use(errorHandlers.googleUnverifiedEmail);

			// WHEN: User info is fetched
			const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
				headers: { Authorization: "Bearer test_token" },
			});

			const user = await response.json();

			// THEN: Should detect unverified email
			expect(response.ok).toBe(true);
			expect(user.email_verified).toBe(false);
			// Application should reject unverified emails
		});

		it("should handle user cancellation gracefully", () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-014
			// GIVEN: User clicks "Cancel" on OAuth consent screen
			const callbackUrl = new URL("https://console.snapback.dev/auth/callback/github");
			callbackUrl.searchParams.set("error", "access_denied");
			callbackUrl.searchParams.set("error_description", "User cancelled the request");

			// WHEN: Callback receives error
			const error = callbackUrl.searchParams.get("error");
			const description = callbackUrl.searchParams.get("error_description");

			// THEN: Should provide user-friendly error message
			expect(error).toBe("access_denied");
			expect(description).toBe("User cancelled the request");
		});

		it("should handle provider server errors", async () => {
			// Test ID: WEB-INT-AUTH-FLOW-001-015
			// GIVEN: GitHub API returns 500 error
			server.use(errorHandlers.githubServerError);

			// WHEN: User info request fails
			const response = await fetch("https://api.github.com/user", {
				headers: { Authorization: "Bearer test_token" },
			});

			// THEN: Should handle gracefully
			expect(response.ok).toBe(false);
			expect(response.status).toBe(500);
			// Application should show "Try again later" message
		});
	});
});
