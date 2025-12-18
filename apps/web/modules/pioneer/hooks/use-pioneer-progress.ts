"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { orpcClient } from "@shared/lib/orpc-client";
import { useQuery } from "@tanstack/react-query";
import type { ActionType, Pioneer } from "../lib/actions";
import { ACTIONS } from "../lib/actions";
import { getNextTier, getTierForPoints, type Tier } from "../lib/tiers";

export interface PioneerProgress {
	pioneer: Pioneer;
	progress: {
		currentTier: Tier;
		nextTier: Tier | null;
		pointsToNext: number;
		percentToNext: number;
	};
	completedActions: ActionType[];
	availableActions: typeof ACTIONS;
}

export function usePioneerProgress() {
	let user: { id: string } | undefined;

	// Try to get session, but handle case where SessionProvider doesn't exist (e.g., during SSG)
	try {
		const { user: sessionUser } = useSession();
		user = sessionUser;
	} catch (error) {
		// SessionProvider not available - likely during static generation
		// Default to undefined which is safe (API will return public data)
		user = undefined;
	}

	const { data, isLoading, error } = useQuery({
		queryKey: ["pioneer", "me", user?.id],
		queryFn: async (): Promise<PioneerProgress | null> => {
			if (!user?.id) return null;

			const response = await orpcClient.pioneer.me();

			if (!response.success || !response.profile) {
				return null;
			}

			const profile = response.profile;
			const currentTier = getTierForPoints(profile.totalPoints);
			const nextTierInfo = getNextTier(profile.totalPoints);

			// Map API profile to Pioneer type
			const pioneer: Pioneer = {
				id: profile.id,
				userId: user.id,
				githubUsername: profile.username,
				contactEmail: profile.contactEmail || null,
				tier: currentTier,
				totalPoints: profile.totalPoints,
				referralCode: profile.referralCode,
				createdAt: profile.createdAt,
				lastActivityAt: profile.lastSyncedAt,
			};

			// TODO: Fetch completed actions from API when endpoint available
			const completedActions: ActionType[] = [];
			if (profile.githubStarred) {
				completedActions.push("github_starred");
			}

			return {
				pioneer,
				progress: {
					currentTier,
					nextTier: nextTierInfo.nextTier,
					pointsToNext: nextTierInfo.pointsToNext,
					percentToNext: nextTierInfo.progress,
				},
				completedActions,
				availableActions: ACTIONS,
			};
		},
		enabled: !!user?.id,
		staleTime: 60 * 1000, // 1 minute
	});

	return { data, isLoading, error: error as Error | null };
}
