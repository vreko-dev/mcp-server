import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getSessionMetrics as getSessionMetricsFromService } from "../services/dashboard-service";

const sessionMetricsSchema = z.object({
	sessionCount: z.number(),
	aiSessionCount: z.number(),
	totalBytesSaved: z.number(),
	highSeveritySessionCount: z.number(),
});

const getSessionMetricsOutputSchema = sessionMetricsSchema;

export const getSessionMetrics = protectedProcedure
	.output(getSessionMetricsOutputSchema)
	.handler(async ({ context }) => {
		const userId = context.user.id;

		try {
			// Delegate to service layer per C-002
			return await getSessionMetricsFromService(userId);
		} catch (error) {
			logger.error("Failed to get session metrics", { userId, error });
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch session metrics",
			});
		}
	});
