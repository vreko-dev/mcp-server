import { expect } from "@playwright/test";
import { test } from "../utils/fixtures/auth";
import { DashboardPage } from "../utils/pages/dashboard";

test.describe("New User", () => {
	test("sees onboarding flow", async ({ newUserPage }) => {
		const dashboardPage = new DashboardPage(newUserPage);

		// Go to dashboard
		await dashboardPage.goto();

		// New users should see onboarding elements
		await expect(newUserPage.getByTestId("onboarding-welcome")).toBeVisible();

		// Check that empty state is visible
		await dashboardPage.expectEmptyStateVisible();

		// Check that CTA is visible
		await expect(newUserPage.getByTestId("empty-state-cta")).toBeVisible();
	});

	test("can complete onboarding steps", async ({ newUserPage }) => {
		// Navigate to onboarding
		await newUserPage.goto("/onboarding");

		// Verify we're on the onboarding page
		await expect(newUserPage).toHaveURL(/.*\/onboarding/);

		// Complete first step
		await expect(
			newUserPage.getByRole("heading", { name: "Welcome" }),
		).toBeVisible();
		await newUserPage.getByRole("button", { name: "Next" }).click();

		// Complete second step
		await expect(
			newUserPage.getByRole("heading", { name: "API Keys" }),
		).toBeVisible();
		await newUserPage.getByRole("button", { name: "Create API Key" }).click();

		// Complete third step
		await expect(
			newUserPage.getByRole("heading", { name: "Done" }),
		).toBeVisible();
		await newUserPage.getByRole("button", { name: "Go to Dashboard" }).click();

		// Should be redirected to dashboard
		await expect(newUserPage).toHaveURL(/.*\/app\/dashboard/);
	});

	test("gets guided to create first API key", async ({ newUserPage }) => {
		const dashboardPage = new DashboardPage(newUserPage);

		// Go to dashboard
		await dashboardPage.goto();

		// Click on the empty state CTA
		await dashboardPage.clickEmptyStateCta();

		// Should be taken to API keys page
		await expect(newUserPage).toHaveURL(/.*\/app\/api-keys/);

		// Should see the create API key modal
		await expect(newUserPage.getByTestId("api-key-modal")).toBeVisible();
	});
});
