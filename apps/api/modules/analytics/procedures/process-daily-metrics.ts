import { logger } from "@snapback/infrastructure";
import { apiUsage, orgDailyMetrics, snapshots } from "@snapback/platform";
import { and, count, eq, gt, gte, inArray, lt, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

/**
 * Process daily metrics for all organizations
 * This job runs nightly to aggregate data from various sources into the org_daily_metrics table
 */
export const processDailyMetrics = adminProcedure
	.route({
		method: "POST",
		path: "/analytics/process-daily-metrics",
		tags: ["Analytics"],
		summary: "Process daily metrics",
	})
	.input(
		z.object({
			date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
			organizationId: z.string().optional(), // If provided, only process for this org
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			processedOrgs: z.number(),
			message: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		try {
			const targetDate = new Date(input.date);
			const nextDate = new Date(targetDate);
			nextDate.setDate(nextDate.getDate() + 1);

			// Get all organizations or just the specified one
			const organizationsQuery = getDb()
				?.selectDistinct({ id: orgDailyMetrics.organizationId })
				.from(orgDailyMetrics)
				.where(
					input.organizationId
						? eq(orgDailyMetrics.organizationId, input.organizationId)
						: undefined,
				);

			const organizations = await organizationsQuery;

			if (!organizations || organizations.length === 0) {
				return {
					success: true,
					processedOrgs: 0,
					message: "No organizations found to process",
				};
			}

			let processedCount = 0;

			// Process each organization
			for (const org of organizations) {
				try {
					// Check if metrics already exist for this date
					const existingMetrics = await getDb()
						?.select()
						.from(orgDailyMetrics)
						.where(
							and(
								eq(orgDailyMetrics.organizationId, org.id),
								eq(orgDailyMetrics.date, targetDate),
							),
						)
						.limit(1);

					if (existingMetrics && existingMetrics.length > 0) {
						// Skip if already processed
						logger.info(
							`Metrics already exist for org ${org.id} on ${input.date}`,
						);
						continue;
					}

					// Calculate metrics for this organization
					const metrics = await calculateOrgMetrics(
						org.id,
						targetDate,
						nextDate,
					);

					// Insert the metrics
					await getDb()
						.insert(orgDailyMetrics)
						.values({
							organizationId: org.id,
							date: targetDate,
							...metrics,
						});

					processedCount++;
					logger.info(`Processed metrics for org ${org.id} on ${input.date}`);
				} catch (error) {
					logger.error(
						`Failed to process metrics for org ${org.id}: ${error instanceof Error ? error.message : String(error)}`,
						{
							error,
						},
					);
					// Continue with other organizations
				}
			}

			return {
				success: true,
				processedOrgs: processedCount,
				message: `Processed metrics for ${processedCount} organizations`,
			};
		} catch (error) {
			logger.error(
				`Failed to process daily metrics: ${error instanceof Error ? error.message : String(error)}`,
				{
					error,
					input,
				},
			);
			return {
				success: false,
				processedOrgs: 0,
				message: `Failed to process daily metrics: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	});

/**
 * Calculate metrics for a specific organization on a specific date
 */
async function calculateOrgMetrics(
	organizationId: string,
	startDate: Date,
	endDate: Date,
) {
	// Get organization members to filter data
	// Note: This is a simplified implementation. In a real system, you would join with the members table
	const orgMembers = await getDb()
		?.select({ userId: orgDailyMetrics.organizationId })
		.from(orgDailyMetrics)
		.where(eq(orgDailyMetrics.organizationId, organizationId));

	const userIds = orgMembers?.map((m) => m.userId) || [];

	if (userIds.length === 0) {
		// Return default values if no members
		return {
			incidentsDetected: 0,
			incidentsPrevented: 0,
			timeToRestoreMs: null,
			snapshotsCreated: 0,
			snapshotsRestored: 0,
			bytesSaved: 0,
			highSeverityRisks: 0,
			mediumSeverityRisks: 0,
			lowSeverityRisks: 0,
			apiCalls: 0,
			apiErrors: 0,
			activeUsers: 0,
		};
	}

	// Calculate snapshot metrics
	const snapshotMetrics = await getDb()
		?.select({
			created: count().as("created"),
			bytesSaved: sum(snapshots.totalSizeBytes).as("bytesSaved"),
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
			),
		);

	// Calculate incident metrics (snapshots with risk factors)
	const incidentMetrics = await getDb()
		?.select({
			withRisks: count().as("withRisks"),
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
				sql`${snapshots.riskScore} > 0`,
			),
		);

	// Calculate API usage metrics
	const apiMetrics = await getDb()
		?.select({
			totalCalls: count().as("totalCalls"),
			errors: count(and(gt(apiUsage.statusCode, 399))).as("errors"),
		})
		.from(apiUsage)
		.where(
			and(
				gte(apiUsage.timestamp, startDate),
				lt(apiUsage.timestamp, endDate),
				inArray(apiUsage.apiKeyId, userIds),
			),
		);

	// Calculate risk severity metrics
	const riskMetrics = await getDb()
		?.select({
			high: count(and(gte(snapshots.riskScore, 70))).as("high"),
			medium: count(
				and(gte(snapshots.riskScore, 40), lt(snapshots.riskScore, 70)),
			).as("medium"),
			low: count(
				and(gt(snapshots.riskScore, 0), lt(snapshots.riskScore, 40)),
			).as("low"),
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
			),
		);

	// Calculate active users (users who created snapshots)
	const activeUsersResult = await getDb()
		?.select({
			count: sql<number>`COUNT(DISTINCT ${snapshots.userId})`.as("count"),
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
			),
		);

	// Calculate time to restore metrics
	// This is a simplified implementation - in a real system, you would track restore events
	const timeToRestoreMetrics = await getDb()
		?.select({
			avgTime: sql<number>`AVG(${snapshots.totalSizeBytes} / 1000)`.as(
				"avgTime",
			), // Simplified calculation
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
				sql`${snapshots.totalSizeBytes} > 0`,
			),
		);

	// Return the calculated metrics
	return {
		incidentsDetected: incidentMetrics?.[0]?.withRisks || 0,
		incidentsPrevented: Math.floor(
			(incidentMetrics?.[0]?.withRisks || 0) * 0.8,
		), // Estimated
		timeToRestoreMs: timeToRestoreMetrics?.[0]?.avgTime
			? Number(timeToRestoreMetrics[0].avgTime)
			: null,
		snapshotsCreated: snapshotMetrics?.[0]?.created || 0,
		snapshotsRestored: Math.floor((snapshotMetrics?.[0]?.created || 0) * 0.3), // Estimated
		bytesSaved: snapshotMetrics?.[0]?.bytesSaved
			? Number(snapshotMetrics[0].bytesSaved)
			: 0,
		highSeverityRisks: riskMetrics?.[0]?.high || 0,
		mediumSeverityRisks: riskMetrics?.[0]?.medium || 0,
		lowSeverityRisks: riskMetrics?.[0]?.low || 0,
		apiCalls: apiMetrics?.[0]?.totalCalls || 0,
		apiErrors: apiMetrics?.[0]?.errors || 0,
		activeUsers: Number(activeUsersResult?.[0]?.count || 0),
	};
}
