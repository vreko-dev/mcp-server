import { expect, test } from "@playwright/test";

test.describe("Google OAuth Sign-In", () => {
	test("should complete Google sign-in flow successfully", async ({ page }) => {
		// Intercept Google OAuth endpoints
		await page.route("https://accounts.google.com/o/oauth2/**", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: `${page.url().split("?")[0]}/auth/callback/google?code=test_code_google_123`,
				},
			});
		});

		await page.route("https://oauth2.googleapis.com/token", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					access_token: "test_google_token_987654321",
					token_type: "Bearer",
					expires_in: 3600,
					id_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.token",
				}),
			});
		});

		await page.route(
			"https://www.googleapis.com/oauth2/v3/userinfo",
			(route) => {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						sub: "google_test_123456789",
						email: "test@example.com",
						email_verified: true,
						name: "Test User",
						picture: "https://lh3.googleusercontent.com/a/test",
						given_name: "Test",
						family_name: "User",
					}),
				});
			},
		);

		// Navigate to login page
		await page.goto("/auth/login");

		// Click Google sign-in button
		const googleButton = page.locator('button:has-text("Google")');
		await expect(googleButton).toBeVisible();
		await googleButton.click();

		// Should redirect to dashboard after successful sign-in
		await page.waitForURL("/app/dashboard", { timeout: 10000 });
		await expect(page).toHaveURL("/app/dashboard");

		// Verify user is authenticated
		const userMenu = page.locator('[data-testid="user-menu"]');
		await expect(userMenu).toBeVisible({ timeout: 5000 });
	});

	test("should persist session on page refresh", async ({ page }) => {
		// Setup OAuth mocks
		await page.route("https://accounts.google.com/o/oauth2/**", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: `${page.url().split("?")[0]}/auth/callback/google?code=test_code`,
				},
			});
		});

		await page.route("https://oauth2.googleapis.com/token", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					access_token: "test_token",
					token_type: "Bearer",
					expires_in: 3600,
				}),
			});
		});

		await page.route(
			"https://www.googleapis.com/oauth2/v3/userinfo",
			(route) => {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						sub: "google_test_user",
						email: "test@example.com",
						email_verified: true,
						name: "Test User",
					}),
				});
			},
		);

		// Sign in
		await page.goto("/auth/login");
		await page.click('button:has-text("Google")');

		// Wait for dashboard
		await page.waitForURL("/app/dashboard");

		// Refresh page
		await page.reload();

		// Should still be on dashboard (session persisted)
		await expect(page).toHaveURL("/app/dashboard");

		// User should still be authenticated
		const userMenu = page.locator('[data-testid="user-menu"]');
		await expect(userMenu).toBeVisible({ timeout: 5000 });
	});

	test("should redirect to invitation page when invitation ID present", async ({
		page,
	}) => {
		// Setup OAuth mocks
		await page.route("https://accounts.google.com/o/oauth2/**", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: `${page.url().split("?")[0]}/auth/callback/google?code=test_code`,
				},
			});
		});

		await page.route("https://oauth2.googleapis.com/token", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					access_token: "test_token",
					token_type: "Bearer",
					expires_in: 3600,
				}),
			});
		});

		await page.route(
			"https://www.googleapis.com/oauth2/v3/userinfo",
			(route) => {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						sub: "google_test_user",
						email: "test@example.com",
						email_verified: true,
						name: "Test User",
					}),
				});
			},
		);

		const invitationId = "test_invitation_123";

		// Navigate to login with invitation ID
		await page.goto(`/auth/login?invitationId=${invitationId}`);

		// Click Google sign-in
		await page.click('button:has-text("Google")');

		// Should redirect to organization invitation page
		await page.waitForURL(`/organization-invitation/${invitationId}`, {
			timeout: 10000,
		});
		await expect(page).toHaveURL(`/organization-invitation/${invitationId}`);
	});
});
