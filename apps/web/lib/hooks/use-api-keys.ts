import type { ApiKey } from "../types";
import {
	useResourceMutation,
	useResourceQuery,
} from "../use-resource-query";

// Mock API functions - these would be replaced with actual API calls
const fetchApiKeys = async (): Promise<ApiKey[]> => {
	// In a real implementation, this would fetch from an API
	return Promise.resolve([
		{
			id: "key_1",
			name: "VS Code Extension",
			preview: "sb_abcd...",
			createdAt: new Date("2024-01-10"),
			lastUsedAt: new Date("2024-01-15"),
			status: "active",
		},
		{
			id: "key_2",
			name: "CLI Tool",
			preview: "sb_efgh...",
			createdAt: new Date("2024-01-12"),
			lastUsedAt: null,
			status: "active",
		},
	]);
};

const createApiKey = async (
	name: string,
): Promise<ApiKey & { fullKey: string }> => {
	// In a real implementation, this would create an API key via API
	const fullKey = `sb_${Math.random()
		.toString(36)
		.substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
	const preview = `sb_${fullKey.substring(2, 6)}...`;

	return Promise.resolve({
		id: `key_${Date.now()}`,
		name,
		preview,
		createdAt: new Date(),
		lastUsedAt: null,
		status: "active",
		fullKey,
	});
};

const revokeApiKey = async (_id: string): Promise<void> => {
	// In a real implementation, this would revoke an API key via API
	return Promise.resolve();
};

// Hook implementation
export function useApiKeys() {
	const apiKeysQuery = useResourceQuery<ApiKey[]>(["api-keys"], fetchApiKeys);

	const createApiKeyMutation = useResourceMutation<
		ApiKey & { fullKey: string },
		string
	>(createApiKey, {
		// Optimistic update example
		onMutate: (name) => {
			// Optimistic update logic would go here
			console.log(`Creating API key: ${name}`);
		},
		onSuccess: () => {
			// Invalidate and refetch
			// queryClient.invalidateQueries(['api-keys']);
		},
	});

	const revokeApiKeyMutation = useResourceMutation<void, string>(revokeApiKey, {
		onSuccess: () => {
			// Invalidate and refetch
			// queryClient.invalidateQueries(['api-keys']);
		},
	});

	return {
		apiKeys: apiKeysQuery,
		createApiKey: createApiKeyMutation,
		revokeApiKey: revokeApiKeyMutation,
	};
}
