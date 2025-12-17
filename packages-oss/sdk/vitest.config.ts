import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback-oss/sdk
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		test: {
			name: "@snapback-oss/sdk",
			include: ["tests/**/*.test.ts", "__tests__/**/*.test.ts"],
			setupFiles: ["./__tests__/setup.ts"],
		},
	}),
);
