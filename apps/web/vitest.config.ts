import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// Load test env file for Supabase configuration
config({ path: ".env.test" });

export default defineConfig({
	plugins: [react()],
	test: {
		name: "@snapback/web",
		globals: true,
		environment: "jsdom",
		include: ["**/*.{test,spec}.{js,ts,jsx,tsx}"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/tests/e2e/**", // Exclude Playwright E2E tests
		],
		setupFiles: ["./vitest.setup.ts"],
		// Watch for template/hook changes to rerun dependent tests
		watchTriggerPatterns: [
			{
				pattern: /^(modules|hooks|app)\/(.*)\.(ts|tsx)$/,
				testsToRun: (id, match) => {
					// Rerun tests when component or hook changes
					return `**/${match[2]}.{test,spec}.{ts,tsx}`;
				},
			},
		],
		coverage: {
			enabled: true,
			reporter: ["text", "json", "html"],
			include: ["modules/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
			exclude: [
				"**/*.d.ts",
				"**/*.config.*",
				"**/types/**",
				"**/*.stories.{ts,tsx}",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			"@marketing": path.resolve(__dirname, "./modules/marketing"),
			"@saas": path.resolve(__dirname, "./modules/saas"),
			"@ui": path.resolve(__dirname, "./modules/ui"),
			"@shared": path.resolve(__dirname, "./modules/shared"),
			"@analytics": path.resolve(__dirname, "./modules/analytics"),
			"@snapback/api": path.resolve(__dirname, "../api"),
			"@snapback/auth/client": path.resolve(
				__dirname,
				"../../packages/auth/src/client.ts",
			),
			"@snapback/auth": path.resolve(__dirname, "../../packages/auth"),
			"@snapback/config": path.resolve(__dirname, "../../packages/config/src"),
			"@snapback/platform": path.resolve(__dirname, "../platform"),
			"@snapback/infrastructure": path.resolve(
				__dirname,
				"../../packages/logs",
			),
			"@snapback/integrations": path.resolve(
				__dirname,
				"../../packages/integrations",
			),
			"@snapback/storage": path.resolve(__dirname, "../../packages/storage"),
			"@snapback/utils": path.resolve(
				__dirname,
				"../../packages/config/src/utils",
			),
		},
	},
});
