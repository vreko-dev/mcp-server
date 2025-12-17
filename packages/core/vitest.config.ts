import { resolve } from "node:path";
import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback/core
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				"@snapback-core": resolve(__dirname, "./src"),
			},
		},
		test: {
			name: "@snapback/core",
			include: ["test/**/*.test.ts"],
		},
	}),
);
