import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@snapback-sdk": resolve(__dirname, "./src"),
			"@snapback-sdk/core": resolve(__dirname, "./src/core"),
			"@snapback-sdk/storage": resolve(__dirname, "./src/storage"),
		},
	},
	test: {
		name: "@snapback/sdk",
		globals: true,
		environment: "node",
		include: ["tests/**/*.test.ts", "__tests__/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
		setupFiles: ["./__tests__/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["**/node_modules/**", "**/__tests__/**", "**/dist/**", "**/*.config.*"],
		},
	},
});
