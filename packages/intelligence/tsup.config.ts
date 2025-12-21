import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"context/index": "src/context/index.ts",
		"validation/index": "src/validation/index.ts",
		"learning/index": "src/learning/index.ts",
		"storage/index": "src/storage/index.ts",
		"types/index": "src/types/index.ts",
		"policy/index": "src/policy/index.ts",
	},
	format: ["esm"],
	dts: false, // Using tsc for declarations
	clean: true,
	sourcemap: true,
	target: "node20",
	outDir: "dist",
	splitting: false,
	treeshake: true,
	// Externalize optional deps - they're dynamically imported
	external: ["sql.js", "@huggingface/transformers", "onnxruntime-common", "onnxruntime-node", "onnxruntime-web"],
});
