import { resolve } from "node:path";
import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback/config
 * Uses shared nodeConfig preset from @snapback/vitest-config
 * Note: Tests are in src/__tests__/ for this package
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				"@snapback/config": resolve(__dirname, "./src"),
			},
		},
		test: {
			name: "@snapback/config",
			include: ["src/**/__tests__/**/*.test.ts"],
		},
	}),
);
