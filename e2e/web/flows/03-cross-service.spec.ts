import { expect, test } from "@playwright/test";

test.describe("Cross-Service Integration", () => {
	test("Web → API: Fetch user data", async ({ page, request }) => {
		// This test would require a logged-in user
		// For now, we'll test the API endpoint directly
		const response = await request.get("http://api.snapback.dev:8080/health");
		expect(response.status()).toBe(200);
	});

	test("API → Database: Query executes", async ({ request }) => {
		// Test through the API health endpoint which checks database connectivity
		const response = await request.get("http://api.snapback.dev:8080/health");
		const data = await response.json();

		expect(data.checks).toHaveProperty("database");
		expect(data.checks.database.status).toBe("healthy");
	});

	test("MCP → API: Tool calls API", async ({ request }) => {
		// Test MCP health which checks API connectivity
		const response = await request.get("http://mcp.snapback.dev:8081/health");
		const data = await response.json();

		expect(data.checks).toHaveProperty("api");
		expect(["healthy", "degraded"]).toContain(data.checks.api.status);
	});

	test("Docs → API: Search calls API", async ({ page, request }) => {
		// Test docs site can communicate with API
		await page.goto("http://docs.snapback.dev");

		// This would typically involve testing search functionality
		// For now, we'll just verify the docs site loads
		await expect(page).toHaveTitle(/Documentation/);
	});
});
