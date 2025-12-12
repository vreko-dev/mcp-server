import { browserLibraryPreset } from "../../tooling/tsup-config";

// Browser library with custom entries
export default browserLibraryPreset({
	entry: [
		"src/index.ts",
		"src/subscription-config.ts",
		"src/utils/index.ts",
		"src/utils/base-url.ts",
		"src/utils/monorepo-flattener.ts",
		"src/utils/path-transformer.ts",
        "src/utils/feature-flags.ts",
		"src/migrations/index.ts",
		"src/bin/migrate.ts",
	],
	dts: { resolve: true },
	external: ["@snapback/infrastructure"],
});
