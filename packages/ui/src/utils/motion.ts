/**
 * Shared motion utilities for @snapback/ui
 * Simplified version without web-specific dependencies
 */

"use client";

import type { Transition, Variants } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Hook to detect user preference for reduced motion
 * Respects prefers-reduced-motion media query
 */
export function useReducedMotion(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		setPrefersReducedMotion(mediaQuery.matches);

		const listener = (e: MediaQueryListEvent) => {
			setPrefersReducedMotion(e.matches);
		};

		mediaQuery.addEventListener("change", listener);
		return () => mediaQuery.removeEventListener("change", listener);
	}, []);

	return prefersReducedMotion;
}

/**
 * Create accessible transitions that respect reduced motion preferences
 */
export function createTransition(
	reducedMotion: boolean,
	options: {
		duration?: number;
		delay?: number;
		ease?: [number, number, number, number];
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
 * Common animation variants
 */
export const fadeInUp: Variants = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -20 },
};

export const scaleIn: Variants = {
	initial: { scale: 0.95, opacity: 0 },
	animate: { scale: 1, opacity: 1 },
	exit: { scale: 0.95, opacity: 0 },
};
