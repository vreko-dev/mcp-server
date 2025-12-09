/**
 * Recovery Module Types
 * Types for recovery outcome recording
 */

import { z } from "zod";

/**
 * Schema for recording recovery outcome (user feedback on AI suggestions)
 */
export const recordRecoveryOutcomeInputSchema = z.object({
	userId: z.string().min(1, "userId is required"),
	aiTool: z.string().min(1, "aiTool is required"),
	context: z.string().optional().default("general"),
	approved: z.boolean().describe("true if user accepted the recovery, false if rejected"),
	suggestionId: z.string().optional(),
});

export type RecordRecoveryOutcomeInput = z.infer<typeof recordRecoveryOutcomeInputSchema>;

/**
 * Response schema for recovery outcome recording
 */
export const recordRecoveryOutcomeOutputSchema = z.object({
	success: z.boolean(),
	updated: z.boolean(),
	newScore: z.number().optional(),
	message: z.string().optional(),
});

export type RecordRecoveryOutcomeOutput = z.infer<typeof recordRecoveryOutcomeOutputSchema>;
