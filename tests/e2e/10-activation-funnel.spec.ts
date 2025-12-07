/**
 * Activation Funnel E2E Tests
 * Tests the critical user activation path from marketing → signup → first value
 */
import { expect, test } from "@playwright/test";

test.describe("Activation Funnel", () => {
	test.describe("Marketing → Signup Flow", () => {
		test("landing page CTA leads to signup", async ({ page }) => {
			await page.goto("http://snapback.dev");

			// Find and click primary CTA
			const cta = page.locator('[data-testid="hero-cta"], .hero-cta, a:has-text("Get Started")').first();
			await expect(cta).toBeVisible();
			await cta.click();

			// Should navigate to console/signup
			await expect(page).toHaveURL(/console.*signup|signup/);
		});

		test("signup page loads with form", async ({ page }) => {
			await page.goto("http://console.snapback.dev/signup");

			// Check signup form elements exist
			await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
			await expect(page.locator('button[type="submit"]').first()).toBeVisible();
		});
	});

	test.describe("Time to Value Metrics", () => {
		test("marketing page loads under 2s", async ({ page }) => {
			const start = Date.now();
			await page.goto("http://snapback.dev");
			const loadTime = Date.now() - start;

			expect(loadTime).toBeLessThan(2000);
		});

		test("first content appears under 1.5s (FCP)", async ({ page }) => {
			await page.goto("http://snapback.dev");

			// Check that main content is visible quickly
			const heroContent = page.locator("h1, .hero, [data-testid='hero']").first();
			await expect(heroContent).toBeVisible({ timeout: 1500 });
		});
	});

	test.describe("Dashboard Quick Start", () => {
		test.skip("authenticated user sees dashboard metrics", async ({ page }) => {
			// Skip until auth fixtures are set up
			await page.goto("http://console.snapback.dev/dashboard");
			await expect(page.locator('[data-testid="metrics-card"]').first()).toBeVisible();
		});

		test.skip("user can create first API key", async ({ page }) => {
			// Skip until auth fixtures are set up
			await page.goto("http://console.snapback.dev/settings/api-keys");
			await page.click('button:has-text("Create Key")');
			await expect(page.locator('[data-testid="api-key-modal"]')).toBeVisible();
		});
	});

	test.describe("Core Web Vitals", () => {
		const pages = [
			{ name: "Marketing", url: "http://snapback.dev" },
			{ name: "Docs", url: "http://docs.snapback.dev" },
		];

		for (const { name, url } of pages) {
			test(`${name} page performance`, async ({ page }) => {
				await page.goto(url);

				// Basic performance check - page should be interactive
				const metrics = await page.evaluate(() => ({
					// @ts-expect-error - performance API
					timing: performance.timing.loadEventEnd - performance.timing.navigationStart,
				}));

				expect(metrics.timing).toBeLessThan(3000); // 3s max load
			});
		}
	});
});
