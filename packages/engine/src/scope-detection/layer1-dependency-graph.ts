/**
 * Layer 1.3: Dependency Graph Analysis
 *
 * Uses madge to build and cache dependency graphs with transitive analysis.
 */

import { join } from "node:path";
import madge from "madge";
import { findPackageScope } from "./layer1-file-classification";
import type { DependencyGraph, DependencyNode, RepoContext } from "./types";

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

interface CachedGraph {
	graph: DependencyGraph;
	computedAt: number;
}

const depGraphCache = new Map<string, CachedGraph>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear dependency graph cache
 */
export function clearDependencyGraphCache(): void {
	depGraphCache.clear();
}

// =============================================================================
// MAIN GRAPH BUILDING
// =============================================================================

/**
 * Get dependency graph for a workspace (with caching)
 */
export async function getDependencyGraph(workspaceRoot: string, repoContext: RepoContext): Promise<DependencyGraph> {
	// Check cache
	const cached = depGraphCache.get(workspaceRoot);
	if (cached && Date.now() - cached.computedAt < CACHE_TTL) {
		return cached.graph;
	}

	// Build new graph
	const graph = await buildDependencyGraph(workspaceRoot, repoContext);

	// Cache it
	depGraphCache.set(workspaceRoot, {
		graph,
		computedAt: Date.now(),
	});

	return graph;
}

/**
 * Build dependency graph using madge
 */
async function buildDependencyGraph(workspaceRoot: string, repoContext: RepoContext): Promise<DependencyGraph> {
	// Find tsconfig.json for TypeScript resolution
	const tsconfigPath = join(workspaceRoot, "tsconfig.json");

	// Run madge analysis
	const result = await madge(workspaceRoot, {
		fileExtensions: ["ts", "tsx", "js", "jsx"],
		excludeRegExp: [/node_modules/, /\.test\./, /\.spec\./, /dist/, /build/, /__tests__/],
		tsConfig: tsconfigPath,
		// Include all files, not just circular dependencies
		includeNpm: false,
	});

	// Extract dependency object from madge
	const deps: Record<string, string[]> = result.obj();

	return buildGraphFromMadgeResult(deps, repoContext);
}

/**
 * Build internal graph structure from madge result
 */
function buildGraphFromMadgeResult(deps: Record<string, string[]>, repoContext: RepoContext): DependencyGraph {
	const nodes = new Map<string, DependencyNode>();
	const edges = new Map<string, Set<string>>();
	const reverseEdges = new Map<string, Set<string>>();

	// Build forward and reverse edges
	for (const [file, imports] of Object.entries(deps)) {
		// Normalize path
		const normalizedFile = normalizePath(file);

		// Create edge set
		edges.set(normalizedFile, new Set(imports.map(normalizePath)));

		// Build reverse edges
		for (const imported of imports) {
			const normalizedImported = normalizePath(imported);
			if (!reverseEdges.has(normalizedImported)) {
				reverseEdges.set(normalizedImported, new Set());
			}
			reverseEdges.get(normalizedImported)!.add(normalizedFile);
		}
	}

	// Build nodes with transitive analysis
	for (const file of edges.keys()) {
		const imports = [...(edges.get(file) ?? [])];
		const importedBy = [...(reverseEdges.get(file) ?? new Set())];

		// Calculate transitive importers
		const transitiveImporters = calculateTransitiveImporters(file, reverseEdges);

		// Identify cross-package imports
		const crossPackageImports = identifyCrossPackageImports(file, imports, repoContext);

		nodes.set(file, {
			filePath: file,
			imports,
			importedBy,
			transitiveImporters,
			crossPackageImports,
		});
	}

	return {
		nodes,
		edges,
		reverseEdges,
	};
}

// =============================================================================
// TRANSITIVE ANALYSIS
// =============================================================================

/**
 * Calculate transitive importers up to depth 3
 */
function calculateTransitiveImporters(
	file: string,
	reverseEdges: Map<string, Set<string>>,
): DependencyNode["transitiveImporters"] {
	const depth1 = [...(reverseEdges.get(file) ?? new Set())];

	// Depth 2: importers of importers
	const depth2Set = new Set<string>();
	for (const d1 of depth1) {
		const d1Importers = reverseEdges.get(d1) ?? new Set();
		for (const d2 of d1Importers) {
			// Exclude original file and depth1 files
			if (d2 !== file && !depth1.includes(d2)) {
				depth2Set.add(d2);
			}
		}
	}

	// Depth 3+: importers of depth2 importers
	const depth3Set = new Set<string>();
	for (const d2 of depth2Set) {
		const d2Importers = reverseEdges.get(d2) ?? new Set();
		for (const d3 of d2Importers) {
			// Exclude file, depth1, and depth2
			if (d3 !== file && !depth1.includes(d3) && !depth2Set.has(d3)) {
				depth3Set.add(d3);
			}
		}
	}

	return {
		depth1,
		depth2: [...depth2Set],
		depth3Plus: [...depth3Set],
	};
}

/**
 * Identify imports that cross package boundaries (monorepo)
 */
function identifyCrossPackageImports(file: string, imports: string[], repoContext: RepoContext): string[] {
	if (repoContext.type === "single") {
		return [];
	}

	const filePackage = findPackageScope(file, repoContext);
	if (!filePackage) {
		return [];
	}

	const crossPackage: string[] = [];

	for (const imported of imports) {
		const importedPackage = findPackageScope(imported, repoContext);
		if (importedPackage && importedPackage !== filePackage) {
			crossPackage.push(imported);
		}
	}

	return crossPackage;
}

// =============================================================================
// GRAPH QUERIES
// =============================================================================

/**
 * Get dependency node for a file
 */
export function getNodeForFile(filePath: string, graph: DependencyGraph): DependencyNode | undefined {
	const normalized = normalizePath(filePath);
	return graph.nodes.get(normalized);
}

/**
 * Check if two files are connected in the dependency graph
 */
export function areFilesConnected(file1: string, file2: string, graph: DependencyGraph): boolean {
	const norm1 = normalizePath(file1);
	const norm2 = normalizePath(file2);

	// Check if file1 imports file2
	const file1Imports = graph.edges.get(norm1);
	if (file1Imports?.has(norm2)) {
		return true;
	}

	// Check if file2 imports file1
	const file2Imports = graph.edges.get(norm2);
	if (file2Imports?.has(norm1)) {
		return true;
	}

	// Check if they share importers (both imported by same file)
	const file1ImportedBy = graph.reverseEdges.get(norm1) ?? new Set();
	const file2ImportedBy = graph.reverseEdges.get(norm2) ?? new Set();

	for (const importer of file1ImportedBy) {
		if (file2ImportedBy.has(importer)) {
			return true;
		}
	}

	return false;
}

/**
 * Get all files that import a given file (transitive)
 */
export function getAllImporters(filePath: string, graph: DependencyGraph, maxDepth = 10): Set<string> {
	const normalized = normalizePath(filePath);
	const importers = new Set<string>();
	const visited = new Set<string>();
	const queue: Array<{ file: string; depth: number }> = [{ file: normalized, depth: 0 }];

	while (queue.length > 0) {
		const { file, depth } = queue.shift()!;

		if (visited.has(file) || depth >= maxDepth) {
			continue;
		}

		visited.add(file);

		const fileImporters = graph.reverseEdges.get(file) ?? new Set();
		for (const importer of fileImporters) {
			if (importer !== normalized) {
				importers.add(importer);
				queue.push({ file: importer, depth: depth + 1 });
			}
		}
	}

	return importers;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Normalize file path (remove leading ./, make consistent)
 */
function normalizePath(path: string): string {
	return path.replace(/^\.\//, "").replace(/\\/g, "/");
}

/**
 * Get graph statistics
 */
export function getGraphStats(graph: DependencyGraph): {
	totalFiles: number;
	totalEdges: number;
	avgImportsPerFile: number;
	maxImporters: number;
} {
	const totalFiles = graph.nodes.size;
	let totalEdges = 0;
	let maxImporters = 0;

	for (const node of graph.nodes.values()) {
		totalEdges += node.imports.length;
		maxImporters = Math.max(maxImporters, node.importedBy.length);
	}

	return {
		totalFiles,
		totalEdges,
		avgImportsPerFile: totalFiles > 0 ? totalEdges / totalFiles : 0,
		maxImporters,
	};
}
