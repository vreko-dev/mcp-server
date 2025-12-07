/**
 * E2E Tests - Performance
 * Tests page load times, API response times, and search performance
 */

import { expect, test } from "@playwright/test";
import { createTestUser, loginUser } from "../helpers/auth";

test.describe("Performance", () => {
	test.describe("Page load times < 2s", () => {
		test("marketing page loads within 2 seconds", async ({ page }) => {
			const startTime = Date.now();

			await page.goto("http://snapback.dev");

			const loadTime = Date.now() - startTime;
			expect(loadTime).toBeLessThan(2000); // 2 seconds

			// Verify page content loaded
			await expect(page.getByText("Protect Your Code")).toBeVisible();
		});

		test("dashboard page loads within 2 seconds", async ({ page }) => {
			const email = `perf-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			const startTime = Date.now();

			await page.goto("/dashboard");

			const loadTime = Date.now() - startTime;
			expect(loadTime).toBeLessThan(2000); // 2 seconds

			// Verify page content loaded
			await expect(page.getByText("Welcome back")).toBeVisible();
		});

		test("documentation page loads within 2 seconds", async ({ page }) => {
			const startTime = Date.now();

			await page.goto("http://docs.snapback.dev");

			const loadTime = Date.now() - startTime;
			expect(loadTime).toBeLessThan(2000); // 2 seconds

			// Verify page content loaded
			await expect(page.getByText("Documentation")).toBeVisible();
		});
	});

	test.describe("API response times < 200ms", () => {
		test("health check endpoint responds within 200ms", async ({ request }) => {
			const startTime = Date.now();

			const response = await request.get("http://api.snapback.dev/health");

			const responseTime = Date.now() - startTime;
			expect(responseTime).toBeLessThan(200); // 200ms

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.status).toBe("healthy");
		});

		test("user profile endpoint responds within 200ms", async ({ page, request }) => {
			const email = `perf-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const cookies = await page.context().cookies();
			const authToken = cookies.find((c) => c.name.includes("session"))?.value;

			const startTime = Date.now();

			const response = await request.get("http://api.snapback.dev/api/v1/user/profile", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			});

			const responseTime = Date.now() - startTime;
			expect(responseTime).toBeLessThan(200); // 200ms

			expect(response.ok()).toBe(true);
		});

		test("MCP health endpoint responds within 200ms", async ({ request }) => {
			const startTime = Date.now();

			const response = await request.get("http://mcp.snapback.dev/health");

			const responseTime = Date.now() - startTime;
			expect(responseTime).toBeLessThan(200); // 200ms

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.status).toBe("healthy");
		});
	});

	test.describe("Search response < 500ms", () => {
		test("documentation search responds within 500ms", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			const startTime = Date.now();

			// Type search query
			await page.locator('[data-testid="search-input"]').fill("authentication");

			// Wait for results
			await page.waitForSelector('[data-testid="search-results"]');

			const responseTime = Date.now() - startTime;
			expect(responseTime).toBeLessThan(500); // 500ms

			// Verify results appeared
			const resultCount = await page.locator('[data-testid="search-result-item"]').count();
			expect(resultCount).toBeGreaterThan(0);
		});

		test("API search endpoint responds within 500ms", async ({ request }) => {
			const startTime = Date.now();

			const response = await request.get("http://api.snapback.dev/api/v1/search?q=test");

			const responseTime = Date.now() - startTime;
			expect(responseTime).toBeLessThan(500); // 500ms

			expect(response.ok()).toBe(true);
		});
	});
});
