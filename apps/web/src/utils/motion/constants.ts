/**
 * Animation duration constants (in milliseconds)
 * Use these for consistent timing across all animations
 */
export const DURATION = {
	instant: 0,
	fast: 150,
	normal: 300,
	moderate: 500,
	slow: 800,
} as const;

/**
 * Easing curve presets
 * - apple: Smooth, premium feel (Apple HIG)
 * - standard: Material Design standard easing
 * - snapback: Bouncy, energetic (custom SnapBack brand)
 */
export const EASING = {
	apple: [0.16, 1, 0.3, 1] as [number, number, number, number],
	standard: [0.4, 0.0, 0.2, 1] as [number, number, number, number],
	snapback: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const;
