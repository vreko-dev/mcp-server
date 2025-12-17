import path from "node:path";
import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback/mail
 * Uses shared nodeConfig preset from @snapback/vitest-config
 * Note: Tests are colocated in src/ for this package
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				"@snapback-oss/sdk": path.resolve(__dirname, "../../packages-oss/sdk/src"),
			},
		},
		test: {
			name: "@snapback/mail",
			include: ["src/**/*.test.ts"],
		},
	}),
);
