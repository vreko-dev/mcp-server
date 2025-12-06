import { logger } from "@snapback/infrastructure";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { publicProcedure } from "../../orpc/procedures";
import { MetricsAggregator } from "../../src/services/metrics-aggregator";

/**
 * Metrics Router
 * Exposes user metrics endpoints for dashboard and analytics
 * Endpoints:
 * - GET /metrics/my-usage: Get current user's metrics
 * - GET /metrics/my-timeline: Get daily metrics timeline
 * - GET /metrics/my-limits: Get usage limits
 */
// biome-ignore lint/suspicious/noExplicitAny: Drizzle generic type requires any
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
					const result = await aggregator.getUserLifetimeMetrics(input.userId);

					if (!result.success) {
						return {
							success: false,
							data: null,
							error: result.error.message,
						};
					}

					if (!result.value) {
						return {
							success: true,
							data: null,
							error: null,
						};
					}

					return {
						success: true,
						data: result.value,
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
					const result = await aggregator.getDailyMetricsForRange(
						input.userId,
						new Date(input.startDate),
						new Date(input.endDate),
					);

					if (!result.success) {
						return {
							success: false,
							data: null,
							error: result.error.message,
						};
					}

					return {
						success: true,
						data: result.value,
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
					const result = await aggregator.getUserLifetimeMetrics(input.userId);

					if (!result.success) {
						return {
							success: false,
							data: null,
							error: result.error.message,
						};
					}

					if (!result.value) {
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

					const percentageUsed = Math.round(
						((result.value.snapshots30d ?? 0) / monthlySnapshotLimit) * 100,
					);

					return {
						success: true,
						data: {
							tier: "free",
							monthlySnapshotLimit,
							monthlyRestoreLimit,
							aiSessionsLimit,
							snapshotsUsedThisMonth: result.value.snapshots30d,
							restoresUsedThisMonth: result.value.restores30d,
							aiSessionsUsedThisMonth: result.value.aiSessions7d,
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
