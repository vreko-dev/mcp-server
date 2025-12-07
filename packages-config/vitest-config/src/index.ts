import path from "node:path";
import { defineConfig, type UserConfigExport } from "vitest/config";

export const createVitestConfig = (_options: UserConfigExport = {}) => {
	return defineConfig({
		resolve: {
			// CENTRALIZED ALIASES: No more duplicate path definitions
			alias: {
				"@snapback/platform": path.resolve(__dirname, "../../packages/platform/src"),
				"@snapback/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
				"@snapback/infrastructure": path.resolve(__dirname, "../../packages/infrastructure/src"),
				"@snapback/core": path.resolve(__dirname, "../../packages/core/src"),
				"@snapback/auth": path.resolve(__dirname, "../../packages/auth/src"),
				// Add other shared packages here
			},
		},
		test: {
			globals: true,
			environment: "node", // Default
			passWithNoTests: true,
			coverage: {
				provider: "v8",
				reportsDirectory: "./coverage",
				reporter: ["text", "json", "html"],
				// ENFORCED THRESHOLDS
				thresholds: {
					lines: 80,
					functions: 80,
					branches: 75,
					statements: 80,
				},
				exclude: ["node_modules/**", "dist/**", "**/*.d.ts", "**/*.config.*"],
			},
			// Smart scheduling
			pool: "forks",
			testTimeout: 10000,
		},
	});
};

// Preset Exports
export const nodeConfig = createVitestConfig({ test: { environment: "node" } });
export const jsdomConfig = createVitestConfig({ test: { environment: "jsdom" } });
