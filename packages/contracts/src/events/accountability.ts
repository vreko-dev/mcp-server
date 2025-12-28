/**
 * Accountability Effect Event Schema
 *
 * Tracks user perception vs reality of SnapBack's value in a session.
 * Used for session feedback implementation to measure accountability.
 *
 * Privacy guarantees (per ARCHITECTURE.md):
 * - ❌ No file paths
 * - ❌ No path hashes
 * - ❌ No workspace identifiers
 * - ✅ Counts only (files_modified, lines_added, etc.)
 * - ✅ Durations (session_duration_ms)
 * - ✅ Enums (perceived_help, tier)
 *
 * @module events/accountability
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { BaseEventSchema } from "./core";

extendZodWithOpenApi(z);

// ============================================================================
// Accountability Effect Event
// ============================================================================

/**
 * Schema for tracking user's perception of how much SnapBack helped
 */
export const PerceivedHelpSchema = z
	.enum(["significantly", "somewhat", "not_really", "blocked"])
	.openapi({ description: "User's perception of how much SnapBack helped" });

/**
 * Type for perceived help values
 */
export type PerceivedHelp = z.infer<typeof PerceivedHelpSchema>;

/**
 * Type guard for PerceivedHelp values
 */
export function isPerceivedHelp(value: unknown): value is PerceivedHelp {
	return PerceivedHelpSchema.safeParse(value).success;
}

/**
 * Schema for actual changes made during the session (counts only, no paths)
 */
const ActualChangesSchema = z
	.object({
		files_modified: z
			.number()
			.int()
			.min(0)
			.openapi({ description: "Number of files modified during session", example: 5 }),
		lines_added: z.number().int().min(0).openapi({ description: "Total lines added", example: 150 }),
		lines_removed: z.number().int().min(0).openapi({ description: "Total lines removed", example: 30 }),
		snapshots_used: z
			.number()
			.int()
			.min(0)
			.openapi({ description: "Number of snapshots created or restored", example: 2 }),
	})
	.openapi("ActualChanges");

/**
 * Schema for issues prevented by SnapBack during the session
 */
const PreventedIssuesSchema = z
	.object({
		rollbacks_avoided: z
			.number()
			.int()
			.min(0)
			.openapi({ description: "Rollbacks avoided due to snapshots", example: 1 }),
		pattern_violations_caught: z
			.number()
			.int()
			.min(0)
			.openapi({ description: "Pattern violations caught before commit", example: 3 }),
		skipped_tests_flagged: z
			.number()
			.int()
			.min(0)
			.openapi({ description: "Skipped tests flagged for attention", example: 2 }),
	})
	.openapi("PreventedIssues");

/**
 * Schema for user tier
 */
const TierSchema = z.enum(["free", "solo", "team", "enterprise"]).openapi({ description: "User's subscription tier" });

/**
 * Accountability Effect Event Schema
 *
 * Tracks the perception vs reality of SnapBack's value in a session.
 * Follows BaseEventSchema pattern from core.ts for consistency.
 */
export const AccountabilityEffectSchema = BaseEventSchema.extend({
	event: z.literal("session:feedback_submitted"),
	properties: z.object({
		// Session identification
		session_id: z.string().openapi({ description: "Unique session identifier", example: "sess_12345" }),
		session_duration_ms: z
			.number()
			.int()
			.min(0)
			.openapi({ description: "Session duration in milliseconds", example: 3600000 }),

		// User perception
		perceived_help: PerceivedHelpSchema,

		// Reality metrics (counts only, no PII)
		actual_changes: ActualChangesSchema,
		prevented_issues: PreventedIssuesSchema,

		// Tier for consent checking
		tier: TierSchema,
	}),
}).openapi("AccountabilityEffectEvent");

export type AccountabilityEffectEvent = z.infer<typeof AccountabilityEffectSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate an accountability effect event
 */
export function validateAccountabilityEvent(event: unknown): event is AccountabilityEffectEvent {
	const result = AccountabilityEffectSchema.safeParse(event);
	return result.success;
}

/**
 * Get validation error for an accountability event
 */
export function getAccountabilityEventValidationError(event: unknown): string | null {
	const result = AccountabilityEffectSchema.safeParse(event);
	if (result.success) {
		return null;
	}
	return result.error.message;
}

// ============================================================================
// Event Constants
// ============================================================================

/**
 * Accountability event name constants
 * Uses PostHog category:object_action naming convention
 */
export const ACCOUNTABILITY_EVENTS = {
	SESSION_FEEDBACK_SUBMITTED: "session:feedback_submitted",
} as const;

export type AccountabilityEventName = (typeof ACCOUNTABILITY_EVENTS)[keyof typeof ACCOUNTABILITY_EVENTS];
