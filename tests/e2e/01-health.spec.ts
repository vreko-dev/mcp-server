import { expect, test } from "@playwright/test";

test.describe("Health Checks", () => {
	test("API health endpoint responds", async ({ request }) => {
		const response = await request.get("http://api.snapback.dev:8080/health");
		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("status");
		expect(data.status).toBe("healthy");
	});

	test("MCP health endpoint responds", async ({ request }) => {
		const response = await request.get("http://mcp.snapback.dev:8081/health");
		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("status");
	});

	test("Web app loads", async ({ page }) => {
		await page.goto("http://snapback.dev");
		await expect(page).toHaveTitle(/SnapBack/);
	});

	test("Console loads", async ({ page }) => {
		await page.goto("http://console.snapback.dev");
		// Add specific checks for console page
	});

	test("Docs loads", async ({ page }) => {
		await page.goto("http://docs.snapback.dev");
		await expect(page).toHaveTitle(/Documentation/);
	});

	test("Database connection works", async ({ request }) => {
		// This would typically be tested through the API health endpoint
		const response = await request.get("http://api.snapback.dev:8080/health");
		const data = await response.json();

		expect(data.checks).toHaveProperty("database");
		expect(data.checks.database.status).toBe("healthy");
	});

	test("Redis connection works", async ({ request }) => {
		// This would typically be tested through the API health endpoint
		const response = await request.get("http://api.snapback.dev:8080/health");
		const data = await response.json();

		expect(data.checks).toHaveProperty("redis");
		expect(data.checks.redis.status).toBe("healthy");
	});
});
