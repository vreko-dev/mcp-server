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
			"@/orpc": resolve(__dirname, "./orpc"),
			"@/modules": resolve(__dirname, "./modules"),
			"@/lib": resolve(__dirname, "./lib"),
			"@/src": resolve(__dirname, "./src"),
			"@/middleware": resolve(__dirname, "./middleware"),
			"@": resolve(__dirname, "./"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		passWithNoTests: true,
		include: ["**/*.test.ts", "**/*.spec.ts", "__tests__/**/*.ts"],
		// Module directories for monorepo dependency resolution
		deps: {
			moduleDirectories: ["node_modules", resolve(__dirname, "../../node_modules")],
		},
	},
});
