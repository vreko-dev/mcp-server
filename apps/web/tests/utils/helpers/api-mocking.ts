import type { Page } from "@playwright/test";

// Mock API responses for testing
export async function mockApiResponses(page: Page): Promise<void> {
	// Mock successful API key creation
	await page.route("**/api/v1/api-keys", async (route: any) => {
		if (route.request().method() === "POST") {
			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					id: "test-api-key-id",
					key: "sk_test_1234567890abcdef",
					name: "Test API Key",
					permissions: ["read", "write"],
					createdAt: new Date().toISOString(),
					expiresAt: new Date(
						Date.now() + 365 * 24 * 60 * 60 * 1000,
					).toISOString(),
				}),
			});
		} else {
			await route.continue();
		}
	});

	// Mock API key list
	await page.route("**/api/v1/api-keys", async (route: any) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{
						id: "api-key-1",
						name: "Production Key",
						permissions: ["read", "write"],
						createdAt: new Date().toISOString(),
						expiresAt: new Date(
							Date.now() + 365 * 24 * 60 * 60 * 1000,
						).toISOString(),
					},
					{
						id: "api-key-2",
						name: "Development Key",
						permissions: ["read"],
						createdAt: new Date().toISOString(),
						expiresAt: new Date(
							Date.now() + 180 * 24 * 60 * 60 * 1000,
						).toISOString(),
					},
				]),
			});
		} else {
			await route.continue();
		}
	});

	// Mock user profile
	await page.route("**/api/v1/users/me", async (route: any) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "user",
				createdAt: new Date().toISOString(),
			}),
		});
	});

	// Mock organization data
	await page.route("**/api/v1/organizations/**", async (route: any) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				id: "org-123",
				name: "Test Organization",
				slug: "test-org",
				createdAt: new Date().toISOString(),
			}),
		});
	});
}

// Mock network errors
export async function mockNetworkError(
	page: Page,
	urlPattern: string,
	statusCode = 500,
): Promise<void> {
	await page.route(urlPattern, async (route: any) => {
		await route.fulfill({
			status: statusCode,
			contentType: "application/json",
			body: JSON.stringify({
				error: "Network error occurred",
				statusCode,
			}),
		});
	});
}

// Mock slow API responses
export async function mockSlowResponse(
	page: Page,
	urlPattern: string,
	delay = 2000,
): Promise<void> {
	await page.route(urlPattern, async (route: any) => {
		await page.waitForTimeout(delay);
		await route.continue();
	});
}
