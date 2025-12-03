import { describe, expect, it } from "vitest";
import {
	CORE_TELEMETRY_EVENTS,
	getCoreEventValidationError,
	IssueCreatedSchema,
	IssueResolvedSchema,
	PolicyChangedSchema,
	SaveAttemptSchema,
	SessionFinalizedSchema,
	SessionRestoredSchema,
	SnapshotCreatedSchemaV1,
	validateCoreTelemetryEvent,
} from "../events.v1.js";

describe("Core Telemetry Events v1", () => {
	it("should validate save attempt events", () => {
		const event = {
			event: CORE_TELEMETRY_EVENTS.SAVE_ATTEMPT,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				protection: "block" as const,
				severity: "high" as const,
				file_kind: "js",
				reason: "user_save",
				ai_present: false,
				ai_burst: false,
				outcome: "saved" as const,
			},
		};

		expect(validateCoreTelemetryEvent(event)).toBe(true);
		expect(SaveAttemptSchema.parse(event)).toEqual(event);
	});

	it("should reject invalid save attempt events", () => {
		const invalidEvent = {
			event: CORE_TELEMETRY_EVENTS.SAVE_ATTEMPT,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				protection: "invalid" as any,
				severity: "high" as const,
				file_kind: "js",
				reason: "user_save",
				ai_present: false,
				ai_burst: false,
				outcome: "saved" as const,
			},
		};

		expect(validateCoreTelemetryEvent(invalidEvent)).toBe(false);
		expect(getCoreEventValidationError(invalidEvent)).not.toBeNull();
	});

	it("should validate snapshot created events", () => {
		const event = {
			event: CORE_TELEMETRY_EVENTS.SNAPSHOT_CREATED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				session_id: "session_123",
				snapshot_id: "snap_456",
				bytes_original: 1024,
				bytes_stored: 512,
				dedup_hit: true,
				latency_ms: 150,
			},
		};

		expect(validateCoreTelemetryEvent(event)).toBe(true);
		expect(SnapshotCreatedSchemaV1.parse(event)).toEqual(event);
	});

	it("should reject invalid snapshot created events", () => {
		const invalidEvent = {
			event: CORE_TELEMETRY_EVENTS.SNAPSHOT_CREATED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				session_id: "session_123",
				snapshot_id: "snap_456",
				bytes_original: "invalid" as any,
				bytes_stored: 512,
				dedup_hit: true,
				latency_ms: 150,
			},
		};

		expect(validateCoreTelemetryEvent(invalidEvent)).toBe(false);
		expect(getCoreEventValidationError(invalidEvent)).not.toBeNull();
	});

	it("should validate session finalized events", () => {
		const event = {
			event: CORE_TELEMETRY_EVENTS.SESSION_FINALIZED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				session_id: "session_123",
				files: ["file1.js", "file2.js"],
				triggers: ["save", "edit"],
				duration_ms: 30000,
				ai_present: true,
				ai_burst: false,
				highest_severity: "medium" as const,
			},
		};

		expect(validateCoreTelemetryEvent(event)).toBe(true);
		expect(SessionFinalizedSchema.parse(event)).toEqual(event);
	});

	it("should reject invalid session finalized events", () => {
		const invalidEvent = {
			event: CORE_TELEMETRY_EVENTS.SESSION_FINALIZED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				session_id: "session_123",
				files: ["file1.js", "file2.js"],
				triggers: ["save", "edit"],
				duration_ms: "invalid" as any,
				ai_present: true,
				ai_burst: false,
				highest_severity: "medium" as const,
			},
		};

		expect(validateCoreTelemetryEvent(invalidEvent)).toBe(false);
		expect(getCoreEventValidationError(invalidEvent)).not.toBeNull();
	});

	it("should validate issue created events", () => {
		const event = {
			event: CORE_TELEMETRY_EVENTS.ISSUE_CREATED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				issue_id: "issue_123",
				session_id: "session_123",
				file_kind: "js",
				type: "secret" as const,
				severity: "high" as const,
				recommendation: "Review secret usage",
			},
		};

		expect(validateCoreTelemetryEvent(event)).toBe(true);
		expect(IssueCreatedSchema.parse(event)).toEqual(event);
	});

	it("should reject invalid issue created events", () => {
		const invalidEvent = {
			event: CORE_TELEMETRY_EVENTS.ISSUE_CREATED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				issue_id: "issue_123",
				session_id: "session_123",
				file_kind: "js",
				type: "invalid" as any,
				severity: "high" as const,
				recommendation: "Review secret usage",
			},
		};

		expect(validateCoreTelemetryEvent(invalidEvent)).toBe(false);
		expect(getCoreEventValidationError(invalidEvent)).not.toBeNull();
	});

	it("should validate issue resolved events", () => {
		const event = {
			event: CORE_TELEMETRY_EVENTS.ISSUE_RESOLVED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				issue_id: "issue_123",
				resolution: "fixed" as const,
			},
		};

		expect(validateCoreTelemetryEvent(event)).toBe(true);
		expect(IssueResolvedSchema.parse(event)).toEqual(event);
	});

	it("should reject invalid issue resolved events", () => {
		const invalidEvent = {
			event: CORE_TELEMETRY_EVENTS.ISSUE_RESOLVED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				issue_id: "issue_123",
				resolution: "invalid" as any,
			},
		};

		expect(validateCoreTelemetryEvent(invalidEvent)).toBe(false);
		expect(getCoreEventValidationError(invalidEvent)).not.toBeNull();
	});

	it("should validate session restored events", () => {
		const event = {
			event: CORE_TELEMETRY_EVENTS.SESSION_RESTORED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				session_id: "session_123",
				files_restored: ["file1.js", "file2.js"],
				time_to_restore_ms: 2000,
				reason: "user_request",
			},
		};

		expect(validateCoreTelemetryEvent(event)).toBe(true);
		expect(SessionRestoredSchema.parse(event)).toEqual(event);
	});

	it("should reject invalid session restored events", () => {
		const invalidEvent = {
			event: CORE_TELEMETRY_EVENTS.SESSION_RESTORED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				session_id: "session_123",
				files_restored: ["file1.js", "file2.js"],
				time_to_restore_ms: "invalid" as any,
				reason: "user_request",
			},
		};

		expect(validateCoreTelemetryEvent(invalidEvent)).toBe(false);
		expect(getCoreEventValidationError(invalidEvent)).not.toBeNull();
	});

	it("should validate policy changed events", () => {
		const event = {
			event: CORE_TELEMETRY_EVENTS.POLICY_CHANGED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				pattern: "*.env",
				from: "watch",
				to: "block",
				source: "user",
			},
		};

		expect(validateCoreTelemetryEvent(event)).toBe(true);
		expect(PolicyChangedSchema.parse(event)).toEqual(event);
	});

	it("should validate policy changed events with all protection levels", () => {
		const protectionLevels = ["watch", "warn", "block", "unprotected"] as const;

		for (const fromLevel of protectionLevels) {
			for (const toLevel of protectionLevels) {
				const event = {
					event: CORE_TELEMETRY_EVENTS.POLICY_CHANGED,
					event_version: "1.0.0",
					timestamp: Date.now(),
					properties: {
						pattern: "*.env",
						from: fromLevel,
						to: toLevel,
						source: "user",
					},
				};

				expect(validateCoreTelemetryEvent(event)).toBe(true);
				expect(PolicyChangedSchema.parse(event)).toEqual(event);
			}
		}
	});

	it("should reject invalid policy changed events", () => {
		const invalidEvent = {
			event: CORE_TELEMETRY_EVENTS.POLICY_CHANGED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				pattern: "*.env",
				from: "watch",
				to: "invalid" as any,
				source: "user",
			},
		};

		expect(validateCoreTelemetryEvent(invalidEvent)).toBe(false);
		expect(getCoreEventValidationError(invalidEvent)).not.toBeNull();
	});

	it("should reject policy changed events with invalid from values", () => {
		const invalidEvent = {
			event: CORE_TELEMETRY_EVENTS.POLICY_CHANGED,
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				pattern: "*.env",
				from: "invalid" as any,
				to: "block",
				source: "user",
			},
		};

		expect(validateCoreTelemetryEvent(invalidEvent)).toBe(false);
		expect(getCoreEventValidationError(invalidEvent)).not.toBeNull();
	});

	it("should reject invalid events", () => {
		const invalidEvent = {
			event: "invalid_event",
			event_version: "1.0.0",
			timestamp: Date.now(),
			properties: {
				some_field: "some_value",
			},
		};

		expect(validateCoreTelemetryEvent(invalidEvent)).toBe(false);
		expect(getCoreEventValidationError(invalidEvent)).not.toBeNull();
	});

	it("should handle missing optional fields", () => {
		const event = {
			event: CORE_TELEMETRY_EVENTS.SAVE_ATTEMPT,
			timestamp: Date.now(),
			properties: {
				protection: "watch" as const,
				severity: "low" as const,
				file_kind: "ts",
				reason: "auto_save",
				ai_present: false,
				ai_burst: false,
				outcome: "saved" as const,
			},
		};

		// event_version should be added automatically
		expect(validateCoreTelemetryEvent(event)).toBe(true);
		const parsed = SaveAttemptSchema.parse(event);
		expect(parsed.event_version).toBe("1.0.0");
	});

	it("should validate all core event types", () => {
		const events = [
			{
				event: CORE_TELEMETRY_EVENTS.SAVE_ATTEMPT,
				properties: {
					protection: "watch" as const,
					severity: "low" as const,
					file_kind: "ts",
					reason: "auto_save",
					ai_present: false,
					ai_burst: false,
					outcome: "saved" as const,
				},
			},
			{
				event: CORE_TELEMETRY_EVENTS.SNAPSHOT_CREATED,
				properties: {
					session_id: "session_123",
					snapshot_id: "snap_456",
					bytes_original: 1024,
					bytes_stored: 512,
					dedup_hit: true,
					latency_ms: 150,
				},
			},
			{
				event: CORE_TELEMETRY_EVENTS.SESSION_FINALIZED,
				properties: {
					session_id: "session_123",
					files: ["file1.js", "file2.js"],
					triggers: ["save", "edit"],
					duration_ms: 30000,
					ai_present: true,
					ai_burst: false,
					highest_severity: "medium" as const,
				},
			},
			{
				event: CORE_TELEMETRY_EVENTS.ISSUE_CREATED,
				properties: {
					issue_id: "issue_123",
					session_id: "session_123",
					file_kind: "js",
					type: "secret" as const,
					severity: "high" as const,
					recommendation: "Review secret usage",
				},
			},
			{
				event: CORE_TELEMETRY_EVENTS.ISSUE_RESOLVED,
				properties: {
					issue_id: "issue_123",
					resolution: "fixed" as const,
				},
			},
			{
				event: CORE_TELEMETRY_EVENTS.SESSION_RESTORED,
				properties: {
					session_id: "session_123",
					files_restored: ["file1.js", "file2.js"],
					time_to_restore_ms: 2000,
					reason: "user_request",
				},
			},
			{
				event: CORE_TELEMETRY_EVENTS.POLICY_CHANGED,
				properties: {
					pattern: "*.env",
					from: "watch",
					to: "block",
					source: "user",
				},
			},
		];

		for (const event of events) {
			const fullEvent = {
				...event,
				timestamp: Date.now(),
			};

			expect(validateCoreTelemetryEvent(fullEvent)).toBe(true);
		}
	});

	it("should reject events with missing required fields", () => {
		const events = [
			// Missing properties
			{
				event: CORE_TELEMETRY_EVENTS.SAVE_ATTEMPT,
				timestamp: Date.now(),
			},
			// Missing event
			{
				timestamp: Date.now(),
				properties: {
					protection: "watch" as const,
					severity: "low" as const,
					file_kind: "ts",
					reason: "auto_save",
					ai_present: false,
					ai_burst: false,
					outcome: "saved" as const,
				},
			},
		];

		for (const event of events) {
			expect(validateCoreTelemetryEvent(event)).toBe(false);
		}
	});
});
