"use client";

import { cn } from "@ui/lib";
import { useReducedMotion } from "@ui/lib/motion";
import { motion } from "motion/react";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	shimmerColor?: string;
	shimmerSize?: string;
	shimmerDuration?: string;
	borderRadius?: string;
}

const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
	(
		{
			shimmerColor = "rgba(255, 255, 255, 0.5)",
			shimmerSize = "0.05em",
			shimmerDuration = "3s",
			borderRadius = "0.5rem",
			className,
			children,
			...props
		},
		ref,
	) => {
		const reducedMotion = useReducedMotion();

		return (
			<button
				ref={ref}
				className={cn(
					"group relative inline-flex items-center justify-center overflow-hidden",
					"rounded-lg px-6 py-3 cursor-pointer", // Changed from rounded-[--border-radius] to rounded-lg
					"bg-emerald-400 text-black hover:bg-emerald-400/90",
					"font-medium",
					"transition-all duration-200",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
					className,
				)}
				{...props}
			>
				{/* Shimmer overlay */}
				<div
					className="absolute inset-0 overflow-hidden rounded-lg" // Changed from rounded-[--border-radius] to rounded-lg
					aria-hidden="true"
				>
					<motion.div
						className={cn(
							"shimmer-effect",
							"absolute inset-0 -translate-x-full",
							"bg-gradient-to-r from-transparent via-white/20 to-transparent",
							reducedMotion ? "hidden" : "group-hover:translate-x-full",
							"transition-transform ease-in-out",
						)}
						style={
							{
								transitionDuration: "var(--shimmer-duration)",
								"--shimmer-color": shimmerColor,
								"--shimmer-size": shimmerSize,
								"--shimmer-duration": shimmerDuration,
							} as React.CSSProperties
						}
						animate={
							!reducedMotion
								? {
										translateX: ["-100%", "100%"],
									}
								: {}
						}
						transition={
							!reducedMotion
								? {
										duration: 2,
										repeat: Number.POSITIVE_INFINITY,
										ease: "linear",
									}
								: { duration: 0 }
						}
					/>
				</div>

				<span className="relative z-10">{children}</span>
			</button>
		);
	},
);

ShimmerButton.displayName = "ShimmerButton";

export { ShimmerButton };
