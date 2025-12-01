import path from "node:path";
import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "@snapback/auth",
		globals: true,
		environment: "node",
		include: ["**/*.{test,spec}.{js,ts}"],
		env: {
			// Database - use test values if not provided
			DATABASE_URL:
				process.env.DATABASE_URL ||
				"postgresql://test:test@localhost:5432/test",
			BETTER_AUTH_SECRET:
				process.env.BETTER_AUTH_SECRET ||
				"test-secret-at-least-32-characters-long-for-testing",
			// OAuth - stub values for tests
			GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "test-google-client-id",
			GOOGLE_CLIENT_SECRET:
				process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret",
			GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "test-github-client-id",
			GITHUB_CLIENT_SECRET:
				process.env.GITHUB_CLIENT_SECRET || "test-github-client-secret",
		},
	},
	resolve: {
		alias: {
			"@snapback/platform": path.resolve(__dirname, "../platform/src"),
			"@snapback/config": path.resolve(__dirname, "../config/src"),
			"@snapback/infrastructure": path.resolve(
				__dirname,
				"../infrastructure/src",
			),
			"@snapback/integrations": path.resolve(__dirname, "../integrations/src"),
			"@snapback/core": path.resolve(__dirname, "../core/src"),
		},
	},
});
