import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { featureUsage, snapshots } from "@snapback/platform";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

const activitySchema = z.object({
	type: z.enum(["snapshot", "ai_detection", "recovery"]),
	message: z.string(),
	timestamp: z.string(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

const getRecentActivityOutputSchema = z.array(activitySchema);

export const getRecentActivity = protectedProcedure
	.output(getRecentActivityOutputSchema)
	.handler(async ({ context }) => {
		const userId = context.user.id;

		try {
			const db = getDb();
			if (!db) {
				return [];
			}

			// Get recent snapshots (optimized with limit)
			const recentSnapshots = await getDb()
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
				.limit(5); // Reduced from 10 to 5 for better performance

			// Get recent AI detections (optimized with limit)
			const recentAI = await getDb()
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
				.limit(5); // Reduced from 10 to 5 for better performance

			// Combine and format activities
			const activities: z.infer<typeof activitySchema>[] = [
				...recentSnapshots.map((cp) => ({
					type: (cp.riskScore && cp.riskScore > 0 ? "recovery" : "snapshot") as
						| "snapshot"
						| "recovery",
					message:
						cp.riskScore && cp.riskScore > 0
							? "Code recovered from risk"
							: "Snapshot created",
					timestamp: cp.createdAt
						? formatRelativeTime(cp.createdAt)
						: "unknown",
					metadata: { files: cp.fileCount, trigger: cp.trigger },
				})),
				...recentAI.map((ai) => ({
					type: "ai_detection" as const,
					message: `${formatToolName(ai.featureName)} detected`,
					timestamp: ai.createdAt
						? formatRelativeTime(ai.createdAt)
						: "unknown",
					metadata: ai.metadata
						? (ai.metadata as Record<string, unknown>)
						: undefined,
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
		} catch (error) {
			logger.error("Failed to get recent activity", { userId, error });
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch recent activity",
			});
		}
	});

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
	if (!match || !match[1]) {
		return now;
	}

	const value = Number.parseInt(match[1], 10);
	const unit = match[2];

	const ms =
		unit === "minute"
			? value * 60000
			: unit === "hour"
				? value * 3600000
				: value * 86400000;

	return new Date(now.getTime() - ms);
}

// Utility function to format relative time
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
