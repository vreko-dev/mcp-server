import {
	defaultShouldDehydrateQuery,
	QueryClient,
} from "@tanstack/react-query";

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000, // 5 minutes (snapshots don't change often)
				gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
				retry: 1, // Retry once on failure
				// Prevent refetch storms on tab switches and network reconnections
				refetchOnWindowFocus: false, // Don't refetch on focus (opt-in per query)
				refetchOnReconnect: false, // Don't refetch on reconnect (prevents storms)
				// Only refetch on mount if data is stale
				refetchOnMount: true,
			},
			dehydrate: {
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
			},
			mutations: {
				retry: 1,
			},
		},
	});
}

export function createQueryKeyWithParams(
	key: string | string[],
	params: Record<string, string | number>,
) {
	return [
		...(Array.isArray(key) ? key : [key]),
		Object.entries(params)
			.reduce((acc, [key, value]) => {
				acc.push(`${key}:${value}`);
				return acc;
			}, [] as string[])
			.join("_"),
	] as const;
}
