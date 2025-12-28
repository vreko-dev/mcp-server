"use client";

import { cn } from "../utils/cn";
import { AnimatedScore } from "./AnimatedScore";

type Status = "healthy" | "elevated" | "critical";

const statusConfig = {
	healthy: {
		bg: "bg-emerald-500/10",
		text: "text-emerald-400",
		glow: "shadow-[0_0_15px_rgba(52,211,153,0.3)]",
		label: "stable",
	},
	elevated: {
		bg: "bg-amber-500/10",
		text: "text-amber-400",
		glow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]",
		label: "elevated",
	},
	critical: {
		bg: "bg-red-500/10",
		text: "text-red-400",
		glow: "shadow-[0_0_15px_rgba(239,68,68,0.4)]",
		label: "critical",
	},
};

export interface HealthBadgeProps {
	score: number;
	status?: Status;
}

/**
 * Health status badge with animated score and glow effect
 * Shows workspace health status with color-coded indicators
 */
export function HealthBadge({ score, status = "healthy" }: HealthBadgeProps) {
	const config = statusConfig[status];

	return (
		<div
			data-testid="health-badge"
			role="status"
			aria-label={`Workspace health: ${score}% - ${config.label}`}
			className={cn(
				"inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
				"transition-shadow duration-500",
				config.bg,
				config.glow,
			)}
		>
			<span className={cn("text-sm font-medium", config.text)}>{config.label}</span>
			<span className={cn("text-lg font-bold tabular-nums", config.text)}>
				<AnimatedScore value={score} />
			</span>
		</div>
	);
}
