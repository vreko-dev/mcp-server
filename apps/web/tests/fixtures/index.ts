/**
 * Playwright Test Fixtures - Industry Standard
 *
 * Provides reusable test context extensions:
 * - Pre-authenticated users (regular, admin)
 * - MSW integration for API mocking
 * - Custom matchers
 *
 * Usage:
 * import { test, expect } from './fixtures';
 */

import { test as base, expect as baseExpect } from "@playwright/test";
import type { Page } from "@playwright/test";
import path from "node:path";

// Extended test context
export type TestFixtures = {
	authenticatedPage: Page;
	adminPage: Page;
};

// Extend base test with fixtures
export const test = base.extend<TestFixtures>({
	// Authenticated user context
	authenticatedPage: async ({ browser }, use) => {
		const authFile = path.join(__dirname, "../playwright/.auth/user.json");
		const context = await browser.newContext({ storageState: authFile });
		const page = await context.newPage();
		await use(page);
		await context.close();
	},

	// Admin user context
	adminPage: async ({ browser }, use) => {
		const authFile = path.join(__dirname, "../playwright/.auth/admin.json");
		const context = await browser.newContext({ storageState: authFile });
		const page = await context.newPage();
		await use(page);
		await context.close();
	},
});

// Re-export expect with custom matchers
export { baseExpect as expect };

// Custom matchers
export const customMatchers = {
	/**
	 * Verify element is visible within timeout
	 */
	async toBeVisibleWithinTimeout(
		locator: any,
		timeout = 5000,
	): Promise<{ pass: boolean; message: () => string }> {
		try {
			await baseExpect(locator).toBeVisible({ timeout });
			return {
				pass: true,
				message: () => "Element is visible",
			};
		} catch {
			return {
				pass: false,
				message: () => `Element not visible within ${timeout}ms`,
			};
		}
	},

	/**
	 * Verify URL matches pattern
	 */
	async toMatchURL(
		page: Page,
		pattern: string | RegExp,
	): Promise<{ pass: boolean; message: () => string }> {
		const currentUrl = page.url();
		const matches =
			typeof pattern === "string"
				? currentUrl.includes(pattern)
				: pattern.test(currentUrl);

		return {
			pass: matches,
			message: () =>
				matches
					? `URL ${currentUrl} matches ${pattern}`
					: `URL ${currentUrl} does not match ${pattern}`,
		};
	},
};
