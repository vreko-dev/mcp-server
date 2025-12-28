"use client";

import { vitalsTokens } from "../tokens/vitals";
import { cn } from "../utils/cn";
import { HealthBadge } from "./HealthBadge";
import { TerminalVitals } from "./TerminalVitals";

interface VitalsData {
	pulse: number;
	temperature: number;
	pressure: number;
	oxygen: number;
	score: number;
}

interface Guidance {
	message: string;
}

export interface WorkspaceVitalsProps {
	vitals: VitalsData;
	guidance?: Guidance;
	showInitPrompt?: boolean;
}

type VitalsStatus = "healthy" | "elevated" | "critical";

/**
 * Determine vitals status based on score
 */
export function getVitalsStatus(vitals: VitalsData): VitalsStatus {
	if (vitals.score >= 90) {
		return "healthy";
	}
	if (vitals.score >= 60) {
		return "elevated";
	}
	return "critical";
}

/**
 * Complete workspace vitals dashboard component
 * Combines health badge, terminal vitals, guidance, and init prompt
 */
export function WorkspaceVitals({ vitals, guidance, showInitPrompt = false }: WorkspaceVitalsProps) {
	const status = getVitalsStatus(vitals);

	return (
		<div
			data-testid="workspace-vitals"
			role="region"
			aria-labelledby="workspace-vitals-heading"
			className="space-y-4"
		>
			{/* Header */}
			<div data-testid="workspace-vitals-header" className="flex items-center justify-between">
				<h2 id="workspace-vitals-heading" className="text-lg font-semibold">
					Workspace Vitals
				</h2>
				<HealthBadge score={vitals.score} status={status} />
			</div>

			{/* Terminal-style vitals */}
			<TerminalVitals vitals={vitals} />

			{/* Agent Guidance (optional) */}
			{guidance && (
				<div
					data-testid="agent-guidance"
					className={cn(
						"p-3 rounded-lg border",
						status === "healthy"
							? `${vitalsTokens.health.healthy.bg.replace("/10", "/5")} ${vitalsTokens.health.healthy.text.replace("text-", "border-").replace("-400", "-500/20")}`
							: status === "elevated"
								? `${vitalsTokens.health.elevated.bg.replace("/10", "/5")} ${vitalsTokens.health.elevated.text.replace("text-", "border-").replace("-400", "-500/20")}`
								: "bg-red-500/5 border-red-500/20",
					)}
				>
					<p
						className={cn(
							"text-sm",
							status === "healthy"
								? vitalsTokens.health.healthy.text
								: status === "elevated"
									? vitalsTokens.health.elevated.text
									: "text-red-400",
						)}
					>
						{guidance.message}
					</p>
				</div>
			)}

			{/* Init Prompt */}
			{showInitPrompt && (
				<div
					data-testid="init-prompt"
					className={cn(
						"p-4 rounded-lg border text-center",
						vitalsTokens.neutral.background.surface,
						vitalsTokens.neutral.border.default,
					)}
				>
					<p className={cn("text-sm mb-2", vitalsTokens.neutral.muted.text)}>
						Initialize SnapBack to start tracking
					</p>
					<button
						type="button"
						className={cn(
							"px-4 py-2 rounded-lg transition-colors text-sm font-medium",
							vitalsTokens.health.healthy.bg.replace("/10", "/20"),
							vitalsTokens.health.healthy.text,
							"hover:bg-emerald-500/30",
						)}
					>
						Initialize Workspace
					</button>
				</div>
			)}
		</div>
	);
}
