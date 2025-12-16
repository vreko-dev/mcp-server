import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"signals/index": "src/signals/index.ts",
		"runtime/index": "src/runtime/index.ts",
		"validators/index": "src/validators/index.ts",
	},
	format: ["esm"],
	dts: true,
	splitting: false, // Disable splitting for subpath exports
	sourcemap: true,
	clean: true,
	outDir: "dist",
	tsconfig: "tsconfig.json",
});
