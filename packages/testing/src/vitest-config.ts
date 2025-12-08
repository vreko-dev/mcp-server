/**
 * Centralized Vitest Configuration Presets
 *
 * Provides shared vitest configuration presets for all packages in the monorepo.
 * Import these presets and merge with package-specific overrides.
 *
 * @example
 * ```typescript
 * // vitest.config.ts in any package
 * import { mergeConfig } from 'vitest/config';
 * import { createVitestConfig, nodePreset } from '@snapback/testing/vitest-config';
 *
 * export default mergeConfig(nodePreset, {
 *   test: {
 *     setupFiles: ['./test/setup.ts'],
 *   },
 * });
 * ```
 */

import { defineConfig, type UserConfig } from "vitest/config";

/**
 * Default test timeouts (ms)
 */
export const TEST_TIMEOUTS = {
	default: 10000,
	integration: 30000,
	e2e: 60000,
	performance: 15000,
} as const;

/**
 * Coverage thresholds per package type
 */
export const COVERAGE_THRESHOLDS = {
	unit: { statements: 80, branches: 75, functions: 80, lines: 80 },
	integration: { statements: 60, branches: 50, functions: 60, lines: 60 },
	e2e: { statements: 40, branches: 30, functions: 40, lines: 40 },
} as const;

/**
 * Base configuration shared by all presets
 */
const baseConfig: UserConfig = {
	test: {
		globals: true,
		clearMocks: true,
		restoreMocks: true,
		mockReset: true,
		testTimeout: TEST_TIMEOUTS.default,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/*.config.*",
				"**/*.d.ts",
				"**/test/**",
				"**/__tests__/**",
				"**/mocks/**",
			],
		},
	},
};

/**
 * Node.js environment preset - for packages, SDK, CLI, MCP, API
 *
 * @example
 * ```typescript
 * import { nodePreset } from '@snapback/testing/vitest-config';
 * export default nodePreset;
 * ```
 */
export const nodePreset = defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		environment: "node",
		include: ["test/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts", "**/__tests__/**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist", "out", "e2e/**"],
	},
});

/**
 * JSDOM environment preset - for React components, browser-like testing
 *
 * @example
 * ```typescript
 * import { jsdomPreset } from '@snapback/testing/vitest-config';
 * export default jsdomPreset;
 * ```
 */
export const jsdomPreset = defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		environment: "jsdom",
		include: ["test/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
		exclude: ["node_modules", "dist", "out", ".next"],
	},
});

/**
 * Integration test preset - longer timeouts, different coverage
 *
 * @example
 * ```typescript
 * import { integrationPreset } from '@snapback/testing/vitest-config';
 * export default integrationPreset;
 * ```
 */
export const integrationPreset = defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		environment: "node",
		testTimeout: TEST_TIMEOUTS.integration,
		include: ["test/integration/**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist"],
		poolOptions: {
			threads: {
				singleThread: true, // Integration tests often need isolation
			},
		},
	},
});

/**
 * E2E test preset - longest timeouts, sequential execution
 *
 * @example
 * ```typescript
 * import { e2ePreset } from '@snapback/testing/vitest-config';
 * export default e2ePreset;
 * ```
 */
export const e2ePreset = defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		environment: "node",
		testTimeout: TEST_TIMEOUTS.e2e,
		include: ["test/e2e/**/*.{test,spec}.ts", "e2e/**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist"],
		poolOptions: {
			threads: {
				singleThread: true, // E2E tests must run sequentially
			},
		},
	},
});

/**
 * Factory function to create custom vitest config with sensible defaults
 *
 * @param options - Custom configuration options
 * @returns Vitest config object
 *
 * @example
 * ```typescript
 * import { createVitestConfig } from '@snapback/testing/vitest-config';
 *
 * export default createVitestConfig({
 *   name: '@snapback/sdk',
 *   environment: 'node',
 *   setupFiles: ['./test/setup.ts'],
 *   alias: {
 *     '@sdk': './src',
 *   },
 * });
 * ```
 */
export function createVitestConfig(options: {
	name?: string;
	environment?: "node" | "jsdom" | "happy-dom";
	setupFiles?: string[];
	alias?: Record<string, string>;
	testTimeout?: number;
	coverageThreshold?: typeof COVERAGE_THRESHOLDS.unit;
	include?: string[];
	exclude?: string[];
}): ReturnType<typeof defineConfig> {
	const {
		name,
		environment = "node",
		setupFiles = [],
		alias = {},
		testTimeout = TEST_TIMEOUTS.default,
		coverageThreshold,
		include,
		exclude,
	} = options;

	return defineConfig({
		resolve: Object.keys(alias).length > 0 ? { alias } : undefined,
		test: {
			...baseConfig.test,
			name,
			environment,
			setupFiles: setupFiles.length > 0 ? setupFiles : undefined,
			testTimeout,
			include: include ?? nodePreset.test?.include,
			exclude: exclude ?? nodePreset.test?.exclude,
			coverage: coverageThreshold
				? {
						provider: "v8" as const,
						reporter: ["text", "json", "html"],
						thresholds: coverageThreshold,
					}
				: baseConfig.test?.coverage,
		},
	});
}

/**
 * Helper to merge vitest configs properly
 *
 * @param base - Base config to extend
 * @param override - Override configuration
 * @returns Merged config
 *
 * @example
 * ```typescript
 * import { nodePreset, mergeConfigs } from '@snapback/testing/vitest-config';
 *
 * export default mergeConfigs(nodePreset, {
 *   test: { setupFiles: ['./setup.ts'] },
 * });
 * ```
 */
export function mergeConfigs(base: UserConfig, override: Partial<UserConfig>): UserConfig {
	return {
		...base,
		...override,
		resolve: {
			...base.resolve,
			...override.resolve,
			alias: {
				...(base.resolve?.alias as Record<string, string>),
				...(override.resolve?.alias as Record<string, string>),
			},
		},
		test: {
			...base.test,
			...override.test,
			coverage: {
				...base.test?.coverage,
				...override.test?.coverage,
			},
		},
	};
}
