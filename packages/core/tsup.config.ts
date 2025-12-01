import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"mcp-federation": "src/mcp-federation.ts",
		"mcp-fallbacks": "src/mcp-fallbacks.ts",
		"risk-analyzer": "src/risk-analyzer.ts",
		guardian: "src/guardian.ts",
		detection: "src/detection/index.ts",
	},
	format: ["esm"],
	dts: false, // Temporarily disabled due to build error, will fix separately
	clean: true,
	sourcemap: true,
	outDir: "dist",
	splitting: false,
	treeshake: true,
	tsconfig: "tsconfig.build.json",
	target: "es2022",
});
