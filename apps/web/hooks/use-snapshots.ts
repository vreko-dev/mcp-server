// =====================================================
// SNAPSHOTS HOOKS - Resource pattern implementation for dashboard
// Location: apps/web/hooks/use-snapshots.ts
// =====================================================

"use client";

import {
	fetchAIDetectionStats,
	fetchRecentActivity,
	fetchUserMetrics,
} from "@/lib/dashboard/api";
import type {
	Activity,
	AIDetectionStat,
	DashboardMetrics,
} from "@/lib/dashboard/metrics";
import { useResourceQuery } from "@/lib/use-resource-query";
import { useSession } from "@/modules/saas/auth/hooks/use-session";

/**
 * Fetch dashboard metrics with Resource pattern
 */
export function useDashboardMetrics(): ReturnType<
	typeof useResourceQuery<DashboardMetrics>
> {
	const { user } = useSession();

	return useResourceQuery<DashboardMetrics>(
		["dashboard", "metrics", user?.id], // Include userId in cache key
		() => {
			if (!user?.id) {
				return Promise.resolve(undefined);
			}
			return fetchUserMetrics();
		},
		{
			enabled: !!user?.id, // Don't run without authenticated user
			staleTime: 60000, // 1 minute
		},
	);
}

/**
 * Fetch AI detection statistics with Resource pattern
 */
export function useAIDetectionStats(): ReturnType<
	typeof useResourceQuery<AIDetectionStat[]>
> {
	const { user } = useSession();

	return useResourceQuery<AIDetectionStat[]>(
		["dashboard", "ai-stats", user?.id], // Include userId in cache key
		() => {
			if (!user?.id) {
				return Promise.resolve(undefined);
			}
			return fetchAIDetectionStats();
		},
		{
			enabled: !!user?.id, // Don't run without authenticated user
			staleTime: 120000, // 2 minutes
		},
	);
}

/**
 * Fetch recent activity with Resource pattern
 */
export function useRecentActivity(): ReturnType<
	typeof useResourceQuery<Activity[]>
> {
	const { user } = useSession();

	return useResourceQuery<Activity[]>(
		["dashboard", "activity", user?.id], // Include userId in cache key
		() => {
			if (!user?.id) {
				return Promise.resolve(undefined);
			}
			return fetchRecentActivity();
		},
		{
			enabled: !!user?.id, // Don't run without authenticated user
			staleTime: 60000, // 1 minute
		},
	);
}
