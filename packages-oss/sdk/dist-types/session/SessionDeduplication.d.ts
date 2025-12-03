/**
 * SessionDeduplication - Prevents duplicate session creation
 *
 * Strategy:
 * - Compute session fingerprint from sorted file change hashes
 * - Check against recent sessions (last 100)
 * - If fingerprint matches AND time delta < threshold, skip creation
 *
 * Performance:
 * - Uses LRU cache for session fingerprints
 * - O(n log n) for sorting, O(1) cache lookup
 */
import type { SessionChange } from "@snapback-oss/contracts/session";
/**
 * Deduplication configuration
 */
export interface SessionDeduplicationOptions {
	/** Maximum time between sessions to consider duplicates (default: 5 minutes) */
	timeDeltaMs?: number;
	/** Cache size for session fingerprints (default: 100) */
	cacheSize?: number;
	/** Minimum number of files to trigger deduplication (default: 5) */
	minFilesForDedup?: number;
}
/**
 * Deduplication result
 */
export interface DeduplicationResult {
	isDuplicate: boolean;
	reason?: string;
	existingSessionId?: string;
	fingerprint: string;
}
/**
 * SessionDeduplication - Detects and prevents duplicate sessions
 */
export declare class SessionDeduplication {
	private readonly timeDeltaMs;
	private readonly minFilesForDedup;
	private readonly fingerprintCache;
	constructor(options?: SessionDeduplicationOptions);
	/**
	 * Compute session fingerprint from file changes
	 */
	computeFingerprint(changes: SessionChange[]): string;
	/**
	 * Check if session is a duplicate
	 */
	checkDuplicate(changes: SessionChange[], timestamp: number): DeduplicationResult;
	/**
	 * Register a session fingerprint
	 */
	register(sessionId: string, changes: SessionChange[], timestamp: number): void;
	/**
	 * Remove a session fingerprint
	 */
	unregister(sessionId: string): void;
	/**
	 * Clear all fingerprints
	 */
	clear(): void;
	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number;
		maxSize: number;
	};
}
//# sourceMappingURL=SessionDeduplication.d.ts.map
