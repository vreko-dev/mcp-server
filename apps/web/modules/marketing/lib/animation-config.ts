import type { Transition, Variants } from "motion/react";

// Core animation timing constants
export const ANIMATION_DURATION = {
	fast: 0.2,
	normal: 0.4,
	slow: 0.6,
	slower: 0.8,
} as const;

// Easing curves optimized for the SnapBack brand
export const EASING = {
	ease: [0.25, 0.1, 0.25, 1],
	easeIn: [0.4, 0, 1, 1],
	easeOut: [0, 0, 0.2, 1],
	easeInOut: [0.4, 0, 0.2, 1],
	bounce: [0.68, -0.55, 0.265, 1.55],
	spring: { type: "spring", stiffness: 400, damping: 17 },
	gentleSpring: { type: "spring", stiffness: 300, damping: 20 },
	bouncySpring: { type: "spring", stiffness: 600, damping: 15 },
} as const;

// Common animation variants
export const fadeIn: Variants = {
	hidden: {
		opacity: 0,
		y: 20,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: ANIMATION_DURATION.normal,
			ease: EASING.easeOut,
		},
	},
};

export const fadeInUp: Variants = {
	hidden: {
		opacity: 0,
		y: 60,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: ANIMATION_DURATION.slow,
			ease: EASING.easeOut,
		},
	},
};

export const fadeInDown: Variants = {
	hidden: {
		opacity: 0,
		y: -40,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: ANIMATION_DURATION.normal,
			ease: EASING.easeOut,
		},
	},
};

export const scaleIn: Variants = {
	hidden: {
		opacity: 0,
		scale: 0.8,
	},
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: ANIMATION_DURATION.normal,
			ease: EASING.bounce,
		},
	},
};

export const slideInLeft: Variants = {
	hidden: {
		opacity: 0,
		x: -60,
	},
	visible: {
		opacity: 1,
		x: 0,
		transition: {
			duration: ANIMATION_DURATION.slow,
			ease: EASING.easeOut,
		},
	},
};

export const slideInRight: Variants = {
	hidden: {
		opacity: 0,
		x: 60,
	},
	visible: {
		opacity: 1,
		x: 0,
		transition: {
			duration: ANIMATION_DURATION.slow,
			ease: EASING.easeOut,
		},
	},
};

// Stagger animation configurations
export const staggerContainer: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.2,
		},
	},
};

export const staggerItem: Variants = {
	hidden: {
		opacity: 0,
		y: 20,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: ANIMATION_DURATION.normal,
			ease: EASING.easeOut,
		},
	},
};

// Cyberpunk-themed glow effects
export const glowPulse: Variants = {
	initial: {
		boxShadow: "0 0 0px hsl(140 100% 50% / 0%)",
	},
	animate: {
		boxShadow: [
			"0 0 0px hsl(140 100% 50% / 0%)",
			"0 0 20px hsl(140 100% 50% / 0.4)",
			"0 0 0px hsl(140 100% 50% / 0%)",
		],
		transition: {
			duration: 2,
			repeat: Number.POSITIVE_INFINITY,
			ease: "easeInOut",
		},
	},
};

export const neonGlow: Variants = {
	rest: {
		textShadow: "0 0 0px hsl(140 100% 50%)",
		boxShadow: "0 0 0px hsl(140 100% 50% / 0%)",
	},
	hover: {
		textShadow: "0 0 8px hsl(140 100% 50%)",
		boxShadow: "0 0 20px hsl(140 100% 50% / 0.4)",
		transition: {
			duration: ANIMATION_DURATION.fast,
		},
	},
};

// Hover effects for interactive elements
export const hoverScale: Transition = {
	type: "spring",
	stiffness: 400,
	damping: 17,
};

export const hoverLift = {
	y: -8,
	scale: 1.02,
	transition: hoverScale,
};

export const hoverGlow = {
	boxShadow: "0 0 20px hsl(140 100% 50% / 0.4)",
	transition: {
		duration: ANIMATION_DURATION.fast,
	},
};

// Page transition variants
export const pageTransition: Variants = {
	initial: {
		opacity: 0,
		y: 20,
	},
	in: {
		opacity: 1,
		y: 0,
	},
	out: {
		opacity: 0,
		y: -20,
	},
};

export const pageTransitions = {
	initial: "initial",
	animate: "in",
	exit: "out",
	variants: pageTransition,
	transition: {
		duration: ANIMATION_DURATION.slow,
		ease: EASING.easeInOut,
	},
};

// Scroll-triggered animations
export const scrollReveal: Variants = {
	hidden: {
		opacity: 0,
		y: 50,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: ANIMATION_DURATION.slow,
			ease: EASING.easeOut,
		},
	},
};

// Mobile menu-specific animations (Aceternity UI 2025 patterns)
export const mobileMenuSlide: Variants = {
	closed: {
		x: "100%",
		opacity: 0,
		transition: {
			type: "spring",
			stiffness: 400,
			damping: 30,
		},
	},
	open: {
		x: 0,
		opacity: 1,
		transition: {
			type: "spring",
			stiffness: 400,
			damping: 30,
		},
	},
};

export const backdropBlur: Variants = {
	closed: { opacity: 0 },
	open: {
		opacity: 1,
		transition: { duration: ANIMATION_DURATION.fast },
	},
};

// Enhanced navbar transformation (cursor.com inspired)
export const navbarTransform: Variants = {
	initial: {
		y: -100,
		opacity: 0,
		scale: 0.95,
	},
	animate: {
		y: 0,
		opacity: 1,
		scale: 1,
		transition: {
			type: "spring",
			stiffness: 400,
			damping: 25,
			duration: ANIMATION_DURATION.slow,
		},
	},
};

// Advanced hover effects with gradient overlays
export const gradientHover: Variants = {
	rest: {
		background: "transparent",
		scale: 1,
	},
	hover: {
		background: "linear-gradient(45deg, rgba(0, 255, 65, 0.1), rgba(0, 212, 255, 0.1))",
		scale: 1.02,
		transition: {
			duration: ANIMATION_DURATION.fast,
			ease: EASING.easeOut,
		},
	},
};

// Interactive button animations
export const buttonPress: Variants = {
	rest: { scale: 1 },
	hover: {
		scale: 1.05,
		transition: EASING.gentleSpring,
	},
	tap: {
		scale: 0.95,
		transition: { duration: 0.1 },
	},
};

// Motion configuration for reduced motion preference
export const motionConfig = {
	respectReducedMotion: true,
	initial: false,
	animate: "visible",
	variants: fadeIn,
};
