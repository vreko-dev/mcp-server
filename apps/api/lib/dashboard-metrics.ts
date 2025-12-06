// Dashboard metrics and data fetching functions
import { db, snapshots, subscriptions } from "@snapback/platform";
import { featureUsage } from "@snapback/platform/db/schema/snapback";
import { and, count, desc, eq, gte, isNotNull, sql, sum } from "drizzle-orm";

export interface DashboardMetrics {
	snapshotCount: number;
	recoveryCount: number;
	filesProtected: number;
	aiDetectionRate: number;
}

export interface AIDetectionStat {
	tool: string;
	count: number;
	avgConfidence: number;
}

export interface Activity {
	type: "snapshot" | "ai_detection" | "recovery";
	message: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface UsageLimits {
	snapshotsUsed: number;
	snapshotsLimit: number | null; // null for unlimited
	cloudStorageUsedMb?: number;
	cloudStorageLimitMb?: number;
}

export interface SubscriptionInfo {
	plan: "free" | "pro" | "team" | "enterprise";
	status: "active" | "canceled" | "past_due" | "trialing" | "paused";
	currentPeriodEnd?: Date;
	trialEnd?: Date;
}

// Session metrics interface
export interface SessionMetrics {
	sessionCount: number;
	aiSessionCount: number;
	totalBytesSaved: number;
	highSeveritySessionCount: number;
}

// Define the subscription type from the database schema
interface DatabaseSubscription {
	id: string;
	userId: string;
	plan: string;
	status: string;
	currentPeriodStart: Date | null;
	currentPeriodEnd: Date | null;
	trialEnd: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

// Get user dashboard metrics from database
export async function getUserMetrics(
	userId: string,
): Promise<DashboardMetrics> {
	if (!db) {
		return {
			snapshotCount: 0,
			recoveryCount: 0,
			filesProtected: 0,
			aiDetectionRate: 0,
		};
	}

	// Get snapshot count and total files protected
	const snapshotStats = await db
		.select({
			count: count(),
			totalFiles: sum(snapshots.fileCount),
		})
		.from(snapshots)
		.where(eq(snapshots.userId, userId));

	const stats = snapshotStats[0] || { count: 0, totalFiles: 0 };

	// Count recovery actions (snapshots with risk scores or specific triggers)
	const recoveryActions = await db
		.select({ count: count() })
		.from(snapshots)
		.where(
			and(
				eq(snapshots.userId, userId),
				// Recovery snapshots have risk scores or specific triggers
				sql`${snapshots.riskScore} > 0 OR ${snapshots.trigger} = 'risk_detection'`,
			),
		);

	// Get AI detection rate from feature usage
	const aiUsage = await db
		.select({ total: count() })
		.from(featureUsage)
		.where(
			and(
				eq(featureUsage.userId, userId),
				eq(featureUsage.featureCategory, "ai_assistance"),
			),
		);

	const aiDetectionCount = aiUsage[0]?.total || 0;
	const totalSnapshots = stats.count || 0;
	const aiDetectionRate =
		totalSnapshots > 0
			? Math.round((aiDetectionCount / totalSnapshots) * 100)
			: 0;

	return {
		snapshotCount: totalSnapshots,
		recoveryCount: recoveryActions[0]?.count || 0,
		filesProtected: Number(stats.totalFiles) || 0,
		aiDetectionRate,
	};
}

// Get AI detection statistics from feature usage
export async function getAIDetectionStats(
	userId: string,
): Promise<AIDetectionStat[]> {
	if (!db) {
		return [];
	}

	// Query feature usage for AI tools
	const aiFeatures = await db
		.select({
			featureName: featureUsage.featureName,
			count: count(),
		})
		.from(featureUsage)
		.where(
			and(
				eq(featureUsage.userId, userId),
				eq(featureUsage.featureCategory, "ai_assistance"),
			),
		)
		.groupBy(featureUsage.featureName)
		.orderBy(desc(count()));

	// Map feature names to friendly tool names with mock confidence
	// In production, confidence would come from telemetry metadata
	return aiFeatures.map((feature) => ({
		tool: formatToolName(feature.featureName),
		count: feature.count,
		avgConfidence: 0.9 + Math.random() * 0.09, // Mock: 90-99% confidence
	}));
}

// Get recent activity from snapshots and feature usage
export async function getRecentActivity(userId: string): Promise<Activity[]> {
	if (!db) {
		return [];
	}

	// Get recent snapshots
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
		.limit(10);

	// Get recent AI detections
	const recentAI = await db
		.select({
			featureName: featureUsage.featureName,
			createdAt: featureUsage.createdAt,
			metadata: featureUsage.metadata,
		})
		.from(featureUsage)
		.where(
			and(
				eq(featureUsage.userId, userId),
				eq(featureUsage.featureCategory, "ai_assistance"),
			),
		)
		.orderBy(desc(featureUsage.createdAt))
		.limit(10);

	// Combine and format activities
	const activities: Activity[] = [
		...recentSnapshots.map((snapshot) => ({
			type: (snapshot.riskScore && snapshot.riskScore > 0
				? "recovery"
				: "snapshot") as "snapshot" | "recovery",
			message:
				snapshot.riskScore && snapshot.riskScore > 0
					? "Code recovered from risk"
					: "Snapshot created",
			timestamp: snapshot.createdAt
				? formatRelativeTime(snapshot.createdAt)
				: "unknown",
			metadata: { files: snapshot.fileCount, trigger: snapshot.trigger },
		})),
		...recentAI.map((ai) => ({
			type: "ai_detection" as const,
			message: `${formatToolName(ai.featureName)} detected`,
			timestamp: ai.createdAt ? formatRelativeTime(ai.createdAt) : "unknown",
			metadata:
				(ai.metadata as Record<string, unknown>) ||
				({} as Record<string, unknown>),
		})),
	];

	// Sort by timestamp and return top 5
	return activities
		.sort(
			(a, b) =>
				parseRelativeTime(b.timestamp).getTime() -
				parseRelativeTime(a.timestamp).getTime(),
		)
		.slice(0, 5);
}

// Get usage limits based on subscription
export async function getUsageLimits(
	userId: string,
	plan: string,
): Promise<UsageLimits> {
	if (!db) {
		return {
			snapshotsUsed: 0,
			snapshotsLimit: plan === "free" ? 100 : null,
		};
	}

	// Get subscription for current period
	const [subscription] = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.limit(1);

	if (!subscription) {
		return {
			snapshotsUsed: 0,
			snapshotsLimit: 100, // Free plan default
		};
	}

	// Count snapshots in current billing period
	const currentPeriodStart =
		subscription.currentPeriodStart || new Date(Date.now() - 30 * 86400000); // 30 days ago

	const periodSnapshots = await db
		.select({ count: count() })
		.from(snapshots)
		.where(
			and(
				eq(snapshots.userId, userId),
				gte(snapshots.createdAt, currentPeriodStart),
			),
		);

	const snapshotsUsed = periodSnapshots[0]?.count || 0;

	// Calculate cloud storage used from snapshot sizes
	let cloudStorageUsedMb = 0;
	if (plan !== "free") {
		const cloudSnapshots = await db
			.select({ totalSizeBytes: sum(snapshots.totalSizeBytes) })
			.from(snapshots)
			.where(
				and(eq(snapshots.userId, userId), isNotNull(snapshots.totalSizeBytes)),
			);

		const totalSizeBytes = Number(cloudSnapshots[0]?.totalSizeBytes || 0);
		cloudStorageUsedMb = Math.round(totalSizeBytes / (1024 * 1024)); // Convert bytes to MB
	}

	// Determine limits based on plan
	if (plan === "free") {
		return {
			snapshotsUsed,
			snapshotsLimit: 100, // Free tier: 100 snapshots/month
		};
	}

	// Solo/Team have unlimited snapshots
	return {
		snapshotsUsed,
		snapshotsLimit: null, // Unlimited
		cloudStorageUsedMb,
		cloudStorageLimitMb: 1000, // 1GB for paid plans
	};
}

// Get subscription information
export async function getSubscription(
	userId: string,
): Promise<SubscriptionInfo> {
	if (!db) {
		return {
			plan: "free",
			status: "active",
		};
	}

	const [subscription] = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.limit(1);

	if (!subscription) {
		return {
			plan: "free",
			status: "active",
		};
	}

	return {
		plan: subscription.plan as "free" | "pro" | "team" | "enterprise",
		status: subscription.status as
			| "active"
			| "canceled"
			| "past_due"
			| "trialing"
			| "paused",
		currentPeriodEnd: subscription.currentPeriodEnd || undefined,
		trialEnd: subscription.trialEnd || undefined,
	};
}

export function mapSubscriptionData(subscription: DatabaseSubscription) {
	return {
		id: subscription.id,
		plan: subscription.plan,
		status: subscription.status,
		currentPeriodStart: subscription.currentPeriodStart || undefined,
		currentPeriodEnd: subscription.currentPeriodEnd || undefined,
		trialEnd: subscription.trialEnd || undefined,
	};
}

// Helper function to map subscription data for dashboard
export function mapSubscriptionForDashboard(
	subscription: DatabaseSubscription,
) {
	return {
		id: subscription.id,
		plan: subscription.plan,
		status:
			subscription.status === "trialing"
				? "trialing"
				: subscription.status === "active"
					? "active"
					: subscription.status === "past_due"
						? "past_due"
						: subscription.status === "canceled"
							? "canceled"
							: subscription.status === "paused"
								? "paused"
								: "active",
		currentPeriodEnd: subscription.currentPeriodEnd || undefined,
		trialEnd: subscription.trialEnd || undefined,
	};
}

// Helper: Format tool name from feature name
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

// Helper: Parse relative time back to Date (approximate)
function parseRelativeTime(relative: string): Date {
	const now = new Date();
	if (relative === "just now") {
		return now;
	}

	const match = relative.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
	if (!match || match.length < 3) {
		return now;
	}

	const value = Number.parseInt(match[1] || "0", 10);
	const unit = match[2] || "minute";

	const ms =
		unit === "minute"
			? value * 60000
			: unit === "hour"
				? value * 3600000
				: value * 86400000;

	return new Date(now.getTime() - ms);
}

// Utility function to format relative time
export function formatRelativeTime(date: Date): string {
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
