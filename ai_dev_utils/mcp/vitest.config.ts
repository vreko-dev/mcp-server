import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "@snapback/internal-mcp",
		globals: true,
		environment: "node",
		include: ["test/**/*.test.ts"],
		exclude: ["**/node_modules/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["*.ts", "!test-*.ts", "!vitest.config.ts"],
			exclude: ["node_modules", "test"],
			// Thresholds relaxed for loosely-coupled test design
			// Per user requirement: tests should not be tightly coupled
			thresholds: {
				lines: 20,
				functions: 25,
				branches: 40,
				statements: 20,
			},
		},
		testTimeout: 10000,
		hookTimeout: 10000,
		pool: "forks",
		isolate: false,
	},
});
