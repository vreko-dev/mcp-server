import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			// CRITICAL: Force resolution to source files, not dist
			// This ensures Vitest tests TypeScript source with dynamic imports preserved
			"@/": path.resolve(__dirname, "./src/"),
			// Override package.json exports for relative imports in tests
			"~/": path.resolve(__dirname, "./src/"),
		},
		extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
		// Disable package.json "exports" field resolution for this package during tests
		// This forces Vitest to use source files instead of compiled dist output
		conditions: ["development"],
	},
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		// CRITICAL: Tell Vitest to NOT use the compiled dist/ output
		exclude: ["node_modules", "dist"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: [
				"src/communication/**/*.ts",
				"src/email/**/*.ts",
				"!src/**/*.test.ts",
				"!src/**/*.test.tsx",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 75,
				statements: 80,
			},
		},
	},
});
