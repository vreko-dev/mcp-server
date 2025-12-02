import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: false, // Generate declarations separately with tsc
	splitting: true,
	sourcemap: true,
	clean: true,
	outDir: "dist",
	external: ["react", "motion"],
});
