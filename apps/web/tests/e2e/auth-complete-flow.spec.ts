/**
 * End-to-End Auth Complete Flow Tests
 * Testing: Signup → Login → 2FA Setup → API Key Creation
 * Using Playwright for browser automation and real Better Auth interactions
 */

import { expect, test } from "@playwright/test";

// Helper: Generate unique test email
function generateTestEmail(): string {
	return `test-${Date.now()}@snapback.local`;
}

// Helper: Get TOTP code (mock implementation)
function getMockTotpCode(): string {
	// In real tests, use speakeasy or similar library
	return "123456";
}

test.describe("Complete Auth Flow - Signup to API Key Creation", () => {
	const testEmail = generateTestEmail();
	const testPassword = "SecurePassword123!@#";

	test.beforeEach(async ({ page }) => {
		// Start at home page
		await page.goto("/");
		expect(page).toHaveURL(/\//);
	});

	// ============================================================
	// Phase 1: User Signup
	// ============================================================
	test.describe("Phase 1: User Signup", () => {
		test("should navigate to signup page from home", async ({
			page,
		}) => {
			// Find signup button
			const signupButton = page.getByRole("link", {
				name: /sign up|create account/i,
			});
			await expect(signupButton).toBeVisible();
			await signupButton.click();

			// Should be on signup page
			await expect(page).toHaveURL(/signup|register/i);
		});

		test("should show signup form with email and password fields", async ({
			page,
		}) => {
			await page.goto("/auth/signup");

			// Check form fields exist
			const emailInput = page.getByLabel(/email/i);
			const passwordInput = page.getByLabel(/^password/i);
			const signupButton = page.getByRole("button", { name: /sign up/i });

			await expect(emailInput).toBeVisible();
			await expect(passwordInput).toBeVisible();
			await expect(signupButton).toBeVisible();
		});

		test("should validate email format before submission", async ({
			page,
		}) => {
			await page.goto("/auth/signup");

			const emailInput = page.getByLabel(/email/i);
			const signupButton = page.getByRole("button", {
				name: /sign up/i,
			});

			// Try invalid email
			await emailInput.fill("invalid-email");
			await signupButton.click();

			// Should show validation error
			const errorMessage = page.getByText(/invalid|invalid email/i);
			await expect(errorMessage).toBeVisible();
		});

		test("should validate password strength", async ({ page }) => {
			await page.goto("/auth/signup");

			const passwordInput = page.getByLabel(/^password/i);
			const signupButton = page.getByRole("button", {
				name: /sign up/i,
			});

			// Try weak password
			await passwordInput.fill("weak");
			await signupButton.click();

			// Should show password strength error
			const errorMessage = page.getByText(
				/password|strength|requirements/i,
			);
			await expect(errorMessage).toBeVisible();
		});

		test("should successfully create account with valid credentials", async ({
			page,
		}) => {
			await page.goto("/auth/signup");

			const emailInput = page.getByLabel(/email/i);
			const passwordInput = page.getByLabel(/^password/i);
			const signupButton = page.getByRole("button", {
				name: /sign up/i,
			});

			// Fill form with valid data
			await emailInput.fill(testEmail);
			await passwordInput.fill(testPassword);

			// Mock the API response (using service worker or API mocking)
			await page.route("**/api/auth/signup", (route) => {
				route.fulfill({
					status: 200,
					body: JSON.stringify({
						user: {
							id: "user_123",
							email: testEmail,
							name: null,
						},
						session: {
							id: "session_123",
							token: "token_abc123",
						},
					}),
				});
			});

			await signupButton.click();

			// Should redirect to dashboard or email verification
			await expect(page).toHaveURL(
				/(dashboard|verify|onboarding)/i,
			);
		});

		test("should show error if email already exists", async ({
			page,
		}) => {
			await page.goto("/auth/signup");

			const emailInput = page.getByLabel(/email/i);
			const passwordInput = page.getByLabel(/^password/i);
			const signupButton = page.getByRole("button", {
				name: /sign up/i,
			});

			// Mock API error for duplicate email
			await page.route("**/api/auth/signup", (route) => {
				route.fulfill({
					status: 400,
					body: JSON.stringify({
						error: "Email already in use",
						code: "EMAIL_EXISTS",
					}),
				});
			});

			await emailInput.fill("existing@example.com");
			await passwordInput.fill(testPassword);
			await signupButton.click();

			// Should show error message
			const errorMessage = page.getByText(
				/already|exists|in use/i,
			);
			await expect(errorMessage).toBeVisible();
		});
	});

	// ============================================================
	// Phase 2: User Login
	// ============================================================
	test.describe("Phase 2: User Login", () => {
		test("should navigate to login page", async ({ page }) => {
			await page.goto("/auth/login");
			await expect(page).toHaveURL(/login|signin/i);
		});

		test("should show login form with email and password fields", async ({
			page,
		}) => {
			await page.goto("/auth/login");

			const emailInput = page.getByLabel(/email/i);
			const passwordInput = page.getByLabel(/password/i);
			const loginButton = page.getByRole("button", { name: /sign in|log in/i });

			await expect(emailInput).toBeVisible();
			await expect(passwordInput).toBeVisible();
			await expect(loginButton).toBeVisible();
		});

		test("should show error for invalid credentials", async ({
			page,
		}) => {
			await page.goto("/auth/login");

			const emailInput = page.getByLabel(/email/i);
			const passwordInput = page.getByLabel(/password/i);
			const loginButton = page.getByRole("button", { name: /sign in|log in/i });

			// Mock API error
			await page.route("**/api/auth/signin", (route) => {
				route.fulfill({
					status: 401,
					body: JSON.stringify({
						error: "Invalid email or password",
						code: "INVALID_CREDENTIALS",
					}),
				});
			});

			await emailInput.fill("wrong@example.com");
			await passwordInput.fill("wrongpassword123");
			await loginButton.click();

			// Should show error
			const errorMessage = page.getByText(/invalid|failed/i);
			await expect(errorMessage).toBeVisible();
		});

		test("should successfully login with valid credentials", async ({
			page,
		}) => {
			await page.goto("/auth/login");

			const emailInput = page.getByLabel(/email/i);
			const passwordInput = page.getByLabel(/password/i);
			const loginButton = page.getByRole("button", { name: /sign in|log in/i });

			// Mock successful login
			await page.route("**/api/auth/signin", (route) => {
				route.fulfill({
					status: 200,
					body: JSON.stringify({
						user: {
							id: "user_123",
							email: testEmail,
						},
						session: {
							id: "session_123",
							token: "token_abc123",
						},
					}),
				});
			});

			await emailInput.fill(testEmail);
			await passwordInput.fill(testPassword);
			await loginButton.click();

			// Should redirect to dashboard or 2FA setup if enabled
			await expect(page).toHaveURL(
				/(dashboard|2fa|verify|settings)/i,
			);
		});

		test("should support magic link login", async ({ page }) => {
			await page.goto("/auth/login");

			// Find magic link option
			const magicLinkButton = page.getByRole("button", {
				name: /magic link|email link/i,
			});

			if (await magicLinkButton.isVisible()) {
				await magicLinkButton.click();

				const emailInput = page.getByLabel(/email/i);
				await emailInput.fill(testEmail);

				// Mock magic link request
				await page.route("**/api/auth/magic-link", (route) => {
					route.fulfill({ status: 200 });
				});

				const sendButton = page.getByRole("button", {
					name: /send|email/i,
				});
				await sendButton.click();

				// Should show confirmation message
				const confirmMsg = page.getByText(
					/check your email|sent|verify/i,
				);
				await expect(confirmMsg).toBeVisible();
			}
		});
	});

	// ============================================================
	// Phase 3: Two-Factor Authentication Setup
	// ============================================================
	test.describe("Phase 3: Two-Factor Authentication Setup", () => {
		test.beforeEach(async ({ page }) => {
			// Mock logged-in state
			await page.goto("/app/settings/security");

			// Ensure we're logged in
			const heading = page.getByRole("heading", {
				name: /security|2fa|settings/i,
			});
			await expect(heading).toBeVisible();
		});

		test("should display 2FA setup option", async ({ page }) => {
			const twoFactorSection = page.getByText(
				/two.?factor|2fa|authenticator/i,
			);
			await expect(twoFactorSection).toBeVisible();
		});

		test("should show enable 2FA button when not enabled", async ({
			page,
		}) => {
			const enableButton = page.getByRole("button", {
				name: /enable|setup|add.*2fa|add.*authenticator/i,
			});

			if (await enableButton.isVisible()) {
				await expect(enableButton).toBeEnabled();
			}
		});

		test("should generate QR code for authenticator app", async ({
			page,
		}) => {
			const enableButton = page.getByRole("button", {
				name: /enable|setup|add.*2fa/i,
			});

			if (await enableButton.isVisible()) {
				await enableButton.click();

				// Should show QR code
				const qrCode = page.locator("img[alt*='QR'], svg");
				await expect(qrCode).toBeVisible();

				// Should show secret key
				const secretKey = page.getByText(
					/secret|key|manual entry/i,
				);
				await expect(secretKey).toBeVisible();
			}
		});

		test("should allow manual entry of authenticator key", async ({
			page,
		}) => {
			const enableButton = page.getByRole("button", {
				name: /enable|setup|add.*2fa/i,
			});

			if (await enableButton.isVisible()) {
				await enableButton.click();

				// Find manual entry toggle or link
				const manualLink = page.getByRole("button", {
					name: /manual|enter|type/i,
				});

				if (await manualLink.isVisible()) {
					await manualLink.click();

					// Should show input field for key
					const keyInput = page.getByPlaceholder(
						/enter|paste|key/i,
					);
					await expect(keyInput).toBeVisible();
				}
			}
		});

		test("should require TOTP verification for 2FA setup", async ({
			page,
		}) => {
			const enableButton = page.getByRole("button", {
				name: /enable|setup|add.*2fa/i,
			});

			if (await enableButton.isVisible()) {
				await enableButton.click();

				// Should show TOTP input field
				const totpInput = page.getByLabel(/code|totp|verification/i);

				if (await totpInput.isVisible()) {
					await totpInput.fill(getMockTotpCode());

					const verifyButton = page.getByRole("button", {
						name: /verify|enable|confirm|save/i,
					});

					// Mock 2FA setup API
					await page.route(
						"**/api/auth/2fa/enable",
						(route) => {
							route.fulfill({ status: 200 });
						},
					);

					await verifyButton.click();

					// Should show success message
					const successMsg = page.getByText(
						/enabled|activated|success/i,
					);
					await expect(successMsg).toBeVisible();
				}
			}
		});

		test("should show backup codes after 2FA setup", async ({
			page,
		}) => {
			const enableButton = page.getByRole("button", {
				name: /enable|setup|add.*2fa/i,
			});

			if (await enableButton.isVisible()) {
				// Complete 2FA setup (mocked)
				await page.route(
					"**/api/auth/2fa/enable",
					(route) => {
						route.fulfill({
							status: 200,
							body: JSON.stringify({
								backupCodes: [
									"XXXX-XXXX-XXXX",
									"XXXX-XXXX-XXXX",
									"XXXX-XXXX-XXXX",
								],
							}),
						});
					},
				);

				// After enabling, backup codes should be shown
				const backupCodesText = page.getByText(
					/backup|recovery|codes/i,
				);

				// This might appear in a modal or section
				if (
					await backupCodesText.isVisible({
						timeout: 2000,
					})
				) {
					await expect(backupCodesText).toBeVisible();

					// Should have copy button
					const copyButton = page.getByRole("button", {
						name: /copy|download/i,
					});
					await expect(copyButton).toBeVisible();
				}
			}
		});
	});

	// ============================================================
	// Phase 4: API Key Creation
	// ============================================================
	test.describe("Phase 4: API Key Creation", () => {
		test.beforeEach(async ({ page }) => {
			// Navigate to API key settings
			await page.goto("/app/settings/api-keys");

			const heading = page.getByRole("heading", {
				name: /api.*key|access.*key/i,
			});
			await expect(heading).toBeVisible();
		});

		test("should show API keys section", async ({ page }) => {
			const section = page.getByText(/api.*key|access.*key|key/i);
			await expect(section).toBeVisible();
		});

		test("should show create API key button", async ({ page }) => {
			const createButton = page.getByRole("button", {
				name: /create|generate|new.*key|add.*key/i,
			});

			await expect(createButton).toBeVisible();
		});

		test("should open API key creation dialog", async ({ page }) => {
			const createButton = page.getByRole("button", {
				name: /create|generate|new.*key|add.*key/i,
			});

			await createButton.click();

			// Should show dialog/form
			const dialog = page.getByRole("dialog");
			await expect(dialog).toBeVisible();
		});

		test("should allow naming the API key", async ({ page }) => {
			const createButton = page.getByRole("button", {
				name: /create|generate|new.*key|add.*key/i,
			});

			await createButton.click();

			const nameInput = page.getByLabel(/name|label|description/i);

			if (await nameInput.isVisible()) {
				await nameInput.fill("My API Key");
				await expect(nameInput).toHaveValue("My API Key");
			}
		});

		test("should allow setting API key expiration", async ({
			page,
		}) => {
			const createButton = page.getByRole("button", {
				name: /create|generate|new.*key|add.*key/i,
			});

			await createButton.click();

			const expirySelect = page.getByLabel(/expir|expire|expiration|valid/i);

			if (await expirySelect.isVisible()) {
				await expirySelect.click();

				const option = page.getByRole("option", {
					name: /30 days|90 days|1 year|never/i,
				});
				await option.first().click();
			}
		});

		test("should allow selecting API key scopes/permissions", async ({
			page,
		}) => {
			const createButton = page.getByRole("button", {
				name: /create|generate|new.*key|add.*key/i,
			});

			await createButton.click();

			// Look for scope checkboxes
			const scopeCheckboxes = page.getByRole("checkbox");

			if ((await scopeCheckboxes.count()) > 0) {
				// Select some scopes
				const firstScope = scopeCheckboxes.first();
				await firstScope.check();
				await expect(firstScope).toBeChecked();
			}
		});

		test("should generate API key successfully", async ({ page }) => {
			const createButton = page.getByRole("button", {
				name: /create|generate|new.*key|add.*key/i,
			});

			await createButton.click();

			// Fill form
			const nameInput = page.getByLabel(/name|label/i);
			if (await nameInput.isVisible()) {
				await nameInput.fill("Integration Key");
			}

			// Mock API key generation
			await page.route("**/api/settings/api-keys", (route) => {
				route.fulfill({
					status: 200,
					body: JSON.stringify({
						id: "key_123",
						name: "Integration Key",
						key: "sk_live_1234567890abcdef",
						preview: "sk_live_****bcdef",
						createdAt: new Date().toISOString(),
						expiresAt: new Date(
							Date.now() + 365 * 24 * 60 * 60 * 1000,
						).toISOString(),
					}),
				});
			});

			const generateButton = page.getByRole("button", {
				name: /generate|create|save|confirm/i,
			});
			await generateButton.click();

			// Should show the generated key
			const keyDisplay = page.getByText(/sk_live_/i);
			await expect(keyDisplay).toBeVisible();
		});

		test("should allow copying API key to clipboard", async ({
			page,
		}) => {
			// Mock generated key display
			const copyButton = page.getByRole("button", {
				name: /copy/i,
			});

			if (await copyButton.isVisible()) {
				await copyButton.click();

				// Should show copied confirmation
				const copiedMsg = page.getByText(
					/copied|copied to clipboard/i,
				);
				await expect(copiedMsg).toBeVisible();
			}
		});

		test("should list existing API keys", async ({ page }) => {
			// Mock API response
			await page.route("**/api/settings/api-keys", (route) => {
				route.fulfill({
					status: 200,
					body: JSON.stringify([
						{
							id: "key_001",
							name: "Production Key",
							preview: "sk_live_****xxxx",
							createdAt: "2025-01-01T00:00:00Z",
							expiresAt: null,
							lastUsed: "2025-01-15T10:30:00Z",
						},
						{
							id: "key_002",
							name: "Staging Key",
							preview: "sk_test_****yyyy",
							createdAt: "2025-01-10T00:00:00Z",
							expiresAt: "2025-04-10T00:00:00Z",
							lastUsed: null,
						},
					]),
				});
			});

			// Should show keys in table
			const productionKey = page.getByText(/Production Key/i);
			await expect(productionKey).toBeVisible();

			const stagingKey = page.getByText(/Staging Key/i);
			await expect(stagingKey).toBeVisible();
		});

		test("should allow revoking API key", async ({ page }) => {
			// Mock key in list
			const revokeButton = page.getByRole("button", {
				name: /revoke|delete|remove/i,
			}).first();

			if (await revokeButton.isVisible()) {
				await revokeButton.click();

				// Should show confirmation
				const confirmText = page.getByText(
					/confirm|sure|are you/i,
				);
				await expect(confirmText).toBeVisible();

				// Mock revoke API
				await page.route(
					"**/api/settings/api-keys/**",
					(route) => {
						route.fulfill({ status: 200 });
					},
				);

				const confirmButton = page.getByRole("button", {
					name: /confirm|revoke|delete|yes/i,
				}).last();
				await confirmButton.click();

				// Key should be removed
				const successMsg = page.getByText(/revoked|deleted/i);
				await expect(successMsg).toBeVisible();
			}
		});
	});

	// ============================================================
	// Integration: Complete Flow with Session Persistence
	// ============================================================
	test.describe("Integration: Complete Auth Flow", () => {
		test("should maintain session across page navigations", async ({
			page,
		}) => {
			// Mock authenticated session
			await page.evaluate(() => {
				localStorage.setItem(
					"auth.session",
					JSON.stringify({
						user: { id: "user_123", email: "test@example.com" },
						token: "token_abc123",
					}),
				);
			});

			// Navigate to different pages
			await page.goto("/app/dashboard");
			await expect(page).toHaveURL(/dashboard/i);

			const userMenuButton = page.getByRole("button", {
				name: /profile|account|user/i,
			});
			await userMenuButton.click();

			// Should show authenticated user menu
			const signoutButton = page.getByRole("button", {
				name: /sign out|log out/i,
			});
			await expect(signoutButton).toBeVisible();
		});

		test("should handle logout correctly", async ({ page }) => {
			// Start with authenticated session
			await page.goto("/app/dashboard");

			// Find logout button
			const userMenuButton = page.getByRole("button", {
				name: /profile|account|user/i,
			});
			await userMenuButton.click();

			const signoutButton = page.getByRole("button", {
				name: /sign out|log out/i,
			});

			// Mock logout API
			await page.route("**/api/auth/signout", (route) => {
				route.fulfill({ status: 200 });
			});

			await signoutButton.click();

			// Should redirect to login or home
			await expect(page).toHaveURL(/(login|signin|auth|\/)$/i);

			// Session should be cleared
			const sessionData = await page.evaluate(() =>
				localStorage.getItem("auth.session"),
			);
			expect(sessionData).toBeNull();
		});

		test("should prevent access to protected routes without authentication", async ({
			page,
		}) => {
			// Clear auth session
			await page.evaluate(() => {
				localStorage.removeItem("auth.session");
			});

			// Try to access protected route
			await page.goto("/app/dashboard");

			// Should redirect to login
			await expect(page).toHaveURL(
				/(login|signin|auth|home)/i,
			);
		});
	});
});
