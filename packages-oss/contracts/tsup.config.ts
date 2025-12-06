import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/**/*.ts"],
	format: ["esm"],
	dts: {
		resolve: true,
		compilerOptions: {
			composite: false,
			incremental: false,
		},
	},
	sourcemap: true,
	clean: true,
	outDir: "dist",
	tsconfig: "tsconfig.json",
	target: "es2022",
});
