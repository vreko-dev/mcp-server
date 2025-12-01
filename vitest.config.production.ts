import { defineConfig } from "vitest/config";

/**
 * Production-grade Vitest configuration with enforced coverage thresholds
 *
 * This config enforces minimum coverage requirements to ensure code quality.
 * Tests will fail if coverage drops below thresholds.
 */
export default defineConfig({
	test: {
		// Global settings inherited by all projects
		globals: true,
		environment: "node",

		// Coverage with enforced thresholds
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],

			// Production-grade coverage thresholds
			thresholds: {
				lines: 80, // 80% line coverage
				functions: 80, // 80% function coverage
				branches: 75, // 75% branch coverage (harder to achieve)
				statements: 80, // 80% statement coverage

				// Per-file thresholds (stricter)
				perFile: true,

				// Auto-update thresholds as coverage improves
				autoUpdate: false, // Set to true in CI to auto-update
			},

			// Exclusions
			exclude: [
				"node_modules/**",
				"dist/**",
				"build/**",
				".next/**",
				"**/*.config.*",
				"**/*.d.ts",
				"**/types/**",
				"**/__tests__/**",
				"**/__mocks__/**",
				"**/test/**",
				"**/tests/**",
				"**/*.spec.ts",
				"**/*.test.ts",
				"scripts/**",
				"tooling/**",
			],

			// Include all source files
			include: ["apps/**/src/**/*.ts", "packages/**/src/**/*.ts"],

			// Report uncovered lines
			reportOnFailure: true,

			// Clean coverage directory before each run
			clean: true,
		},

		// Performance settings
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
				maxThreads: 4,
			},
		},

		// Test timeouts
		testTimeout: 10000, // 10s per test
		hookTimeout: 10000, // 10s per hook

		// Watch mode settings
		watch: false, // Disabled in production

		// Use projects for monorepo
		projects: ["packages/*", "apps/*"],
	},
});
