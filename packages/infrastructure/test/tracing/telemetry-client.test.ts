import { LEGACY_TELEMETRY_EVENTS as TELEMETRY_EVENTS } from "@snapback/contracts";
import { describe, expect, it, vi } from "vitest";
import { TelemetryClient } from "../../src/tracing/telemetry-client";

describe("TelemetryClient - Proxy Enforcement", () => {
	it("should route all events through proxy", async () => {
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

		client.track(TELEMETRY_EVENTS.EXTENSION_ACTIVATED, { version: "1.0.0", vscodeVersion: "1.75.0" });
		// @ts-expect-error - accessing private method for testing
		await client.flush();

		expect(fetchSpy).toHaveBeenCalledWith(
			"https://proxy.test/api/telemetry/events",
			expect.objectContaining({ method: "POST" }),
		);

		// Restore original method
		featureManager.isEnabled = originalIsEnabled;
		fetchSpy.mockRestore();
	});

	it("should never connect directly to PostHog", async () => {
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

		client.track(TELEMETRY_EVENTS.EXTENSION_ACTIVATED, { version: "1.0.0", vscodeVersion: "1.75.0" });
		// @ts-expect-error - accessing private method for testing
		await client.flush();

		// Ensure no calls to posthog.com
		expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining("posthog.com"), expect.anything());

		// Restore original method
		featureManager.isEnabled = originalIsEnabled;
		fetchSpy.mockRestore();
	});

	it("should strip PII from properties", async () => {
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
});
