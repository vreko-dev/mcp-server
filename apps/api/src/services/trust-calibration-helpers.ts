/**
 * Trust Calibration Helper Functions
 *
 * Extracted utilities for EWMA calculation, validation, and data processing.
 * These helpers make the main TrustCalibrationService more readable and testable.
 *
 * Authority: TDD_CORE.md - Phase 3 Refactor
 */

/**
 * EWMA Algorithm Parameters
 */
export const EWMA_CONFIG = {
	ALPHA: 0.7, // Historical weight (70% of old score)
	NEW_FEEDBACK_WEIGHT: 0.3, // New outcome weight (30% of new feedback)
	DEFAULT_SCORE: 0.5, // Neutral baseline
	SCORE_MIN: 0.0,
	SCORE_MAX: 1.0,
};

/**
 * Calculate new EWMA score given old score and new outcome
 *
 * @param oldScore - Previous score (or baseline 0.5)
 * @param outcome - New outcome (1 = accepted, 0 = rejected)
 * @returns New EWMA score
 */
export function calculateEWMAScore(oldScore: number, outcome: number): number {
	const newScore = EWMA_CONFIG.ALPHA * oldScore + EWMA_CONFIG.NEW_FEEDBACK_WEIGHT * outcome;
	return clampScore(newScore);
}

/**
 * Clamp score to valid range [0, 1]
 *
 * @param score - Raw score value
 * @returns Clamped score
 */
export function clampScore(score: number): number {
	return Math.max(EWMA_CONFIG.SCORE_MIN, Math.min(EWMA_CONFIG.SCORE_MAX, score));
}

/**
 * Calculate score from a sequence of outcomes
 *
 * Applies EWMA forward through time, starting from neutral baseline.
 *
 * @param outcomes - Array of outcomes (1 = accepted, 0 = rejected)
 * @returns Calculated score
 */
export function calculateScoreFromOutcomeSequence(outcomes: number[]): number {
	if (outcomes.length === 0) {
		return EWMA_CONFIG.DEFAULT_SCORE;
	}

	let score = EWMA_CONFIG.DEFAULT_SCORE;
	for (const outcome of outcomes) {
		score = calculateEWMAScore(score, outcome);
	}

	return score;
}

/**
 * Validate user ID
 *
 * @param userId - User ID to validate
 * @throws Error if invalid
 */
export function validateUserId(userId: string): void {
	if (!userId || typeof userId !== "string") {
		throw new Error("userId is required and must be a string");
	}
}

/**
 * Validate AI tool name
 *
 * @param aiTool - AI tool name to validate
 * @throws Error if invalid
 */
export function validateAITool(aiTool: string): void {
	if (!aiTool || typeof aiTool !== "string") {
		throw new Error("aiTool is required and must be a string");
	}
}

/**
 * Validate outcome value
 *
 * @param outcome - Outcome value to validate
 * @throws Error if not 0 or 1
 */
export function validateOutcome(outcome: number): void {
	if (outcome !== 0 && outcome !== 1) {
		throw new Error("outcome must be 0 (rejected) or 1 (accepted)");
	}
}

/**
 * Convert approval boolean to outcome value
 *
 * @param approved - true for accepted, false for rejected
 * @returns outcome (1 or 0)
 */
export function approvalToOutcome(approved: boolean): number {
	return approved ? 1 : 0;
}

/**
 * Extract tool data from editsMade JSON array
 *
 * @param editsMade - JSON array from database
 * @param tool - Tool name to find
 * @returns Tool entry or undefined
 */
export function extractToolFromEdits(editsMade: any, tool: string): any {
	if (!editsMade || !Array.isArray(editsMade)) {
		return undefined;
	}

	return (editsMade as any[]).find((edit: any) => edit.tool === tool);
}

/**
 * Format tool name for display
 *
 * Maps internal tool names to user-friendly display names.
 *
 * @param featureName - Internal tool/feature name
 * @returns User-friendly display name
 */
export function formatToolName(featureName: string): string {
	const toolMap: Record<string, string> = {
		copilot: "GitHub Copilot",
		cursor: "Cursor",
		windsurf: "Windsurf",
		claude: "Claude",
		gpt: "ChatGPT",
	};

	const normalized = featureName.toLowerCase();
	for (const [key, value] of Object.entries(toolMap)) {
		if (normalized.includes(key)) {
			return value;
		}
	}

	return featureName;
}

/**
 * Generate unique suggestion ID
 *
 * @param aiTool - AI tool name
 * @param context - Context type
 * @returns Unique suggestion ID
 */
export function generateSuggestionId(aiTool: string, context: string): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 11);
	return `${aiTool}-${context}-${timestamp}-${random}`;
}

/**
 * Generate unique trust outcome ID
 *
 * @returns Unique ID for trust outcome record
 */
export function generateTrustOutcomeId(): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 11);
	return `trust-${timestamp}-${random}`;
}
