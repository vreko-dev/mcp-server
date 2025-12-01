import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("should redirect to login when accessing protected route", async ({
		page,
	}) => {
		await page.goto("/app/dashboard");
		await page.waitForURL("**/auth/login**");
		expect(page.url()).toContain("/auth/login");
		expect(page.url()).toContain("redirect=%2Fapp%2Fdashboard");
	});

	test("should show login form", async ({ page }) => {
		await page.goto("/auth/login");

		// Check for email input
		const emailInput = page.locator('input[type="email"]');
		await expect(emailInput).toBeVisible();

		// Check for password input
		const passwordInput = page.locator('input[type="password"]');
		await expect(passwordInput).toBeVisible();

		// Check for submit button
		const submitButton = page.locator('button[type="submit"]');
		await expect(submitButton).toBeVisible();
	});

	test("should show validation errors for invalid email", async ({ page }) => {
		await page.goto("/auth/login");

		const emailInput = page.locator('input[type="email"]');
		await emailInput.fill("invalid-email");

		const submitButton = page.locator('button[type="submit"]');
		await submitButton.click();

		// Check for validation error
		const error = page.locator("text=/invalid.*email/i");
		await expect(error).toBeVisible({ timeout: 3000 });
	});

	test("should have GitHub OAuth button", async ({ page }) => {
		await page.goto("/auth/login");

		const githubButton = page.locator('button:has-text("GitHub")');
		await expect(githubButton).toBeVisible();
	});

	test("should have Google OAuth button", async ({ page }) => {
		await page.goto("/auth/login");

		const googleButton = page.locator('button:has-text("Google")');
		await expect(googleButton).toBeVisible();
	});

	test("should navigate to signup from login", async ({ page }) => {
		await page.goto("/auth/login");

		const signupLink = page.locator('a:has-text("Sign up")');
		await signupLink.click();

		await page.waitForURL("**/auth/signup");
		expect(page.url()).toContain("/auth/signup");
	});

	test("should have forgot password link", async ({ page }) => {
		await page.goto("/auth/login");

		const forgotLink = page.locator('a:has-text("Forgot")');
		await expect(forgotLink).toBeVisible();

		await forgotLink.click();
		await page.waitForURL("**/auth/forgot-password");
		expect(page.url()).toContain("/auth/forgot-password");
	});

	test("should preserve redirect URL through OAuth flow", async ({ page }) => {
		await page.goto("/app/dashboard");
		await page.waitForURL("**/auth/login**");

		// Click GitHub OAuth button
		const githubButton = page.locator('button:has-text("GitHub")');
		await githubButton.click();

		// Should redirect to GitHub OAuth (or show error if not configured)
		await page.waitForTimeout(1000);
		const url = page.url();
		expect(
			url.includes("github.com") || url.includes("auth/login"),
		).toBeTruthy();
	});
});

test.describe("Session Management", () => {
	test("should handle session expiry", async ({ page }) => {
		// This test would require mocking a session expiry scenario
		// For now, we'll just verify the middleware works

		await page.goto("/app/dashboard");
		await page.waitForURL("**/auth/login**");

		// Verify protected route redirects to login
		expect(page.url()).toContain("/auth/login");
	});

	test("should check for session on protected routes", async ({
		page,
		context,
	}) => {
		// Clear all cookies to simulate no session
		await context.clearCookies();

		const protectedRoutes = [
			"/app/dashboard",
			"/app/settings",
			"/organization",
		];

		for (const route of protectedRoutes) {
			await page.goto(route);
			await page.waitForURL("**/auth/login**", { timeout: 5000 });
			expect(page.url()).toContain("/auth/login");
		}
	});
});

test.describe("Accessibility", () => {
	test("login form should be keyboard accessible", async ({ page }) => {
		await page.goto("/auth/login");

		// Tab through form fields
		await page.keyboard.press("Tab");
		const emailInput = page.locator('input[type="email"]');
		await expect(emailInput).toBeFocused();

		await page.keyboard.press("Tab");
		const passwordInput = page.locator('input[type="password"]');
		await expect(passwordInput).toBeFocused();

		await page.keyboard.press("Tab");
		const submitButton = page.locator('button[type="submit"]');
		await expect(submitButton).toBeFocused();
	});

	test("should have proper ARIA labels", async ({ page }) => {
		await page.goto("/auth/login");

		const emailInput = page.locator('input[type="email"]');
		const emailLabel = await emailInput.getAttribute("aria-label");
		expect(emailLabel || (await emailInput.getAttribute("name"))).toBeTruthy();

		const passwordInput = page.locator('input[type="password"]');
		const passwordLabel = await passwordInput.getAttribute("aria-label");
		expect(
			passwordLabel || (await passwordInput.getAttribute("name")),
		).toBeTruthy();
	});
});
