/**
 * OAuth Mock Handlers for MSW
 *
 * Provides mock implementations of GitHub and Google OAuth flows
 * for testing authentication without real OAuth providers.
 *
 * @example
 * ```typescript
 * import { server } from "@snapback/testing/msw/server";
 * import { githubHandlers, errorHandlers } from "@snapback/testing/msw/handlers/oauth";
 *
 * // Use error scenario in specific test
 * server.use(errorHandlers.githubTokenError);
 * ```
 */

import { HttpResponse, http } from "msw";

/**
 * GitHub OAuth mock handlers
 * Simulates the GitHub OAuth flow for testing
 */
export const githubHandlers = [
	// GitHub OAuth token exchange
	http.post("https://github.com/login/oauth/access_token", () =>
		HttpResponse.json({
			access_token: "gh_test_token_123456789",
			token_type: "bearer",
			scope: "user:email",
		}),
	),

	// GitHub user info endpoint
	http.get("https://api.github.com/user", () =>
		HttpResponse.json({
			id: 12345,
			login: "testuser",
			name: "Test User",
			email: null, // Test private email scenario
			avatar_url: "https://avatars.githubusercontent.com/u/12345",
		}),
	),

	// GitHub emails endpoint (for private email fallback)
	http.get("https://api.github.com/user/emails", () =>
		HttpResponse.json([
			{
				email: "test@example.com",
				primary: true,
				verified: true,
				visibility: "private",
			},
		]),
	),
];

/**
 * Google OAuth mock handlers
 * Simulates the Google OAuth flow for testing
 */
export const googleHandlers = [
	// Google OAuth token exchange
	http.post("https://oauth2.googleapis.com/token", () =>
		HttpResponse.json({
			access_token: "google_test_token_987654321",
			token_type: "Bearer",
			expires_in: 3600,
			id_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.token",
		}),
	),

	// Google user info endpoint
	http.get("https://www.googleapis.com/oauth2/v3/userinfo", () =>
		HttpResponse.json({
			sub: "google123456789",
			email: "test@example.com",
			email_verified: true,
			name: "Test User",
			picture: "https://lh3.googleusercontent.com/a/test",
			given_name: "Test",
			family_name: "User",
		}),
	),
];

/**
 * Error scenario handlers
 * Mock various OAuth failure scenarios for testing error handling
 */
export const errorHandlers = {
	// GitHub token exchange failure
	githubTokenError: http.post("https://github.com/login/oauth/access_token", () =>
		HttpResponse.json({ error: "invalid_client" }, { status: 401 }),
	),

	// GitHub server error
	githubServerError: http.get("https://api.github.com/user", () => new HttpResponse(null, { status: 500 })),

	// Google token exchange failure
	googleTokenError: http.post("https://oauth2.googleapis.com/token", () =>
		HttpResponse.json(
			{
				error: "invalid_grant",
				error_description: "Code expired",
			},
			{ status: 400 },
		),
	),

	// Google unverified email
	googleUnverifiedEmail: http.get("https://www.googleapis.com/oauth2/v3/userinfo", () =>
		HttpResponse.json({
			sub: "google123456789",
			email: "test@example.com",
			email_verified: false, // Not verified
			name: "Test User",
		}),
	),
};

/**
 * All OAuth handlers combined
 */
export const oauthHandlers = [...githubHandlers, ...googleHandlers];
