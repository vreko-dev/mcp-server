import { resolve } from "node:path";
import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback/infrastructure
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				"@snapback-infra": resolve(__dirname, "./src"),
			},
		},
		test: {
			name: "@snapback/infrastructure",
			include: ["test/**/*.test.ts"],
		},
	}),
);
