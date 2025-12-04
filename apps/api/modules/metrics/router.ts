import { logger } from "@snapback/infrastructure";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { publicProcedure } from "../../orpc/procedures.js";

// MetricsAggregator has been removed - this router is deprecated
// TODO: Re-implement metrics aggregation or remove this router

/**
 * Metrics Router
 * Exposes user metrics endpoints for dashboard and analytics
 * Endpoints:
 * - GET /metrics/my-usage: Get current user's metrics
 * - GET /metrics/my-timeline: Get daily metrics timeline
 * - GET /metrics/my-limits: Get usage limits
 */
export function createMetricsRouter(_db: PgDatabase<any>) {
	// Aggregator removed - returning stub implementation
	// const aggregator = new MetricsAggregator(db);

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
					// TODO: Re-implement metrics aggregation
					const metrics: {
						snapshotsTotal: number;
						restoresTotal: number;
						minutesSavedTotal: number;
						aiSessionsTotal: number;
						snapshots7d: number;
						restores7d: number;
						minutesSaved7d: number;
						aiSessions7d: number;
						snapshots30d: number;
						restores30d: number;
						lastSnapshotAt: Date | null;
						lastRestoreAt: Date | null;
					} | null = null; // await aggregator.getUserLifetimeMetrics(input.userId);

					if (!metrics) {
						return {
							success: true,
							data: null,
							error: null,
						};
					}

					// TypeScript needs help with type narrowing here
					// Since this is stub code with metrics = null, we use type assertion
					const validMetrics = metrics as any;

					return {
						success: true,
						data: {
							snapshotsTotal: validMetrics.snapshotsTotal,
							restoresTotal: validMetrics.restoresTotal,
							minutesSavedTotal: validMetrics.minutesSavedTotal,
							aiSessionsTotal: validMetrics.aiSessionsTotal,
							snapshots7d: validMetrics.snapshots7d,
							restores7d: validMetrics.restores7d,
							minutesSaved7d: validMetrics.minutesSaved7d,
							aiSessions7d: validMetrics.aiSessions7d,
							snapshots30d: validMetrics.snapshots30d,
							restores30d: validMetrics.restores30d,
							lastSnapshotAt: validMetrics.lastSnapshotAt,
							lastRestoreAt: validMetrics.lastRestoreAt,
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
						error:
							error instanceof Error
								? error.message
								: "Failed to fetch metrics",
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
					// TODO: Re-implement metrics aggregation
					const dailyMetrics: any[] = [];
					// Original: await aggregator.getDailyMetricsForRange(input.userId, new Date(input.startDate), new Date(input.endDate))

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
						error:
							error instanceof Error
								? error.message
								: "Failed to fetch timeline",
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
					// TODO: Re-implement metrics aggregation
					const metrics: {
						snapshots30d?: number;
						restores30d?: number;
						aiSessions7d?: number;
					} | null = null; // await aggregator.getUserLifetimeMetrics(input.userId);

					if (!metrics) {
						return {
							success: true,
							data: null,
							error: null,
						};
					}

					// TypeScript needs help with type narrowing here
					// Since this is stub code with metrics = null, we use type assertion
					const validMetrics = metrics as any;

					// Default limits for free tier
					const monthlySnapshotLimit = 100;
					const monthlyRestoreLimit = 50;
					const aiSessionsLimit = 20;

					const percentageUsed = Math.round(
						((validMetrics.snapshots30d ?? 0) / monthlySnapshotLimit) * 100,
					);

					return {
						success: true,
						data: {
							tier: "free",
							monthlySnapshotLimit,
							monthlyRestoreLimit,
							aiSessionsLimit,
							snapshotsUsedThisMonth: validMetrics.snapshots30d,
							restoresUsedThisMonth: validMetrics.restores30d,
							aiSessionsUsedThisMonth: validMetrics.aiSessions7d,
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
						error:
							error instanceof Error ? error.message : "Failed to fetch limits",
					};
				}
			}),
	};
}
