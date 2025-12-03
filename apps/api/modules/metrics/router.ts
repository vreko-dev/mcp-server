import { procedure, router } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { MetricsAggregator } from "../../services/metrics-aggregator";

/**
 * Metrics Router
 * Exposes user metrics endpoints for dashboard and analytics
 * Endpoints:
 * - GET /metrics/my-usage: Get current user's metrics
 * - GET /metrics/my-timeline: Get daily metrics timeline
 * - GET /metrics/my-limits: Get usage limits
 */
export function createMetricsRouter(db: PgDatabase) {
	const aggregator = new MetricsAggregator(db);

	return router({
		/**
		 * Get current user's aggregated metrics
		 * Returns lifetime + rolling window stats
		 */
		getMyUsage: procedure
			.input(
				z.object({
					userId: z.string().min(1, "User ID required"),
				}),
			)
			.output(
				z.object({
					success: z.boolean(),
					data: z
						.object({
							snapshotsTotal: z.number(),
							restoresTotal: z.number(),
							minutesSavedTotal: z.number(),
							aiSessionsTotal: z.number(),
							snapshots7d: z.number(),
							restores7d: z.number(),
							minutesSaved7d: z.number(),
							aiSessions7d: z.number(),
							snapshots30d: z.number(),
							restores30d: z.number(),
							lastSnapshotAt: z.date().nullable(),
							lastRestoreAt: z.date().nullable(),
						})
						.nullable(),
					error: z.string().nullable(),
				}),
			)
			.query(async ({ input }) => {
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
		getMyTimeline: procedure
			.input(
				z.object({
					userId: z.string().min(1, "User ID required"),
					startDate: z.string().datetime(),
					endDate: z.string().datetime(),
				}),
			)
			.output(
				z.object({
					success: z.boolean(),
					data: z
						.array(
							z.object({
								date: z.date(),
								snapshotsCreated: z.number(),
								snapshotsRestored: z.number(),
								minutesSavedEstimate: z.number(),
								aiSessions: z.number(),
							}),
						)
						.nullable(),
					error: z.string().nullable(),
				}),
			)
			.query(async ({ input }) => {
				try {
					const dailyMetrics = await aggregator.getDailyMetricsForRange(
						input.userId,
						new Date(input.startDate),
						new Date(input.endDate),
					);

					return {
						success: true,
						data: dailyMetrics.map((metric) => ({
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
		getMyUsageLimits: procedure
			.input(
				z.object({
					userId: z.string().min(1, "User ID required"),
				}),
			)
			.output(
				z.object({
					success: z.boolean(),
					data: z
						.object({
							tier: z.enum(["free", "solo", "team", "enterprise"]),
							monthlySnapshotLimit: z.number(),
							monthlyRestoreLimit: z.number(),
							aiSessionsLimit: z.number(),
							snapshotsUsedThisMonth: z.number(),
							restoresUsedThisMonth: z.number(),
							aiSessionsUsedThisMonth: z.number(),
							percentageUsed: z.number().min(0).max(100),
						})
						.nullable(),
					error: z.string().nullable(),
				}),
			)
			.query(async ({ input }) => {
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

					const percentageUsed = Math.round((metrics.snapshots30d / monthlySnapshotLimit) * 100);

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
	});
}
