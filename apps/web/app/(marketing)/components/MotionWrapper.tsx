"use client";

import { useReducedMotion } from "@ui/lib/motion";
import { MotionConfig } from "motion/react";
import type { PropsWithChildren } from "react";

export function MotionWrapper({ children }: PropsWithChildren) {
	const shouldReduceMotion = useReducedMotion();

	return <MotionConfig reducedMotion={shouldReduceMotion ? "always" : "never"}>{children}</MotionConfig>;
}
