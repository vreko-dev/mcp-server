import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@snapback/engine": path.resolve(__dirname, "../engine/src"),
			"@snapback/intelligence": path.resolve(__dirname, "../intelligence/src"),
			"@snapback/core": path.resolve(__dirname, "../core/src"),
			"@snapback/contracts": path.resolve(__dirname, "../contracts/src"),
			"@snapback/infrastructure": path.resolve(__dirname, "../infrastructure/src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["test/**/*.{test,spec}.ts"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		pool: "forks",
		testTimeout: 30000,
		hookTimeout: 10000,
	},
});
