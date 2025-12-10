"use client";

import { cn } from "@ui/lib";
import { m } from "motion/react";

export interface AnimatedProgressBarProps {
	value: number;
	delay?: number;
	highlighted?: boolean;
	variant?: "dark" | "light";
	className?: string;
}

export function AnimatedProgressBar({
	value,
	delay = 0,
	highlighted = false,
	variant = "dark",
	className,
}: AnimatedProgressBarProps) {
	const containerClasses = cn(
		"h-1 rounded-full overflow-hidden",
		variant === "dark" ? "bg-[#222]" : "bg-muted",
		className,
	);

	const barClasses = cn(
		"h-full rounded-full",
		highlighted
			? variant === "dark"
				? "bg-emerald-500"
				: "bg-primary"
			: variant === "dark"
				? "bg-[#666]"
				: "bg-muted-foreground/50",
	);

	return (
		<div className={containerClasses}>
			<m.div
				className={barClasses}
				initial={{ width: "0%" }}
				whileInView={{ width: `${value}%` }}
				viewport={{ once: true }}
				transition={{ duration: 1, delay }}
			/>
		</div>
	);
}
