"use client";

import { cn } from "../utils/cn";

interface VitalsData {
	pulse: number;
	temperature: number;
	pressure: number;
	oxygen: number;
	score: number;
}

export interface TerminalVitalsProps {
	vitals: VitalsData;
}

type LineStatus = "dim" | "active" | "good" | "warn";

const statusColors = {
	dim: "text-zinc-600",
	active: "text-zinc-300",
	good: "text-emerald-400",
	warn: "text-amber-400",
};

interface LineProps {
	label: string;
	value: string;
	status: LineStatus;
	showCheck?: boolean;
}

function Line({ label, value, status, showCheck }: LineProps) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-zinc-600">├─</span>
			<span className="text-zinc-500 w-20">{label}:</span>
			<span className={statusColors[status]}>
				{value}
				{showCheck && " ✓"}
			</span>
		</div>
	);
}

/**
 * Terminal-aesthetic vitals display
 * Shows workspace health in a CLI-style format
 */
export function TerminalVitals({ vitals }: TerminalVitalsProps) {
	const isHealthy = vitals.score === 100;

	// Determine line values and statuses
	const pulseValue = vitals.pulse === 0 ? "resting" : `${vitals.pulse}/min`;
	const pulseStatus: LineStatus = vitals.pulse === 0 ? "dim" : "active";

	const tempValue = vitals.temperature === 0 ? "cold" : `${vitals.temperature}% AI`;
	const tempStatus: LineStatus = vitals.temperature === 0 ? "dim" : "warn";

	const pressureValue = vitals.pressure === 0 ? "nominal" : `${vitals.pressure}%`;
	const pressureStatus: LineStatus = vitals.pressure > 50 ? "warn" : vitals.pressure === 0 ? "good" : "active";

	const oxygenValue = `${vitals.oxygen}% coverage`;
	const oxygenStatus: LineStatus = vitals.oxygen === 100 ? "good" : "warn";

	return (
		<div
			data-testid="terminal-vitals"
			role="region"
			aria-label="Workspace vitals status"
			className="font-mono text-sm"
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4">
				<div className="flex items-center gap-2">
					<span className="text-zinc-500">$</span>
					<span className="text-zinc-300">snapback status</span>
				</div>
				<div
					data-testid="terminal-score"
					className={cn(
						"px-2 py-0.5 rounded text-xs font-bold",
						isHealthy ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400",
					)}
				>
					{vitals.score}
				</div>
			</div>

			{/* Output lines */}
			<div className="space-y-1 text-zinc-400">
				<Line label="pulse" value={pulseValue} status={pulseStatus} />
				<Line label="temp" value={tempValue} status={tempStatus} />
				<Line
					label="pressure"
					value={pressureValue}
					status={pressureStatus}
					showCheck={vitals.pressure === 0}
				/>
				<Line label="oxygen" value={oxygenValue} status={oxygenStatus} showCheck={vitals.oxygen === 100} />
			</div>

			{/* Summary */}
			<div className="mt-4 pt-3 border-t border-zinc-800">
				{isHealthy ? (
					<span className="text-emerald-400">✓ workspace healthy — all ops safe</span>
				) : (
					<span className="text-amber-400">⚠ elevated activity — monitoring</span>
				)}
			</div>
		</div>
	);
}
