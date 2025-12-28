"use client";

import { HealthBadge, TerminalVitals } from "@snapback/ui/vitals";
import { cn } from "@/lib/utils";

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
							? "bg-emerald-500/5 border-emerald-500/20"
							: status === "elevated"
								? "bg-amber-500/5 border-amber-500/20"
								: "bg-red-500/5 border-red-500/20",
					)}
				>
					<p
						className={cn(
							"text-sm",
							status === "healthy"
								? "text-emerald-400"
								: status === "elevated"
									? "text-amber-400"
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
					className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-center"
				>
					<p className="text-sm text-zinc-400 mb-2">Initialize SnapBack to start tracking</p>
					<button
						type="button"
						className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm font-medium"
					>
						Initialize Workspace
					</button>
				</div>
			)}
		</div>
	);
}
