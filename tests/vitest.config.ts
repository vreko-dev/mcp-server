import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["**/*.test.ts"],
		exclude: [
			"node_modules",
			"dist",
			"build",
			".next",
			"**/apps/**",
			"**/packages/**",
		],
		// Disable workspace projects to avoid conflicts
		projects: undefined,
	},
});
