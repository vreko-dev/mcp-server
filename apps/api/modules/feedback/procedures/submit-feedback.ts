/**
 * Feedback Submission Procedure
 */

import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { sendFeedbackToSlack, submitUserFeedback } from "../services/feedback-service";

const submitFeedbackInputSchema = z.object({
	category: z.enum(["bug", "feature", "question", "other"]),
	message: z.string().min(1).max(1000),
	email: z.string().email().optional(),
	timestamp: z.number(),
	userAgent: z.string().optional(),
	url: z.string().optional(),
});

export const submitFeedback = protectedProcedure
	.input(submitFeedbackInputSchema)
	.handler(async ({ input, context }) => {
		try {
			// Delegate to service layer per C-002
			const result = await submitUserFeedback({
				userId: context.user?.id ?? "",
				apiKeyId: context.auth?.apiKeyId ?? "session-feedback",
				sessionId: context.auth?.sessionId,
				category: input.category,
				message: input.message,
				email: input.email,
				userAgent: input.userAgent,
				url: input.url,
				timestamp: new Date(input.timestamp),
			});

			// Send to Slack webhook (best effort, don't fail if it errors)
			try {
				await sendFeedbackToSlack({
					category: input.category,
					message: input.message,
					userEmail: context.user?.email,
					url: input.url,
					userId: context.user?.id,
				});
				logger.info("Feedback sent to Slack", { userId: context.user?.id });
			} catch (error) {
				logger.error("Failed to send feedback to Slack", {
					error: error instanceof Error ? error.message : String(error),
				});
				// Don't fail the request if Slack is down
			}

			return result;
		} catch (error) {
			logger.error("Failed to submit feedback", { error });
			throw new Error("Failed to submit feedback");
		}
	});
