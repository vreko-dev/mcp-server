import { defineConfig } from "@playwright/test";

export const createPlaywrightConfig = (overrides = {}) => {
	const isCI = !!process.env.CI;

	return defineConfig({
		timeout: 60 * 1000,
		fullyParallel: !isCI, // Parallel locally, sequential possible on CI
		forbidOnly: isCI,
		retries: isCI ? 2 : 0,
		workers: isCI ? 1 : undefined,

		// STANDARD WEBSERVER CONFIG
		webServer: {
			command: "npm run dev",
			url: "http://localhost:3000",
			reuseExistingServer: !isCI,
			timeout: 120 * 1000,
		},

		use: {
			baseURL: "http://localhost:3000",
			trace: "on-first-retry",
			screenshot: "only-on-failure",
			video: "on-first-retry",
		},

		reporter: [["html", { outputFolder: "playwright-report" }], isCI ? ["github"] : ["list"]],

		...overrides,
	});
};
