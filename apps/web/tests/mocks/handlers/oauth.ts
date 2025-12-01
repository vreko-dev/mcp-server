import { HttpResponse, http } from "msw";

/**
 * MSW Handlers for OAuth Provider Mocking
 *
 * These handlers mock Google and GitHub OAuth flows for testing.
 * They intercept network requests to OAuth provider endpoints and return
 * mock responses to enable offline testing of authentication flows.
 */

// Google OAuth Handlers
export const googleOAuthHandlers = [
	// Mock Google OAuth token endpoint
	http.post("https://oauth2.googleapis.com/token", () => {
		return HttpResponse.json({
			access_token: "mock_google_access_token",
			expires_in: 3600,
			token_type: "Bearer",
			scope: "openid email profile",
			id_token: "mock_google_id_token",
		});
	}),

	// Mock Google userinfo endpoint
	http.get("https://www.googleapis.com/oauth2/v3/userinfo", () => {
		return HttpResponse.json({
			sub: "mock_google_user_id",
			name: "Test User",
			given_name: "Test",
			family_name: "User",
			picture: "https://example.com/avatar.jpg",
			email: "test@example.com",
			email_verified: true,
			locale: "en",
		});
	}),

	// Mock Google userinfo endpoint (alternative)
	http.get("https://www.googleapis.com/oauth2/v2/userinfo", () => {
		return HttpResponse.json({
			id: "mock_google_user_id",
			name: "Test User",
			given_name: "Test",
			family_name: "User",
			picture: "https://example.com/avatar.jpg",
			email: "test@example.com",
			verified_email: true,
			locale: "en",
		});
	}),
];

// GitHub OAuth Handlers
export const githubOAuthHandlers = [
	// Mock GitHub OAuth token endpoint
	http.post("https://github.com/login/oauth/access_token", () => {
		return HttpResponse.json({
			access_token: "mock_github_access_token",
			token_type: "bearer",
			scope: "user:email",
		});
	}),

	// Mock GitHub user endpoint
	http.get("https://api.github.com/user", () => {
		return HttpResponse.json({
			login: "testuser",
			id: 12345678,
			node_id: "MDQ6VXNlcjEyMzQ1Njc4",
			avatar_url: "https://avatars.githubusercontent.com/u/12345678",
			name: "Test User",
			email: "test@example.com",
			bio: "Test user for OAuth testing",
			location: "Test City",
			created_at: "2020-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z",
		});
	}),

	// Mock GitHub user emails endpoint (for private email handling)
	http.get("https://api.github.com/user/emails", () => {
		return HttpResponse.json([
			{
				email: "test@example.com",
				primary: true,
				verified: true,
				visibility: "public",
			},
			{
				email: "12345678+testuser@users.noreply.github.com",
				primary: false,
				verified: true,
				visibility: null,
			},
		]);
	}),
];

// Error scenario handlers (for testing error paths)
export const oauthErrorHandlers = [
	// Google OAuth token error (5xx server error)
	http.post(
		"https://oauth2.googleapis.com/token",
		() => {
			return new HttpResponse(null, {
				status: 500,
				statusText: "Internal Server Error",
			});
		},
		{ once: true },
	),

	// Google OAuth token error (invalid grant)
	http.post(
		"https://oauth2.googleapis.com/token",
		() => {
			return HttpResponse.json(
				{
					error: "invalid_grant",
					error_description: "Invalid authorization code",
				},
				{ status: 400 },
			);
		},
		{ once: true },
	),

	// GitHub OAuth timeout simulation
	http.post(
		"https://github.com/login/oauth/access_token",
		async () => {
			await new Promise((resolve) => setTimeout(resolve, 30000)); // 30s timeout
			return HttpResponse.json({
				access_token: "mock_github_access_token",
				token_type: "bearer",
				scope: "user:email",
			});
		},
		{ once: true },
	),

	// Google unverified email scenario
	http.get(
		"https://www.googleapis.com/oauth2/v3/userinfo",
		() => {
			return HttpResponse.json({
				sub: "mock_google_user_id",
				name: "Test User",
				email: "unverified@example.com",
				email_verified: false, // Unverified email
			});
		},
		{ once: true },
	),

	// GitHub private email scenario (no public email)
	http.get(
		"https://api.github.com/user",
		() => {
			return HttpResponse.json({
				login: "testuser",
				id: 12345678,
				avatar_url: "https://avatars.githubusercontent.com/u/12345678",
				name: "Test User",
				email: null, // No public email
			});
		},
		{ once: true },
	),
];

// Combined handlers for easy import
export const oauthHandlers = [...googleOAuthHandlers, ...githubOAuthHandlers];

// All handlers including error scenarios
export const allOAuthHandlers = [
	...googleOAuthHandlers,
	...githubOAuthHandlers,
	...oauthErrorHandlers,
];
