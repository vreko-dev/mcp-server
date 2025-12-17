import { resolve } from "node:path";
import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for apps/mcp-server
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				"@mcp": resolve(__dirname, "./src"),
			},
		},
		test: {
			name: "@snapback/mcp-server",
			include: ["test/**/*.test.ts"],
			setupFiles: ["./test/setup.ts"],
			env: {
				DATABASE_URL: "postgresql://test:test@localhost:5432/test",
			},
		},
	}),
);
