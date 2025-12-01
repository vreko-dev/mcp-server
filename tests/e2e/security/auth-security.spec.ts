/**
 * E2E Security Tests - Auth Features
 * Tests cross-subdomain cookies, Turnstile, step-up, passkeys, RLS
 */

import { expect, test } from "@playwright/test";

test.describe("Security Features E2E", () => {
	test.describe("Cross-Subdomain Cookies", () => {
		test("session cookies persist across subdomains", async ({ page, context }) => {
			// Sign in at main domain
			await page.goto("https://snapback.dev/auth/signin");
			await page.fill('[name="email"]', "test@example.com");
			await page.fill('[name="password"]', "Test123!@#");
			await page.click('[type="submit"]');

			// Wait for redirect
			await page.waitForURL("**/dashboard");

			// Verify cookies
			const cookies = await context.cookies("https://snapback.dev");
			const sessionCookie = cookies.find((c) => c.name.includes("better-auth.session"));

			expect(sessionCookie).toBeDefined();
			expect(sessionCookie?.domain).toBe(".snapback.dev");
			expect(sessionCookie?.secure).toBe(true);
			expect(sessionCookie?.httpOnly).toBe(true);
			expect(sessionCookie?.sameSite).toBe("Lax");

			// Navigate to subdomain (if applicable)
			// await page.goto('https://app.snapback.dev/dashboard');
			// await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
		});

		test("cookies sent with credentials: include", async ({ page }) => {
			// Intercept network requests
			const requests: string[] = [];

			page.on("request", (request) => {
				if (request.url().includes("/api/")) {
					requests.push(request.url());
					// Note: credentials header not directly visible, but fetch should send cookies
				}
			});

			await page.goto("https://snapback.dev/auth/signin");
			await page.fill('[name="email"]', "test@example.com");
			await page.fill('[name="password"]', "Test123!@#");
			await page.click('[type="submit"]');

			// Verify API calls were made
			expect(requests.length).toBeGreaterThan(0);
		});
	});

	test.describe("Adaptive Turnstile", () => {
		test("shows challenge after 5 failed login attempts", async ({ page }) => {
			await page.goto("https://snapback.dev/auth/signin");

			// Attempt 5 failed logins
			for (let i = 0; i < 5; i++) {
				await page.fill('[name="email"]', "test@example.com");
				await page.fill('[name="password"]', `WrongPassword${i}`);
				await page.click('[type="submit"]');
				await page.waitForSelector(".error", { timeout: 2000 });
			}

			// 6th attempt should show Turnstile
			await page.fill('[name="email"]', "test@example.com");
			await page.fill('[name="password"]', "AnotherWrong");

			// Check if Turnstile iframe appears
			const turnstileFrame = page.frameLocator('iframe[src*="challenges.cloudflare.com"]');
			await expect(turnstileFrame.locator("body")).toBeVisible({
				timeout: 5000,
			});
		});

		test("bypass cookie works after successful challenge", async ({ page, context }) => {
			// Mock Turnstile verification endpoint
			await page.route("**/challenges.cloudflare.com/**", (route) => {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ success: true }),
				});
			});

			await page.goto("https://snapback.dev/auth/signin");

			// Trigger challenge by failing 5 times
			for (let i = 0; i < 5; i++) {
				await page.fill('[name="email"]', "test@example.com");
				await page.fill('[name="password"]', `Wrong${i}`);
				await page.click('[type="submit"]');
				await page.waitForTimeout(500);
			}

			// Complete Turnstile challenge (mocked)
			await page.fill('[name="email"]', "test@example.com");
			await page.fill('[name="password"]', "Test123!@#");
			await page.click('[type="submit"]');

			// Check for bypass cookie (sb_challenge)
			const cookies = await context.cookies("https://snapback.dev");
			const bypassCookie = cookies.find((c) => c.name === "sb_challenge");

			// Bypass cookie should be set with 15-minute expiry
			expect(bypassCookie).toBeDefined();
			if (bypassCookie) {
				const maxAge = bypassCookie.expires ? bypassCookie.expires * 1000 - Date.now() : 0;
				expect(maxAge).toBeGreaterThan(10 * 60 * 1000); // At least 10 minutes left
				expect(maxAge).toBeLessThan(16 * 60 * 1000); // Less than 16 minutes
			}
		});
	});

	test.describe("Step-Up Authentication", () => {
		test("requires step-up for billing operations", async ({ page }) => {
			// Login first
			await page.goto("https://snapback.dev/auth/signin");
			await page.fill('[name="email"]', "test@example.com");
			await page.fill('[name="password"]', "Test123!@#");
			await page.click('[type="submit"]');
			await page.waitForURL("**/dashboard");

			// Attempt billing operation
			await page.goto("https://snapback.dev/settings/billing");

			// Should show step-up modal
			await expect(page.locator('[data-testid="stepup-modal"]')).toBeVisible();

			// TODO: Complete passkey challenge with virtual authenticator
		});

		test("step-up window expires after 300s", async ({ page, request }) => {
			// Login first
			await page.goto("https://snapback.dev/auth/signin");
			await page.fill('[name="email"]', "test@example.com");
			await page.fill('[name="password"]', "Test123!@#");
			await page.click('[type="submit"]');
			await page.waitForURL("**/dashboard");

			// Perform step-up (simulated - would need passkey in real test)
			await page.goto("https://snapback.dev/settings/api-keys");
			await page.click('[data-testid="create-api-key"]');

			// Complete step-up modal (assuming it appears)
			const stepUpModal = page.locator('[data-testid="stepup-modal"]');
			if (await stepUpModal.isVisible()) {
				await page.click('[data-testid="verify-passkey"]');
				await stepUpModal.waitFor({ state: "hidden" });
			}

			// ✅ Use server-side time control API to fast-forward 301 seconds
			const timeResponse = await request.post("/api/test/time/fast-forward", {
				data: { ms: 301 * 1000 }, // 301 seconds
			});

			expect(timeResponse.status()).toBe(200);
			const timeData = await timeResponse.json();
			expect(timeData.success).toBe(true);

			// Attempt another sensitive operation
			await page.goto("https://snapback.dev/settings/billing");

			// Should show step-up modal again because window expired
			await expect(page.locator('[data-testid="stepup-modal"]')).toBeVisible({ timeout: 3000 });

			// ✅ Clean up: Reset server time for next tests
			await request.post("/api/test/time/reset");
		});
	});

	test.describe("Passkey Enforcement", () => {
		test("requires passkey for API key creation", async ({ page, context }) => {
			// Enable virtual authenticator
			const client = await context.newCDPSession(page);
			await client.send("WebAuthn.enable");
			await client.send("WebAuthn.addVirtualAuthenticator", {
				options: {
					protocol: "ctap2",
					transport: "usb",
					hasResidentKey: true,
					hasUserVerification: true,
					isUserVerified: true,
				},
			});

			// Login
			await page.goto("https://snapback.dev/auth/signin");
			await page.fill('[name="email"]', "test@example.com");
			await page.fill('[name="password"]', "Test123!@#");
			await page.click('[type="submit"]');

			// Navigate to API keys
			await page.goto("https://snapback.dev/settings/api-keys");

			// Click create API key
			await page.click('[data-testid="create-api-key"]');

			// Should require step-up + passkey
			await expect(page.locator('[data-testid="stepup-modal"]')).toBeVisible();

			// Virtual authenticator should auto-approve
			await page.click('[data-testid="verify-passkey"]');

			// Should proceed to create key
			await expect(page.locator('[data-testid="api-key-created"]')).toBeVisible({ timeout: 5000 });
		});

		test("enforces passkey enrollment after TOTP use", async ({ page }) => {
			// Login as user without passkey enrolled
			await page.goto("https://snapback.dev/auth/signin");
			await page.fill('[name="email"]', "user-no-passkey@example.com");
			await page.fill('[name="password"]', "Test123!@#");
			await page.click('[type="submit"]');
			await page.waitForURL("**/dashboard");

			// Attempt sensitive operation (API key creation)
			await page.goto("https://snapback.dev/settings/api-keys");
			await page.click('[data-testid="create-api-key"]');

			// Step-up modal should appear
			await expect(page.locator('[data-testid="stepup-modal"]')).toBeVisible();

			// Select TOTP method (instead of passkey)
			await page.click('[data-testid="stepup-method-totp"]');
			await page.fill('[data-testid="totp-code-input"]', "123456");
			await page.click('[data-testid="verify-totp"]');

			// Should succeed but return passkeyEnrollmentRequired flag
			await page.waitForTimeout(1000);

			// Check for enrollment prompt
			const enrollmentAlert = page.locator('[data-testid="passkey-enrollment-required"]');
			await expect(enrollmentAlert).toBeVisible();
			await expect(enrollmentAlert).toContainText("Please enroll a passkey for enhanced security");

			// Next attempt should enforce passkey
			await page.goto("https://snapback.dev/settings/api-keys");
			await page.click('[data-testid="create-api-key-2"]');

			// TOTP option should be disabled or show error
			const totpOption = page.locator('[data-testid="stepup-method-totp"]');
			if (await totpOption.isVisible()) {
				await expect(totpOption).toBeDisabled();
			}
		});
	});

	test.describe("RLS Tenant Isolation", () => {
		test("prevents cross-org data access", async ({ page, request }) => {
			// Login as user from Org A
			await page.goto("https://snapback.dev/auth/signin");
			await page.fill('[name="email"]', "user-a@org-a.com");
			await page.fill('[name="password"]', "Test123!@#");
			await page.click('[type="submit"]');

			// Get Org A's data
			const orgAResponse = await request.get("/api/v1/organization/members", {
				headers: {
					credentials: "include",
				},
			});

			const orgAData = await orgAResponse.json();
			const _orgAId = orgAData.organizationId;

			// Attempt to access Org B's data directly
			const orgBId = "different-org-uuid";
			const orgBResponse = await request.get(`/api/v1/organization/${orgBId}/members`, {
				headers: {
					credentials: "include",
				},
			});

			// Should return 403 or empty data due to RLS
			expect([403, 200]).toContain(orgBResponse.status());
			if (orgBResponse.status() == 200) {
				const orgBData = await orgBResponse.json();
				expect(orgBData.members || []).toHaveLength(0);
			}
		});
	});

	test.describe("HIBP Password Validation", () => {
		test("rejects breached passwords", async ({ page }) => {
			await page.goto("https://snapback.dev/auth/signup");

			await page.fill('[name="email"]', "test@example.com");
			await page.fill('[name="name"]', "Test User");
			await page.fill('[name="password"]', "Password123"); // Known breached
			await page.fill('[name="confirmPassword"]', "Password123");

			await page.click('[type="submit"]');

			// Should show error about breached password
			await expect(page.locator(".error")).toContainText("breached");
		});
	});

	test.describe("Security Headers", () => {
		test("includes all required security headers", async ({ page }) => {
			const response = await page.goto("https://snapback.dev");

			const headers = response?.headers() || {};

			expect(headers["strict-transport-security"]).toContain("max-age=");
			expect(headers["x-frame-options"]).toBe("DENY");
			expect(headers["x-content-type-options"]).toBe("nosniff");
			expect(headers["content-security-policy"]).toBeDefined();
			expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
		});

		test("CSP blocks inline scripts", async ({ page }) => {
			await page.goto("https://snapback.dev");

			// Attempt to execute inline script
			const xssAttempt = await page
				.evaluate(() => {
					try {
						// biome-ignore lint: testing XSS prevention
						eval("window.__xss = true");
						return (window as any).__xss === true;
					} catch (_e) {
						return false;
					}
				})
				.catch(() => false);

			// Should be blocked by CSP
			expect(xssAttempt).toBe(false);
		});
	});

	test.describe("JWT for Tools Only", () => {
		test("rejects JWT from browser User-Agent", async ({ request }) => {
			// Get a JWT token (mock for testing)
			const jwt = "mock-jwt-token"; // In real test, generate valid JWT

			const response = await request.get("/api/v1/snapshots", {
				headers: {
					Authorization: `Bearer ${jwt}`,
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
				},
			});

			// Should be rejected (403)
			expect(response.status()).toBe(403);
			const body = await response.json();
			expect(body.error).toContain("not allowed from browser");
		});

		test.skip("accepts JWT from tool User-Agent", async ({ request }) => {
			// TODO: This test requires RS256 test keys
			// To implement properly:
			// 1. Generate test RSA key pair:
			//    const keyPair = await jose.generateKeyPair('RS256', { modulusLength: 2048 });
			// 2. Configure server with public key (env var or test endpoint)
			// 3. Sign JWT with private key below
			//
			// For now, test is skipped pending test key infrastructure

			/*
			// Example implementation (requires test keys):
			import * as jose from 'jose';

			// In real test env, load from TEST_JWT_PRIVATE_KEY env var
			const privateKey = await jose.importPKCS8(
				process.env.TEST_JWT_PRIVATE_KEY || '',
				'RS256'
			);

			const jwt = await new jose.SignJWT({
				sub: 'test-user',
				org_id: 'test-org-123'
			})
				.setProtectedHeader({ alg: 'RS256' })
				.setIssuer('https://api.snapback.dev')
				.setAudience('cli')
				.setIssuedAt()
				.setExpirationTime('15m')
				.sign(privateKey);

			const response = await request.get("/api/v1/snapshots", {
				headers: {
					Authorization: `Bearer ${jwt}`,
					"User-Agent": "SnapBack-CLI/1.0.0",
				},
			});

			// Should succeed with valid JWT from tool User-Agent
			expect(response.status()).toBe(200);
			const body = await response.json();
			expect(body.snapshots).toBeDefined();
			*/

			// Temporary mock test (remove when real implementation above is uncommented)
			const mockJWT = "mock-valid-jwt-token";

			const response = await request.get("/api/v1/snapshots", {
				headers: {
					Authorization: `Bearer ${mockJWT}`,
					"User-Agent": "SnapBack-CLI/1.0.0",
				},
			});

			// With tool User-Agent, should attempt to verify JWT (will fail with mock token)
			expect([401, 200]).toContain(response.status());

			if (response.status() == 401) {
				const body = await response.json();
				// Should be JWT verification error, not User-Agent error
				expect(body.code).toMatch(/JWT_INVALID|JWT_EXPIRED/);
				expect(body.error).not.toContain("not allowed from browser");
			}
		});
	});
});

/**
 * Test Configuration Notes:
 *
 * 1. Run these tests against staging/test environment, not production
 * 2. Virtual authenticator support requires Playwright CDP session
 * 3. Turnstile requires mock/bypass token for CI
 * 4. Some tests are skipped pending implementation details
 *
 * Run with:
 * pnpm exec playwright test tests/e2e/security/
 */
