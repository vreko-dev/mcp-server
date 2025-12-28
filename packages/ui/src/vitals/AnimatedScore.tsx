"use client";

import { useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

interface AnimatedScoreProps {
	value: number;
	className?: string;
}

/**
 * Animated score display with spring physics
 * Uses motion/react for smooth number transitions
 * Follows the same pattern as NumberTicker for React 19 compatibility
 */
export function AnimatedScore({ value, className }: AnimatedScoreProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const motionValue = useMotionValue(0);
	const springValue = useSpring(motionValue, {
		stiffness: 100,
		damping: 30,
	});

	useEffect(() => {
		motionValue.set(value);
	}, [motionValue, value]);

	useEffect(() => {
		const unsubscribe = springValue.on("change", (latest) => {
			if (ref.current) {
				ref.current.textContent = String(Math.round(latest));
			}
		});

		return () => unsubscribe();
	}, [springValue]);

	return <span className={className} ref={ref} />;
}
