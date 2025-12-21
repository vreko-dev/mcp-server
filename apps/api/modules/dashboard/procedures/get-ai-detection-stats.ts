import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getAIDetectionStats as getAIDetectionStatsFromService } from "../services/dashboard-service";

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
			// Delegate to service layer per C-002
			return await getAIDetectionStatsFromService(userId);
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
