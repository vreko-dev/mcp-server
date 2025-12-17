import path from "node:path";
import { COVERAGE_THRESHOLDS, mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback/integrations
 * Uses shared nodeConfig preset from @snapback/vitest-config
 * Note: Tests are colocated in src/ for this package
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				// CRITICAL: Force resolution to source files, not dist
				"@/": path.resolve(__dirname, "./src/"),
				"~/": path.resolve(__dirname, "./src/"),
			},
			extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
			conditions: ["development"],
		},
		test: {
			name: "@snapback/integrations",
			include: ["src/**/*.test.ts"],
			coverage: {
				provider: "v8",
				reporter: ["text", "json", "html"],
				include: ["src/communication/**/*.ts", "src/email/**/*.ts", "!src/**/*.test.ts"],
				thresholds: COVERAGE_THRESHOLDS.unit,
			},
		},
	}),
);
