import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"analytics/AnalyticsWrapper": "src/analytics/AnalyticsWrapper.ts",
		"logging/logger": "src/logging/logger.ts",
		"metrics/index": "src/metrics/index.ts",
		"posthog/alerts": "src/posthog/alerts.ts",
		"posthog/cohorts": "src/posthog/cohorts.ts",
		"posthog/correlation": "src/posthog/correlation.ts",
		"tracing/index": "src/tracing/index.ts",
		"health/index": "src/health/index.ts",
	},
	format: ["esm"],
	dts: {
		resolve: true,
		compilerOptions: {
			composite: false,
			incremental: false,
			rootDir: undefined,
			// Skip problematic @sentry/node type resolution during DTS generation
			skipLibCheck: true,
		},
	},
	clean: true,
	sourcemap: true,
	outDir: "dist",
	bundle: false, // Don't bundle the files
	splitting: false,
	treeshake: true,
	target: "es2022",
	skipNodeModulesBundle: true,
	noExternal: [
		// Allow Sentry types to be processed (don't skip)
		"@sentry/node",
		"@sentry/profiling-node",
	],
	external: [
		// React/Next frameworks
		"next",
		"next/*",
		"next/headers",
		"next/server",
		"next/navigation",
		"react",
		"react-dom",
		// Node.js built-ins
		// These must NOT be imported directly in types; they're only for runtime
		"node:http",
		"node:diagnostics_channel",
		"http",
		"diagnostics_channel",
	],
});
