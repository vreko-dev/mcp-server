// Extend Zod with OpenAPI functionality
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { RiskSeveritySchema } from "../types/analysis.js";

extendZodWithOpenApi(z);

// Event version constant
export const EVENT_VERSION = "1.0.0";

// Base event schema with version
export const BaseEventSchema = z.object({
	event_version: z.string().default(EVENT_VERSION).openapi({ example: "1.0.0" }),
	timestamp: z
		.number()
		.default(() => Date.now())
		.openapi({ example: 1620000000000 }),
});

// 1. save_attempt event
export const SaveAttemptSchema = BaseEventSchema.extend({
	event: z.literal("save_attempt"),
	properties: z.object({
		protection: z.enum(["watch", "warn", "block"]).openapi({ description: "Protection level applied to the file" }),
		severity: z
			.enum(["low", "medium", "high", "critical"])
			.openapi({ description: "Severity of the risk detected" }),
		file_kind: z.string().openapi({ description: "Type of file being protected", example: "typescript" }),
		reason: z.string().openapi({
			description: "Reason for the save attempt",
			example: "User tried to save a file with a secret",
		}),
		ai_present: z.boolean().openapi({ description: "Whether AI was involved in the decision" }),
		ai_burst: z.boolean().openapi({ description: "Whether this was part of an AI burst operation" }),
		outcome: z.enum(["saved", "canceled", "blocked"]).openapi({ description: "Outcome of the save attempt" }),
	}),
}).openapi("SaveAttemptEvent");
export type SaveAttemptEvent = z.infer<typeof SaveAttemptSchema>;

// 2. snapshot_created event
export const SnapshotCreatedSchema = BaseEventSchema.extend({
	event: z.literal("snapshot_created"),
	properties: z.object({
		session_id: z.string().openapi({ description: "Unique identifier for the session", example: "sess_12345" }),
		snapshot_id: z.string().openapi({ description: "Unique identifier for the snapshot", example: "snap_67890" }),
		bytes_original: z.number().openapi({ description: "Original size of the file in bytes", example: 1024 }),
		bytes_stored: z.number().openapi({ description: "Size of the stored snapshot in bytes", example: 512 }),
		dedup_hit: z.boolean().openapi({ description: "Whether deduplication was applied" }),
		latency_ms: z
			.number()
			.openapi({ description: "Time taken to create the snapshot in milliseconds", example: 45 }),
	}),
}).openapi("SnapshotCreatedEvent");
export type SnapshotCreatedEvent = z.infer<typeof SnapshotCreatedSchema>;

// 3. session_finalized event
export const SessionFinalizedSchema = BaseEventSchema.extend({
	event: z.literal("session_finalized"),
	properties: z.object({
		session_id: z.string().openapi({ description: "Unique identifier for the session", example: "sess_12345" }),
		files: z
			.array(z.string())
			.openapi({ description: "List of files in the session", example: ["src/index.ts", "package.json"] }),
		triggers: z.array(z.string()).openapi({
			description: "List of triggers that activated during the session",
			example: ["save_attempt", "risk_detected"],
		}),
		duration_ms: z.number().openapi({ description: "Duration of the session in milliseconds", example: 120000 }),
		ai_present: z.boolean().openapi({ description: "Whether AI was involved in the session" }),
		ai_burst: z.boolean().openapi({ description: "Whether this was part of an AI burst operation" }),
		highest_severity: z
			.enum(["info", "low", "medium", "high", "critical"])
			.openapi({ description: "Highest severity of issues in the session" }),
		// AI detection v1 fields
		ai_assist_level: z
			.enum(["none", "light", "medium", "heavy", "unknown"])
			.optional()
			.openapi({ description: "AI assistance level inferred from change patterns", example: "medium" }),
		ai_confidence_score: z
			.number()
			.min(0)
			.max(10)
			.optional()
			.openapi({ description: "Confidence score for AI detection (0-10)", example: 7.5 }),
		ai_provider: z
			.enum(["cursor", "claude", "unknown", "none"])
			.optional()
			.openapi({ description: "Detected AI tool/provider", example: "cursor" }),
		ai_large_insert_count: z
			.number()
			.int()
			.min(0)
			.optional()
			.openapi({ description: "Count of large insertions detected", example: 5 }),
		ai_total_chars: z
			.number()
			.int()
			.min(0)
			.optional()
			.openapi({ description: "Total characters in large insertions", example: 2000 }),
		context: z
			.record(z.string(), z.any())
			.optional()
			.openapi({ description: "Additional context for the session" }),
	}),
}).openapi("SessionFinalizedEvent");
export type SessionFinalizedEvent = z.infer<typeof SessionFinalizedSchema>;

// 4. issue_created event
export const IssueCreatedSchema = BaseEventSchema.extend({
	event: z.literal("issue_created"),
	properties: z.object({
		issue_id: z.string().openapi({ description: "Unique identifier for the issue", example: "issue_12345" }),
		session_id: z.string().openapi({ description: "Unique identifier for the session", example: "sess_12345" }),
		file_kind: z
			.string()
			.openapi({ description: "Type of file where the issue was detected", example: "typescript" }),
		type: z.enum(["secret", "mock", "phantom"]).openapi({ description: "Type of issue detected" }),
		severity: RiskSeveritySchema.openapi({ description: "Severity of the issue" }),
		recommendation: z.string().openapi({
			description: "Recommendation for resolving the issue",
			example: "Remove the secret from the file",
		}),
		context: z.record(z.string(), z.any()).optional().openapi({ description: "Additional context for the issue" }),
	}),
}).openapi("IssueCreatedEvent");
export type IssueCreatedEvent = z.infer<typeof IssueCreatedSchema>;

// 5. issue_resolved event
export const IssueResolvedSchema = BaseEventSchema.extend({
	event: z.literal("issue_resolved"),
	properties: z.object({
		issue_id: z.string().openapi({ description: "Unique identifier for the issue", example: "issue_12345" }),
		resolution: z.enum(["fixed", "ignored", "allowlisted"]).openapi({ description: "How the issue was resolved" }),
	}),
}).openapi("IssueResolvedEvent");
export type IssueResolvedEvent = z.infer<typeof IssueResolvedSchema>;

// 6. session_restored event
export const SessionRestoredSchema = BaseEventSchema.extend({
	event: z.literal("session_restored"),
	properties: z.object({
		session_id: z.string().openapi({ description: "Unique identifier for the session", example: "sess_12345" }),
		files_restored: z
			.array(z.string())
			.openapi({ description: "List of files that were restored", example: ["src/index.ts", "package.json"] }),
		time_to_restore_ms: z
			.number()
			.openapi({ description: "Time taken to restore the session in milliseconds", example: 2500 }),
		reason: z
			.string()
			.openapi({ description: "Reason for the session restoration", example: "User requested rollback" }),
	}),
}).openapi("SessionRestoredEvent");
export type SessionRestoredEvent = z.infer<typeof SessionRestoredSchema>;

// 7. policy_changed event
export const PolicyChangedSchema = BaseEventSchema.extend({
	event: z.literal("policy_changed"),
	properties: z.object({
		pattern: z.string().openapi({ description: "File pattern that the policy applies to", example: "*.env" }),
		from: z
			.enum(["watch", "warn", "block", "unprotected", "unauthenticated", "unaware"])
			.openapi({ description: "Previous protection level" }),
		to: z
			.enum(["watch", "warn", "block", "unprotected", "authenticated", "aware"])
			.openapi({ description: "New protection level" }),
		source: z.string().openapi({ description: "Source of the policy change", example: "dashboard" }),
		context: z
			.record(z.string(), z.any())
			.optional()
			.openapi({ description: "Additional context for the policy change" }),
	}),
}).openapi("PolicyChangedEvent");
export type PolicyChangedEvent = z.infer<typeof PolicyChangedSchema>;

// ============================================================================
// DIAGNOSTIC TELEMETRY EVENTS (Auth Flow & Welcome Panel Instrumentation)
// ============================================================================

// 8. auth.provider.selected event - Track OAuth vs Device flow choice
export const AuthProviderSelectedSchema = BaseEventSchema.extend({
	event: z.literal("auth.provider.selected"),
	properties: z.object({
		provider: z.enum(["oauth", "device_flow"]).openapi({ description: "Authentication provider selected" }),
		trigger: z
			.enum(["user_selected", "fallback", "auto"])
			.openapi({ description: "How the provider was selected" }),
	}),
}).openapi("AuthProviderSelectedEvent");
export type AuthProviderSelectedEvent = z.infer<typeof AuthProviderSelectedSchema>;

// 9. auth.browser.opened event - Track browser launch success
export const AuthBrowserOpenedSchema = BaseEventSchema.extend({
	event: z.literal("auth.browser.opened"),
	properties: z.object({
		method: z
			.enum(["external_command", "clipboard", "error"])
			.openapi({ description: "Method used to open browser" }),
		success: z.boolean().openapi({ description: "Whether browser was successfully opened" }),
		error: z.string().optional().openapi({ description: "Error message if browser opening failed" }),
	}),
}).openapi("AuthBrowserOpenedEvent");
export type AuthBrowserOpenedEvent = z.infer<typeof AuthBrowserOpenedSchema>;

// 10. auth.code.entry event - Track device code entry in browser
export const AuthCodeEntrySchema = BaseEventSchema.extend({
	event: z.literal("auth.code.entry"),
	properties: z.object({
		code_format: z
			.enum(["valid", "invalid_chars", "wrong_length"])
			.openapi({ description: "Validity of the entered code format" }),
		time_to_enter_ms: z.number().openapi({ description: "Time taken to enter the code in milliseconds" }),
		attempts: z.number().int().min(1).openapi({ description: "Number of attempts to enter the code correctly" }),
		code_length: z.number().int().optional().openapi({ description: "Length of the entered code" }),
	}),
}).openapi("AuthCodeEntryEvent");
export type AuthCodeEntryEvent = z.infer<typeof AuthCodeEntrySchema>;

// 11. auth.approval.received event - Track successful device code approval
export const AuthApprovalReceivedSchema = BaseEventSchema.extend({
	event: z.literal("auth.approval.received"),
	properties: z.object({
		polling_attempts: z
			.number()
			.int()
			.min(1)
			.openapi({ description: "Number of polling attempts before approval" }),
		total_wait_ms: z.number().openapi({ description: "Total time waited for approval in milliseconds" }),
		device_code_expired: z.boolean().openapi({ description: "Whether the device code had expired" }),
	}),
}).openapi("AuthApprovalReceivedEvent");
export type AuthApprovalReceivedEvent = z.infer<typeof AuthApprovalReceivedSchema>;

// 12. welcome.feature.viewed event - Track feature discovery in welcome panel
export const WelcomeFeatureViewedSchema = BaseEventSchema.extend({
	event: z.literal("welcome.feature.viewed"),
	properties: z.object({
		feature: z.string().openapi({ description: "Feature name shown in welcome panel", example: "ai_detection" }),
		position: z.number().int().min(0).openapi({ description: "Position in feature carousel", example: 0 }),
		trigger: z
			.enum(["onboarding", "nudge", "manual"])
			.openapi({ description: "How the welcome panel was triggered" }),
	}),
}).openapi("WelcomeFeatureViewedEvent");
export type WelcomeFeatureViewedEvent = z.infer<typeof WelcomeFeatureViewedSchema>;

// 13. welcome.action.triggered event - Track feature adoption from welcome panel
export const WelcomeActionTriggeredSchema = BaseEventSchema.extend({
	event: z.literal("welcome.action.triggered"),
	properties: z.object({
		action: z.string().openapi({ description: "Action triggered by user", example: "try_now" }),
		feature: z.string().openapi({ description: "Feature associated with the action", example: "ai_detection" }),
		time_viewed_ms: z
			.number()
			.openapi({ description: "How long the feature was viewed before action", example: 2500 }),
	}),
}).openapi("WelcomeActionTriggeredEvent");
export type WelcomeActionTriggeredEvent = z.infer<typeof WelcomeActionTriggeredSchema>;

// Union type of all core events (including diagnostic events)
export type CoreTelemetryEvent =
	| SaveAttemptEvent
	| SnapshotCreatedEvent
	| SessionFinalizedEvent
	| IssueCreatedEvent
	| IssueResolvedEvent
	| SessionRestoredEvent
	| PolicyChangedEvent
	| AuthProviderSelectedEvent
	| AuthBrowserOpenedEvent
	| AuthCodeEntryEvent
	| AuthApprovalReceivedEvent
	| WelcomeFeatureViewedEvent
	| WelcomeActionTriggeredEvent;

// Zod schema for validating any core event (including diagnostic events)
export const CoreEventSchema = z.discriminatedUnion("event", [
	SaveAttemptSchema,
	SnapshotCreatedSchema,
	SessionFinalizedSchema,
	IssueCreatedSchema,
	IssueResolvedSchema,
	SessionRestoredSchema,
	PolicyChangedSchema,
	AuthProviderSelectedSchema,
	AuthBrowserOpenedSchema,
	AuthCodeEntrySchema,
	AuthApprovalReceivedSchema,
	WelcomeFeatureViewedSchema,
	WelcomeActionTriggeredSchema,
]);

// Event name enum for compile-time checking (including diagnostic events)
export const CORE_TELEMETRY_EVENTS = {
	// Core events (7)
	SAVE_ATTEMPT: "save_attempt",
	SNAPSHOT_CREATED: "snapshot_created",
	SESSION_FINALIZED: "session_finalized",
	ISSUE_CREATED: "issue_created",
	ISSUE_RESOLVED: "issue_resolved",
	SESSION_RESTORED: "session_restored",
	POLICY_CHANGED: "policy_changed",
	// Diagnostic events (6)
	AUTH_PROVIDER_SELECTED: "auth.provider.selected",
	AUTH_BROWSER_OPENED: "auth.browser.opened",
	AUTH_CODE_ENTRY: "auth.code.entry",
	AUTH_APPROVAL_RECEIVED: "auth.approval.received",
	WELCOME_FEATURE_VIEWED: "welcome.feature.viewed",
	WELCOME_ACTION_TRIGGERED: "welcome.action.triggered",
} as const;

export type CoreTelemetryEventName = (typeof CORE_TELEMETRY_EVENTS)[keyof typeof CORE_TELEMETRY_EVENTS];

// Helper function to validate core telemetry events
export function validateCoreTelemetryEvent(event: unknown): event is CoreTelemetryEvent {
	const result = CoreEventSchema.safeParse(event);
	return result.success;
}

// Helper function to get validation errors
export function getCoreEventValidationError(event: unknown): string | null {
	const result = CoreEventSchema.safeParse(event);
	if (result.success) {
		return null;
	}
	return result.error.message;
}
