// =====================================================
// SESSION METRICS HOOK - Resource pattern implementation for dashboard
// Location: apps/web/hooks/use-session-metrics.ts
// =====================================================

"use client";

import { fetchSessionMetrics } from "@/lib/dashboard/api";
import type { SessionMetrics } from "@/lib/dashboard/metrics";
import { useResourceQuery } from "@/lib/use-resource-query";
import { useSession } from "@/modules/saas/auth/hooks/use-session";

/**
 * Fetch session metrics with Resource pattern
 */
export function useSessionMetrics(): ReturnType<
	typeof useResourceQuery<SessionMetrics>
> {
	const { user } = useSession();

	return useResourceQuery<SessionMetrics>(
		["dashboard", "session-metrics", user?.id], // Include userId in cache key
		() => {
			if (!user?.id) {
				return Promise.resolve(undefined);
			}
			return fetchSessionMetrics();
		},
		{
			enabled: !!user?.id, // Don't run without authenticated user
			staleTime: 60000, // 1 minute
		},
	);
}
