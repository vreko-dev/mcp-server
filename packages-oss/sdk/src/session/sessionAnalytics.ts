/**
 * Privacy-safe analytics factory for session events
 *
 * PRIVACY GUARANTEES:
 * - NO workspace IDs (hashed or not)
 * - NO file paths or filenames
 * - NO token_counts (prevents client name leakage)
 * - K-anonymity: ext_counts only if ≥3 changes
 * - Solo tier opt-in: ext_counts requires explicit consent
 *
 * These factories are the ONLY safe way to emit session analytics.
 * DO NOT construct analytics events manually elsewhere.
 */

import type { SessionChange } from "@snapback-oss/contracts/session";

/**
 * Session analytics metadata for SESSION_STARTED
 */
export interface SessionStartedMeta {
	changeCount: 0;
	durationMs?: number;
	tier: "free" | "solo";
}

/**
 * Session analytics metadata for SESSION_FINALIZED
 */
export interface SessionFinalizedMeta {
	changeCount: number;
	durationMs: number;
	tier: "free" | "solo";
	ext_counts?: Record<string, number>;
}

/**
 * Create privacy-safe SESSION_STARTED event
 *
 * @param tier - User tier (free or solo)
 * @returns Safe analytics event metadata
 */
export function makeSafeSessionStartedEvent(tier: "free" | "solo"): SessionStartedMeta {
	return {
		changeCount: 0,
		tier,
	};
}

/**
 * Create privacy-safe SESSION_FINALIZED event
 *
 * @param changeCount - Number of file changes tracked
 * @param durationMs - Session duration in milliseconds
 * @param tier - User tier (free or solo)
 * @param consent - User has explicitly consented to analytics (Solo tier only)
 * @param changes - File changes (used only for extension histogram if consent granted)
 * @returns Safe analytics event metadata
 */
export function makeSafeSessionFinalizedEvent(
	changeCount: number,
	durationMs: number,
	tier: "free" | "solo",
	consent: boolean,
	changes?: SessionChange[],
): SessionFinalizedMeta {
	const base: SessionFinalizedMeta = {
		changeCount,
		durationMs,
		tier,
	};

	// Only emit ext_counts for Solo tier with consent and ≥3 changes (k-anonymity)
	if (tier === "solo" && consent && changeCount >= 3 && changes) {
		const extCounts = computeExtensionHistogram(changes);
		if (Object.keys(extCounts).length > 0) {
			base.ext_counts = extCounts;
		}
	}

	return base;
}

/**
 * Compute extension histogram from file changes
 * Only extracts file extensions, never paths or names
 *
 * @param changes - Session changes
 * @returns Extension histogram (e.g., {'.ts': 12, '.json': 3})
 */
function computeExtensionHistogram(changes: SessionChange[]): Record<string, number> {
	const counts: Record<string, number> = {};

	for (const change of changes) {
		// Extract extension from relative path
		const ext = getFileExtension(change.p);
		if (ext) {
			counts[ext] = (counts[ext] || 0) + 1;
		}
	}

	return counts;
}

/**
 * Extract file extension from path
 * Returns null for files without extensions or directories
 *
 * @param path - File path (relative)
 * @returns Extension with dot (e.g., '.ts') or null
 */
function getFileExtension(path: string): string | null {
	const lastDot = path.lastIndexOf(".");
	const lastSlash = path.lastIndexOf("/");

	// No extension or dot is part of directory name
	if (lastDot === -1 || lastDot < lastSlash) {
		return null;
	}

	const ext = path.slice(lastDot);

	// Filter out noise (e.g., '.bak-sessionId', '.tmp')
	if (ext.includes("-") || ext.length > 8) {
		return null;
	}

	return ext.toLowerCase();
}
