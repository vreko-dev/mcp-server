import { defineConfig } from "tsup";

export default defineConfig({
	// Entry points must match package.json exports
	entry: {
		index: "src/index.ts",
		"client/index": "src/client/index.ts",
		"tools/index": "src/tools/index.ts",
		"transport/index": "src/transport/index.ts",
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
