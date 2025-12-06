import { expect } from "@playwright/test";
import { test } from "../utils/fixtures/auth";
import { DashboardPage } from "../utils/pages/dashboard";

test.describe("Admin User", () => {
	test("can access admin features", async ({ adminPage }) => {
		const dashboardPage = new DashboardPage(adminPage);

		// Go to dashboard
		await dashboardPage.goto();

		// Verify we're on the dashboard
		await dashboardPage.expectToBeOnDashboard();

		// Check welcome message for admin
		await dashboardPage.expectWelcomeMessage("Admin User");

		// Admins should have access to additional features
		// For example, admin-only navigation items
		await expect(
			adminPage.getByRole("link", { name: "Admin Panel" }),
		).toBeVisible();
	});

	test("can manage users", async ({ adminPage }) => {
		// Navigate to user management
		await adminPage.goto("/app/admin/users");

		// Verify we're on the user management page
		await expect(adminPage).toHaveURL(/.*\/app\/admin\/users/);

		// Check that user list is visible
		await expect(adminPage.getByTestId("user-list")).toBeVisible();

		// Check that admin actions are available
		await expect(
			adminPage.getByRole("button", { name: "Add User" }),
		).toBeVisible();
	});

	test("can view system metrics", async ({ adminPage }) => {
		const dashboardPage = new DashboardPage(adminPage);

		// Go to dashboard
		await dashboardPage.goto();

		// Admins should see additional system metrics
		await dashboardPage.expectMetricCardVisible("system-health");
		await dashboardPage.expectMetricCardVisible("active-users");
		await dashboardPage.expectMetricCardVisible("api-usage");
	});
});
