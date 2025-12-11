/**
 * API Mocking Utilities
 *
 * Centralized API mocking for consistent test data across all E2E tests.
 * Follows industry best practices for mock management.
 */

import type { Page } from "@playwright/test";

/**
 * Mock user data structure
 */
export interface MockUser {
	id: string;
	email: string;
	name: string;
}

/**
 * Mock session data structure
 */
export interface MockSession {
	id: string;
	token: string;
}

/**
 * Mock API response
 */
export interface MockAuthResponse {
	user: MockUser;
	session: MockSession;
}

/**
 * API Mocker - Centralized mock management
 */
export class ApiMocker {
	constructor(private page: Page) {}

	/**
	 * Mock successful email/password authentication
	 */
	async mockSuccessfulAuth(email: string): Promise<void> {
		await this.page.route("**/api/auth/sign-in/email", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					user: {
						id: `user_${Date.now()}`,
						email,
						name: email.split("@")[0],
					},
					session: {
						id: `session_${Date.now()}`,
						token: `token_${Date.now()}`,
					},
				} as MockAuthResponse),
			});
		});
	}

	/**
	 * Mock authentication failure
	 */
	async mockAuthFailure(errorMessage = "Invalid email or password"): Promise<void> {
		await this.page.route("**/api/auth/sign-in/email", (route) => {
			route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({
					error: errorMessage,
					code: "INVALID_CREDENTIALS",
				}),
			});
		});
	}

	/**
	 * Mock successful signup
	 */
	async mockSuccessfulSignup(email: string): Promise<void> {
		await this.page.route("**/api/auth/sign-up/email", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					user: {
						id: `user_signup_${Date.now()}`,
						email,
						name: email.split("@")[0],
					},
					session: {
						id: `session_signup_${Date.now()}`,
						token: `signup_token_${Date.now()}`,
					},
				} as MockAuthResponse),
			});
		});
	}

	/**
	 * Mock duplicate email error
	 */
	async mockDuplicateEmail(): Promise<void> {
		await this.page.route("**/api/auth/sign-up/email", (route) => {
			route.fulfill({
				status: 400,
				contentType: "application/json",
				body: JSON.stringify({
					error: "Email already in use",
					code: "EMAIL_EXISTS",
				}),
			});
		});
	}

	/**
	 * Mock successful magic link send
	 */
	async mockMagicLinkSuccess(): Promise<void> {
		await this.page.route("**/api/auth/sign-in/magic-link", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true }),
			});
		});
	}

	/**
	 * Mock magic link failure
	 */
	async mockMagicLinkFailure(): Promise<void> {
		await this.page.route("**/api/auth/sign-in/magic-link", (route) => {
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ error: "Failed to send magic link" }),
			});
		});
	}

	/**
	 * Mock GitHub OAuth redirect
	 */
	async mockGitHubOAuth(): Promise<void> {
		await this.page.route("**/api/auth/sign-in/github", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: "https://github.com/login/oauth/authorize?client_id=test",
				},
			});
		});
	}

	/**
	 * Mock Google OAuth redirect
	 */
	async mockGoogleOAuth(): Promise<void> {
		await this.page.route("**/api/auth/sign-in/google", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: "https://accounts.google.com/o/oauth2/auth?client_id=test",
				},
			});
		});
	}

	/**
	 * Mock OAuth failure
	 */
	async mockOAuthFailure(): Promise<void> {
		await this.page.route("**/api/auth/sign-in/{github,google}", (route) => {
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ error: "Failed to connect to OAuth provider" }),
			});
		});
	}

	/**
	 * Mock session check (authenticated)
	 */
	async mockAuthenticatedSession(email: string): Promise<void> {
		await this.page.route("**/api/auth/get-session", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					user: {
						id: `user_${Date.now()}`,
						email,
						name: email.split("@")[0],
					},
					session: {
						token: `valid_token_${Date.now()}`,
					},
				}),
			});
		});
	}

	/**
	 * Mock session check (unauthenticated)
	 */
	async mockUnauthenticatedSession(): Promise<void> {
		await this.page.route("**/api/auth/get-session", (route) => {
			route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ error: "Not authenticated" }),
			});
		});
	}

	/**
	 * Mock dashboard metrics
	 */
	async mockDashboardMetrics(data = {}): Promise<void> {
		const defaultMetrics = {
			snapshotsCreated: 0,
			aiDetections: 0,
			filesProtected: 0,
			storageUsed: 0,
			...data,
		};

		await this.page.route("**/api/metrics/**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(defaultMetrics),
			});
		});
	}

	/**
	 * Mock API keys list
	 */
	async mockAPIKeysList(keys: any[] = []): Promise<void> {
		await this.page.route("**/api/settings/api-keys", (route) => {
			if (route.request().method() === "GET") {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(keys),
				});
			} else {
				route.continue();
			}
		});
	}

	/**
	 * Mock API key creation
	 */
	async mockAPIKeyCreation(name: string): Promise<void> {
		const generatedKey = `sk_live_${Date.now()}_${Math.random().toString(36).substring(7)}`;

		await this.page.route("**/api/settings/api-keys", (route) => {
			if (route.request().method() === "POST") {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						id: `key_${Date.now()}`,
						name,
						key: generatedKey,
						preview: `sk_live_****${generatedKey.slice(-4)}`,
						createdAt: new Date().toISOString(),
					}),
				});
			} else {
				route.continue();
			}
		});
	}

	/**
	 * Clear all route handlers
	 */
	async clearMocks(): Promise<void> {
		await this.page.unrouteAll({ behavior: "ignoreErrors" });
	}
}

/**
 * Factory function to create API mocker
 */
export function createApiMocker(page: Page): ApiMocker {
	return new ApiMocker(page);
}
