/**
 * AnalyticsWrapper tests - Privacy filtering and tier enforcement
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsWrapper, type SafeEventProperties } from "../../src/analytics/AnalyticsWrapper";

interface MockPostHog {
	capture: ReturnType<typeof vi.fn>;
	identify: ReturnType<typeof vi.fn>;
	flush: ReturnType<typeof vi.fn>;
	shutdown: ReturnType<typeof vi.fn>;
}

describe("AnalyticsWrapper", () => {
	let mockPostHog: MockPostHog;

	beforeEach(() => {
		// Mock PostHog client
		mockPostHog = {
			capture: vi.fn(),
			identify: vi.fn(),
			flush: vi.fn().mockResolvedValue(undefined),
			shutdown: vi.fn().mockResolvedValue(undefined),
		};
	});

	describe("Free tier behavior", () => {
		it("should not transmit events for free tier", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "free",
				consent: true,
			});

			wrapper.track("test_event", { count: 1 });

			expect(mockPostHog.capture).not.toHaveBeenCalled();
		});

		it("should not identify users for free tier", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "free",
				consent: true,
			});

			wrapper.identify("user-123", { tier: "free" });

			expect(mockPostHog.identify).not.toHaveBeenCalled();
		});
	});

	describe("Consent enforcement", () => {
		it("should not transmit events without consent", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: false,
			});

			wrapper.track("test_event", { count: 1 });

			expect(mockPostHog.capture).not.toHaveBeenCalled();
		});

		it("should transmit events with consent on Solo tier", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", { count: 1 });

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 },
			});
		});
	});

	describe("PII filtering", () => {
		it("should block email addresses", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {
				user_email: "user@example.com", // Should be blocked
				count: 1,
			} as SafeEventProperties);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 }, // email filtered out
			});
		});

		it("should block file paths", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {
				file_path: "/Users/john/project/file.ts", // Should be blocked
				count: 1,
			} as SafeEventProperties);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 }, // file_path filtered out
			});
		});

		it("should block IP addresses", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {
				server_ip: "192.168.1.100", // Should be blocked
				count: 1,
			} as SafeEventProperties);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 }, // server_ip filtered out
			});
		});

		it("should block API keys", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {
				api_key: "sk_live_abc123def456ghi789", // Should be blocked by property name
				count: 1,
			} as SafeEventProperties);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 }, // api_key filtered out
			});
		});

		it("should allow safe properties", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			const safeProps: SafeEventProperties = {
				feature: "snapshot",
				action: "create",
				success: true,
				duration_ms: 150,
				count: 5,
				platform: "vscode",
				version: "1.0.0",
			};

			wrapper.track("test_event", safeProps);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: safeProps,
			});
		});

		it("should filter undefined and null values", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {
				count: 1,
				nullValue: null as any,
				undefinedValue: undefined,
			} as SafeEventProperties);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 }, // null/undefined filtered out
			});
		});
	});

	describe("Blocked property names", () => {
		it("should block sensitive property names regardless of value", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {
				email: "safe@example.com",
				password: "not-a-real-password",
				token: "safe-token",
				secret: "safe-secret",
				count: 1,
			} as SafeEventProperties);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 }, // All sensitive properties filtered
			});
		});
	});

	describe("Identify filtering", () => {
		it("should filter PII from user traits", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.identify("user-123", {
				email: "user@example.com", // Should be blocked
				tier: "solo", // Should be allowed
			});

			expect(mockPostHog.identify).toHaveBeenCalledWith({
				distinctId: "user-123",
				properties: { tier: "solo" }, // email filtered out
			});
		});
	});

	describe("Utility methods", () => {
		it("should flush events", async () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			await wrapper.flush();

			expect(mockPostHog.flush).toHaveBeenCalled();
		});

		it("should shutdown gracefully", async () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			await wrapper.shutdown();

			expect(mockPostHog.shutdown).toHaveBeenCalled();
		});

		it("should handle flush errors gracefully", async () => {
			const errorPostHog: MockPostHog = {
				...mockPostHog,
				flush: vi.fn().mockRejectedValue(new Error("Flush failed")),
			};

			const wrapper = new AnalyticsWrapper({
				posthog: errorPostHog,
				tier: "solo",
				consent: true,
			});

			// Should not throw
			await expect(wrapper.flush()).resolves.toBeUndefined();
		});
	});

	describe("Complex PII patterns", () => {
		it("should block Windows file paths", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {
				workspace: "C:\\Users\\john\\project", // Should be blocked
				count: 1,
			} as SafeEventProperties);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 },
			});
		});

		it("should block phone numbers", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {
				contact: "555-123-4567", // Should be blocked
				count: 1,
			} as SafeEventProperties);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 },
			});
		});

		it("should block GitHub tokens", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {
				token: "ghp_abcdefghijklmnopqrstuvwxyz123456", // Should be blocked by property name
				count: 1,
			} as SafeEventProperties);

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: { count: 1 }, // token filtered by property name
			});
		});
	});

	describe("Edge cases", () => {
		it("should handle wrapper without PostHog client", () => {
			const wrapper = new AnalyticsWrapper({
				tier: "solo",
				consent: true,
				// No posthog client
			});

			// Should not throw
			expect(() => wrapper.track("test_event", { count: 1 })).not.toThrow();
		});

		it("should handle empty properties object", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", {});

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "anonymous",
				event: "test_event",
				properties: {},
			});
		});

		it("should use provided distinctId", () => {
			const wrapper = new AnalyticsWrapper({
				posthog: mockPostHog,
				tier: "solo",
				consent: true,
			});

			wrapper.track("test_event", { count: 1 }, "user-123");

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: "user-123",
				event: "test_event",
				properties: { count: 1 },
			});
		});
	});
});
