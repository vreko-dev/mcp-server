"use client";

import { Clock } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/modules/ui/lib";

export type ComingSoonBadgeVariant = "default" | "inline";

interface ComingSoonBadgeProps {
	variant?: ComingSoonBadgeVariant;
	className?: string;
	text?: string;
	pulseAnimation?: boolean;
}

export function ComingSoonBadge({
	variant = "default",
	className,
	text = "Coming Soon",
	pulseAnimation = true,
}: ComingSoonBadgeProps) {
	if (variant === "inline") {
		return (
			<span
				className={cn(
					"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md",
					"bg-blue-500/10 border border-blue-500/30",
					"text-xs font-medium text-blue-400",
					className,
				)}
			>
				<Clock className="w-3 h-3" />
				<span>{text}</span>
			</span>
		);
	}

	return (
		<motion.div
			className={cn(
				"inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
				"bg-blue-500/10 border border-blue-500/30",
				"backdrop-blur-sm",
				className,
			)}
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
		>
			{pulseAnimation ? (
				<span className="relative flex h-2 w-2">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
					<span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
				</span>
			) : (
				<Clock className="w-3.5 h-3.5 text-blue-400" />
			)}
			<span className="text-xs font-medium text-blue-400 uppercase tracking-wide">{text}</span>
		</motion.div>
	);
}
