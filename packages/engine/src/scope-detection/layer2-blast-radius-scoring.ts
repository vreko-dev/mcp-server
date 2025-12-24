/**
 * Layer 2.1: Blast Radius Scoring
 *
 * Calculates blast radius score with logarithmic scaling and importer-type weighting.
 */

import { classifyFile } from "./layer1-file-classification";
import type { BlastRadiusResult, ConfigBlastRadius, DependencyNode, FileClassification, RepoContext } from "./types";
import { FileCategory as FileCategoryEnum } from "./types";

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate blast radius score (0-100)
 */
export function calculateBlastRadius(
	_fileClass: FileClassification,
	depNode: DependencyNode,
	repoContext: RepoContext,
	configRadius?: ConfigBlastRadius,
): BlastRadiusResult {
	const reasoning: string[] = [];

	// Config files use special handling
	if (configRadius) {
		const configScore = calculateConfigBlastRadiusScore(configRadius);
		reasoning.push(configRadius.reasoning);
		return { score: configScore, reasoning };
	}

	// Logarithmic scaling for import count (diminishing returns)
	// Formula: min(50, log10(count + 1) * 33)
	// 1 importer = 10, 10 importers = 33, 100 importers = 67, 1000 = 100 (capped at 50)
	const directImportScore = Math.min(50, Math.log10(depNode.importedBy.length + 1) * 33);

	// Weight importers by their type (entry points matter more)
	let importerTypeBonus = 0;
	for (const importer of depNode.importedBy) {
		const importerClass = classifyFile(importer, repoContext);

		if (importerClass.category === FileCategoryEnum.ENTRY_POINT) {
			importerTypeBonus += 15;
		} else if (importerClass.category === FileCategoryEnum.SHARED_EXPORT) {
			importerTypeBonus += 10;
		} else if (importerClass.category === FileCategoryEnum.TYPE_DEFINITION) {
			importerTypeBonus += 8;
		}
	}
	importerTypeBonus = Math.min(30, importerTypeBonus);

	// Cross-package imports are higher risk (monorepo)
	const crossPkgScore = Math.min(20, depNode.crossPackageImports.length * 10);

	// Transitive depth adds some risk
	const transitiveScore = Math.min(15, depNode.transitiveImporters.depth2.length * 2);

	// Total score
	const totalScore = Math.min(100, directImportScore + importerTypeBonus + crossPkgScore + transitiveScore);

	// Build reasoning
	if (directImportScore > 30) {
		reasoning.push(`High direct importer count: ${depNode.importedBy.length} files`);
	}

	if (importerTypeBonus > 10) {
		const criticalImporters = depNode.importedBy.filter((imp) => {
			const cat = classifyFile(imp, repoContext).category;
			return cat === FileCategoryEnum.ENTRY_POINT || cat === FileCategoryEnum.SHARED_EXPORT;
		});
		reasoning.push(`Imported by ${criticalImporters.length} critical-path files`);
	}

	if (crossPkgScore > 0) {
		reasoning.push(`Cross-package imports: ${depNode.crossPackageImports.length} packages`);
	}

	if (transitiveScore > 5) {
		reasoning.push(`Transitive blast radius: ${depNode.transitiveImporters.depth2.length} depth-2 importers`);
	}

	if (reasoning.length === 0) {
		if (depNode.importedBy.length === 0) {
			reasoning.push("No importers - isolated file");
		} else {
			reasoning.push(`${depNode.importedBy.length} direct importers`);
		}
	}

	return { score: totalScore, reasoning };
}

// =============================================================================
// CONFIG BLAST RADIUS SCORING
// =============================================================================

/**
 * Calculate score for config file blast radius
 */
function calculateConfigBlastRadiusScore(configRadius: ConfigBlastRadius): number {
	switch (configRadius.scope) {
		case "workspace":
			// Workspace-wide config affects everything
			return 95;

		case "extends-chain":
			// Base config extended by others
			// Score increases with number of affected packages
			return Math.min(95, 80 + configRadius.affectedPackages.length * 3);

		case "package":
			// Package-level config
			// Score increases with dependents
			return Math.min(90, 60 + configRadius.affectedPackages.length * 5);

		case "env-consumers":
			// Environment files affect consumers
			// Score based on number of consuming files
			return Math.min(85, 40 + configRadius.affectedFiles.length * 2);

		case "file":
			// File-level config (low impact)
			return 20;

		default:
			return 50;
	}
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get blast radius statistics
 */
export function getBlastRadiusStats(depNode: DependencyNode): {
	direct: number;
	depth2: number;
	depth3Plus: number;
	crossPackage: number;
	total: number;
} {
	const direct = depNode.importedBy.length;
	const depth2 = depNode.transitiveImporters.depth2.length;
	const depth3Plus = depNode.transitiveImporters.depth3Plus.length;
	const crossPackage = depNode.crossPackageImports.length;

	return {
		direct,
		depth2,
		depth3Plus,
		crossPackage,
		total: direct + depth2 + depth3Plus,
	};
}

/**
 * Categorize blast radius level
 */
export function categorizeBlastRadius(score: number): {
	level: "minimal" | "low" | "medium" | "high" | "critical";
	description: string;
} {
	if (score >= 90) {
		return {
			level: "critical",
			description: "Affects majority of codebase",
		};
	}

	if (score >= 70) {
		return {
			level: "high",
			description: "Affects multiple critical paths",
		};
	}

	if (score >= 50) {
		return {
			level: "medium",
			description: "Affects several files/modules",
		};
	}

	if (score >= 25) {
		return {
			level: "low",
			description: "Affects few files",
		};
	}

	return {
		level: "minimal",
		description: "Isolated change",
	};
}
