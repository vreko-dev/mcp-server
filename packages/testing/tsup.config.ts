import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"msw/index": "src/msw/index.ts",
		"msw/server": "src/msw/server.ts",
		"msw/handlers/index": "src/msw/handlers/index.ts",
		"msw/handlers/oauth": "src/msw/handlers/oauth.ts",
		"msw/handlers/resend": "src/msw/handlers/resend.ts",
		"msw/handlers/posthog": "src/msw/handlers/posthog.ts",
		"mocks/auth": "src/mocks/auth.ts",
		"utils/performance": "src/utils/performance.ts",
		"fixtures/index": "src/fixtures/index.ts",
	},
	format: ["esm"],
	dts: {
		resolve: true, // Resolves workspace:* dependencies
		compilerOptions: {
			composite: false, // Disable composite for DTS bundling
			incremental: false, // Disable incremental for DTS generation
		},
	},
	clean: true,
	sourcemap: true,
	treeshake: true,
	target: "es2022",
	skipNodeModulesBundle: true,
});
