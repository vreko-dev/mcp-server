/**
 * Trust Calibration Service
 *
 * Implements EWMA (Exponentially Weighted Moving Average) algorithm
 * to calculate AI tool confidence scores based on user feedback.
 *
 * EWMA Formula: new_score = (α * old_score) + (1-α * outcome)
 * where α = 0.7 (weight for history) and 1-α = 0.3 (weight for new feedback)
 * Baseline score for new tools: 0.5 (neutral)
 *
 * Authority: TDD_CORE.md - Service Layer Pattern
 */

import { logger } from "@snapback/infrastructure";
// @ts-expect-error - postAcceptOutcomes has implicit any type from platform package
import { postAcceptOutcomes } from "@snapback/platform";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./database";

// Type for PostAcceptOutcome records
type PostAcceptOutcome = any;

/**
 * EWMA Algorithm Parameters
 * α (alpha) = 0.7 - Weight given to historical scores
 * 1-α = 0.3 - Weight given to new feedback
 */
const ALPHA = 0.7; // Historical weight
const NEW_FEEDBACK_WEIGHT = 1 - ALPHA; // Current outcome weight
const _DEFAULT_SCORE = 0.5; // Neutral baseline for new tools
const SCORE_MIN = 0.0; // Lower bound
const SCORE_MAX = 1.0; // Upper bound

/**
 * Represents a trust score record for a user/tool combination
 */
interface TrustScore {
	userId: string;
	aiTool: string;
	context?: string;
	score: number;
	outcomeCount: number;
	lastUpdated: Date;
}

/**
 * TrustCalibrationService
 *
 * Manages trust scores for AI tools based on user feedback.
 * Uses EWMA algorithm to smoothly update scores with new outcomes.
 */
export class TrustCalibrationService {
	/**
	 * Record a user outcome (acceptance/rejection of AI suggestion)
	 * Updates the trust score for the specified user/tool/context combination
	 *
	 * @param userId - ID of the user providing feedback
	 * @param aiTool - Name of the AI tool (copilot, cursor, claude, etc)
	 * @param context - Context of the suggestion (code_generation, refactoring, debugging, etc)
	 * @param outcome - 1 for accepted, 0 for rejected
	 * @returns Updated trust score (0-1)
	 * @throws Error if validation fails or database operation fails
	 */
	async recordOutcome(userId: string, aiTool: string, context, outcome: number): Promise<number> {
		// Input validation
		if (!userId || typeof userId !== "string") {
			throw new Error("userId is required and must be a string");
		}
		if (!aiTool || typeof aiTool !== "string") {
			throw new Error("aiTool is required and must be a string");
		}
		if (outcome !== 0 && outcome !== 1) {
			throw new Error("outcome must be 0 (rejected) or 1 (accepted)");
		}

		try {
			const db = getDb();

			// Get current score for this user/tool
			const currentScore = await this.getConfidenceScore(userId, aiTool);

			// Calculate new score using EWMA formula
			// new_score = (0.7 * old_score) + (0.3 * outcome)
			const newScore = ALPHA * currentScore + NEW_FEEDBACK_WEIGHT * outcome;

			// Clamp score to valid range [0.0, 1.0]
			const clampedScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, newScore));

			// Persist outcome to database
			// @ts-expect-error - postAcceptOutcomes type issue
			await db.insert(postAcceptOutcomes).values({
				id: `trust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				userId,
				apiKeyId: "trust-calibration-system", // System-generated, not from API key
				suggestionId: `${aiTool}-${context}-${Date.now()}`,
				userFeedback: outcome === 1 ? "accepted" : "rejected",
				editsMade: [{ tool: aiTool, context, score: clampedScore }],
				timestamp: new Date(),
				createdAt: new Date(),
			} as any);

			logger.info("Trust outcome recorded", {
				userId,
				aiTool,
				context,
				outcome: outcome === 1 ? "accepted" : "rejected",
				previousScore: currentScore,
				newScore: clampedScore,
			});

			return clampedScore;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error("Failed to record trust outcome", {
				userId,
				aiTool,
				context,
				error: err.message,
			});

			// Re-throw with context
			throw new Error(`Failed to record outcome for ${aiTool}: ${err.message}`);
		}
	}

	/**
	 * Get current confidence score for a user/tool combination
	 *
	 * @param userId - ID of the user
	 * @param aiTool - Name of the AI tool
	 * @returns Confidence score (0-1), or default (0.5) if no outcomes recorded
	 */
	async getConfidenceScore(userId: string, aiTool: string): Promise<number> {
		try {
			const db = getDb();

			// Query outcomes for this user/tool
			// Filter by userFeedback containing the tool name and outcome data
			// @ts-expect-error - postAcceptOutcomes type issue from platform package
			const outcomes = await db
				.select()
				.from(postAcceptOutcomes)
				.where(and(eq(postAcceptOutcomes.userId, userId)))
				.orderBy(desc(postAcceptOutcomes.createdAt));

			// Filter outcomes for this specific tool from editsMade JSON
			const toolOutcomes = outcomes.filter((outcome: PostAcceptOutcome) => {
				try {
					if (!outcome.editsMade || !Array.isArray(outcome.editsMade)) {
						return false;
					}
					return (outcome.editsMade as any[]).some((edit: any) => edit.tool === aiTool);
				} catch {
					return false;
				}
			});

			// No outcomes recorded - return default score
			if (toolOutcomes.length === 0) {
				return EWMA_CONFIG.DEFAULT_SCORE;
			}

			// Calculate current score from most recent outcome
			const mostRecent = toolOutcomes[0];
			if (mostRecent.editsMade && Array.isArray(mostRecent.editsMade)) {
				const toolData = extractToolFromEdits(mostRecent.editsMade, aiTool);
				if (toolData && typeof toolData.score === "number") {
					return clampScore(toolData.score);
				}
			}

			// Fallback: calculate from outcome history
			return calculateScoreFromOutcomeSequence(
				toolOutcomes.map((o: PostAcceptOutcome) => (o.userFeedback === "accepted" ? 1 : 0)),
			);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.warn("Failed to retrieve confidence score, using default", {
				userId,
				aiTool,
				error: err.message,
			});

			// Return default on error (graceful degradation)
			return EWMA_CONFIG.DEFAULT_SCORE;
		}
	}

	/**
	 * Calculate score from a sequence of outcomes using EWMA
	 * @param outcomes - Array of outcomes (1 = accepted, 0 = rejected)
	 * @returns Calculated score
	 */
	private calculateScoreFromOutcomes(outcomes: number[]): number {
		return calculateScoreFromOutcomeSequence(outcomes);
	}

	/**
	 * Get all trust scores for a user
	 *
	 * @param userId - ID of the user
	 * @returns Array of trust scores for each tool
	 */
	async getUserTrustScores(userId: string): Promise<TrustScore[]> {
		try {
			const db = getDb();

			const outcomes = (await db
				.select()
				.from(postAcceptOutcomes)
				.where(eq(postAcceptOutcomes.userId, userId))
				.orderBy(desc(postAcceptOutcomes.createdAt))) as PostAcceptOutcome[];

			// Group by tool and calculate scores
			const toolScores = new Map<string, number[]>();
			const tools = new Set<string>();

			for (const outcome of outcomes as PostAcceptOutcome[]) {
				if (!outcome.editsMade || !Array.isArray(outcome.editsMade)) {
					continue;
				}

				for (const edit of outcome.editsMade as any[]) {
					if (edit.tool) {
						tools.add(edit.tool);
						if (!toolScores.has(edit.tool)) {
							toolScores.set(edit.tool, []);
						}
						const outcomeValue = outcome.userFeedback === "accepted" ? 1 : 0;
						toolScores.get(edit.tool)?.push(outcomeValue);
					}
				}
			}

			// Build result array
			const result: TrustScore[] = [];
			for (const tool of tools) {
				const scores = toolScores.get(tool) || [];
				const currentScore = this.calculateScoreFromOutcomes(scores);

				result.push({
					userId,
					aiTool: tool,
					score: currentScore,
					outcomeCount: scores.length,
					lastUpdated: outcomes[0]?.createdAt || new Date(),
				});
			}

			return result;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error("Failed to retrieve user trust scores", {
				userId,
				error: err.message,
			});

			return [];
		}
	}
}

/**
 * Singleton instance for application-wide access
 */
let instance: TrustCalibrationService | null = null;

export function getTrustCalibrationService(): TrustCalibrationService {
	if (!instance) {
		instance = new TrustCalibrationService();
	}
	return instance;
}
