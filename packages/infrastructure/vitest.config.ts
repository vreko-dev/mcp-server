import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@snapback-infra": resolve(__dirname, "./src"),
			"@snapback/config": resolve(__dirname, "../config/src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["test/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules/**", "dist/**", "**/*.d.ts"],
		},
	},
});
