// apps/web/lib/animations.ts
import type { Variants } from "motion/react";

export const animations = {
	// Fade in from bottom
	fadeInUp: {
		initial: { opacity: 0, y: 24 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -24 },
		transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
	} as Variants,

	// Scale up
	scaleIn: {
		initial: { opacity: 0, scale: 0.95 },
		animate: { opacity: 1, scale: 1 },
		exit: { opacity: 0, scale: 0.95 },
		transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
	} as Variants,

	// Slide from right
	slideInRight: {
		initial: { opacity: 0, x: 32 },
		animate: { opacity: 1, x: 0 },
		exit: { opacity: 0, x: -32 },
		transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
	} as Variants,

	// Elastic bounce (for "snap back" effect)
	snapBack: {
		initial: { scale: 1 },
		animate: { scale: [1, 1.1, 0.95, 1.02, 1] },
		transition: {
			duration: 0.6,
			times: [0, 0.2, 0.5, 0.8, 1],
			ease: "easeOut",
		},
	} as Variants,

	// Glow pulse
	glowPulse: {
		animate: {
			boxShadow: [
				"0 0 20px rgba(0, 255, 65, 0.2)",
				"0 0 40px rgba(0, 255, 65, 0.4)",
				"0 0 20px rgba(0, 255, 65, 0.2)",
			],
		},
		transition: {
			duration: 2,
			repeat: Number.POSITIVE_INFINITY,
			ease: "easeInOut",
		},
	} as Variants,
} as const;

// Re-export for backward compatibility if needed, but prefer using `animations.fadeInUp`
export const fadeInUp = animations.fadeInUp;
export const scaleIn = animations.scaleIn;
export const modalBackdrop = {
	initial: {
		opacity: 0,
	},
	animate: {
		opacity: 1,
		transition: {
			duration: 0.3,
		},
	},
	exit: {
		opacity: 0,
		transition: {
			duration: 0.2,
		},
	},
};

export const modalContent = {
	initial: {
		opacity: 0,
		scale: 0.95,
		y: 20,
	},
	animate: {
		opacity: 1,
		scale: 1,
		y: 0,
		transition: {
			duration: 0.3,
			ease: "easeOut",
		},
	},
	exit: {
		opacity: 0,
		scale: 0.95,
		y: 20,
		transition: {
			duration: 0.2,
			ease: "easeIn",
		},
	},
};
