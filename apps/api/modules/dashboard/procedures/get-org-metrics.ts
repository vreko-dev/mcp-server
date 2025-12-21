import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getOrgMetrics as getOrgMetricsFromService } from "../services/dashboard-service";

const getOrgMetricsInputSchema = z.object({
	organizationId: z.string(),
	days: z.number().min(1).max(30).default(7),
});

const getOrgMetricsOutputSchema = z.object({
	totalIncidentsDetected: z.number(),
	totalIncidentsPrevented: z.number(),
	avgTimeToRestoreMs: z.number().nullable(),
	totalSnapshotsCreated: z.number(),
	totalSnapshotsRestored: z.number(),
	totalBytesSaved: z.number(),
	totalHighSeverityRisks: z.number(),
	totalMediumSeverityRisks: z.number(),
	totalLowSeverityRisks: z.number(),
	totalApiCalls: z.number(),
	totalApiErrors: z.number(),
	activeUsers: z.number(),
});

export const getOrgMetrics = protectedProcedure
	.input(getOrgMetricsInputSchema)
	.output(getOrgMetricsOutputSchema)
	.handler(async ({ input, context }) => {
		const { organizationId, days } = input;
		const userId = context.user.id;

		try {
			// Delegate to service layer per C-002
			return await getOrgMetricsFromService({ organizationId, days });
		} catch (error) {
			logger.error("Failed to get organization metrics", {
				organizationId,
				userId,
				error,
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch organization metrics",
			});
		}
	});
