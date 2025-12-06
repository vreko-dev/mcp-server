import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: false, // Skip declarations - use tsc for type declarations (matches OSS SDK pattern)
	clean: true,
	sourcemap: true,
	outDir: "dist",
	splitting: false,
	treeshake: true,
	target: "es2022",
	skipNodeModulesBundle: true,
});
