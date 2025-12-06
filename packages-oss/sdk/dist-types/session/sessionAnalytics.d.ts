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
export declare function makeSafeSessionStartedEvent(tier: "free" | "solo"): SessionStartedMeta;
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
export declare function makeSafeSessionFinalizedEvent(
	changeCount: number,
	durationMs: number,
	tier: "free" | "solo",
	consent: boolean,
	changes?: SessionChange[],
): SessionFinalizedMeta;
//# sourceMappingURL=sessionAnalytics.d.ts.map
