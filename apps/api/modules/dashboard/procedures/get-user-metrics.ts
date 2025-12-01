import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { featureUsage, snapshots } from "@snapback/platform";
import { and, count, eq, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

const getUserMetricsOutputSchema = z.object({
	snapshotCount: z.number(),
	recoveryCount: z.number(),
	filesProtected: z.number(),
	aiDetectionRate: z.number(),
});

export const getUserMetrics = protectedProcedure.output(getUserMetricsOutputSchema).handler(async ({ context }) => {
	const userId = context.user.id;

	try {
		const db = getDb();
		if (!db) {
			return {
				snapshotCount: 0,
				recoveryCount: 0,
				filesProtected: 0,
				aiDetectionRate: 0,
			};
		}

		// Optimized single query to get all metrics at once
		const metrics = await getDb()
			.select({
				snapshotCount: count(snapshots.id),
				recoveryCount: count(sql`CASE WHEN ${snapshots.riskScore} > 0 THEN 1 END`),
				filesProtected: sum(snapshots.fileCount),
				aiCount: count(featureUsage.id),
			})
			.from(snapshots)
			.leftJoin(
				featureUsage,
				and(eq(featureUsage.userId, userId), eq(featureUsage.featureCategory, "ai_assistance")),
			)
			.where(eq(snapshots.userId, userId));

		const result = metrics[0] || {
			snapshotCount: 0,
			recoveryCount: 0,
			filesProtected: 0,
			aiCount: 0,
		};

		const totalSnapshots = result.snapshotCount || 0;
		const aiDetectionCount = result.aiCount || 0;
		const aiDetectionRate = totalSnapshots > 0 ? Math.round((aiDetectionCount / totalSnapshots) * 100) : 0;

		return {
			snapshotCount: totalSnapshots,
			recoveryCount: result.recoveryCount || 0,
			filesProtected: Number(result.filesProtected) || 0,
			aiDetectionRate,
		};
	} catch (error) {
		logger.error("Failed to get user metrics", { userId, error });
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to fetch dashboard metrics",
		});
	}
});
