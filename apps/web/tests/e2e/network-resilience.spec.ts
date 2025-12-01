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

test.describe("Network Resilience", () => {
	test("handles API key creation failure gracefully", async ({ page }) => {
		await loginAsUser(page);

		// Simulate network failure
		await page.route("/api/v1/auth/api-key/create", (route) =>
			route.abort("failed"),
		);

		// Try to create key
		await page.click('[data-testid="generate-api-key"]');
		await page.fill('[name="keyName"]', "Test Key");
		await page.click('[data-testid="create-key"]');

		// Error message clear and actionable
		await expect(page.getByTestId("error-message")).toContainText(
			"Failed to create API key. Please check your connection and try again.",
		);

		// Retry button visible
		await expect(page.getByTestId("retry-button")).toBeVisible();

		// Form data preserved
		await expect(page.locator('[name="keyName"]')).toHaveValue("Test Key");
	});

	test("handles partial data load", async ({ page }) => {
		// API returns partial data
		await page.route("/api/v1/user/usage", (route) =>
			route.fulfill({
				status: 200,
				body: JSON.stringify({
					requests: 100,
					// Missing: tokens, errors, etc.
				}),
			}),
		);

		await page.goto("/app/dashboard");

		// Shows what we have
		await expect(page.getByTestId("metric-api-calls")).toContainText("100");

		// Indicates missing data gracefully
		await expect(page.getByTestId("metric-tokens")).toContainText("—");

		// No broken UI
		await expect(page).toHaveScreenshot("dashboard-partial-data.png");
	});
});
