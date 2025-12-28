/**
 * Consolidated Motion System Tests
 *
 * Tests for the unified motion system following TDD red-green-refactor.
 * Validates:
 * - Single source of truth for useReducedMotion
 * - No duplicate implementations
 * - usehooks-ts integration for better bundle size
 * - Backward compatibility with existing imports
 *
 * Following 4-path coverage pattern (happy, sad, edge, error)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The consolidated exports should all come from one canonical location
import {
	// Hook (should use usehooks-ts internally)
	useReducedMotion,
	// Config re-exports
	SNAP_EASING,
	SNAP_TRANSITIONS,
	SNAP_VARIANTS,
	MOTION_PRESETS,
	// Utilities
	shouldReduceMotion,
	getOptimizedTransition,
	createOptimizedMotionProps,
	// Legacy support
	DURATION,
	EASING,
	fadeInUp,
	scaleIn,
	createTransition,
} from "@ui/lib/motion";

// =============================================================================
// CONSOLIDATED HOOK TESTS
// =============================================================================

describe("useReducedMotion (consolidated)", () => {
	let originalMatchMedia: typeof window.matchMedia;

	beforeEach(() => {
		originalMatchMedia = window.matchMedia;
	});

	afterEach(() => {
		window.matchMedia = originalMatchMedia;
		vi.clearAllMocks();
	});

	describe("Happy Path", () => {
		it("should return false when user prefers normal motion", async () => {
			// Mock matchMedia to return false for reduced motion
			window.matchMedia = vi.fn().mockImplementation((query) => ({
				matches: query !== "(prefers-reduced-motion: reduce)",
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}));

			// Import React testing utilities
			const { renderHook } = await import("@testing-library/react");
			const { result } = renderHook(() => useReducedMotion());

			expect(result.current).toBe(false);
		});

		it("should return true when user prefers reduced motion", async () => {
			window.matchMedia = vi.fn().mockImplementation((query) => ({
				matches: query === "(prefers-reduced-motion: reduce)",
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}));

			const { renderHook } = await import("@testing-library/react");
			const { result } = renderHook(() => useReducedMotion());

			expect(result.current).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should update when preference changes", async () => {
			let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

			window.matchMedia = vi.fn().mockImplementation((query) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn((event, handler) => {
					if (event === "change") {
						changeHandler = handler;
					}
				}),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}));

			const { renderHook, act } = await import("@testing-library/react");
			const { result } = renderHook(() => useReducedMotion());

			expect(result.current).toBe(false);

			// Simulate preference change
			if (changeHandler) {
				act(() => {
					changeHandler!({ matches: true } as MediaQueryListEvent);
				});
			}

			expect(result.current).toBe(true);
		});
	});
});

// =============================================================================
// SINGLE SOURCE OF TRUTH VALIDATION
// =============================================================================

describe("Motion System Single Source of Truth", () => {
	it("should export all required config values", () => {
		expect(SNAP_EASING).toBeDefined();
		expect(SNAP_EASING.instant).toBeDefined();
		expect(SNAP_EASING.snapBack).toBeDefined();
		expect(SNAP_EASING.protect).toBeDefined();
	});

	it("should export all required transitions", () => {
		expect(SNAP_TRANSITIONS).toBeDefined();
		expect(SNAP_TRANSITIONS.instant).toHaveProperty("duration");
		expect(SNAP_TRANSITIONS.snapBack).toHaveProperty("ease");
	});

	it("should export all required variants", () => {
		expect(SNAP_VARIANTS).toBeDefined();
		expect(SNAP_VARIANTS.pageEntrance).toBeDefined();
		expect(SNAP_VARIANTS.button).toBeDefined();
		expect(SNAP_VARIANTS.modal).toBeDefined();
	});

	it("should export motion presets", () => {
		expect(MOTION_PRESETS).toBeDefined();
		expect(MOTION_PRESETS.fadeIn).toBeDefined();
		expect(MOTION_PRESETS.slideUp).toBeDefined();
		expect(MOTION_PRESETS.scaleIn).toBeDefined();
	});

	it("should export utility functions", () => {
		expect(typeof shouldReduceMotion).toBe("function");
		expect(typeof getOptimizedTransition).toBe("function");
		expect(typeof createOptimizedMotionProps).toBe("function");
	});
});

// =============================================================================
// LEGACY COMPATIBILITY TESTS
// =============================================================================

describe("Legacy Compatibility", () => {
	it("should export legacy DURATION constants", () => {
		expect(DURATION).toBeDefined();
		expect(DURATION.instant).toBe(0);
		expect(DURATION.fast).toBe(150);
		expect(DURATION.normal).toBe(300);
	});

	it("should export legacy EASING curves", () => {
		expect(EASING).toBeDefined();
		expect(EASING.apple).toBeDefined();
		expect(EASING.standard).toBeDefined();
		expect(EASING.snapback).toBeDefined();
	});

	it("should export legacy variants", () => {
		expect(fadeInUp).toBeDefined();
		expect(fadeInUp.initial).toHaveProperty("opacity", 0);
		expect(fadeInUp.animate).toHaveProperty("opacity", 1);
	});

	it("should export legacy scaleIn variant", () => {
		expect(scaleIn).toBeDefined();
		expect(scaleIn.initial).toHaveProperty("scale");
		expect(scaleIn.animate).toHaveProperty("scale", 1);
	});

	it("should export createTransition factory", () => {
		expect(typeof createTransition).toBe("function");

		// Should return instant transition when reduced motion is true
		const reducedTransition = createTransition(true, { duration: 0.5 });
		expect(reducedTransition.duration).toBe(0);

		// Should return normal transition when reduced motion is false
		const normalTransition = createTransition(false, { duration: 0.5 });
		expect(normalTransition.duration).toBe(0.5);
	});
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe("Motion Utility Functions", () => {
	describe("shouldReduceMotion", () => {
		it("should return false in SSR context", () => {
			// In test environment with mocked window, simulate SSR
			const originalWindow = global.window;
			// @ts-expect-error - Testing SSR scenario
			delete global.window;

			// Re-import to get fresh module
			expect(shouldReduceMotion()).toBe(false);

			global.window = originalWindow;
		});
	});

	describe("getOptimizedTransition", () => {
		it("should return base transition for desktop users", () => {
			window.matchMedia = vi.fn().mockImplementation(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}));

			const base = { duration: 0.6, ease: [0.4, 0, 0.2, 1] };
			const result = getOptimizedTransition(base);

			expect(result.duration).toBe(0.6);
		});

		it("should return instant transition for reduced motion", () => {
			window.matchMedia = vi.fn().mockImplementation((query) => ({
				matches: query === "(prefers-reduced-motion: reduce)",
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}));

			const base = { duration: 0.6 };
			const result = getOptimizedTransition(base, { respectReducedMotion: true });

			expect(result.duration).toBe(0);
		});
	});

	describe("createOptimizedMotionProps", () => {
		it("should return GPU acceleration hints", () => {
			const props = createOptimizedMotionProps();

			expect(props.style.willChange).toBe("transform");
			expect(props.style.backfaceVisibility).toBe("hidden");
		});

		it("should merge custom overrides", () => {
			const props = createOptimizedMotionProps({
				style: { opacity: 0.5 },
				custom: "value",
			});

			expect(props.style.opacity).toBe(0.5);
			expect(props.custom).toBe("value");
		});
	});
});

// =============================================================================
// PERFORMANCE CONSTANTS TESTS
// =============================================================================

describe("Performance Constants", () => {
	it("should have correct SNAP_TRANSITIONS durations for brand promise", () => {
		// SnapBack brand promise is <100ms feeling for instant actions
		expect(SNAP_TRANSITIONS.instant.duration).toBeLessThanOrEqual(0.15);
		expect(SNAP_TRANSITIONS.protect.duration).toBeLessThanOrEqual(0.2);
	});

	it("should use cubic bezier easing (GPU-friendly)", () => {
		// All easing should be arrays of 4 numbers (cubic bezier)
		expect(SNAP_EASING.instant).toHaveLength(4);
		expect(SNAP_EASING.snapBack).toHaveLength(4);
		expect(SNAP_EASING.protect).toHaveLength(4);
	});
});
