import { expect } from "@playwright/test";
import { createApiKey, createUser } from "../utils/data/factories";
import { test } from "../utils/fixtures/auth";
import { checkAccessibility } from "../utils/helpers/accessibility";
import { mockApiResponses } from "../utils/helpers/api-mocking";
import {
	assertPageLoadTime,
	measurePageLoadPerformance,
} from "../utils/helpers/performance";
import {
	expectSearchResultsCount,
	performSearch,
} from "../utils/helpers/search";
import { compareScreenshot } from "../utils/helpers/visual-regression";
import { DashboardPage } from "../utils/pages/dashboard";

test.describe("Full Integration Flow", () => {
	test("complete user journey from login to API key management", async ({
		authenticatedPage,
	}) => {
		// Create test data
		const user = createUser({ name: "Integration Test User" });
		const apiKey = createApiKey({ name: "Integration Test Key" });

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
		await assertPageLoadTime(authenticatedPage, "/app/dashboard", 5000);

		// Take screenshot for visual regression
		await compareScreenshot(authenticatedPage, "dashboard", {
			fullPage: true,
			threshold: 0.1,
		});

		// Navigate to API keys page
		await dashboardPage.clickApiKeyMenu();
		await expect(authenticatedPage).toHaveURL(/.*\/app\/api-keys/);

		// Perform search for API keys
		await performSearch(
			authenticatedPage,
			"#api-key-search",
			"test",
			"[data-testid='api-key-list-item']",
		);

		// Verify search results
		await expectSearchResultsCount(
			authenticatedPage,
			"[data-testid='api-key-list-item']",
			2,
		);

		// Take screenshot of API keys page
		await compareScreenshot(authenticatedPage, "api-keys-page", {
			fullPage: true,
			threshold: 0.1,
		});

		// Create a new API key
		await authenticatedPage.click("[data-testid='create-api-key-button']");
		await expect(authenticatedPage.getByTestId("api-key-modal")).toBeVisible();

		// Fill API key form
		await authenticatedPage.fill("[data-testid='api-key-name']", apiKey.name);
		await authenticatedPage.click("[data-testid='create-api-key-submit']");

		// Verify API key was created
		await expect(
			authenticatedPage.getByText("API key created successfully"),
		).toBeVisible();

		// Take screenshot of success message
		await compareScreenshot(authenticatedPage, "api-key-created", {
			threshold: 0.1,
		});
	});

	test("admin user can manage organization settings", async ({ adminPage }) => {
		// Mock API responses
		await mockApiResponses(adminPage);

		// Go to admin panel
		await adminPage.goto("/app/admin/settings");

		// Verify we're on the admin settings page
		await expect(adminPage).toHaveURL(/.*\/app\/admin\/settings/);

		// Check that admin-specific elements are visible
		await expect(
			adminPage.getByRole("heading", { name: "Organization Settings" }),
		).toBeVisible();

		// Measure page load performance
		const metrics = await measurePageLoadPerformance(
			adminPage,
			"/app/admin/settings",
		);
		console.log(`Admin settings page loaded in ${metrics.loadTime}ms`);

		// Check accessibility
		await checkAccessibility(adminPage);

		// Take screenshot for visual regression
		await compareScreenshot(adminPage, "admin-settings", {
			fullPage: true,
			threshold: 0.1,
		});

		// Update organization name
		await adminPage.fill(
			"[data-testid='organization-name']",
			"Updated Organization Name",
		);
		await adminPage.click("[data-testid='save-organization-settings']");

		// Verify success message
		await expect(
			adminPage.getByText("Settings saved successfully"),
		).toBeVisible();
	});

	test("new user completes onboarding flow", async ({ newUserPage }) => {
		// Mock API responses
		await mockApiResponses(newUserPage);

		// Should be redirected to onboarding
		await expect(newUserPage).toHaveURL(/.*\/onboarding/);

		// Complete onboarding steps
		await expect(
			newUserPage.getByRole("heading", { name: "Welcome" }),
		).toBeVisible();

		// Take screenshot of welcome step
		await compareScreenshot(newUserPage, "onboarding-welcome", {
			threshold: 0.1,
		});

		// Click next
		await newUserPage.click("[data-testid='onboarding-next']");

		// Complete API key step
		await expect(
			newUserPage.getByRole("heading", { name: "API Keys" }),
		).toBeVisible();

		// Take screenshot of API key step
		await compareScreenshot(newUserPage, "onboarding-api-keys", {
			threshold: 0.1,
		});

		// Click create API key
		await newUserPage.click("[data-testid='create-first-api-key']");

		// Verify API key was created
		await expect(
			newUserPage.getByText("Your first API key has been created"),
		).toBeVisible();

		// Click finish
		await newUserPage.click("[data-testid='onboarding-finish']");

		// Should be redirected to dashboard
		await expect(newUserPage).toHaveURL(/.*\/app\/dashboard/);

		// Check that empty state is no longer visible
		await expect(newUserPage.getByTestId("empty-dashboard")).not.toBeVisible();
	});
});
