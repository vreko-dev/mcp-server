import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { orgDailyMetrics } from "@snapback/platform";
import { and, eq, gte, lte, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

const getOrgMetricsInputSchema = z.object({
	organizationId: z.string(),
	days: z.number().min(1).max(30).default(7), // Last N days to aggregate
});

const getOrgMetricsOutputSchema = z.object({
	// Incident metrics
	totalIncidentsDetected: z.number(),
	totalIncidentsPrevented: z.number(),
	avgTimeToRestoreMs: z.number().nullable(),

	// Snapshot metrics
	totalSnapshotsCreated: z.number(),
	totalSnapshotsRestored: z.number(),
	totalBytesSaved: z.number(),

	// Risk metrics
	totalHighSeverityRisks: z.number(),
	totalMediumSeverityRisks: z.number(),
	totalLowSeverityRisks: z.number(),

	// API usage metrics
	totalApiCalls: z.number(),
	totalApiErrors: z.number(),

	// User metrics
	activeUsers: z.number(),
});

export const getOrgMetrics = protectedProcedure
	.input(getOrgMetricsInputSchema)
	.output(getOrgMetricsOutputSchema)
	.handler(async ({ input, context }) => {
		const { organizationId, days } = input;
		const userId = context.user.id;

		try {
			const db = getDb();
			if (!db) {
				return {
					totalIncidentsDetected: 0,
					totalIncidentsPrevented: 0,
					avgTimeToRestoreMs: null,
					totalSnapshotsCreated: 0,
					totalSnapshotsRestored: 0,
					totalBytesSaved: 0,
					totalHighSeverityRisks: 0,
					totalMediumSeverityRisks: 0,
					totalLowSeverityRisks: 0,
					totalApiCalls: 0,
					totalApiErrors: 0,
					activeUsers: 0,
				};
			}

			// Calculate date range
			const endDate = new Date();
			const startDate = new Date();
			startDate.setDate(endDate.getDate() - days);

			// Aggregate metrics from org_daily_metrics table
			const metrics = await getDb()
				.select({
					totalIncidentsDetected: sum(orgDailyMetrics.incidentsDetected),
					totalIncidentsPrevented: sum(orgDailyMetrics.incidentsPrevented),
					avgTimeToRestoreMs: sql`AVG(${orgDailyMetrics.timeToRestoreMs})`,
					totalSnapshotsCreated: sum(orgDailyMetrics.snapshotsCreated),
					totalSnapshotsRestored: sum(orgDailyMetrics.snapshotsRestored),
					totalBytesSaved: sum(orgDailyMetrics.bytesSaved),
					totalHighSeverityRisks: sum(orgDailyMetrics.highSeverityRisks),
					totalMediumSeverityRisks: sum(orgDailyMetrics.mediumSeverityRisks),
					totalLowSeverityRisks: sum(orgDailyMetrics.lowSeverityRisks),
					totalApiCalls: sum(orgDailyMetrics.apiCalls),
					totalApiErrors: sum(orgDailyMetrics.apiErrors),
					activeUsers: sql`MAX(${orgDailyMetrics.activeUsers})`,
				})
				.from(orgDailyMetrics)
				.where(
					and(
						eq(orgDailyMetrics.organizationId, organizationId),
						gte(orgDailyMetrics.date, startDate),
						lte(orgDailyMetrics.date, endDate),
					),
				);

			const result = metrics[0] || {
				totalIncidentsDetected: 0,
				totalIncidentsPrevented: 0,
				avgTimeToRestoreMs: null,
				totalSnapshotsCreated: 0,
				totalSnapshotsRestored: 0,
				totalBytesSaved: 0,
				totalHighSeverityRisks: 0,
				totalMediumSeverityRisks: 0,
				totalLowSeverityRisks: 0,
				totalApiCalls: 0,
				totalApiErrors: 0,
				activeUsers: 0,
			};

			return {
				totalIncidentsDetected: Number(result.totalIncidentsDetected) || 0,
				totalIncidentsPrevented: Number(result.totalIncidentsPrevented) || 0,
				avgTimeToRestoreMs: result.avgTimeToRestoreMs ? Number(result.avgTimeToRestoreMs) : null,
				totalSnapshotsCreated: Number(result.totalSnapshotsCreated) || 0,
				totalSnapshotsRestored: Number(result.totalSnapshotsRestored) || 0,
				totalBytesSaved: Number(result.totalBytesSaved) || 0,
				totalHighSeverityRisks: Number(result.totalHighSeverityRisks) || 0,
				totalMediumSeverityRisks: Number(result.totalMediumSeverityRisks) || 0,
				totalLowSeverityRisks: Number(result.totalLowSeverityRisks) || 0,
				totalApiCalls: Number(result.totalApiCalls) || 0,
				totalApiErrors: Number(result.totalApiErrors) || 0,
				activeUsers: Number(result.activeUsers) || 0,
			};
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
