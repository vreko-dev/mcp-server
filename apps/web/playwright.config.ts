import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

/**
 * Playwright Test Configuration - Industry Standards
 *
 * Features:
 * - Auto-starts dev server (webServer)
 * - Parallel execution in CI
 * - Video recording on failure
 * - Trace on first retry
 * - Multiple browser support
 * - Setup/teardown dependencies
 * - HTML reporter
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: "./tests",
	testMatch: /.*\.spec\.ts/,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["html"], ["github"], ["list"]] : [["html"], ["list"]],
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: {
			mode: "retain-on-failure",
			size: { width: 1280, height: 720 },
		},
		// Navigation timeout
		actionTimeout: 10 * 1000,
		navigationTimeout: 30 * 1000,
	},
	projects: [
		// Setup project - runs before all tests
		{
			name: "setup",
			testMatch: /.*\.setup\.ts/,
		},
		// Chromium (Desktop Chrome)
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
			},
			dependencies: ["setup"],
		},
		// Uncomment for cross-browser testing
		// {
		// 	name: "firefox",
		// 	use: {
		// 		...devices["Desktop Firefox"],
		// 	},
		// 	dependencies: ["setup"],
		// },
		// {
		// 	name: "webkit",
		// 	use: {
		// 		...devices["Desktop Safari"],
		// 	},
		// 	dependencies: ["setup"],
		// },
		// Mobile viewports
		// {
		// 	name: "Mobile Chrome",
		// 	use: {
		// 		...devices["Pixel 5"],
		// 	},
		// 	dependencies: ["setup"],
		// },
	],
	// webServer: Auto-start disabled - run `pnpm dev` manually in separate terminal
	// webServer: {
	// 	command: "pnpm dev",
	// 	url: "http://localhost:3000",
	// 	reuseExistingServer: !process.env.CI,
	// 	stdout: "ignore",
	// 	stderr: "pipe",
	// 	timeout: 120 * 1000,
	// },
});
