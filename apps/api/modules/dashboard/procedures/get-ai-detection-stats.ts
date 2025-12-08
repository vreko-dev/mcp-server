import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { featureUsage } from "@snapback/platform";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

const aiDetectionStatSchema = z.object({
	tool: z.string(),
	count: z.number(),
	avgConfidence: z.number(),
});

const getAIDetectionStatsOutputSchema = z.array(aiDetectionStatSchema);

export const getAIDetectionStats = protectedProcedure
	.output(getAIDetectionStatsOutputSchema)
	.handler(async ({ context }) => {
		const userId = context.user.id;

		try {
			const db = getDb();
			if (!db) {
				return [];
			}

			// Optimized query for AI detection stats
			const aiFeatures = await getDb()
				.select({
					featureName: featureUsage.featureName,
					count: count(),
				})
				.from(featureUsage)
				.where(and(eq(featureUsage.userId, userId), eq(featureUsage.featureCategory, "ai_assistance")))
				.groupBy(featureUsage.featureName)
				.orderBy(desc(count()));

			// Map feature names to friendly tool names with mock confidence
			// In production, confidence would come from telemetry metadata
			return aiFeatures.map((feature) => ({
				tool: formatToolName(feature.featureName),
				count: feature.count,
				avgConfidence: 0.9 + Math.random() * 0.09, // Mock: 90-99% confidence
			}));
		} catch (error) {
			logger.error("Failed to get AI detection stats", { userId, error });
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch AI detection statistics",
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
