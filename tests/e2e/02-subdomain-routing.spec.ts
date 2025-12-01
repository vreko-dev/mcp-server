import { expect, test } from "@playwright/test";

test.describe("Subdomain Routing", () => {
	test("snapback.dev serves marketing", async ({ page }) => {
		await page.goto("http://snapback.dev");
		await expect(page).toHaveTitle(/SnapBack/);
		// Add more specific checks for marketing site
	});

	test("console.snapback.dev routes to SaaS", async ({ page }) => {
		await page.goto("http://console.snapback.dev");
		// Add specific checks for SaaS console
	});

	test("docs.snapback.dev routes to docs", async ({ page }) => {
		await page.goto("http://docs.snapback.dev");
		await expect(page).toHaveTitle(/Documentation/);
	});

	test("api.snapback.dev returns JSON", async ({ request }) => {
		const response = await request.get("http://api.snapback.dev:8080/health");
		expect(response.status()).toBe(200);

		const contentType = response.headers()["content-type"];
		expect(contentType).toContain("application/json");
	});

	test("Cookies work across subdomains", async ({ page, context }) => {
		// Navigate to main site and set a cookie
		await page.goto("http://snapback.dev");

		// Set a test cookie
		await context.addCookies([
			{
				name: "test-cookie",
				value: "test-value",
				domain: ".snapback.dev",
				path: "/",
			},
		]);

		// Navigate to another subdomain and check if cookie is present
		await page.goto("http://console.snapback.dev");
		const cookies = await context.cookies(".snapback.dev");
		const testCookie = cookies.find((cookie) => cookie.name === "test-cookie");

		expect(testCookie).toBeDefined();
		expect(testCookie?.value).toBe("test-value");
	});
});
