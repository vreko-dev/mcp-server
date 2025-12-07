import type { BrowserContext, Page } from "@playwright/test";
import { TEST_USERS } from "./test-data";

export class AuthFixture {
	constructor(
		private page: Page,
		private context: BrowserContext,
	) {}

	async loginWithTestToken(userType: keyof typeof TEST_USERS = "default") {
		// Mock login by setting session token directly if supported
		// OR mock the auth API response

		if (process.env.E2E_AUTH_BYPASS) {
			await this.context.addInitScript(() => {
				window.localStorage.setItem("snapback-auth-token", "mock-token");
			});
			// Also set cookie if needed
			await this.context.addCookies([
				{
					name: "session",
					value: "mock-session",
					domain: "localhost",
					path: "/",
				},
			]);
		} else {
			// Fallback to UI login if no bypass
			await this.page.goto("/login");
			const user = TEST_USERS[userType];
			await this.page.fill('input[type="email"]', user.email);
			await this.page.fill('input[type="password"]', user.password);
			await this.page.click('button[type="submit"]');
		}
	}

	async logout() {
		await this.context.clearCookies();
		await this.page.evaluate(() => localStorage.clear());
	}
}

export const createAuthFixture = (page: Page, context: BrowserContext) => new AuthFixture(page, context);
