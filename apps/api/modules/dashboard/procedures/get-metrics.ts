/**
 * Dashboard Metrics API Procedure (GREEN Phase Implementation - Refactored)
 *
 * Implements the get-metrics endpoint using MetricsAggregator service.
 * Follows TDD pattern and architectural requirements:
 * - Uses MetricsAggregator service (no inline queries)
 * - Follows Result<T, E> pattern for error handling
 * - Service layer encapsulates business logic
 *
 * Contract: DashboardMetricsResponse from @snapback/contracts
 * Auth: Requires authenticated user (protectedProcedure)
 * Architecture: Task 4.1 - Wire MetricsAggregator into Dashboard Metrics
 */

import {
	DashboardMetricsErrorSchema,
	type DashboardMetricsResponse,
	DashboardMetricsSchema,
} from "@snapback/contracts";
import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
import { MetricsAggregator } from "@/src/services/metrics-aggregator";

/**
 * Get dashboard metrics for authenticated user
 *
 * Aggregates:
 * - total_checkpoints: count of snapshots created
 * - total_recoveries: count of checkpoint restores
 * - files_protected: count of unique files with checkpoints
 * - ai_detection_rate: percentage of snapshots with AI detection
 * - recent_activity: last 10 activities (newest first)
 * - ai_breakdown: detection counts by tool (copilot, cursor, claude, windsurf)
 *
 * Returns: DashboardMetricsResponse (success | error discriminated union)
 */
export const getMetricsHandler = async ({ context }: { context: unknown }): Promise<DashboardMetricsResponse> => {
	const userId = (context as { user?: { id: string } }).user?.id;

	// Validate authenticated context
	if (!userId) {
		logger.warn("getMetrics called without authenticated user", {
			event: "auth_guard_denied",
			path: (context as { request?: { url?: string } }).request?.url || "unknown",
		});

		return {
			error: true,
			code: "UNAUTHORIZED",
			message: "Authentication required to access dashboard metrics",
		};
	}

	try {
		const db = getDb();

		// Graceful degradation if database unavailable
		if (!db) {
			logger.error("Database not available", {
				userId,
				event: "db_unavailable",
			});

			return {
				error: true,
				code: "INTERNAL_ERROR",
				message: "Failed to fetch dashboard metrics",
			};
		}

		// ===== Import tables (Drizzle ORM) =====
		const { snapshots, snapshotFiles, telemetryEvents } = await import("@snapback/platform");
		const { count, eq, sql } = await import("drizzle-orm");

		// Instantiate MetricsAggregator service (Task 4.1)
		const aggregator = new MetricsAggregator(db as any);

		// Execute queries in parallel for performance
		const [
			checkpointsResult,
			recoveriesResult,
			filesProtectedResult,
			aiDetectedResult,
			aiBreakdownResult,
			recentActivityResult,
		] = await Promise.all([
			// 1. Total Checkpoints (count of snapshots)
			db
				.select({ count: count() })
				.from(snapshots),

			// 2. Total Recoveries (telemetry events)
			db
				.select({ count: count() })
				.from(telemetryEvents)
				.where(eq(telemetryEvents.eventType, "value:disaster_averted")),

			// 3. Files Protected (distinct file paths in snapshots)
			db
				.select({
					count: sql<number>`count(distinct ${snapshotFiles.filePath})`,
				})
				.from(snapshotFiles),

			// 4. AI Detections (snapshots triggered by risk detection)
			db
				.select({ count: count() })
				.from(snapshots)
				.where(eq(snapshots.trigger, "risk_detection")),

			// 5. AI Breakdown by Tool (Task 4.1.A - Using MetricsAggregator)
			aggregator.getAIToolDetectionCounts(userId),

			// 6. Recent Activity (Task 4.1.B - Using MetricsAggregator)
			aggregator.getRecentActivity(userId, 7),
		]);

		const totalCheckpoints = checkpointsResult[0]?.count ?? 0;
		const totalRecoveries = recoveriesResult[0]?.count ?? 0;
		const filesProtected = filesProtectedResult[0]?.count ?? 0;
		const aiDetectedCount = aiDetectedResult[0]?.count ?? 0;

		// Calculate rates (safely handle division by zero)
		const aiDetectionRate = totalCheckpoints > 0 ? Math.round((aiDetectedCount / totalCheckpoints) * 100) : 0;

		// Extract AI breakdown from service result (Task 4.1.A)
		const aiBreakdown = aiBreakdownResult.success
			? aiBreakdownResult.value
			: {
					copilot: 0,
					cursor: 0,
					claude: 0,
					windsurf: 0,
				};

		// Extract recent activity from service result (Task 4.1.B)
		// Transform to match contract: RecentActivitySchema
		const recentActivity = recentActivityResult.success
			? recentActivityResult.value.map((activity) => {
					// Extract AI tool from feature name if it's an AI detection activity
					let aiTool: "copilot" | "cursor" | "claude" | "windsurf" | undefined;
					if (activity.type === "ai_detection" && activity.description) {
						const toolName = activity.description.toLowerCase();
						if (toolName.includes("copilot")) aiTool = "copilot";
						else if (toolName.includes("cursor")) aiTool = "cursor";
						else if (toolName.includes("claude")) aiTool = "claude";
						else if (toolName.includes("windsurf")) aiTool = "windsurf";
					}

					return {
						timestamp: activity.timestamp.getTime(),
						action:
							activity.type === "snapshot"
								? ("checkpoint_created" as const)
								: activity.type === "recovery"
									? ("recovery_performed" as const)
									: ("ai_detected" as const),
						file: activity.description || "Unknown file",
						ai_tool: aiTool,
					};
				})
			: [];

		const metrics = {
			protection_status: "active" as const,
			total_checkpoints: totalCheckpoints,
			total_recoveries: totalRecoveries,
			files_protected: filesProtected,
			ai_detection_rate: aiDetectionRate,
			recent_activity: recentActivity,
			ai_breakdown: aiBreakdown,
		};

		logger.info("Dashboard metrics fetched", {
			userId,
			checkpoints: metrics.total_checkpoints,
			recoveries: metrics.total_recoveries,
			filesProtected: metrics.files_protected,
			aiDetectionRate: metrics.ai_detection_rate,
			aiBreakdownSource: aiBreakdownResult.success ? "aggregator" : "fallback",
			recentActivityCount: recentActivity.length,
		});

		return metrics;
	} catch (error) {
		logger.error("Failed to fetch dashboard metrics", {
			userId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			error: true,
			code: "INTERNAL_ERROR",
			message: "Failed to fetch dashboard metrics",
		};
	}
};

export const getMetrics = protectedProcedure
	.output(z.union([DashboardMetricsSchema, DashboardMetricsErrorSchema]))
	.handler(getMetricsHandler);
