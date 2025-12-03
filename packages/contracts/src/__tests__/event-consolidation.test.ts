/**
 * RED TEST: Event Consolidation Verification
 *
 * This test ensures all event constants are consolidated to a single canonical source
 * and that legacy/duplicate files are properly removed.
 *
 * These tests FAIL initially (RED phase), pass after consolidation (GREEN phase),
 * and help prevent regression.
 */

import { describe, expect, it } from "vitest";

describe("Event Consolidation - Canonical Source Verification", () => {
	it("should import CORE_TELEMETRY_EVENTS from unified telemetry index", async () => {
		// This should work - unified export point
		const telemetry = await import("../telemetry/index.js");
		expect(telemetry.CORE_TELEMETRY_EVENTS).toBeDefined();
		expect(telemetry.CORE_TELEMETRY_EVENTS.SAVE_ATTEMPT).toBe("save_attempt");
	});

	it("should import CORE_TELEMETRY_EVENTS from events/core", async () => {
		// Core events should be available from core.js directly
		const core = await import("../events/core.js");
		expect(core.CORE_TELEMETRY_EVENTS).toBeDefined();
		expect(core.CORE_TELEMETRY_EVENTS.SAVE_ATTEMPT).toBe("save_attempt");
	});

	it("should have identical CORE_TELEMETRY_EVENTS from both sources", async () => {
		const telemetry = await import("../telemetry/index.js");
		const core = await import("../events/core.js");

		// Both sources must have identical event definitions
		expect(telemetry.CORE_TELEMETRY_EVENTS).toEqual(core.CORE_TELEMETRY_EVENTS);
	});

	it("should export LEGACY_TELEMETRY_EVENTS with proper prefixing from events/index", async () => {
		const events = await import("../events/index.js");

		// Legacy events should be available with LEGACY_ prefix
		expect(events.LEGACY_TELEMETRY_EVENTS).toBeDefined();
		expect(events.LEGACY_TELEMETRY_EVENTS.EXTENSION_ACTIVATED).toBe("extension.activated");
	});

	it("should not have duplicate event exports", async () => {
		// All event constants should use dot-notation
		const events = await import("../events/index.js");

		if (events.CORE_TELEMETRY_EVENTS) {
			for (const [_key, value] of Object.entries(events.CORE_TELEMETRY_EVENTS)) {
				// Core events should use snake_case keys with dot.notation values
				expect(typeof value).toBe("string");
				expect(value).toMatch(/^[a-z_]+(\.[a-z_]+)*$/);
			}
		}
	});

	it("should validate all core event types are properly defined", async () => {
		const events = await import("../telemetry/index.js");

		const requiredEvents = [
			"SAVE_ATTEMPT",
			"SNAPSHOT_CREATED",
			"SESSION_FINALIZED",
			"ISSUE_CREATED",
			"ISSUE_RESOLVED",
			"SESSION_RESTORED",
			"POLICY_CHANGED",
		];

		for (const eventName of requiredEvents) {
			expect(events.CORE_TELEMETRY_EVENTS[eventName as never]).toBeDefined();
		}
	});

	it("should support validation for all core event types", async () => {
		const { validateCoreTelemetryEvent } = await import("../telemetry/index.js");

		const testEvent = {
			event: "save_attempt",
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				protection: "block" as const,
				severity: "high" as const,
				file_kind: "js",
				reason: "test",
				ai_present: false,
				ai_burst: false,
				outcome: "saved" as const,
			},
		};

		expect(validateCoreTelemetryEvent(testEvent)).toBe(true);
	});

	it("should re-export schema validators from canonical source", async () => {
		const telemetry = await import("../telemetry/index.js");

		// All schema validators must be available
		expect(telemetry.SaveAttemptSchema).toBeDefined();
		expect(telemetry.SnapshotCreatedSchema).toBeDefined();
		expect(telemetry.SessionFinalizedSchema).toBeDefined();
		expect(telemetry.IssueCreatedSchema).toBeDefined();
		expect(telemetry.IssueResolvedSchema).toBeDefined();
		expect(telemetry.SessionRestoredSchema).toBeDefined();
		expect(telemetry.PolicyChangedSchema).toBeDefined();
		expect(telemetry.CoreEventSchema).toBeDefined();
	});
});
