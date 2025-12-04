import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Production-grade Vitest configuration with enforced coverage thresholds
 *
 * This config enforces minimum coverage requirements to ensure code quality.
 * Tests will fail if coverage drops below thresholds.
 */
export default defineConfig({
	resolve: {
		alias: {
			// Force imports to resolve to source files, not compiled dist/
			// This ensures tests use the latest schema definitions
			"@snapback/platform": path.resolve(__dirname, "packages/platform/src"),
			"@snapback/contracts": path.resolve(__dirname, "packages/contracts/src"),
			"@snapback/infrastructure": path.resolve(__dirname, "packages/infrastructure/src"),
			"@snapback/core": path.resolve(__dirname, "packages/core/src"),
			"@snapback/events": path.resolve(__dirname, "packages/events/src"),
			"@snapback/auth": path.resolve(__dirname, "packages/auth/src"),
		},
	},
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
		// Use 'forks' pool for native modules like better-sqlite3
		// Vitest 2.0+ defaults to forks for better compatibility with native modules
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: false,
			},
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

		// Force fresh module resolution and isolation
		deps: {
			interopDefault: true,
		},
		isolate: true,
	},
});
