/**
 * PressureGauge - Risk accumulation tracking
 *
 * Measures the buildup of risk over time when changes are made without snapshots.
 * Pressure increases with:
 * - Time since last snapshot
 * - Number of unsnapshot'd changes
 * - Critical file modifications (2x multiplier)
 *
 * Pressure decreases when:
 * - A snapshot is created (50% decay)
 *
 * @performance Budget: <1ms per operation
 */

import type { PressureConfig } from "../types/vitals.js";

/** Default pressure configuration */
export const DEFAULT_PRESSURE_CONFIG: PressureConfig = {
	baseRate: 5, // 5% pressure per minute
	criticalMultiplier: 2, // 2x for critical files
	decayOnSnapshot: 50, // Release 50% on snapshot
	maxPressure: 100,
};

/** Pressure state result */
export interface PressureState {
	value: number; // 0-100
	unsnapshotedChanges: number;
	timeSinceLastSnapshot: number; // minutes
	criticalFilesTouched: string[];
}

/** Patterns for critical files that warrant extra protection */
const CRITICAL_FILE_PATTERNS: RegExp[] = [
	/package\.json$/,
	/\.env($|\.)/,
	/tsconfig\.json$/,
	/pnpm-lock\.yaml$/,
	/\.lock$/,
	/migrations?\//,
	/schema\.(sql|prisma|graphql)$/,
	/docker-compose\.ya?ml$/,
	/Dockerfile$/,
];

/**
 * Tracks risk pressure accumulation.
 *
 * Pressure builds continuously:
 * - Base rate per minute of elapsed time
 * - Per-change rate (higher for critical files)
 *
 * Pressure releases on snapshot creation.
 */
export class PressureGauge {
	private changeBasedPressure = 0;
	private unsnapshotedChanges = 0;
	private lastSnapshotTime: number;
	private criticalFilesTouched: Set<string> = new Set();
	private readonly config: PressureConfig;

	constructor(config: Partial<PressureConfig> = {}, initialTime: number = Date.now()) {
		this.config = { ...DEFAULT_PRESSURE_CONFIG, ...config };
		this.lastSnapshotTime = initialTime;
	}

	/**
	 * Record a file change, accumulating pressure.
	 * @param filePath Path of the modified file
	 */
	recordChange(filePath: string): void {
		this.unsnapshotedChanges++;

		const isCritical = this.isCriticalFile(filePath);
		if (isCritical) {
			this.criticalFilesTouched.add(filePath);
		}

		// Accumulate pressure per change
		// Each change adds baseRate/10 (so 10 changes = 1 minute worth of pressure)
		const multiplier = isCritical ? this.config.criticalMultiplier : 1;
		const increment = (this.config.baseRate * multiplier) / 10;
		this.changeBasedPressure = Math.min(this.config.maxPressure, this.changeBasedPressure + increment);
	}

	/**
	 * Record a snapshot, releasing pressure.
	 * @param now Optional timestamp for testing
	 */
	recordSnapshot(now: number = Date.now()): void {
		// Decay pressure by configured percentage
		this.changeBasedPressure = Math.max(0, this.changeBasedPressure * (1 - this.config.decayOnSnapshot / 100));
		this.unsnapshotedChanges = 0;
		this.criticalFilesTouched.clear();
		this.lastSnapshotTime = now;
	}

	/**
	 * Get current pressure state.
	 * @param now Optional timestamp for testing
	 */
	getState(now: number = Date.now()): PressureState {
		const minutesSinceSnapshot = Math.max(0, (now - this.lastSnapshotTime) / 60000);

		// Time-based pressure accumulation
		const timePressure = minutesSinceSnapshot * this.config.baseRate;

		// Total pressure is change-based + time-based, capped at max
		const totalPressure = Math.min(this.config.maxPressure, this.changeBasedPressure + timePressure);

		return {
			value: Math.round(totalPressure),
			unsnapshotedChanges: this.unsnapshotedChanges,
			timeSinceLastSnapshot: Math.round(minutesSinceSnapshot),
			criticalFilesTouched: Array.from(this.criticalFilesTouched),
		};
	}

	/**
	 * Reset the gauge to initial state.
	 * @param now Optional timestamp for testing
	 */
	reset(now: number = Date.now()): void {
		this.changeBasedPressure = 0;
		this.unsnapshotedChanges = 0;
		this.criticalFilesTouched.clear();
		this.lastSnapshotTime = now;
	}

	/**
	 * Check if a file path matches critical file patterns.
	 */
	private isCriticalFile(filePath: string): boolean {
		return CRITICAL_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
	}
}
