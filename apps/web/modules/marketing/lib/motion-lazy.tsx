"use client";

import { domAnimation, domMax, LazyMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Optimized Motion Provider using LazyMotion
 * Reduces motion bundle size by loading only needed features
 */

interface OptimizedMotionProviderProps {
	children: ReactNode;
	features?: "minimal" | "full";
}

export function OptimizedMotionProvider({ children, features = "full" }: OptimizedMotionProviderProps) {
	// Use domAnimation for minimal features (basic animations)
	// Use domMax for full features (complex animations, drag, etc.)
	const featureSet = features === "minimal" ? domAnimation : domMax;

	return (
		<LazyMotion features={featureSet} strict>
			{children}
		</LazyMotion>
	);
}

/**
 * Utility to create motion components with lazy loading
 * Usage: const m = createLazyMotion()
 */
export function createLazyMotion() {
	return {
		div: "div",
		button: "button",
		section: "section",
		span: "span",
		a: "a",
		img: "img",
	} as const;
}
