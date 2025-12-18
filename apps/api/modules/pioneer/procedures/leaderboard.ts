/**
 * GET /api/pioneer/leaderboard
 * Fetch public leaderboard rankings with privacy controls
 */

import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getLeaderboard, type LeaderboardEntry } from "@/src/services/pioneer-service";

const leaderboardSchema = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	offset: z.number().int().min(0).default(0),
	includeCurrentUser: z.boolean().optional().default(false),
});

export interface LeaderboardResponse {
	success: boolean;
	leaderboard: LeaderboardEntry[];
	total: number;
	currentUserRank?: number;
}

export const leaderboard = protectedProcedure
	.route({
		method: "GET",
		path: "/pioneer/leaderboard",
		tags: ["Pioneer Program"],
		summary: "Get public leaderboard rankings",
	})
	.input(leaderboardSchema)
	.handler(async ({ input, context }): Promise<LeaderboardResponse> => {
		const user = context.user;
		const { limit, offset, includeCurrentUser } = input;

		const result = await getLeaderboard(includeCurrentUser && user ? user.id : undefined, {
			limit,
			offset,
		});

		logger.info("Leaderboard fetched", {
			userId: user?.id,
			limit,
			offset,
			resultsReturned: result.entries.length,
			total: result.total,
			currentUserRank: result.currentUserRank,
		});

		return {
			success: true,
			leaderboard: result.entries,
			total: result.total,
			currentUserRank: result.currentUserRank,
		};
	});
