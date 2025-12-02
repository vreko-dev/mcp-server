"use client";

import { useEffect, useState } from "react";

/**
 * React hook that detects if the user prefers reduced motion
 * Respects OS-level accessibility settings (WCAG 2.1 AA compliant)
 * Dynamically updates when user changes preference
 */
export function useReducedMotion(): boolean {
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
}
