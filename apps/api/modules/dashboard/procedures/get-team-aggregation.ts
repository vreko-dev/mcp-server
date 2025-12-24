/**
 * API Endpoint: Get Team Aggregation (Phase 4.3)
 *
 * Returns aggregated team metrics for multi-user workspaces.
 * Provides comparative analytics between individual developers and team baseline.
 */

import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";

const TeamAggregationResponseSchema = z.discriminatedUnion("error", [
	z.object({
		error: z.literal(false),
		data: z.object({
			teamId: z.string(),
			memberCount: z.number(),
			metrics: z.object({
				avgAIAcceptanceRate: z.number(),
				avgChurnRate: z.number(),
				avgTestPassRate: z.number(),
				avgSessionDuration: z.number(),
				totalFileSaves: z.number(),
				totalAISuggestions: z.number(),
			}),
			distribution: z.object({
				aiAcceptanceRate: z.object({
					min: z.number(),
					max: z.number(),
					mean: z.number(),
					median: z.number(),
					stdDev: z.number(),
				}),
				churnRate: z.object({
					min: z.number(),
					max: z.number(),
					mean: z.number(),
					median: z.number(),
					stdDev: z.number(),
				}),
				testPassRate: z.object({
					min: z.number(),
					max: z.number(),
					mean: z.number(),
					median: z.number(),
					stdDev: z.number(),
				}),
			}),
			topContributors: z.array(
				z.object({
					userId: z.string(),
					username: z.string(),
					score: z.number(),
					reason: z.string(),
				}),
			),
			concerns: z.array(
				z.object({
					type: z.enum(["low_test_coverage", "high_churn", "low_ai_adoption", "anomaly"]),
					severity: z.enum(["low", "medium", "high"]),
					affectedUsers: z.array(z.string()),
					description: z.string(),
					recommendation: z.string(),
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

export type TeamAggregationResponse = z.infer<typeof TeamAggregationResponseSchema>;

const teamAggregationHandler = async ({
	context,
	input,
}: {
	context: unknown;
	input: { teamId: string };
}): Promise<TeamAggregationResponse> => {
	const userId = (context as { user?: { id: string } }).user?.id;

	if (!userId) {
		logger.warn("getTeamAggregation called without authenticated user");
		return {
			error: true,
			code: "UNAUTHORIZED",
			message: "Authentication required to access team aggregation",
		};
	}

	try {
		const { teamId } = input;

		// For now, return placeholder team aggregation
		// Phase 4.4 will integrate with actual TeamAggregator and multi-user tracking
		const aggregation = {
			teamId,
			aggregationTime: Date.now(),
			memberCount: 0,
			metrics: {
				avgAIAcceptanceRate: 0,
				avgChurnRate: 0,
				avgTestPassRate: 0,
				avgSessionDuration: 0,
				totalFileSaves: 0,
				totalAISuggestions: 0,
			},
			distribution: {
				aiAcceptanceRate: { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 },
				churnRate: { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 },
				testPassRate: { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 },
			},
			topContributors: [],
			concerns: [],
		};

		logger.info("Team aggregation retrieved", {
			userId,
			teamId,
			memberCount: aggregation.memberCount,
		});

		return {
			error: false,
			data: aggregation,
		};
	} catch (error) {
		logger.error("Failed to retrieve team aggregation", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			error: true,
			code: "INTERNAL_ERROR",
			message: "Failed to retrieve team aggregation",
		};
	}
};

export const getTeamAggregation = protectedProcedure
	.input(z.object({ teamId: z.string() }))
	.handler(teamAggregationHandler);
