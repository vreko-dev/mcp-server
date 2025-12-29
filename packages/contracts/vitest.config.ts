import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback/contracts
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		test: {
			name: "@snapback/contracts",
			include: ["test/**/*.test.ts", "src/**/*.test.ts", "src/**/__tests__/*.test.ts"],
		},
	}),
);
