"use client";

import { type HealthStatus, vitalsTokens } from "../tokens/vitals";
import { cn } from "../utils/cn";
import { AnimatedScore } from "./AnimatedScore";

type Status = HealthStatus;

export interface HealthBadgeProps {
	score: number;
	status?: Status;
}

/**
 * Health status badge with animated score and glow effect
 * Shows workspace health status with color-coded indicators
 */
export function HealthBadge({ score, status = "healthy" }: HealthBadgeProps) {
	const config = vitalsTokens.health[status];

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
