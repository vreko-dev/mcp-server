import path from "node:path";
import { test as base, expect } from "@playwright/test";

// Get user data based on role
function getUserData(role) {
	const users = {
		admin: {
			email: "admin@example.com",
			password: "Admin123!@#",
			name: "Admin User",
			role: "admin",
		},
		user: {
			email: "user@example.com",
			password: "User123!@#",
			name: "Regular User",
			role: "user",
		},
		newUser: {
			email: "newuser@example.com",
			password: "NewUser123!@#",
			name: "New User",
			role: "newUser",
		},
	};
	return users[role];
}
// Extend base test with our custom fixtures
export const test = base.extend({
	// Worker-scoped fixture for authentication state path
	storageStatePath: [
		async (_args, use, workerInfo) => {
			// Create a unique storage state path for each worker
			const filePath = path.join(
				__dirname,
				`../../playwright/.auth/${workerInfo.workerIndex}.json`,
			);
			await use(filePath);
		},
		{ scope: "worker" },
	],
	// Authenticated page fixture - can be configured for different roles
	authenticatedPage: async ({ page, storageStatePath }, use) => {
		// For demo purposes, we'll use a default user role
		// In practice, you'd set this per test or use role-specific fixtures
		const userData = getUserData("user");
		// Navigate to login page
		await page.goto("/auth/login");
		// Fill in credentials
		await page.getByLabel("Email").fill(userData.email);
		await page.getByLabel("Password").fill(userData.password);
		// Submit login form
		await page.getByRole("button", { name: "Sign in" }).click();
		// Wait for successful login
		await page.waitForURL("/app/**");
		// Verify user is logged in
		await expect(
			page.getByRole("heading", { name: `Welcome, ${userData.name}` }),
		).toBeVisible();
		await use(page);
	},
	// Admin page fixture
	adminPage: async ({ browser, storageStatePath }, use) => {
		// For admin users, we might want to use a pre-authenticated state
		// This would require a setup project to create the authentication state
		const context = await browser.newContext({
			storageState: "playwright/.auth/admin.json",
		});
		const adminPage = await context.newPage();
		await use(adminPage);
		await context.close();
	},
	// Regular user page fixture
	userPage: async ({ browser }, use) => {
		const context = await browser.newContext({
			storageState: "playwright/.auth/user.json",
		});
		const userPage = await context.newPage();
		await use(userPage);
		await context.close();
	},
	// New user page fixture
	newUserPage: async ({ browser }, use) => {
		const context = await browser.newContext();
		const newUserPage = await context.newPage();
		await use(newUserPage);
		await context.close();
	},
});
// Re-export expect for consistency
export { expect };
// Helper function to perform login
export async function login(page, role = "user") {
	const userData = getUserData(role);
	await page.goto("/auth/login");
	await page.getByLabel("Email").fill(userData.email);
	await page.getByLabel("Password").fill(userData.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	// Wait for redirect based on user role
	if (role === "newUser") {
		await page.waitForURL("/onboarding/**");
	} else {
		await page.waitForURL("/app/**");
	}
}
// Helper function to logout
export async function logout(page) {
	await page.getByRole("button", { name: "User menu" }).click();
	await page.getByRole("menuitem", { name: "Sign out" }).click();
	await page.waitForURL("/auth/login");
}
