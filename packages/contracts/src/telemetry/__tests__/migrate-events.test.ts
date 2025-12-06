import { expect, test } from "vitest";
import { TELEMETRY_EVENTS } from "../events";
import { migrateLegacyEventsToArray } from "../migrate-events";

test("should migrate legacy events to core events", () => {
	// Create sample legacy events
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
			event: TELEMETRY_EVENTS.SNAPSHOT_CREATED,
			properties: {
				method: "manual",
				filesCount: 5,
			},
			timestamp: Date.now(),
		},
	];

	// Test array migration
	const coreEvents = migrateLegacyEventsToArray(legacyEvents);

	expect(coreEvents).toHaveLength(2);
	expect(coreEvents[0].event).toBe("save_attempt");
	expect(coreEvents[1].event).toBe("snapshot_created");
});
