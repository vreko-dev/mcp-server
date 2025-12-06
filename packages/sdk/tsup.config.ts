import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: false, // Skip DTS generation due to better-sqlite3 type resolution issues
	clean: true,
	sourcemap: true,
	outDir: "dist",
	splitting: false,
	treeshake: true,
	target: "es2022",
	skipNodeModulesBundle: true,
});
