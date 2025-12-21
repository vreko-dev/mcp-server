import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getRecentActivity as getRecentActivityFromService } from "../services/dashboard-service";

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
			// Delegate to service layer per C-002
			return await getRecentActivityFromService(userId);
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

	const ms = unit === "minute" ? value * 60000 : unit === "hour" ? value * 3600000 : value * 86400000;

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
