import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Only run unit tests in this config
		include: ["test/unit/**/*.test.ts"],
		exclude: ["test/integration/**", "test/e2e/**", "node_modules/**"],

		// Test environment
		environment: "node",

		// Global test setup
		setupFiles: ["./test/setup.ts"],

		// Timeouts
		testTimeout: 10_000,
		hookTimeout: 10_000,

		// Coverage configuration
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov", "json-summary"],
			reportsDirectory: "./coverage",

			// Coverage thresholds (enforced in CI)
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 75,
				statements: 80,
			},

			// What to include/exclude
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/*.d.ts",
				"src/**/*.test.ts",
				"src/**/index.ts", // Barrel exports
				"src/extension.ts", // Entry point tested in integration
				"test/**",
				"dist/**",
				"scripts/**",
			],
		},

		// Reporter configuration
		reporters: process.env.CI ? ["default", "junit"] : ["default"],
		outputFile: {
			junit: "./test-results/junit.xml",
		},

		// Parallelization
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
			},
		},

		// Globals (describe, it, expect available without import)
		globals: true,

		// Type checking
		typecheck: {
			enabled: false, // Run separately for speed
		},
	},

	resolve: {
		alias: {
			// CRITICAL: Map 'vscode' to our mock
			vscode: path.resolve(__dirname, "test/__mocks__/vscode.ts"),

			// Source aliases for cleaner imports
			"@": path.resolve(__dirname, "src"),
			"@test": path.resolve(__dirname, "test"),
		},
	},

	// ESBuild options for fast transforms
	esbuild: {
		target: "node20",
	},
});
