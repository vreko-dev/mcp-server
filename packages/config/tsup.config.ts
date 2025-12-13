import { serverLibraryPreset } from "../../tooling/tsup-config";

// Server library with migration utilities
// DTS enabled with resolve: true to support downstream type imports
export default serverLibraryPreset({
	entry: [
		"src/index.ts",
		"src/subscription-config.ts",
		"src/utils/index.ts",
		"src/utils/base-url.ts",
		"src/utils/monorepo-flattener.ts",
		"src/utils/path-transformer.ts",
		"src/utils/feature-flags.ts",
		"src/migrations/index.ts",
		"src/migrations/cleanup.ts",
		"src/migrations/orchestrator.ts",
		"src/migrations/v1-to-v2.ts",
		"src/migrations/validator.ts",
		"src/bin/migrate.ts",
	],
	dts: {
		resolve: true,
		compilerOptions: {
			skipLibCheck: true,
		},
	},
	external: ["@snapback/infrastructure"],
});
