import type { Variants } from "motion/react";

/**
 * Ready-to-use animation variant presets
 * Use with Framer Motion's motion components
 */

// Fade in from below
export const fadeInUp: Variants = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -20 },
};

// Scale in with fade
export const scaleIn: Variants = {
	initial: { scale: 0.95, opacity: 0 },
	animate: { scale: 1, opacity: 1 },
	exit: { scale: 0.95, opacity: 0 },
};

// Slide in from left
export const slideInLeft: Variants = {
	initial: { x: -20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: -20, opacity: 0 },
};

// Slide in from right
export const slideInRight: Variants = {
	initial: { x: 20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: 20, opacity: 0 },
};
