// =====================================================
// API KEYS HOOKS - Resource pattern implementation
// Location: apps/web/hooks/use-api-keys.ts
// =====================================================

"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
	useResourceMutation,
	useResourceQuery,
} from "@/lib/use-resource-query";

// Define types for API keys
export interface ApiKey {
	id: string;
	name: string;
	keyPreview: string;
	createdAt: string;
	expiresAt: string | null;
	revokedAt: string | null;
	scopes: string[];
	dailyRequestLimit: number;
	rateLimitPerMinute: number;
}

export interface CreateApiKeyInput {
	name: string;
	scopes?: string[];
	expiresInDays?: number;
	dailyRequestLimit?: number;
	rateLimitPerMinute?: number;
}

export interface RevokeApiKeyInput {
	keyId: string;
}

interface OptimisticContext {
	previousKeys?: ApiKey[];
}

/**
 * Fetch API keys with Resource pattern
 */
export function useApiKeys(): ReturnType<typeof useResourceQuery<ApiKey[]>> {
	return useResourceQuery<ApiKey[]>(
		["api-keys", "list"],
		async () => {
			const res = await fetch("/api/v1/api-keys/list", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!res.ok) {
				throw new Error(`Failed to fetch API keys: ${res.statusText}`);
			}

			const data = await res.json();
			return data.keys || [];
		},
		{
			staleTime: 30000, // 30 seconds
		},
	);
}

/**
 * Create API key with optimistic update
 */
export function useCreateApiKey(): ReturnType<
	typeof useResourceMutation<
		ApiKey & { fullKey: string },
		CreateApiKeyInput,
		OptimisticContext
	>
> {
	const queryClient = useQueryClient();

	return useResourceMutation<
		ApiKey & { fullKey: string },
		CreateApiKeyInput,
		OptimisticContext
	>(
		async (input) => {
			const res = await fetch("/api/v1/api-keys/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(input),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error?.message || "Failed to create API key");
			}

			return res.json();
		},
		{
			onMutate: async (input) => {
				// Cancel outgoing queries
				await queryClient.cancelQueries({
					queryKey: ["api-keys", "list"],
				});

				// Snapshot current state for rollback
				const previousKeys = queryClient.getQueryData<ApiKey[]>([
					"api-keys",
					"list",
				]);

				// Optimistically add API key (without the full key for security)
				queryClient.setQueryData<ApiKey[]>(["api-keys", "list"], (old = []) => {
					const optimisticKey: ApiKey = {
						id: `temp-${Date.now()}`,
						name: input.name,
						keyPreview: "sk_****",
						createdAt: new Date().toISOString(),
						expiresAt: input.expiresInDays
							? new Date(
									Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000,
								).toISOString()
							: null,
						revokedAt: null,
						scopes: input.scopes || [],
						dailyRequestLimit: input.dailyRequestLimit || 1000,
						rateLimitPerMinute: input.rateLimitPerMinute || 60,
					};

					return [optimisticKey, ...old];
				});

				return { previousKeys } as unknown as OptimisticContext;
			},
			onError: (_error, _variables, context) => {
				// Rollback on error
				if (context?.previousKeys) {
					queryClient.setQueryData(["api-keys", "list"], context.previousKeys);
				}
			},
			onSettled: () => {
				// Refetch to get real data
				queryClient.invalidateQueries({
					queryKey: ["api-keys", "list"],
				});
			},
		},
	);
}

/**
 * Revoke API key with optimistic update
 */
export function useRevokeApiKey(): ReturnType<
	typeof useResourceMutation<void, RevokeApiKeyInput, OptimisticContext>
> {
	const queryClient = useQueryClient();

	return useResourceMutation<void, RevokeApiKeyInput, OptimisticContext>(
		async (input) => {
			const res = await fetch(`/api/v1/api-keys/${input.keyId}/revoke`, {
				method: "POST",
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error?.message || "Failed to revoke API key");
			}
		},
		{
			onMutate: async (input) => {
				await queryClient.cancelQueries({
					queryKey: ["api-keys", "list"],
				});

				const previousKeys = queryClient.getQueryData<ApiKey[]>([
					"api-keys",
					"list",
				]);

				// Optimistically mark key as revoked
				queryClient.setQueryData<ApiKey[]>(["api-keys", "list"], (old = []) =>
					old.map((key) =>
						key.id === input.keyId
							? {
									...key,
									revokedAt: new Date().toISOString(),
								}
							: key,
					),
				);

				return { previousKeys } as unknown as OptimisticContext;
			},
			onError: (_error, _input, context) => {
				// Rollback on error
				if (context?.previousKeys) {
					queryClient.setQueryData(["api-keys", "list"], context.previousKeys);
				}
			},
			onSettled: () => {
				queryClient.invalidateQueries({
					queryKey: ["api-keys", "list"],
				});
			},
		},
	);
}
