import { logger } from "@snapback/infrastructure";
import { db, snapbackSchema } from "@snapback/platform";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "../../../../../middleware/auth";

const { snapshots, securityEvents, apiUsageLogs } = snapbackSchema;

/**
 * GET /api/v1/analytics/metrics
 *
 * Get analytics metrics for the authenticated user
 */
export async function GET(request: NextRequest) {
	// Use the existing auth middleware to validate the request
	const authResponse = await authMiddleware(request);

	// If auth failed, return the error response
	if (authResponse.status !== 200) {
		return authResponse;
	}

	// Extract auth context from response headers
	const authContextHeader = authResponse.headers.get("x-auth-context");
	if (!authContextHeader) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const authContext = JSON.parse(authContextHeader);

	try {
		if (!db) {
			return NextResponse.json(
				{ error: "Database not available" },
				{ status: 500 },
			);
		}

		// Get time range from query params (default: last 30 days)
		const { searchParams } = new URL(request.url);
		const daysParam = searchParams.get("days");
		const days = daysParam ? Number.parseInt(daysParam, 10) : 30;

		if (days < 1 || days > 365) {
			return NextResponse.json(
				{ error: "Days parameter must be between 1 and 365" },
				{ status: 400 },
			);
		}

		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		const userId =
			authContext.type === "device"
				? `device_${authContext.deviceId}`
				: authContext.userId;

		// Execute all queries in parallel for performance
		const [
			totalSnapshotsResult,
			recentSnapshotsResult,
			securityEventsResult,
			apiUsageResult,
			topProjectsResult,
			riskDistributionResult,
		] = await Promise.all([
			// Total snapshots (all time)
			db
				.select({ count: count() })
				.from(snapshots)
				.where(eq(snapshots.userId, userId)),

			// Recent snapshots (last N days)
			db
				.select({ count: count() })
				.from(snapshots)
				.where(
					and(
						eq(snapshots.userId, userId),
						gte(snapshots.createdAt, startDate),
					),
				),

			// Security events (last N days)
			db
				.select({ count: count() })
				.from(securityEvents)
				.where(
					and(
						eq(securityEvents.userId, userId),
						gte(securityEvents.createdAt, startDate),
					),
				),

			// API usage (last N days)
			db
				.select({
					totalRequests: count(),
					totalTokens: sql<number>`COALESCE(SUM(${apiUsageLogs.tokensUsed}), 0)`,
				})
				.from(apiUsageLogs)
				.where(
					and(
						eq(apiUsageLogs.userId, userId),
						gte(apiUsageLogs.createdAt, startDate),
					),
				),

			// Top projects by snapshot count
			db
				.select({
					projectPath: snapshots.projectPath,
					snapshotCount: count(),
				})
				.from(snapshots)
				.where(
					and(
						eq(snapshots.userId, userId),
						gte(snapshots.createdAt, startDate),
					),
				)
				.groupBy(snapshots.projectPath)
				.orderBy(sql`count(*) DESC`)
				.limit(5),

			// Risk score distribution
			db
				.select({
					riskLevel: sql<string>`
            CASE
              WHEN ${snapshots.riskScore} >= 75 THEN 'high'
              WHEN ${snapshots.riskScore} >= 50 THEN 'medium'
              WHEN ${snapshots.riskScore} >= 25 THEN 'low'
              ELSE 'minimal'
            END
          `,
					count: count(),
				})
				.from(snapshots)
				.where(
					and(
						eq(snapshots.userId, userId),
						gte(snapshots.createdAt, startDate),
					),
				)
				.groupBy(sql`
          CASE
            WHEN ${snapshots.riskScore} >= 75 THEN 'high'
            WHEN ${snapshots.riskScore} >= 50 THEN 'medium'
            WHEN ${snapshots.riskScore} >= 25 THEN 'low'
            ELSE 'minimal'
          END
        `),
		]);

		// Calculate daily snapshot creation trend
		const snapshotTrendResult = await db
			.select({
				date: sql<string>`DATE(${snapshots.createdAt})`,
				count: count(),
			})
			.from(snapshots)
			.where(
				and(eq(snapshots.userId, userId), gte(snapshots.createdAt, startDate)),
			)
			.groupBy(sql`DATE(${snapshots.createdAt})`)
			.orderBy(sql`DATE(${snapshots.createdAt}) ASC`);

		// Format response
		const totalSnapshots = totalSnapshotsResult[0]?.count || 0;
		const recentSnapshots = recentSnapshotsResult[0]?.count || 0;
		const securityEventCount = securityEventsResult[0]?.count || 0;
		const apiUsage = apiUsageResult[0] || {
			totalRequests: 0,
			totalTokens: 0,
		};

		// Calculate averages (days is validated to be >= 1 above)
		const avgSnapshotsPerDay = recentSnapshots / days;
		const avgRequestsPerDay = (apiUsage.totalRequests || 0) / days;

		logger.info("Analytics metrics retrieved", {
			userId,
			days,
			totalSnapshots,
			recentSnapshots,
		});

		return NextResponse.json({
			userId,
			period: {
				days,
				startDate: startDate.toISOString(),
				endDate: new Date().toISOString(),
			},
			metrics: {
				// Snapshot metrics
				totalSnapshots: Number(totalSnapshots),
				recentSnapshots: Number(recentSnapshots),
				avgSnapshotsPerDay: Number(avgSnapshotsPerDay.toFixed(2)),

				// Security metrics
				securityEvents: Number(securityEventCount),
				aiDetectionEvents: Number(securityEventCount), // Alias for backwards compatibility

				// API usage metrics
				totalApiRequests: Number(apiUsage.totalRequests || 0),
				totalTokensUsed: Number(apiUsage.totalTokens || 0),
				avgRequestsPerDay: Number(avgRequestsPerDay.toFixed(2)),

				// Project insights
				topProjects: topProjectsResult.map((p) => ({
					projectPath: p.projectPath || "Unknown",
					snapshotCount: Number(p.snapshotCount),
				})),

				// Risk distribution
				riskDistribution: riskDistributionResult.reduce(
					(acc, r) => {
						const level = r.riskLevel as "high" | "medium" | "low" | "minimal";
						acc[level] = Number(r.count);
						return acc;
					},
					{ high: 0, medium: 0, low: 0, minimal: 0 } as Record<string, number>,
				),

				// Trends
				snapshotTrend: snapshotTrendResult.map((t) => ({
					date: t.date,
					count: Number(t.count),
				})),
			},
		});
	} catch (error) {
		logger.error("Failed to get analytics metrics", {
			error,
			userId: authContext.userId,
		});
		return NextResponse.json(
			{ error: "Failed to get analytics" },
			{ status: 500 },
		);
	}
}
