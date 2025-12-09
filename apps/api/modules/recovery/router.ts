/**
 * Recovery Router
 *
 * Handles recovery-related endpoints:
 * - Recording user feedback on code recovery actions
 * - Integrating with trust calibration for AI tool scoring
 *
 * Authority: TDD_CORE.md - oRPC Router Pattern
 */

import { publicProcedure } from "@/orpc/procedures";
import { recordOutcome } from "./procedures/record-outcome";

/**
 * Recovery Router
 *
 * Exposes recovery-related operations:
 * - POST /api/recovery/record-outcome - Record user feedback on recovery
 */
export const recoveryRouter = publicProcedure.router({
	/**
	 * Record outcome of a code recovery
	 *
	 * Called when user accepts or rejects a recovered change.
	 * Updates trust scores for AI tools based on user feedback.
	 */
	recordOutcome: recordOutcome,
});
