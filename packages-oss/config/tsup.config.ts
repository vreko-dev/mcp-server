import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: {
		resolve: true,
		compilerOptions: {
			composite: false,
			incremental: false,
		},
	},
	clean: true,
	sourcemap: true,
	outDir: "dist",
	splitting: false,
	treeshake: true,
	target: "es2022",
	skipNodeModulesBundle: true,
});
