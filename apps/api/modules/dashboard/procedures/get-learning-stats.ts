/**
 * Dashboard Learning Stats Procedure
 *
 * Returns learning engine statistics for the dashboard.
 * Provides insights into AI interaction learning and accuracy over time.
 *
 * Contract: LearningStatsResponse
 * Auth: Requires authenticated user (protectedProcedure)
 */

import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";

// Response schema
const LearningStatsResponseSchema = z.discriminatedUnion("error", [
	z.object({
		error: z.literal(false),
		data: z.object({
			totalInteractions: z.number(),
			feedbackRate: z.number(),
			accuracy: z.number(),
			goldenExamples: z.number(),
			recentLearnings: z.array(
				z.object({
					type: z.enum(["pattern", "pitfall", "efficiency", "discovery", "workflow"]),
					trigger: z.string(),
					action: z.string(),
					timestamp: z.number(),
				}),
			),
		}),
	}),
	z.object({
		error: z.literal(true),
		code: z.string(),
		message: z.string(),
	}),
]);

type LearningStatsResponse = z.infer<typeof LearningStatsResponseSchema>;

/**
 * Get learning engine statistics for the authenticated user's workspace
 */
export const getLearningStatsHandler = async ({ context }: { context: unknown }): Promise<LearningStatsResponse> => {
	const userId = (context as { user?: { id: string } }).user?.id;

	if (!userId) {
		logger.warn("getLearningStats called without authenticated user");
		return {
			error: true,
			code: "UNAUTHORIZED",
			message: "Authentication required to access learning stats",
		};
	}

	try {
		// Note: Learning stats are global (workspace-agnostic) for now
		// In Phase 4, we'll track per-workspace learning stats
		// For now, return placeholder values
		// TODO: Implement LearningEngine service integration

		const stats = {
			totalInteractions: 0,
			feedbackRate: 0,
			accuracy: 0,
			goldenExamples: 0,
		};

		// Placeholder for recent learnings
		const recentLearnings: Array<{
			type: "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow";
			trigger: string;
			action: string;
			timestamp: number;
		}> = [];

		logger.info("Learning stats fetched", {
			userId,
			totalInteractions: stats.totalInteractions,
			feedbackRate: stats.feedbackRate,
			accuracy: stats.accuracy,
		});

		return {
			error: false,
			data: {
				totalInteractions: stats.totalInteractions,
				feedbackRate: stats.feedbackRate,
				accuracy: stats.accuracy,
				goldenExamples: stats.goldenExamples,
				recentLearnings,
			},
		};
	} catch (error) {
		logger.error("Failed to fetch learning stats", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			error: true,
			code: "INTERNAL_ERROR",
			message: "Failed to fetch learning stats",
		};
	}
};

/**
 * Protected procedure for getting learning stats
 */
export const getLearningStats = protectedProcedure.handler(getLearningStatsHandler);
