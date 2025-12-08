import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { extensionSessions } from "@snapback/platform";
import { and, count, eq, or, sum } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

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
			const db = getDb();
			if (!db) {
				return {
					sessionCount: 0,
					aiSessionCount: 0,
					totalBytesSaved: 0,
					highSeveritySessionCount: 0,
				};
			}

			// Use denormalized fields for better performance
			const metrics = await getDb()
				.select({
					sessionCount: count(extensionSessions.id),
					aiSessionCount: count(and(eq(extensionSessions.aiPresent, true))),
					totalBytesSaved: sum(extensionSessions.bytesSaved),
					highSeveritySessionCount: count(
						and(
							or(
								eq(extensionSessions.highestSeverity, "high"),
								eq(extensionSessions.highestSeverity, "critical"),
							),
						),
					),
				})
				.from(extensionSessions)
				.where(eq(extensionSessions.userId, userId));

			const result = metrics[0] || {
				sessionCount: 0,
				aiSessionCount: 0,
				totalBytesSaved: 0,
				highSeveritySessionCount: 0,
			};

			return {
				sessionCount: result.sessionCount || 0,
				aiSessionCount: result.aiSessionCount || 0,
				totalBytesSaved: Number(result.totalBytesSaved) || 0,
				highSeveritySessionCount: result.highSeveritySessionCount || 0,
			};
		} catch (error) {
			logger.error("Failed to get session metrics", { userId, error });
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch session metrics",
			});
		}
	});
