"use client";

import { useQueryClient } from "@tanstack/react-query";
import { fetchSubscriptionData } from "@/lib/dashboard/api";
import {
	useResourceMutation,
	useResourceQuery,
} from "@/lib/use-resource-query";

// Hook for fetching subscription data with usage information
export function useSubscriptionWithUsage(): ReturnType<
	typeof useResourceQuery<Awaited<ReturnType<typeof fetchSubscriptionData>>>
> {
	return useResourceQuery(
		["subscription-data"],
		() => fetchSubscriptionData(),
		{
			staleTime: 60000, // 1 minute
		},
	);
}

// Hook for upgrading subscription with optimistic update
export function useUpgradeSubscription(): ReturnType<
	typeof useResourceMutation<
		{ success: boolean; message: string },
		{ newTier: string },
		unknown
	>
> {
	const queryClient = useQueryClient();

	return useResourceMutation<
		{ success: boolean; message: string },
		{ newTier: string },
		unknown
	>(
		async (input) => {
			const res = await fetch("/api/v1/subscription/upgrade", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(input),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(
					error.error?.message || "Failed to upgrade subscription",
				);
			}

			return res.json();
		},
		{
			onSuccess: () => {
				// Refetch subscription data
				queryClient.invalidateQueries({
					queryKey: ["subscription-data"],
				});
			},
		},
	);
}

// Hook for canceling subscription with optimistic update
export function useCancelSubscription(): ReturnType<
	typeof useResourceMutation<
		{ success: boolean; message: string },
		void,
		unknown
	>
> {
	const queryClient = useQueryClient();

	return useResourceMutation<
		{ success: boolean; message: string },
		void,
		unknown
	>(
		async () => {
			const res = await fetch("/api/v1/subscription/cancel", {
				method: "POST",
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(
					error.error?.message || "Failed to cancel subscription",
				);
			}

			return res.json();
		},
		{
			onSuccess: () => {
				// Refetch subscription data
				queryClient.invalidateQueries({
					queryKey: ["subscription-data"],
				});
			},
		},
	);
}
