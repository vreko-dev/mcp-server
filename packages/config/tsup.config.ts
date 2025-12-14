import { multiEntryLibraryPreset } from "../../tooling/tsup-config";

// Server library with migration utilities
// Uses multiEntryLibraryPreset for multiple subpath exports
// dts: { resolve: true } is provided by the preset
export default multiEntryLibraryPreset(
	{
		index: "src/index.ts",
		"subscription-config": "src/subscription-config.ts",
		"utils/index": "src/utils/index.ts",
		"utils/base-url": "src/utils/base-url.ts",
		"utils/monorepo-flattener": "src/utils/monorepo-flattener.ts",
		"utils/path-transformer": "src/utils/path-transformer.ts",
		"utils/feature-flags": "src/utils/feature-flags.ts",
		"migrations/index": "src/migrations/index.ts",
		"migrations/cleanup": "src/migrations/cleanup.ts",
		"migrations/orchestrator": "src/migrations/orchestrator.ts",
		"migrations/v1-to-v2": "src/migrations/v1-to-v2.ts",
		"migrations/validator": "src/migrations/validator.ts",
		"bin/migrate": "src/bin/migrate.ts",
	},
	{
		external: ["@snapback/infrastructure"],
	},
);
