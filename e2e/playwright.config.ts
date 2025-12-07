import { defineConfig, devices } from "@playwright/test";
import { createPlaywrightConfig } from "@snapback/playwright-config";
import path from "path";

// Absolute path to the extension root (relative from e2e/playwright.config.ts)
const extensionPath = path.resolve(__dirname, "../apps/vscode");

// Create the base config using the shared package
const baseConfig = createPlaywrightConfig({
	testDir: ".",
});

export default defineConfig({
	...baseConfig,

	projects: [
		// -----------------------------------------------------------------------
		// 1. VS Code Extension Tests (Electron Context)
		// -----------------------------------------------------------------------
		{
			name: "ext-smoke",
			testDir: "./extension",
			testMatch: /.*flows\/.*spec.ts/,
			grep: /@smoke/,
			use: {
				extensionDevelopmentPath: extensionPath,
				launchArgs: [
					path.resolve(extensionPath, "test-workspace"),
					"--extension-tests-env=VSCODE_SNAPSHOT_TEST_MODE=true",
				],
				contextOptions: {
					recordVideo: { dir: "test-results/videos/" },
				},
				env: {
					VSCODE_SNAPSHOT_TEST_MODE: "true",
				},
			} as any,
			// Extension tests don't need the web server
			...({ webServer: undefined } as any),
		},
		{
			name: "ext-full",
			testDir: "./extension",
			testMatch: /.*spec.ts/,
			use: {
				extensionDevelopmentPath: extensionPath,
				launchArgs: [
					path.resolve(extensionPath, "test-workspace"),
					"--extension-tests-env=VSCODE_SNAPSHOT_TEST_MODE=true",
				],
				env: {
					VSCODE_SNAPSHOT_TEST_MODE: "true",
				},
			} as any,
			// Extension tests don't need the web server
			...({ webServer: undefined } as any),
		},

		// -----------------------------------------------------------------------
		// 2. Web Dashboard Tests (Standard Browser)
		// -----------------------------------------------------------------------
		{
			name: "web-smoke",
			testDir: "./web",
			testMatch: /.*flows\/.*spec.ts/,
			grep: /@smoke/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "web-full-chrome",
			testDir: "./web",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "web-full-firefox",
			testDir: "./web",
			use: { ...devices["Desktop Firefox"] },
		},

		// -----------------------------------------------------------------------
		// 3. Cross-Surface Integration (The "Loop")
		// -----------------------------------------------------------------------
		{
			name: "integration-cross-surface",
			testDir: "./integration",
			use: {
				extensionDevelopmentPath: extensionPath,
				launchArgs: [
					path.resolve(extensionPath, "test-workspace"),
					"--extension-tests-env=VSCODE_SNAPSHOT_TEST_MODE=true",
				],
			} as any,
			// Integration tests using extension context don't need web server
			...({ webServer: undefined } as any),
		},
	],
});
