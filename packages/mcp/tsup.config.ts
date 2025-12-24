import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"middleware/index": "src/middleware/index.ts",
	},
	format: ["esm"],
	// dts: false - tsc --emitDeclarationOnly handles declarations separately
	// This is the SDK pattern: tsup for JS, tsc for .d.ts into dist-types/
	dts: false,
	sourcemap: true,
	clean: true,
	skipNodeModulesBundle: true,
});
