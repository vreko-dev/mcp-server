import { expect, test } from "@playwright/test";

/**
 * Smoke tests to verify dashboard routes exist
 * RED phase: These should fail until we implement the components
 */

test.describe("Dashboard Smoke Tests (RED Phase)", () => {
	test("dashboard route should exist", async ({ page }) => {
		await page.goto("/app/dashboard");
		// Should not be 404
		expect(page.url()).toContain("/app/dashboard");
		const heading = page.locator("h1, h2").first();
		await expect(heading).toBeVisible({ timeout: 5000 });
	});

	test("API keys route should exist", async ({ page }) => {
		await page.goto("/app/api-keys");
		// Should not be 404
		expect(page.url()).toContain("/app/api-keys");
	});

	test("billing route should exist", async ({ page }) => {
		await page.goto("/app/settings/billing");
		// Should not be 404
		expect(page.url()).toContain("/app/settings/billing");
	});
});
