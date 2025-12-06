/**
 * useBulkProtectionStatus Hook Tests
 *
 * Real-time subscription for multiple files' protection statuses
 * Watches all files in a list and updates when any protection status changes
 *
 * Tests follow 4-path model: Happy Path | Sad Path | Edge Cases | Error Cases
 * @see TESTING_IMPLEMENTATION_GUIDE.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBulkProtectionStatus } from '../use-bulk-protection-status';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// MOCKS & FIXTURES
// ============================================================================

const mockSupabaseClient = {
	from: vi.fn(),
	channel: vi.fn(),
	removeChannel: vi.fn(),
};

const mockRealtimeChannel: Partial<RealtimeChannel> = {
	on: vi.fn().mockReturnThis(),
	subscribe: vi.fn().mockResolvedValue(undefined),
	unsubscribe: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
	supabase: mockSupabaseClient,
}));

describe('useBulkProtectionStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient.from.mockReturnValue({
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
		});
		mockSupabaseClient.channel.mockReturnValue(mockRealtimeChannel);
	});

	// ========================================
	// ✅ HAPPY PATH
	// ========================================
	describe('Happy Path', () => {
		it('should initialize with loading state for empty array', () => {
			const { result } = renderHook(() =>
				useBulkProtectionStatus([])
			);

			expect(result.current.isLoading).toBe(false);
			expect(result.current.statuses.size).toBe(0);
		});

		it('should fetch protection statuses for multiple files', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [
					{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' },
					{ id: 'file_2', protection: 'disabled', updated_at: '2025-01-01' },
					{ id: 'file_3', protection: 'enabled', updated_at: '2025-01-01' },
				],
				error: null,
			});

			const { result } = renderHook(() =>
				useBulkProtectionStatus(['file_1', 'file_2', 'file_3'])
			);

			await waitFor(() => {
				expect(result.current.statuses.size).toBe(3);
				expect(result.current.statuses.get('file_1')?.protection).toBe('enabled');
				expect(result.current.statuses.get('file_2')?.protection).toBe('disabled');
			});
		});

		it('should subscribe to bulk protection changes', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [
					{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' },
				],
				error: null,
			});

			const { result } = renderHook(() =>
				useBulkProtectionStatus(['file_1'])
			);

			await waitFor(() => {
				expect(mockSupabaseClient.channel).toHaveBeenCalledWith('bulk_protection_changes');
			});
		});

		it('should update map when real-time event received', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [
					{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' },
				],
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
				useBulkProtectionStatus(['file_1', 'file_2'])
			);

			await waitFor(() => {
				expect(result.current.statuses.get('file_1')?.protection).toBe('enabled');
			});

			// Simulate update: file_2 protection enabled
			if (subscriptionCallback) {
				subscriptionCallback({
					new: { id: 'file_2', protection: 'enabled', updated_at: '2025-01-02' },
				});
			}

			await waitFor(() => {
				expect(result.current.statuses.get('file_2')?.protection).toBe('enabled');
			});
		});

		it('should unsubscribe from channel on unmount', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' }],
				error: null,
			});

			const { unmount } = renderHook(() =>
				useBulkProtectionStatus(['file_1'])
			);

			await waitFor(() => {
				expect(mockRealtimeChannel.on).toHaveBeenCalled();
			});

			unmount();

			expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
		});
	});

	// ========================================
	// ❌ SAD PATH
	// ========================================
	describe('Sad Path - Validation & Failures', () => {
		it('should not fetch when fileIds array is empty', () => {
			const { result } = renderHook(() =>
				useBulkProtectionStatus([])
			);

			expect(result.current.isLoading).toBe(false);
			expect(mockSupabaseClient.from).not.toHaveBeenCalled();
		});

		it('should handle database error gracefully', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: null,
				error: new Error('Database error'),
			});

			const { result } = renderHook(() =>
				useBulkProtectionStatus(['file_1', 'file_2'])
			);

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
				expect(result.current.statuses.size).toBe(0);
			});
		});

		it('should handle partial results (some files not found)', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [
					{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' },
					// file_2 and file_3 not returned
				],
				error: null,
			});

			const { result } = renderHook(() =>
				useBulkProtectionStatus(['file_1', 'file_2', 'file_3'])
			);

			await waitFor(() => {
				expect(result.current.statuses.size).toBe(1);
				expect(result.current.statuses.has('file_2')).toBe(false);
			});
		});

		it('should ignore real-time updates for unwatched files', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' }],
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
				useBulkProtectionStatus(['file_1'])
			);

			await waitFor(() => {
				expect(result.current.statuses.size).toBe(1);
			});

			// Try to update unwatched file
			if (subscriptionCallback) {
				subscriptionCallback({
					new: { id: 'unwatched_file', protection: 'enabled', updated_at: '2025-01-02' },
				});
			}

			// Should still only have file_1
			expect(result.current.statuses.size).toBe(1);
			expect(result.current.statuses.has('unwatched_file')).toBe(false);
		});
	});

	// ========================================
	// ⚠️ EDGE CASES
	// ========================================
	describe('Edge Cases', () => {
		it('should handle large number of files (100+)', async () => {
			const fileIds = Array.from({ length: 150 }, (_, i) => `file_${i}`);
			const mockData = fileIds.map((id) => ({
				id,
				protection: Math.random() > 0.5 ? 'enabled' : 'disabled',
				updated_at: '2025-01-01',
			}));

			mockSupabaseClient.from().in.mockResolvedValue({
				data: mockData,
				error: null,
			});

			const { result } = renderHook(() =>
				useBulkProtectionStatus(fileIds)
			);

			await waitFor(() => {
				expect(result.current.statuses.size).toBe(150);
			});
		});

		it('should handle fileIds array changes', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' }],
				error: null,
			});

			const { rerender } = renderHook(
				({ fileIds }: { fileIds: string[] }) =>
					useBulkProtectionStatus(fileIds),
				{ initialProps: { fileIds: ['file_1'] } }
			);

			await waitFor(() => {
				expect(mockSupabaseClient.from).toHaveBeenCalled();
			});

			mockSupabaseClient.from().in.mockResolvedValue({
				data: [
					{ id: 'file_2', protection: 'disabled', updated_at: '2025-01-01' },
					{ id: 'file_3', protection: 'enabled', updated_at: '2025-01-01' },
				],
				error: null,
			});

			rerender({ fileIds: ['file_2', 'file_3'] });

			// Should cleanup old subscription
			expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
		});

		it('should handle rapid protection status changes', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' }],
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
				useBulkProtectionStatus(['file_1'])
			);

			await waitFor(() => {
				expect(result.current.statuses.size).toBe(1);
			});

			// Simulate 5 rapid updates
			if (subscriptionCallback) {
				for (let i = 0; i < 5; i++) {
					const status = i % 2 === 0 ? 'enabled' : 'disabled';
					subscriptionCallback({
						new: { id: 'file_1', protection: status, updated_at: `2025-01-0${i + 2}` },
					});
				}
			}

			// Should have final state (disabled)
			expect(result.current.statuses.get('file_1')?.protection).toBe('disabled');
		});

		it('should handle concurrent hook instances', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' }],
				error: null,
			});

			const { result: result1 } = renderHook(() =>
				useBulkProtectionStatus(['file_1', 'file_2'])
			);

			const { result: result2 } = renderHook(() =>
				useBulkProtectionStatus(['file_3', 'file_4'])
			);

			await waitFor(() => {
				expect(result1.current).toBeDefined();
				expect(result2.current).toBeDefined();
			});

			// Each should have separate subscriptions
			expect(mockSupabaseClient.channel).toHaveBeenCalledTimes(2);
		});
	});

	// ========================================
	// 💥 ERROR CASES
	// ========================================
	describe('Error Cases - System Failures', () => {
		it('should recover when network comes back online', async () => {
			// First call fails
			mockSupabaseClient.from().in.mockRejectedValueOnce(
				new Error('Network error')
			);

			const { result, rerender } = renderHook(
				({ fileIds }: { fileIds: string[] }) =>
					useBulkProtectionStatus(fileIds),
				{ initialProps: { fileIds: ['file_1'] } }
			);

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Network recovers
			mockSupabaseClient.from().in.mockResolvedValueOnce({
				data: [{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' }],
				error: null,
			});

			// Trigger refetch by changing fileIds
			rerender({ fileIds: ['file_1', 'file_2'] });

			await waitFor(() => {
				expect(result.current.statuses.size).toBeGreaterThan(0);
			});
		});

		it('should handle Supabase auth error (401)', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: null,
				error: { status: 401, message: 'Unauthorized' },
			});

			const { result } = renderHook(() =>
				useBulkProtectionStatus(['file_1'])
			);

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
				expect(result.current.statuses.size).toBe(0);
			});
		});

		it('should handle Supabase timeout', async () => {
			mockSupabaseClient.from().in.mockImplementation(() => {
				return new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Request timeout')), 100)
				);
			});

			const { result } = renderHook(() =>
				useBulkProtectionStatus(['file_1'])
			);

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});
		});

		it('should not crash on invalid real-time payload', async () => {
			mockSupabaseClient.from().in.mockResolvedValue({
				data: [{ id: 'file_1', protection: 'enabled', updated_at: '2025-01-01' }],
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
				useBulkProtectionStatus(['file_1'])
			);

			await waitFor(() => {
				expect(result.current.statuses.size).toBe(1);
			});

			// Send malformed payload
			if (subscriptionCallback) {
				subscriptionCallback({ new: null });
				subscriptionCallback({ new: {} });
				subscriptionCallback({ new: { id: 'file_1' } }); // Missing protection
			}

			// Hook should still be functional
			expect(result.current).toBeDefined();
		});
	});
});
