/**
 * Layer 2.3: Session Coherence Calculation
 *
 * Analyzes how well files changed in a session relate to each other.
 */

import { dirname } from "node:path";
import { areFilesConnected } from "./layer1-dependency-graph";
import { classifyFile, findPackageScope } from "./layer1-file-classification";
import type { CoherenceLevel, DependencyGraph, RepoContext, SessionCoherenceResult, SessionContext } from "./types";

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate session coherence score (0-100)
 * Higher score = more coherent = safer to snapshot together
 */
export function calculateSessionCoherence(
	_changedFile: string,
	session: SessionContext,
	depGraph: DependencyGraph,
	repoContext: RepoContext,
): SessionCoherenceResult {
	const reasoning: string[] = [];
	const sessionFiles = session.files.map((f) => f.path);

	// Single file session - perfect coherence
	if (sessionFiles.length <= 1) {
		return {
			score: 100,
			level: "high",
			reasoning: ["Single file session - perfect coherence"],
		};
	}

	// Calculate coherence factors
	const packageCoherence = calculatePackageCoherence(sessionFiles, repoContext, reasoning);
	const directoryCoherence = calculateDirectoryCoherence(sessionFiles, reasoning);
	const graphCoherence = calculateGraphCoherence(sessionFiles, depGraph, reasoning);
	const categoryCoherence = calculateCategoryCoherence(sessionFiles, repoContext, reasoning);

	// Weighted combination
	const totalScore = Math.round(
		packageCoherence * 0.3 + directoryCoherence * 0.25 + graphCoherence * 0.3 + categoryCoherence * 0.15,
	);

	// Determine level
	const level = getCoherenceLevel(totalScore);

	return {
		score: totalScore,
		level,
		reasoning,
	};
}

// =============================================================================
// COHERENCE FACTORS
// =============================================================================

/**
 * Package coherence - are files in the same package? (monorepo)
 */
function calculatePackageCoherence(files: string[], repoContext: RepoContext, reasoning: string[]): number {
	if (repoContext.type === "single") {
		// Single repo - all files in same "package"
		return 100;
	}

	const packages = new Set(files.map((f) => findPackageScope(f, repoContext)));

	const score = Math.max(0, 100 - (packages.size - 1) * 20);

	if (packages.size > 1) {
		reasoning.push(`Files span ${packages.size} workspace packages`);
	}

	return score;
}

/**
 * Directory coherence - are files in related directories?
 */
function calculateDirectoryCoherence(files: string[], reasoning: string[]): number {
	const dirs = files.map((f) => dirname(f));

	// Find common prefix
	const commonPrefix = findCommonPrefix(dirs);
	const commonDepth = commonPrefix.split("/").filter(Boolean).length;

	// Calculate average directory depth
	const avgDepth = dirs.reduce((sum, d) => sum + d.split("/").filter(Boolean).length, 0) / dirs.length;

	// Score based on how much of the path is shared
	const score = Math.min(100, (commonDepth / avgDepth) * 100);

	if (score < 50) {
		reasoning.push("Files scattered across different directory trees");
	} else if (score > 80) {
		reasoning.push(`Files clustered in ${commonPrefix || "same area"}`);
	}

	return score;
}

/**
 * Graph coherence - are files connected in dependency graph?
 */
function calculateGraphCoherence(files: string[], depGraph: DependencyGraph, reasoning: string[]): number {
	if (files.length < 2) return 100;

	let connections = 0;
	let totalPairs = 0;

	// Check all pairs
	for (let i = 0; i < files.length; i++) {
		for (let j = i + 1; j < files.length; j++) {
			totalPairs++;
			if (areFilesConnected(files[i], files[j], depGraph)) {
				connections++;
			}
		}
	}

	const score = totalPairs > 0 ? (connections / totalPairs) * 100 : 0;

	if (score > 70) {
		reasoning.push(`${connections}/${totalPairs} file pairs are dependency-connected`);
	} else if (score < 30) {
		reasoning.push("Files not closely connected in dependency graph");
	}

	return score;
}

/**
 * Category coherence - are files of similar types?
 */
function calculateCategoryCoherence(files: string[], repoContext: RepoContext, reasoning: string[]): number {
	const categories = new Set(files.map((f) => classifyFile(f, repoContext).category));

	const score = Math.max(0, 100 - (categories.size - 1) * 15);

	if (categories.size === 1) {
		reasoning.push("All files same category");
	} else if (categories.size > 3) {
		reasoning.push(`Files span ${categories.size} different categories`);
	}

	return score;
}

// =============================================================================
// COHERENCE LEVEL MAPPING
// =============================================================================

/**
 * Map score to coherence level
 */
function getCoherenceLevel(score: number): CoherenceLevel {
	if (score >= 80) return "high";
	if (score >= 60) return "medium";
	if (score >= 40) return "low";
	return "scattered";
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Find common prefix of paths
 */
function findCommonPrefix(paths: string[]): string {
	if (paths.length === 0) return "";
	if (paths.length === 1) return dirname(paths[0]);

	const segments = paths.map((p) => p.split("/"));
	const minLength = Math.min(...segments.map((s) => s.length));

	const common: string[] = [];

	for (let i = 0; i < minLength; i++) {
		const segment = segments[0][i];
		if (segments.every((s) => s[i] === segment)) {
			common.push(segment);
		} else {
			break;
		}
	}

	return common.join("/");
}

/**
 * Get session coherence statistics
 */
export function getSessionCoherenceStats(
	session: SessionContext,
	repoContext: RepoContext,
): {
	fileCount: number;
	categoryCount: number;
	packageCount: number;
	avgChangeCount: number;
} {
	const categories = new Set(session.files.map((f) => classifyFile(f.path, repoContext).category));
	const packages = new Set(session.files.map((f) => findPackageScope(f.path, repoContext)));
	const avgChangeCount = session.files.reduce((sum, f) => sum + f.changeCount, 0) / session.files.length;

	return {
		fileCount: session.files.length,
		categoryCount: categories.size,
		packageCount: packages.size,
		avgChangeCount,
	};
}
