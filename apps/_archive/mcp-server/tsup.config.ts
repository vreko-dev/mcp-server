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
		// JSON files to copy to dist
		const jsonFiles = [
			{ src: "src/services/migration-patterns.json", dest: "dist/services/migration-patterns.json" },
			{ src: "src/ctx/defaults.json", dest: "dist/ctx/defaults.json" },
		];

		for (const { src, dest } of jsonFiles) {
			try {
				mkdirSync(dirname(dest), { recursive: true });
				copyFileSync(src, dest);
				console.log(`✓ Copied ${src} to dist`);
			} catch (error) {
				console.error(`Failed to copy ${src}:`, error);
			}
		}
	},
});
