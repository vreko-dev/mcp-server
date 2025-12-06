"use client";

import { type HTMLMotionProps, motion } from "motion/react";
import React from "react";

interface RainbowButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
	children: React.ReactNode;
	className?: string;
}

export const RainbowButton = React.forwardRef<HTMLButtonElement, RainbowButtonProps>(
	({ children, className, ...props }, ref) => {
		return (
			<motion.button
				ref={ref}
				className={`group relative inline-flex h-11 animate-rainbow cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-medium text-primary-foreground transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
				{...props}
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				style={{
					background:
						"linear-gradient(90deg, hsl(var(--snapback-warning)) 0%, hsl(var(--snapback-warning)) 25%, hsl(var(--snapback-green)) 50%, hsl(var(--snapback-danger)) 75%, hsl(var(--snapback-warning)) 100%)",
					backgroundSize: "200% 100%",
				}}
				animate={{
					backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
				}}
				transition={{
					duration: 3,
					repeat: Number.POSITIVE_INFINITY,
					ease: "linear",
				}}
			>
				{children}
			</motion.button>
		);
	},
);

RainbowButton.displayName = "RainbowButton";
