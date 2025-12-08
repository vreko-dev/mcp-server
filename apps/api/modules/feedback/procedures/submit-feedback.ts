/**
 * Feedback Submission Procedure
 */

import { feedback } from "@snapback/platform";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

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
		const db = getDb();

		if (!db) {
			throw new Error("Database not available");
		}

		// Insert into database
		await db.insert(feedback).values({
			userId: context.user?.id ?? "",
			apiKeyId: context.auth?.apiKeyId ?? "session-feedback",
			sessionId: context.auth?.sessionId,
			feedbackType: input.category,
			feedbackText: input.message,
			metadata: {
				email: input.email,
				userAgent: input.userAgent,
				url: input.url,
			},
			timestamp: new Date(input.timestamp),
		});

		// Send to Slack webhook (optional)
		if (process.env.SLACK_FEEDBACK_WEBHOOK) {
			try {
				await fetch(process.env.SLACK_FEEDBACK_WEBHOOK, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						text: `New ${input.category} feedback from ${context.user?.email || "anonymous"}`,
						blocks: [
							{
								type: "section",
								text: {
									type: "mrkdwn",
									text: `*${input.category.toUpperCase()} Feedback*\n${input.message}`,
								},
							},
							{
								type: "context",
								elements: [
									{
										type: "mrkdwn",
										text: `User: ${context.user?.email || "N/A"} | URL: ${input.url || "N/A"}`,
									},
								],
							},
						],
					}),
				});

				console.log("[Feedback] Sent to Slack", { userId: context.user?.id });
			} catch (error) {
				console.error("[Feedback] Failed to send to Slack", {
					error: error instanceof Error ? error.message : String(error),
				});
				// Don't fail the request if Slack is down
			}
		}

		return { success: true };
	});
