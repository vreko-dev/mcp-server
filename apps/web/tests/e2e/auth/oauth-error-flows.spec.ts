import { expect, test } from "@playwright/test";

test.describe("OAuth Error Handling", () => {
	test("should show error on token exchange failure", async ({ page }) => {
		// Mock token exchange failure (500 error)
		await page.route("https://oauth2.googleapis.com/token", (route) => {
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({
					error: "server_error",
					error_description: "Internal server error",
				}),
			});
		});

		await page.route("https://accounts.google.com/o/oauth2/**", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: `${page.url().split("?")[0]}/auth/callback/google?code=test_code`,
				},
			});
		});

		await page.goto("/auth/login");
		await page.click('button:has-text("Google")');

		// Should show error message
		const errorMessage = page.locator("text=/authentication.*failed/i");
		await expect(errorMessage).toBeVisible({ timeout: 10000 });

		// Should remain on login page
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test("should handle cancelled OAuth consent", async ({ page }) => {
		// Mock OAuth cancellation (user denied consent)
		await page.route("https://accounts.google.com/o/oauth2/**", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: `${page.url().split("?")[0]}/auth/callback/google?error=access_denied`,
				},
			});
		});

		await page.goto("/auth/login");
		await page.click('button:has-text("Google")');

		// Should show cancelled message
		const cancelledMessage = page.locator(
			"text=/sign.*in.*cancel|cancel.*sign.*in/i",
		);
		await expect(cancelledMessage).toBeVisible({ timeout: 10000 });

		// Should remain on login page
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test("should handle unverified email error", async ({ page }) => {
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

		// Return unverified email
		await page.route(
			"https://www.googleapis.com/oauth2/v3/userinfo",
			(route) => {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						sub: "google_test_user",
						email: "test@example.com",
						email_verified: false, // Not verified
						name: "Test User",
					}),
				});
			},
		);

		await page.goto("/auth/login");
		await page.click('button:has-text("Google")');

		// Should show email verification error
		const verifyMessage = page.locator("text=/verify.*email/i");
		await expect(verifyMessage).toBeVisible({ timeout: 10000 });

		// Should remain on login page
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test("should handle network timeout gracefully", async ({ page }) => {
		// Mock network timeout
		await page.route("https://oauth2.googleapis.com/token", (route) => {
			route.abort("timedout");
		});

		await page.route("https://accounts.google.com/o/oauth2/**", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: `${page.url().split("?")[0]}/auth/callback/google?code=test_code`,
				},
			});
		});

		await page.goto("/auth/login");
		await page.click('button:has-text("Google")');

		// Should show error or timeout message
		const errorMessage = page.locator(
			"text=/timeout|network|connection|failed/i",
		);
		await expect(errorMessage).toBeVisible({ timeout: 10000 });

		// Should remain on login page
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test("should show retry button for recoverable errors", async ({ page }) => {
		// Mock temporary server error
		await page.route("https://oauth2.googleapis.com/token", (route) => {
			route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({
					error: "temporarily_unavailable",
				}),
			});
		});

		await page.route("https://accounts.google.com/o/oauth2/**", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: `${page.url().split("?")[0]}/auth/callback/google?code=test_code`,
				},
			});
		});

		await page.goto("/auth/login");
		await page.click('button:has-text("Google")');

		// Should show error message
		await page.waitForSelector("text=/error|failed/i", { timeout: 10000 });

		// Should show retry option (Google button still visible)
		const googleButton = page.locator('button:has-text("Google")');
		await expect(googleButton).toBeVisible();
	});

	test("should handle GitHub private email scenario", async ({ page }) => {
		// Mock GitHub OAuth with private email
		await page.route("https://github.com/login/oauth/**", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: `${page.url().split("?")[0]}/auth/callback/github?code=test_code`,
				},
			});
		});

		await page.route("https://github.com/login/oauth/access_token", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					access_token: "gh_test_token",
					token_type: "bearer",
					scope: "user:email",
				}),
			});
		});

		// Return null email (private)
		await page.route("https://api.github.com/user", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					id: 12345,
					login: "testuser",
					name: "Test User",
					email: null, // Private email
				}),
			});
		});

		// Should then fetch from emails endpoint
		await page.route("https://api.github.com/user/emails", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{
						email: "test@example.com",
						primary: true,
						verified: true,
						visibility: "private",
					},
				]),
			});
		});

		await page.goto("/auth/login");

		// Click GitHub button (if available)
		const githubButton = page.locator('button:has-text("GitHub")');
		if (await githubButton.isVisible()) {
			await githubButton.click();

			// Should successfully sign in with fallback email
			await page.waitForURL("/app/dashboard", { timeout: 10000 });
			await expect(page).toHaveURL("/app/dashboard");
		}
	});

	test("should handle account already linked error", async ({ page }) => {
		await page.route("https://accounts.google.com/o/oauth2/**", (route) => {
			route.fulfill({
				status: 302,
				headers: {
					Location: `${page.url().split("?")[0]}/auth/callback/google?error=account_already_linked`,
				},
			});
		});

		await page.goto("/auth/login");
		await page.click('button:has-text("Google")');

		// Should show account linked error
		const linkedMessage = page.locator(
			"text=/already.*linked|linked.*account/i",
		);
		await expect(linkedMessage).toBeVisible({ timeout: 10000 });

		// Should remain on login page
		await expect(page).toHaveURL(/\/auth\/login/);

		// Error should suggest using different account
		const differentAccount = page.locator("text=/different.*account/i");
		await expect(differentAccount).toBeVisible({ timeout: 5000 });
	});
});
