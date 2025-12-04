/**
 * Diagnostic Events - User Funnel & System Health Tracking
 *
 * These events track critical user journeys and system health metrics.
 * Used for analytics, debugging drop-offs, and monitoring system reliability.
 *
 * Naming convention: category.action.detail (lowercase, dots)
 */

// ======================
// Auth Flow Diagnostics
// ======================

export interface AuthProviderSelectedEvent {
	event: "auth.provider.selected";
	event_version?: string;
	timestamp: number;
	properties: {
		provider: "device_flow" | "oauth" | "better_auth";
		trigger: "onboarding" | "upgrade" | "manual";
	};
}

export interface AuthBrowserOpenedEvent {
	event: "auth.browser.opened";
	event_version?: string;
	timestamp: number;
	properties: {
		method: "default_browser" | "custom_url" | "manual";
		success: boolean;
		error_message?: string;
	};
}

export interface AuthApprovalReceivedEvent {
	event: "auth.approval.received";
	event_version?: string;
	timestamp: number;
	properties: {
		provider: "device_flow" | "oauth";
		approval_time_ms: number; // Time from request to approval
		polling_attempts: number; // How many polls before approval
	};
}

export interface AuthCodeEntryEvent {
	event: "auth.code.entry";
	event_version?: string;
	timestamp: number;
	properties: {
		entry_method: "browser" | "manual";
		valid_format: boolean;
		attempts: number;
	};
}

// ======================
// Welcome Panel Diagnostics
// ======================

export interface WelcomeFeatureViewedEvent {
	event: "welcome.feature.viewed";
	event_version?: string;
	timestamp: number;
	properties: {
		feature: string; // e.g., "ai_detection", "protection_levels"
		position: number; // 0-indexed carousel position
		trigger: "onboarding" | "nudge" | "manual";
	};
}

export interface WelcomeActionTriggeredEvent {
	event: "welcome.action.triggered";
	event_version?: string;
	timestamp: number;
	properties: {
		action: string; // e.g., "try_now", "learn_more", "skip"
		feature: string;
		time_viewed_ms: number; // How long feature was viewed
	};
}

// ======================
// Union Type & Constants
// ======================

export type DiagnosticTelemetryEvent =
	| AuthProviderSelectedEvent
	| AuthBrowserOpenedEvent
	| AuthApprovalReceivedEvent
	| AuthCodeEntryEvent
	| WelcomeFeatureViewedEvent
	| WelcomeActionTriggeredEvent;

export const DIAGNOSTIC_TELEMETRY_EVENTS = {
	AUTH_PROVIDER_SELECTED: "auth.provider.selected",
	AUTH_BROWSER_OPENED: "auth.browser.opened",
	AUTH_APPROVAL_RECEIVED: "auth.approval.received",
	AUTH_CODE_ENTRY: "auth.code.entry",
	WELCOME_FEATURE_VIEWED: "welcome.feature.viewed",
	WELCOME_ACTION_TRIGGERED: "welcome.action.triggered",
} as const;

export type DiagnosticEventName = (typeof DIAGNOSTIC_TELEMETRY_EVENTS)[keyof typeof DIAGNOSTIC_TELEMETRY_EVENTS];

/**
 * Validate diagnostic telemetry event
 */
export function validateDiagnosticTelemetryEvent(event: unknown): event is DiagnosticTelemetryEvent {
	if (!event || typeof event !== "object") {
		return false;
	}

	const e = event as Record<string, unknown>;

	switch (e.event) {
		case DIAGNOSTIC_TELEMETRY_EVENTS.AUTH_PROVIDER_SELECTED:
			return (
				typeof e.timestamp === "number" &&
				typeof e.properties === "object" &&
				(e.properties as Record<string, unknown>).provider !== undefined
			);
		case DIAGNOSTIC_TELEMETRY_EVENTS.AUTH_BROWSER_OPENED:
			return (
				typeof e.timestamp === "number" &&
				typeof e.properties === "object" &&
				typeof (e.properties as Record<string, unknown>).success === "boolean"
			);
		case DIAGNOSTIC_TELEMETRY_EVENTS.AUTH_APPROVAL_RECEIVED:
			return (
				typeof e.timestamp === "number" &&
				typeof e.properties === "object" &&
				typeof (e.properties as Record<string, unknown>).approval_time_ms === "number"
			);
		case DIAGNOSTIC_TELEMETRY_EVENTS.AUTH_CODE_ENTRY:
			return (
				typeof e.timestamp === "number" &&
				typeof e.properties === "object" &&
				typeof (e.properties as Record<string, unknown>).valid_format === "boolean"
			);
		case DIAGNOSTIC_TELEMETRY_EVENTS.WELCOME_FEATURE_VIEWED:
			return (
				typeof e.timestamp === "number" &&
				typeof e.properties === "object" &&
				typeof (e.properties as Record<string, unknown>).feature === "string"
			);
		case DIAGNOSTIC_TELEMETRY_EVENTS.WELCOME_ACTION_TRIGGERED:
			return (
				typeof e.timestamp === "number" &&
				typeof e.properties === "object" &&
				typeof (e.properties as Record<string, unknown>).action === "string"
			);
		default:
			return false;
	}
}
