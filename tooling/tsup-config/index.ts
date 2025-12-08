import type { Options } from "tsup";
import { defineConfig } from "tsup";

/**
 * Shared tsup configuration presets for the SnapBack monorepo
 * Prevents config drift by centralizing build settings
 */

/**
 * Browser/Client library preset
 * Used for packages consumed by browser code (Next.js apps, React components)
 * - ESM only (better tree-shaking)
 * - DTS resolution enabled
 * - Marks server-only packages as external
 * - Skips node_modules bundling
 */
export const browserLibraryPreset = (options: Partial<Options> = {}): ReturnType<typeof defineConfig> =>
	defineConfig({
		entry: ["src/index.ts"],
		format: ["esm"],
		dts: {
			resolve: true,
			compilerOptions: {
				composite: false,
				incremental: false,
			},
		},
		clean: true,
		sourcemap: true,
		outDir: "dist",
		splitting: true,
		treeshake: true,
		target: "es2022",
		skipNodeModulesBundle: true,
		// Mark server-only packages as external to prevent bundling
		external: ["@snapback/infrastructure", "next", "next/*", "react", "react-dom"],
		...options,
	});

/**
 * Server library preset
 * Used for backend packages (Node.js only)
 * - ESM format
 * - DTS resolution enabled
 * - No external marking needed (bundling is fine)
 */
export const serverLibraryPreset = (options: Partial<Options> = {}): ReturnType<typeof defineConfig> =>
	defineConfig({
		entry: ["src/index.ts"],
		format: ["esm"],
		dts: {
			resolve: true,
			compilerOptions: {
				composite: false,
				incremental: false,
			},
		},
		clean: true,
		sourcemap: true,
		outDir: "dist",
		splitting: false,
		treeshake: true,
		target: "es2022",
		skipNodeModulesBundle: true,
		...options,
	});

/**
 * DTS-disabled library preset
 * Used for packages with complex type resolution issues
 * Document reasons in package tsup.config.ts comment
 */
export const dtsFalseLibraryPreset = (options: Partial<Options> = {}): ReturnType<typeof defineConfig> =>
	defineConfig({
		entry: ["src/index.ts"],
		format: ["esm"],
		dts: false, // Disabled - see package tsup.config.ts for reason
		clean: true,
		sourcemap: true,
		outDir: "dist",
		splitting: false,
		treeshake: true,
		target: "es2022",
		skipNodeModulesBundle: true,
		...options,
	});

/**
 * Node.js application preset
 * Used for CLI tools and Node.js apps
 * - ESM format
 * - No DTS needed (executable)
 * - No bundling (externalize dependencies)
 */
export const nodeAppPreset = (options: Partial<Options> = {}): ReturnType<typeof defineConfig> =>
	defineConfig({
		entry: ["src/**/*.ts"],
		format: ["esm"],
		target: "node20",
		dts: false,
		sourcemap: true,
		clean: true,
		splitting: false,
		bundle: false,
		...options,
	});

/**
 * Dual-format library preset (ESM + CJS)
 * Used for packages that need both ESM and CommonJS
 * - Smaller subset of packages (analytics, mail)
 */
export const dualFormatLibraryPreset = (options: Partial<Options> = {}): ReturnType<typeof defineConfig> =>
	defineConfig({
		entry: ["src/index.ts"],
		format: ["cjs", "esm"],
		sourcemap: true,
		clean: true,
		minify: false,
		target: "es2022",
		outDir: "dist",
		dts: true,
		...options,
	});

/**
 * Multiple entry points preset
 * Used for packages exposing multiple subexports
 * - Infrastructure, core, policy-engine
 */
export const multiEntryLibraryPreset = (
	entries: Record<string, string>,
	options: Partial<Options> = {},
): ReturnType<typeof defineConfig> =>
	defineConfig({
		entry: entries,
		format: ["esm"],
		dts: {
			resolve: true,
			compilerOptions: {
				composite: false,
				incremental: false,
				skipLibCheck: true,
			},
		},
		clean: true,
		sourcemap: true,
		outDir: "dist",
		splitting: false,
		treeshake: true,
		target: "es2022",
		skipNodeModulesBundle: true,
		...options,
	});
