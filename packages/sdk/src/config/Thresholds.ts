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

import type { ExperienceMetrics } from "../types/experience.js";

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
 * Default threshold configuration (frozen and immutable)
 *
 * This constant contains the default values and is frozen to prevent modification.
 * Use THRESHOLDS for the current (potentially modified) values.
 */
const DEFAULT_THRESHOLDS_FROZEN: Readonly<ThresholdsConfig> = Object.freeze({
	/**
	 * Session lifecycle thresholds
	 */
	session: Object.freeze({
		idleTimeout: 105000, // 105 seconds (1.75 minutes)
		minSessionDuration: 5000, // 5 seconds
		maxSessionDuration: 3600000, // 1 hour
	}),

	/**
	 * Burst detection thresholds
	 */
	burst: Object.freeze({
		timeWindow: 5000, // 5 seconds
		minCharsInserted: 100, // 100 characters
		maxKeystrokeInterval: 200, // 200 milliseconds
		minLinesAffected: 3, // 3 lines
		minInsertDeleteRatio: 3, // 3:1 ratio (favoring insertions)
	}),

	/**
	 * Experience tier thresholds
	 */
	experience: Object.freeze({
		explorer: Object.freeze({
			snapshotsCreated: 5,
			sessionsRecorded: 3,
			protectedFiles: 2,
			manualRestores: 1,
			aiAssistedSessions: 0,
			daysSinceFirstUse: 7,
			commandDiversity: 0.3,
		}),
		intermediate: Object.freeze({
			snapshotsCreated: 20,
			sessionsRecorded: 10,
			protectedFiles: 5,
			manualRestores: 5,
			aiAssistedSessions: 2,
			daysSinceFirstUse: 30,
			commandDiversity: 0.6,
		}),
		power: Object.freeze({
			snapshotsCreated: 100,
			sessionsRecorded: 50,
			protectedFiles: 20,
			manualRestores: 20,
			aiAssistedSessions: 10,
			daysSinceFirstUse: 90,
			commandDiversity: 0.9,
		}),
	}),

	/**
	 * Session tagging thresholds
	 */
	tagging: Object.freeze({
		minBurstConfidence: 0.7,
		minLongSessionDuration: 1800000, // 30 minutes
		maxShortSessionDuration: 30000, // 30 seconds
		minLargeEditLines: 1000,
		normalization: Object.freeze({
			multiFileThreshold: 5, // Tag as multi-file if > 5 files
			multiFileNormalization: 10, // Normalize confidence to 10 files
			longSessionNormalization: 7200000, // Normalize to 2 hours
			largeEditsNormalization: 5000, // Normalize to 5000 lines
		}),
	}),

	/**
	 * Risk analysis thresholds
	 */
	risk: Object.freeze({
		blockingThreshold: 8.0, // Block operations above this score (0-10 scale)
		criticalThreshold: 7.0, // Critical severity
		highThreshold: 5.0, // High severity
		mediumThreshold: 3.0, // Medium severity
	}),

	/**
	 * Security pattern scores (0-10 scale)
	 */
	securityScores: Object.freeze({
		evalUsage: 4.0,
		functionConstructor: 4.0,
		dangerousHtml: 3.0,
		execCommand: 5.0,
		sqlConcat: 6.0,
		hardcodedSecrets: 4.0,
		weakCrypto: 3.0,
	}),

	/**
	 * Detection thresholds
	 */
	detection: Object.freeze({
		entropyThreshold: 2.5, // Shannon entropy (bits per symbol) for secret detection
		typosquattingDistance: 3, // Levenshtein distance for dependency typosquatting
	}),

	/**
	 * Protection level thresholds
	 */
	protection: Object.freeze({
		protectedCooldown: 600000, // 10 minutes in ms
		otherCooldown: 300000, // 5 minutes in ms
		debounceWindow: 5000, // 5 seconds in ms
	}),

	/**
	 * Resource limits
	 */
	resources: Object.freeze({
		dedupCacheSize: 500, // Maximum cache entries
		snapshotMaxFiles: 10000, // Maximum files in snapshot
		snapshotMaxFileSize: 10 * 1024 * 1024, // 10MB in bytes
		snapshotMaxTotalSize: 500 * 1024 * 1024, // 500MB in bytes
		diffHaloSize: 3, // Context lines for diffs
		trialSnapshotLimit: 50, // Snapshots for trial users
		freeMonthlyLimit: 100, // Free tier monthly limit
	}),

	/**
	 * Quality of Service thresholds
	 */
	qos: Object.freeze({
		rateLimitCapacity: 100, // Token bucket capacity
		rateLimitRefill: 60000, // 60 seconds in ms
		eventBusTimeout: 5000, // 5 seconds in ms
		eventBusMaxRetries: 3, // Maximum retry attempts
		errorBudgetHard: 0.01, // 1% error rate threshold
		errorBudgetWarn: 0.005, // 0.5% warning threshold
		batchMax: 10, // Maximum items in batch
		batchIntervalMs: 1000, // 1 second batch interval
		retryBaseMs: 100, // 100ms base retry delay
		retryMaxMs: 5000, // 5 seconds max retry delay
		maxQueueSize: 1000, // Maximum queue size
		httpTimeout: 30000, // 30 seconds HTTP timeout
	}),

	/**
	 * Documentation for threshold values
	 */
	docs: Object.freeze({
		session: Object.freeze({
			idleTimeout: "Duration of inactivity before automatically finalizing a session",
			minSessionDuration: "Minimum duration required for a session to be considered valid",
			maxSessionDuration: "Maximum duration before automatically finalizing a long-running session",
		}),
		burst: Object.freeze({
			timeWindow: "Time window to analyze for burst patterns (rapid insertions)",
			minCharsInserted: "Minimum characters inserted within time window to qualify as burst",
			maxKeystrokeInterval: "Maximum time between consecutive keystrokes to qualify as burst",
			minLinesAffected: "Minimum number of lines changed to qualify as burst",
			minInsertDeleteRatio:
				"Minimum ratio of inserted to deleted characters (e.g., 3:1 means 3x more insertions)",
		}),
		experience: Object.freeze({
			description:
				"Thresholds for classifying users into experience tiers based on usage patterns. Users must meet ALL thresholds within a tier to qualify.",
			explorer: "New users getting started with SnapBack (low activity)",
			intermediate: "Regular users with moderate experience (consistent usage)",
			power: "Advanced users who leverage many features (high engagement)",
		}),
		tagging: Object.freeze({
			description: "Thresholds for automatically tagging sessions based on detected patterns and characteristics",
			minBurstConfidence: "Minimum confidence level (0-1) required to tag session as having burst patterns",
			minLongSessionDuration: "Minimum duration to classify and tag a session as 'long-session'",
			maxShortSessionDuration: "Maximum duration to classify and tag a session as 'short-session'",
			minLargeEditLines: "Minimum lines added to classify and tag a session as having 'large-edits'",
		}),
		risk: Object.freeze({
			description: "Risk thresholds for security analysis and blocking operations",
			blockingThreshold: "Score above which operations are blocked (0-10 scale)",
			criticalThreshold: "Threshold for critical severity classification",
			highThreshold: "Threshold for high severity classification",
			mediumThreshold: "Threshold for medium severity classification",
		}),
		detection: Object.freeze({
			entropyThreshold:
				"Shannon entropy threshold (bits per symbol) for detecting potential secrets and high-entropy strings",
			typosquattingDistance:
				"Maximum Levenshtein distance for detecting potential typosquatting in dependency names",
		}),
		protection: Object.freeze({
			protectedCooldown: "Cooldown period after saving protected files before next protection check",
			otherCooldown: "Cooldown period for warn and watch protection levels",
			debounceWindow: "Debounce window to prevent rapid-fire protection checks",
		}),
		resources: Object.freeze({
			dedupCacheSize: "Maximum number of entries in the deduplication cache (FIFO eviction)",
			snapshotMaxFiles: "Maximum number of files allowed in a single snapshot operation",
			diffHaloSize: "Number of context lines to include around changed regions in diffs",
		}),
		qos: Object.freeze({
			rateLimitCapacity: "Token bucket capacity for rate limiting API requests",
			errorBudgetHard: "Hard error rate threshold triggering alerts and degradation (1% = 0.01)",
			batchMax: "Maximum number of items to batch together before flushing",
			batchIntervalMs: "Time interval to wait before auto-flushing a batch (milliseconds)",
			retryBaseMs: "Base delay for exponential backoff retry logic (milliseconds)",
			retryMaxMs: "Maximum delay cap for exponential backoff retries (milliseconds)",
			maxQueueSize: "Maximum queue size before dropping new items to prevent memory overflow",
			httpTimeout: "HTTP request timeout for QoS API calls (milliseconds)",
		}),
	}),
});

/**
 * Exported default thresholds (frozen for immutability)
 *
 * This is a reference to the frozen defaults, exported for inspection and testing.
 * Use THRESHOLDS for the current (potentially modified) values.
 */
export const DEFAULT_THRESHOLDS: Readonly<ThresholdsConfig> = DEFAULT_THRESHOLDS_FROZEN;

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
export const THRESHOLDS: ThresholdsConfig = structuredClone(DEFAULT_THRESHOLDS_FROZEN);

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
export function createThresholds(overrides?: Partial<ThresholdsConfig>): ThresholdsConfig {
	return {
		session: { ...THRESHOLDS.session, ...overrides?.session },
		burst: { ...THRESHOLDS.burst, ...overrides?.burst },
		experience: {
			explorer: { ...THRESHOLDS.experience.explorer, ...overrides?.experience?.explorer },
			intermediate: { ...THRESHOLDS.experience.intermediate, ...overrides?.experience?.intermediate },
			power: { ...THRESHOLDS.experience.power, ...overrides?.experience?.power },
		},
		tagging: {
			...THRESHOLDS.tagging,
			...overrides?.tagging,
			normalization: { ...THRESHOLDS.tagging.normalization, ...overrides?.tagging?.normalization },
		},
		risk: { ...THRESHOLDS.risk, ...overrides?.risk },
		securityScores: { ...THRESHOLDS.securityScores, ...overrides?.securityScores },
		detection: { ...THRESHOLDS.detection, ...overrides?.detection },
		protection: { ...THRESHOLDS.protection, ...overrides?.protection },
		resources: { ...THRESHOLDS.resources, ...overrides?.resources },
		qos: { ...THRESHOLDS.qos, ...overrides?.qos },
		docs: THRESHOLDS.docs, // Documentation is immutable
	};
}

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
export function updateThresholds(overrides: Partial<ThresholdsConfig>): void {
	const updated = createThresholds(overrides);
	// Note: THRESHOLDS is exported as a mutable let binding
	Object.assign(THRESHOLDS, updated);
}

/**
 * Reset global thresholds to defaults
 *
 * Useful for testing or restoring default configuration.
 */
export function resetThresholds(): void {
	Object.assign(THRESHOLDS, DEFAULT_THRESHOLDS);
}
