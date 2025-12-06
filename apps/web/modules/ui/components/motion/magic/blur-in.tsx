"use client";

import { motion } from "motion/react";
import type React from "react";

interface BlurInProps {
	children: React.ReactNode;
	className?: string;
	delay?: number;
	duration?: number;
}

export const BlurIn = ({ children, className, delay = 0, duration = 0.5 }: BlurInProps) => {
	return (
		<motion.div
			initial={{ opacity: 0, filter: "blur(10px)" }}
			animate={{ opacity: 1, filter: "blur(0px)" }}
			transition={{ duration, delay }}
			className={className}
		>
			{children}
		</motion.div>
	);
};
