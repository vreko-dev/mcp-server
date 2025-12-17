import path from "node:path";
import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for @snapback/auth
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				"@snapback/integrations": path.resolve(__dirname, "../integrations/src"),
			},
		},
		test: {
			name: "@snapback/auth",
			include: ["test/**/*.test.ts"],
			env: {
				// Database - use test values if not provided
				DATABASE_URL: process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test",
				BETTER_AUTH_SECRET:
					process.env.BETTER_AUTH_SECRET || "test-secret-at-least-32-characters-long-for-testing",
				// OAuth - stub values for tests
				GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "test-google-client-id",
				GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret",
				GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "test-github-client-id",
				GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "test-github-client-secret",
			},
		},
	}),
);
