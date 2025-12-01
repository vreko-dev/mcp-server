import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QoSLevel, SnapBackEventBus } from "../src/index.js";

describe("SnapBackEventBus QoS Features", () => {
	let eventBus: SnapBackEventBus;

	beforeEach(async () => {
		eventBus = new SnapBackEventBus();
		await eventBus.initialize();
	});

	afterEach(() => {
		eventBus.close();
	});

	it("should publish and receive QoS events with BEST_EFFORT level", async () => {
		return new Promise<void>((resolve) => {
			// Listen for event
			eventBus.on("test:qos_event", (payload) => {
				expect(payload.value).toBe("test-value");
				resolve();
			});

			// Publish QoS event
			eventBus.publishQoS("test:qos_event", { value: "test-value" }, QoSLevel.BEST_EFFORT);
		});
	});

	it("should publish and receive QoS events with AT_LEAST_ONCE level", async () => {
		return new Promise<void>((resolve) => {
			// Listen for event
			eventBus.on("test:qos_event", (payload) => {
				expect(payload.value).toBe("test-value");
				resolve();
			});

			// Publish QoS event
			eventBus.publishQoS("test:qos_event", { value: "test-value" }, QoSLevel.AT_LEAST_ONCE);
		});
	});

	it("should publish and receive QoS events with EXACTLY_ONCE level", async () => {
		return new Promise<void>((resolve) => {
			// Listen for event
			eventBus.on("test:qos_event", (payload) => {
				expect(payload.value).toBe("test-value");
				resolve();
			});

			// Publish QoS event
			eventBus.publishQoS("test:qos_event", { value: "test-value" }, QoSLevel.EXACTLY_ONCE);
		});
	});

	it("should persist events with QoS levels higher than BEST_EFFORT", async () => {
		// Publish a QoS event with AT_LEAST_ONCE level
		const eventId = await eventBus.publishQoS(
			"test:persistent_event",
			{ value: "persistent-test" },
			QoSLevel.AT_LEAST_ONCE,
		);

		// Retrieve the event
		const event = await eventBus.getEvent(eventId!);
		expect(event).not.toBeNull();
		expect(event?.type).toBe("test:persistent_event");
		expect(event?.payload.value).toBe("persistent-test");
		expect(event?.qosLevel).toBe(QoSLevel.AT_LEAST_ONCE);
	});

	it("should list events with filters", async () => {
		// Publish multiple events with different QoS levels
		await eventBus.publishQoS("test:event1", { value: "1" }, QoSLevel.BEST_EFFORT);
		const eventId2 = await eventBus.publishQoS("test:event2", { value: "2" }, QoSLevel.AT_LEAST_ONCE);
		const eventId3 = await eventBus.publishQoS("test:event3", { value: "3" }, QoSLevel.EXACTLY_ONCE);

		// List all events
		const allEvents = await eventBus.listEvents();
		expect(allEvents.length).toBe(2); // Only AT_LEAST_ONCE and EXACTLY_ONCE events are persisted

		// Check that the persisted events have the correct QoS levels
		const persistedEvents = allEvents.filter((event) => event.id === eventId2 || event.id === eventId3);
		expect(persistedEvents.length).toBe(2);
	});
});
