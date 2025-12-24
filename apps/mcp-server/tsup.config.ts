import { copyFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/**/*.ts"],
	format: ["esm"],
	target: "node20",
	dts: false,
	sourcemap: true,
	clean: true,
	splitting: false,
	bundle: false,
	loader: {
		".json": "copy",
	},
	onSuccess: async () => {
		// Ensure migration-patterns.json is copied to dist
		const srcPath = "src/services/migration-patterns.json";
		const destPath = "dist/services/migration-patterns.json";
		try {
			mkdirSync(dirname(destPath), { recursive: true });
			copyFileSync(srcPath, destPath);
			console.log("✓ Copied migration-patterns.json to dist");
		} catch (error) {
			console.error("Failed to copy migration-patterns.json:", error);
		}
	},
});
