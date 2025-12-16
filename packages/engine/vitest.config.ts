import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		testTimeout: 30000, // 30 seconds for tests with coverage overhead
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/index.ts", // Re-export files
				"src/types.ts", // Type-only files
				"src/actions/**", // Standalone scripts (file I/O heavy)
			],
			thresholds: {
				// Global thresholds - 77%+ achieved with direct import testing
				// Remaining gap is stdin/stdout main() functions and execSync calls
				statements: 75,
				branches: 85,
				functions: 90,
				lines: 75,
				// Transports: 93%+ coverage (direct import testing)
				"src/transports/*.ts": {
					statements: 90,
					branches: 85,
					functions: 100,
					lines: 90,
				},
				// Runtime: 89%+ coverage (direct import testing)
				"src/runtime/*.ts": {
					statements: 65,
					branches: 80,
					functions: 70,
					lines: 65,
				},
				// Signals: 72%+ aggregate (core functions exported, main() uses stdin)
				"src/signals/*.ts": {
					statements: 45,
					branches: 50,
					functions: 80,
					lines: 45,
				},
				// Validators: 50%+ aggregate (uses execSync for tsc/biome/madge)
				"src/validators/*.ts": {
					statements: 15,
					branches: 30,
					functions: 30,
					lines: 15,
				},
			},
		},
	},
});
