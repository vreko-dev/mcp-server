/**
 * Layer 1.4: Critical Path Distance Calculation
 *
 * Calculates how close a file is to entry points using BFS.
 */

import type { CriticalPathAnalysis, DependencyGraph } from "./types";

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate critical path distance from file to entry points
 */
export function calculateCriticalPathDistance(
	filePath: string,
	depGraph: DependencyGraph,
	entryPoints: string[],
): CriticalPathAnalysis {
	const normalizedFile = normalizePath(filePath);
	const normalizedEntries = entryPoints.map(normalizePath);

	let minDistance = Number.POSITIVE_INFINITY;
	const entryPointsReached: string[] = [];

	// BFS from the file to find distance to each entry point
	for (const entry of normalizedEntries) {
		// Try forward direction (file → entry)
		const forwardDistance = bfsDistance(normalizedFile, entry, depGraph, "forward");

		// Try reverse direction (entry → file, meaning entry imports the file)
		const reverseDistance = bfsDistance(entry, normalizedFile, depGraph, "forward");

		// Use the shorter distance
		const distance = Math.min(
			forwardDistance !== -1 ? forwardDistance : Number.POSITIVE_INFINITY,
			reverseDistance !== -1 ? reverseDistance : Number.POSITIVE_INFINITY,
		);

		if (distance !== Number.POSITIVE_INFINITY) {
			entryPointsReached.push(entry);
			minDistance = Math.min(minDistance, distance);
		}
	}

	const distance = minDistance === Number.POSITIVE_INFINITY ? -1 : minDistance;

	// Calculate score based on distance (closer = higher risk)
	const criticalPathScore = calculateCriticalPathScore(distance);
	const isOnCriticalPath = distance >= 0 && distance <= 2;

	return {
		distanceToNearestEntry: distance,
		entryPointsReached,
		isOnCriticalPath,
		criticalPathScore,
	};
}

// =============================================================================
// BFS ALGORITHM
// =============================================================================

/**
 * BFS to find shortest path distance between two files
 */
function bfsDistance(from: string, to: string, depGraph: DependencyGraph, direction: "forward" | "reverse"): number {
	if (from === to) return 0;

	const visited = new Set<string>();
	const queue: Array<{ file: string; depth: number }> = [{ file: from, depth: 0 }];

	while (queue.length > 0) {
		const { file, depth } = queue.shift()!;

		if (visited.has(file)) continue;
		visited.add(file);

		// Get neighbors based on direction
		const neighbors = getNeighbors(file, depGraph, direction);

		for (const neighbor of neighbors) {
			if (neighbor === to) {
				return depth + 1;
			}

			if (!visited.has(neighbor)) {
				queue.push({ file: neighbor, depth: depth + 1 });
			}
		}
	}

	return -1; // Not reachable
}

/**
 * Get neighbor files based on direction
 */
function getNeighbors(file: string, depGraph: DependencyGraph, direction: "forward" | "reverse"): string[] {
	const node = depGraph.nodes.get(file);
	if (!node) return [];

	// Forward: files that this file imports
	if (direction === "forward") {
		return node.imports;
	}

	// Reverse: files that import this file
	return node.importedBy;
}

// =============================================================================
// SCORING
// =============================================================================

/**
 * Calculate critical path score (0-100) based on distance
 */
function calculateCriticalPathScore(distance: number): number {
	if (distance === -1) {
		// Orphan file - not connected to any entry point
		return 10;
	}

	if (distance === 0) {
		// IS an entry point
		return 100;
	}

	if (distance === 1) {
		// Direct import by entry point
		return 80;
	}

	if (distance === 2) {
		// 2 hops from entry
		return 60;
	}

	if (distance <= 4) {
		// 3-4 hops
		return 40;
	}

	if (distance <= 6) {
		// 5-6 hops
		return 25;
	}

	// Far from entry points
	return 15;
}

// =============================================================================
// ENTRY POINT IDENTIFICATION
// =============================================================================

/**
 * Identify entry point files in the dependency graph
 * (files that are not imported by anything else)
 */
export function identifyEntryPoints(depGraph: DependencyGraph): string[] {
	const entryPoints: string[] = [];

	for (const [file, node] of depGraph.nodes) {
		// Entry points have no importers (or very few)
		if (node.importedBy.length === 0) {
			entryPoints.push(file);
		}
	}

	return entryPoints;
}

/**
 * Check if a file is an entry point
 */
export function isFileEntryPoint(filePath: string, depGraph: DependencyGraph): boolean {
	const normalized = normalizePath(filePath);
	const node = depGraph.nodes.get(normalized);

	if (!node) return false;

	return node.importedBy.length === 0;
}

// =============================================================================
// UTILITIES
// =============================================================================

function normalizePath(path: string): string {
	return path.replace(/^\.\//, "").replace(/\\/g, "/");
}

/**
 * Get all files within N hops of a target file
 */
export function getFilesWithinDistance(filePath: string, maxDistance: number, depGraph: DependencyGraph): Set<string> {
	const normalized = normalizePath(filePath);
	const reachable = new Set<string>();
	const visited = new Set<string>();
	const queue: Array<{ file: string; depth: number }> = [{ file: normalized, depth: 0 }];

	while (queue.length > 0) {
		const { file, depth } = queue.shift()!;

		if (visited.has(file) || depth > maxDistance) continue;
		visited.add(file);

		if (file !== normalized && depth <= maxDistance) {
			reachable.add(file);
		}

		const node = depGraph.nodes.get(file);
		if (!node) continue;

		// Add both imports and importers
		for (const neighbor of [...node.imports, ...node.importedBy]) {
			if (!visited.has(neighbor)) {
				queue.push({ file: neighbor, depth: depth + 1 });
			}
		}
	}

	return reachable;
}
