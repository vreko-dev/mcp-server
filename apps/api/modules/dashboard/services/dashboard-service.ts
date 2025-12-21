/**
 * Dashboard Service - Handles dashboard database operations
 *
 * Per C-002: All database queries go through service layer
 * Manages dashboard metrics: user metrics, org metrics, AI detection stats, recent activity, subscription data, session metrics
 */

import { extensionSessions, featureUsage, orgDailyMetrics, snapshots, subscriptions } from "@snapback/platform";
import { and, count, desc, eq, gte, lte, or, sql, sum } from "drizzle-orm";
import { getDb } from "@/src/services/database";
import { getTrustCalibrationService } from "@/src/services/trust-calibration";

// ============================================================================
// Types
// ============================================================================

export interface UserMetricsResult {
	snapshotCount: number;
	recoveryCount: number;
	filesProtected: number;
	aiDetectionRate: number;
}

export interface OrgMetricsInput {
	organizationId: string;
	days: number;
}

export interface OrgMetricsResult {
	totalIncidentsDetected: number;
	totalIncidentsPrevented: number;
	avgTimeToRestoreMs: number | null;
	totalSnapshotsCreated: number;
	totalSnapshotsRestored: number;
	totalBytesSaved: number;
	totalHighSeverityRisks: number;
	totalMediumSeverityRisks: number;
	totalLowSeverityRisks: number;
	totalApiCalls: number;
	totalApiErrors: number;
	activeUsers: number;
}

export interface AIDetectionStat {
	tool: string;
	count: number;
	avgConfidence: number;
}

export interface ActivityItem {
	type: "snapshot" | "ai_detection" | "recovery";
	message: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface SubscriptionDataResult {
	plan: "free" | "pro" | "team" | "enterprise";
	status: "active" | "canceled" | "past_due" | "trialing" | "paused";
	currentPeriodEnd?: Date;
	trialEnd?: Date;
	snapshotsUsed: number;
	snapshotsLimit: number | null;
	percentUsed: number;
	remaining: number;
	daysRemaining?: number;
}

export interface SessionMetricsResult {
	sessionCount: number;
	aiSessionCount: number;
	totalBytesSaved: number;
	highSeveritySessionCount: number;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get user metrics: snapshot count, recovery count, files protected, AI detection rate
 */
export async function getUserMetrics(userId: string): Promise<UserMetricsResult> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	// Optimized single query to get all metrics at once
	const metrics = await db
		.select({
			snapshotCount: count(snapshots.id),
			recoveryCount: count(sql`CASE WHEN ${snapshots.riskScore} > 0 THEN 1 END`),
			filesProtected: sum(snapshots.fileCount),
			aiCount: count(featureUsage.id),
		})
		.from(snapshots)
		.leftJoin(featureUsage, and(eq(featureUsage.userId, userId), eq(featureUsage.featureCategory, "ai_assistance")))
		.where(eq(snapshots.userId, userId));

	const result = metrics[0] || {
		snapshotCount: 0,
		recoveryCount: 0,
		filesProtected: 0,
		aiCount: 0,
	};

	const totalSnapshots = result.snapshotCount || 0;
	const aiDetectionCount = result.aiCount || 0;
	const aiDetectionRate = totalSnapshots > 0 ? Math.round((aiDetectionCount / totalSnapshots) * 100) : 0;

	return {
		snapshotCount: totalSnapshots,
		recoveryCount: result.recoveryCount || 0,
		filesProtected: Number(result.filesProtected) || 0,
		aiDetectionRate,
	};
}

/**
 * Get organization metrics aggregated from daily metrics table
 */
export async function getOrgMetrics(input: OrgMetricsInput): Promise<OrgMetricsResult> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const { organizationId, days } = input;

	// Calculate date range
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(endDate.getDate() - days);

	// Aggregate metrics from org_daily_metrics table
	const metricsResult = await db
		.select({
			totalIncidentsDetected: sum(orgDailyMetrics.incidentsDetected),
			totalIncidentsPrevented: sum(orgDailyMetrics.incidentsPrevented),
			avgTimeToRestoreMs: sql`AVG(${orgDailyMetrics.timeToRestoreMs})`,
			totalSnapshotsCreated: sum(orgDailyMetrics.snapshotsCreated),
			totalSnapshotsRestored: sum(orgDailyMetrics.snapshotsRestored),
			totalBytesSaved: sum(orgDailyMetrics.bytesSaved),
			totalHighSeverityRisks: sum(orgDailyMetrics.highSeverityRisks),
			totalMediumSeverityRisks: sum(orgDailyMetrics.mediumSeverityRisks),
			totalLowSeverityRisks: sum(orgDailyMetrics.lowSeverityRisks),
			totalApiCalls: sum(orgDailyMetrics.apiCalls),
			totalApiErrors: sum(orgDailyMetrics.apiErrors),
			activeUsers: sql`MAX(${orgDailyMetrics.activeUsers})`,
		})
		.from(orgDailyMetrics)
		.where(
			and(
				eq(orgDailyMetrics.organizationId, organizationId),
				gte(orgDailyMetrics.date, startDate),
				lte(orgDailyMetrics.date, endDate),
			),
		);

	const result = metricsResult[0] || {
		totalIncidentsDetected: 0,
		totalIncidentsPrevented: 0,
		avgTimeToRestoreMs: null,
		totalSnapshotsCreated: 0,
		totalSnapshotsRestored: 0,
		totalBytesSaved: 0,
		totalHighSeverityRisks: 0,
		totalMediumSeverityRisks: 0,
		totalLowSeverityRisks: 0,
		totalApiCalls: 0,
		totalApiErrors: 0,
		activeUsers: 0,
	};

	return {
		totalIncidentsDetected: Number(result.totalIncidentsDetected) || 0,
		totalIncidentsPrevented: Number(result.totalIncidentsPrevented) || 0,
		avgTimeToRestoreMs: result.avgTimeToRestoreMs ? Number(result.avgTimeToRestoreMs) : null,
		totalSnapshotsCreated: Number(result.totalSnapshotsCreated) || 0,
		totalSnapshotsRestored: Number(result.totalSnapshotsRestored) || 0,
		totalBytesSaved: Number(result.totalBytesSaved) || 0,
		totalHighSeverityRisks: Number(result.totalHighSeverityRisks) || 0,
		totalMediumSeverityRisks: Number(result.totalMediumSeverityRisks) || 0,
		totalLowSeverityRisks: Number(result.totalLowSeverityRisks) || 0,
		totalApiCalls: Number(result.totalApiCalls) || 0,
		totalApiErrors: Number(result.totalApiErrors) || 0,
		activeUsers: Number(result.activeUsers) || 0,
	};
}

/**
 * Get AI detection statistics for user
 */
export async function getAIDetectionStats(userId: string): Promise<AIDetectionStat[]> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	// Optimized query for AI detection stats
	const aiFeatures = await db
		.select({
			featureName: featureUsage.featureName,
			count: count(),
		})
		.from(featureUsage)
		.where(and(eq(featureUsage.userId, userId), eq(featureUsage.featureCategory, "ai_assistance")))
		.groupBy(featureUsage.featureName)
		.orderBy(desc(count()));

	// Get trust calibration service for real scores
	const trustService = getTrustCalibrationService();

	return Promise.all(
		aiFeatures.map(async (feature: any) => ({
			tool: formatToolName(feature.featureName),
			count: feature.count,
			avgConfidence: await trustService.getConfidenceScore(userId, formatToolName(feature.featureName)),
		})),
	);
}

/**
 * Get recent activity for user (snapshots, AI detections, recoveries)
 */
export async function getRecentActivity(userId: string): Promise<ActivityItem[]> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	// Get recent snapshots (optimized with limit)
	const recentSnapshots = await db
		.select({
			id: snapshots.id,
			trigger: snapshots.trigger,
			fileCount: snapshots.fileCount,
			riskScore: snapshots.riskScore,
			createdAt: snapshots.createdAt,
		})
		.from(snapshots)
		.where(eq(snapshots.userId, userId))
		.orderBy(desc(snapshots.createdAt))
		.limit(5);

	// Get recent AI detections (optimized with limit)
	const recentAI = await db
		.select({
			featureName: featureUsage.featureName,
			createdAt: featureUsage.createdAt,
			metadata: featureUsage.metadata,
		})
		.from(featureUsage)
		.where(and(eq(featureUsage.userId, userId), eq(featureUsage.featureCategory, "ai_assistance")))
		.orderBy(desc(featureUsage.createdAt))
		.limit(5);

	// Combine and format activities
	const activities: ActivityItem[] = [
		...recentSnapshots.map((cp) => ({
			type: (cp.riskScore && cp.riskScore > 0 ? "recovery" : "snapshot") as "snapshot" | "recovery",
			message: cp.riskScore && cp.riskScore > 0 ? "Code recovered from risk" : "Snapshot created",
			timestamp: cp.createdAt ? formatRelativeTime(cp.createdAt) : "unknown",
			metadata: { files: cp.fileCount, trigger: cp.trigger },
		})),
		...recentAI.map((ai) => ({
			type: "ai_detection" as const,
			message: `${formatToolName(ai.featureName)} detected`,
			timestamp: ai.createdAt ? formatRelativeTime(ai.createdAt) : "unknown",
			metadata: ai.metadata ? (ai.metadata as Record<string, unknown>) : undefined,
		})),
	];

	// Sort by timestamp and return top 5
	return activities
		.sort((a, b) => parseRelativeTime(b.timestamp).getTime() - parseRelativeTime(a.timestamp).getTime())
		.slice(0, 5);
}

/**
 * Get subscription data for user
 */
export async function getSubscriptionData(userId: string): Promise<SubscriptionDataResult> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	// Get subscription for current period
	const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);

	if (!subscription) {
		return {
			plan: "free",
			status: "active",
			snapshotsUsed: 0,
			snapshotsLimit: 100,
			percentUsed: 0,
			remaining: 100,
		};
	}

	// Count snapshots in current billing period
	const currentPeriodStart = subscription.currentPeriodStart || new Date(Date.now() - 30 * 86400000); // 30 days ago

	const periodSnapshots = await db
		.select({ count: count() })
		.from(snapshots)
		.where(and(eq(snapshots.userId, userId), gte(snapshots.createdAt, currentPeriodStart)));

	const snapshotsUsed = periodSnapshots[0]?.count || 0;

	// Determine limits based on plan
	let snapshotsLimit: number | null = 100; // Free tier default
	if (subscription.plan !== "free") {
		snapshotsLimit = null; // Unlimited for paid plans
	}

	const remaining = snapshotsLimit !== null ? snapshotsLimit - snapshotsUsed : 0;
	const percentUsed =
		snapshotsLimit !== null && snapshotsLimit > 0
			? Math.min(100, Math.round((snapshotsUsed / snapshotsLimit) * 100))
			: 0;

	// Calculate days remaining if subscription has end date
	let daysRemaining: number | undefined;
	if (subscription.currentPeriodEnd) {
		const now = new Date();
		const diffTime = subscription.currentPeriodEnd.getTime() - now.getTime();
		daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
	}

	return {
		plan: subscription.plan as "free" | "pro" | "team" | "enterprise",
		status: subscription.status as "active" | "canceled" | "past_due" | "trialing" | "paused",
		currentPeriodEnd: subscription.currentPeriodEnd || undefined,
		trialEnd: subscription.trialEnd || undefined,
		snapshotsUsed,
		snapshotsLimit,
		percentUsed,
		remaining,
		daysRemaining,
	};
}

/**
 * Get session metrics for user
 */
export async function getSessionMetrics(userId: string): Promise<SessionMetricsResult> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	// Use denormalized fields for better performance
	const metrics = await db
		.select({
			sessionCount: count(extensionSessions.id),
			aiSessionCount: count(and(eq(extensionSessions.aiPresent, true))),
			totalBytesSaved: sum(extensionSessions.bytesSaved),
			highSeveritySessionCount: count(
				and(
					or(
						eq(extensionSessions.highestSeverity, "high"),
						eq(extensionSessions.highestSeverity, "critical"),
					),
				),
			),
		})
		.from(extensionSessions)
		.where(eq(extensionSessions.userId, userId));

	const result = metrics[0] || {
		sessionCount: 0,
		aiSessionCount: 0,
		totalBytesSaved: 0,
		highSeveritySessionCount: 0,
	};

	return {
		sessionCount: result.sessionCount || 0,
		aiSessionCount: result.aiSessionCount || 0,
		totalBytesSaved: Number(result.totalBytesSaved) || 0,
		highSeveritySessionCount: result.highSeveritySessionCount || 0,
	};
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format tool name from feature name
 */
function formatToolName(featureName: string): string {
	const toolMap: Record<string, string> = {
		copilot: "GitHub Copilot",
		cursor: "Cursor",
		windsurf: "Windsurf",
		claude: "Claude",
		gpt: "ChatGPT",
	};

	const normalized = featureName.toLowerCase();
	for (const [key, value] of Object.entries(toolMap)) {
		if (normalized.includes(key)) {
			return value;
		}
	}

	return featureName;
}

/**
 * Utility function to format relative time
 */
function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSeconds < 60) {
		return "just now";
	}
	if (diffMinutes < 60) {
		return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
	}
	if (diffHours < 24) {
		return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
	}
	return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
}

/**
 * Parse relative time back to Date (approximate)
 */
function parseRelativeTime(relative: string): Date {
	const now = new Date();
	if (relative === "just now") {
		return now;
	}

	const match = relative.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
	if (!match || !match[1]) {
		return now;
	}

	const value = Number.parseInt(match[1], 10);
	const unit = match[2];

	const ms = unit === "minute" ? value * 60000 : unit === "hour" ? value * 3600000 : value * 86400000;

	return new Date(now.getTime() - ms);
}
