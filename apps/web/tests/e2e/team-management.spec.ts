import { expect, test } from "@playwright/test";

// Helper function to login as a user with specific properties
async function loginAsUser(page: any) {
	// Mock user login
	await page.goto("/auth/login");
	await page.fill('[name="email"]', "test@example.com");
	await page.fill('[name="password"]', "Test123!@#");
	await page.click('[type="submit"]');

	// Wait for redirect to dashboard
	await page.waitForURL("/app/dashboard");
}

// Helper function to mock organization data
async function mockOrganizationData(page: any, orgData: any) {
	await page.route("**/api/organization/**", (route) => {
		route.fulfill({
			status: 200,
			body: JSON.stringify(orgData),
		});
	});
}

test.describe("Team Management", () => {
	test("organization admin can invite members", async ({ page }) => {
		// Login as user
		await loginAsUser(page);

		// Mock organization data
		await mockOrganizationData(page, {
			id: "org_123",
			slug: "test-org",
			name: "Test Organization",
			role: "admin",
			members: [{ id: "user_1", email: "admin@example.com", role: "admin" }],
			pendingInvitations: [],
		});

		// Navigate to organization settings members page
		await page.goto("/app/test-org/settings/members");

		// Check that organization name is displayed
		await expect(page.getByText("Test Organization")).toBeVisible();

		// Check that admin role is displayed
		await expect(page.getByText("Admin")).toBeVisible();

		// Fill in invite form
		await page.fill('[name="email"]', "newmember@example.com");

		// Submit invitation
		await page.click('[type="submit"]');

		// Check success message
		await expect(page.getByText("Member invited successfully")).toBeVisible();

		// Check that pending invitation appears in list
		await expect(page.getByText("newmember@example.com")).toBeVisible();
		await expect(page.getByText("Pending")).toBeVisible();
	});

	test("non-admin member cannot invite others", async ({ page }) => {
		// Login as user
		await loginAsUser(page);

		// Mock organization data for non-admin member
		await mockOrganizationData(page, {
			id: "org_123",
			slug: "test-org",
			name: "Test Organization",
			role: "member",
			members: [{ id: "user_1", email: "member@example.com", role: "member" }],
			pendingInvitations: [],
		});

		// Navigate to organization settings members page
		await page.goto("/app/test-org/settings/members");

		// Check that invite form is not visible
		const inviteForm = page.getByRole("form", { name: /invite member/i });
		await expect(inviteForm).not.toBeVisible();
	});

	test("organization admin can remove members", async ({ page }) => {
		// Login as user
		await loginAsUser(page);

		// Mock organization data with existing member
		await mockOrganizationData(page, {
			id: "org_123",
			slug: "test-org",
			name: "Test Organization",
			role: "admin",
			members: [
				{ id: "user_1", email: "admin@example.com", role: "admin" },
				{ id: "user_2", email: "member@example.com", role: "member" },
			],
			pendingInvitations: [],
		});

		// Navigate to organization settings members page
		await page.goto("/app/test-org/settings/members");

		// Find the member row and click remove
		const memberRow = page.locator('[data-member-id="user_2"]');
		await memberRow.getByRole("button", { name: /remove/i }).click();

		// Confirm removal in modal
		await page.getByRole("button", { name: /confirm/i }).click();

		// Check success message
		await expect(page.getByText(/member removed/i)).toBeVisible();

		// Check that member is no longer in the list
		await expect(page.getByText("member@example.com")).not.toBeVisible();
	});
});
