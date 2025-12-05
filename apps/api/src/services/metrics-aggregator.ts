import { logger } from "@snapback/infrastructure";
import type { PgDatabase} from "drizzle-orm/pg-core";
import { and, eq, gte, lte } from "drizzle-orm";
import { userProductMetrics, userDailyMetrics } from "@snapback/platform/db/schema/snapback";

/**
 * Metrics Aggregator
 *
 * Provides type-safe metrics aggregation from database tables with
 * Result<T, E> pattern for proper error handling.
 *
 * Data flow:
 * 1. Raw events → userDailyMetrics (nightly aggregation)
 * 2. userDailyMetrics → userProductMetrics (lifetime + rolling windows)
 * 3. This service queries the aggregated tables
 */

// Types
export interface UserLifetimeMetrics {
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
}

export interface DailyMetric {
	date: Date;
	snapshotsCreated: number;
	snapshotsRestored: number;
	minutesSavedEstimate: number;
	aiSessions: number;
}

export class MetricsError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "MetricsError";
	}
}

// Result type for metrics operations
export type MetricsResult<T> =
	| { success: true; value: T }
	| { success: false; error: MetricsError };

/**
 * Metrics Aggregator Service
 */
export class MetricsAggregator {
	constructor(private readonly db: PgDatabase<any>) {}

	/**
	 * Get user's lifetime metrics including rolling windows
	 */
	async getUserLifetimeMetrics(
		userId: string,
	): Promise<MetricsResult<UserLifetimeMetrics | null>> {
		try {
			if (!userId || userId.trim() === "") {
				return {
					success: false,
					error: new MetricsError(
						"User ID required",
						"MISSING_USER_ID",
					),
				};
			}

			const result = await this.db
				.select()
				.from(userProductMetrics)
				.where(eq(userProductMetrics.userId, userId))
				.limit(1);

			if (result.length === 0) {
				// User exists but has no metrics yet
				logger.debug("No metrics found for user", { userId });
				return { success: true, value: null };
			}

			const metrics = result[0];

			return {
				success: true,
				value: {
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
			};
		} catch (error) {
			logger.error("Failed to get user lifetime metrics", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				error: new MetricsError(
					"Failed to fetch metrics",
					"FETCH_FAILED",
					{
						userId,
						originalError: error instanceof Error ? error.message : String(error),
					},
				),
			};
		}
	}

	/**
	 * Get user's daily metrics for a date range
	 */
	async getDailyMetricsForRange(
		userId: string,
		startDate: Date,
		endDate: Date,
	): Promise<MetricsResult<DailyMetric[]>> {
		try {
			if (!userId || userId.trim() === "") {
				return {
					success: false,
					error: new MetricsError(
						"User ID required",
						"MISSING_USER_ID",
					),
				};
			}

			if (startDate > endDate) {
				return {
					success: false,
					error: new MetricsError(
						"Start date must be before end date",
						"INVALID_DATE_RANGE",
						{ startDate, endDate },
					),
				};
			}

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

			const dailyMetrics: DailyMetric[] = result.map((row) => ({
				date: row.date,
				snapshotsCreated: row.snapshotsCreated,
				snapshotsRestored: row.snapshotsRestored,
				minutesSavedEstimate: row.minutesSavedEstimate,
				aiSessions: row.aiSessions,
			}));

			logger.debug("Retrieved daily metrics", {
				userId,
				startDate,
				endDate,
				count: dailyMetrics.length,
			});

			return {
				success: true,
				value: dailyMetrics,
			};
		} catch (error) {
			logger.error("Failed to get daily metrics", {
				userId,
				startDate,
				endDate,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				error: new MetricsError(
					"Failed to fetch daily metrics",
					"FETCH_FAILED",
					{
						userId,
						startDate,
						endDate,
						originalError: error instanceof Error ? error.message : String(error),
					},
				),
			};
		}
	}

	/**
	 * Get metrics for the last N days
	 */
	async getRecentDailyMetrics(
		userId: string,
		days: number = 30,
	): Promise<MetricsResult<DailyMetric[]>> {
		try {
			if (days < 1 || days > 365) {
				return {
					success: false,
					error: new MetricsError(
						"Days must be between 1 and 365",
						"INVALID_DAYS",
						{ days },
					),
				};
			}

			const endDate = new Date();
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - days);

			return await this.getDailyMetricsForRange(userId, startDate, endDate);
		} catch (error) {
			logger.error("Failed to get recent daily metrics", {
				userId,
				days,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				error: new MetricsError(
					"Failed to fetch recent metrics",
					"FETCH_FAILED",
					{
						userId,
						days,
						originalError: error instanceof Error ? error.message : String(error),
					},
				),
			};
		}
	}

	/**
	 * Initialize metrics entry for a new user
	 * Returns existing metrics if user already has entry
	 */
	async initializeUserMetrics(
		userId: string,
	): Promise<MetricsResult<UserLifetimeMetrics>> {
		try {
			if (!userId || userId.trim() === "") {
				return {
					success: false,
					error: new MetricsError(
						"User ID required",
						"MISSING_USER_ID",
					),
				};
			}

			// Check if user already has metrics
			const existing = await this.getUserLifetimeMetrics(userId);
			if (existing.success && existing.value) {
				return { success: true, value: existing.value };
			}

			// Create new metrics entry
			const newMetrics: UserLifetimeMetrics = {
				snapshotsTotal: 0,
				restoresTotal: 0,
				minutesSavedTotal: 0,
				aiSessionsTotal: 0,
				snapshots7d: 0,
				restores7d: 0,
				minutesSaved7d: 0,
				aiSessions7d: 0,
				snapshots30d: 0,
				restores30d: 0,
				lastSnapshotAt: null,
				lastRestoreAt: null,
			};

			await this.db.insert(userProductMetrics).values({
				userId,
				...newMetrics,
			});

			logger.info("Initialized user metrics", { userId });

			return {
				success: true,
				value: newMetrics,
			};
		} catch (error) {
			logger.error("Failed to initialize user metrics", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				error: new MetricsError(
					"Failed to initialize metrics",
					"INIT_FAILED",
					{
						userId,
						originalError: error instanceof Error ? error.message : String(error),
					},
				),
			};
		}
	}
}
