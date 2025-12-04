/**
 * Diagnostic Event Mapper
 *
 * Maps diagnostic telemetry events (auth flow, welcome panel) to core events
 * for simplified analytics and reporting.
 *
 * Reference: feedback.md §2 Issue 3 - Event Mapper Gap
 * TDD Status: REFACTOR (maps diagnostic → core for analytics simplification)
 *
 * Core Events System:
 * - save_attempt: When user tries to save a file
 * - snapshot_created: When a snapshot is created
 * - session_finalized: When a session ends (onboarding, nudge, etc.)
 * - issue_created: When an issue/problem is detected
 * - issue_resolved: When an issue is resolved
 * - session_restored: When user restores from a snapshot
 * - policy_changed: When protection policy changes (auth as policy change from unauth→auth)
 *
 * Diagnostic Events:
 * - auth.provider.selected: Which auth method user chose
 * - auth.browser.opened: Browser launch success/failure
 * - auth.code.entry: User entered device code
 * - auth.approval.received: Server approved the auth request
 * - welcome.feature.viewed: User saw a feature in welcome panel
 * - welcome.action.triggered: User interacted with feature CTA
 */

import {
	type AuthApprovalReceivedEvent,
	type AuthBrowserOpenedEvent,
	type AuthCodeEntryEvent,
	type AuthProviderSelectedEvent,
	type CoreTelemetryEvent,
	type IssueCreatedEvent,
	type PolicyChangedEvent,
	type SessionFinalizedEvent,
	type WelcomeActionTriggeredEvent,
	type WelcomeFeatureViewedEvent,
	IssueCreatedSchema,
	PolicyChangedSchema,
	SessionFinalizedSchema,
	validateCoreTelemetryEvent,
} from "../events/core.js";

/**
 * Maps diagnostic telemetry events to core events
 *
 * Diagnostic events are detailed events that help understand user journeys
 * and drop-offs. Core events are simplified for analytics dashboards.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Static-only class pattern preferred for this mapper utility
export class DiagnosticEventMapper {
	/**
	 * Maps a diagnostic event to a core event
	 *
	 * @param event The diagnostic event to map
	 * @returns The mapped core event or null if no mapping exists
	 */
	static mapEvent(
		event:
			| AuthProviderSelectedEvent
			| AuthBrowserOpenedEvent
			| AuthCodeEntryEvent
			| AuthApprovalReceivedEvent
			| WelcomeFeatureViewedEvent
			| WelcomeActionTriggeredEvent,
	): CoreTelemetryEvent | null {
		switch (event.event) {
			case "auth.provider.selected":
				return DiagnosticEventMapper.mapAuthProviderSelected(
					event as AuthProviderSelectedEvent,
				);

			case "auth.browser.opened":
				return DiagnosticEventMapper.mapAuthBrowserOpened(
					event as AuthBrowserOpenedEvent,
				);

			case "auth.code.entry":
				return DiagnosticEventMapper.mapAuthCodeEntry(event as AuthCodeEntryEvent);

			case "auth.approval.received":
				return DiagnosticEventMapper.mapAuthApprovalReceived(
					event as AuthApprovalReceivedEvent,
				);

			case "welcome.feature.viewed":
				return DiagnosticEventMapper.mapWelcomeFeatureViewed(
					event as WelcomeFeatureViewedEvent,
				);

			case "welcome.action.triggered":
				return DiagnosticEventMapper.mapWelcomeActionTriggered(
					event as WelcomeActionTriggeredEvent,
				);

			default:
				return null;
		}
	}

	/**
	 * Maps auth.provider.selected → issue_created
	 *
	 * When provider is selected via "fallback" or "auto", it indicates
	 * a potential issue (user preferred method not available).
	 */
	private static mapAuthProviderSelected(
		event: AuthProviderSelectedEvent,
	): IssueCreatedEvent | null {
		// Only map non-user-selected triggers as potential issues
		if (event.properties.trigger === "user_selected") {
			return null; // Normal flow, not an issue
		}

		try {
			const mappedEvent: IssueCreatedEvent = {
				event: "issue_created",
				properties: {
					issue_type: "auth_fallback",
					severity: event.properties.trigger === "fallback" ? "medium" : "low",
					pattern: `auth_provider_${event.properties.provider}`,
					confidence: 0.8,
					affected_files: [],
					context: {
						provider: event.properties.provider,
						trigger: event.properties.trigger,
					},
				},
				timestamp: event.properties.timestamp || Date.now(),
			};

			// Validate the mapped event
			if (validateCoreTelemetryEvent(mappedEvent)) {
				return IssueCreatedSchema.parse(mappedEvent);
			}
			return null;
		} catch (error) {
			console.error("Failed to map auth.provider.selected event:", error);
			return null;
		}
	}

	/**
	 * Maps auth.browser.opened → issue_created (if failed)
	 *
	 * Browser failures are issues that block authentication.
	 */
	private static mapAuthBrowserOpened(
		event: AuthBrowserOpenedEvent,
	): IssueCreatedEvent | null {
		if (event.properties.success) {
			return null; // Success, not an issue
		}

		try {
			const mappedEvent: IssueCreatedEvent = {
				event: "issue_created",
				properties: {
					issue_type: "auth_browser_failed",
					severity: "high",
					pattern: `browser_open_${event.properties.method}`,
					confidence: 0.95,
					affected_files: [],
					context: {
						method: event.properties.method,
						error: event.properties.error || "Unknown error",
					},
				},
				timestamp: event.properties.timestamp || Date.now(),
			};

			if (validateCoreTelemetryEvent(mappedEvent)) {
				return IssueCreatedSchema.parse(mappedEvent);
			}
			return null;
		} catch (error) {
			console.error("Failed to map auth.browser.opened event:", error);
			return null;
		}
	}

	/**
	 * Maps auth.code.entry → issue_created (code validation)
	 *
	 * Device code entry validates the user interaction in the browser.
	 * Used to ensure the code was entered correctly.
	 */
	private static mapAuthCodeEntry(event: AuthCodeEntryEvent): IssueCreatedEvent | null {
		// Code length validation as a potential issue indicator
		const codeLength = event.properties.code_length || 0;

		// Standard device code length is typically 8-10 characters
		if (codeLength < 6 || codeLength > 20) {
			try {
				const mappedEvent: IssueCreatedEvent = {
					event: "issue_created",
					properties: {
						issue_type: "auth_code_invalid",
						severity: "medium",
						pattern: "device_code_validation",
						confidence: 0.7,
						affected_files: [],
						context: {
							code_length: codeLength,
						},
					},
					timestamp: event.properties.timestamp || Date.now(),
				};

				if (validateCoreTelemetryEvent(mappedEvent)) {
					return IssueCreatedSchema.parse(mappedEvent);
				}
			} catch (error) {
				console.error("Failed to map auth.code.entry event:", error);
			}
		}

		return null; // Valid code, not an issue
	}

	/**
	 * Maps auth.approval.received → policy_changed
	 *
	 * Approval received means authentication succeeded.
	 * This is a fundamental policy change: from unprotected (anonymous) to authenticated.
	 */
	private static mapAuthApprovalReceived(
		event: AuthApprovalReceivedEvent,
	): PolicyChangedEvent | null {
		try {
			const mappedEvent: PolicyChangedEvent = {
				event: "policy_changed",
				properties: {
					pattern: "*", // All files now fall under authenticated scope
					from: "unauthenticated",
					to: "authenticated",
					source: "auth_flow",
					approval_time_ms: event.properties.approval_time_ms || 0,
				},
				timestamp: event.properties.timestamp || Date.now(),
			};

			if (validateCoreTelemetryEvent(mappedEvent)) {
				return PolicyChangedSchema.parse(mappedEvent);
			}
			return null;
		} catch (error) {
			console.error("Failed to map auth.approval.received event:", error);
			return null;
		}
	}

	/**
	 * Maps welcome.feature.viewed → session_finalized (partial view)
	 *
	 * Feature viewed indicates progression through onboarding or nudge session.
	 * Multiple views = longer session, which we track here.
	 */
	private static mapWelcomeFeatureViewed(
		event: WelcomeFeatureViewedEvent,
	): SessionFinalizedEvent | null {
		try {
			const mappedEvent: SessionFinalizedEvent = {
				event: "session_finalized",
				properties: {
					session_id: `welcome_${event.properties.trigger}`,
					duration_ms: 0, // We don't have actual duration for single view
					outcome: "feature_viewed",
					highest_severity: "info",
					context: {
						feature: event.properties.feature,
						position: event.properties.position,
						trigger: event.properties.trigger,
					},
				},
				timestamp: event.properties.timestamp || Date.now(),
			};

			if (validateCoreTelemetryEvent(mappedEvent)) {
				return SessionFinalizedSchema.parse(mappedEvent);
			}
			return null;
		} catch (error) {
			console.error("Failed to map welcome.feature.viewed event:", error);
			return null;
		}
	}

	/**
	 * Maps welcome.action.triggered → policy_changed
	 *
	 * When user takes action on welcome (e.g., "try now" for protection),
	 * it's equivalent to a policy/behavior change.
	 */
	private static mapWelcomeActionTriggered(
		event: WelcomeActionTriggeredEvent,
	): PolicyChangedEvent | null {
		try {
			const mappedEvent: PolicyChangedEvent = {
				event: "policy_changed",
				properties: {
					pattern: "*", // Action applies to all files
					from: "unaware",
					to: "aware", // User is now aware of the feature
					source: "welcome_panel",
					context: {
						action: event.properties.action,
						feature: event.properties.feature,
						time_viewed_ms: event.properties.time_viewed_ms,
					},
				},
				timestamp: event.properties.timestamp || Date.now(),
			};

			if (validateCoreTelemetryEvent(mappedEvent)) {
				return PolicyChangedSchema.parse(mappedEvent);
			}
			return null;
		} catch (error) {
			console.error("Failed to map welcome.action.triggered event:", error);
			return null;
		}
	}
}

/**
 * Export a singleton instance for convenience
 */
export const diagnosticEventMapper = new DiagnosticEventMapper();
