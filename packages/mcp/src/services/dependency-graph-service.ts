/**
 * DependencyGraphService - Cached dependency analysis for token efficiency
 *
 * Uses madge (already installed) to build dependency graph.
 * Caches results to avoid repeated expensive analysis.
 *
 * Token savings: 2-3K tokens per exploration (vs multiple grep calls)
 *
 * @see CONTEXT_ENHANCEMENT_PLAN.md Feature 3
 * @module services/dependency-graph-service
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

// =============================================================================
// Types
// =============================================================================

/**
 * Internal graph representation
 */
interface DependencyGraph {
	nodes: Record<
		string,
		{
			imports: string[];
			importedBy: string[];
		}
	>;
	circular: string[][];
	cacheKey: string;
	generatedAt: number;
}

/**
 * Dependency context for files (exposed to begin_task)
 */
export interface DependencyContext {
	planned: Record<
		string,
		{
			imports: string[];
			importedBy: Array<{
				file: string;
				line: number;
			}>;
			depth: number;
			isOrphan: boolean;
		}
	>;
	circular: Array<{
		cycle: string[];
		severity: "warning" | "error";
	}>;
	suggestions: string[];
}

// =============================================================================
// DependencyGraphService
// =============================================================================

export class DependencyGraphService {
	private workspaceRoot: string;
	private cacheDir: string;
	private graph: DependencyGraph | null = null;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
		this.cacheDir = join(workspaceRoot, ".snapback", "analysis");
	}

	/**
	 * Get dependency context for planned files
	 * Main entry point for begin_task integration
	 */
	async getContextForFiles(files: string[]): Promise<DependencyContext> {
		const graph = await this.getGraph();

		const planned: DependencyContext["planned"] = {};
		const suggestions = new Set<string>();

		for (const file of files) {
			const relPath = this.toRelative(file);
			const node = graph.nodes[relPath];

			if (node) {
				planned[file] = {
					imports: node.imports,
					importedBy: node.importedBy.map((f) => ({ file: f, line: 0 })),
					depth: this.calculateDepth(relPath, graph),
					isOrphan: node.importedBy.length === 0 && !this.isEntryPoint(relPath),
				};

				// Suggest related files
				node.importedBy.slice(0, 3).forEach((f) => suggestions.add(f));
				node.imports.slice(0, 3).forEach((f) => suggestions.add(f));
			}
		}

		// Filter suggestions to exclude already planned files
		const relPlanned = files.map((f) => this.toRelative(f));
		const filteredSuggestions = [...suggestions].filter((s) => !relPlanned.includes(s)).slice(0, 5);

		return {
			planned,
			circular: graph.circular
				.filter((cycle) => files.some((f) => cycle.includes(this.toRelative(f))))
				.map((cycle) => ({ cycle, severity: "warning" as const })),
			suggestions: filteredSuggestions,
		};
	}

	/**
	 * Get files affected by changes to a file
	 * Useful for impact analysis
	 */
	async getAffectedBy(file: string): Promise<string[]> {
		const graph = await this.getGraph();
		const relPath = this.toRelative(file);
		const node = graph.nodes[relPath];
		return node?.importedBy || [];
	}

	/**
	 * Get files that a file depends on
	 */
	async getDependencies(file: string): Promise<string[]> {
		const graph = await this.getGraph();
		const relPath = this.toRelative(file);
		const node = graph.nodes[relPath];
		return node?.imports || [];
	}

	/**
	 * Get all circular dependencies
	 */
	async getCircularDependencies(): Promise<string[][]> {
		const graph = await this.getGraph();
		return graph.circular;
	}

	/**
	 * Force refresh the graph cache
	 */
	async refresh(): Promise<void> {
		this.graph = null;
		await this.getGraph();
	}

	/**
	 * Check if cache is valid
	 */
	async isCacheValid(): Promise<boolean> {
		const cachePath = join(this.cacheDir, "dependency-graph.json");
		if (!existsSync(cachePath)) return false;

		try {
			const cached = JSON.parse(readFileSync(cachePath, "utf8")) as DependencyGraph;
			const currentKey = await this.computeCacheKey();
			return cached.cacheKey === currentKey;
		} catch {
			return false;
		}
	}

	// =========================================================================
	// Private Methods
	// =========================================================================

	/**
	 * Get or build the dependency graph
	 */
	private async getGraph(): Promise<DependencyGraph> {
		// Return cached in-memory graph
		if (this.graph) {
			return this.graph;
		}

		const cachePath = join(this.cacheDir, "dependency-graph.json");
		const cacheKey = await this.computeCacheKey();

		// Check disk cache
		if (existsSync(cachePath)) {
			try {
				const cached = JSON.parse(readFileSync(cachePath, "utf8")) as DependencyGraph;
				if (cached.cacheKey === cacheKey) {
					this.graph = cached;
					return cached;
				}
			} catch {
				// Cache corrupted, rebuild
			}
		}

		// Rebuild graph
		const graph = await this.buildGraph();
		graph.cacheKey = cacheKey;
		graph.generatedAt = Date.now();

		// Write cache
		this.ensureCacheDir();
		writeFileSync(cachePath, JSON.stringify(graph, null, 2));

		this.graph = graph;
		return graph;
	}

	/**
	 * Build dependency graph using madge
	 */
	private async buildGraph(): Promise<DependencyGraph> {
		try {
			// Dynamic import madge (optional dependency)
			const madgeModule = await import("madge");
			const madge = madgeModule.default || madgeModule;

			const result = await madge(this.workspaceRoot, {
				fileExtensions: ["ts", "tsx", "js", "jsx"],
				excludeRegExp: [/node_modules/, /dist/, /\.next/, /coverage/, /__tests__/, /__mocks__/],
				detectiveOptions: { ts: { skipTypeImports: true } },
			});

			const deps = result.obj() as Record<string, string[]>;
			const circular = result.circular() as string[][];

			// Build reverse index (importedBy)
			const nodes: DependencyGraph["nodes"] = {};

			for (const [file, imports] of Object.entries(deps)) {
				if (!nodes[file]) nodes[file] = { imports: [], importedBy: [] };
				nodes[file].imports = imports;

				for (const imp of imports) {
					if (!nodes[imp]) nodes[imp] = { imports: [], importedBy: [] };
					nodes[imp].importedBy.push(file);
				}
			}

			return { nodes, circular, cacheKey: "", generatedAt: 0 };
		} catch (error) {
			// Madge not available or failed, return empty graph
			console.error("Failed to build dependency graph:", error);
			return { nodes: {}, circular: [], cacheKey: "", generatedAt: 0 };
		}
	}

	/**
	 * Compute cache key based on source file mtimes
	 */
	private async computeCacheKey(): Promise<string> {
		try {
			const glob = await import("glob");
			const files = await glob.glob(["**/*.{ts,tsx,js,jsx}"], {
				cwd: this.workspaceRoot,
				ignore: ["node_modules/**", "dist/**", ".next/**", "coverage/**"],
			});

			const hash = createHash("sha256");
			for (const file of files.sort()) {
				try {
					const stat = statSync(join(this.workspaceRoot, file));
					hash.update(`${file}:${stat.mtimeMs}`);
				} catch {
					// File may have been deleted
				}
			}

			return hash.digest("hex").substring(0, 16);
		} catch {
			// Fallback to timestamp-based key
			return Date.now().toString(36);
		}
	}

	/**
	 * Calculate max depth in import tree
	 */
	private calculateDepth(file: string, graph: DependencyGraph, visited = new Set<string>()): number {
		if (visited.has(file)) return 0;
		visited.add(file);

		const node = graph.nodes[file];
		if (!node || node.imports.length === 0) return 0;

		const depths = node.imports.map((i) => this.calculateDepth(i, graph, new Set(visited)));
		return 1 + Math.max(0, ...depths);
	}

	/**
	 * Check if file is an entry point (not expected to have importers)
	 */
	private isEntryPoint(file: string): boolean {
		return (
			file.includes("index.") ||
			file.includes("main.") ||
			file.includes("entry.") ||
			file.includes("server.") ||
			file.includes("app.") ||
			file.endsWith("/page.tsx") ||
			file.endsWith("/layout.tsx") ||
			file.endsWith("/route.ts")
		);
	}

	/**
	 * Convert absolute path to relative
	 */
	private toRelative(file: string): string {
		if (file.startsWith(this.workspaceRoot)) {
			return relative(this.workspaceRoot, file);
		}
		return file;
	}

	/**
	 * Ensure cache directory exists
	 */
	private ensureCacheDir(): void {
		if (!existsSync(this.cacheDir)) {
			mkdirSync(this.cacheDir, { recursive: true });
		}
	}
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create DependencyGraphService instance
 */
export function createDependencyGraphService(workspaceRoot: string): DependencyGraphService {
	return new DependencyGraphService(workspaceRoot);
}

// =============================================================================
// Singleton per workspace
// =============================================================================

const services = new Map<string, DependencyGraphService>();

/**
 * Get or create service for workspace (singleton pattern)
 */
export function getDependencyGraphService(workspaceRoot: string): DependencyGraphService {
	if (!services.has(workspaceRoot)) {
		services.set(workspaceRoot, new DependencyGraphService(workspaceRoot));
	}
	return services.get(workspaceRoot)!;
}
