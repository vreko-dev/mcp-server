"use client";

import type { Transition, Variants } from "motion/react";
import { useEffect, useState } from "react";

// Hook: Detect reduced motion preference (SSR-safe)
export const useReducedMotion = (): boolean => {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		// Only run in browser
		if (typeof window === "undefined") {
			return;
		}

		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		setPrefersReducedMotion(mediaQuery.matches);

		const handleChange = (event: MediaQueryListEvent) => {
			setPrefersReducedMotion(event.matches);
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	return prefersReducedMotion;
};

// Motion variants factory (use within components with useReducedMotion hook)
export const createMotionVariants = (
	reducedMotion: boolean,
	options: {
		from?: Record<string, any>;
		to?: Record<string, any>;
		duration?: number;
		delay?: number;
		ease?: string | number[];
	},
): Variants => {
	return {
		initial: reducedMotion ? options.to || {} : options.from || {},
		animate: options.to || {},
		exit: options.from || {},
	};
};

// Transition factory (use within components with useReducedMotion hook)
export const createTransition = (
	reducedMotion: boolean,
	options: {
		duration?: number;
		delay?: number;
		ease?: [number, number, number, number];
	},
): Transition => {
	if (reducedMotion) {
		return { duration: 0 };
	}

	return {
		duration: options.duration ?? 0.3,
		delay: options.delay ?? 0,
		ease: options.ease ?? [0.4, 0.0, 0.2, 1], // Material Design standard easing
	};
};

// Common animation presets
export const fadeInUp: Variants = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -20 },
};

export const scaleIn: Variants = {
	initial: { scale: 0.9, opacity: 0 },
	animate: { scale: 1, opacity: 1 },
	exit: { scale: 0.9, opacity: 0 },
};

export const slideInLeft: Variants = {
	initial: { x: -20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: -20, opacity: 0 },
};

// Animation timing guidelines
export const ANIMATION_DURATIONS = {
	instant: 0, // Reduced motion fallback
	fast: 150, // Micro-interactions (hover states)
	normal: 300, // Standard UI transitions
	moderate: 500, // Page transitions, reveals
	slow: 800, // Emphasis animations
	verySlow: 1200, // Hero animations, storytelling
} as const;

// Custom easing curves
export const EASING_CURVES = {
	// Apple-style easing
	apple: [0.16, 1, 0.3, 1], // Smooth, premium feel

	// Material Design easing
	standard: [0.4, 0.0, 0.2, 1], // Standard UI
	deceleration: [0.0, 0.0, 0.2, 1], // Entering screen
	acceleration: [0.4, 0.0, 1, 1], // Exiting screen

	// Custom SnapBack easing
	snapback: [0.34, 1.56, 0.64, 1], // Bouncy, energetic
} as const;
