import { expect, test } from "@playwright/test";

test.describe("Marketing Pricing Page", () => {
	test("should display all pricing tiers", async ({ page }) => {
		// Navigate to the home page
		await page.goto("/");

		// Scroll to pricing section
		const pricingSection = page.locator("#pricing");
		await pricingSection.scrollIntoViewIfNeeded();

		// Check that pricing section is visible
		await expect(pricingSection).toBeVisible();

		// Check that all pricing tiers are visible
		await expect(page.getByRole("heading", { name: "Core" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Enterprise" }),
		).toBeVisible();
	});

	test("should display trust signals", async ({ page }) => {
		// Navigate to the home page
		await page.goto("/");

		// Scroll to pricing section
		const pricingSection = page.locator("#pricing");
		await pricingSection.scrollIntoViewIfNeeded();

		// Check that trust signals are visible
		await expect(
			page.locator("#pricing").getByText("Protected Developers"),
		).toBeVisible();
		await expect(
			page.locator("#pricing").getByText("Checkpoints Created"),
		).toBeVisible();
	});
});
