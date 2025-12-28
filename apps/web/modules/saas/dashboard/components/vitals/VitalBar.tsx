"use client";

import { m } from "motion/react";
import { cn } from "@/lib/utils";

interface VitalBarProps {
	label: string;
	value: number;
	subtitle: string;
	isActive?: boolean;
	variant?: "default" | "success" | "warning";
}

const variantColors = {
	default: "bg-emerald-500",
	success: "bg-emerald-400",
	warning: "bg-amber-500",
};

/**
 * Animated progress bar for vital metrics
 * Shows shimmer effect when active, muted state when inactive
 */
export function VitalBar({ label, value, subtitle, isActive = false, variant = "default" }: VitalBarProps) {
	const showShimmer = isActive && value > 0;
	const displayWidth = Math.max(value, 2); // Minimum 2% for visibility

	return (
		<div
			data-testid="vital-bar"
			role="meter"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={`${label}: ${value}%`}
			className="space-y-2 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800"
		>
			<div className="flex justify-between items-baseline">
				<span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
				<span
					className={cn("text-lg font-bold tabular-nums", value === 0 ? "text-zinc-600" : "text-emerald-400")}
				>
					{value}%
				</span>
			</div>

			{/* Progress bar track */}
			<div data-testid="vital-bar-track" className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
				<m.div
					data-testid="vital-bar-fill"
					className={cn("h-full rounded-full relative", value === 0 ? "bg-zinc-700" : variantColors[variant])}
					initial={{ width: 0 }}
					animate={{ width: `${displayWidth}%` }}
					transition={{ duration: 0.5, ease: "easeOut" }}
				>
					{/* Shimmer effect when active */}
					{showShimmer && (
						<m.div
							data-testid="vital-bar-shimmer"
							className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
							animate={{ x: ["-100%", "100%"] }}
							transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
						/>
					)}
				</m.div>
			</div>

			<span className="text-xs text-zinc-500">{subtitle}</span>
		</div>
	);
}
