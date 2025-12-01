"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

interface MotionProviderProps {
	children: ReactNode;
}

/**
 * React 19 compatible Motion Provider using motion/react
 * Uses MotionConfig for global configuration (no LazyMotion needed)
 */
export default function MotionProvider({ children }: MotionProviderProps) {
	return (
		<MotionConfig
			// Optimize for performance
			transition={{
				type: "tween",
				ease: [0.25, 0.1, 0.25, 1],
				duration: 0.3,
			}}
			// Respect user motion preferences
			reducedMotion="user"
		>
			{children}
		</MotionConfig>
	);
}
