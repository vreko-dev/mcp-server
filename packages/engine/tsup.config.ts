import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"signals/index": "src/signals/index.ts",
		"runtime/index": "src/runtime/index.ts",
		"validators/index": "src/validators/index.ts",
		"transports/mcp": "src/transports/mcp.ts",
		"transports/http": "src/transports/http.ts",
		"transports/cli": "src/transports/cli.ts",
	},
	format: ["esm"],
	dts: true,
	splitting: false, // Disable splitting for subpath exports
	sourcemap: true,
	clean: true,
	outDir: "dist",
	tsconfig: "tsconfig.json",
});
