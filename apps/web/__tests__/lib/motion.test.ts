// Import the utilities we're testing
import { createTransition, useReducedMotion } from "@marketing/lib/motion";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Motion Utilities", () => {
	let matchMediaMock: ReturnType<typeof vi.fn>;
	let mediaQueryList: MediaQueryList;
	let originalWindow: typeof global.window;

	beforeEach(() => {
		// Save original window
		originalWindow = global.window;

		// Setup matchMedia mock (only if window exists)
		if (typeof window !== "undefined") {
			mediaQueryList = {
				matches: false,
				media: "(prefers-reduced-motion: reduce)",
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			} as unknown as MediaQueryList;

			matchMediaMock = vi.fn().mockReturnValue(mediaQueryList);
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: matchMediaMock,
			});
		}
	});

	afterEach(() => {
		// Restore window if it was modified
		if (global.window !== originalWindow) {
			global.window = originalWindow;
		}
		vi.clearAllMocks();
	});

	describe("useReducedMotion", () => {
		it("should return false when user does not prefer reduced motion", () => {
			mediaQueryList.matches = false;
			const { result } = renderHook(() => useReducedMotion());

			expect(result.current).toBe(false);
		});

		it("should return true when user prefers reduced motion", () => {
			mediaQueryList.matches = true;
			const { result } = renderHook(() => useReducedMotion());

			expect(result.current).toBe(true);
		});

		it("should update when media query changes", () => {
			const { result } = renderHook(() => useReducedMotion());

			// Initial state
			expect(result.current).toBe(false);

			// Simulate media query change
			act(() => {
				mediaQueryList.matches = true;
				const changeHandler = (
					mediaQueryList.addEventListener as ReturnType<typeof vi.fn>
				).mock.calls.find((call) => call[0] === "change")?.[1];
				if (changeHandler) {
					changeHandler({ matches: true } as MediaQueryListEvent);
				}
			});

			expect(result.current).toBe(true);
		});

		it("should cleanup event listener on unmount", () => {
			const { unmount } = renderHook(() => useReducedMotion());

			expect(mediaQueryList.addEventListener).toHaveBeenCalledWith(
				"change",
				expect.any(Function),
			);

			unmount();

			expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith(
				"change",
				expect.any(Function),
			);
		});
	});

	describe("createTransition", () => {
		it("should return normal duration when reduced motion is not preferred", () => {
			const transition = createTransition(false, {
				duration: 0.5,
				delay: 0.1,
			});

			expect(transition.duration).toBe(0.5);
			expect(transition.delay).toBe(0.1);
		});

		it("should return zero duration when reduced motion is preferred", () => {
			const transition = createTransition(true, {
				duration: 0.5,
				delay: 0.1,
			});

			expect(transition.duration).toBe(0);
		});

		it("should use default values when options not provided", () => {
			const transition = createTransition(false, {});

			expect(transition.duration).toBe(0.3);
			expect(transition.delay).toBe(0);
			expect(transition.ease).toEqual([0.4, 0.0, 0.2, 1]);
		});
	});
});
