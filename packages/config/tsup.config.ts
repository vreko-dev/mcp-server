import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/subscription-config.ts", "src/utils/*.ts"],
	format: ["esm"],
	dts: {
		resolve: true, // Resolves workspace:* dependencies
		compilerOptions: {
			composite: false,
			incremental: false,
		},
	},
	splitting: true,
	sourcemap: true,
	clean: true,
	outDir: "dist",
});
