import { defineConfig, devices } from "@playwright/test";

/**
 * Simple Playwright configuration for smoke testing without web server
 */
export default defineConfig({
	testDir: "./tests",
	testMatch: /.*\.spec\.ts/,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [["list"]],
	use: {
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
			},
		},
	],
	// No webServer configuration for smoke tests
});
