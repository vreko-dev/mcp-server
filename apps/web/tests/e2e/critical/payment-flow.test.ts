import { expect, test } from "@playwright/test";

// Helper function to login as a user
async function loginAsUser(page: any) {
	// Mock user login
	await page.goto("/auth/login");
	await page.fill('[name="email"]', "test@example.com");
	await page.fill('[name="password"]', "Test123!@#");
	await page.click('[type="submit"]');

	// Wait for redirect to dashboard
	await page.waitForURL("/app/dashboard");
}

// Helper function to mock Stripe checkout
async function _mockStripeCheckout(
	page: any,
	options: { success?: boolean } = {},
) {
	// Mock Stripe checkout success
	if (options.success) {
		await page.goto("/app/dashboard?upgraded=true");
	}
}

test.describe("Payment Flow", () => {
	test("should complete subscription purchase", async ({ page }) => {
		// Login
		await loginAsUser(page);

		// Navigate to billing
		await page.goto("/app/settings/billing");

		// Select plan
		await page.click('[data-testid="select-team-monthly"]');

		// Enter payment (use Stripe test card)
		await page
			.frameLocator('iframe[name*="stripe"]')
			.locator('[name="cardnumber"]')
			.fill("4242424242424242");
		await page
			.frameLocator('iframe[name*="stripe"]')
			.locator('[name="exp-date"]')
			.fill("12/30");
		await page
			.frameLocator('iframe[name*="stripe"]')
			.locator('[name="cvc"]')
			.fill("123");
		await page
			.frameLocator('iframe[name*="stripe"]')
			.locator('[name="postal"]')
			.fill("12345");

		// Submit
		await page.click('[type="submit"]');

		// Verify success
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
		await expect(
			page.locator('[data-testid="current-plan-team"]'),
		).toBeVisible();
	});

	test("should handle payment failure", async ({ page }) => {
		// Login
		await loginAsUser(page);

		// Navigate to billing
		await page.goto("/app/settings/billing");

		// Select plan
		await page.click('[data-testid="select-team-monthly"]');

		// Enter payment (use Stripe test card for failure)
		await page
			.frameLocator('iframe[name*="stripe"]')
			.locator('[name="cardnumber"]')
			.fill("4000000000000002");
		await page
			.frameLocator('iframe[name*="stripe"]')
			.locator('[name="exp-date"]')
			.fill("12/30");
		await page
			.frameLocator('iframe[name*="stripe"]')
			.locator('[name="cvc"]')
			.fill("123");
		await page
			.frameLocator('iframe[name*="stripe"]')
			.locator('[name="postal"]')
			.fill("12345");

		// Submit
		await page.click('[type="submit"]');

		// Verify error
		await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
	});

	test("should cancel subscription", async ({ page }) => {
		// Login
		await loginAsUser(page);

		// Navigate to billing
		await page.goto("/app/settings/billing");

		// Cancel subscription
		await page.click('[data-testid="cancel-subscription"]');

		// Confirm cancellation
		await page.click('[data-testid="confirm-cancel"]');

		// Verify cancellation
		await expect(
			page.locator('[data-testid="subscription-cancelled"]'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="current-plan-free"]'),
		).toBeVisible();
	});
});
