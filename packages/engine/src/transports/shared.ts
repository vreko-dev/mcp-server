/**
 * Shared Transport Constants and Utilities
 *
 * Single source of truth for risk thresholds and classification
 * used across all transport adapters (CLI, MCP, HTTP).
 */

// ============================================================================
// Risk Level Thresholds
// ============================================================================

/**
 * Score thresholds for risk classification.
 * Used by all transport adapters to convert numeric scores to risk levels.
 *
 * | Score Range | Level    |
 * |-------------|----------|
 * | 0-1         | safe     |
 * | 2-3         | low      |
 * | 4-5         | medium   |
 * | 6-7         | high     |
 * | 8+          | critical |
 */
export const RISK_THRESHOLDS = {
	safe: 1,
	low: 3,
	medium: 5,
	high: 7,
} as const;

/**
 * Exit code threshold for CLI - scores above this return exit code 1
 */
export const HIGH_RISK_EXIT_THRESHOLD = 5;

// ============================================================================
// Risk Level Types
// ============================================================================

/** Possible risk levels returned by analysis */
export type RiskLevel = "safe" | "low" | "medium" | "high" | "critical";

// ============================================================================
// Risk Level Utilities
// ============================================================================

/**
 * Convert a numeric risk score to a risk level string.
 *
 * @param score - Numeric risk score (0-10+)
 * @returns Risk level classification
 *
 * @example
 * scoreToRiskLevel(0)  // => "safe"
 * scoreToRiskLevel(2)  // => "low"
 * scoreToRiskLevel(4)  // => "medium"
 * scoreToRiskLevel(6)  // => "high"
 * scoreToRiskLevel(8)  // => "critical"
 */
export function scoreToRiskLevel(score: number): RiskLevel {
	if (score <= RISK_THRESHOLDS.safe) {
		return "safe";
	}
	if (score <= RISK_THRESHOLDS.low) {
		return "low";
	}
	if (score <= RISK_THRESHOLDS.medium) {
		return "medium";
	}
	if (score <= RISK_THRESHOLDS.high) {
		return "high";
	}
	return "critical";
}

/**
 * Check if a risk score exceeds the high-risk threshold.
 * Used by CLI to determine exit code.
 *
 * @param score - Numeric risk score
 * @returns true if score exceeds high-risk threshold
 */
export function isHighRisk(score: number): boolean {
	return score > HIGH_RISK_EXIT_THRESHOLD;
}

/**
 * Get the appropriate exit code for a risk score.
 * Returns 1 for high-risk scores, 0 otherwise.
 *
 * @param score - Numeric risk score
 * @returns Exit code (0 or 1)
 */
export function getExitCode(score: number): 0 | 1 {
	return isHighRisk(score) ? 1 : 0;
}
