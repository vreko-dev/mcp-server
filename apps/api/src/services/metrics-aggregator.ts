import { logger } from "@snapback/infrastructure";
import { featureUsage, snapshots, userDailyMetrics, userProductMetrics } from "@snapback/platform/db/schema/snapback";
import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

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

export interface AIToolBreakdown {
	copilot: number;
	cursor: number;
	claude: number;
	windsurf: number;
}

export interface RecentActivity {
	type: "snapshot" | "ai_detection" | "recovery";
	timestamp: Date;
	count: number;
	description: string | null;
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
export type MetricsResult<T> = { success: true; value: T } | { success: false; error: MetricsError };

/**
 * Metrics Aggregator Service
 */
export class MetricsAggregator {
	constructor(private readonly db: PgDatabase<any>) {}

	/**
	 * Get user's lifetime metrics including rolling windows
	 */
	async getUserLifetimeMetrics(userId: string): Promise<MetricsResult<UserLifetimeMetrics | null>> {
		try {
			if (!userId || userId.trim() === "") {
				return {
					success: false,
					error: new MetricsError("User ID required", "MISSING_USER_ID"),
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
				error: new MetricsError("Failed to fetch metrics", "FETCH_FAILED", {
					userId,
					originalError: error instanceof Error ? error.message : String(error),
				}),
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
					error: new MetricsError("User ID required", "MISSING_USER_ID"),
				};
			}

			if (startDate > endDate) {
				return {
					success: false,
					error: new MetricsError("Start date must be before end date", "INVALID_DATE_RANGE", {
						startDate,
						endDate,
					}),
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
				error: new MetricsError("Failed to fetch daily metrics", "FETCH_FAILED", {
					userId,
					startDate,
					endDate,
					originalError: error instanceof Error ? error.message : String(error),
				}),
			};
		}
	}

	/**
	 * Get metrics for the last N days
	 */
	async getRecentDailyMetrics(userId: string, days = 30): Promise<MetricsResult<DailyMetric[]>> {
		try {
			if (days < 1 || days > 365) {
				return {
					success: false,
					error: new MetricsError("Days must be between 1 and 365", "INVALID_DAYS", { days }),
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
				error: new MetricsError("Failed to fetch recent metrics", "FETCH_FAILED", {
					userId,
					days,
					originalError: error instanceof Error ? error.message : String(error),
				}),
			};
		}
	}

	/**
	 * Get AI tool detection counts grouped by tool name
	 * Task 4.1.A - GREEN Phase Implementation
	 *
	 * Queries featureUsage table where featureCategory = "ai_assistance"
	 * Groups by featureName and aggregates counts
	 * Normalizes tool names to canonical form (copilot, cursor, claude, windsurf)
	 *
	 * @param userId - User ID to query
	 * @returns Result with AIToolBreakdown (all tools initialized to 0)
	 */
	async getAIToolDetectionCounts(userId: string): Promise<MetricsResult<AIToolBreakdown>> {
		try {
			if (!userId || userId.trim() === "") {
				return {
					success: false,
					error: new MetricsError("User ID required", "MISSING_USER_ID"),
				};
			}

			// Query featureUsage table for AI assistance category
			const result = await this.db
				.select({
					featureName: featureUsage.featureName,
					count: count(),
				})
				.from(featureUsage)
				.where(and(eq(featureUsage.userId, userId), eq(featureUsage.featureCategory, "ai_assistance")))
				.groupBy(featureUsage.featureName);

			// Initialize breakdown with all tools at 0
			const breakdown: AIToolBreakdown = {
				copilot: 0,
				cursor: 0,
				claude: 0,
				windsurf: 0,
			};

			// Aggregate counts by normalized tool name
			for (const row of result) {
				const normalizedTool = this.normalizeToolName(row.featureName);
				if (normalizedTool in breakdown) {
					breakdown[normalizedTool as keyof AIToolBreakdown] += row.count;
				}
			}

			logger.debug("Retrieved AI tool detection counts", {
				userId,
				breakdown,
			});

			return {
				success: true,
				value: breakdown,
			};
		} catch (error) {
			logger.error("Failed to get AI tool detection counts", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				error: new MetricsError("Failed to fetch AI tool counts", "FETCH_FAILED", {
					userId,
					originalError: error instanceof Error ? error.message : String(error),
				}),
			};
		}
	}

	/**
	 * Get recent activity (snapshots, recoveries, AI detections)
	 * Task 4.1.B - GREEN Phase Implementation
	 *
	 * Combines snapshots and feature usage into unified activity feed
	 * Sorted by timestamp descending (newest first)
	 * Limited to 20 most recent activities
	 *
	 * @param userId - User ID to query
	 * @param days - Number of days to look back (1-365)
	 * @returns Result with RecentActivity[] sorted by timestamp DESC
	 */
	async getRecentActivity(userId: string, days = 7): Promise<MetricsResult<RecentActivity[]>> {
		try {
			if (!userId || userId.trim() === "") {
				return {
					success: false,
					error: new MetricsError("User ID required", "MISSING_USER_ID"),
				};
			}

			if (days < 1 || days > 365) {
				return {
					success: false,
					error: new MetricsError("Days must be between 1 and 365", "INVALID_DAYS", { days }),
				};
			}

			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - days);

			// Query snapshots as "snapshot" activity
			const snapshotActivity = await this.db
				.select({
					type: sql<string>`'snapshot'`,
					timestamp: snapshots.createdAt,
					count: sql<number>`1`,
					description: snapshots.description,
				})
				.from(snapshots)
				.where(and(eq(snapshots.userId, userId), gte(snapshots.createdAt, cutoffDate)));

			// Query AI detections as "ai_detection" activity
			const aiActivity = await this.db
				.select({
					type: sql<string>`'ai_detection'`,
					timestamp: featureUsage.createdAt,
					count: sql<number>`1`,
					description: featureUsage.featureName,
				})
				.from(featureUsage)
				.where(
					and(
						eq(featureUsage.userId, userId),
						eq(featureUsage.featureCategory, "ai_assistance"),
						gte(featureUsage.createdAt, cutoffDate),
					),
				);

			// Combine and sort by timestamp DESC
			const combined = [...snapshotActivity, ...aiActivity]
				.map((row) => ({
					type: row.type as "snapshot" | "ai_detection" | "recovery",
					timestamp: row.timestamp || new Date(),
					count: row.count,
					description: row.description,
				}))
				.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
				.slice(0, 20); // Limit to 20 most recent

			logger.debug("Retrieved recent activity", {
				userId,
				days,
				activityCount: combined.length,
			});

			return {
				success: true,
				value: combined,
			};
		} catch (error) {
			logger.error("Failed to get recent activity", {
				userId,
				days,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				error: new MetricsError("Failed to fetch recent activity", "FETCH_FAILED", {
					userId,
					days,
					originalError: error instanceof Error ? error.message : String(error),
				}),
			};
		}
	}

	/**
	 * Normalize tool name to canonical lowercase form
	 * Handles case variations: "GitHub Copilot", "CURSOR", "copilot" → "copilot"
	 * Safely handles null/undefined values by returning empty string
	 *
	 * @private
	 */
	private normalizeToolName(featureName: string | null | undefined): string {
		if (!featureName || typeof featureName !== "string") {
			return "";
		}

		const normalized = featureName.toLowerCase();

		// Map common variations to canonical names
		if (normalized.includes("copilot")) {
			return "copilot";
		}
		if (normalized.includes("cursor")) {
			return "cursor";
		}
		if (normalized.includes("claude")) {
			return "claude";
		}
		if (normalized.includes("windsurf")) {
			return "windsurf";
		}

		// Return as-is for unknown tools (won't match breakdown keys)
		return normalized;
	}

	/**
	 * Initialize metrics entry for a new user
	 * Returns existing metrics if user already has entry
	 */
	async initializeUserMetrics(userId: string): Promise<MetricsResult<UserLifetimeMetrics>> {
		try {
			if (!userId || userId.trim() === "") {
				return {
					success: false,
					error: new MetricsError("User ID required", "MISSING_USER_ID"),
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
				error: new MetricsError("Failed to initialize metrics", "INIT_FAILED", {
					userId,
					originalError: error instanceof Error ? error.message : String(error),
				}),
			};
		}
	}
}
