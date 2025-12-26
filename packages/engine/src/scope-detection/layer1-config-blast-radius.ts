/**
 * Layer 1.5: Config Blast Radius Analysis
 *
 * Handles special blast radius calculation for configuration files.
 */

import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { glob } from "glob";
import type { ConfigBlastRadius, RepoContext } from "./types";

// =============================================================================
// CONFIG HANDLER REGISTRY
// =============================================================================

type ConfigHandler = (filePath: string, repoContext: RepoContext) => Promise<ConfigBlastRadius>;

/**
 * Registry of config file handlers
 */
export const CONFIG_HANDLERS: Record<string, ConfigHandler> = {
	"package.json": handlePackageJson,
	"tsconfig.json": handleTsconfig,
	".env": handleEnvFile,
	".env.local": handleEnvFile,
	".env.development": handleEnvFile,
	".env.production": handleEnvFile,
	"vite.config.ts": handleViteConfig,
	"vite.config.js": handleViteConfig,
	"next.config.js": handleNextConfig,
	"next.config.mjs": handleNextConfig,
	"turbo.json": handleTurboConfig,
	"biome.json": handleBiomeConfig,
	".eslintrc.json": handleEslintConfig,
	"webpack.config.js": handleWebpackConfig,
	"rollup.config.js": handleRollupConfig,
};

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Calculate blast radius for a configuration file
 */
export async function calculateConfigBlastRadius(
	filePath: string,
	repoContext: RepoContext,
): Promise<ConfigBlastRadius | null> {
	const filename = basename(filePath);

	const handler = CONFIG_HANDLERS[filename];
	if (!handler) {
		// Not a recognized config file
		return null;
	}

	return await handler(filePath, repoContext);
}

// =============================================================================
// PACKAGE.JSON HANDLER
// =============================================================================

async function handlePackageJson(filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	const dir = dirname(filePath);
	const isRoot = dir === repoContext.rootPath || dir === ".";

	if (isRoot && repoContext.type !== "single") {
		// Root package.json in monorepo - affects everything
		return {
			scope: "workspace",
			affectedFiles: repoContext.entryPoints,
			affectedPackages: repoContext.workspaces.map((w) => w.name),
			reasoning: "Root package.json affects all workspace packages",
		};
	}

	if (isRoot) {
		// Root package.json in single repo - affects entire app
		return {
			scope: "workspace",
			affectedFiles: repoContext.entryPoints,
			affectedPackages: [],
			reasoning: "Root package.json affects entire application",
		};
	}

	// Workspace package.json - affects package and its dependents
	const packageName = await getPackageNameFromPath(filePath);
	const workspace = repoContext.workspaces.find((w) => w.name === packageName);

	const affectedFiles: string[] = [];
	if (workspace) {
		// Get entry points for this workspace
		const patterns = [`${workspace.path}/src/index.{ts,tsx,js,jsx}`, `${workspace.path}/index.{ts,tsx,js,jsx}`];

		for (const pattern of patterns) {
			const matches = await glob(pattern, { cwd: repoContext.rootPath });
			affectedFiles.push(...matches);
		}
	}

	return {
		scope: "package",
		affectedFiles,
		affectedPackages: workspace?.dependents ?? [],
		reasoning: `Package ${packageName} package.json affects package and ${workspace?.dependents.length ?? 0} dependents`,
	};
}

// =============================================================================
// TSCONFIG HANDLER
// =============================================================================

async function handleTsconfig(filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	const dir = dirname(filePath);
	const isRoot = dir === repoContext.rootPath || dir === ".";

	if (isRoot && repoContext.type !== "single") {
		// Root tsconfig - check what extends it
		const extending = await findTsconfigExtenders(filePath, repoContext);

		return {
			scope: "extends-chain",
			affectedFiles: extending.extendingFiles,
			affectedPackages: extending.extendingPackages,
			reasoning: `Root tsconfig extended by ${extending.extendingPackages.length} packages`,
		};
	}

	// Workspace or single-repo tsconfig
	const tsFiles = await findTypescriptFiles(dir);

	return {
		scope: "package",
		affectedFiles: tsFiles,
		affectedPackages: [],
		reasoning: "tsconfig affects all TypeScript files in scope",
	};
}

/**
 * Find all tsconfig files that extend this one
 */
async function findTsconfigExtenders(
	tsconfigPath: string,
	repoContext: RepoContext,
): Promise<{ extendingFiles: string[]; extendingPackages: string[] }> {
	const extendingFiles: string[] = [];
	const extendingPackages = new Set<string>();

	// Find all tsconfig.json files in the workspace
	const allTsconfigs = await glob("**/tsconfig.json", {
		cwd: repoContext.rootPath,
		ignore: ["**/node_modules/**"],
	});

	for (const configFile of allTsconfigs) {
		if (configFile === tsconfigPath) continue;

		try {
			const content = await readFile(join(repoContext.rootPath, configFile), "utf-8");
			const config = JSON.parse(content);

			// Check if it extends our target config
			if (
				config.extends &&
				(config.extends.includes(basename(tsconfigPath)) || config.extends === tsconfigPath)
			) {
				extendingFiles.push(configFile);

				// Find package name
				const packageName = await getPackageNameFromPath(join(repoContext.rootPath, configFile));
				if (packageName) {
					extendingPackages.add(packageName);
				}
			}
		} catch {
			// Ignore files we can't read/parse
		}
	}

	return {
		extendingFiles,
		extendingPackages: [...extendingPackages],
	};
}

/**
 * Find all TypeScript files in a directory
 */
async function findTypescriptFiles(dir: string): Promise<string[]> {
	return await glob("**/*.{ts,tsx}", {
		cwd: dir,
		ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
	});
}

// =============================================================================
// ENV FILE HANDLER
// =============================================================================

async function handleEnvFile(_filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	// Find files that read process.env
	const consumers = await findEnvConsumers(repoContext.rootPath);

	return {
		scope: "env-consumers",
		affectedFiles: consumers,
		affectedPackages: [],
		reasoning: `Environment file affects ${consumers.length} files that read process.env`,
	};
}

/**
 * Find all files that reference environment variables
 */
async function findEnvConsumers(workspaceRoot: string): Promise<string[]> {
	const patterns = [
		/process\.env\./,
		/import\.meta\.env\./,
		/\$env\//, // SvelteKit
	];

	const sourceFiles = await glob("**/*.{ts,tsx,js,jsx}", {
		cwd: workspaceRoot,
		ignore: ["**/node_modules/**", "**/*.test.*", "**/*.spec.*"],
	});

	const consumers: string[] = [];

	for (const file of sourceFiles) {
		try {
			const content = await readFile(join(workspaceRoot, file), "utf-8");
			if (patterns.some((p) => p.test(content))) {
				consumers.push(file);
			}
		} catch {
			// Ignore files we can't read
		}
	}

	return consumers;
}

// =============================================================================
// BUILD TOOL CONFIG HANDLERS
// =============================================================================

async function handleViteConfig(_filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	return {
		scope: "workspace",
		affectedFiles: repoContext.entryPoints,
		affectedPackages: [],
		reasoning: "Vite config affects entire build output",
	};
}

async function handleNextConfig(_filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	return {
		scope: "workspace",
		affectedFiles: repoContext.entryPoints,
		affectedPackages: [],
		reasoning: "Next.js config affects entire application",
	};
}

async function handleTurboConfig(_filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	return {
		scope: "workspace",
		affectedFiles: repoContext.entryPoints,
		affectedPackages: repoContext.workspaces.map((w) => w.name),
		reasoning: "Turbo config affects all workspace tasks",
	};
}

async function handleWebpackConfig(_filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	return {
		scope: "workspace",
		affectedFiles: repoContext.entryPoints,
		affectedPackages: [],
		reasoning: "Webpack config affects entire build",
	};
}

async function handleRollupConfig(_filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	return {
		scope: "workspace",
		affectedFiles: repoContext.entryPoints,
		affectedPackages: [],
		reasoning: "Rollup config affects entire build",
	};
}

// =============================================================================
// LINTER/FORMATTER CONFIG HANDLERS
// =============================================================================

async function handleBiomeConfig(_filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	// Find all source files
	const sourceFiles = await glob("**/*.{ts,tsx,js,jsx,json}", {
		cwd: repoContext.rootPath,
		ignore: ["**/node_modules/**", "**/dist/**"],
	});

	return {
		scope: "workspace",
		affectedFiles: sourceFiles,
		affectedPackages: repoContext.workspaces.map((w) => w.name),
		reasoning: `Biome config affects ${sourceFiles.length} source files`,
	};
}

async function handleEslintConfig(_filePath: string, repoContext: RepoContext): Promise<ConfigBlastRadius> {
	const sourceFiles = await glob("**/*.{ts,tsx,js,jsx}", {
		cwd: repoContext.rootPath,
		ignore: ["**/node_modules/**", "**/dist/**"],
	});

	return {
		scope: "workspace",
		affectedFiles: sourceFiles,
		affectedPackages: repoContext.workspaces.map((w) => w.name),
		reasoning: `ESLint config affects ${sourceFiles.length} source files`,
	};
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get package name from a file path
 */
async function getPackageNameFromPath(filePath: string): Promise<string | null> {
	const dir = dirname(filePath);
	const packageJsonPath = join(dir, "package.json");

	try {
		const content = await readFile(packageJsonPath, "utf-8");
		const pkg = JSON.parse(content);
		return pkg.name || null;
	} catch {
		return null;
	}
}

/**
 * Check if a file is a config file
 */
export function isConfigFile(filePath: string): boolean {
	const filename = basename(filePath);
	return filename in CONFIG_HANDLERS;
}
