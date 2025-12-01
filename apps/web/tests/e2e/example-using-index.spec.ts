import { expect } from "@playwright/test";
import {
	checkAccessibility,
	compareScreenshot,
	createApiKey,
	createUser,
	DashboardPage,
	measurePageLoadPerformance,
	mockApiResponses,
	test,
} from "../utils";

test.describe("Example using index imports", () => {
	test("demonstrates simplified imports", async ({ authenticatedPage }) => {
		// Create test data using factories
		const user = createUser({ name: "Test User" });
		const apiKey = createApiKey({ name: "Test API Key" });

		// Mock API responses
		await mockApiResponses(authenticatedPage);

		// Go to dashboard
		const dashboardPage = new DashboardPage(authenticatedPage);
		await dashboardPage.goto();

		// Verify we're on the dashboard
		await dashboardPage.expectToBeOnDashboard();
		await dashboardPage.expectWelcomeMessage(user.name);

		// Check accessibility
		await checkAccessibility(authenticatedPage);

		// Measure page load performance
		const metrics = await measurePageLoadPerformance(
			authenticatedPage,
			"/app/dashboard",
		);
		console.log(`Dashboard loaded in ${metrics.loadTime}ms`);

		// Take screenshot for visual regression
		await compareScreenshot(authenticatedPage, "dashboard-index-import", {
			fullPage: true,
			threshold: 0.1,
		});

		// Verify test data was created correctly
		expect(user.name).toBe("Test User");
		expect(apiKey.name).toBe("Test API Key");
	});
});
