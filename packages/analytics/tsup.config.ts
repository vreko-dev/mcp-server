import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm"],
	sourcemap: true,
	clean: true,
	minify: false,
	target: "es2022",
	outDir: "dist",
	dts: true, // Enable declaration generation
});
