/**
 * Layer 1.2: File Classification
 *
 * Classifies files into categories with base risk scores.
 */

import { basename, dirname, extname } from "node:path";
import type { FileCategory, FileClassification, RepoContext } from "./types";
import { FileCategory as FileCategoryEnum, CATEGORY_BASE_RISK as RISK_SCORES } from "./types";

// =============================================================================
// MAIN CLASSIFICATION FUNCTION
// =============================================================================

/**
 * Classify a file into a category with risk score
 */
export function classifyFile(filePath: string, repoContext: RepoContext): FileClassification {
	const filename = basename(filePath);
	const dir = dirname(filePath);
	const ext = extname(filePath);

	// Priority 1: Root configs (highest risk)
	if (isRootConfig(filePath, repoContext)) {
		return createClassification(filePath, FileCategoryEnum.ROOT_CONFIG, repoContext);
	}

	// Priority 2: Build configs
	if (isBuildConfig(filename)) {
		return createClassification(filePath, FileCategoryEnum.BUILD_CONFIG, repoContext);
	}

	// Priority 3: Environment configs
	if (isEnvConfig(filename)) {
		return createClassification(filePath, FileCategoryEnum.ENV_CONFIG, repoContext);
	}

	// Priority 4: Workspace configs
	if (isWorkspaceConfig(filePath, repoContext)) {
		return createClassification(filePath, FileCategoryEnum.WORKSPACE_CONFIG, repoContext);
	}

	// Priority 5: Entry points
	if (isEntryPoint(filePath, repoContext)) {
		return createClassification(filePath, FileCategoryEnum.ENTRY_POINT, repoContext);
	}

	// Priority 6: Type definitions
	if (isTypeDefinition(filename, ext)) {
		return createClassification(filePath, FileCategoryEnum.TYPE_DEFINITION, repoContext);
	}

	// Priority 7: Test files
	if (isTestFile(filename)) {
		return createClassification(filePath, FileCategoryEnum.TEST_FILE, repoContext);
	}

	// Priority 8: Styles
	if (isStyleFile(ext)) {
		return createClassification(filePath, FileCategoryEnum.STYLE, repoContext);
	}

	// Priority 9: Assets
	if (isAssetFile(ext)) {
		return createClassification(filePath, FileCategoryEnum.ASSET, repoContext);
	}

	// Priority 10: Documentation
	if (isDocumentationFile(filename, ext)) {
		return createClassification(filePath, FileCategoryEnum.DOCUMENTATION, repoContext);
	}

	// Priority 11: React hooks
	if (isHook(filename, ext)) {
		return createClassification(filePath, FileCategoryEnum.HOOK, repoContext);
	}

	// Priority 12: React components
	if (isComponent(filename, ext, dir)) {
		return createClassification(filePath, FileCategoryEnum.COMPONENT, repoContext);
	}

	// Priority 13: Utilities
	if (isUtility(dir)) {
		return createClassification(filePath, FileCategoryEnum.UTILITY, repoContext);
	}

	// Default: Domain logic for code files
	if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
		return createClassification(filePath, FileCategoryEnum.DOMAIN_LOGIC, repoContext);
	}

	// Fallback: Asset
	return createClassification(filePath, FileCategoryEnum.ASSET, repoContext);
}

// =============================================================================
// CLASSIFICATION HELPERS
// =============================================================================

function isRootConfig(filePath: string, repoContext: RepoContext): boolean {
	const filename = basename(filePath);
	const dir = dirname(filePath);

	// Must be at repo root
	if (dir !== repoContext.rootPath && dir !== ".") {
		return false;
	}

	const rootConfigs = [
		"package.json",
		"tsconfig.json",
		"turbo.json",
		"pnpm-workspace.yaml",
		"lerna.json",
		".gitignore",
		".npmrc",
		".pnpmrc",
		".yarnrc",
		"biome.json",
		".eslintrc.json",
		".prettierrc",
	];

	return rootConfigs.includes(filename);
}

function isBuildConfig(filename: string): boolean {
	const buildConfigs = [
		"vite.config.ts",
		"vite.config.js",
		"webpack.config.js",
		"webpack.config.ts",
		"rollup.config.js",
		"rollup.config.ts",
		"esbuild.config.js",
		"next.config.js",
		"next.config.mjs",
		"remix.config.js",
		"astro.config.mjs",
		"nuxt.config.ts",
		"tsup.config.ts",
	];

	return buildConfigs.includes(filename);
}

function isEnvConfig(filename: string): boolean {
	return (
		filename === ".env" || filename.startsWith(".env.") || filename === "env.d.ts" || filename === "environment.ts"
	);
}

function isWorkspaceConfig(filePath: string, repoContext: RepoContext): boolean {
	const filename = basename(filePath);

	// package.json or tsconfig.json in workspace (not root)
	if (filename === "package.json" || filename === "tsconfig.json") {
		// Check if it's in a workspace directory
		for (const workspace of repoContext.workspaces) {
			if (filePath.startsWith(workspace.path)) {
				return true;
			}
		}
	}

	return false;
}

function isEntryPoint(filePath: string, repoContext: RepoContext): boolean {
	// Check against known entry points from repo context
	return repoContext.entryPoints.some((entry) => {
		return filePath.endsWith(entry) || filePath === entry;
	});
}

function isTypeDefinition(filename: string, ext: string): boolean {
	return (
		ext === ".d.ts" ||
		filename === "types.ts" ||
		filename === "interfaces.ts" ||
		filename.includes(".types.") ||
		filename.includes(".interface.")
	);
}

function isTestFile(filename: string): boolean {
	return (
		filename.includes(".test.") ||
		filename.includes(".spec.") ||
		filename.endsWith(".test.ts") ||
		filename.endsWith(".test.tsx") ||
		filename.endsWith(".spec.ts") ||
		filename.endsWith(".spec.tsx") ||
		filename.includes("__tests__")
	);
}

function isStyleFile(ext: string): boolean {
	return [".css", ".scss", ".sass", ".less", ".styl"].includes(ext);
}

function isAssetFile(ext: string): boolean {
	const assetExts = [
		".png",
		".jpg",
		".jpeg",
		".gif",
		".svg",
		".ico",
		".webp",
		".avif",
		".woff",
		".woff2",
		".ttf",
		".eot",
		".mp4",
		".webm",
		".wav",
		".mp3",
		".json", // Data files
		".xml",
		".csv",
	];

	return assetExts.includes(ext);
}

function isDocumentationFile(filename: string, ext: string): boolean {
	return (
		ext === ".md" ||
		ext === ".mdx" ||
		filename === "README" ||
		filename.startsWith("README.") ||
		filename === "CHANGELOG" ||
		filename === "LICENSE"
	);
}

function isHook(filename: string, ext: string): boolean {
	return [".ts", ".tsx", ".js", ".jsx"].includes(ext) && (filename.startsWith("use") || filename.includes(".hook."));
}

function isComponent(filename: string, ext: string, dir: string): boolean {
	if (![".tsx", ".jsx"].includes(ext)) {
		return false;
	}

	// Component naming conventions
	const isComponentName =
		/^[A-Z]/.test(filename) || // PascalCase
		filename.includes(".component.") ||
		dir.includes("/components/") ||
		dir.includes("/ui/");

	return isComponentName;
}

function isUtility(dir: string): boolean {
	return dir.includes("/utils/") || dir.includes("/helpers/") || dir.includes("/lib/") || dir.includes("/utilities/");
}

// =============================================================================
// CLASSIFICATION BUILDER
// =============================================================================

function createClassification(filePath: string, category: FileCategory, repoContext: RepoContext): FileClassification {
	return {
		category,
		baseRisk: RISK_SCORES[category],
		filePath,
		packageScope: findPackageScope(filePath, repoContext),
		// These will be populated by dependency graph analysis
		importedByCount: 0,
		importsCount: 0,
		isExported: false,
		exportCount: 0,
	};
}

/**
 * Find which workspace package a file belongs to
 */
export function findPackageScope(filePath: string, repoContext: RepoContext): string | null {
	if (repoContext.type === "single") {
		return null;
	}

	// Find the workspace that contains this file
	for (const workspace of repoContext.workspaces) {
		if (filePath.startsWith(workspace.path)) {
			return workspace.name;
		}
	}

	return null;
}
