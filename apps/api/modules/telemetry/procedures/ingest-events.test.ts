import { TELEMETRY_EVENTS } from "@snapback/contracts/src/telemetry/events.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ingestEvents } from "./ingest-events";

// Mock PostHog
const mockPostHog = {
	capture: vi.fn(),
	flush: vi.fn(),
	shutdown: vi.fn(),
};

vi.mock("posthog-node", () => {
	return {
		PostHog: vi.fn().mockImplementation(() => mockPostHog),
	};
});

describe("Telemetry Ingestion Endpoint", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should accept valid telemetry events", async () => {
		const input = {
			events: [
				{
					event: TELEMETRY_EVENTS.EXTENSION_ACTIVATED,
					properties: {
						version: "1.0.0",
						vscodeVersion: "1.75.0",
					},
					timestamp: Date.now(),
				},
			],
		};

		const result = await ingestEvents.handler({ input } as any);

		expect(result).toEqual({
			success: true,
			processed: 1,
			invalid: 0,
		});

		expect(mockPostHog.capture).toHaveBeenCalledWith(
			expect.objectContaining({
				event: TELEMETRY_EVENTS.EXTENSION_ACTIVATED,
				properties: expect.objectContaining({
					version: "1.0.0",
					vscodeVersion: "1.75.0",
				}),
			}),
		);
	});

	it("should reject invalid telemetry events", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const input = {
			events: [
				{
					event: "invalid.event",
					properties: {
						someProp: "someValue",
					},
					timestamp: Date.now(),
				},
			],
		};

		const result = await ingestEvents.handler({ input } as any);

		expect(result).toEqual({
			success: true,
			processed: 0,
			invalid: 1,
		});

		// Should not have called PostHog capture for invalid events
		expect(mockPostHog.capture).not.toHaveBeenCalled();

		// Should have logged a warning
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"Invalid telemetry events detected:",
			expect.arrayContaining([expect.objectContaining({ event: "invalid.event" })]),
		);

		consoleWarnSpy.mockRestore();
	});

	it("should process mixed valid and invalid events", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const input = {
			events: [
				// Valid event
				{
					event: TELEMETRY_EVENTS.EXTENSION_ACTIVATED,
					properties: {
						version: "1.0.0",
						vscodeVersion: "1.75.0",
					},
					timestamp: Date.now(),
				},
				// Invalid event (invalid event name)
				{
					event: "invalid.event",
					properties: {
						someProp: "someValue",
					},
					timestamp: Date.now(),
				},
				// Valid event
				{
					event: TELEMETRY_EVENTS.COMMAND_EXECUTION,
					properties: {
						command: "test.command",
						duration: 100,
						success: true,
					},
					timestamp: Date.now(),
				},
			],
		};

		const result = await ingestEvents.handler({ input } as any);

		expect(result).toEqual({
			success: true,
			processed: 2,
			invalid: 1,
		});

		// Should have called PostHog capture for valid events only
		expect(mockPostHog.capture).toHaveBeenCalledTimes(2);
		expect(mockPostHog.capture).toHaveBeenCalledWith(
			expect.objectContaining({
				event: TELEMETRY_EVENTS.EXTENSION_ACTIVATED,
			}),
		);
		expect(mockPostHog.capture).toHaveBeenCalledWith(
			expect.objectContaining({
				event: TELEMETRY_EVENTS.COMMAND_EXECUTION,
			}),
		);

		// Should have logged a warning for invalid events
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"Invalid telemetry events detected:",
			expect.arrayContaining([expect.objectContaining({ event: "invalid.event" })]),
		);

		consoleWarnSpy.mockRestore();
	});

	it("should strip PII from properties", async () => {
		const input = {
			events: [
				{
					event: TELEMETRY_EVENTS.ERROR,
					properties: {
						errorType: "TestError",
						errorMessage: "Test error message",
						filePath: "/secret/path", // Should be stripped
						email: "user@example.com", // Should be stripped
					},
					timestamp: Date.now(),
				},
			],
		};

		await ingestEvents.handler({ input } as any);

		expect(mockPostHog.capture).toHaveBeenCalledWith(
			expect.objectContaining({
				event: TELEMETRY_EVENTS.ERROR,
				properties: expect.objectContaining({
					errorType: "TestError",
					errorMessage: "Test error message",
				}),
			}),
		);

		// Should not contain PII properties
		const captureCall = mockPostHog.capture.mock.calls[0][0];
		expect(captureCall.properties).not.toHaveProperty("filePath");
		expect(captureCall.properties).not.toHaveProperty("email");
	});
});
