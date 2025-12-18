"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { orpcClient } from "@shared/lib/orpc-client";
import { useQuery } from "@tanstack/react-query";
import type { Tier } from "../lib/tiers";

export interface LeaderboardEntry {
	rank: number;
	username: string; // Display name (may be obfuscated based on privacy settings)
	avatar?: string;
	tier: Tier;
	points: number;
	isCurrentUser: boolean;
}

export interface LeaderboardData {
	leaderboard: LeaderboardEntry[];
	total: number;
	currentUserRank?: number;
}

export function useLeaderboard(limit = 10, offset = 0) {
	let user: { id: string } | undefined;

	// Try to get session, but handle case where SessionProvider doesn't exist (e.g., during SSG)
	try {
		const { user: sessionUser } = useSession();
		user = sessionUser;
	} catch (error) {
		// SessionProvider not available - likely during static generation
		// Default to undefined which is safe (API will return public leaderboard)
		user = undefined;
	}

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["pioneer", "leaderboard", limit, offset, user?.id],
		queryFn: async (): Promise<LeaderboardData | null> => {
			const response = await orpcClient.pioneer.leaderboard({
				limit,
				offset,
				includeCurrentUser: !!user,
			});

			if (!response.success) {
				return null;
			}

			// Map API response to LeaderboardEntry format
			const entries: LeaderboardEntry[] = response.leaderboard.map(
				(entry: { rank: number; display: string; tier: string; points: number; isCurrentUser: boolean }) => ({
					rank: entry.rank,
					username: entry.display, // API returns 'display' which handles privacy
					tier: entry.tier as Tier,
					points: entry.points,
					isCurrentUser: entry.isCurrentUser,
				}),
			);

			return {
				leaderboard: entries,
				total: response.total,
				currentUserRank: response.currentUserRank,
			};
		},
		staleTime: 60 * 1000, // 1 minute
	});

	return { data, isLoading, error: error as Error | null, refetch };
}
