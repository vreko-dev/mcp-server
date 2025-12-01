import { expect, test } from "@playwright/test";

test.describe("New User Critical Path", () => {
	test("Complete signup to first API call success", async ({ page }) => {
		// 1. Landing page loads with CTA visible
		await page.goto("/");
		await expect(page.getByText("Code Breaks.\nSnap Back.")).toBeVisible();

		// 2. Signup flow
		await page.click('[data-testid="hero-cta"]');
		await page.fill('[name="email"]', "test@example.com");
		await page.fill('[name="password"]', "Test123!@#");
		await page.click('[type="submit"]');

		// 3. Email verification (mock in test env)
		await page.goto("/auth/verify?token=mock-token");

		// 4. Onboarding completion
		await expect(page).toHaveURL("/onboarding");
		await page.click('[data-testid="skip-onboarding"]'); // Test skip path

		// 5. Dashboard loads with empty state
		await expect(page).toHaveURL("/app/dashboard");
		await expect(page.getByText("Generate Your First API Key")).toBeVisible();

		// 6. API key generation
		await page.click('[data-testid="generate-api-key"]');
		await page.fill('[name="keyName"]', "VS Code - Main");
		await page.click('[data-testid="create-key"]');

		// 7. Key displayed and copyable
		const keyElement = page.getByTestId("api-key-display");
		await expect(keyElement).toContainText("snap_");

		// 8. Copy to clipboard works
		await page.click('[data-testid="copy-key"]');
		const clipboardText = await page.evaluate(() =>
			navigator.clipboard.readText(),
		);
		expect(clipboardText).toMatch(/^snap_[a-zA-Z0-9_-]{32}$/);

		// 9. Simulate VS Code making first API call
		const apiKey = await keyElement.textContent();
		const response = await page.request.post("/api/v1/code/analyze", {
			headers: { Authorization: `Bearer ${apiKey}` },
			data: { code: 'console.log("test")', language: "javascript" },
		});
		expect(response.status()).toBe(200);

		// 10. Dashboard updates with usage
		await page.reload();
		await expect(page.getByTestId("api-calls-count")).toContainText("1");
	});
});
