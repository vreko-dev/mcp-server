import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["**/*.{test,spec}.ts"],
		environment: "node",
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			exclude: ["node_modules", "dist", "**/*.d.ts", "test/**"],
		},
	},
});
