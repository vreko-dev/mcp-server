import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	useApiKeys,
	useCreateApiKey,
	useRevokeApiKey,
} from "@/hooks/use-api-keys";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Create a wrapper component with QueryClientProvider
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	});

	return function Wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(
			QueryClientProvider,
			{ client: queryClient },
			children,
		);
	};
};

describe("use-api-keys", () => {
	const mockApiKeys = [
		{
			id: "key-1",
			name: "Test Key 1",
			keyPreview: "sk_1234",
			createdAt: "2023-01-01T00:00:00Z",
			expiresAt: null,
			revokedAt: null,
			scopes: ["read", "write"],
			dailyRequestLimit: 1000,
			rateLimitPerMinute: 60,
		},
		{
			id: "key-2",
			name: "Test Key 2",
			keyPreview: "sk_5678",
			createdAt: "2023-01-02T00:00:00Z",
			expiresAt: "2024-01-01T00:00:00Z",
			revokedAt: null,
			scopes: ["read"],
			dailyRequestLimit: 100,
			rateLimitPerMinute: 10,
		},
	];

	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	describe("useApiKeys", () => {
		it("should fetch API keys and return ready state", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ keys: mockApiKeys }),
			});

			const { result } = renderHook(() => useApiKeys(), {
				wrapper: createWrapper(),
			});

			// Should start in loading state
			expect(result.current.state).toBe("loading");

			// Wait for data to load
			await waitFor(() => {
				expect(result.current.state).toBe("ready");
			});

			// Should have the correct data
			if (result.current.state === "ready") {
				expect(result.current.data).toEqual(mockApiKeys);
			}
		});

		it("should handle API errors gracefully", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				statusText: "Not Found",
			});

			const { result } = renderHook(() => useApiKeys(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.state).toBe("error");
			});

			if (result.current.state === "error") {
				expect(result.current.error.message).toBe(
					"Failed to fetch API keys: Not Found",
				);
			}
		});
	});

	describe("useCreateApiKey", () => {
		it("should create API key successfully", async () => {
			const newKey = {
				...mockApiKeys[0],
				fullKey: "sk_full_test_key_1234567890",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => newKey,
			});

			const { result } = renderHook(() => useCreateApiKey(), {
				wrapper: createWrapper(),
			});

			// Trigger the mutation
			act(() => {
				result.current.mutate({ name: "New Test Key" });
			});

			// Wait for mutation to start and complete
			await waitFor(() => {
				// Either pending or success state
				expect(result.current.isPending || result.current.isSuccess).toBe(true);
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			// Should be successful
			if (result.current.data) {
				expect(result.current.data.fullKey).toBe("sk_full_test_key_1234567890");
			}
		});

		it("should handle creation errors", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: { message: "Invalid input" } }),
			});

			const { result } = renderHook(() => useCreateApiKey(), {
				wrapper: createWrapper(),
			});

			// Trigger the mutation
			act(() => {
				result.current.mutate({ name: "New Test Key" });
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			// Should have an error
			if (result.current.error) {
				expect(result.current.error.message).toBe("Invalid input");
			}
		});
	});

	describe("useRevokeApiKey", () => {
		it("should revoke API key successfully", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true }),
			});

			const { result } = renderHook(() => useRevokeApiKey(), {
				wrapper: createWrapper(),
			});

			// Trigger the mutation
			act(() => {
				result.current.mutate({ keyId: "key-1" });
			});

			// Wait for mutation to start and complete
			await waitFor(() => {
				// Either pending or success state
				expect(result.current.isPending || result.current.isSuccess).toBe(true);
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
		});

		it("should handle revocation errors", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					error: { message: "Resource not found." },
				}),
			});

			const { result } = renderHook(() => useRevokeApiKey(), {
				wrapper: createWrapper(),
			});

			// Trigger the mutation
			act(() => {
				result.current.mutate({ keyId: "non-existent-key" });
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			// Should have an error
			if (result.current.error) {
				expect(result.current.error.message).toBe("Resource not found.");
			}
		});
	});
});
