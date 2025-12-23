/**
 * File Fragility Tracking Types
 *
 * Tracks which files are "fragile" based on rollback history and co-change patterns.
 *
 * Based on research:
 * - arXiv:2501.09225 - Provenance Guided Rollback Suggestions
 * - Hybrid Change Impact Analysis - co-change pattern mining
 * - CI/CD Rollback Best Practices
 */

/**
 * Fragility level classification
 */
export type FragilityLevel = "stable" | "moderate" | "fragile" | "critical";

/**
 * Rollback event
 */
export interface RollbackEvent {
	/** File path */
	file: string;
	/** Rollback timestamp */
	timestamp: number;
	/** Time since last modification (ms) */
	timeSinceModification: number;
	/** Reason (if available) */
	reason?: string;
	/** Related files rolled back together */
	relatedFiles?: string[];
}

/**
 * Co-change pattern
 * Files that are frequently modified together
 */
export interface CoChangePattern {
	/** Primary file */
	file: string;
	/** Co-changed file */
	coChangedWith: string;
	/** Number of times changed together */
	coChangeCount: number;
	/** Total changes to primary file */
	totalChanges: number;
	/** Co-change frequency (0-1) */
	frequency: number;
	/** Last co-change timestamp */
	lastCoChange: number;
}

/**
 * File fragility profile
 */
export interface FileFragilityProfile {
	/** File path */
	path: string;

	/** Fragility level */
	level: FragilityLevel;

	/** Fragility score (0-1, higher = more fragile) */
	score: number;

	/** Total rollback count */
	rollbackCount: number;

	/** Average time to rollback (ms) */
	averageTimeToRollback: number;

	/** Last rollback timestamp */
	lastRollback?: number;

	/** Files frequently modified together */
	frequentlyModifiedWith: string[];

	/** Co-change patterns */
	coChangePatterns: CoChangePattern[];

	/** Modification velocity (changes per day) */
	modificationVelocity: number;

	/** Last modified timestamp */
	lastModified: number;

	/** Confidence in fragility assessment (0-1) */
	confidence: number;
}

/**
 * Fragility tracker configuration
 */
export interface FragilityConfig {
	/** Enable fragility tracking */
	enabled: boolean;

	/** Rolling window for rollback tracking (days) */
	rollbackWindowDays: number;

	/** Minimum rollbacks to classify as fragile */
	minRollbacksForFragile: number;

	/** Co-change frequency threshold (0-1) */
	coChangeThreshold: number;

	/** Max time for "quick rollback" (ms) */
	quickRollbackThresholdMs: number;

	/** Fragility score decay rate (daily) */
	scoreDecayRate: number;
}

/**
 * Default fragility configuration
 */
export const DEFAULT_FRAGILITY_CONFIG: FragilityConfig = {
	enabled: true,
	rollbackWindowDays: 7,
	minRollbacksForFragile: 2,
	coChangeThreshold: 0.3, // 30% co-change frequency
	quickRollbackThresholdMs: 3600000, // 1 hour
	scoreDecayRate: 0.05, // 5% daily decay
};

/**
 * Fragility analysis result
 */
export interface FragilityAnalysis {
	/** File path */
	file: string;

	/** Current fragility profile */
	profile: FileFragilityProfile;

	/** Warnings */
	warnings: Array<{
		level: "error" | "warning" | "info";
		message: string;
	}>;

	/** Recommendations */
	recommendations: string[];

	/** Related files to review */
	relatedFiles: Array<{
		path: string;
		reason: string;
		coChangeFrequency: number;
	}>;
}

/**
 * Fragility store schema (JSONL)
 */
export interface FragilityRecord {
	/** File path */
	file: string;
	/** Event type */
	eventType: "rollback" | "modification" | "co-change";
	/** Timestamp */
	timestamp: number;
	/** Event data */
	data: {
		rollback?: RollbackEvent;
		modification?: {
			linesChanged: number;
			author: string;
		};
		coChange?: {
			files: string[];
		};
	};
}
