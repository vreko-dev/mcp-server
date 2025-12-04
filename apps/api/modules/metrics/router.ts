import { logger } from "@snapback/infrastructure";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { publicProcedure } from "../../orpc/procedures.js";
import { MetricsAggregator } from "../../src/services/metrics-aggregator.js";

/**
 * Metrics Router
 * Exposes user metrics endpoints for dashboard and analytics
 * Endpoints:
 * - GET /metrics/my-usage: Get current user's metrics
 * - GET /metrics/my-timeline: Get daily metrics timeline
 * - GET /metrics/my-limits: Get usage limits
 */
export function createMetricsRouter(db: PgDatabase<any>) {
	const aggregator = new MetricsAggregator(db);

	return {
		/**
		 * Get current user's aggregated metrics
		 * Returns lifetime + rolling window stats
		 */
		getMyUsage: publicProcedure
			.input(
				z.object({
					userId: z.string().min(1, "User ID required"),
				}),
			)
			.handler(async ({ input }) => {
				try {
					const metrics = await aggregator.getUserLifetimeMetrics(input.userId);

					if (!metrics) {
						return {
							success: true,
							data: null,
							error: null,
						};
					}

					return {
						success: true,
						data: {
							snapshotsTotal: metrics.snapshotsTotal,
							restoresTotal: metrics.restoresTotal,
							minutesSavedTotal: metrics.minutesSavedTotal,
							aiSessionsTotal: metrics.aiSessionsTotal,
							snapshots7d: metrics.snapshots7d,
							restores7d: metrics.restores7d,
							minutesSaved7d: metrics.minutesSaved7d,
							aiSessions7d: metrics.aiSessions7d,
							snapshots30d: metrics.snapshots30d,
							restores30d: metrics.restores30d,
							lastSnapshotAt: metrics.lastSnapshotAt,
							lastRestoreAt: metrics.lastRestoreAt,
						},
						error: null,
					};
				} catch (error) {
					logger.error("Failed to get user usage metrics", {
						userId: input.userId,
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						success: false,
						data: null,
						error: error instanceof Error ? error.message : "Failed to fetch metrics",
					};
				}
			}),

		/**
		 * Get user's daily metrics timeline
		 * Returns daily snapshots for charting/visualization
		 */
		getMyTimeline: publicProcedure
			.input(
				z.object({
					userId: z.string().min(1, "User ID required"),
					startDate: z.string().datetime(),
					endDate: z.string().datetime(),
				}),
			)
			.handler(async ({ input }) => {
				try {
					const dailyMetrics = await aggregator.getDailyMetricsForRange(
						input.userId,
						new Date(input.startDate),
						new Date(input.endDate),
					);

					return {
						success: true,
						data: dailyMetrics.map((metric: any) => ({
							date: metric.date as Date,
							snapshotsCreated: metric.snapshotsCreated,
							snapshotsRestored: metric.snapshotsRestored,
							minutesSavedEstimate: metric.minutesSavedEstimate,
							aiSessions: metric.aiSessions,
						})),
						error: null,
					};
				} catch (error) {
					logger.error("Failed to get user timeline metrics", {
						userId: input.userId,
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						success: false,
						data: null,
						error: error instanceof Error ? error.message : "Failed to fetch timeline",
					};
				}
			}),

		/**
		 * Get user's usage limits (subscription tier dependent)
		 * Returns monthly limits and current usage
		 */
		getMyUsageLimits: publicProcedure
			.input(
				z.object({
					userId: z.string().min(1, "User ID required"),
				}),
			)
			.handler(async ({ input }) => {
				try {
					// Placeholder: In real implementation, fetch from user.subscriptionTier
					// and calculate current month usage
					const metrics = await aggregator.getUserLifetimeMetrics(input.userId);

					if (!metrics) {
						return {
							success: true,
							data: null,
							error: null,
						};
					}

					// Default limits for free tier
					const monthlySnapshotLimit = 100;
					const monthlyRestoreLimit = 50;
					const aiSessionsLimit = 20;

					const percentageUsed = Math.round(((metrics.snapshots30d ?? 0) / monthlySnapshotLimit) * 100);

					return {
						success: true,
						data: {
							tier: "free",
							monthlySnapshotLimit,
							monthlyRestoreLimit,
							aiSessionsLimit,
							snapshotsUsedThisMonth: metrics.snapshots30d,
							restoresUsedThisMonth: metrics.restores30d,
							aiSessionsUsedThisMonth: metrics.aiSessions7d,
							percentageUsed: Math.min(percentageUsed, 100),
						},
						error: null,
					};
				} catch (error) {
					logger.error("Failed to get usage limits", {
						userId: input.userId,
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						success: false,
						data: null,
						error: error instanceof Error ? error.message : "Failed to fetch limits",
					};
				}
			}),
	};
}
