import type { Page } from "@playwright/test";

/**
 * Create a test user
 */
export async function createTestUser(page: Page, email: string, password: string): Promise<void> {
	// Navigate to signup page
	await page.goto("/signup");

	// Fill signup form
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByLabel("Confirm Password").fill(password);

	// Submit form
	await page.getByRole("button", { name: "Sign Up" }).click();

	// Wait for confirmation or redirect
	await page.waitForURL("**/verify-email");
}

/**
 * Login a user
 */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
	// Navigate to login page
	await page.goto("/login");

	// Fill login form
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);

	// Submit form
	await page.getByRole("button", { name: "Log In" }).click();

	// Wait for redirect to dashboard or home page
	await page.waitForURL("**/dashboard");
}

/**
 * Get authentication token
 */
export async function getAuthToken(page: Page): Promise<string> {
	// This is a placeholder - actual implementation would depend on how your app stores tokens
	// For example, if using cookies:
	const cookies = await page.context().cookies();
	const authCookie = cookies.find((cookie) => cookie.name === "auth-token");

	if (!authCookie) {
		throw new Error("No auth token found");
	}

	return authCookie.value;
}
