import { expect, test } from "@playwright/test";

// Helper function to login as a user with specific properties
async function loginAsUser(
	page: any,
	_options: { plan?: string; usage?: number } = {},
) {
	// Mock user login
	await page.goto("/auth/login");
	await page.fill('[name="email"]', "test@example.com");
	await page.fill('[name="password"]', "Test123!@#");
	await page.click('[type="submit"]');

	// Wait for redirect to dashboard
	await page.waitForURL("/app/dashboard");
}

// Helper function to mock Stripe checkout
async function mockStripeCheckout(
	page: any,
	options: { success?: boolean } = {},
) {
	// Mock Stripe checkout success
	if (options.success) {
		await page.goto("/app/dashboard?upgraded=true");
	}
}

test.describe("Subscription Upgrade Flow", () => {
	test("Free user hits limit and upgrades", async ({ page }) => {
		// Setup: User at 90% of free tier limit
		await loginAsUser(page, { plan: "free", usage: 90 });

		// 1. Warning banner visible
		await expect(page.getByTestId("usage-warning")).toContainText(
			"10 API calls remaining",
		);

		// 2. Trigger upgrade from warning
		await page.click('[data-testid="upgrade-from-warning"]');
		await expect(page).toHaveURL("/app/settings/billing");

		// 3. Pricing comparison shown
		await expect(page.getByTestId("current-plan")).toContainText("Free");
		await expect(page.getByTestId("recommended-plan")).toContainText("Pro");

		// 4. Select Pro plan
		await page.click('[data-testid="select-pro-monthly"]');

		// 5. Stripe checkout loads (mock in test)
		await expect(page).toHaveURL(/checkout\.stripe\.com/);
		await mockStripeCheckout(page, { success: true });

		// 6. Return to app with Pro active
		await expect(page).toHaveURL("/app/dashboard?upgraded=true");
		await expect(page.getByTestId("success-toast")).toContainText(
			"Welcome to Pro!",
		);
		await expect(page.getByTestId("current-plan")).toContainText("Pro");

		// 7. Limits updated immediately
		await expect(page.getByTestId("api-limit")).toContainText("10,000 / month");
	});
});
