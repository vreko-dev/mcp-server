"use client";

import { motion } from "motion/react";
import type React from "react";
import { cn } from "../utils/cn";
import { useReducedMotion } from "../utils/motion";

export interface BentoGridProps {
	className?: string;
	children?: React.ReactNode;
}

export interface BentoGridItemProps {
	className?: string;
	title?: string | React.ReactNode;
	description?: string | React.ReactNode;
	icon?: React.ReactNode;
	header?: React.ReactNode;
	[key: string]: any;
}

export const BentoGrid = ({ className, children }: BentoGridProps) => {
	return <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto", className)}>{children}</div>;
};

export const BentoGridItem = ({ className, title, description, icon, header, ...rest }: BentoGridItemProps) => {
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			whileHover={reducedMotion ? {} : { y: -8, scale: 1.02 }}
			whileTap={reducedMotion ? {} : { scale: 0.98 }}
			transition={
				reducedMotion
					? { duration: 0 }
					: {
							type: "spring",
							stiffness: 300,
							damping: 20,
							mass: 0.8,
						}
			}
			className={cn(
				"group relative rounded-xl border border-white/10 bg-snapback-dark p-6 shadow-lg transition-all duration-300 hover:border-snapback-green/50",
				className,
			)}
			{...rest}
		>
			{header && (
				<motion.div
					className="mb-4"
					whileHover={reducedMotion ? {} : { y: -5 }}
					transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 17 }}
				>
					{header}
				</motion.div>
			)}
			{icon && (
				<motion.div
					whileHover={reducedMotion ? {} : { scale: 1.2, rotate: 10 }}
					transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300 }}
					className="mb-4"
				>
					{icon}
				</motion.div>
			)}
			<div className="transition duration-300">
				{title && (
					<motion.div
						className="mb-2 font-bold text-lg text-white"
						initial={reducedMotion ? {} : { opacity: 0.7 }}
						whileHover={reducedMotion ? {} : { opacity: 1, y: -2 }}
						transition={
							reducedMotion
								? { duration: 0 }
								: {
										type: "spring",
										stiffness: 300,
										damping: 20,
									}
						}
					>
						{title}
					</motion.div>
				)}
				{description && (
					<motion.div
						className="text-sm text-white/70"
						initial={reducedMotion ? {} : { opacity: 0.7 }}
						whileHover={reducedMotion ? {} : { opacity: 1 }}
						transition={
							reducedMotion
								? { duration: 0 }
								: {
										type: "spring",
										stiffness: 300,
										damping: 20,
									}
						}
					>
						{description}
					</motion.div>
				)}
			</div>
		</motion.div>
	);
};
