import { defineProject } from "vitest/config";

export default defineProject({
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
