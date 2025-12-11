import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@snapback/config": resolve(__dirname, "./src"),
		},
	},
	test: {
		name: "@snapback/config",
		globals: true,
		environment: "node",
		include: ["src/**/__tests__/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["**/node_modules/**", "**/__tests__/**", "**/dist/**", "**/*.config.*"],
		},
	},
});
