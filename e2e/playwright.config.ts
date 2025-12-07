import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Absolute path to the extension root
const extensionPath = path.resolve(__dirname, "../apps/vscode");

export default defineConfig({
	testDir: ".", // Root for all E2E tests
	fullyParallel: true, // Default to true, but extension projects will override to false
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 4 : undefined,
	reporter: [
		["html", { outputFolder: "playwright-report" }],
		["json", { outputFile: "test-results.json" }],
		process.env.CI ? ["github"] : ["list"],
	],

	use: {
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "on-first-retry",
	},

	projects: [
		// ------------------------------------------------
		// PR GATES (Fast, Chromium Only, Critical Flows)
		// ------------------------------------------------
		{
			name: "ext-smoke",
			testMatch: /.*extension\/flows\/.*spec.ts/,
			grep: /@smoke/,
			use: {
				extensionDevelopmentPath: extensionPath,
				launchArgs: [path.resolve(extensionPath, "test-workspace")],
				vscodeVersion: "stable",
				env: {
					VSCODE_SNAPSHOT_TEST_MODE: "true",
				},
			} as any,
			testDir: "./extension/flows",
		},
		{
			name: "web-smoke",
			testMatch: /.*web\/flows\/.*spec.ts/,
			grep: /@smoke/,
			use: { ...devices["Desktop Chrome"] },
			testDir: "./web/flows",
		},

		// ------------------------------------------------
		// NIGHTLY / MAIN (Full Matrix)
		// ------------------------------------------------
		{
			name: "ext-full",
			testMatch: /.*extension\/flows\/.*spec.ts/,
			use: {
				extensionDevelopmentPath: extensionPath,
				launchArgs: [path.resolve(extensionPath, "test-workspace")],
				vscodeVersion: "insiders",
				env: {
					VSCODE_SNAPSHOT_TEST_MODE: "true",
				},
			} as any,
			testDir: "./extension/flows",
		},
		{
			name: "web-chromium",
			testDir: "./web/flows",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "web-firefox",
			testDir: "./web/flows",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "docs-chromium",
			testDir: "./docs/flows",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
