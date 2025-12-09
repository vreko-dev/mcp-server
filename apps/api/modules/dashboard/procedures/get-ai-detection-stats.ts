import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
// @ts-expect-error - featureUsage has implicit any type from platform package
import { featureUsage } from "@snapback/platform";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
import { getTrustCalibrationService } from "@/src/services/trust-calibration";

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

			// Map feature names to friendly tool names with REAL confidence scores
			// Get trust calibration service for real scores instead of random mocking
			const trustService = getTrustCalibrationService();

			return Promise.all(
				aiFeatures.map(async (feature: any) => ({
					tool: formatToolName(feature.featureName),
					count: feature.count,
					// Get REAL confidence score from trust calibration instead of Math.random()
					avgConfidence: await trustService.getConfidenceScore(userId, formatToolName(feature.featureName)),
				})),
			);
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
