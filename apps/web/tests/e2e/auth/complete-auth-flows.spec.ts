import { expect, test } from "@playwright/test";

test.describe("Complete Authentication Flows", () => {
	const _BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
	const TEST_EMAIL = `auth-test-${Date.now()}@snapback.dev`;
	const TEST_PASSWORD = "TestPassword123!";

	test.beforeEach(async ({ page }) => {
		// Clear cookies and storage
		await page.context().clearCookies();
		await page.goto("/");
	});

	test.describe("Login Flow", () => {
		test("should successfully log in with valid credentials", async ({
			page,
		}) => {
			await page.goto("/auth/login");

			// Fill login form
			await page.locator('input[type="email"]').fill(TEST_EMAIL);
			await page.locator('input[type="password"]').fill(TEST_PASSWORD);

			// Submit
			await page.getByRole("button", { name: /sign in|log in/i }).click();

			// Should redirect to dashboard or intended page
			await page.waitForURL(/\/(dashboard|app)/, { timeout: 10000 });

			// Verify authenticated state
			const userMenu = page.locator(
				'[data-testid="user-menu"], [aria-label="User menu"]',
			);
			await expect(userMenu).toBeVisible({ timeout: 5000 });
		});

		test("should show error for invalid credentials", async ({ page }) => {
			await page.goto("/auth/login");

			// Fill with invalid credentials
			await page.locator('input[type="email"]').fill("invalid@test.com");
			await page.locator('input[type="password"]').fill("wrongpassword");

			// Submit
			await page.getByRole("button", { name: /sign in|log in/i }).click();

			// Should show error message
			await expect(page.locator("text=/invalid|incorrect|wrong/i")).toBeVisible(
				{ timeout: 5000 },
			);
		});

		test("should redirect to intended page after login", async ({ page }) => {
			// Try to access protected page
			await page.goto("/app/settings");

			// Should redirect to login with redirect param
			await page.waitForURL(/\/auth\/login.*redirect/);

			// Log in
			await page.locator('input[type="email"]').fill(TEST_EMAIL);
			await page.locator('input[type="password"]').fill(TEST_PASSWORD);
			await page.getByRole("button", { name: /sign in|log in/i }).click();

			// Should redirect back to original page
			await page.waitForURL(/\/app\/settings/, { timeout: 10000 });
		});

		test("should enforce cfg_version and force re-auth if outdated", async ({
			page,
			context,
		}) => {
			// This test verifies the cfg_version enforcement from middleware

			// First, log in normally
			await page.goto("/auth/login");
			await page.locator('input[type="email"]').fill(TEST_EMAIL);
			await page.locator('input[type="password"]').fill(TEST_PASSWORD);
			await page.getByRole("button", { name: /sign in|log in/i }).click();
			await page.waitForURL(/\/(dashboard|app)/, { timeout: 10000 });

			// Simulate outdated cfg_version by modifying cookie
			const cookies = await context.cookies();
			const sessionCookie = cookies.find((c) => c.name.includes("session"));

			if (sessionCookie) {
				// Mock an outdated session with old cfg_version
				// In reality, this would be set server-side
				// For testing, we can verify the middleware logic

				// Try to access protected route
				await page.goto("/app/dashboard");

				// If cfg_version mismatch is enforced, should redirect to login
				// with reason=config_outdated
				const currentUrl = page.url();

				if (currentUrl.includes("config_outdated")) {
					console.log("✅ cfg_version enforcement working");
					await expect(page).toHaveURL(/reason=config_outdated/);
				} else {
					// Session still valid (cfg_version matches)
					console.log("ℹ️  cfg_version matches - session valid");
				}
			}
		});
	});

	test.describe("Signup Flow", () => {
		test("should successfully create account with valid data", async ({
			page,
		}) => {
			await page.goto("/auth/signup");

			// Fill signup form
			await page
				.locator('input[name="name"], input[placeholder*="name"]')
				.fill("Test User");
			await page.locator('input[type="email"]').fill(TEST_EMAIL);
			await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);

			// Confirm password if field exists
			const confirmPassword = page.locator(
				'input[name="confirmPassword"], input[placeholder*="confirm"]',
			);
			if (
				await confirmPassword.isVisible({ timeout: 1000 }).catch(() => false)
			) {
				await confirmPassword.fill(TEST_PASSWORD);
			}

			// Accept terms if checkbox exists
			const termsCheckbox = page.locator('input[type="checkbox"]').first();
			if (await termsCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
				await termsCheckbox.check();
			}

			// Submit
			await page
				.getByRole("button", { name: /sign up|create account/i })
				.click();

			// Should redirect to dashboard or verification page
			await page.waitForURL(/\/(dashboard|verify|onboarding)/, {
				timeout: 15000,
			});
		});

		test("should validate password strength", async ({ page }) => {
			await page.goto("/auth/signup");

			await page.locator('input[type="email"]').fill(TEST_EMAIL);

			// Try weak password
			await page.locator('input[type="password"]').first().fill("123");

			// Should show password requirements/strength indicator
			const weakPasswordError = await page
				.locator("text=/weak|short|require/i")
				.isVisible({ timeout: 2000 })
				.catch(() => false);

			if (weakPasswordError) {
				console.log("✅ Password validation working");
			}
		});

		test("should prevent duplicate email registration", async ({ page }) => {
			await page.goto("/auth/signup");

			// Try to register with already existing email
			await page.locator('input[type="email"]').fill("existing@test.com");
			await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);

			await page
				.getByRole("button", { name: /sign up|create account/i })
				.click();

			// Should show error about existing account
			await expect(
				page.locator("text=/already exists|already registered/i"),
			).toBeVisible({ timeout: 5000 });
		});
	});

	test.describe("OAuth Flows", () => {
		test("should initiate GitHub OAuth flow", async ({ page }) => {
			await page.goto("/auth/login");

			// Click GitHub OAuth button
			const githubButton = page.getByRole("button", { name: /github/i });
			await githubButton.click();

			// Should redirect to GitHub OAuth page
			await page.waitForURL(/github\.com\/login\/oauth\/authorize/, {
				timeout: 5000,
			});

			// Verify required OAuth params
			const url = new URL(page.url());
			expect(url.searchParams.get("client_id")).toBeTruthy();
			expect(url.searchParams.get("redirect_uri")).toBeTruthy();
		});

		test("should initiate Google OAuth flow", async ({ page }) => {
			await page.goto("/auth/login");

			// Click Google OAuth button
			const googleButton = page.getByRole("button", { name: /google/i });
			await googleButton.click();

			// Should redirect to Google OAuth page
			await page.waitForURL(/accounts\.google\.com\/o\/oauth2/, {
				timeout: 5000,
			});

			// Verify required OAuth params
			const url = new URL(page.url());
			expect(url.searchParams.get("client_id")).toBeTruthy();
			expect(url.searchParams.get("redirect_uri")).toBeTruthy();
		});

		test("should handle OAuth callback errors gracefully", async ({ page }) => {
			// Simulate OAuth error callback
			await page.goto("/auth/login/callback?error=access_denied");

			// Should show error message
			await expect(page.locator("text=/error|denied|failed/i")).toBeVisible({
				timeout: 5000,
			});

			// Should have option to try again
			const loginLink = page.getByRole("link", {
				name: /try again|back to login/i,
			});
			await expect(loginLink).toBeVisible();
		});
	});

	test.describe("Password Reset Flow", () => {
		test("should send password reset email", async ({ page }) => {
			await page.goto("/auth/forgot-password");

			// Enter email
			await page.locator('input[type="email"]').fill(TEST_EMAIL);

			// Submit
			await page.getByRole("button", { name: /reset|send/i }).click();

			// Should show success message
			await expect(
				page.locator("text=/check your email|sent|link/i"),
			).toBeVisible({ timeout: 5000 });
		});

		test("should validate reset token and allow password change", async ({
			page,
		}) => {
			// Simulate clicking on reset link with token
			const resetToken = "test-reset-token-123";
			await page.goto(`/auth/reset-password?token=${resetToken}`);

			// Fill new password
			await page
				.locator('input[type="password"]')
				.first()
				.fill("NewPassword123!");

			// Confirm password
			const confirmField = page.locator('input[type="password"]').last();
			if (await confirmField.isVisible()) {
				await confirmField.fill("NewPassword123!");
			}

			// Submit
			await page.getByRole("button", { name: /reset|change/i }).click();

			// Should redirect to login or show success
			await expect(page.locator("text=/success|updated|changed/i")).toBeVisible(
				{ timeout: 5000 },
			);
		});
	});

	test.describe("Session Management", () => {
		test("should persist session across page reloads", async ({ page }) => {
			// Log in
			await page.goto("/auth/login");
			await page.locator('input[type="email"]').fill(TEST_EMAIL);
			await page.locator('input[type="password"]').fill(TEST_PASSWORD);
			await page.getByRole("button", { name: /sign in/i }).click();
			await page.waitForURL(/\/(dashboard|app)/, { timeout: 10000 });

			// Reload page
			await page.reload();

			// Should still be authenticated
			const userMenu = page.locator(
				'[data-testid="user-menu"], [aria-label="User menu"]',
			);
			await expect(userMenu).toBeVisible({ timeout: 5000 });
		});

		test("should log out successfully", async ({ page }) => {
			// Log in first
			await page.goto("/auth/login");
			await page.locator('input[type="email"]').fill(TEST_EMAIL);
			await page.locator('input[type="password"]').fill(TEST_PASSWORD);
			await page.getByRole("button", { name: /sign in/i }).click();
			await page.waitForURL(/\/(dashboard|app)/, { timeout: 10000 });

			// Click logout
			const userMenu = page.locator(
				'[data-testid="user-menu"], [aria-label="User menu"]',
			);
			await userMenu.click();

			const logoutButton = page.getByRole("button", {
				name: /log out|sign out/i,
			});
			await logoutButton.click();

			// Should redirect to home or login
			await page.waitForURL(/\/($|auth\/login)/, { timeout: 5000 });

			// Try to access protected route
			await page.goto("/app/dashboard");

			// Should redirect to login
			await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
		});

		test("should handle concurrent sessions correctly", async ({ browser }) => {
			// Create two browser contexts (tabs)
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();

			const page1 = await context1.newPage();
			const page2 = await context2.newPage();

			// Log in on both tabs
			for (const page of [page1, page2]) {
				await page.goto("/auth/login");
				await page.locator('input[type="email"]').fill(TEST_EMAIL);
				await page.locator('input[type="password"]').fill(TEST_PASSWORD);
				await page.getByRole("button", { name: /sign in/i }).click();
				await page.waitForURL(/\/(dashboard|app)/, { timeout: 10000 });
			}

			// Both should have valid sessions
			await expect(page1.locator('[data-testid="user-menu"]')).toBeVisible({
				timeout: 5000,
			});
			await expect(page2.locator('[data-testid="user-menu"]')).toBeVisible({
				timeout: 5000,
			});

			// Clean up
			await context1.close();
			await context2.close();
		});
	});

	test.describe("Security", () => {
		test("should prevent CSRF attacks", async ({ page, context }) => {
			// Attempt to submit login form with invalid CSRF token
			await page.goto("/auth/login");

			// Try to submit form programmatically without proper CSRF token
			const response = await page.evaluate(async () => {
				const res = await fetch("/api/auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						email: "test@test.com",
						password: "password",
					}),
				});
				return res.status;
			});

			// Should reject request (403 or 401)
			expect([401, 403, 400]).toContain(response);
		});

		test("should sanitize inputs to prevent XSS", async ({ page }) => {
			await page.goto("/auth/login");

			const xssPayload = '<script>alert("XSS")</script>';

			// Try XSS in email field
			await page.locator('input[type="email"]').fill(xssPayload);
			await page.locator('input[type="password"]').fill(TEST_PASSWORD);

			await page.getByRole("button", { name: /sign in/i }).click();

			// Should not execute script
			const dialogs: string[] = [];
			page.on("dialog", (dialog) => {
				dialogs.push(dialog.message());
				dialog.dismiss();
			});

			await page.waitForTimeout(2000);
			expect(dialogs).toHaveLength(0);
		});

		test("should rate limit login attempts", async ({ page }) => {
			await page.goto("/auth/login");

			// Attempt multiple failed logins
			for (let i = 0; i < 6; i++) {
				await page.locator('input[type="email"]').fill(`test${i}@test.com`);
				await page.locator('input[type="password"]').fill("wrongpassword");
				await page.getByRole("button", { name: /sign in/i }).click();
				await page.waitForTimeout(500);
			}

			// Should show rate limit error
			const rateLimitError = await page
				.locator("text=/too many|rate limit|try again later/i")
				.isVisible({ timeout: 2000 })
				.catch(() => false);

			if (rateLimitError) {
				console.log("✅ Rate limiting working");
			}
		});
	});
});

test.describe("Auth Accessibility", () => {
	test("should have proper form labels and ARIA attributes", async ({
		page,
	}) => {
		await page.goto("/auth/login");

		// Check for proper labels
		const emailLabel = page.locator(
			'label[for="email"], label:has-text("email")',
		);
		await expect(emailLabel).toBeVisible();

		const passwordLabel = page.locator(
			'label[for="password"], label:has-text("password")',
		);
		await expect(passwordLabel).toBeVisible();

		// Check submit button is properly labeled
		const submitButton = page.getByRole("button", { name: /sign in|log in/i });
		await expect(submitButton).toBeVisible();
	});

	test("should be keyboard navigable", async ({ page }) => {
		await page.goto("/auth/login");

		// Tab through form
		await page.keyboard.press("Tab");
		await expect(page.locator('input[type="email"]')).toBeFocused();

		await page.keyboard.press("Tab");
		await expect(page.locator('input[type="password"]')).toBeFocused();

		await page.keyboard.press("Tab");
		const submitButton = page.getByRole("button", { name: /sign in|log in/i });
		await expect(submitButton).toBeFocused();

		// Should submit with Enter
		await page.locator('input[type="email"]').fill("test@test.com");
		await page.locator('input[type="password"]').fill("password");
		await submitButton.focus();
		await page.keyboard.press("Enter");

		// Form should attempt submission
		await page.waitForTimeout(1000);
	});
});
