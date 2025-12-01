"use client";

import { cn } from "@ui/lib";
import { motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { AnimatedNumber } from "./animated-number";

export interface MetricCardProps {
	icon: ReactNode;
	label: string;
	value: number;
	trend?: "up" | "down" | "neutral";
	change?: string;
	className?: string;
}

export function MetricCard({
	icon,
	label,
	value,
	trend = "neutral",
	change,
	className,
}: MetricCardProps) {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<motion.div
			onHoverStart={() => setIsHovered(true)}
			onHoverEnd={() => setIsHovered(false)}
			whileHover={{ y: -2 }}
			className={cn(
				"relative bg-terminal-surface border border-terminal-border rounded-lg p-6 overflow-hidden",
				className,
			)}
		>
			{/* Gradient background that reacts to hover */}
			<motion.div
				className="absolute inset-0 bg-gradient-to-br from-snapback-500/5 to-transparent"
				animate={{ opacity: isHovered ? 1 : 0 }}
				transition={{ duration: 0.3 }}
			/>

			{/* Content */}
			<div className="relative z-10">
				{/* Icon with subtle animation */}
				<motion.div
					animate={{ rotate: isHovered ? 360 : 0 }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					className="text-snapback-400 mb-4"
				>
					{icon}
				</motion.div>

				{/* Value with number animation */}
				<motion.div
					className="text-3xl font-bold font-code"
					animate={{ scale: isHovered ? 1.05 : 1 }}
				>
					<AnimatedNumber value={value} />
				</motion.div>

				{/* Label and change indicator */}
				<div className="mt-2">
					<div className="text-sm text-gray-400">{label}</div>
					{change && (
						<motion.div
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							className={cn(
								"text-xs mt-1",
								trend === "up" && "text-snapback-400",
								trend === "down" && "text-red-400",
								trend === "neutral" && "text-gray-500",
							)}
						>
							{change}
						</motion.div>
					)}
				</div>
			</div>
		</motion.div>
	);
}
