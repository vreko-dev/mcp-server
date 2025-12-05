/**
 * Analytics events constants
 */

export const AnalyticsEvents = {
	// Snapshot events
	SNAPSHOT_CREATED: "snapshot_created",
	SNAPSHOT_RESTORED: "snapshot_restored",
	SNAPSHOT_DELETED: "snapshot_deleted",
	SNAPSHOT_VIEWED: "snapshot_viewed",

	// Session events
	SESSION_STARTED: "session_started",
	SESSION_ENDED: "session_ended",
	SESSION_EXPIRED: "session_expired",

	// AI interaction events
	AI_EDIT_DETECTED: "ai_edit_detected",
	AI_EDIT_ACCEPTED: "ai_edit_accepted",
	AI_EDIT_REJECTED: "ai_edit_rejected",

	// Warning events
	WARNING_SHOWN: "warning_shown",
	WARNING_DISMISSED: "warning_dismissed",
	WARNING_ACTION_RESTORE: "warning_action_restore",
	WARNING_ACTION_CONTINUE: "warning_action_continue",

	// Dashboard events
	DASHBOARD_VIEWED: "dashboard_viewed",
	DASHBOARD_HELP_ACCESSED: "dashboard_help_accessed",
	STATS_VIEWED: "stats_viewed",
	REPORT_GENERATED: "report_generated",

	// Onboarding events
	ONBOARDING_STARTED: "onboarding_started",
	ONBOARDING_COMPLETED: "onboarding_completed",
	ONBOARDING_SKIPPED: "onboarding_skipped",

	// Subscription events
	SUBSCRIPTION_STARTED: "subscription_started",
	SUBSCRIPTION_UPGRADED: "subscription_upgraded",
	SUBSCRIPTION_CANCELLED: "subscription_cancelled",

	// Feature flag events
	FEATURE_EXPOSED: "feature_exposed",

	// Suggestion events
	SUGGESTION_SHOWN: "suggestion_shown",
	SUGGESTION_ACCEPTED: "suggestion_accepted",
	SUGGESTION_REJECTED: "suggestion_rejected",

	// After accept events
	EDIT_AFTER_ACCEPT: "edit_after_accept",
	SUBMIT_AFTER_ACCEPT: "submit_after_accept",

	// Policy events
	POLICY_VIOLATION: "policy_violation",
	POLICY_EVALUATION: "policy_evaluation",

	// RPC events
	RPC_CALL: "rpc_call",
	RPC_RESPONSE: "rpc_response",

	// Activation Funnel Events
	EXTENSION_INSTALLED: "extension_installed",
	EXTENSION_AUTHENTICATED: "extension_authenticated",
	FIRST_PROTECTED_SAVE: "first_protected_save",
	FIRST_AI_DETECTION: "ai_detected", // Distinct from generic AI_EDIT_DETECTED
	FIRST_RESTORE: "snapshot_restored", // Alias/reuse if possible, but distinct flow event

	// Value Recognition Events
	DISASTER_AVERTED: "value:disaster_averted",
} as const;

export type AnalyticsEvent = keyof typeof AnalyticsEvents;

// Event properties types
export type EventProperties = {
	[AnalyticsEvents.SNAPSHOT_CREATED]: {
		source: "auto" | "manual";
		file_count: number;
		total_size_bytes: number;
	};
	[AnalyticsEvents.WARNING_SHOWN]: {
		warning_type: string;
		severity: "warning" | "critical";
		iteration_count: number;
	};
	[AnalyticsEvents.DASHBOARD_VIEWED]: {
		page: string;
		referrer?: string | null;
	};
	[AnalyticsEvents.DASHBOARD_HELP_ACCESSED]: {
		help_topic: string;
	};
	// Add properties for new events as needed
	[AnalyticsEvents.SUGGESTION_SHOWN]: {
		suggestion_type: string;
		suggestion_id: string;
	};
	[AnalyticsEvents.SUGGESTION_ACCEPTED]: {
		suggestion_type: string;
		suggestion_id: string;
		accept_duration_ms: number;
	};
	[AnalyticsEvents.SUGGESTION_REJECTED]: {
		suggestion_type: string;
		suggestion_id: string;
		reject_reason?: string;
	};
	[AnalyticsEvents.POLICY_VIOLATION]: {
		policy_name: string;
		violation_details: string;
	};
	[AnalyticsEvents.DISASTER_AVERTED]: {
		files_restored: number;
		lines_recovered?: number;
		severity?: "low" | "medium" | "high";
		ai_tool?: string;
		recovery_type: "full_snapshot" | "single_file";
	};
};

// Default empty properties for events that don't require specific properties
export type EmptyEventProperties = Record<string, never>;
