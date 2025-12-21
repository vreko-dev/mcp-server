/**
 * PulseTracker - Change velocity monitoring
 *
 * Tracks the rate of file changes to determine workspace "pulse" level.
 * Uses a sliding window to calculate changes per minute.
 *
 * @performance Budget: <1ms per operation (called on every file save)
 */

import type { PulseConfig, PulseLevel } from "../types/vitals.js";

/** Default pulse configuration */
export const DEFAULT_PULSE_CONFIG: PulseConfig = {
	elevated: 15, // changes/min
	racing: 30,
	critical: 50,
	windowSeconds: 60,
};

/** Pulse level result with metrics */
export interface PulseState {
	level: PulseLevel;
	changesPerMinute: number;
}

/**
 * Tracks change velocity over a sliding time window.
 *
 * Uses timestamps array with O(n) pruning on read.
 * For performance, pruning happens lazily during getLevel().
 */
export class PulseTracker {
	private changes: number[] = [];
	private readonly config: PulseConfig;

	constructor(config: Partial<PulseConfig> = {}) {
		this.config = { ...DEFAULT_PULSE_CONFIG, ...config };
	}

	/**
	 * Record a file change event.
	 * @performance O(1) - just pushes timestamp
	 */
	recordChange(timestamp: number = Date.now()): void {
		this.changes.push(timestamp);
	}

	/**
	 * Get current pulse level and changes per minute.
	 * @performance O(n) where n = changes in window
	 */
	getLevel(now: number = Date.now()): PulseState {
		this.pruneOld(now);

		const changesPerMinute =
			this.config.windowSeconds > 0 ? (this.changes.length / this.config.windowSeconds) * 60 : 0;

		return {
			level: this.classifyLevel(changesPerMinute),
			changesPerMinute: Math.round(changesPerMinute),
		};
	}

	/**
	 * Get raw change count in current window (for testing).
	 */
	getChangeCount(now: number = Date.now()): number {
		this.pruneOld(now);
		return this.changes.length;
	}

	/**
	 * Clear all recorded changes.
	 */
	reset(): void {
		this.changes = [];
	}

	/**
	 * Remove events outside the sliding window.
	 */
	private pruneOld(now: number): void {
		const cutoff = now - this.config.windowSeconds * 1000;
		// Filter in place for memory efficiency
		this.changes = this.changes.filter((t) => t > cutoff);
	}

	/**
	 * Classify changes/min into a pulse level.
	 */
	private classifyLevel(changesPerMinute: number): PulseLevel {
		if (changesPerMinute >= this.config.critical) {
			return "critical";
		}
		if (changesPerMinute >= this.config.racing) {
			return "racing";
		}
		if (changesPerMinute >= this.config.elevated) {
			return "elevated";
		}
		return "resting";
	}
}
