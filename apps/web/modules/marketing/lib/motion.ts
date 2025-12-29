/**
 * Marketing Motion Module
 *
 * Re-exports from the canonical source @ui/lib/motion
 * All motion utilities, variants, and constants come from the unified system.
 *
 * @see modules/ui/lib/motion.ts for the canonical implementation
 */

"use client";

// Re-export everything from the canonical source
export {
	// Hook
	useReducedMotion,
	// Performance constants
	PERFORMANCE_TARGETS,
	// Easing curves
	SNAP_EASING,
	// Transitions
	SNAP_TRANSITIONS,
	// Hardware acceleration
	GPU_ACCELERATED_PROPS,
	EXPENSIVE_PROPS,
	// Animation variants
	SNAP_VARIANTS,
	// Utilities
	shouldReduceMotion,
	isMobileDevice,
	getOptimizedTransition,
	createOptimizedMotionProps,
	// Motion presets
	MOTION_PRESETS,
	// Types
	type SnapEasing,
	type SnapTransitions,
	type SnapVariants,
	type MotionPresets,
	// Legacy exports (deprecated but maintained for compatibility)
	DURATION,
	EASING,
	createTransition,
	fadeInUp,
	scaleIn,
	slideInLeft,
	slideInRight,
} from "@ui/lib/motion";
