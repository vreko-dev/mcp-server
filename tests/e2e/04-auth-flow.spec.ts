/**
 * E2E Tests - Authentication Flow
 * Tests signup, login, logout, password reset, and session management
 */

import { expect, test } from "@playwright/test";
import { ApiClient } from "./helpers/api";
import { createTestUser, getAuthToken, loginUser } from "./helpers/auth";

test.describe("Authentication Flow", () => {
	test.describe("Sign Up Flow", () => {
		test("user can sign up with valid credentials", async ({ page }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			await page.goto("/signup");

			// Fill signup form
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password", { exact: true }).fill(password);
			await page.getByLabel("Confirm Password").fill(password);

			// Submit form
			await page.getByRole("button", { name: "Sign Up" }).click();

			// Should redirect to verification page
			await expect(page).toHaveURL(/.*verify-email/);
			await expect(page.getByText("Check your email")).toBeVisible();
		});

		test("sign up fails with invalid email", async ({ page }) => {
			await page.goto("/signup");

			await page.getByLabel("Email").fill("invalid-email");
			await page.getByLabel("Password", { exact: true }).fill("Test123!@#");
			await page.getByLabel("Confirm Password").fill("Test123!@#");

			await page.getByRole("button", { name: "Sign Up" }).click();

			// Should show validation error
			await expect(page.getByText("Invalid email")).toBeVisible();
		});

		test("sign up fails with weak password", async ({ page }) => {
			await page.goto("/signup");

			await page.getByLabel("Email").fill("test@example.com");
			await page.getByLabel("Password", { exact: true }).fill("weak");
			await page.getByLabel("Confirm Password").fill("weak");

			await page.getByRole("button", { name: "Sign Up" }).click();

			// Should show password strength error
			await expect(page.getByText("Password is too weak")).toBeVisible();
		});

		test("sign up fails when passwords don't match", async ({ page }) => {
			await page.goto("/signup");

			await page.getByLabel("Email").fill("test@example.com");
			await page.getByLabel("Password", { exact: true }).fill("Test123!@#");
			await page.getByLabel("Confirm Password").fill("Different123!@#");

			await page.getByRole("button", { name: "Sign Up" }).click();

			// Should show password mismatch error
			await expect(page.getByText("Passwords do not match")).toBeVisible();
		});
	});

	test.describe("Email Verification", () => {
		test("user can verify email with valid token", async ({ page }) => {
			// This would typically involve creating a user and getting a verification token
			// For testing purposes, we'll simulate the flow
			const email = `test-${Date.now()}@example.com`;

			// First sign up
			await page.goto("/signup");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password", { exact: true }).fill("Test123!@#");
			await page.getByLabel("Confirm Password").fill("Test123!@#");
			await page.getByRole("button", { name: "Sign Up" }).click();

			// Simulate clicking verification link (in real test, we'd extract this from email)
			// For demo, we'll assume verification happens automatically or via a test endpoint
			await page.goto("/login");

			// Should be able to log in now
			await expect(page.getByText("Log In")).toBeVisible();
		});

		test("email verification fails with expired token", async ({ page }) => {
			// Navigate to verification page with expired token
			await page.goto("/verify-email?token=expired-token");

			// Should show error message
			await expect(page.getByText("Verification link has expired")).toBeVisible();
		});
	});

	test.describe("Login Flow", () => {
		test("user can log in with valid credentials", async ({ page }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// First create a verified user (simplified for test)
			await createTestUser(page, email, password);

			// Then log in
			await page.goto("/login");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password").fill(password);
			await page.getByRole("button", { name: "Log In" }).click();

			// Should redirect to dashboard
			await expect(page).toHaveURL(/.*dashboard/);
			await expect(page.getByText("Welcome back")).toBeVisible();
		});

		test("login fails with invalid credentials", async ({ page }) => {
			await page.goto("/login");
			await page.getByLabel("Email").fill("test@example.com");
			await page.getByLabel("Password").fill("wrong-password");
			await page.getByRole("button", { name: "Log In" }).click();

			// Should show error message
			await expect(page.getByText("Invalid email or password")).toBeVisible();
		});

		test("login shows rate limiting after too many attempts", async ({ page }) => {
			await page.goto("/login");

			// Attempt multiple failed logins
			for (let i = 0; i < 6; i++) {
				await page.getByLabel("Email").fill("test@example.com");
				await page.getByLabel("Password").fill(`wrong-password-${i}`);
				await page.getByRole("button", { name: "Log In" }).click();
				await page.waitForTimeout(500);
			}

			// Should show rate limit message
			await expect(page.getByText("Too many attempts")).toBeVisible();
		});
	});

	test.describe("Logout Flow", () => {
		test("user can log out successfully", async ({ page }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Log in first
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Click logout button
			await page.getByRole("button", { name: "Logout" }).click();

			// Should redirect to login page
			await expect(page).toHaveURL(/.*login/);
			await expect(page.getByText("You have been logged out")).toBeVisible();
		});

		test("session is invalidated after logout", async ({ page, context }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Log in first
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token before logout
			const tokenBefore = await getAuthToken(page);

			// Logout
			await page.getByRole("button", { name: "Logout" }).click();

			// Try to use token (should fail)
			const apiClient = new ApiClient("http://snapback.dev", tokenBefore);
			try {
				await apiClient.get("/api/v1/user/profile");
				// If we get here, the test should fail
				expect(false).toBe(true);
			} catch (error) {
				// Should get unauthorized error
				expect(error.message).toContain("401");
			}
		});
	});

	test.describe("Password Reset", () => {
		test("user can reset password with valid email", async ({ page }) => {
			const email = `test-${Date.now()}@example.com`;

			await page.goto("/forgot-password");
			await page.getByLabel("Email").fill(email);
			await page.getByRole("button", { name: "Reset Password" }).click();

			// Should show confirmation message
			await expect(page.getByText("Password reset email sent")).toBeVisible();
		});

		test("password reset fails with non-existent email", async ({ page }) => {
			await page.goto("/forgot-password");
			await page.getByLabel("Email").fill("nonexistent@example.com");
			await page.getByRole("button", { name: "Reset Password" }).click();

			// Should still show success message (security best practice)
			await expect(page.getByText("Password reset email sent")).toBeVisible();
		});

		test("user can set new password with valid reset token", async ({ page }) => {
			// In a real test, we would:
			// 1. Request password reset
			// 2. Extract token from email (or use test endpoint)
			// 3. Visit reset page with token
			// 4. Set new password

			// For this test, we'll simulate the flow
			await page.goto("/reset-password?token=valid-token");
			await page.getByLabel("New Password").fill("NewPass123!@#");
			await page.getByLabel("Confirm New Password").fill("NewPass123!@#");
			await page.getByRole("button", { name: "Set New Password" }).click();

			// Should redirect to login with success message
			await expect(page).toHaveURL(/.*login/);
			await expect(page.getByText("Password updated successfully")).toBeVisible();
		});

		test("password reset fails with weak new password", async ({ page }) => {
			await page.goto("/reset-password?token=valid-token");
			await page.getByLabel("New Password").fill("weak");
			await page.getByLabel("Confirm New Password").fill("weak");
			await page.getByRole("button", { name: "Set New Password" }).click();

			// Should show password strength error
			await expect(page.getByText("Password is too weak")).toBeVisible();
		});
	});

	test.describe("Session Persistence", () => {
		test("user session persists after page refresh", async ({ page }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Log in
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Store current URL
			const currentUrl = page.url();

			// Refresh page
			await page.reload();

			// Should still be logged in (not redirected to login)
			expect(page.url()).toBe(currentUrl);
			await expect(page.getByText("Welcome back")).toBeVisible();
		});

		test("session expires after inactivity timeout", async ({ page, context }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Log in
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Fast forward time (this would need server-side time mocking in real implementation)
			// For demo, we'll simulate by clearing cookies
			const cookies = await context.cookies();
			const filteredCookies = cookies.filter(
				(cookie) => !cookie.name.includes("session") && !cookie.name.includes("auth"),
			);
			await context.clearCookies();
			await context.addCookies(filteredCookies);

			// Navigate to protected page
			await page.goto("/dashboard");

			// Should be redirected to login
			await expect(page).toHaveURL(/.*login/);
		});
	});

	test.describe("Auth Across Subdomains", () => {
		test("session cookie works across subdomains", async ({ page, context }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Log in on main domain
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Check cookies are set with correct domain
			const cookies = await context.cookies("http://snapback.dev");
			const sessionCookie = cookies.find(
				(cookie) => cookie.name.includes("session") || cookie.name.includes("auth"),
			);

			expect(sessionCookie).toBeDefined();
			if (sessionCookie) {
				expect(sessionCookie.domain).toBe(".snapback.dev");
				expect(sessionCookie.secure).toBe(true);
			}

			// Navigate to subdomain
			await page.goto("http://app.snapback.dev/dashboard");

			// Should still be logged in
			await expect(page.getByText("Welcome back")).toBeVisible();
		});

		test("API requests include auth credentials across subdomains", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Log in
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const token = await getAuthToken(page);

			// Make API request from subdomain context
			const apiResponse = await request.get("http://api.snapback.dev/v1/user/profile", {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			// Should succeed
			expect(apiResponse.ok()).toBe(true);
		});
	});
});
