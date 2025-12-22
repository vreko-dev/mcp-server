/**
 * Dashboard Vitals Stats Procedure
 *
 * Returns current workspace vitals statistics for the dashboard.
 * Aggregates vitals trajectory events and critical state metrics.
 *
 * Contract: VitalsStatsResponse
 * Auth: Requires authenticated user (protectedProcedure)
 */

import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

// Response schema
const VitalsStatsResponseSchema = z.discriminatedUnion("error", [
	z.object({
		error: z.literal(false),
		data: z.object({
			currentTrajectory: z.enum(["stable", "escalating", "critical", "recovering"]),
			averagePressure: z.number(),
			averageOxygen: z.number(),
			criticalEventsToday: z.number(),
			trajectoryChanges24h: z.number(),
			lastUpdated: z.number(),
		}),
	}),
	z.object({
		error: z.literal(true),
		code: z.string(),
		message: z.string(),
	}),
]);

type VitalsStatsResponse = z.infer<typeof VitalsStatsResponseSchema>;

/**
 * Get vitals statistics for the authenticated user's workspace
 */
export const getVitalsStatsHandler = async ({ context }: { context: unknown }): Promise<VitalsStatsResponse> => {
	const userId = (context as { user?: { id: string } }).user?.id;

	if (!userId) {
		logger.warn("getVitalsStats called without authenticated user");
		return {
			error: true,
			code: "UNAUTHORIZED",
			message: "Authentication required to access vitals stats",
		};
	}

	try {
		const db = getDb();

		if (!db) {
			logger.error("Database not available for vitals stats", { userId });
			return {
				error: true,
				code: "INTERNAL_ERROR",
				message: "Failed to fetch vitals stats",
			};
		}

		const { telemetryEvents } = await import("@snapback/platform");
		const { count, eq, and, gte, sql } = await import("drizzle-orm");

		const now = new Date();
		const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		// Query vitals events from last 24 hours
		const [criticalEventsResult, trajectoryChangesResult, recentVitalsResult] = await Promise.all([
			// Count critical state events today
			db
				.select({ count: count() })
				.from(telemetryEvents)
				.where(
					and(
						eq(telemetryEvents.eventType, "vitals_critical_state"),
						eq(telemetryEvents.userId, userId),
						gte(telemetryEvents.timestamp, todayStart),
					),
				),

			// Count trajectory changes in last 24h
			db
				.select({ count: count() })
				.from(telemetryEvents)
				.where(
					and(
						eq(telemetryEvents.eventType, "vitals_trajectory_changed"),
						eq(telemetryEvents.userId, userId),
						gte(telemetryEvents.timestamp, twentyFourHoursAgo),
					),
				),

			// Get most recent vitals event for current state
			db
				.select({
					properties: telemetryEvents.properties,
					timestamp: telemetryEvents.timestamp,
				})
				.from(telemetryEvents)
				.where(
					and(
						sql`${telemetryEvents.eventType} IN ('vitals_trajectory_changed', 'vitals_critical_state')`,
						eq(telemetryEvents.userId, userId),
					),
				)
				.orderBy(sql`${telemetryEvents.timestamp} DESC`)
				.limit(1),
		]);

		const criticalEventsToday = criticalEventsResult[0]?.count ?? 0;
		const trajectoryChanges24h = trajectoryChangesResult[0]?.count ?? 0;

		// Extract current state from most recent event
		const recentEvent = recentVitalsResult[0];
		const properties = (recentEvent?.properties as Record<string, unknown>) ?? {};

		const currentTrajectory = (properties.newTrajectory as string) ?? (properties.trajectory as string) ?? "stable";

		const averagePressure = (properties.pressure as number) ?? 30;
		const averageOxygen = (properties.oxygen as number) ?? 85;

		logger.info("Vitals stats fetched", {
			userId,
			currentTrajectory,
			criticalEventsToday,
			trajectoryChanges24h,
		});

		return {
			error: false,
			data: {
				currentTrajectory: currentTrajectory as "stable" | "escalating" | "critical" | "recovering",
				averagePressure,
				averageOxygen,
				criticalEventsToday,
				trajectoryChanges24h,
				lastUpdated: recentEvent?.timestamp?.getTime() ?? Date.now(),
			},
		};
	} catch (error) {
		logger.error("Failed to fetch vitals stats", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			error: true,
			code: "INTERNAL_ERROR",
			message: "Failed to fetch vitals stats",
		};
	}
};

/**
 * Protected procedure for getting vitals stats
 */
export const getVitalsStats = protectedProcedure.handler(getVitalsStatsHandler);
