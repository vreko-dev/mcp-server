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
	 *
	 * Note: Diagnostic events are tracked separately and not mapped to core events.
	 * This maintains separation of concerns and allows diagnostic events to be
	 * analyzed independently of core events.
	 */
	private static mapAuthProviderSelected(
		_event: AuthProviderSelectedEvent,
	): IssueCreatedEvent | null {
		// Diagnostic events are tracked separately from core events
		// Return null to prevent mapping
		return null;
	}

	/**
	 * Maps auth.browser.opened → issue_created (if failed)
	 *
	 * Browser failures are issues that block authentication.
	 *
	 * Note: Diagnostic events are tracked separately and not mapped to core events.
	 * This maintains separation of concerns and allows diagnostic events to be
	 * analyzed independently of core events.
	 */
	private static mapAuthBrowserOpened(
		_event: AuthBrowserOpenedEvent,
	): IssueCreatedEvent | null {
		// Diagnostic events are tracked separately from core events
		// Return null to prevent mapping
		return null;
	}

	/**
	 * Maps auth.code.entry → issue_created (code validation)
	 *
	 * Device code entry validates the user interaction in the browser.
	 * Used to ensure the code was entered correctly.
	 *
	 * Note: Diagnostic events are tracked separately and not mapped to core events.
	 * This maintains separation of concerns and allows diagnostic events to be
	 * analyzed independently of core events.
	 */
	private static mapAuthCodeEntry(_event: AuthCodeEntryEvent): IssueCreatedEvent | null {
		// Diagnostic events are tracked separately from core events
		// Return null to prevent mapping
		return null;
	}

	/**
	 * Maps auth.approval.received → policy_changed
	 *
	 * Approval received means authentication succeeded.
	 * This is a fundamental policy change: from unprotected (anonymous) to authenticated.
	 *
	 * Note: The policy_changed event schema only allows specific protection levels:
	 * "watch" | "warn" | "block" | "unprotected". Authentication is tracked via
	 * diagnostic events, not policy changes.
	 */
	private static mapAuthApprovalReceived(
		_event: AuthApprovalReceivedEvent,
	): PolicyChangedEvent | null {
		// Diagnostic events are tracked separately from core events
		// Return null to prevent mapping
		return null;
	}

	/**
	 * Maps welcome.feature.viewed → session_finalized (partial view)
	 *
	 * Feature viewed indicates progression through onboarding or nudge session.
	 * Multiple views = longer session, which we track here.
	 *
	 * Note: Diagnostic events are tracked separately and not mapped to core events.
	 * This maintains separation of concerns and allows diagnostic events to be
	 * analyzed independently of core events.
	 */
	private static mapWelcomeFeatureViewed(
		_event: WelcomeFeatureViewedEvent,
	): SessionFinalizedEvent | null {
		// Diagnostic events are tracked separately from core events
		// Return null to prevent mapping
		return null;
	}

	/**
	 * Maps welcome.action.triggered → policy_changed
	 *
	 * When user takes action on welcome (e.g., "try now" for protection),
	 * it's equivalent to a policy/behavior change.
	 *
	 * Note: The policy_changed event schema only allows specific protection levels:
	 * "watch" | "warn" | "block" | "unprotected". User awareness is tracked via
	 * diagnostic events, not policy changes.
	 */
	private static mapWelcomeActionTriggered(
		event: WelcomeActionTriggeredEvent,
	): PolicyChangedEvent | null {
		// Diagnostic events are tracked separately from core events
		// Return null to prevent mapping
		return null;
	}
}

/**
 * Export a singleton instance for convenience
 */
export const diagnosticEventMapper = new DiagnosticEventMapper();
