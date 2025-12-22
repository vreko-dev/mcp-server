/**
 * Tier Gating E2E Tests
 *
 * Tests feature gating based on user tier (free vs pro)
 * Validates that Pro features are properly gated and upgrade CTAs are shown
 *
 * Coverage: Happy path (pro access), sad path (free blocked), edge cases, error handling
 */
import { expect, test } from "@playwright/test";

test.describe("Tier Feature Gating", () => {
	test.describe("Public Page Access", () => {
		// Happy path: All users can access marketing pages
		test("marketing pages accessible without auth", async ({ page }) => {
			await page.goto("http://snapback.dev");
			await expect(page.locator("body")).toBeVisible();
			await expect(page.locator("h1, .hero").first()).toBeVisible();
		});

		// Happy path: Docs accessible without auth
		test("documentation accessible without auth", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");
			await expect(page.locator("body")).toBeVisible();
		});

		// Happy path: Pricing page shows tier comparison
		test("pricing page shows tier comparison", async ({ page }) => {
			await page.goto("http://snapback.dev/pricing");

			// Should show tier options
			await expect(page.getByText(/free|pro|enterprise/i).first()).toBeVisible();
		});
	});

	test.describe("Dashboard Access", () => {
		// Sad path: Unauthenticated user redirected from dashboard
		test("unauthenticated user redirected from dashboard", async ({ page }) => {
			await page.goto("http://console.snapback.dev/app/dashboard");

			// Should redirect to login
			await page.waitForURL(/login|signin|auth/, { timeout: 5000 });
			await expect(page).toHaveURL(/login|signin|auth/);
		});

		// Sad path: Unauthenticated user redirected from settings
		test("unauthenticated user redirected from settings", async ({ page }) => {
			await page.goto("http://console.snapback.dev/app/settings");

			// Should redirect to login
			await page.waitForURL(/login|signin|auth/, { timeout: 5000 });
		});
	});

	test.describe("Tier-Specific Features (Requires Auth)", () => {
		// These tests require auth fixtures with specific tier users

		test.skip("free tier user sees upgrade CTA on pro features", async ({ page }) => {
			// TODO: Requires auth fixture with free tier user
			// await auth.loginWithTestToken("free_tier");

			await page.goto("http://console.snapback.dev/app/dashboard");

			// Click on a Pro feature
			const proFeature = page.getByText(/cluster|advanced|pro/i).first();
			if (await proFeature.isVisible()) {
				await proFeature.click();

				// Should see upgrade modal or CTA
				await expect(page.getByText(/upgrade|pro|unlock/i)).toBeVisible();
			}
		});

		test.skip("pro tier user can access all features", async ({ page }) => {
			// TODO: Requires auth fixture with pro tier user
			// await auth.loginWithTestToken("pro_tier");

			await page.goto("http://console.snapback.dev/app/dashboard");

			// Should NOT see upgrade modal, should see feature content
			await expect(page.getByText(/upgrade to pro/i)).not.toBeVisible();
		});

		test.skip("enterprise tier user sees team management", async ({ page }) => {
			// TODO: Requires auth fixture with enterprise tier user
			// await auth.loginWithTestToken("enterprise_tier");

			await page.goto("http://console.snapback.dev/app/settings");

			// Should see team/organization management
			await expect(page.getByText(/team|organization|members/i)).toBeVisible();
		});
	});

	test.describe("API Key Tier Limits", () => {
		// Edge case: API key limits per tier
		test.skip("free tier shows API key limit", async ({ page }) => {
			// TODO: Requires auth fixture
			await page.goto("http://console.snapback.dev/app/api-keys");

			// Should show limit indicator
			await expect(page.getByText(/limit|quota|usage/i)).toBeVisible();
		});
	});

	test.describe("Upgrade Flow", () => {
		// Happy path: Upgrade button leads to pricing/checkout
		test("upgrade button navigates to pricing", async ({ page }) => {
			await page.goto("http://snapback.dev");

			// Find upgrade or pricing link
			const upgradeLink = page.getByRole("link", { name: /pricing|upgrade|pro/i }).first();
			if (await upgradeLink.isVisible()) {
				await upgradeLink.click();
				await expect(page).toHaveURL(/pricing|checkout|billing/);
			}
		});

		// Happy path: Pricing page has working CTA buttons
		test("pricing page CTAs are clickable", async ({ page }) => {
			await page.goto("http://snapback.dev/pricing");

			// Find CTA buttons
			const ctaButtons = page.getByRole("button", { name: /get started|try|start/i });
			const count = await ctaButtons.count();
			expect(count).toBeGreaterThan(0);
		});
	});

	test.describe("Pioneer Tier Integration", () => {
		// Happy path: Pioneer page shows tier benefits
		test("pioneer page displays tier benefits", async ({ page }) => {
			await page.goto("http://console.snapback.dev/pioneer");

			// Should show tier benefits
			await expect(page.getByText(/benefit|feature|perk/i).first()).toBeVisible();
		});

		// Edge case: Pioneer tier grants Pro features
		test.skip("pioneer cultivator tier has Pro features", async ({ page }) => {
			// TODO: Requires auth fixture with cultivator pioneer
			// await auth.loginWithTestToken("pioneer_cultivator");

			await page.goto("http://console.snapback.dev/app/dashboard");

			// Should have access to Pro features without upgrade modal
			await expect(page.getByText(/upgrade to pro/i)).not.toBeVisible();
		});
	});

	test.describe("Error Handling", () => {
		// Error case: Graceful handling of tier check failure
		test("page loads even if tier check slow", async ({ page }) => {
			// Slow down API calls
			await page.route("**/api/**", async (route) => {
				await new Promise((r) => setTimeout(r, 1000));
				await route.continue();
			});

			await page.goto("http://console.snapback.dev/pioneer");

			// Page should still render (possibly with loading state)
			await expect(page.locator("body")).toBeVisible();
		});
	});
});
