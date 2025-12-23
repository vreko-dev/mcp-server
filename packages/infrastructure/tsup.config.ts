import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		// Analytics
		"analytics/AnalyticsWrapper": "src/analytics/AnalyticsWrapper.ts",
		// Logging
		"logging/logger": "src/logging/logger.ts",
		// Metrics - all submodules
		"metrics/index": "src/metrics/index.ts",
		"metrics/core/events": "src/metrics/core/events.ts",
		"metrics/core/sampling": "src/metrics/core/sampling.ts",
		"metrics/core/types": "src/metrics/core/types.ts",
		"metrics/client/index": "src/metrics/client/index.ts",
		"metrics/server/index": "src/metrics/server/index.ts",
		"metrics/session-replay/manager": "src/metrics/session-replay/manager.ts",
		"metrics/session-replay/sampling": "src/metrics/session-replay/sampling.ts",
		"metrics/test-utils/index": "src/metrics/test-utils/index.ts",
		// PostHog
		"posthog/index": "src/posthog/index.ts",
		"posthog/alerts": "src/posthog/alerts.ts",
		"posthog/cohorts": "src/posthog/cohorts.ts",
		"posthog/correlation": "src/posthog/correlation.ts",
		// Tracing - all submodules
		"tracing/index": "src/tracing/index.ts",
		"tracing/error-budget": "src/tracing/error-budget.ts",
		"tracing/otel-provider": "src/tracing/otel-provider.ts",
		"tracing/telemetry-client": "src/tracing/telemetry-client.ts",
		// Health
		"health/index": "src/health/index.ts",
		// Sentry
		"sentry/index": "src/sentry/index.ts",
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
