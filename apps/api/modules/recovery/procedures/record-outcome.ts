/**
 * Record Recovery Outcome Procedure
 *
 * Handles user feedback (acceptance/rejection) of recovered code changes.
 * Integrates with TrustCalibrationService to update AI tool confidence scores.
 *
 * Authority: TDD_CORE.md - Service Layer Pattern
 */

import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { publicProcedure } from "@/orpc/procedures";
import { getTrustCalibrationService } from "@/src/services/trust-calibration";
import { recordRecoveryOutcomeInputSchema, recordRecoveryOutcomeOutputSchema } from "../types";

/**
 * Record Recovery Outcome
 *
 * Called when a user accepts or rejects a recovered code change.
 * Updates the trust score for the AI tool that generated the recovery.
 *
 * Request body:
 * {
 *   userId: string,          // ID of the user
 *   aiTool: string,         // AI tool name (copilot, cursor, claude, etc)
 *   context: string,        // Context (code_generation, refactoring, debugging, etc)
 *   approved: boolean,      // true if accepted, false if rejected
 *   suggestionId?: string   // Optional ID of the original suggestion
 * }
 *
 * Response:
 * {
 *   success: boolean,       // true if outcome was recorded
 *   updated: boolean,      // true if trust score was updated
 *   newScore?: number,     // Updated trust score (0-1)
 *   message?: string       // Optional message
 * }
 */
export const recordOutcome = publicProcedure
	.input(recordRecoveryOutcomeInputSchema)
	.output(recordRecoveryOutcomeOutputSchema)
	.handler(async ({ input }) => {
		try {
			// Extract inputs
			const { userId, aiTool, context = "general", approved } = input;

			// Get trust calibration service
			const trustService = getTrustCalibrationService();

			// Convert approval boolean to outcome value (1 = approved, 0 = rejected)
			const outcome = approved ? 1 : 0;

			// Record outcome and get new score
			const newScore = await trustService.recordOutcome(userId, aiTool, context, outcome);

			logger.info("Recovery outcome recorded", {
				userId,
				aiTool,
				context,
				approved,
				newScore,
			});

			return {
				success: true,
				updated: true,
				newScore,
				message: `Trust score updated for ${aiTool}: ${newScore.toFixed(3)}`,
			};
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));

			logger.error("Failed to record recovery outcome", {
				userId: input.userId,
				aiTool: input.aiTool,
				error: err.message,
			});

			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: `Failed to record recovery outcome: ${err.message}`,
			});
		}
	});
