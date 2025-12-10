"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { memo, useEffect } from "react";

export interface AnimatedNumberProps {
	value: number;
	className?: string;
	duration?: number;
}

export const AnimatedNumber = memo(function AnimatedNumber({ value, className, duration = 1 }: AnimatedNumberProps) {
	const spring = useSpring(value, { duration: duration * 1000 });
	const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

	useEffect(() => {
		spring.set(value);
	}, [spring, value]);

	return <motion.span className={className}>{display}</motion.span>;
});
