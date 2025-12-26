/**
 * Layer 1.1: Repository Type Detection
 *
 * Detects workspace type (single repo, monorepo, turborepo) and analyzes structure.
 */

import { access, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { glob } from "glob";
import type { BuildTool, RepoContext, WorkspaceInfo, WorkspaceType } from "./types";

// =============================================================================
// MAIN DETECTION FUNCTION
// =============================================================================

/**
 * Detects repository type and analyzes structure
 */
export async function detectRepoType(workspaceRoot: string): Promise<RepoContext> {
	// Priority 1: Check for turbo.json (Turborepo)
	if (await fileExists(join(workspaceRoot, "turbo.json"))) {
		return await analyzeTurborepo(workspaceRoot);
	}

	// Priority 2: Check for pnpm-workspace.yaml
	if (await fileExists(join(workspaceRoot, "pnpm-workspace.yaml"))) {
		return await analyzeMonorepo(workspaceRoot, "pnpm");
	}

	// Priority 3: Check for lerna.json
	if (await fileExists(join(workspaceRoot, "lerna.json"))) {
		return await analyzeMonorepo(workspaceRoot, "lerna");
	}

	// Priority 4: Check for yarn/npm workspaces in package.json
	const pkgPath = join(workspaceRoot, "package.json");
	if (await fileExists(pkgPath)) {
		const pkg = await readJsonFile(pkgPath);
		if (pkg.workspaces) {
			return await analyzeMonorepo(workspaceRoot, "npm");
		}
	}

	// Default: Single repository
	return await analyzeSingleRepo(workspaceRoot);
}

// =============================================================================
// TURBOREPO ANALYSIS
// =============================================================================

async function analyzeTurborepo(root: string): Promise<RepoContext> {
	const workspaceGlobs = await getWorkspaceGlobs(root);
	const workspaces: WorkspaceInfo[] = [];

	// Find all workspace directories
	for (const pattern of workspaceGlobs) {
		const dirs = await glob(pattern, {
			cwd: root,
			absolute: false,
			nodir: false,
			ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
		});

		for (const dir of dirs) {
			const pkgPath = join(root, dir, "package.json");
			if (!(await fileExists(pkgPath))) continue;

			const pkg = await readJsonFile(pkgPath);
			workspaces.push({
				name: pkg.name || basename(dir),
				path: dir,
				type: inferWorkspaceType(dir, pkg),
				dependents: [], // Populated below
				dependencies: [], // Populated below
			});
		}
	}

	// Build dependency graph between workspaces
	await populateWorkspaceDependencies(workspaces, root);

	// Find entry points
	const entryPoints: string[] = [];
	for (const workspace of workspaces) {
		if (workspace.type === "app") {
			const workspaceEntries = await findEntryPoints(join(root, workspace.path));
			entryPoints.push(...workspaceEntries.map((e) => join(workspace.path, e)));
		}
	}

	return {
		type: "turborepo",
		rootPath: root,
		workspaces,
		entryPoints,
		buildTool: "turbopack",
	};
}

// =============================================================================
// MONOREPO ANALYSIS (pnpm, lerna, npm workspaces)
// =============================================================================

async function analyzeMonorepo(root: string, tool: "pnpm" | "lerna" | "npm"): Promise<RepoContext> {
	const workspaceGlobs = await getWorkspaceGlobs(root, tool);
	const workspaces: WorkspaceInfo[] = [];

	// Find all workspace directories
	for (const pattern of workspaceGlobs) {
		const dirs = await glob(pattern, {
			cwd: root,
			absolute: false,
			nodir: false,
			ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
		});

		for (const dir of dirs) {
			const pkgPath = join(root, dir, "package.json");
			if (!(await fileExists(pkgPath))) continue;

			const pkg = await readJsonFile(pkgPath);
			workspaces.push({
				name: pkg.name || basename(dir),
				path: dir,
				type: inferWorkspaceType(dir, pkg),
				dependents: [],
				dependencies: [],
			});
		}
	}

	// Build dependency graph
	await populateWorkspaceDependencies(workspaces, root);

	// Find entry points
	const entryPoints: string[] = [];
	for (const workspace of workspaces) {
		if (workspace.type === "app") {
			const workspaceEntries = await findEntryPoints(join(root, workspace.path));
			entryPoints.push(...workspaceEntries.map((e) => join(workspace.path, e)));
		}
	}

	// Detect build tool
	const buildTool = await detectBuildTool(root);

	return {
		type: "monorepo",
		rootPath: root,
		workspaces,
		entryPoints,
		buildTool,
	};
}

// =============================================================================
// SINGLE REPO ANALYSIS
// =============================================================================

async function analyzeSingleRepo(root: string): Promise<RepoContext> {
	const entryPoints = await findEntryPoints(root);
	const buildTool = await detectBuildTool(root);

	return {
		type: "single",
		rootPath: root,
		workspaces: [],
		entryPoints,
		buildTool,
	};
}

// =============================================================================
// WORKSPACE HELPERS
// =============================================================================

/**
 * Get workspace glob patterns from workspace configuration
 */
async function getWorkspaceGlobs(root: string, _tool?: "pnpm" | "lerna" | "npm"): Promise<string[]> {
	// Turborepo or pnpm-workspace.yaml
	const pnpmWorkspacePath = join(root, "pnpm-workspace.yaml");
	if (await fileExists(pnpmWorkspacePath)) {
		const content = await readFile(pnpmWorkspacePath, "utf-8");
		// Simple YAML parsing for packages array
		const match = content.match(/packages:\s*\n((?:\s+-\s+.+\n?)+)/);
		if (match) {
			return match[1]
				.split("\n")
				.map((line) => line.trim().replace(/^-\s+/, "").replace(/["']/g, ""))
				.filter(Boolean);
		}
	}

	// lerna.json
	const lernaPath = join(root, "lerna.json");
	if (await fileExists(lernaPath)) {
		const lerna = await readJsonFile(lernaPath);
		if (lerna.packages) {
			return lerna.packages;
		}
	}

	// package.json workspaces
	const pkgPath = join(root, "package.json");
	if (await fileExists(pkgPath)) {
		const pkg = await readJsonFile(pkgPath);
		if (Array.isArray(pkg.workspaces)) {
			return pkg.workspaces;
		}
		if (pkg.workspaces?.packages) {
			return pkg.workspaces.packages;
		}
	}

	// Default patterns
	return ["packages/*", "apps/*"];
}

/**
 * Infer workspace type from path and package.json
 */
function inferWorkspaceType(dir: string, pkg: any): WorkspaceType {
	// Check package.json fields
	if (pkg.private === false && pkg.main) return "package";
	if (pkg.private !== false && (pkg.scripts?.dev || pkg.scripts?.start)) return "app";

	// Check directory patterns
	if (dir.includes("/apps/") || dir.startsWith("apps/")) return "app";
	if (dir.includes("/packages/") || dir.startsWith("packages/")) return "package";
	if (dir.includes("/config/") || dir.startsWith("config/") || dir.includes("tooling")) return "config";

	// Default to package
	return "package";
}

/**
 * Build dependency graph between workspaces
 */
async function populateWorkspaceDependencies(workspaces: WorkspaceInfo[], root: string): Promise<void> {
	const workspaceByName = new Map(workspaces.map((w) => [w.name, w]));

	for (const workspace of workspaces) {
		const pkgPath = join(root, workspace.path, "package.json");
		const pkg = await readJsonFile(pkgPath);

		// Check all dependency types
		const allDeps = {
			...pkg.dependencies,
			...pkg.devDependencies,
			...pkg.peerDependencies,
		};

		for (const depName of Object.keys(allDeps)) {
			const depWorkspace = workspaceByName.get(depName);
			if (depWorkspace) {
				// workspace depends on depWorkspace
				workspace.dependencies.push(depName);
				// depWorkspace is depended on by workspace
				depWorkspace.dependents.push(workspace.name);
			}
		}
	}
}

// =============================================================================
// ENTRY POINT DETECTION
// =============================================================================

/**
 * Find entry point files in a directory
 */
async function findEntryPoints(dir: string): Promise<string[]> {
	const entryPoints: string[] = [];

	// Common entry point patterns
	const patterns = [
		"src/index.{ts,tsx,js,jsx}",
		"src/main.{ts,tsx,js,jsx}",
		"src/app.{ts,tsx,js,jsx}",
		"index.{ts,tsx,js,jsx}",
		"main.{ts,tsx,js,jsx}",
		// Next.js
		"src/app/page.{tsx,jsx}",
		"pages/_app.{tsx,jsx}",
		"app/page.{tsx,jsx}",
		// Vite/Remix
		"src/entry.client.{ts,tsx}",
		"app/entry.client.{tsx,jsx}",
	];

	for (const pattern of patterns) {
		const matches = await glob(pattern, {
			cwd: dir,
			absolute: false,
		});
		entryPoints.push(...matches);
	}

	// Check package.json main/module fields
	const pkgPath = join(dir, "package.json");
	if (await fileExists(pkgPath)) {
		const pkg = await readJsonFile(pkgPath);
		if (pkg.main) entryPoints.push(pkg.main);
		if (pkg.module) entryPoints.push(pkg.module);
		if (pkg.exports) {
			if (typeof pkg.exports === "string") {
				entryPoints.push(pkg.exports);
			} else if (pkg.exports["."]?.import) {
				entryPoints.push(pkg.exports["."].import);
			}
		}
	}

	// Deduplicate and normalize paths
	return [...new Set(entryPoints)].map((p) => p.replace(/^\.\//, ""));
}

// =============================================================================
// BUILD TOOL DETECTION
// =============================================================================

/**
 * Detect build tool from config files
 */
async function detectBuildTool(root: string): Promise<BuildTool> {
	const checks: Array<[string, BuildTool]> = [
		["vite.config.ts", "vite"],
		["vite.config.js", "vite"],
		["webpack.config.js", "webpack"],
		["webpack.config.ts", "webpack"],
		["rollup.config.js", "rollup"],
		["rollup.config.ts", "rollup"],
		["esbuild.config.js", "esbuild"],
		["turbo.json", "turbopack"],
	];

	for (const [file, tool] of checks) {
		if (await fileExists(join(root, file))) {
			return tool;
		}
	}

	return "none";
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function readJsonFile(path: string): Promise<any> {
	try {
		const content = await readFile(path, "utf-8");
		return JSON.parse(content);
	} catch {
		return {};
	}
}
