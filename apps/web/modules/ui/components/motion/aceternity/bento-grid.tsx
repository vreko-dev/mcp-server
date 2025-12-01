"use client";

import { cn } from "@ui/lib";
import { useReducedMotion } from "@ui/lib/motion";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface BentoGridProps {
	className?: string;
	children?: ReactNode;
}

export interface BentoGridItemProps {
	className?: string;
	title?: string | ReactNode;
	description?: string | ReactNode;
	icon?: ReactNode;
	header?: ReactNode;
}

/**
 * BentoGrid - Grid layout component with hover effects
 *
 * @example
 * ```tsx
 * <BentoGrid>
 *   <BentoGridItem title="Feature" description="Description" icon={<Icon />} />
 * </BentoGrid>
 * ```
 */
export const BentoGrid = ({ className, children }: BentoGridProps) => {
	return (
		<div
			className={cn(
				"grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
				className,
			)}
		>
			{children}
		</div>
	);
};

/**
 * BentoGridItem - Individual grid item with animations
 *
 * Features:
 * - Respects prefers-reduced-motion
 * - Smooth hover effects
 * - Accessible and keyboard-friendly
 */
export const BentoGridItem = ({
	className,
	title,
	description,
	icon,
	header,
}: BentoGridItemProps) => {
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
				"row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 bg-card border border-border justify-between flex flex-col space-y-4",
				"hover:border-snapback-green/50 hover:scale-[1.02]",
				className,
			)}
		>
			{header && (
				<motion.div
					className="mb-4"
					whileHover={reducedMotion ? {} : { y: -5 }}
					transition={
						reducedMotion
							? { duration: 0 }
							: { type: "spring", stiffness: 400, damping: 17 }
					}
				>
					{header}
				</motion.div>
			)}

			<div className="group-hover/bento:translate-x-2 transition duration-200">
				{icon && (
					<motion.div
						whileHover={reducedMotion ? {} : { scale: 1.2, rotate: 10 }}
						transition={
							reducedMotion
								? { duration: 0 }
								: { type: "spring", stiffness: 300 }
						}
						className="mb-4"
					>
						{icon}
					</motion.div>
				)}

				{title && (
					<div className="font-sans font-bold text-neutral-200 mb-2 mt-2">
						{title}
					</div>
				)}

				{description && (
					<div className="font-sans font-normal text-neutral-400 text-xs">
						{description}
					</div>
				)}
			</div>
		</motion.div>
	);
};
