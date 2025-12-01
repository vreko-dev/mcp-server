import { expect, test } from "@playwright/test";

// Helper function to login as a user with specific properties
async function loginAsUser(
	page: any,
	options: { withApiKey?: boolean; plan?: string; usage?: number } = {},
) {
	// Mock auth endpoints
	await page.route("**/api/auth/**", (route: any) => {
		route.fulfill({
			status: 200,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				user: {
					id: "test-user-123",
					email: "test@example.com",
					name: "Test User",
					plan: options.plan || "free",
				},
				session: { token: "mock-token" },
			}),
		});
	});

	// Mock user login
	await page.goto("/auth/login");
	await page.fill('[name="email"]', "test@example.com");
	await page.fill('[name="password"]', "Test123!@#");
	await page.click('[type="submit"]');

	// Wait for redirect to dashboard
	await page.waitForURL("/app/dashboard");
}

// Helper function to login as a new user
async function loginAsNewUser(page: any) {
	// Mock auth endpoints
	await page.route("**/api/auth/**", (route: any) => {
		route.fulfill({
			status: 200,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				user: {
					id: "new-user-456",
					email: "newuser@example.com",
					name: "New User",
					plan: "free",
				},
				session: { token: "mock-token" },
			}),
		});
	});

	// Mock new user login
	await page.goto("/auth/login");
	await page.fill('[name="email"]', "newuser@example.com");
	await page.fill('[name="password"]', "Test123!@#");
	await page.click('[type="submit"]');

	// Wait for redirect to dashboard
	await page.waitForURL("/app/dashboard");
}

test.describe("Dashboard UX", () => {
	test("metric cards update in real-time", async ({ page }) => {
		await loginAsUser(page, { withApiKey: true });

		// Mock API calls for metrics
		await page.route("**/api/v1/code/analyze", (route: any) => {
			route.fulfill({
				status: 200,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ success: true }),
			});
		});

		// Initial state
		const callsCount = page.getByTestId("metric-api-calls");
		await expect(callsCount).toContainText("0");

		// Make API call in another tab/context
		const apiKey = await page.evaluate(() =>
			localStorage.getItem("test-api-key"),
		);

		await page.evaluate(async (key: any) => {
			await fetch("/api/v1/code/analyze", {
				method: "POST",
				headers: { Authorization: `Bearer ${key}` },
				body: JSON.stringify({ code: "test" }),
			});
		}, apiKey);

		// Should update without refresh (via polling or websocket)
		await expect(callsCount).toContainText("1", { timeout: 5000 });

		// Animation should play
		await expect(callsCount).toHaveClass(/animate-pulse/);
	});

	test("empty states guide user action", async ({ page }) => {
		await loginAsNewUser(page);

		// Mock API calls for empty state
		await page.route("**/api/dashboard/**", (route: any) => {
			route.fulfill({
				status: 200,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					snapshotCount: 0,
					recoveryCount: 0,
					filesProtected: 0,
					aiDetectionRate: 0,
				}),
			});
		});

		// Empty state visible
		await expect(page.getByTestId("empty-dashboard")).toBeVisible();

		// CTA prominent
		const cta = page.getByTestId("empty-state-cta");
		await expect(cta).toContainText("Generate API Key");
		await expect(cta).toHaveCSS("background-color", "rgb(16, 185, 129)"); // Brand green

		// Clicking CTA starts flow
		await cta.click();
		await expect(page.getByTestId("api-key-modal")).toBeVisible();
	});

	test("copy actions provide feedback", async ({ page }) => {
		await loginAsUser(page, { withApiKey: true });

		// Mock clipboard API
		await page.addInitScript(() => {
			// @ts-expect-error
			navigator.clipboard = {
				writeText: () => Promise.resolve(),
			};
		});

		const copyButton = page.getByTestId("copy-api-key");

		// Initial state
		await expect(copyButton).toContainText("Copy");

		// Click to copy
		await copyButton.click();

		// Immediate feedback
		await expect(copyButton).toContainText("Copied!");
		await expect(copyButton).toHaveClass(/bg-green-500/);

		// Resets after delay
		await page.waitForTimeout(2000);
		await expect(copyButton).toContainText("Copy");
	});
});
