/**
 * NPS Survey Submission Procedure
 */

import { feedback } from "@snapback/platform";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

const submitNPSInputSchema = z.object({
	userId: z.string(),
	score: z.number().min(0).max(10),
	reason: z.string().max(500).optional(),
	timestamp: z.number(),
});

export const submitNPS = protectedProcedure
	.input(submitNPSInputSchema)
	.handler(async ({ input, context }) => {
		const db = getDb();

		if (!db) {
			throw new Error("Database not available");
		}

		// Calculate NPS category
		const category =
			input.score >= 9
				? "promoter"
				: input.score >= 7
					? "passive"
					: "detractor";

		// Insert into feedback table as NPS type
		await db.insert(feedback).values({
			userId: context.user?.id ?? "",
			apiKeyId: context.auth?.apiKeyId ?? "session-feedback",
			sessionId: context.auth?.sessionId,
			feedbackType: "nps",
			feedbackText: input.reason,
			rating: input.score,
			metadata: {
				category,
				userId: input.userId,
			},
			timestamp: new Date(input.timestamp),
		});

		return {
			success: true,
			category,
		};
	});
