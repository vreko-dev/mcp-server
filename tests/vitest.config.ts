import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for standalone tests directory
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		test: {
			name: "standalone-tests",
			include: ["**/*.test.ts"],
			exclude: ["node_modules", "dist", "build", ".next", "**/apps/**", "**/packages/**"],
			// Disable workspace projects to avoid conflicts
			projects: undefined,
		},
	}),
);
