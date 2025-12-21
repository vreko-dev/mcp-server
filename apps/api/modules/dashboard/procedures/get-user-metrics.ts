import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getUserMetrics as getUserMetricsFromService } from "../services/dashboard-service";

const getUserMetricsOutputSchema = z.object({
	snapshotCount: z.number(),
	recoveryCount: z.number(),
	filesProtected: z.number(),
	aiDetectionRate: z.number(),
});

export const getUserMetrics = protectedProcedure.output(getUserMetricsOutputSchema).handler(async ({ context }) => {
	const userId = context.user.id;

	try {
		// Delegate to service layer per C-002
		return await getUserMetricsFromService(userId);
	} catch (error) {
		logger.error("Failed to get user metrics", { userId, error });
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to fetch dashboard metrics",
		});
	}
});
