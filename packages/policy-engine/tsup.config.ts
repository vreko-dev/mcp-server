import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/detectors/index.ts",
		"src/detectors/SecretDetector.ts",
		"src/detectors/MockDetector.ts",
		"src/detectors/PhantomDependencyDetector.ts",
	],
	format: ["esm"],
	dts: {
		resolve: true,
	},
	clean: true,
	sourcemap: true,
	outDir: "dist",
	splitting: false,
	treeshake: true,
	target: "es2022",
	skipNodeModulesBundle: true,
	outExtension: () => ({ js: ".js", dts: ".d.ts" }), // Use .js extension instead of .mjs
});
