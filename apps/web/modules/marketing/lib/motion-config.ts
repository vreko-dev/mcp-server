/**
 * SnapBack Motion Configuration
 * Performance-first configuration for 60fps animations and <100ms brand promise
 */

import type { TargetAndTransition, Transition } from "motion/react";

// ===== PERFORMANCE CONSTANTS =====

/**
 * Target 60fps performance - each frame should be ≤16.67ms
 * For SnapBack's <100ms promise, animations should feel instant
 */
export const PERFORMANCE_TARGETS = {
	// Frame budget for 60fps
	FRAME_BUDGET_MS: 16.67,
	// SnapBack brand promise
	SNAP_RESPONSE_MS: 100,
	// Maximum animation duration for "instant" feeling
	MAX_INSTANT_DURATION: 150,
	// Optimal animation duration for brand consistency
	OPTIMAL_DURATION: 400,
} as const;

// ===== OPTIMIZED EASING CURVES =====

/**
 * Pre-calculated easing curves optimized for performance
 * Cubic bezier curves that are GPU-friendly and create brand-appropriate motion
 */
export const SNAP_EASING = {
	// Instant response for protection activation
	instant: [0.8, 0, 0.2, 1] as const,
	// Elastic snap-back effect (brand signature)
	snapBack: [0.68, -0.55, 0.265, 1.55] as const,
	// Smooth protection engagement
	protect: [0.25, 0.46, 0.45, 0.94] as const,
	// Recovery and restoration
	recover: [0.25, 1, 0.5, 1] as const,
	// Entrance animations
	entrance: [0.4, 0, 0.2, 1] as const,
	// Exit animations
	exit: [0.4, 0, 1, 1] as const,
} as const;

// ===== PERFORMANCE-OPTIMIZED TRANSITIONS =====

/**
 * Pre-configured transitions optimized for 60fps performance
 * All durations calibrated for SnapBack's speed brand promise
 */
export const SNAP_TRANSITIONS = {
	// Ultra-fast for <100ms feeling
	instant: {
		duration: 0.1,
		ease: SNAP_EASING.instant,
	},

	// Quick protection response
	protect: {
		duration: 0.15,
		ease: SNAP_EASING.protect,
	},

	// Brand signature elastic snap
	snapBack: {
		duration: 0.4,
		ease: SNAP_EASING.snapBack,
	},

	// Smooth entrance
	entrance: {
		duration: 0.6,
		ease: SNAP_EASING.entrance,
	},

	// Quick exit
	exit: {
		duration: 0.2,
		ease: SNAP_EASING.exit,
	},

	// Recovery animation
	recover: {
		duration: 0.5,
		ease: SNAP_EASING.recover,
	},
} as const satisfies Record<string, Transition>;

// ===== HARDWARE-ACCELERATED PROPERTIES =====

/**
 * Properties that can be hardware-accelerated by the GPU
 * Stick to these for 60fps performance
 */
export const GPU_ACCELERATED_PROPS = {
	// Transform properties (GPU-friendly)
	TRANSFORM: [
		"x",
		"y",
		"z",
		"scale",
		"scaleX",
		"scaleY",
		"rotate",
		"rotateX",
		"rotateY",
		"rotateZ",
	] as const,

	// Opacity (compositing layer)
	OPACITY: ["opacity"] as const,

	// Filter effects (modern browsers)
	FILTER: ["blur", "brightness", "contrast", "saturate"] as const,
} as const;

/**
 * Properties that trigger layout/paint (avoid for performance)
 */
export const EXPENSIVE_PROPS = {
	// Layout-triggering properties
	LAYOUT: [
		"width",
		"height",
		"top",
		"left",
		"right",
		"bottom",
		"margin",
		"padding",
	] as const,

	// Paint-triggering properties
	PAINT: ["color", "background", "border", "boxShadow"] as const,
} as const;

// ===== OPTIMIZED ANIMATION VARIANTS =====

/**
 * Pre-built animation variants optimized for SnapBack brand
 * Designed for consistency and performance
 */
export const SNAP_VARIANTS = {
	// Page entrance animations
	pageEntrance: {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: SNAP_TRANSITIONS.entrance,
		},
	},

	// Stagger children entrance
	staggerContainer: {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
				delayChildren: 0.1,
			},
		},
	},

	// Individual stagger item
	staggerItem: {
		hidden: { opacity: 0, y: 30 },
		visible: {
			opacity: 1,
			y: 0,
			transition: SNAP_TRANSITIONS.entrance,
		},
	},

	// Protection activation
	protectionActivate: {
		idle: { scale: 1, opacity: 0.8 },
		active: {
			scale: 1.02,
			opacity: 1,
			transition: SNAP_TRANSITIONS.protect,
		},
	},

	// Elastic snap effect
	elasticSnap: {
		rest: { x: 0, y: 0 },
		disturbed: { x: 10, y: 0, transition: { duration: 0.05 } },
		recovered: {
			x: 0,
			y: 0,
			transition: SNAP_TRANSITIONS.snapBack,
		},
	},

	// Button interactions
	button: {
		idle: { scale: 1 },
		hover: {
			scale: 1.02,
			transition: SNAP_TRANSITIONS.instant,
		},
		tap: {
			scale: 0.98,
			transition: SNAP_TRANSITIONS.instant,
		},
	},

	// Modal/overlay animations
	modal: {
		hidden: { opacity: 0, scale: 0.9 },
		visible: {
			opacity: 1,
			scale: 1,
			transition: SNAP_TRANSITIONS.entrance,
		},
		exit: {
			opacity: 0,
			scale: 0.9,
			transition: SNAP_TRANSITIONS.exit,
		},
	},
} as const satisfies Record<string, Record<string, TargetAndTransition>>;

// ===== PERFORMANCE UTILITIES =====

/**
 * Check if reduced motion is preferred
 */
export const shouldReduceMotion = (): boolean => {
	if (typeof window === "undefined") {
		return false;
	}
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Check if device is mobile for performance optimization
 */
export const isMobileDevice = (): boolean => {
	if (typeof window === "undefined") {
		return false;
	}
	return window.matchMedia("(max-width: 768px)").matches;
};

/**
 * Get optimized transition based on device and preferences
 */
export const getOptimizedTransition = (
	baseTransition: Transition,
	options?: {
		forceFast?: boolean;
		respectReducedMotion?: boolean;
	},
): Transition => {
	const { forceFast = false, respectReducedMotion = true } = options || {};

	// Respect reduced motion preference
	if (respectReducedMotion && shouldReduceMotion()) {
		return { duration: 0 };
	}

	// Use faster transitions on mobile for better performance
	if (isMobileDevice() || forceFast) {
		return {
			...baseTransition,
			duration:
				typeof baseTransition.duration === "number"
					? Math.min(baseTransition.duration, 0.3)
					: 0.3,
		};
	}

	return baseTransition;
};

/**
 * Create performance-optimized motion props
 */
export const createOptimizedMotionProps = (
	overrides?: Record<string, any>,
) => ({
	// GPU acceleration hints
	style: {
		willChange: "transform",
		transformStyle: "preserve-3d" as const,
		backfaceVisibility: "hidden" as const,
		...overrides?.style,
	},

	// Performance hints
	layout: false,
	layoutDependency: false,

	// Merge any overrides
	...overrides,
});

// ===== MOTION PRESETS FOR COMMON PATTERNS =====

/**
 * Ready-to-use motion presets for SnapBack brand
 */
export const MOTION_PRESETS = {
	// Fade in entrance
	fadeIn: {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		transition: SNAP_TRANSITIONS.entrance,
	},

	// Slide up entrance
	slideUp: {
		initial: { opacity: 0, y: 30 },
		animate: { opacity: 1, y: 0 },
		transition: SNAP_TRANSITIONS.entrance,
	},

	// Scale entrance
	scaleIn: {
		initial: { opacity: 0, scale: 0.9 },
		animate: { opacity: 1, scale: 1 },
		transition: SNAP_TRANSITIONS.entrance,
	},

	// Protective hover
	protectiveHover: {
		whileHover: { scale: 1.02 },
		whileTap: { scale: 0.98 },
		transition: SNAP_TRANSITIONS.instant,
	},

	// Snap back effect
	snapBack: {
		animate: {
			x: [0, 10, 0],
			transition: {
				duration: 0.5,
				ease: SNAP_EASING.snapBack,
			},
		},
	},
} as const;

// ===== EXPORT TYPES =====

export type SnapEasing = typeof SNAP_EASING;
export type SnapTransitions = typeof SNAP_TRANSITIONS;
export type SnapVariants = typeof SNAP_VARIANTS;
export type MotionPresets = typeof MOTION_PRESETS;
