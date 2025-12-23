/**
 * Scoring Module
 *
 * Computes composite scores for artifact candidates.
 * Scores are quantized for determinism and sorted with stable tie-breakers.
 *
 * Scoring dimensions:
 * - Recency: How recently the artifact was modified (30%)
 * - Relevance: How well it matches the current context (35%)
 * - Specificity: How targeted it is to the task (20%)
 * - Risk alignment: How relevant to current risk factors (15%)
 */

import { quantizeRelevance, tieBreaker } from "./determinism.js";
import type { ArtifactCandidate } from "./types.js";

/**
 * Scoring weights (must sum to 1.0).
 * These weights balance the importance of each dimension.
 */
export const SCORING_WEIGHTS = {
	/** How recently the artifact was modified */
	recency: 0.3,
	/** How well it matches the current context */
	relevance: 0.35,
	/** How targeted it is to the specific task */
	specificity: 0.2,
	/** How well it relates to current risk factors */
	riskAlignment: 0.15,
} as const;

/**
 * Maximum recency bucket value (for normalization)
 */
const MAX_RECENCY_BUCKET = 5;

/**
 * Compute composite score for an artifact candidate.
 * All inputs are pre-quantized for determinism.
 *
 * Formula:
 * score = 0.30 × (recencyBucket/5) +
 *         0.35 × relevanceScore +
 *         0.20 × specificityScore +
 *         0.15 × riskAlignment
 *
 * @param candidate - Artifact candidate with scoring inputs
 * @returns Composite score (0-1, quantized to 0.001)
 *
 * @example
 * const score = computeScore({
 *   recencyBucket: 4,        // Recent
 *   relevanceScore: 0.8,     // High relevance
 *   specificityScore: 0.6,   // Medium specificity
 *   riskAlignment: 0.5,      // Medium risk alignment
 * });
 * // score ≈ 0.30×0.8 + 0.35×0.8 + 0.20×0.6 + 0.15×0.5 = 0.715
 */
export function computeScore(candidate: ArtifactCandidate): number {
	// Normalize recency to 0-1 range
	const normalizedRecency = candidate.recencyBucket / MAX_RECENCY_BUCKET;

	const score =
		SCORING_WEIGHTS.recency * normalizedRecency +
		SCORING_WEIGHTS.relevance * candidate.relevanceScore +
		SCORING_WEIGHTS.specificity * candidate.specificityScore +
		SCORING_WEIGHTS.riskAlignment * candidate.riskAlignment;

	// Quantize output for determinism
	return quantizeRelevance(score);
}

/**
 * Scored candidate with computed score attached.
 */
export interface ScoredCandidate {
	/** Original candidate */
	candidate: ArtifactCandidate;
	/** Computed composite score */
	score: number;
}

/**
 * Score and sort candidates deterministically.
 * Same inputs → Same order (guaranteed).
 *
 * Sorting order:
 * 1. Higher score first
 * 2. If scores equal, use tie-breaker (lane priority → kind priority → ID)
 *
 * @param candidates - Array of candidates to score
 * @returns Scored candidates sorted by score descending
 *
 * @example
 * const sorted = scoreAndSort(candidates);
 * // sorted[0] has highest score
 * // sorted[sorted.length - 1] has lowest score
 */
export function scoreAndSort(candidates: ArtifactCandidate[]): ScoredCandidate[] {
	// Score all candidates
	const scored = candidates.map((candidate) => ({
		candidate,
		score: computeScore(candidate),
	}));

	// Sort by score descending, then tie-breaker
	scored.sort((a, b) => {
		if (a.score !== b.score) {
			return b.score - a.score; // Higher score first
		}
		return tieBreaker(a.candidate, b.candidate);
	});

	return scored;
}

/**
 * Get the top N candidates by score
 *
 * @param candidates - Array of candidates
 * @param n - Number of top candidates to return
 * @returns Top N scored candidates
 */
export function topN(candidates: ArtifactCandidate[], n: number): ScoredCandidate[] {
	const sorted = scoreAndSort(candidates);
	return sorted.slice(0, n);
}

/**
 * Get candidates with score above threshold
 *
 * @param candidates - Array of candidates
 * @param threshold - Minimum score (0-1)
 * @returns Scored candidates above threshold
 */
export function aboveThreshold(candidates: ArtifactCandidate[], threshold: number): ScoredCandidate[] {
	const sorted = scoreAndSort(candidates);
	return sorted.filter((s) => s.score >= threshold);
}

/**
 * Adjust candidate scores based on context.
 * Used by WorkspaceVitals to boost relevant artifacts.
 *
 * @param candidates - Candidates to adjust
 * @param adjustments - Score adjustments by ID
 * @returns Adjusted candidates (new array, inputs not mutated)
 */
export function applyScoreAdjustments(
	candidates: ArtifactCandidate[],
	adjustments: Map<string, number>,
): ArtifactCandidate[] {
	return candidates.map((c) => {
		const adjustment = adjustments.get(c.id) ?? 0;
		if (adjustment === 0) {
			return c;
		}

		// Create new candidate with adjusted relevance
		return {
			...c,
			relevanceScore: quantizeRelevance(Math.min(1, Math.max(0, c.relevanceScore + adjustment))),
		};
	});
}

/**
 * Calculate score statistics for a set of candidates
 *
 * @param candidates - Array of candidates
 * @returns Score statistics
 */
export function getScoreStats(candidates: ArtifactCandidate[]): {
	min: number;
	max: number;
	mean: number;
	median: number;
} {
	if (candidates.length === 0) {
		return { min: 0, max: 0, mean: 0, median: 0 };
	}

	const scores = candidates.map(computeScore).sort((a, b) => a - b);
	const sum = scores.reduce((a, b) => a + b, 0);

	return {
		min: scores[0],
		max: scores[scores.length - 1],
		mean: quantizeRelevance(sum / scores.length),
		median: scores[Math.floor(scores.length / 2)],
	};
}

/**
 * Validate scoring weights sum to 1.0
 * @throws Error if weights don't sum to 1.0
 */
export function validateScoringWeights(): void {
	const sum =
		SCORING_WEIGHTS.recency +
		SCORING_WEIGHTS.relevance +
		SCORING_WEIGHTS.specificity +
		SCORING_WEIGHTS.riskAlignment;

	if (Math.abs(sum - 1.0) > 0.001) {
		throw new Error(`Scoring weights must sum to 1.0, got ${sum}`);
	}
}

// Validate on module load
validateScoringWeights();
