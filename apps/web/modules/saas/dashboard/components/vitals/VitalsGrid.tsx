"use client";

import { VitalBar } from "./VitalBar";

interface VitalsData {
	pulse: number;
	temperature: number;
	pressure: number;
	oxygen: number;
	score: number;
}

interface VitalsGridProps {
	vitals: VitalsData;
}

/**
 * Bento-style grid layout for vitals
 * Shows hero state when all healthy, detailed metrics otherwise
 */
export function VitalsGrid({ vitals }: VitalsGridProps) {
	const isHealthy = vitals.score === 100;

	if (isHealthy) {
		return (
			<div
				data-testid="vitals-grid"
				role="group"
				aria-label="Workspace vitals metrics"
				className="grid grid-cols-2 gap-3"
			>
				<div
					data-testid="vitals-hero-healthy"
					className="col-span-2 p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center"
				>
					<div className="text-6xl mb-2">💚</div>
					<div className="text-2xl font-bold text-emerald-400">All Protected</div>
					<div className="text-sm text-zinc-500 mt-1">Workspace healthy — no action needed</div>
				</div>
			</div>
		);
	}

	return (
		<div
			data-testid="vitals-grid"
			role="group"
			aria-label="Workspace vitals metrics"
			className="grid grid-cols-2 gap-3"
		>
			{/* Oxygen is hero when not 100% */}
			<div className="col-span-2">
				<VitalBar
					label="OXYGEN"
					value={vitals.oxygen}
					subtitle="coverage health"
					variant={vitals.oxygen < 80 ? "warning" : "success"}
					isActive={vitals.oxygen < 100}
				/>
			</div>

			{/* Secondary metrics */}
			<div>
				<VitalBar label="PULSE" value={vitals.pulse} subtitle="changes/min" isActive={vitals.pulse > 0} />
			</div>
			<div>
				<VitalBar
					label="TEMPERATURE"
					value={vitals.temperature}
					subtitle="AI density"
					isActive={vitals.temperature > 0}
				/>
			</div>

			{/* Pressure spans full width */}
			<div className="col-span-2">
				<VitalBar
					label="PRESSURE"
					value={vitals.pressure}
					subtitle="unsnapshot changes"
					variant={vitals.pressure > 50 ? "warning" : "default"}
					isActive={vitals.pressure > 0}
				/>
			</div>
		</div>
	);
}
