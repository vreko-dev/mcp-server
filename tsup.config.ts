import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node20",
	outDir: "dist",
	clean: true,
	sourcemap: true,
	// Bundle all workspace packages (@snapback/* and @snapback-oss/*)
	noExternal: [/^@snapback\//, /^@snapback-oss\//],
	// Externalize EVERYTHING else to avoid pulling in transitive deps
	skipNodeModulesBundle: true,
	esbuildOptions(options) {
		options.banner = {
			js: "// SnapBack MCP Server - Bundled for Fly.io deployment",
		};
	},
});
