import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm"],
	dts: false, // We'll use tsc for declarations
	sourcemap: true,
	clean: true,
	splitting: false,
	treeshake: true,
});
