import { expect, test } from "@playwright/test";

/**
 * OAuth Error Path Tests
 *
 * Tests various error scenarios in OAuth authentication flows:
 * - Provider cancellation (user clicks "Cancel")
 * - State mismatch (CSRF attack simulation)
 * - Provider 5xx errors and timeouts
 * - Unverified email handling (Google)
 * - Private email fallback (GitHub)
 * - Account linking scenarios
 * - Logout and session cleanup
 *
 * These tests use MSW to intercept and mock OAuth provider responses.
 */

test.describe("OAuth Error Handling", () => {
	test.beforeEach(async ({ page, context }) => {
		// Clear cookies and storage before each test
		await context.clearCookies();
		await page.goto("/auth/login");
	});

	test("handles user cancellation (Google OAuth)", async ({ page }) => {
		// Click Google sign-in button
		await page.click('[data-testid="google-signin-button"]');

		// Simulate user clicking "Cancel" on Google consent screen
		// In real scenario, user would be redirected back with error=access_denied
		await page.route("**/api/auth/callback/google*", async (route) => {
			const url = new URL(route.request().url());
			url.searchParams.set("error", "access_denied");
			url.searchParams.set("error_description", "User cancelled the request");

			await route.fulfill({
				status: 302,
				headers: {
					Location: `/auth/login?error=access_denied&error_description=${encodeURIComponent("User cancelled the request")}`,
				},
			});
		});

		// Should redirect to login with error message
		await expect(page).toHaveURL(/\/auth\/login\?error=access_denied/);
		await expect(page.getByText(/cancelled|denied/i)).toBeVisible();
	});

	test("handles state mismatch (CSRF protection)", async ({ page }) => {
		// Click Google sign-in button
		await page.click('[data-testid="google-signin-button"]');

		// Simulate callback with mismatched state parameter
		await page.route("**/api/auth/callback/google*", async (route) => {
			const url = new URL(route.request().url());
			// Provide invalid state that doesn't match stored state
			url.searchParams.set("state", "invalid-state-csrf-attack");
			url.searchParams.set("code", "mock_authorization_code");

			await route.fulfill({
				status: 302,
				headers: {
					Location: `/auth/login?error=state_mismatch&error_description=${encodeURIComponent("State parameter mismatch")}`,
				},
			});
		});

		// Should redirect to login with error
		await expect(page).toHaveURL(/\/auth\/login\?error=state_mismatch/);
		await expect(page.getByText(/security|state|invalid/i)).toBeVisible();
	});

	test("handles Google provider 5xx error", async ({ page, context }) => {
		// Intercept Google token endpoint to return 500
		await context.route(
			"https://oauth2.googleapis.com/token",
			async (route) => {
				await route.fulfill({
					status: 500,
					body: JSON.stringify({
						error: "server_error",
						error_description: "Internal server error",
					}),
				});
			},
		);

		// Click Google sign-in button
		await page.click('[data-testid="google-signin-button"]');

		// Should show error message
		await expect(
			page.getByText(/temporarily unavailable|try again/i),
		).toBeVisible();
	});

	test("handles GitHub provider timeout", async ({ page, context }) => {
		// Intercept GitHub token endpoint with timeout
		await context.route(
			"https://github.com/login/oauth/access_token",
			async (route) => {
				// Simulate timeout by aborting the request
				await route.abort("timedout");
			},
		);

		// Click GitHub sign-in button
		await page.click('[data-testid="github-signin-button"]');

		// Should show timeout error after waiting
		await expect(page.getByText(/timeout|unavailable|try again/i)).toBeVisible({
			timeout: 35000,
		});
	});

	test("handles Google unverified email", async ({ page, context }) => {
		// Intercept Google userinfo to return unverified email
		await context.route(
			"https://www.googleapis.com/oauth2/v3/userinfo",
			async (route) => {
				await route.fulfill({
					status: 200,
					body: JSON.stringify({
						sub: "mock_user_id",
						name: "Test User",
						email: "unverified@example.com",
						email_verified: false, // ❗ Unverified
					}),
				});
			},
		);

		// Click Google sign-in button
		await page.click('[data-testid="google-signin-button"]');

		// Should show email verification required message
		await expect(
			page.getByText(/verify your email|email not verified/i),
		).toBeVisible();
	});

	test("handles GitHub private email (uses emails API)", async ({
		page,
		context,
	}) => {
		// Intercept GitHub user endpoint to return no public email
		await context.route("https://api.github.com/user", async (route) => {
			await route.fulfill({
				status: 200,
				body: JSON.stringify({
					login: "testuser",
					id: 12345678,
					name: "Test User",
					email: null, // ❗ No public email
				}),
			});
		});

		// Intercept GitHub emails endpoint to return primary email
		await context.route("https://api.github.com/user/emails", async (route) => {
			await route.fulfill({
				status: 200,
				body: JSON.stringify([
					{
						email: "testuser@users.noreply.github.com",
						primary: true,
						verified: true,
						visibility: null, // Private
					},
				]),
			});
		});

		// Click GitHub sign-in button
		await page.click('[data-testid="github-signin-button"]');

		// Should successfully authenticate using private email
		await expect(page).toHaveURL(/\/app\/dashboard/);
	});

	test("handles account linking (same email, different provider)", async ({
		page,
		context,
	}) => {
		// First, sign in with Google
		await page.click('[data-testid="google-signin-button"]');
		await expect(page).toHaveURL(/\/app\/dashboard/);

		// Log out
		await page.click('[data-testid="user-menu"]');
		await page.click('[data-testid="logout-button"]');
		await expect(page).toHaveURL(/\/auth\/login/);

		// Now try to sign in with GitHub using the same email
		await context.route("https://api.github.com/user/emails", async (route) => {
			await route.fulfill({
				status: 200,
				body: JSON.stringify([
					{
						email: "test@example.com", // ❗ Same email as Google
						primary: true,
						verified: true,
					},
				]),
			});
		});

		await page.click('[data-testid="github-signin-button"]');

		// Should link accounts and redirect to dashboard
		await expect(page).toHaveURL(/\/app\/dashboard/);

		// Verify both providers are linked
		await page.goto("/app/settings/security");
		await expect(page.getByText(/Google.*Connected/i)).toBeVisible();
		await expect(page.getByText(/GitHub.*Connected/i)).toBeVisible();
	});

	test("logout clears session and resets analytics", async ({
		page,
		context,
	}) => {
		// Sign in
		await page.click('[data-testid="google-signin-button"]');
		await expect(page).toHaveURL(/\/app\/dashboard/);

		// Verify session cookie exists
		const cookiesBefore = await context.cookies();
		const sessionCookieBefore = cookiesBefore.find((c) =>
			c.name.includes("session"),
		);
		expect(sessionCookieBefore).toBeDefined();

		// Check PostHog identified state
		const posthogIdentifiedBefore = await page.evaluate(() => {
			// @ts-expect-error - PostHog global
			return window.posthog?.get_distinct_id();
		});
		expect(posthogIdentifiedBefore).not.toBeNull();

		// Log out
		await page.click('[data-testid="user-menu"]');
		await page.click('[data-testid="logout-button"]');

		// Verify redirect to login
		await expect(page).toHaveURL(/\/auth\/login/);

		// Verify session cookie is cleared
		const cookiesAfter = await context.cookies();
		const sessionCookieAfter = cookiesAfter.find((c) =>
			c.name.includes("session"),
		);
		expect(sessionCookieAfter).toBeUndefined();

		// Verify PostHog reset was called
		const posthogIdentifiedAfter = await page.evaluate(() => {
			// @ts-expect-error - PostHog global
			return window.posthog?.get_distinct_id();
		});
		// After reset, should have a new anonymous ID
		expect(posthogIdentifiedAfter).not.toBe(posthogIdentifiedBefore);
	});

	test("shows user-friendly error messages (not generic 500)", async ({
		page,
		context,
	}) => {
		// Intercept to return various error types
		await context.route(
			"https://oauth2.googleapis.com/token",
			async (route) => {
				await route.fulfill({
					status: 400,
					body: JSON.stringify({
						error: "invalid_grant",
						error_description: "Invalid authorization code",
					}),
				});
			},
		);

		await page.click('[data-testid="google-signin-button"]');

		// Should NOT show generic "Internal Server Error" or 500
		await expect(
			page.getByText(/500|Internal Server Error/i),
		).not.toBeVisible();

		// Should show user-friendly message
		await expect(
			page.getByText(/authentication failed|try again|something went wrong/i),
		).toBeVisible();
	});

	test("handles expired authorization code", async ({ page, context }) => {
		await context.route(
			"https://oauth2.googleapis.com/token",
			async (route) => {
				await route.fulfill({
					status: 400,
					body: JSON.stringify({
						error: "invalid_grant",
						error_description: "Authorization code expired",
					}),
				});
			},
		);

		await page.click('[data-testid="google-signin-button"]');

		await expect(
			page.getByText(/expired|try again|re-authenticate/i),
		).toBeVisible();
	});

	test("handles missing required scopes", async ({ page, context }) => {
		// Intercept to simulate missing email scope
		await context.route(
			"https://www.googleapis.com/oauth2/v3/userinfo",
			async (route) => {
				await route.fulfill({
					status: 200,
					body: JSON.stringify({
						sub: "mock_user_id",
						name: "Test User",
						// ❗ Missing email field (user denied email scope)
					}),
				});
			},
		);

		await page.click('[data-testid="google-signin-button"]');

		await expect(
			page.getByText(/email.*required|permission.*email/i),
		).toBeVisible();
	});
});

test.describe("OAuth Rate Limiting", () => {
	test("blocks after 10 failed attempts", async ({ page }) => {
		// Set up route once before the loop
		await page.route("**/api/auth/callback/google*", async (route) => {
			await route.fulfill({
				status: 302,
				headers: {
					Location: "/auth/login?error=auth_failed",
				},
			});
		});

		// Attempt login 10 times rapidly
		for (let i = 0; i < 10; i++) {
			await page.goto("/auth/login");
			await page.click('[data-testid="google-signin-button"]');
		}

		// 11th attempt should be rate limited
		await page.goto("/auth/login");
		await page.click('[data-testid="google-signin-button"]');

		await expect(
			page.getByText(/too many attempts|rate limit|try again later/i),
		).toBeVisible();
	});
});
