import { expect, test } from "@playwright/test";

// Helper function to login as a user
async function _loginAsUser(page: any) {
	// For this test, we'll directly navigate to the API keys page
	// In a real implementation, you would have proper authentication
	await page.goto("/app/api-keys");
}

test.describe("API Key Lifecycle", () => {
	test("should create, copy, and revoke an API key", async ({ page }) => {
		// Navigate to API keys page
		await page.goto("/app/api-keys");

		// Check that we're on the correct page
		await expect(page.getByRole("heading", { name: "API Keys" })).toBeVisible();

		// Check that create button is visible
		const createButton = page.getByRole("button", {
			name: /create api key/i,
		});
		await expect(createButton).toBeVisible();

		// Click create button
		await createButton.click();

		// Check that modal is open
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByText("Create API Key")).toBeVisible();

		// Fill in key name
		await page.fill('[name="keyName"]', "Test API Key");

		// Click create
		await page.getByRole("button", { name: /create/i }).click();

		// Check that key is displayed
		await expect(page.getByText(/api key created successfully/i)).toBeVisible();
		const keyDisplay = page.getByTestId("api-key-display");
		await expect(keyDisplay).toBeVisible();

		// Check that key has correct format
		const keyText = await keyDisplay.textContent();
		expect(keyText).toMatch(/^sb_[a-zA-Z0-9]{32}$/);

		// Check that copy button is visible
		const copyButton = page.getByRole("button", { name: /copy/i });
		await expect(copyButton).toBeVisible();

		// Click copy button
		await copyButton.click();

		// Check that copied confirmation is shown
		await expect(page.getByText(/copied to clipboard/i)).toBeVisible();

		// Click done to close modal
		await page.getByRole("button", { name: /done/i }).click();

		// Check that key appears in list
		await expect(page.getByText("Test API Key")).toBeVisible();

		// Check that revoke button is visible
		const revokeButton = page.getByRole("button", { name: /revoke/i });
		await expect(revokeButton).toBeVisible();

		// Click revoke button
		await revokeButton.click();

		// Check that confirmation dialog is shown
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByText(/are you sure/i)).toBeVisible();

		// Confirm revocation
		await page.getByRole("button", { name: /confirm/i }).click();

		// Check that success message is shown
		await expect(page.getByText(/api key revoked/i)).toBeVisible();
	});

	test("should validate API key name requirements", async ({ page }) => {
		// Navigate to API keys page
		await page.goto("/app/api-keys");

		// Click create button
		await page.getByRole("button", { name: /create api key/i }).click();

		// Try to create with empty name
		await page.getByRole("button", { name: /create/i }).click();

		// Check that validation error is shown
		await expect(page.getByText(/name is required/i)).toBeVisible();

		// Try with too short name
		await page.fill('[name="keyName"]', "ab");
		await page.getByRole("button", { name: /create/i }).click();

		// Check that validation error is shown
		await expect(page.getByText(/at least 3 characters/i)).toBeVisible();
	});
});
