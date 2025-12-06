import { expect, test } from "vitest";
import { mapLegacyEventsToCore, TelemetryEventMapper } from "../event-mapper";
import { TELEMETRY_EVENTS } from "../events";
import { validateCoreTelemetryEvent } from "../events.v1";

test("should map onboarding protection assigned event to save attempt", () => {
	const legacyEvent = {
		event: TELEMETRY_EVENTS.ONBOARDING_PROTECTION_ASSIGNED,
		properties: {
			level: "high",
			trigger: "file_open",
			fileType: "js",
			isFirstProtection: true,
		},
		timestamp: Date.now(),
	};

	const mappedEvent = TelemetryEventMapper.mapEvent(legacyEvent);

	expect(mappedEvent).not.toBeNull();
	expect(mappedEvent?.event).toBe("save_attempt");
	expect(validateCoreTelemetryEvent(mappedEvent)).toBe(true);

	if (mappedEvent && mappedEvent.event === "save_attempt") {
		expect(mappedEvent.properties.protection).toBe("block");
		expect(mappedEvent.properties.severity).toBe("high");
		expect(mappedEvent.properties.file_kind).toBe("js");
		expect(mappedEvent.properties.reason).toBe("onboarding_file_open");
		expect(mappedEvent.properties.ai_present).toBe(false);
		expect(mappedEvent.properties.ai_burst).toBe(false);
		expect(mappedEvent.properties.outcome).toBe("saved");
	}
});

test("should map snapshot created event to snapshot created core event", () => {
	const legacyEvent = {
		event: TELEMETRY_EVENTS.SNAPSHOT_CREATED,
		properties: {
			method: "manual",
			filesCount: 5,
		},
		timestamp: Date.now(),
	};

	const mappedEvent = TelemetryEventMapper.mapEvent(legacyEvent);

	expect(mappedEvent).not.toBeNull();
	expect(mappedEvent?.event).toBe("snapshot_created");
	expect(validateCoreTelemetryEvent(mappedEvent)).toBe(true);

	if (mappedEvent && mappedEvent.event === "snapshot_created") {
		expect(mappedEvent.properties.session_id).toBe("legacy_session");
		expect(mappedEvent.properties.bytes_original).toBe(5120); // 5 * 1024
		expect(mappedEvent.properties.bytes_stored).toBe(2560); // 5 * 512
		expect(mappedEvent.properties.dedup_hit).toBe(false);
		expect(mappedEvent.properties.latency_ms).toBe(0);
	}
});

test("should map snapback used event to session restored core event", () => {
	const legacyEvent = {
		event: TELEMETRY_EVENTS.SNAPBACK_USED,
		properties: {
			filesRestored: 3,
			duration: 1500,
			success: true,
		},
		timestamp: Date.now(),
	};

	const mappedEvent = TelemetryEventMapper.mapEvent(legacyEvent);

	expect(mappedEvent).not.toBeNull();
	expect(mappedEvent?.event).toBe("session_restored");
	expect(validateCoreTelemetryEvent(mappedEvent)).toBe(true);

	if (mappedEvent && mappedEvent.event === "session_restored") {
		expect(mappedEvent.properties.session_id).toBe("legacy_session");
		expect(mappedEvent.properties.files_restored).toHaveLength(3);
		expect(mappedEvent.properties.time_to_restore_ms).toBe(1500);
		expect(mappedEvent.properties.reason).toBe("user_initiated");
	}
});

test("should map risk detected event to issue created core event", () => {
	const legacyEvent = {
		event: TELEMETRY_EVENTS.RISK_DETECTED,
		properties: {
			riskLevel: "high",
			patterns: ["secret_api_key"],
			confidence: 0.95,
		},
		timestamp: Date.now(),
	};

	const mappedEvent = TelemetryEventMapper.mapEvent(legacyEvent);

	expect(mappedEvent).not.toBeNull();
	expect(mappedEvent?.event).toBe("issue_created");
	expect(validateCoreTelemetryEvent(mappedEvent)).toBe(true);

	if (mappedEvent && mappedEvent.event === "issue_created") {
		expect(mappedEvent.properties.session_id).toBe("legacy_session");
		expect(mappedEvent.properties.type).toBe("secret");
		expect(mappedEvent.properties.severity).toBe("high");
		expect(mappedEvent.properties.recommendation).toBe("Review detected risk pattern");
	}
});

test("should return null for events that don't map to core events", () => {
	const legacyEvent = {
		event: TELEMETRY_EVENTS.EXTENSION_ACTIVATED,
		properties: {
			version: "1.0.0",
			vscodeVersion: "1.50.0",
		},
		timestamp: Date.now(),
	};

	const mappedEvent = TelemetryEventMapper.mapEvent(legacyEvent);
	expect(mappedEvent).toBeNull();
});

test("should map an array of legacy events to core events", () => {
	const legacyEvents = [
		{
			event: TELEMETRY_EVENTS.ONBOARDING_PROTECTION_ASSIGNED,
			properties: {
				level: "high",
				trigger: "file_open",
				fileType: "js",
				isFirstProtection: true,
			},
			timestamp: Date.now(),
		},
		{
			event: TELEMETRY_EVENTS.EXTENSION_ACTIVATED,
			properties: {
				version: "1.0.0",
				vscodeVersion: "1.50.0",
			},
			timestamp: Date.now(),
		},
		{
			event: TELEMETRY_EVENTS.SNAPSHOT_CREATED,
			properties: {
				method: "manual",
				filesCount: 5,
			},
			timestamp: Date.now(),
		},
	];

	const mappedEvents = mapLegacyEventsToCore(legacyEvents);

	expect(mappedEvents).toHaveLength(2);
	expect(mappedEvents[0].event).toBe("save_attempt");
	expect(mappedEvents[1].event).toBe("snapshot_created");
});
