import path from "node:path";
import { expect, test as setup } from "@playwright/test";
import { LoginPage } from "./utils/pages/login";

// Authentication setup for different user roles
const authFile = path.join(__dirname, "playwright/.auth/user.json");

setup("authenticate as regular user", async ({ page }: { page: any }) => {
	const loginPage = new LoginPage(page);

	// Go to login page
	await loginPage.goto();

	// Login with test user credentials
	await loginPage.login("user@example.com", "User123!@#");

	// Wait for redirect to dashboard
	await page.waitForURL("/app/**");

	// Verify successful login
	await expect(
		page.getByRole("heading", { name: "Welcome, Regular User" }),
	).toBeVisible();

	// Save storage state
	await page.context().storageState({ path: authFile });
});

// Setup for admin user
const adminAuthFile = path.join(__dirname, "playwright/.auth/admin.json");

setup("authenticate as admin", async ({ page }: { page: any }) => {
	const loginPage = new LoginPage(page);

	// Go to login page
	await loginPage.goto();

	// Login with admin credentials
	await loginPage.login("admin@example.com", "Admin123!@#");

	// Wait for redirect to dashboard
	await page.waitForURL("/app/**");

	// Verify successful login
	await expect(
		page.getByRole("heading", { name: "Welcome, Admin User" }),
	).toBeVisible();

	// Save storage state
	await page.context().storageState({ path: adminAuthFile });
});

// Setup for new user
const newUserAuthFile = path.join(__dirname, "playwright/.auth/newuser.json");

setup("authenticate as new user", async ({ page }: { page: any }) => {
	const loginPage = new LoginPage(page);

	// Go to login page
	await loginPage.goto();

	// Login with new user credentials
	await loginPage.login("newuser@example.com", "NewUser123!@#");

	// Wait for redirect to onboarding
	await page.waitForURL("/onboarding/**");

	// Verify successful login
	await expect(
		page.getByRole("heading", { name: "Welcome, New User" }),
	).toBeVisible();

	// Save storage state
	await page.context().storageState({ path: newUserAuthFile });
});
