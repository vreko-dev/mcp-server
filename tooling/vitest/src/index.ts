/**
 * @snapback/vitest-config - Centralized Vitest Configuration
 *
 * Provides shared vitest configuration presets for all packages in the monorepo.
 * Import these presets and merge with package-specific overrides.
 *
 * @example
 * ```typescript
 * // vitest.config.ts in any package
 * import { defineProject, mergeConfig } from 'vitest/config';
 * import { nodeConfig } from '@snapback/vitest-config';
 *
 * export default defineProject(mergeConfig(nodeConfig, {
 *   test: {
 *     name: '@snapback/my-package',
 *     setupFiles: ['./test/setup.ts'],
 *   },
 * }));
 * ```
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type UserConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Constants
// =============================================================================

/**
 * Default test timeouts (ms) - use based on test type
 */
export const TEST_TIMEOUTS = {
	default: 10000,
	integration: 30000,
	e2e: 60000,
	performance: 15000,
} as const;

/**
 * Coverage thresholds per test type
 */
export const COVERAGE_THRESHOLDS = {
	unit: { statements: 80, branches: 75, functions: 80, lines: 80 },
	integration: { statements: 60, branches: 50, functions: 60, lines: 60 },
	e2e: { statements: 40, branches: 30, functions: 40, lines: 40 },
} as const;

/**
 * Standard include patterns - pick ONE pattern per package
 */
export const INCLUDE_PATTERNS: Record<string, string[]> = {
	standard: ["test/**/*.test.ts"],
	withSpec: ["test/**/*.{test,spec}.ts"],
	react: ["test/**/*.{test,spec}.{ts,tsx}"],
	inSrc: ["src/**/*.test.ts"],
};

/**
 * Standard exclude patterns
 * IMPORTANT: Use glob patterns with double-star for nested directories
 */
export const EXCLUDE_PATTERNS: Record<string, string[]> = {
	default: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/coverage/**", "**/fixtures/**/node_modules/**"],
	web: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/.next/**", "**/fixtures/**/node_modules/**"],
	vscode: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/*.vsix", "**/fixtures/**/node_modules/**"],
};

// =============================================================================
// Base Configuration
// =============================================================================

/**
 * Base configuration shared by all presets
 */
const baseConfig: UserConfig = {
	resolve: {
		// CENTRALIZED ALIASES: No more duplicate path definitions
		alias: {
			"@snapback/platform": path.resolve(__dirname, "../../../packages/platform/src"),
			"@snapback/contracts": path.resolve(__dirname, "../../../packages/contracts/src"),
			"@snapback/infrastructure": path.resolve(__dirname, "../../../packages/infrastructure/src"),
			"@snapback/core": path.resolve(__dirname, "../../../packages/core/src"),
			"@snapback/auth": path.resolve(__dirname, "../../../packages/auth/src"),
			"@snapback/events": path.resolve(__dirname, "../../../packages/events/src"),
			"@snapback/sdk": path.resolve(__dirname, "../../../packages/sdk/src"),
			"@snapback/config": path.resolve(__dirname, "../../../packages/config/src"),
			"@snapback/engine": path.resolve(__dirname, "../../../packages/engine/src"),
		},
	},
	test: {
		globals: true,
		clearMocks: true,
		restoreMocks: true,
		mockReset: true,
		passWithNoTests: true,
		testTimeout: TEST_TIMEOUTS.default,
		pool: "forks",
		coverage: {
			provider: "v8",
			reportsDirectory: "./coverage",
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

// =============================================================================
// Presets
// =============================================================================

/**
 * Node.js environment preset - for packages, SDK, CLI, MCP, API
 *
 * @example
 * ```typescript
 * import { nodeConfig } from '@snapback/vitest-config';
 * export default defineProject(nodeConfig);
 * ```
 */
export const nodeConfig = defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		environment: "node",
		include: INCLUDE_PATTERNS.standard,
		exclude: EXCLUDE_PATTERNS.default,
	},
});

// Alias for migration compatibility
export const nodePreset = nodeConfig;

/**
 * JSDOM environment preset - for React components, browser-like testing
 *
 * @example
 * ```typescript
 * import { jsdomConfig } from '@snapback/vitest-config';
 * export default defineProject(jsdomConfig);
 * ```
 */
export const jsdomConfig = defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		environment: "jsdom",
		include: INCLUDE_PATTERNS.react,
		exclude: EXCLUDE_PATTERNS.web,
	},
});

// Alias for migration compatibility
export const jsdomPreset = jsdomConfig;

/**
 * VS Code extension preset - for extension testing with vscode module mocking
 *
 * @example
 * ```typescript
 * import { vscodeConfig } from '@snapback/vitest-config';
 * import { defineProject, mergeConfig } from 'vitest/config';
 *
 * export default defineProject(mergeConfig(vscodeConfig, {
 *   test: {
 *     name: '@snapback/vscode',
 *     setupFiles: ['./test/setup.ts'],
 *   },
 * }));
 * ```
 */
export const vscodeConfig = defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		environment: "node",
		include: INCLUDE_PATTERNS.standard,
		exclude: EXCLUDE_PATTERNS.vscode,
		server: {
			deps: {
				// VS Code module is external (mocked in setup)
				external: ["vscode"],
				// Inline Sentry and other problematic ESM modules
				inline: [/@sentry/],
			},
		},
	},
});

// Alias for migration compatibility
export const vscodePreset = vscodeConfig;

/**
 * Integration test preset - longer timeouts, different coverage
 *
 * @example
 * ```typescript
 * import { integrationConfig } from '@snapback/vitest-config';
 * export default defineProject(integrationConfig);
 * ```
 */
export const integrationConfig = defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		environment: "node",
		testTimeout: TEST_TIMEOUTS.integration,
		include: ["test/integration/**/*.test.ts"],
		exclude: EXCLUDE_PATTERNS.default,
		poolOptions: {
			threads: {
				singleThread: true, // Integration tests often need isolation
			},
		},
	},
});

// Alias for migration compatibility
export const integrationPreset = integrationConfig;

/**
 * E2E test preset - longest timeouts, sequential execution
 *
 * @example
 * ```typescript
 * import { e2eConfig } from '@snapback/vitest-config';
 * export default defineProject(e2eConfig);
 * ```
 */
export const e2eConfig = defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		environment: "node",
		testTimeout: TEST_TIMEOUTS.e2e,
		include: ["test/e2e/**/*.test.ts", "e2e/**/*.test.ts"],
		exclude: EXCLUDE_PATTERNS.default,
		poolOptions: {
			threads: {
				singleThread: true, // E2E tests must run sequentially
			},
		},
	},
});

// Alias for migration compatibility
export const e2ePreset = e2eConfig;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Factory function to create custom vitest config with sensible defaults
 *
 * @param options - Custom configuration options
 * @returns Vitest config object
 *
 * @example
 * ```typescript
 * import { createVitestConfig } from '@snapback/vitest-config';
 *
 * export default createVitestConfig({
 *   name: '@snapback/sdk',
 *   environment: 'node',
 *   setupFiles: ['./test/setup.ts'],
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
		resolve: {
			alias: {
				...(baseConfig.resolve?.alias as Record<string, string>),
				...alias,
			},
		},
		test: {
			...baseConfig.test,
			name,
			environment,
			setupFiles: setupFiles.length > 0 ? setupFiles : undefined,
			testTimeout,
			include: include ?? INCLUDE_PATTERNS.standard,
			exclude: exclude ?? EXCLUDE_PATTERNS.default,
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

// =============================================================================
// Utilities
// =============================================================================

/**
 * Helper to merge vitest configs properly (deep merge)
 *
 * @param base - Base config to extend
 * @param override - Override configuration
 * @returns Merged config
 *
 * @example
 * ```typescript
 * import { nodeConfig, mergeConfigs } from '@snapback/vitest-config';
 *
 * export default mergeConfigs(nodeConfig, {
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
