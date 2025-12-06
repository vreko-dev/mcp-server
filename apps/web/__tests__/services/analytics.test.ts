import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "../../services/analytics";

// Mock PostHog client
const mockPostHog = {
	captureEvent: vi.fn().mockResolvedValue(undefined),
	alias: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@snapback/api-service/lib/analytics/posthog-client", () => ({
	posthog: mockPostHog,
}));

describe("Analytics Service", () => {
	let analyticsService: AnalyticsService;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
		analyticsService = new AnalyticsService();
	});

	it("should track device events", async () => {
		await analyticsService.trackDeviceEvent("device123", "app_started", {
			platform: "vscode",
			version: "1.0.0",
		});

		expect(mockPostHog.captureEvent).toHaveBeenCalledWith({
			userId: "device_device123",
			event: "app_started",
			properties: {
				platform: "vscode",
				version: "1.0.0",
				identityType: "device",
				isAnonymous: true,
			},
		});
	});

	it("should track user events", async () => {
		await analyticsService.trackUserEvent("user123", "checkpoint_created", {
			feature: "backup",
			success: true,
			deviceFingerprint: "device123",
		});

		expect(mockPostHog.captureEvent).toHaveBeenCalledWith({
			userId: "user123",
			event: "checkpoint_created",
			properties: {
				feature: "backup",
				success: true,
				identityType: "user",
				isAnonymous: false,
				deviceFingerprint: "device123",
			},
		});
	});

	it("should link device to user", async () => {
		await analyticsService.linkDeviceToUser("device123", "user123");

		// Should call alias to merge identities
		expect(mockPostHog.alias).toHaveBeenCalledWith({
			userId: "user123",
			previousId: "device_device123",
		});

		// Should track conversion event
		expect(mockPostHog.captureEvent).toHaveBeenCalledWith({
			userId: "user123",
			event: "device_linked",
			properties: {
				deviceFingerprint: "device123",
				conversionStage: "email_signup",
				identityType: "user",
				isAnonymous: false,
			},
		});
	});

	it("should track conversions", async () => {
		await analyticsService.trackConversion("user123", "checkout_initiated", {
			plan: "solo",
			source: "extension",
		});

		expect(mockPostHog.captureEvent).toHaveBeenCalledWith({
			userId: "user123",
			event: "conversion_checkout_initiated",
			properties: {
				conversionStage: "checkout_initiated",
				plan: "solo",
				source: "extension",
				identityType: "user",
				isAnonymous: false,
			},
		});
	});

	it("should handle PostHog errors gracefully", async () => {
		// Mock PostHog to throw an error
		mockPostHog.captureEvent.mockRejectedValueOnce(new Error("PostHog error"));

		// Should not throw an error even if PostHog fails
		await expect(
			analyticsService.trackUserEvent("user123", "test_event", {}),
		).resolves.not.toThrow();
	});
});
