import {
	LEGACY_TELEMETRY_EVENTS as TELEMETRY_EVENTS,
	validateLegacyTelemetryEvent as validateTelemetryEvent,
} from "@snapback/contracts";
import { describe, expect, it, vi } from "vitest";
import { TelemetryClient } from "../../src/tracing/telemetry-client";

describe("Telemetry Whitelist Enforcement", () => {
	it("should allow valid telemetry events", () => {
		// Test a valid extension activated event
		const validEvent = {
			event: TELEMETRY_EVENTS.EXTENSION_ACTIVATED,
			properties: {
				version: "1.0.0",
				vscodeVersion: "1.75.0",
			},
			timestamp: Date.now(),
		};

		expect(validateTelemetryEvent(validEvent)).toBe(true);
	});

	it("should reject invalid telemetry events", () => {
		// Test an invalid event (not in whitelist)
		const invalidEvent = {
			event: "invalid.event",
			properties: {
				someProp: "someValue",
			},
			timestamp: Date.now(),
		};

		expect(validateTelemetryEvent(invalidEvent)).toBe(false);
	});

	it("should reject events with invalid properties", () => {
		// Test a valid event name with invalid properties
		const invalidEvent = {
			event: TELEMETRY_EVENTS.EXTENSION_ACTIVATED,
			properties: {
				// Missing required properties
				invalidProp: "invalidValue",
			},
			timestamp: Date.now(),
		};

		expect(validateTelemetryEvent(invalidEvent)).toBe(false);
	});

	it("should allow valid events through TelemetryClient", async () => {
		// Mock the FeatureManager to enable detailed telemetry
		const { FeatureManager } = await import("@snapback/contracts");
		const featureManager = FeatureManager.getInstance();
		const originalIsEnabled = featureManager.isEnabled;
		featureManager.isEnabled = (flag: string) => {
			if (flag === "telemetry.detailed_events") {
				return true;
			}
			return originalIsEnabled(flag);
		};

		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => "OK",
		} as Response);

		const client = new TelemetryClient("test-key", "https://proxy.test", "vscode");
		await client.initialize();

		// Track a valid event
		client.track(TELEMETRY_EVENTS.EXTENSION_ACTIVATED, {
			version: "1.0.0",
			vscodeVersion: "1.75.0",
		});

		// @ts-expect-error - accessing private method for testing
		await client.flush();

		// Should have made a request to the proxy
		expect(fetchSpy).toHaveBeenCalledWith(
			"https://proxy.test/api/telemetry/events",
			expect.objectContaining({ method: "POST" }),
		);

		// Restore original method
		featureManager.isEnabled = originalIsEnabled;
		fetchSpy.mockRestore();
	});

	it("should reject invalid events in TelemetryClient", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => "OK",
		} as Response);

		const client = new TelemetryClient("test-key", "https://proxy.test", "vscode");
		await client.initialize();

		// Track an invalid event (invalid event name)
		client.track("invalid.event", {
			someProp: "someValue",
		});

		// @ts-expect-error - accessing private method for testing
		await client.flush();

		// Should have warned about invalid event
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"Invalid telemetry event, skipping:",
			expect.objectContaining({ event: "invalid.event" }),
		);

		// Should not have made a request to the proxy for invalid events
		expect(fetchSpy).not.toHaveBeenCalled();

		consoleWarnSpy.mockRestore();
		fetchSpy.mockRestore();
	});

	it("should sanitize PII from properties", async () => {
		const client = new TelemetryClient("test-key", "https://proxy.test", "vscode");
		// @ts-expect-error - accessing private method for testing
		const sanitized = client.sanitizeProperties({
			version: "1.0.0",
			filePath: "/secret/path", // Should be removed
			email: "user@example.com", // Should be removed
			duration: 100, // Should be kept
		});

		expect(sanitized).toEqual({
			version: "1.0.0",
			duration: 100,
		});
		expect(sanitized).not.toHaveProperty("filePath");
		expect(sanitized).not.toHaveProperty("email");
	});

	it("should validate all allowed event types", () => {
		// Test each allowed event type with valid properties
		const testEvents = [
			{
				event: TELEMETRY_EVENTS.EXTENSION_ACTIVATED,
				properties: {
					version: "1.0.0",
					vscodeVersion: "1.75.0",
				},
			},
			{
				event: TELEMETRY_EVENTS.EXTENSION_DEACTIVATED,
				properties: {},
			},
			{
				event: TELEMETRY_EVENTS.COMMAND_EXECUTION,
				properties: {
					command: "test.command",
					duration: 100,
					success: true,
				},
			},
			{
				event: TELEMETRY_EVENTS.SNAPSHOT_CREATED,
				properties: {
					method: "manual",
					filesCount: 5,
				},
			},
			{
				event: TELEMETRY_EVENTS.ERROR,
				properties: {
					errorType: "TestError",
					errorMessage: "Test error message",
				},
			},
		];

		for (const testEvent of testEvents) {
			const event = {
				...testEvent,
				timestamp: Date.now(),
			};

			expect(validateTelemetryEvent(event)).toBe(true);
		}
	});
});
