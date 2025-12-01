/**
 * @fileoverview Burst Heuristics Detector - Detects AI-like editing bursts
 *
 * This module provides utilities for detecting rapid, large insertions that
 * might indicate AI-assisted coding sessions. It analyzes editing patterns
 * to identify characteristic AI behaviors.
 *
 * Migrated from apps/vscode to SDK for platform-wide reuse.
 */

import { THRESHOLDS } from "../../config/Thresholds.js";

/**
 * Configuration for burst detection
 * Uses centralized THRESHOLDS from SDK config (Phase 15)
 */
const DEFAULT_BURST_CONFIG = {
	/** Time window in milliseconds to consider for burst detection */
	timeWindow: THRESHOLDS.burst.timeWindow,

	/** Minimum number of characters inserted to qualify as burst */
	minCharsInserted: THRESHOLDS.burst.minCharsInserted,

	/** Maximum time between keystrokes to qualify as burst */
	maxKeystrokeInterval: THRESHOLDS.burst.maxKeystrokeInterval,

	/** Minimum number of lines affected to qualify as burst */
	minLinesAffected: THRESHOLDS.burst.minLinesAffected,

	/** Minimum ratio of inserted to deleted chars to qualify as burst */
	minInsertDeleteRatio: THRESHOLDS.burst.minInsertDeleteRatio,
};

/**
 * Configuration interface for burst detection
 */
export interface BurstDetectorConfig {
	/** Time window in milliseconds to consider for burst detection */
	timeWindow?: number;

	/** Minimum number of characters inserted to qualify as burst */
	minCharsInserted?: number;

	/** Maximum time between keystrokes to qualify as burst */
	maxKeystrokeInterval?: number;

	/** Minimum number of lines affected to qualify as burst */
	minLinesAffected?: number;

	/** Minimum ratio of inserted to deleted chars to qualify as burst */
	minInsertDeleteRatio?: number;
}

/**
 * Information about a text change event
 */
interface TextChangeInfo {
	/** Timestamp of the change */
	timestamp: number;

	/** Number of characters inserted */
	charsInserted: number;

	/** Number of characters deleted */
	charsDeleted: number;

	/** Number of lines affected */
	linesAffected: number;

	/** Time since last change */
	interval: number;
}

/**
 * Results of burst detection analysis
 */
export interface BurstDetectionResult {
	/** Whether a burst pattern was detected */
	isBurst: boolean;

	/** Confidence level (0-1) */
	confidence: number;

	/** Details about the detected burst */
	details?: {
		/** Total characters inserted */
		totalInserted: number;

		/** Total characters deleted */
		totalDeleted: number;

		/** Insert/delete ratio */
		ratio: number;

		/** Number of changes in burst */
		changeCount: number;

		/** Duration of burst */
		duration: number;
	};
}

/**
 * Tracks and detects AI-like burst patterns in editing
 */
export class BurstHeuristicsDetector {
	/** Recent text changes for analysis */
	private recentChanges: TextChangeInfo[] = [];

	/** Timestamp of last change */
	private lastChangeTime = 0;

	/** Configuration for burst detection */
	private config: Required<BurstDetectorConfig>;

	/**
	 * Creates a new BurstHeuristicsDetector
	 *
	 * @param config Optional configuration to override defaults
	 */
	constructor(config?: BurstDetectorConfig) {
		this.config = {
			timeWindow: config?.timeWindow ?? DEFAULT_BURST_CONFIG.timeWindow,
			minCharsInserted: config?.minCharsInserted ?? DEFAULT_BURST_CONFIG.minCharsInserted,
			maxKeystrokeInterval: config?.maxKeystrokeInterval ?? DEFAULT_BURST_CONFIG.maxKeystrokeInterval,
			minLinesAffected: config?.minLinesAffected ?? DEFAULT_BURST_CONFIG.minLinesAffected,
			minInsertDeleteRatio: config?.minInsertDeleteRatio ?? DEFAULT_BURST_CONFIG.minInsertDeleteRatio,
		};
	}

	/**
	 * Records a text change event for burst analysis
	 *
	 * @param charsInserted Number of characters inserted
	 * @param charsDeleted Number of characters deleted
	 * @param linesAffected Number of lines affected
	 */
	recordChange(charsInserted: number, charsDeleted: number, linesAffected: number): void {
		const now = Date.now();
		const interval = this.lastChangeTime > 0 ? now - this.lastChangeTime : 0;

		const changeInfo: TextChangeInfo = {
			timestamp: now,
			charsInserted,
			charsDeleted,
			linesAffected,
			interval,
		};

		this.recentChanges.push(changeInfo);
		this.lastChangeTime = now;

		// Trim old changes outside the time window
		this.trimOldChanges();
	}

	/**
	 * Analyzes recent changes to detect burst patterns
	 *
	 * @returns Burst detection result
	 */
	analyzeBurst(): BurstDetectionResult {
		// Need at least 2 changes to analyze pattern
		if (this.recentChanges.length < 2) {
			return { isBurst: false, confidence: 0 };
		}

		// Filter changes within the time window
		const now = Date.now();
		const windowChanges = this.recentChanges.filter((change) => now - change.timestamp <= this.config.timeWindow);

		// Need at least 2 changes in window
		if (windowChanges.length < 2) {
			return { isBurst: false, confidence: 0 };
		}

		// Calculate aggregate metrics
		const totalInserted = windowChanges.reduce((sum, change) => sum + change.charsInserted, 0);

		const totalDeleted = windowChanges.reduce((sum, change) => sum + change.charsDeleted, 0);

		const totalLines = windowChanges.reduce((sum, change) => sum + change.linesAffected, 0);

		const duration =
			windowChanges.length > 1
				? windowChanges[windowChanges.length - 1].timestamp - windowChanges[0].timestamp
				: 0;

		// Check burst criteria
		const meetsCharThreshold = totalInserted >= this.config.minCharsInserted;
		const meetsLineThreshold = totalLines >= this.config.minLinesAffected;

		const ratio = totalDeleted > 0 ? totalInserted / totalDeleted : totalInserted;
		const meetsRatioThreshold = ratio >= this.config.minInsertDeleteRatio;

		// Calculate average interval between changes
		const intervals = windowChanges.slice(1).map((change, i) => change.timestamp - windowChanges[i].timestamp);

		const avgInterval =
			intervals.length > 0 ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0;

		const meetsTimingThreshold = avgInterval <= this.config.maxKeystrokeInterval;

		// Determine if this qualifies as a burst
		const isBurst = meetsCharThreshold && meetsLineThreshold && meetsRatioThreshold && meetsTimingThreshold;

		// Calculate confidence based on how strongly criteria are met
		let confidence = 0;
		if (isBurst) {
			// Base confidence on how much criteria are exceeded
			const charConfidence = Math.min(1, totalInserted / (this.config.minCharsInserted * 2));
			const lineConfidence = Math.min(1, totalLines / (this.config.minLinesAffected * 2));
			const ratioConfidence = Math.min(1, ratio / (this.config.minInsertDeleteRatio * 2));
			const timingConfidence =
				avgInterval > 0 ? Math.min(1, this.config.maxKeystrokeInterval / (avgInterval * 2)) : 1;

			confidence = (charConfidence + lineConfidence + ratioConfidence + timingConfidence) / 4;
		}

		return {
			isBurst,
			confidence,
			details: isBurst
				? {
						totalInserted,
						totalDeleted,
						ratio,
						changeCount: windowChanges.length,
						duration,
					}
				: undefined,
		};
	}

	/**
	 * Trims old changes outside the analysis time window
	 */
	private trimOldChanges(): void {
		const cutoffTime = Date.now() - this.config.timeWindow;
		this.recentChanges = this.recentChanges.filter((change) => change.timestamp >= cutoffTime);
	}

	/**
	 * Clears all recorded changes
	 */
	clear(): void {
		this.recentChanges = [];
		this.lastChangeTime = 0;
	}
}
