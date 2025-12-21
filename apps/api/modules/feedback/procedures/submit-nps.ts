/**
 * NPS Survey Submission Procedure
 */

import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { submitNPSSurvey } from "../services/feedback-service";

const submitNPSInputSchema = z.object({
	userId: z.string(),
	score: z.number().min(0).max(10),
	reason: z.string().max(500).optional(),
	timestamp: z.number(),
});

export const submitNPS = protectedProcedure.input(submitNPSInputSchema).handler(async ({ input, context }) => {
	try {
		// Delegate to service layer per C-002
		return await submitNPSSurvey({
			userId: context.user?.id ?? "",
			apiKeyId: context.auth?.apiKeyId ?? "session-feedback",
			sessionId: context.auth?.sessionId,
			score: input.score,
			reason: input.reason,
			timestamp: new Date(input.timestamp),
		});
	} catch (error) {
		logger.error("Failed to submit NPS", { error });
		throw new Error("Failed to submit NPS survey");
	}
});
