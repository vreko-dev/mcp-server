import { defineConfig } from "tsup";
export default defineConfig({
	entry: ["src/**/*.ts"],
	format: ["esm"],
	target: "node20",
	dts: false,
	sourcemap: true,
	clean: true,
	splitting: false,
	bundle: false, // Don't bundle - externalize all dependencies to avoid dynamic require issues
});
