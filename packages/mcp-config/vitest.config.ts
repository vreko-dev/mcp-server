import { resolve } from "node:path";
import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback/mcp-config
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				"@snapback/mcp-config": resolve(__dirname, "./src"),
			},
		},
		test: {
			name: "@snapback/mcp-config",
			include: ["src/**/__tests__/**/*.test.ts"],
		},
	}),
);
