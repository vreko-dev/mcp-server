"use client";

import { motion } from "motion/react";
import { cn } from "@/modules/ui/lib";

export type AlphaBadgeVariant = "default" | "minimal";

interface AlphaBadgeProps {
	variant?: AlphaBadgeVariant;
	className?: string;
	pulseAnimation?: boolean;
}

export function AlphaBadge({
	variant = "default",
	className,
	pulseAnimation = true,
}: AlphaBadgeProps) {
	if (variant === "minimal") {
		return (
			<span
				className={cn(
					"inline-flex items-center gap-1.5 text-xs font-medium text-snapback-text-secondary",
					className,
				)}
			>
				<span className="w-1.5 h-1.5 rounded-full bg-snapback-green" />
				<span>Alpha</span>
			</span>
		);
	}

	return (
		<motion.div
			className={cn(
				"inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
				"bg-[#FF9500]/10 border border-[#FF9500]/30",
				"backdrop-blur-sm",
				className,
			)}
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
		>
			{pulseAnimation ? (
				<span className="relative flex h-2 w-2">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
					<span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
				</span>
			) : (
				<span className="w-2 h-2 rounded-full bg-[#FF9500]" />
			)}
			<span className="text-xs font-medium text-[#FF9500] uppercase tracking-wide">
				Private Alpha • Limited Slots
			</span>
		</motion.div>
	);
}
