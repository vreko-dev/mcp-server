import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/server.ts",
		"modules/posthog/procedures/setup-alerts.ts",
		"modules/posthog/procedures/run-correlation-analysis.ts",
		"modules/posthog/procedures/setup-cohorts.ts",
	],
	outDir: "dist",
	format: ["esm"],
	target: "node18",
	splitting: false,
	sourcemap: true,
	minify: false,
	shims: true,
	dts: false,
	clean: true,
	env: {
		NODE_ENV: process.env.NODE_ENV || "development",
	},
});
