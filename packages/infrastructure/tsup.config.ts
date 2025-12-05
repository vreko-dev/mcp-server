import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"logging/logger": "src/logging/logger.ts",
		"metrics/index": "src/metrics/index.ts",
		"posthog/alerts": "src/posthog/alerts.ts",
		"posthog/cohorts": "src/posthog/cohorts.ts",
		"posthog/correlation": "src/posthog/correlation.ts",
		"tracing/index": "src/tracing/index.ts",
		"health/index": "src/health/index.ts",
	},
	format: ["esm"],
	dts: false, // Temporarily disable DTS generation - use tsc for type declarations
	clean: true,
	sourcemap: true,
	outDir: "dist",
	bundle: false, // Don't bundle the files
	splitting: false,
	treeshake: true,
	target: "es2022",
	skipNodeModulesBundle: true,
	external: ["next", "next/*", "next/headers", "next/server", "next/navigation", "react", "react-dom"],
});
