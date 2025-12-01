import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for apps/api
 *
 * Inherits from root vitest.config.ts (projects mechanism)
 * Configures TypeScript alias support and module resolution
 */
export default defineConfig({
	resolve: {
		alias: {
			// Support @/ prefix for app-relative imports
			// These mirror the tsconfig.json paths configuration
			"@/": resolve(__dirname, "./"),
			"@/orpc/": resolve(__dirname, "./orpc/"),
			"@/modules/": resolve(__dirname, "./modules/"),
			"@/lib/": resolve(__dirname, "./lib/"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		passWithNoTests: true,
		// Module directories for monorepo dependency resolution
		deps: {
			moduleDirectories: [
				"node_modules",
				resolve(__dirname, "../../node_modules"),
			],
		},
	},
});
