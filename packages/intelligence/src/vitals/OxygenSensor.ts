/**
 * OxygenSensor - Snapshot coverage tracking
 *
 * Measures how well-protected the workspace is based on:
 * - What percentage of modified files have snapshots
 * - How recent those snapshots are (stale = low oxygen)
 * - Critical file coverage weighted 2x
 *
 * @performance Budget: <1ms per operation
 */

import type { OxygenConfig } from "../types/vitals.js";

/** Default oxygen configuration */
export const DEFAULT_OXYGEN_CONFIG: OxygenConfig = {
	staleMinutes: 30, // Snapshots older than 30 min are stale
	criticalWeight: 2, // Critical files count 2x
};

/** Oxygen state with metrics */
export interface OxygenState {
	value: number; // 0-100
	coveragePercentage: number;
	staleSnapshots: number;
}

/** Patterns for critical files */
const CRITICAL_FILE_PATTERNS: RegExp[] = [
	/package\.json$/,
	/\.env($|\.)/,
	/tsconfig\.json$/,
	/pnpm-lock\.yaml$/,
	/\.lock$/,
	/migrations?\//,
	/schema\.(sql|prisma|graphql)$/,
];

/**
 * Tracks snapshot coverage of modified files.
 *
 * Oxygen represents how "protected" the current work is.
 * Higher oxygen = more snapshots covering active files.
 */
export class OxygenSensor {
	/** Map of file path to snapshot timestamp */
	private snapshots: Map<string, number> = new Map();
	/** Set of files that have been modified */
	private modifiedFiles: Set<string> = new Set();
	private readonly config: OxygenConfig;

	constructor(config: Partial<OxygenConfig> = {}) {
		this.config = { ...DEFAULT_OXYGEN_CONFIG, ...config };
	}

	/**
	 * Record a file modification.
	 * @param filePath Path of the modified file
	 */
	recordModification(filePath: string): void {
		this.modifiedFiles.add(filePath);
	}

	/**
	 * Record a snapshot creation for a file.
	 * @param filePath Path of the snapshotted file
	 * @param timestamp Optional: snapshot time for testing
	 */
	recordSnapshot(filePath: string, timestamp: number = Date.now()): void {
		this.snapshots.set(filePath, timestamp);
		// File is no longer "modified without snapshot"
		this.modifiedFiles.delete(filePath);
	}

	/**
	 * Record multiple snapshots at once (e.g., workspace-wide snapshot).
	 * @param filePaths Paths of snapshotted files
	 * @param timestamp Optional: snapshot time for testing
	 */
	recordBulkSnapshot(filePaths: string[], timestamp: number = Date.now()): void {
		for (const filePath of filePaths) {
			this.recordSnapshot(filePath, timestamp);
		}
	}

	/**
	 * Get current oxygen level and metrics.
	 * @param now Optional: current time for testing
	 */
	getLevel(now: number = Date.now()): OxygenState {
		const staleThreshold = now - this.config.staleMinutes * 60 * 1000;

		let covered = 0;
		let total = 0;
		let stale = 0;

		// Calculate coverage based on modified files
		for (const file of this.modifiedFiles) {
			const isCritical = this.isCriticalFile(file);
			const weight = isCritical ? this.config.criticalWeight : 1;
			total += weight;

			const snapshotTime = this.snapshots.get(file);
			if (snapshotTime) {
				if (snapshotTime > staleThreshold) {
					covered += weight;
				} else {
					stale++;
				}
			}
		}

		// Also count files that have snapshots but aren't in modifiedFiles
		// (they're fully protected)
		for (const [file, snapshotTime] of this.snapshots) {
			if (!this.modifiedFiles.has(file)) {
				// This file has a snapshot and hasn't been modified since
				// Don't count it in coverage calculation (it's safe)
			}
		}

		// If no modified files, oxygen is 100%
		const coveragePercentage = total > 0 ? (covered / total) * 100 : 100;

		return {
			value: Math.round(coveragePercentage),
			coveragePercentage: Math.round(coveragePercentage),
			staleSnapshots: stale,
		};
	}

	/**
	 * Get list of modified files without snapshots.
	 */
	getUncoveredFiles(): string[] {
		return Array.from(this.modifiedFiles).filter((file) => !this.snapshots.has(file));
	}

	/**
	 * Get count of tracked files.
	 */
	getCounts(): { modified: number; snapshots: number } {
		return {
			modified: this.modifiedFiles.size,
			snapshots: this.snapshots.size,
		};
	}

	/**
	 * Clear all tracking data.
	 */
	reset(): void {
		this.snapshots.clear();
		this.modifiedFiles.clear();
	}

	/**
	 * Check if a file path matches critical file patterns.
	 */
	private isCriticalFile(filePath: string): boolean {
		return CRITICAL_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
	}
}
