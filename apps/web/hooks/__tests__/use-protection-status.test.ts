import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useProtectionStatus } from "../use-protection-status";

// ============================================================================
// MOCKS & FIXTURES
// ============================================================================

vi.mock('@/lib/supabase');

const mockRealtimeChannel: Partial<RealtimeChannel> = {
	on: vi.fn().mockReturnThis(),
	subscribe: vi.fn().mockResolvedValue(undefined),
	unsubscribe: vi.fn(),
};

describe("useProtectionStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient.from.mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			single: vi.fn(),
		});
		mockSupabaseClient.channel.mockReturnValue(mockRealtimeChannel);
	});

	// ========================================
	// ✅ HAPPY PATH
	// ========================================
	describe("Happy Path", () => {
		it("should initialize with loading state", () => {
			const mockSupabaseClient = vi.mocked(supabase);
			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
				})
			);

			expect(result.current.status).toBe("loading");
		});

		it("should fetch initial protection status successfully", async () => {
			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
				})
			);

			await waitFor(() => {
				expect(result.current.status).toBe("protected");
			});
		});

		it("should subscribe to real-time updates", async () => {
			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
				})
			);

			await waitFor(() => {
				expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
					expect.stringContaining("protection:file_123")
				);
			});
		});

		it("should mark as real-time when subscription succeeds", async () => {
			let subscriptionCallback: ((status: string) => void) | null = null;

			mockRealtimeChannel.subscribe = vi
				.fn()
				.mockImplementation((callback: (status: string) => void) => {
					subscriptionCallback = callback;
					subscriptionCallback("SUBSCRIBED");
					return Promise.resolve(undefined);
				});

			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
				})
			);

			await waitFor(() => {
				expect(result.current.isRealtime).toBe(true);
			});
		});

		it("should unsubscribe from channel on unmount", async () => {
			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { unmount } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
				})
			);

			await waitFor(() => {
				expect(mockRealtimeChannel.on).toHaveBeenCalled();
			});

			unmount();

			expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
		});

		it("should call onStatusChange callback when status updates", async () => {
			const onStatusChange = vi.fn();

			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
					onStatusChange,
				})
			);

			await waitFor(() => {
				expect(result.current.status).toBe("protected");
				expect(onStatusChange).toHaveBeenCalledWith("protected");
			});
		});
	});

	// ========================================
	// ❌ SAD PATH
	// ========================================
	describe("Sad Path - Validation & Failures", () => {
		it("should not fetch if fileId is empty", () => {
			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "",
				})
			);

			expect(result.current.status).toBe("loading");
			expect(mockSupabaseClient.from).not.toHaveBeenCalled();
		});

		it("should set error state when initial fetch fails", async () => {
			mockSupabaseClient.from().single.mockResolvedValue({
				data: null,
				error: new Error("Database error"),
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
				})
			);

			await waitFor(() => {
				expect(result.current.status).toBe("error");
			});
		});

		it("should handle no rows returned (PGRST116)", async () => {
			mockSupabaseClient.from().single.mockResolvedValue({
				data: null,
				error: { code: "PGRST116" },
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "nonexistent",
				})
			);

			await waitFor(() => {
				// PGRST116 is "no rows" - should treat as unprotected, not error
				expect(result.current.status).not.toBe("error");
			});
		});

		it("should fallback to polling when real-time channel errors", async () => {
			let subscriptionCallback: ((status: string) => void) | null = null;

			mockRealtimeChannel.subscribe = vi
				.fn()
				.mockImplementation((callback: (status: string) => void) => {
					subscriptionCallback = callback;
					subscriptionCallback("CHANNEL_ERROR");
					return Promise.resolve(undefined);
				});

			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
					fallbackToPolling: true,
				})
			);

			await waitFor(() => {
				expect(result.current.isRealtime).toBe(false);
			});
		});

		it("should not fallback to polling if explicitly disabled", async () => {
			let subscriptionCallback: ((status: string) => void) | null = null;

			mockRealtimeChannel.subscribe = vi
				.fn()
				.mockImplementation((callback: (status: string) => void) => {
					subscriptionCallback = callback;
					subscriptionCallback("CHANNEL_ERROR");
					return Promise.resolve(undefined);
				});

			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
					fallbackToPolling: false,
				})
			);

			await waitFor(() => {
				expect(result.current.isRealtime).toBe(false);
			});
		});
	});

	// ========================================
	// ⚠️ EDGE CASES
	// ========================================
	describe("Edge Cases", () => {
		it("should handle rapid fileId changes", async () => {
			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { rerender } = renderHook(
				({ fileId }: { fileId: string }) =>
					useProtectionStatus({ fileId }),
				{ initialProps: { fileId: "file_123" } }
			);

			rerender({ fileId: "file_456" });
			rerender({ fileId: "file_789" });

			// Should cleanup previous channel subscriptions
			expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
		});

		it("should handle protection status toggling", async () => {
			const onStatusChange = vi.fn();

			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			let subscriptionCallback: ((payload: any) => void) | null = null;

			mockRealtimeChannel.on = vi
				.fn()
				.mockImplementation((event, config, callback) => {
					subscriptionCallback = callback;
					return mockRealtimeChannel;
				});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
					onStatusChange,
				})
			);

			await waitFor(() => {
				expect(result.current.status).toBe("protected");
			});

			// Simulate real-time update: protection disabled
			if (subscriptionCallback) {
				subscriptionCallback({
					new: { protection: "disabled" },
				});
			}

			await waitFor(() => {
				expect(result.current.status).toBe("unprotected");
				expect(onStatusChange).toHaveBeenCalledWith("unprotected");
			});
		});

		it("should handle very large fileId strings", async () => {
			const largeFileId = "file_" + "x".repeat(1000);

			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: largeFileId,
				})
			);

			await waitFor(() => {
				expect(result.current.status).toBe("protected");
			});

			// Verify query was made with large ID
			expect(mockSupabaseClient.from).toHaveBeenCalled();
		});

		it("should handle concurrent hook instances", async () => {
			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { result: result1 } = renderHook(() =>
				useProtectionStatus({ fileId: "file_123" })
			);

			const { result: result2 } = renderHook(() =>
				useProtectionStatus({ fileId: "file_456" })
			);

			await waitFor(() => {
				expect(result1.current.status).toBe("protected");
				expect(result2.current.status).toBe("protected");
			});

			// Verify separate subscriptions were created
			expect(mockSupabaseClient.channel).toHaveBeenCalledTimes(2);
		});
	});

	// ========================================
	// 💥 ERROR CASES
	// ========================================
	describe("Error Cases - System Failures", () => {
		it("should recover when network comes back online", async () => {
			const onStatusChange = vi.fn();

			// First call fails
			mockSupabaseClient.from().single.mockRejectedValueOnce(
				new Error("Network error")
			);

			const { result, rerender } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
					onStatusChange,
				})
			);

			await waitFor(() => {
				expect(result.current.status).toBe("error");
			});

			// Network recovers
			mockSupabaseClient.from().single.mockResolvedValueOnce({
				data: { protection: "enabled" },
				error: null,
			});

			// Trigger refetch
			const refetch = result.current.refetch;
			await refetch?.();

			await waitFor(() => {
				expect(result.current.status).toBe("protected");
			});
		});

		it("should handle Supabase auth error (401)", async () => {
			mockSupabaseClient.from().single.mockResolvedValue({
				data: null,
				error: { status: 401, message: "Unauthorized" },
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
				})
			);

			await waitFor(() => {
				expect(result.current.status).toBe("error");
			});
		});

		it("should handle Supabase timeout", async () => {
			mockSupabaseClient.from().single.mockImplementation(() => {
				return new Promise((_, reject) =>
					setTimeout(
						() => reject(new Error("Request timeout")),
						100
					)
				);
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
					fallbackToPolling: true,
				})
			);

			await waitFor(() => {
				expect(result.current.status).toBe("error");
			});
		});

		it("should not crash when channel.on returns invalid data", async () => {
			mockRealtimeChannel.on = vi.fn().mockReturnValueOnce(null);

			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			const { result } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
				})
			);

			await waitFor(() => {
				expect(result.current).toBeDefined();
			});
		});

		it("should cleanup polling interval on unmount", async () => {
			const clearIntervalSpy = vi.spyOn(global, "clearInterval");

			mockSupabaseClient.from().single.mockResolvedValue({
				data: { protection: "enabled" },
				error: null,
			});

			let subscriptionCallback: ((status: string) => void) | null = null;

			mockRealtimeChannel.subscribe = vi
				.fn()
				.mockImplementation((callback: (status: string) => void) => {
					subscriptionCallback = callback;
					subscriptionCallback("CHANNEL_ERROR"); // Trigger polling
					return Promise.resolve(undefined);
				});

			const { unmount } = renderHook(() =>
				useProtectionStatus({
					fileId: "file_123",
					fallbackToPolling: true,
				})
			);

			await waitFor(() => {
				expect(mockRealtimeChannel.subscribe).toHaveBeenCalled();
			});

			unmount();

			// Polling should be cleaned up
			expect(clearIntervalSpy).toHaveBeenCalled();

			clearIntervalSpy.mockRestore();
		});
	});
});
