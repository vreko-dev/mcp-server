/**
 * Session Recording Hook Tests
 *
 * Tests for the useSessionRecording React hook.
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionRecording } from "../../../../modules/analytics/hooks/use-session-recording";

// Mock window.posthog
const mockPostHog = {
	startSessionRecording: vi.fn(),
	stopSessionRecording: vi.fn(),
};

beforeEach(() => {
	vi.clearAllMocks();

	// Reset window.posthog mock
	Object.defineProperty(window, "posthog", {
		writable: true,
		value: mockPostHog,
	});
});

describe("useSessionRecording", () => {
	it("should initialize with default values", () => {
		const { result } = renderHook(() => useSessionRecording());

		expect(result.current.isRecording).toBe(false);
		expect(result.current.samplingRate).toBe(0.3);
		expect(result.current.budgetUtilization).toBe(0);
	});

	it("should start recording when startRecording is called", () => {
		const { result } = renderHook(() => useSessionRecording());

		act(() => {
			result.current.startRecording();
		});

		expect(result.current.isRecording).toBe(true);
		expect(mockPostHog.startSessionRecording).toHaveBeenCalled();
	});

	it("should stop recording when stopRecording is called", () => {
		const { result } = renderHook(() => useSessionRecording());

		act(() => {
			result.current.startRecording();
		});

		expect(result.current.isRecording).toBe(true);

		act(() => {
			result.current.stopRecording();
		});

		expect(result.current.isRecording).toBe(false);
		expect(mockPostHog.stopSessionRecording).toHaveBeenCalled();
	});

	it("should update context when provided", () => {
		const { result } = renderHook(() =>
			useSessionRecording({
				context: {
					plan: "pro",
					isOnboarding: true,
				},
			}),
		);

		// The hook should update the session replay manager with the context
		// We're testing that it doesn't crash with context updates
		expect(result.current).toBeDefined();
	});

	it("should handle missing posthog gracefully", () => {
		// Remove posthog from window
		Object.defineProperty(window, "posthog", {
			writable: true,
			value: undefined,
		});

		const { result } = renderHook(() => useSessionRecording());

		act(() => {
			result.current.startRecording();
		});

		// Should not crash even without posthog
		expect(result.current.isRecording).toBe(false);
	});
});
