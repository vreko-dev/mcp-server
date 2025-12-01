// =====================================================
// USAGE HOOKS - Resource pattern implementation for usage tracking
// Location: apps/web/hooks/use-usage.ts
// =====================================================

"use client";

import type { SubscriptionInfo, UsageLimits } from "@/lib/dashboard/metrics";
import { getSubscription, getUsageLimits } from "@/lib/dashboard/metrics";
import { useResourceQuery } from "@/lib/use-resource-query";
import { useSession } from "@/modules/saas/auth/hooks/use-session";

/**
 * Fetch usage limits with Resource pattern
 */
export function useUsageLimits() {
	const { user } = useSession();

	return useResourceQuery<UsageLimits>(
		["usage", "limits", user?.id], // Include userId in cache key
		() => {
			if (!user?.id) {
				return Promise.resolve(undefined);
			}
			// We'll need to fetch the user's plan from subscription data
			// For now, we'll use "free" as default and the actual plan will be determined in the backend
			return getUsageLimits(user.id, "free");
		},
		{
			enabled: !!user?.id, // Don't run without authenticated user
			staleTime: 600000, // 10 minutes
		},
	);
}

/**
 * Fetch subscription info with Resource pattern
 */
export function useSubscriptionInfo() {
	const { user } = useSession();

	return useResourceQuery<SubscriptionInfo>(
		["subscription", "info", user?.id], // Include userId in cache key
		() => {
			if (!user?.id) {
				return Promise.resolve(undefined);
			}
			return getSubscription(user.id);
		},
		{
			enabled: !!user?.id, // Don't run without authenticated user
			staleTime: 600000, // 10 minutes
		},
	);
}
