"use client";

import { cn } from "@ui/lib";
import { useReducedMotion } from "@ui/lib/motion";
import { motion } from "motion/react";
import { forwardRef } from "react";

interface NeonCardProps {
	children: React.ReactNode;
	className?: string;
	hoverEffect?: boolean;
	borderColor?: string;
	glowColor?: string;
	[key: string]: any;
}

export const NeonCard = forwardRef<HTMLDivElement, NeonCardProps>(
	(
		{
			children,
			className,
			hoverEffect = true,
			borderColor = "rgba(16, 185, 129, 0.3)",
			glowColor = "rgba(16, 185, 129, 0.3)",
			...props
		},
		ref,
	) => {
		const reducedMotion = useReducedMotion();

		return (
			<motion.div
				ref={ref}
				className={cn(
					"relative rounded-xl border bg-snapback-dark p-6 backdrop-blur-xl transition-all duration-300",
					className,
				)}
				whileHover={
					hoverEffect && !reducedMotion
						? {
								y: -5,
								boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}20, inset 0 0 30px rgba(255, 255, 255, 0.1)`,
							}
						: {}
				}
				transition={{ type: "spring", stiffness: 300, damping: 20 }}
				style={
					{
						"--border-color": borderColor,
						"--glow-color": glowColor,
					} as React.CSSProperties
				}
				{...props}
			>
				{/* Animated border */}
				<div
					className="absolute inset-0 rounded-xl pointer-events-none"
					style={{
						background: `linear-gradient(45deg, ${borderColor}, transparent, ${borderColor})`,
						mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
						maskComposite: "exclude",
						padding: "1px",
					}}
				/>

				<div className="relative z-10">{children}</div>
			</motion.div>
		);
	},
);

NeonCard.displayName = "NeonCard";
