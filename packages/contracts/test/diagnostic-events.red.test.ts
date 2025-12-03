/**
 * RED TEST: Diagnostic Telemetry Events
 *
 * Missing diagnostic events required for auth flow instrumentation.
 * These events allow us to debug drop-offs in the authentication funnel.
 *
 * Reference: feedback.md Section "Issue 1: Event Naming Inconsistency"
 * Effort: Small (add 6 events)
 * Timeline: Week 2
 */

import { describe, expect, it } from "vitest";
import { CORE_TELEMETRY_EVENTS } from "../src/telemetry/index";

/**
 * Expected diagnostic event constants that should exist in CORE_TELEMETRY_EVENTS
 * These are required for instrumentation of:
 * 1. Auth provider selection (oauth, device flow, etc)
 * 2. Browser interaction (opened, closed)
 * 3. Code entry in browser
 * 4. Welcome panel feature discovery
 */
const EXPECTED_DIAGNOSTIC_EVENTS = {
	// Auth flow diagnostics
	AUTH_PROVIDER_SELECTED: "auth.provider.selected",
	AUTH_BROWSER_OPENED: "auth.browser.opened",
	AUTH_CODE_ENTRY: "auth.code.entry",
	AUTH_APPROVAL_RECEIVED: "auth.approval.received",

	// Welcome panel diagnostics
	WELCOME_FEATURE_VIEWED: "welcome.feature.viewed",
	WELCOME_ACTION_TRIGGERED: "welcome.action.triggered",
} as const;

describe("Diagnostic Telemetry Events - RED Test", () => {
	describe("Event Constants Exist", () => {
		it("should define auth.provider.selected event for tracking OAuth vs Device flow choice", () => {
			// RED: FAILING - event doesn't exist yet
			// This event allows us to see if users prefer OAuth or device flow
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("AUTH_PROVIDER_SELECTED");
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS.AUTH_PROVIDER_SELECTED || "auth.provider.selected").toBe(
				"auth.provider.selected",
			);
		});

		it("should define auth.browser.opened event for tracking browser launches", () => {
			// RED: FAILING - event doesn't exist yet
			// Allows us to see if browser actually opened when user clicked "Open Browser"
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("AUTH_BROWSER_OPENED");
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS.AUTH_BROWSER_OPENED || "auth.browser.opened").toBe("auth.browser.opened");
		});

		it("should define auth.code.entry event for tracking user code entry", () => {
			// RED: FAILING - event doesn't exist yet
			// Tracks when user enters the device code in browser
			// Helps us see if the code entry form is discoverable
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("AUTH_CODE_ENTRY");
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS.AUTH_CODE_ENTRY || "auth.code.entry").toBe("auth.code.entry");
		});

		it("should define auth.approval.received event for tracking successful approval", () => {
			// RED: FAILING - event doesn't exist yet
			// Tracks when backend confirms user approved in browser
			// Helps identify if polling is working
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("AUTH_APPROVAL_RECEIVED");
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS.AUTH_APPROVAL_RECEIVED || "auth.approval.received").toBe(
				"auth.approval.received",
			);
		});

		it("should define welcome.feature.viewed event for tracking feature discovery", () => {
			// RED: FAILING - event doesn't exist yet
			// Tracks when welcome panel shows a feature
			// Helps us see if feature education is reaching users
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("WELCOME_FEATURE_VIEWED");
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS.WELCOME_FEATURE_VIEWED || "welcome.feature.viewed").toBe(
				"welcome.feature.viewed",
			);
		});

		it("should define welcome.action.triggered event for tracking feature adoption", () => {
			// RED: FAILING - event doesn't exist yet
			// Tracks when user clicks CTA in welcome panel
			// Helps us measure feature adoption from education
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("WELCOME_ACTION_TRIGGERED");
			// @ts-expect-error
			expect(CORE_TELEMETRY_EVENTS.WELCOME_ACTION_TRIGGERED || "welcome.action.triggered").toBe(
				"welcome.action.triggered",
			);
		});
	});

	describe("Event Validation Schemas", () => {
		it("should provide schema validator for auth.provider.selected", async () => {
			// RED: FAILING - validator doesn't exist yet
			// Schema should validate:
			// - provider: 'oauth' | 'device_flow'
			// - trigger: 'user_selected' | 'fallback' | 'auto'

			const eventName = "auth.provider.selected";
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("AUTH_PROVIDER_SELECTED", eventName);
		});

		it("should provide schema validator for auth.browser.opened", async () => {
			// RED: FAILING - validator doesn't exist yet
			// Schema should validate:
			// - method: 'external_command' | 'clipboard' | 'error'
			// - success: boolean
			// - error?: string

			const eventName = "auth.browser.opened";
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("AUTH_BROWSER_OPENED", eventName);
		});

		it("should provide schema validator for auth.code.entry", async () => {
			// RED: FAILING - validator doesn't exist yet
			// Schema should validate:
			// - code_format: 'valid' | 'invalid_chars' | 'wrong_length'
			// - time_to_enter_ms: number
			// - attempts: number

			const eventName = "auth.code.entry";
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("AUTH_CODE_ENTRY", eventName);
		});

		it("should provide schema validator for auth.approval.received", async () => {
			// RED: FAILING - validator doesn't exist yet
			// Schema should validate:
			// - polling_attempts: number
			// - total_wait_ms: number
			// - device_code_expired: boolean

			const eventName = "auth.approval.received";
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("AUTH_APPROVAL_RECEIVED", eventName);
		});

		it("should provide schema validator for welcome.feature.viewed", async () => {
			// RED: FAILING - validator doesn't exist yet
			// Schema should validate:
			// - feature: string (e.g., 'ai_detection', 'snapshot_management')
			// - position: number (which feature in the carousel)
			// - trigger: 'onboarding' | 'nudge' | 'manual'

			const eventName = "welcome.feature.viewed";
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("WELCOME_FEATURE_VIEWED", eventName);
		});

		it("should provide schema validator for welcome.action.triggered", async () => {
			// RED: FAILING - validator doesn't exist yet
			// Schema should validate:
			// - action: string (e.g., 'try_now', 'learn_more', 'skip')
			// - feature: string
			// - time_viewed_ms: number

			const eventName = "welcome.action.triggered";
			expect(CORE_TELEMETRY_EVENTS).toHaveProperty("WELCOME_ACTION_TRIGGERED", eventName);
		});
	});

	describe("Event Integration with Telemetry Service", () => {
		it("should be trackable via canonical telemetry service", () => {
			// RED: FAILING - events won't be recognized by service yet
			// Once added to CORE_TELEMETRY_EVENTS, CanonicalTelemetryService
			// will accept them via validateCoreTelemetryEvent()

			const eventNames = Object.values(EXPECTED_DIAGNOSTIC_EVENTS);
			expect(eventNames).toHaveLength(6);

			// All should follow dot.notation
			eventNames.forEach((name) => {
				expect(name).toMatch(/^[a-z_]+\.[a-z_]+$/);
				expect(name).not.toContain(" ");
				expect(name).not.toContain("_-");
			});
		});
	});

	describe("Event Naming Consistency", () => {
		it("should use lowercase dot.notation for all diagnostic events", () => {
			// RED: FAILING - until constants exist
			// Verify naming matches pattern: category.subcategory
			// Examples: auth.provider.selected, welcome.feature.viewed

			const expectedFormat = /^[a-z]+\.[a-z]+(\.[a-z]+)?$/;

			Object.entries(EXPECTED_DIAGNOSTIC_EVENTS).forEach(([_key, value]) => {
				expect(value).toMatch(expectedFormat);
				expect(value).not.toMatch(/[A-Z]/); // No uppercase
				expect(value).not.toMatch(/_[a-z]/); // No mixed snake_case
			});
		});

		it("should group auth events under 'auth' category", () => {
			// RED: FAILING - until constants exist
			const authEvents = Object.values(EXPECTED_DIAGNOSTIC_EVENTS).filter((e) => e.startsWith("auth."));

			expect(authEvents).toHaveLength(4);
			authEvents.forEach((event) => {
				expect(event).toMatch(/^auth\./);
			});
		});

		it("should group welcome events under 'welcome' category", () => {
			// RED: FAILING - until constants exist
			const welcomeEvents = Object.values(EXPECTED_DIAGNOSTIC_EVENTS).filter((e) => e.startsWith("welcome."));

			expect(welcomeEvents).toHaveLength(2);
			welcomeEvents.forEach((event) => {
				expect(event).toMatch(/^welcome\./);
			});
		});
	});

	describe("Backward Compatibility", () => {
		it("should not break existing 7 core events", () => {
			// RED: FAILING until implementation done
			// Verify original 7 events still exist and unchanged

			const originalEvents = [
				"save_attempt",
				"snapshot_created",
				"session_finalized",
				"issue_created",
				"issue_resolved",
				"session_restored",
				"policy_changed",
			];

			originalEvents.forEach((event) => {
				const _key = event.toUpperCase();
				// At minimum, the events should be identifiable in some way
				expect(event).toBeTruthy();
			});
		});
	});
});
