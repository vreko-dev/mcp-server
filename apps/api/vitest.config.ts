import { resolve } from "node:path";
import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for apps/api
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				// Support @/ prefix for app-relative imports
				// These mirror the tsconfig.json paths configuration
				"@/orpc": resolve(__dirname, "./orpc"),
				"@/modules": resolve(__dirname, "./modules"),
				"@/lib": resolve(__dirname, "./lib"),
				"@/src": resolve(__dirname, "./src"),
				"@/middleware": resolve(__dirname, "./middleware"),
				"@": resolve(__dirname, "./"),
			},
		},
		test: {
			name: "@snapback/api",
			include: ["test/**/*.test.ts", "**/__tests__/**/*.test.ts"],
			setupFiles: ["./vitest.setup.ts"],
		},
	}),
);
