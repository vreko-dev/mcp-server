/**
 * Determinism Guardrails
 *
 * Ensures reproducible selection by:
 * - Quantizing floating-point scores to fixed precision
 * - Bucketing time-based values to prevent "now" drift
 * - Providing stable tie-breakers for equal scores
 *
 * Core guarantee: Same inputs → Same outputs (verifiable via replay)
 */

import { type ArtifactCandidate, KIND_PRIORITIES, LANE_PRIORITIES } from "./types.js";

/**
 * Quantization precision for relevance scores.
 * Prevents floating-point differences from changing selection order.
 *
 * 0.001 means scores are rounded to 3 decimal places.
 * Example: 0.123456 → 0.123
 */
export const RELEVANCE_PRECISION = 1e-3;

/**
 * Recency bucket thresholds in seconds.
 * Each threshold defines the boundary for a recency level.
 *
 * Bucketing prevents "now" from causing non-determinism:
 * - Two runs 1 second apart will get the same bucket
 * - Only large time differences change the bucket
 */
export const RECENCY_BUCKETS = [
	0, // Bucket 5: current (< 1 min)
	60, // Bucket 4: recent (1-5 min)
	300, // Bucket 3: warm (5-30 min)
	1800, // Bucket 2: cold (30min-2hr)
	7200, // Bucket 1: stale (2hr-24hr)
	86400, // Bucket 0: old (> 24hr)
] as const;

/**
 * Number of recency buckets (0-5)
 */
export const MAX_RECENCY_BUCKET = RECENCY_BUCKETS.length;

/**
 * Quantize a relevance score to fixed precision.
 * This ensures that minor floating-point variations don't affect ordering.
 *
 * @param score - Raw score value (0-1)
 * @returns Quantized score rounded to RELEVANCE_PRECISION
 *
 * @example
 * quantizeRelevance(0.123456789) // → 0.123
 * quantizeRelevance(0.9999)      // → 1.000
 */
export function quantizeRelevance(score: number): number {
	if (!Number.isFinite(score)) {
		return 0;
	}
	// Clamp to valid range
	const clamped = Math.max(0, Math.min(1, score));
	// Round to precision
	return Math.round(clamped / RELEVANCE_PRECISION) * RELEVANCE_PRECISION;
}

/**
 * Bucket recency by age in milliseconds.
 * Returns bucket number (higher = more recent).
 *
 * Bucket mapping:
 * - 5: Current (< 1 min)
 * - 4: Recent (1-5 min)
 * - 3: Warm (5-30 min)
 * - 2: Cold (30min-2hr)
 * - 1: Stale (2hr-24hr)
 * - 0: Old (> 24hr)
 *
 * @param ageMs - Age in milliseconds since the artifact was created/modified
 * @returns Bucket number 0-5 (higher = more recent)
 *
 * @example
 * bucketRecency(30 * 1000)       // 30 seconds → bucket 5 (current)
 * bucketRecency(2 * 60 * 1000)   // 2 minutes → bucket 4 (recent)
 * bucketRecency(10 * 60 * 1000)  // 10 minutes → bucket 3 (warm)
 */
export function bucketRecency(ageMs: number): number {
	if (!Number.isFinite(ageMs) || ageMs < 0) {
		return MAX_RECENCY_BUCKET - 1; // Treat invalid as most recent
	}

	const ageSec = ageMs / 1000;

	// Find the bucket threshold that the age exceeds
	// Iterate from oldest to newest thresholds
	for (let i = RECENCY_BUCKETS.length - 1; i >= 0; i--) {
		if (ageSec >= RECENCY_BUCKETS[i]) {
			// Return bucket number (higher = more recent)
			// RECENCY_BUCKETS.length - 1 - i converts threshold index to bucket
			return RECENCY_BUCKETS.length - 1 - i;
		}
	}

	// Age is less than smallest threshold (0), so it's the most recent bucket
	return MAX_RECENCY_BUCKET - 1;
}

/**
 * Get the recency bucket label for display
 *
 * @param bucket - Bucket number 0-5
 * @returns Human-readable label
 */
export function getRecencyLabel(bucket: number): string {
	const labels: Record<number, string> = {
		5: "current",
		4: "recent",
		3: "warm",
		2: "cold",
		1: "stale",
		0: "old",
	};
	return labels[bucket] ?? "unknown";
}

/**
 * Stable tie-breaker when scores are equal.
 * Ensures deterministic ordering even with identical scores.
 *
 * Order priority:
 * 1. Lane priority (lower = higher priority, e.g., policy > rules > local)
 * 2. Kind priority (lower = higher priority, e.g., constraint > rule_doc)
 * 3. Lexicographic by ID (stable, deterministic)
 *
 * @param a - First candidate to compare
 * @param b - Second candidate to compare
 * @returns Negative if a comes before b, positive if after, 0 if equal
 *
 * @example
 * // Policy lane beats rules lane
 * tieBreaker(
 *   { lane: 'policy', kind: 'constraint', id: 'a' },
 *   { lane: 'rules', kind: 'rule_doc', id: 'b' }
 * ) // → -1 (policy comes first)
 */
export function tieBreaker(a: ArtifactCandidate, b: ArtifactCandidate): number {
	// 1. Lane priority (lower = higher priority)
	const lanePriorityA = LANE_PRIORITIES[a.lane];
	const lanePriorityB = LANE_PRIORITIES[b.lane];
	if (lanePriorityA !== lanePriorityB) {
		return lanePriorityA - lanePriorityB;
	}

	// 2. Kind priority (lower = higher priority)
	const kindPriorityA = KIND_PRIORITIES[a.kind] ?? 99;
	const kindPriorityB = KIND_PRIORITIES[b.kind] ?? 99;
	if (kindPriorityA !== kindPriorityB) {
		return kindPriorityA - kindPriorityB;
	}

	// 3. Lexicographic by ID (stable)
	return a.id.localeCompare(b.id);
}

/**
 * Check if two scores are effectively equal after quantization
 *
 * @param a - First score
 * @param b - Second score
 * @returns true if scores are equal after quantization
 */
export function scoresEqual(a: number, b: number): boolean {
	return quantizeRelevance(a) === quantizeRelevance(b);
}

/**
 * Normalize a timestamp to bucket boundaries for deterministic caching
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param bucketSizeMs - Size of time buckets in milliseconds
 * @returns Normalized timestamp at bucket boundary
 */
export function normalizeTimestamp(
	timestamp: number,
	bucketSizeMs = 60000, // 1 minute default
): number {
	return Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
}

/**
 * Create a deterministic hash of an array of strings
 * Used for cache key components
 *
 * @param items - Array of strings to hash
 * @returns Deterministic string representation
 */
export function deterministicArrayHash(items: string[]): string {
	// Sort for determinism, then join with delimiter that won't appear in data
	return [...items].sort().join("\x00");
}

/**
 * Quantize a number to a specific number of decimal places
 *
 * @param value - The value to quantize
 * @param decimals - Number of decimal places
 * @returns Quantized value
 */
export function quantizeToDecimals(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}
