"use client";

import type { Transition, Variants } from "motion/react";
import { useEffect, useState } from "react";

// Hook: Detect reduced motion preference
export function useReducedMotion(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
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
}

// Factory: Create accessible transitions
export function createTransition(options: {
	duration?: number;
	delay?: number;
	ease?: [number, number, number, number];
}): Transition {
	const reducedMotion = useReducedMotion();

	if (reducedMotion) {
		return { duration: 0 };
	}

	return {
		duration: options.duration ?? 0.3,
		delay: options.delay ?? 0,
		ease: options.ease ?? [0.4, 0.0, 0.2, 1], // Using Material Design standard easing
	};
}

// Preset: Fade in from below
export const fadeInUp: Variants = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -20 },
};

// Preset: Scale in
export const scaleIn: Variants = {
	initial: { scale: 0.95, opacity: 0 },
	animate: { scale: 1, opacity: 1 },
	exit: { scale: 0.95, opacity: 0 },
};

// Preset: Slide in from left
export const slideInLeft: Variants = {
	initial: { x: -20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: -20, opacity: 0 },
};

// Preset: Slide in from right
export const slideInRight: Variants = {
	initial: { x: 20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: 20, opacity: 0 },
};

// Constants: Animation durations (milliseconds)
export const DURATION = {
	instant: 0,
	fast: 150,
	normal: 300,
	moderate: 500,
	slow: 800,
} as const;

// Constants: Easing curves
export const EASING = {
	// Apple-style smooth easing
	apple: [0.16, 1, 0.3, 1],
	// Material Design standard
	standard: [0.4, 0.0, 0.2, 1],
	// SnapBack bouncy
	snapback: [0.34, 1.56, 0.64, 1],
} as const;
