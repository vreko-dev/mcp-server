/**
 * Centralized Threshold Configuration
 *
 * This module serves as the single source of truth for all timing,
 * detection, classification, and risk thresholds across the SDK.
 *
 * These thresholds represent empirically tuned values from production usage
 * and constitute critical intellectual property. Centralizing thresholds enables:
 * - Single source of truth for all threshold values
 * - A/B testing and empirical tuning
 * - Runtime configuration via feature flags
 * - Consistent behavior across all platforms (VSCode, CLI, MCP, Web)
 *
 * All threshold values are frozen to prevent accidental modification.
 * Components can override these defaults via their configuration options.
 *
 * @module config/Thresholds
 */
import type { ExperienceMetrics } from "../types/experience";
/**
 * Session coordinator thresholds for session lifecycle management
 */
export interface SessionThresholds {
	/** Time of inactivity before finalizing session (ms) */
	idleTimeout: number;
	/** Minimum duration for a valid session (ms) */
	minSessionDuration: number;
	/** Maximum duration before auto-finalizing session (ms) */
	maxSessionDuration: number;
}
/**
 * Burst detection thresholds for identifying AI-like editing patterns
 */
export interface BurstThresholds {
	/** Time window for burst detection (ms) */
	timeWindow: number;
	/** Minimum characters inserted to qualify as burst */
	minCharsInserted: number;
	/** Maximum time between keystrokes for burst (ms) */
	maxKeystrokeInterval: number;
	/** Minimum lines affected to qualify as burst */
	minLinesAffected: number;
	/** Minimum insert/delete ratio for burst (e.g., 3:1) */
	minInsertDeleteRatio: number;
}
/**
 * Experience classification thresholds for user tiers
 */
export interface ExperienceThresholds {
	/** Thresholds for explorer tier (new users) */
	explorer: ExperienceMetrics;
	/** Thresholds for intermediate tier (regular users) */
	intermediate: ExperienceMetrics;
	/** Thresholds for power tier (advanced users) */
	power: ExperienceMetrics;
}
/**
 * Session tagging thresholds for automatic tag generation
 */
export interface TaggingThresholds {
	/** Minimum burst confidence to tag as AI-assisted */
	minBurstConfidence: number;
	/** Minimum duration to tag as long-session (ms) */
	minLongSessionDuration: number;
	/** Maximum duration to tag as short-session (ms) */
	maxShortSessionDuration: number;
	/** Minimum lines added to tag as large-edits */
	minLargeEditLines: number;
	/** Normalization constants for confidence calculations */
	normalization: {
		/** File count threshold for multi-file tag */
		multiFileThreshold: number;
		/** File count for normalizing multi-file confidence */
		multiFileNormalization: number;
		/** Duration for normalizing long-session confidence (ms) */
		longSessionNormalization: number;
		/** Line count for normalizing large-edits confidence */
		largeEditsNormalization: number;
	};
}
/**
 * Risk analysis and scoring thresholds
 */
export interface RiskThresholds {
	/** Score above which operations are blocked (default: 8.0 on 0-10 scale) */
	blockingThreshold: number;
	/** Score threshold for critical severity (default: 7.0) */
	criticalThreshold: number;
	/** Score threshold for high severity (default: 5.0) */
	highThreshold: number;
	/** Score threshold for medium severity (default: 3.0) */
	mediumThreshold: number;
}
/**
 * Security pattern risk scores (0-10 scale)
 */
export interface SecurityPatternScores {
	/** eval() usage score (default: 4.0) */
	evalUsage: number;
	/** Function constructor score (default: 4.0) */
	functionConstructor: number;
	/** innerHTML usage score (default: 3.0) */
	dangerousHtml: number;
	/** exec() command score (default: 5.0) */
	execCommand: number;
	/** SQL concatenation score (default: 6.0) */
	sqlConcat: number;
	/** Hardcoded secrets score (default: 4.0) */
	hardcodedSecrets: number;
	/** Weak crypto score (default: 3.0) */
	weakCrypto: number;
}
/**
 * Detection thresholds for security analysis
 */
export interface DetectionThresholds {
	/** Shannon entropy threshold for secret detection (default: 2.5 bits per symbol) */
	entropyThreshold: number;
	/** Levenshtein distance threshold for typosquatting (default: 3) */
	typosquattingDistance: number;
}
/**
 * Protection level and cooldown thresholds
 */
export interface ProtectionThresholds {
	/** Cooldown duration for protected files (default: 10min = 600s) */
	protectedCooldown: number;
	/** Cooldown duration for other protection levels (default: 5min = 300s) */
	otherCooldown: number;
	/** Debounce window for protection checks (default: 5s) */
	debounceWindow: number;
}
/**
 * Resource limits and capacity thresholds
 */
export interface ResourceThresholds {
	/** Maximum deduplication cache size (default: 500 entries) */
	dedupCacheSize: number;
	/** Maximum files in snapshot (default: 10,000) */
	snapshotMaxFiles: number;
	/** Maximum file size in snapshot (default: 10MB) */
	snapshotMaxFileSize: number;
	/** Maximum total snapshot size (default: 500MB) */
	snapshotMaxTotalSize: number;
	/** Halo size for diff context (default: 3 lines) */
	diffHaloSize: number;
	/** Trial snapshot limit (default: 50) */
	trialSnapshotLimit: number;
	/** Free tier monthly snapshot limit (default: 100) */
	freeMonthlyLimit: number;
}
/**
 * Quality of Service (QoS) thresholds
 */
export interface QoSThresholds {
	/** Rate limiter token bucket capacity (default: 100) */
	rateLimitCapacity: number;
	/** Rate limiter refill period (default: 60s) */
	rateLimitRefill: number;
	/** Event bus timeout (default: 5s) */
	eventBusTimeout: number;
	/** Event bus max retries (default: 3) */
	eventBusMaxRetries: number;
	/** Error budget hard threshold (default: 1% = 0.01) */
	errorBudgetHard: number;
	/** Error budget warning threshold (default: 0.5% = 0.005) */
	errorBudgetWarn: number;
	/** Maximum items in batch (default: 10) */
	batchMax: number;
	/** Time interval for batch flush in milliseconds (default: 1s) */
	batchIntervalMs: number;
	/** Base retry delay in milliseconds (default: 100ms) */
	retryBaseMs: number;
	/** Maximum retry delay in milliseconds (default: 5s) */
	retryMaxMs: number;
	/** Maximum queue size before dropping items (default: 1000) */
	maxQueueSize: number;
	/** HTTP request timeout in milliseconds (default: 30s) */
	httpTimeout: number;
}
/**
 * Documentation for threshold values
 */
export interface ThresholdDocumentation {
	session: {
		idleTimeout: string;
		minSessionDuration: string;
		maxSessionDuration: string;
	};
	burst: {
		timeWindow: string;
		minCharsInserted: string;
		maxKeystrokeInterval: string;
		minLinesAffected: string;
		minInsertDeleteRatio: string;
	};
	experience: {
		description: string;
		explorer: string;
		intermediate: string;
		power: string;
	};
	tagging: {
		description: string;
		minBurstConfidence: string;
		minLongSessionDuration: string;
		maxShortSessionDuration: string;
		minLargeEditLines: string;
	};
	risk: {
		description: string;
		blockingThreshold: string;
		criticalThreshold: string;
		highThreshold: string;
		mediumThreshold: string;
	};
	detection: {
		entropyThreshold: string;
		typosquattingDistance: string;
	};
	protection: {
		protectedCooldown: string;
		otherCooldown: string;
		debounceWindow: string;
	};
	resources: {
		dedupCacheSize: string;
		snapshotMaxFiles: string;
		diffHaloSize: string;
	};
	qos: {
		rateLimitCapacity: string;
		errorBudgetHard: string;
		batchMax: string;
		batchIntervalMs: string;
		retryBaseMs: string;
		retryMaxMs: string;
		maxQueueSize: string;
		httpTimeout: string;
	};
}
/**
 * Complete threshold configuration
 */
export interface ThresholdsConfig {
	session: SessionThresholds;
	burst: BurstThresholds;
	experience: ExperienceThresholds;
	tagging: TaggingThresholds;
	risk: RiskThresholds;
	securityScores: SecurityPatternScores;
	detection: DetectionThresholds;
	protection: ProtectionThresholds;
	resources: ResourceThresholds;
	qos: QoSThresholds;
	docs: ThresholdDocumentation;
}
/**
 * Exported default thresholds (frozen for immutability)
 *
 * This is a reference to the frozen defaults, exported for inspection and testing.
 * Use THRESHOLDS for the current (potentially modified) values.
 */
export declare const DEFAULT_THRESHOLDS: Readonly<ThresholdsConfig>;
/**
 * Current threshold configuration (mutable)
 *
 * This object holds the currently active thresholds and can be modified at runtime
 * using updateThresholds() or reset using resetThresholds().
 *
 * @example
 * ```typescript
 * import { THRESHOLDS } from '@snapback/sdk';
 *
 * const coordinator = new SessionCoordinator({
 *   config: {
 *     idleTimeout: THRESHOLDS.session.idleTimeout,
 *     minSessionDuration: THRESHOLDS.session.minSessionDuration,
 *   }
 * });
 * ```
 */
export declare const THRESHOLDS: ThresholdsConfig;
/**
 * Re-export for convenience
 */
export default THRESHOLDS;
/**
 * Create a new thresholds instance with optional overrides
 *
 * @param overrides - Partial threshold overrides
 * @returns New thresholds configuration with overrides applied
 *
 * @example
 * ```typescript
 * const testThresholds = createThresholds({
 *   risk: {
 *     blockingThreshold: 6.0, // More permissive for testing
 *     criticalThreshold: 5.0,
 *     highThreshold: 4.0,
 *     mediumThreshold: 2.0,
 *   },
 * });
 * ```
 */
export declare function createThresholds(overrides?: Partial<ThresholdsConfig>): ThresholdsConfig;
/**
 * Update global thresholds at runtime
 *
 * Useful for feature flags, A/B testing, or environment-specific tuning.
 * Note: This mutates the global THRESHOLDS object.
 *
 * @param overrides - Partial threshold overrides to apply globally
 *
 * @example
 * ```typescript
 * // More aggressive burst detection for beta users
 * updateThresholds({
 *   burst: {
 *     timeWindow: 3000, // 3s instead of 5s
 *     minCharsInserted: 50,
 *     maxKeystrokeInterval: 150,
 *     minLinesAffected: 2,
 *     minInsertDeleteRatio: 2,
 *   },
 * });
 * ```
 */
export declare function updateThresholds(overrides: Partial<ThresholdsConfig>): void;
/**
 * Reset global thresholds to defaults
 *
 * Useful for testing or restoring default configuration.
 */
export declare function resetThresholds(): void;
//# sourceMappingURL=Thresholds.d.ts.map
