/**
 * Layer 2.5: Score Calculation & Layer 2.6: Strategy Mapping
 *
 * Orchestrates all scoring factors and maps scores to snapshot strategies.
 */

import { calculateAiToolRisk } from "./layer2-ai-tool-risk";
import { calculateBlastRadius } from "./layer2-blast-radius-scoring";
import { calculateSessionCoherence } from "./layer2-session-coherence";
import { calculateTemporalRisk } from "./layer2-temporal-risk";
import type {
	ScopeDecision,
	ScoringInput,
	ScoringOutput,
	ScoringWeights,
	SnapshotFidelity,
	SnapshotStrategy,
} from "./types";
import { DEFAULT_WEIGHTS, STRATEGY_THRESHOLDS, SnapshotStrategy as StrategyEnum } from "./types";

// =============================================================================
// SCORE CALCULATION
// =============================================================================

/**
 * Calculate weighted score from all factors
 */
export function calculateScore(input: ScoringInput, weights: ScoringWeights = DEFAULT_WEIGHTS): ScoringOutput {
	// Factor 1: Category Risk (from file classification)
	const categoryRiskRaw = input.fileClassification.baseRisk;
	const categoryRiskScore = categoryRiskRaw;

	// Factor 2: Blast Radius
	const blastRadiusResult = calculateBlastRadius(
		input.fileClassification,
		input.dependencyContext,
		input.repoContext,
		input.configBlastRadius,
	);

	// Factor 3: AI Tool Risk
	const aiToolRiskResult = calculateAiToolRisk(input.aiDetection, input.fileClassification.category);

	// Factor 4: Change Magnitude
	const changeMagnitudeRaw = calculateChangeMagnitude(input.changeMetrics);
	const changeMagnitudeScore = changeMagnitudeRaw;

	// Factor 5: Session Coherence (inverted - high coherence = low risk)
	const sessionCoherenceResult = calculateSessionCoherence(
		input.fileClassification.filePath,
		input.session,
		input.dependencyGraph, // Use full graph for connectivity analysis
		input.repoContext,
	);
	const sessionCoherenceScore = 100 - sessionCoherenceResult.score; // Invert: high coherence = low risk score

	// Factor 6: Temporal Risk
	const temporalRiskResult = calculateTemporalRisk(input.temporal);

	// Factor 7: Critical Path
	const criticalPathScore = input.criticalPath.criticalPathScore;

	// Weighted combination
	const totalScore = Math.min(
		100,
		Math.max(
			0,
			categoryRiskScore * weights.categoryRisk +
				blastRadiusResult.score * weights.blastRadius +
				aiToolRiskResult.score * weights.aiToolRisk +
				changeMagnitudeScore * weights.changeMagnitude +
				sessionCoherenceScore * weights.sessionCoherence +
				temporalRiskResult.score * weights.temporalRisk +
				criticalPathScore * weights.criticalPath,
		),
	);

	// Compile reasoning
	const reasoning = [
		...blastRadiusResult.reasoning,
		...aiToolRiskResult.reasoning,
		...sessionCoherenceResult.reasoning,
		...temporalRiskResult.reasoning,
	];

	// Calculate confidence
	const confidence = calculateConfidence(input);

	return {
		totalScore,
		factors: {
			categoryRisk: {
				score: categoryRiskScore,
				weight: weights.categoryRisk,
				raw: categoryRiskRaw,
			},
			blastRadius: {
				score: blastRadiusResult.score,
				weight: weights.blastRadius,
				raw: blastRadiusResult.score,
			},
			aiToolRisk: {
				score: aiToolRiskResult.score,
				weight: weights.aiToolRisk,
				raw: aiToolRiskResult.score,
			},
			changeMagnitude: {
				score: changeMagnitudeScore,
				weight: weights.changeMagnitude,
				raw: changeMagnitudeRaw,
			},
			sessionCoherence: {
				score: sessionCoherenceScore,
				weight: weights.sessionCoherence,
				raw: sessionCoherenceResult.score,
			},
			temporalRisk: {
				score: temporalRiskResult.score,
				weight: weights.temporalRisk,
				raw: temporalRiskResult.score,
			},
			criticalPath: {
				score: criticalPathScore,
				weight: weights.criticalPath,
				raw: criticalPathScore,
			},
		},
		reasoning,
		confidence,
	};
}

// Note: Removed calculateSimplifiedSessionCoherence - now using full implementation
// from layer2-session-coherence.ts with dependency graph connectivity analysis

// =============================================================================
// CHANGE MAGNITUDE CALCULATION
// =============================================================================

/**
 * Calculate change magnitude score based on lines changed
 */
function calculateChangeMagnitude(metrics: ScoringInput["changeMetrics"]): number {
	const totalLines = metrics.linesAdded + metrics.linesDeleted + metrics.linesModified;

	// Logarithmic scaling
	let score = Math.min(100, 20 + Math.log10(totalLines + 1) * 30);

	// Structural changes add risk
	if (metrics.isStructuralChange) {
		score = Math.min(100, score + 20);
	}

	return score;
}

// =============================================================================
// CONFIDENCE CALCULATION
// =============================================================================

/**
 * Calculate confidence in the score (0-1)
 */
function calculateConfidence(input: ScoringInput): number {
	let confidence = 1.0;

	// Reduce confidence if AI detection is uncertain
	if (input.aiDetection.detected && input.aiDetection.confidence < 0.8) {
		confidence *= 0.9;
	}

	// Reduce confidence if dependency graph is incomplete
	if (input.dependencyContext.imports.length === 0 && input.dependencyContext.importedBy.length === 0) {
		confidence *= 0.85;
	}

	// Reduce confidence for very new sessions (< 5 min)
	const sessionAge = Date.now() - input.session.startedAt;
	if (sessionAge < 5 * 60 * 1000) {
		confidence *= 0.9;
	}

	return Math.max(0.5, confidence); // Min 50% confidence
}

// =============================================================================
// STRATEGY MAPPING
// =============================================================================

/**
 * Map score to snapshot strategy
 */
export function mapScoreToStrategy(
	score: ScoringOutput,
	fileClass: ScoringInput["fileClassification"],
	repoContext: ScoringInput["repoContext"],
	depGraph: ScoringInput["dependencyContext"],
): ScopeDecision {
	const totalScore = score.totalScore;

	// Determine strategy based on score thresholds
	let strategy: SnapshotStrategy;
	let fidelity: SnapshotFidelity;
	const reasoning: string[] = [...score.reasoning];

	if (totalScore < STRATEGY_THRESHOLDS.singleFile) {
		strategy = StrategyEnum.SINGLE_FILE;
		fidelity = "diff-only";
		reasoning.push(`Low risk (${Math.round(totalScore)}) - single file`);
	} else if (totalScore < STRATEGY_THRESHOLDS.directDependents) {
		strategy = StrategyEnum.DIRECT_DEPENDENTS;
		fidelity = "diff-only";
		reasoning.push(`Moderate risk (${Math.round(totalScore)}) - with dependents`);
	} else if (totalScore < STRATEGY_THRESHOLDS.transitive) {
		strategy = StrategyEnum.TRANSITIVE_CLUSTER;
		fidelity = "full";
		reasoning.push(`Higher risk (${Math.round(totalScore)}) - transitive cluster`);
	} else if (totalScore < STRATEGY_THRESHOLDS.module) {
		strategy = StrategyEnum.MODULE_SCOPE;
		fidelity = "full";
		reasoning.push(`High risk (${Math.round(totalScore)}) - module scope`);
	} else if (totalScore < STRATEGY_THRESHOLDS.package) {
		strategy = StrategyEnum.PACKAGE_SCOPE;
		fidelity = "full";
		reasoning.push(`Very high risk (${Math.round(totalScore)}) - package scope`);
	} else {
		strategy = StrategyEnum.SESSION_SCOPE;
		fidelity = "full";
		reasoning.push(`Critical risk (${Math.round(totalScore)}) - session scope`);
	}

	// Determine files to include
	const filesToInclude = getFilesToInclude(strategy, fileClass, depGraph, repoContext);

	// Generate suggested name
	const suggestedName = generateSnapshotName(strategy, fileClass, filesToInclude);

	return {
		strategy,
		filesToInclude,
		fidelity,
		reasoning,
		confidence: score.confidence,
		suggestedName,
	};
}

// =============================================================================
// FILE COLLECTION BY STRATEGY
// =============================================================================

function getFilesToInclude(
	strategy: SnapshotStrategy,
	fileClass: ScoringInput["fileClassification"],
	depNode: ScoringInput["dependencyContext"],
	_repoContext: ScoringInput["repoContext"],
): string[] {
	const files = new Set<string>();
	files.add(fileClass.filePath);

	switch (strategy) {
		case StrategyEnum.SINGLE_FILE:
			break;
		case StrategyEnum.DIRECT_DEPENDENTS:
			depNode.importedBy.forEach((f) => files.add(f));
			break;
		case StrategyEnum.TRANSITIVE_CLUSTER:
			depNode.importedBy.forEach((f) => files.add(f));
			depNode.transitiveImporters.depth2.forEach((f) => files.add(f));
			break;
		case StrategyEnum.MODULE_SCOPE:
		case StrategyEnum.PACKAGE_SCOPE:
			depNode.importedBy.forEach((f) => files.add(f));
			depNode.transitiveImporters.depth2.forEach((f) => files.add(f));
			depNode.transitiveImporters.depth3Plus.forEach((f) => files.add(f));
			break;
		case StrategyEnum.SESSION_SCOPE:
			// Collected from session context by caller
			break;
	}

	return [...files];
}

// =============================================================================
// SNAPSHOT NAMING
// =============================================================================

function generateSnapshotName(
	strategy: SnapshotStrategy,
	fileClass: ScoringInput["fileClassification"],
	files: string[],
): string {
	const timestamp = new Date().toISOString().split("T")[0];
	const fileName =
		fileClass.filePath
			.split("/")
			.pop()
			?.replace(/\.[^.]+$/, "") || "file";

	switch (strategy) {
		case StrategyEnum.SINGLE_FILE:
			return `${fileName}-${timestamp}`;
		case StrategyEnum.DIRECT_DEPENDENTS:
			return `${fileName}-deps-${timestamp}`;
		case StrategyEnum.TRANSITIVE_CLUSTER:
			return `${fileName}-cluster-${timestamp}`;
		case StrategyEnum.MODULE_SCOPE:
			return `module-${fileName}-${timestamp}`;
		case StrategyEnum.PACKAGE_SCOPE:
			return `pkg-${fileClass.packageScope || "unknown"}-${timestamp}`;
		case StrategyEnum.SESSION_SCOPE:
			return `session-${files.length}files-${timestamp}`;
		default:
			return `snapshot-${timestamp}`;
	}
}
