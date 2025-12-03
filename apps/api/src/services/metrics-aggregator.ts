import { logger } from "@snapback/infrastructure";
import type { NewUserDailyMetric, NewUserProductMetric } from "@snapback/platform/db/schema/snapback";
import { userDailyMetrics, userProductMetrics } from "@snapback/platform/db/schema/snapback";
import { and, eq, gte, lte, sum } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

/**
 * MetricsAggregator
 * Handles daily snapshot metrics collection and lifetime aggregation
 * Supports:
 * - Recording daily snapshots, restores, time saved, AI sessions
 * - Rolling up daily metrics to user_product_metrics (lifetime + 7d/30d windows)
 * - Query-efficient aggregations with proper indexes
 */
export class MetricsAggregator {
	constructor(private db: PgDatabase) {}

	/**
	 * Record a daily metric snapshot for a user
	 * If the date already exists, updates the values (supports upsert semantics)
	 */
	async recordDailyMetric(userId: string, metric: NewUserDailyMetric): Promise<NewUserDailyMetric> {
		try {
			const result = await this.db
				.insert(userDailyMetrics)
				.values({
					...metric,
					userId,
					date: new Date(metric.date as unknown as string),
				})
				.onConflictDoUpdate({
					target: [userDailyMetrics.userId, userDailyMetrics.date],
					set: {
						snapshotsCreated: metric.snapshotsCreated || 0,
						snapshotsRestored: metric.snapshotsRestored || 0,
						minutesSavedEstimate: metric.minutesSavedEstimate || 0,
						aiSessions: metric.aiSessions || 0,
						updatedAt: new Date(),
					},
				})
				.returning();

			return result[0];
		} catch (error) {
			logger.error("Failed to record daily metric", {
				userId,
				metric,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Aggregate daily metrics to lifetime totals and rolling windows
	 * Should be called once per day (e.g., via cron)
	 */
	async aggregateToProductMetrics(userId: string): Promise<NewUserProductMetric | null> {
		try {
			const now = new Date();
			const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

			// Get lifetime totals
			const lifetimeResults = await this.db
				.select({
					totalSnapshots: sum(userDailyMetrics.snapshotsCreated),
					totalRestores: sum(userDailyMetrics.snapshotsRestored),
					totalMinutesSaved: sum(userDailyMetrics.minutesSavedEstimate),
					totalAiSessions: sum(userDailyMetrics.aiSessions),
				})
				.from(userDailyMetrics)
				.where(eq(userDailyMetrics.userId, userId));

			// Get 7-day rolling window
			const sevenDayResults = await this.db
				.select({
					snapshots7d: sum(userDailyMetrics.snapshotsCreated),
					restores7d: sum(userDailyMetrics.snapshotsRestored),
					minutesSaved7d: sum(userDailyMetrics.minutesSavedEstimate),
					aiSessions7d: sum(userDailyMetrics.aiSessions),
				})
				.from(userDailyMetrics)
				.where(and(eq(userDailyMetrics.userId, userId), gte(userDailyMetrics.date, sevenDaysAgo)));

			// Get 30-day rolling window
			const thirtyDayResults = await this.db
				.select({
					snapshots30d: sum(userDailyMetrics.snapshotsCreated),
					restores30d: sum(userDailyMetrics.snapshotsRestored),
				})
				.from(userDailyMetrics)
				.where(and(eq(userDailyMetrics.userId, userId), gte(userDailyMetrics.date, thirtyDaysAgo)));

			// Get last activity timestamps
			const lastActivityResults = await this.db
				.select({
					lastSnapshotAt: userDailyMetrics.date,
					lastRestoreAt: userDailyMetrics.date,
				})
				.from(userDailyMetrics)
				.where(eq(userDailyMetrics.userId, userId))
				.orderBy(userDailyMetrics.date);

			const lifetimeData = lifetimeResults[0] || {};
			const sevenDayData = sevenDayResults[0] || {};
			const thirtyDayData = thirtyDayResults[0] || {};

			const productMetric: NewUserProductMetric = {
				userId,
				snapshotsTotal: (lifetimeData.totalSnapshots as number) || 0,
				restoresTotal: (lifetimeData.totalRestores as number) || 0,
				minutesSavedTotal: (lifetimeData.totalMinutesSaved as number) || 0,
				aiSessionsTotal: (lifetimeData.totalAiSessions as number) || 0,
				snapshots7d: (sevenDayData.snapshots7d as number) || 0,
				restores7d: (sevenDayData.restores7d as number) || 0,
				minutesSaved7d: (sevenDayData.minutesSaved7d as number) || 0,
				aiSessions7d: (sevenDayData.aiSessions7d as number) || 0,
				snapshots30d: (thirtyDayData.snapshots30d as number) || 0,
				restores30d: (thirtyDayData.restores30d as number) || 0,
				lastSnapshotAt: lastActivityResults[lastActivityResults.length - 1]?.lastSnapshotAt || null,
				lastRestoreAt: lastActivityResults[lastActivityResults.length - 1]?.lastRestoreAt || null,
			};

			// Upsert into user_product_metrics
			const result = await this.db
				.insert(userProductMetrics)
				.values(productMetric)
				.onConflictDoUpdate({
					target: [userProductMetrics.userId],
					set: productMetric,
				})
				.returning();

			return result[0] || null;
		} catch (error) {
			logger.error("Failed to aggregate product metrics", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Get lifetime metrics for a user
	 */
	async getUserLifetimeMetrics(userId: string): Promise<NewUserProductMetric | null> {
		try {
			const result = await this.db
				.select()
				.from(userProductMetrics)
				.where(eq(userProductMetrics.userId, userId))
				.limit(1);

			return result[0] || null;
		} catch (error) {
			logger.error("Failed to get lifetime metrics", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Get daily metrics for a specific date range
	 */
	async getDailyMetricsForRange(userId: string, startDate: Date, endDate: Date): Promise<NewUserDailyMetric[]> {
		try {
			const result = await this.db
				.select()
				.from(userDailyMetrics)
				.where(
					and(
						eq(userDailyMetrics.userId, userId),
						gte(userDailyMetrics.date, startDate),
						lte(userDailyMetrics.date, endDate),
					),
				)
				.orderBy(userDailyMetrics.date);

			return result;
		} catch (error) {
			logger.error("Failed to get daily metrics range", {
				userId,
				startDate,
				endDate,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
}
