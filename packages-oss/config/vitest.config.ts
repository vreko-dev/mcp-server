import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback-oss/config
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		test: {
			name: "@snapback-oss/config",
			include: ["test/**/*.test.ts"],
		},
	}),
);
