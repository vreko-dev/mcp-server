import { describe, expect, it, vi } from "vitest";
import { ingestEvents } from "../procedures/ingest-events";

describe("Telemetry Ingest API - Proxy Enforcement", () => {
	it("should reject events not in allowlist", async () => {
		const invalidEvent = {
			events: [
				{
					event: "invalid.event",
					properties: {},
					timestamp: Date.now(),
				},
			],
		};

		// @ts-expect-error - testing invalid input
		await expect(ingestEvents.handler({ input: invalidEvent })).rejects.toThrow();
	});

	it("should accept events in allowlist", async () => {
		const validEvent = {
			events: [
				{
					event: "extension.activated",
					properties: { version: "1.0.0" },
					timestamp: Date.now(),
				},
			],
		};

		// Mock PostHog
		const postHogMock = {
			capture: vi.fn(),
			flush: vi.fn(),
			shutdown: vi.fn(),
		};

		vi.mock("posthog-node", () => {
			return {
				PostHog: vi.fn().mockImplementation(() => postHogMock),
			};
		});

		// @ts-expect-error - testing valid input
		const result = await ingestEvents.handler({ input: validEvent });

		expect(result.success).toBe(true);
		expect(postHogMock.capture).toHaveBeenCalled();
	});

	it("should strip PII from properties", async () => {
		const eventWithPII = {
			events: [
				{
					event: "feature.used",
					properties: {
						version: "1.0.0",
						email: "user@example.com",
						filePath: "/Users/secret/file.ts",
					},
					timestamp: Date.now(),
				},
			],
		};

		// Mock PostHog
		const postHogMock = {
			capture: vi.fn(),
			flush: vi.fn(),
			shutdown: vi.fn(),
		};

		vi.mock("posthog-node", () => {
			return {
				PostHog: vi.fn().mockImplementation(() => postHogMock),
			};
		});

		// @ts-expect-error - testing input with PII
		await ingestEvents.handler({ input: eventWithPII });

		// Check that PII was stripped
		expect(postHogMock.capture).toHaveBeenCalledWith(
			expect.objectContaining({
				properties: expect.objectContaining({
					version: "1.0.0",
				}),
			}),
		);

		// Check that PII was not included
		const captureCall = postHogMock.capture.mock.calls[0][0];
		expect(captureCall.properties).not.toHaveProperty("email");
		expect(captureCall.properties).not.toHaveProperty("filePath");
	});

	it("should scrub IP addresses", async () => {
		const event = {
			events: [
				{
					event: "command.execution",
					properties: {},
					timestamp: Date.now(),
				},
			],
		};

		// Mock PostHog
		const postHogMock = {
			capture: vi.fn(),
			flush: vi.fn(),
			shutdown: vi.fn(),
		};

		vi.mock("posthog-node", () => {
			return {
				PostHog: vi.fn().mockImplementation(() => postHogMock),
			};
		});

		// @ts-expect-error - testing valid input
		await ingestEvents.handler({ input: event });

		// Check that IP was scrubbed
		const captureCall = postHogMock.capture.mock.calls[0][0];
		expect(captureCall.properties.$ip).toBeNull();
	});

	it("should never forward user IDs", async () => {
		const event = {
			events: [
				{
					event: "snapshot.created",
					properties: {},
					timestamp: Date.now(),
				},
			],
		};

		// Mock PostHog
		const postHogMock = {
			capture: vi.fn(),
			flush: vi.fn(),
			shutdown: vi.fn(),
		};

		vi.mock("posthog-node", () => {
			return {
				PostHog: vi.fn().mockImplementation(() => postHogMock),
			};
		});

		// @ts-expect-error - testing valid input
		await ingestEvents.handler({ input: event });

		// Check that distinctId is anonymous
		const captureCall = postHogMock.capture.mock.calls[0][0];
		expect(captureCall.distinctId).toBe("anonymous");
	});
});
