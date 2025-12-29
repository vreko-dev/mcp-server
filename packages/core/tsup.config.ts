import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"analysis/index": "src/analysis/index.ts",
		"mcp-federation": "src/mcp-federation.ts",
		"mcp-fallbacks": "src/mcp-fallbacks.ts",
		// Deprecated V1 entries removed - use @snapback/engine instead
	},
	format: ["esm"],
	dts: false, // Disabled - parsing error in utils/logger.ts
	clean: true,
	sourcemap: true,
	outDir: "dist",
	splitting: false,
	treeshake: true,
	tsconfig: "tsconfig.build.json",
	target: "es2022",
});
