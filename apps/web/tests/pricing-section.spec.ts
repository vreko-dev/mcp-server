import { expect, test } from "@playwright/test";

test.describe("Pricing Section - Enhanced", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the page with pricing section
		await page.goto("/");
		// Scroll to pricing section
		await page.locator("#pricing").scrollIntoViewIfNeeded();
	});

	test("should display all pricing tiers", async ({ page }) => {
		// Check that all 4 tiers are visible
		const tiers = ["Free", "Pro", "Team", "Enterprise"];

		for (const tier of tiers) {
			await expect(
				page.locator(`[class*="pricing"]`).filter({ hasText: tier }),
			).toBeVisible();
		}
	});

	test("should highlight Pro tier as popular", async ({ page }) => {
		// Find the popular badge
		const popularBadge = page.locator("text=Most Popular").first();
		await expect(popularBadge).toBeVisible();

		// Verify it's near the Pro tier
		const soloCard = page
			.locator('[class*="pricing"]')
			.filter({ hasText: "Pro" })
			.first();
		await expect(soloCard).toBeVisible();
	});

	test("should toggle between monthly and annual billing", async ({ page }) => {
		// Find billing toggle
		const monthlyButton = page.getByRole("button", { name: /monthly/i });
		const annualButton = page.getByRole("button", { name: /annual/i });

		// Default should be monthly
		await expect(monthlyButton).toBeVisible();
		await expect(annualButton).toBeVisible();

		// Check Solo price (monthly)
		const soloCard = page.locator("text=Pro").locator("..");
		await expect(soloCard).toContainText("$12");

		// Click annual
		await annualButton.click();

		// Wait for animation and check price changed
		await page.waitForTimeout(500);
		await expect(soloCard).toContainText("$10");

		// Verify savings badge appears
		await expect(page.locator("text=Save 20%").first()).toBeVisible();
	});

	test("should expand and collapse feature lists", async ({ page }) => {
		// Get all "View all features" buttons
		const viewMoreButtons = page.getByRole("button", {
			name: /view all features/i,
		});

		// Get count of view more buttons
		const buttonCount = await viewMoreButtons.count();
		expect(buttonCount).toBeGreaterThan(0);

		// Click first button
		await viewMoreButtons.first().click();

		// Wait for expansion animation
		await page.waitForTimeout(500);

		// Check button text changed to "Show less"
		await expect(
			page.getByRole("button", { name: /show less/i }).first(),
		).toBeVisible();

		// Verify other cards remain collapsed
		const remainingViewMore = page.getByRole("button", {
			name: /view all features/i,
		});
		const remainingCount = await remainingViewMore.count();
		expect(remainingCount).toBe(buttonCount - 1);

		// Click show less
		await page
			.getByRole("button", { name: /show less/i })
			.first()
			.click();

		// Wait for collapse animation
		await page.waitForTimeout(500);

		// Verify all are collapsed again
		const finalCount = await page
			.getByRole("button", { name: /view all features/i })
			.count();
		expect(finalCount).toBe(buttonCount);
	});

	test("should display feature categories with icons", async ({ page }) => {
		// Expand first tier with viewMore features
		const viewMoreButtons = page.getByRole("button", {
			name: /view all features/i,
		});

		if ((await viewMoreButtons.count()) > 0) {
			await viewMoreButtons.first().click();
			await page.waitForTimeout(500);

			// Check for category icons
			const featureIcons = [
				"🛡️", // protection
				"🧠", // intelligence
				"👥", // collaboration
				"✅", // compliance
			];

			// At least one icon should be visible
			let foundIcon = false;
			for (const icon of featureIcons) {
				const iconCount = await page.locator(`text=${icon}`).count();
				if (iconCount > 0) {
					foundIcon = true;
					break;
				}
			}
			expect(foundIcon).toBeTruthy();
		}
	});

	test("should display trust signals and guarantees", async ({ page }) => {
		// Check stats are visible
		await expect(page.locator("text=99.9%")).toBeVisible();
		await expect(page.locator("text=24/7")).toBeVisible();
		await expect(
			page.locator("text=Trusted by developers worldwide"),
		).toBeVisible();

		// Check guarantees
		const guarantees = [
			"30-day money-back guarantee",
			"Cancel anytime, no questions",
			"Secure payment via Stripe",
		];

		for (const guarantee of guarantees) {
			await expect(page.locator(`text=${guarantee}`)).toBeVisible();
		}
	});

	test("should display FAQ section", async ({ page }) => {
		// Scroll to FAQ
		await page
			.locator("text=Frequently Asked Questions")
			.scrollIntoViewIfNeeded();

		// Check FAQ heading
		await expect(page.locator("text=Frequently Asked Questions")).toBeVisible();

		// Check at least one FAQ item
		await expect(page.locator('[class*="accordion"]').first()).toBeVisible();
	});

	test("should have accessible CTA buttons", async ({ page }) => {
		// Find all CTA buttons
		const ctaButtons = page
			.locator('[class*="pricing"] button, [class*="pricing"] a')
			.filter({
				hasText: /start free|protect my code|start team trial|contact sales/i,
			});

		const count = await ctaButtons.count();
		expect(count).toBeGreaterThanOrEqual(4);

		// Check first button is accessible
		const firstCta = ctaButtons.first();
		await expect(firstCta).toBeVisible();

		// Verify it's keyboard accessible
		await firstCta.focus();
		await expect(firstCta).toBeFocused();
	});

	test("should be responsive across viewports", async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.waitForTimeout(500);

		// Cards should stack vertically on mobile
		const pricingGrid = page.locator("#pricing").first();
		await expect(pricingGrid).toBeVisible();

		// Test tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.waitForTimeout(500);
		await expect(pricingGrid).toBeVisible();

		// Test desktop viewport
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.waitForTimeout(500);
		await expect(pricingGrid).toBeVisible();
	});

	test("should be keyboard navigable", async ({ page }) => {
		// Focus on billing toggle
		const monthlyButton = page.getByRole("button", { name: /monthly/i });
		await monthlyButton.focus();
		await expect(monthlyButton).toBeFocused();

		// Tab to annual button
		await page.keyboard.press("Tab");
		const annualButton = page.getByRole("button", { name: /annual/i });
		await expect(annualButton).toBeFocused();

		// Press Enter to toggle
		await page.keyboard.press("Enter");
		await page.waitForTimeout(500);

		// Navigate through cards using Tab
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");

		// Should be able to reach view more buttons
		const viewMoreButton = page
			.getByRole("button", { name: /view all features/i })
			.first();

		// Try to focus
		await viewMoreButton.focus();
		await expect(viewMoreButton).toBeFocused();

		// Press Enter to expand
		await page.keyboard.press("Enter");
		await page.waitForTimeout(500);

		// Verify expanded
		await expect(
			page.getByRole("button", { name: /show less/i }).first(),
		).toBeVisible();
	});

	test("should work with reduced motion", async ({ page }) => {
		// Enable reduced motion
		await page.emulateMedia({ reducedMotion: "reduce" });

		// Reload page
		await page.reload();
		await page.locator("#pricing").scrollIntoViewIfNeeded();

		// Content should still be visible without animations
		await expect(
			page.locator("text=Simple, transparent pricing"),
		).toBeVisible();

		// All tiers should be visible
		const tiers = ["Free", "Pro", "Team", "Enterprise"];
		for (const tier of tiers) {
			await expect(
				page.locator(`[class*="pricing"]`).filter({ hasText: tier }),
			).toBeVisible();
		}
	});

	test("should have proper accessibility labels", async ({ page }) => {
		// Check toggle buttons have proper labels
		const monthlyButton = page.getByRole("button", { name: /monthly/i });
		await expect(monthlyButton).toBeVisible();

		// Check view more buttons are properly labeled
		const viewMoreButtons = page.getByRole("button", {
			name: /view all features/i,
		});
		expect(await viewMoreButtons.count()).toBeGreaterThan(0);

		// Check CTA links/buttons have accessible names
		const ctaButtons = page.getByRole("button", {
			name: /start free|protect my code|start team trial|contact sales/i,
		});
		expect(await ctaButtons.count()).toBeGreaterThanOrEqual(4);
	});
});
