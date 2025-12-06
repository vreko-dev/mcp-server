import { expect } from "@playwright/test";
import { createApiKey, createUser } from "../utils/data/factories";
import { test } from "../utils/fixtures/auth";
import { checkAccessibility } from "../utils/helpers/accessibility";
import { mockApiResponses } from "../utils/helpers/api-mocking";
import { DashboardPage } from "../utils/pages/dashboard";
import { LoginPage } from "../utils/pages/login";

test.describe("Authenticated User", () => {
	test("can view dashboard and metrics", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);

		// Go to dashboard
		await dashboardPage.goto();

		// Verify we're on the dashboard
		await dashboardPage.expectToBeOnDashboard();

		// Check welcome message
		await dashboardPage.expectWelcomeMessage("Regular User");

		// Check that metric cards are visible
		await dashboardPage.expectMetricCardVisible("api-calls");
		await dashboardPage.expectMetricCardVisible("active-keys");
		await dashboardPage.expectMetricCardVisible("devices");

		// Check accessibility
		await checkAccessibility(authenticatedPage);
	});

	test("can navigate to API keys page", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);

		// Go to dashboard
		await dashboardPage.goto();

		// Click on API Keys menu
		await dashboardPage.clickApiKeyMenu();

		// Verify we're on the API keys page
		await expect(authenticatedPage).toHaveURL(/.*\/app\/api-keys/);
	});

	test("can logout successfully", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);
		const loginPage = new LoginPage(authenticatedPage);

		// Go to dashboard
		await dashboardPage.goto();

		// Logout
		await dashboardPage.clickLogout();

		// Verify we're on the login page
		await loginPage.expectToBeOnLoginPage();
	});

	test("sees empty state for new user", async ({ newUserPage }) => {
		const dashboardPage = new DashboardPage(newUserPage);

		// Go to dashboard
		await dashboardPage.goto();

		// Check that empty state is visible
		await dashboardPage.expectEmptyStateVisible();

		// Check that CTA is visible
		await expect(newUserPage.getByTestId("empty-state-cta")).toBeVisible();
	});

	test("can handle API errors gracefully", async ({ authenticatedPage }) => {
		// Mock API error
		await mockApiResponses(authenticatedPage);

		const dashboardPage = new DashboardPage(authenticatedPage);

		// Go to dashboard
		await dashboardPage.goto();

		// The dashboard should still load even with API errors
		await dashboardPage.expectToBeOnDashboard();
	});

	test("can create test data using factories", async () => {
		// Create test user
		const user = createUser({
			name: "Test User",
			email: "test@example.com",
			role: "user",
		});

		// Create test API key
		const apiKey = createApiKey({
			name: "Test API Key",
			permissions: ["read", "write"],
		});

		// Verify the test data was created correctly
		expect(user.name).toBe("Test User");
		expect(user.email).toBe("test@example.com");
		expect(user.role).toBe("user");

		expect(apiKey.name).toBe("Test API Key");
		expect(apiKey.permissions).toEqual(["read", "write"]);
	});
});
