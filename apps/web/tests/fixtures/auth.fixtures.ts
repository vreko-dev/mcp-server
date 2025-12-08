/**
 * Auth Test Fixtures
 *
 * Provides reusable test fixtures for authentication flows.
 * Follows Playwright best practices for fixture organization.
 */

import { test as base } from "@playwright/test";
import { LoginPage } from "../utils/pages/login";

/**
 * Test user credentials
 */
export const TEST_USERS = {
	regular: {
		email: "user@example.com",
		password: "User123!@#",
		name: "Regular User",
	},
	admin: {
		email: "admin@example.com",
		password: "Admin123!@#",
		name: "Admin User",
	},
	new: {
		email: "newuser@example.com",
		password: "NewUser123!@#",
		name: "New User",
	},
} as const;

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix = "test"): string {
	return `${prefix}-${Date.now()}@snapback.local`;
}

/**
 * Generate strong password
 */
export function generateStrongPassword(): string {
	return "SecureP@ss123!";
}

/**
 * Extended test with auth fixtures
 */
type AuthFixtures = {
	loginPage: LoginPage;
	testEmail: string;
	testPassword: string;
};

export const test = base.extend<AuthFixtures>({
	/**
	 * LoginPage fixture - automatically instantiated for each test
	 */
	loginPage: async ({ page }, use) => {
		const loginPage = new LoginPage(page);
		await use(loginPage);
	},

	/**
	 * Unique test email for each test
	 */
	testEmail: async ({}, use) => {
		await use(generateTestEmail());
	},

	/**
	 * Strong test password
	 */
	testPassword: async ({}, use) => {
		await use(generateStrongPassword());
	},
});

export { expect } from "@playwright/test";
