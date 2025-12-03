/**
 * SnapBack Unified Motion System
 * Single source of truth for all animations and motion
 *
 * @deprecated Individual exports - Import from this file directly
 * Legacy exports maintained for backward compatibility
 */

"use client";

import type { Transition, Variants } from "motion/react";

// Re-export comprehensive motion config as primary system
export {
	SNAP_EASING,
	SNAP_TRANSITIONS,
	SNAP_VARIANTS,
	MOTION_PRESETS,
	PERFORMANCE_TARGETS,
	GPU_ACCELERATED_PROPS,
	EXPENSIVE_PROPS,
	shouldReduceMotion,
	isMobileDevice,
	getOptimizedTransition,
	createOptimizedMotionProps,
	type SnapEasing,
	type SnapTransitions,
	type SnapVariants,
	type MotionPresets,
} from "@marketing/lib/motion-config";

// Re-export useReducedMotion hook
export { useReducedMotion } from "@ui/hooks/use-reduced-motion";

// ===== LEGACY EXPORTS (Deprecated but maintained for compatibility) =====

/**
 * @deprecated Use SNAP_TRANSITIONS from motion-config instead
 * Legacy duration constants - mapped to new system
 */
export const DURATION = {
	instant: 0,
	fast: 150,    // Maps to SNAP_TRANSITIONS.protect (150ms)
	normal: 300,  // Base transition duration
	moderate: 500, // Maps to SNAP_TRANSITIONS.recover (500ms)
	slow: 800,    // Slow transitions
} as const;

/**
 * @deprecated Use SNAP_EASING from motion-config instead
 * Legacy easing curves - mapped to new system
 */
export const EASING = {
	apple: [0.16, 1, 0.3, 1] as [number, number, number, number],
	standard: [0.4, 0.0, 0.2, 1] as [number, number, number, number],
	snapback: [0.34, 1.56, 0.64, 1] as [number, number, number, number], // Use SNAP_EASING.snapBack
} as const;

/**
 * @deprecated Use SNAP_VARIANTS or MOTION_PRESETS instead
 * Factory: Create accessible transitions
 */
export function createTransition(
	reducedMotion: boolean,
	options: {
		duration?: number;
		delay?: number;
		ease?: [number, number, number, number] | [number, number, number, number][];
	},
): Transition {
	if (reducedMotion) {
		return { duration: 0 };
	}

	return {
		duration: options.duration ?? 0.3,
		delay: options.delay ?? 0,
		ease: options.ease ?? [0.4, 0.0, 0.2, 1],
	};
}

/**
 * @deprecated Use SNAP_VARIANTS.pageEntrance or MOTION_PRESETS.slideUp
 * Legacy variant: Fade in from below
 */
export const fadeInUp: Variants = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -20 },
};

/**
 * @deprecated Use SNAP_VARIANTS.modal or MOTION_PRESETS.scaleIn
 * Legacy variant: Scale in
 */
export const scaleIn: Variants = {
	initial: { scale: 0.95, opacity: 0 },
	animate: { scale: 1, opacity: 1 },
	exit: { scale: 0.95, opacity: 0 },
};

/**
 * @deprecated Use SNAP_VARIANTS with custom x values
 * Legacy variant: Slide in from left
 */
export const slideInLeft: Variants = {
	initial: { x: -20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: -20, opacity: 0 },
};

/**
 * @deprecated Use SNAP_VARIANTS with custom x values
 * Legacy variant: Slide in from right
 */
export const slideInRight: Variants = {
	initial: { x: 20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: 20, opacity: 0 },
};
