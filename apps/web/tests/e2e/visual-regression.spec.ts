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

test.describe("Visual Regression", () => {
	test("dashboard states render correctly", async ({ page }) => {
		// Free user at limit
		await loginAsUser(page, { plan: "free", usage: 100 });
		await expect(page).toHaveScreenshot("dashboard-free-at-limit.png");

		// Pro user normal state
		await loginAsUser(page, { plan: "pro", usage: 20 });
		await expect(page).toHaveScreenshot("dashboard-pro-normal.png");

		// Error state
		await page.route("/api/v1/user/usage", (route) =>
			route.fulfill({ status: 500 }),
		);
		await page.reload();
		await expect(page).toHaveScreenshot("dashboard-error-state.png");
	});
});
