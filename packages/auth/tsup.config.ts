import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/client.ts",
		"src/auth.ts",
		"src/lib/audit.ts",
		"src/lib/helper.ts",
		"src/lib/organization.ts",
	],
	format: ["esm"],
	dts: false, // Disabled - complex internal structure with Session export issues
	clean: true,
	sourcemap: true,
	outDir: "dist",
	splitting: false,
	treeshake: true,
	target: "es2022",
	skipNodeModulesBundle: true,
});
