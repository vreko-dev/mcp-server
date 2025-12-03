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

import * as crypto from "node:crypto";
import type { SessionChange } from "@snapback-oss/contracts/session";
import QuickLRU from "quick-lru";

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
 * Session fingerprint for deduplication
 */
interface SessionFingerprint {
	fingerprint: string;
	timestamp: number;
	sessionId: string;
	changeCount: number;
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
export class SessionDeduplication {
	private readonly timeDeltaMs: number;
	private readonly minFilesForDedup: number;
	private readonly fingerprintCache: QuickLRU<string, SessionFingerprint>;

	constructor(options: SessionDeduplicationOptions = {}) {
		this.timeDeltaMs = options.timeDeltaMs ?? 5 * 60 * 1000; // 5 minutes
		this.minFilesForDedup = options.minFilesForDedup ?? 5;

		this.fingerprintCache = new QuickLRU({
			maxSize: options.cacheSize ?? 100,
		});
	}

	/**
	 * Compute session fingerprint from file changes
	 */
	computeFingerprint(changes: SessionChange[]): string {
		if (changes.length === 0) {
			return "";
		}

		// Extract file paths and operations
		const items = changes.map((change) => {
			const path = change.p;
			const op = change.op;
			const hNew = change.hNew || "";
			const hOld = change.hOld || "";

			// Combine path, operation, and hashes
			return `${path}:${op}:${hOld}:${hNew}`;
		});

		// Sort for deterministic fingerprint
		items.sort();

		// Hash the sorted items
		const hash = crypto.createHash("sha256");
		for (const item of items) {
			hash.update(item);
		}

		return hash.digest("hex");
	}

	/**
	 * Check if session is a duplicate
	 */
	checkDuplicate(changes: SessionChange[], timestamp: number): DeduplicationResult {
		// Skip deduplication for small sessions
		if (changes.length < this.minFilesForDedup) {
			const fingerprint = this.computeFingerprint(changes);
			return {
				isDuplicate: false,
				reason: "Session too small for deduplication",
				fingerprint,
			};
		}

		// Compute fingerprint
		const fingerprint = this.computeFingerprint(changes);

		// Check cache for existing fingerprint
		const existing = this.fingerprintCache.get(fingerprint);

		if (!existing) {
			// No duplicate found
			return {
				isDuplicate: false,
				fingerprint,
			};
		}

		// Check time delta
		const timeDelta = timestamp - existing.timestamp;

		if (timeDelta > this.timeDeltaMs) {
			// Too much time elapsed, not a duplicate
			return {
				isDuplicate: false,
				reason: `Time delta ${timeDelta}ms exceeds threshold ${this.timeDeltaMs}ms`,
				fingerprint,
			};
		}

		// Duplicate detected
		return {
			isDuplicate: true,
			reason: `Duplicate of session ${existing.sessionId} (time delta: ${timeDelta}ms)`,
			existingSessionId: existing.sessionId,
			fingerprint,
		};
	}

	/**
	 * Register a session fingerprint
	 */
	register(sessionId: string, changes: SessionChange[], timestamp: number): void {
		const fingerprint = this.computeFingerprint(changes);

		this.fingerprintCache.set(fingerprint, {
			fingerprint,
			timestamp,
			sessionId,
			changeCount: changes.length,
		});
	}

	/**
	 * Remove a session fingerprint
	 */
	unregister(sessionId: string): void {
		// Find and remove all entries for this sessionId
		for (const [fingerprint, data] of this.fingerprintCache.entries()) {
			if (data.sessionId === sessionId) {
				this.fingerprintCache.delete(fingerprint);
			}
		}
	}

	/**
	 * Clear all fingerprints
	 */
	clear(): void {
		this.fingerprintCache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number;
		maxSize: number;
	} {
		return {
			size: this.fingerprintCache.size,
			maxSize: this.fingerprintCache.maxSize,
		};
	}
}
