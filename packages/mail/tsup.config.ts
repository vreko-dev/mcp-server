import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: {
		resolve: true,
	},
	tsconfig: "tsconfig.json",
	sourcemap: true,
	clean: true,
	shims: true,
});
