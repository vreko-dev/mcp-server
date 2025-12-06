/**
 * Browser Analytics Client Tests
 *
 * TDD tests for PostHog browser-side analytics client.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserAnalyticsClient } from "../client/index";
import { AnalyticsEvents } from "../core/events";
import type { BrowserAnalyticsConfig } from "../core/types";

describe("Browser Analytics Client", () => {
	let mockPostHog: any;
	let browserAnalytics: BrowserAnalyticsClient;
	let config: BrowserAnalyticsConfig;

	beforeEach(() => {
		// Create mock PostHog client
		mockPostHog = {
			capture: vi.fn(),
			identify: vi.fn(),
			alias: vi.fn(),
			group: vi.fn(),
			register: vi.fn(),
			isFeatureEnabled: vi.fn(),
		};

		config = {
			apiKey: "test-api-key",
			enabled: true,
		};

		browserAnalytics = new BrowserAnalyticsClient(mockPostHog, config);
	});

	describe("Initialization", () => {
		it("should register super properties on init", () => {
			const configWithSuper: BrowserAnalyticsConfig = {
				apiKey: "test-key",
				plan: "pro",
				environment: "web",
				version: "1.0.0",
			};

			const _client = new BrowserAnalyticsClient(mockPostHog, configWithSuper);

			expect(mockPostHog.register).toHaveBeenCalledWith({
				plan_tier: "pro",
				environment: "web",
				app_version: "1.0.0",
			});
		});
	});

	describe("Event Tracking", () => {
		it("should track events with type-safe properties", () => {
			browserAnalytics.track(AnalyticsEvents.AUTH_SIGNUP_COMPLETED, {
				signup_method: "email",
				referrer: null,
			});

			expect(mockPostHog.capture).toHaveBeenCalledWith("auth_signup_completed", {
				signup_method: "email",
				referrer: null,
			});
		});

		it("should respect sampling configuration", () => {
			const client = new BrowserAnalyticsClient(mockPostHog, config);

			// Track 100 OPTIONAL tier events (10% sampling)
			for (let i = 0; i < 100; i++) {
				client.track(AnalyticsEvents.SNAPSHOT_DIFF_VIEWED, {
					lines_added: 10,
					lines_removed: 5,
					has_conflicts: false,
				});
			}

			// Should be approximately 10 calls (10% sampling)
			const callCount = mockPostHog.capture.mock.calls.length;
			expect(callCount).toBeGreaterThan(0);
			expect(callCount).toBeLessThan(30); // Allow variance
		});

		it("should always track CORE tier events", () => {
			const client = new BrowserAnalyticsClient(mockPostHog, config);

			// Track 10 CORE tier events (100% sampling)
			for (let i = 0; i < 10; i++) {
				client.track(AnalyticsEvents.AUTH_SIGNUP_COMPLETED, {
					signup_method: "email",
					referrer: null,
				});
			}

			expect(mockPostHog.capture).toHaveBeenCalledTimes(10);
		});
	});

	describe("User Identification", () => {
		it("should identify users with traits", () => {
			browserAnalytics.identify("user_123", {
				email: "user@example.com",
				name: "Test User",
				plan: "pro",
			});

			expect(mockPostHog.identify).toHaveBeenCalledWith("user_123", {
				email: "user@example.com",
				name: "Test User",
				plan: "pro",
			});
		});

		it("should identify users without traits", () => {
			browserAnalytics.identify("user_456");

			expect(mockPostHog.identify).toHaveBeenCalledWith("user_456", undefined);
		});
	});

	describe("User Aliasing", () => {
		it("should alias user identities", () => {
			browserAnalytics.alias("user_new", "user_old");

			expect(mockPostHog.alias).toHaveBeenCalledWith("user_new", "user_old");
		});
	});

	describe("Group Management", () => {
		it("should set group with properties", () => {
			browserAnalytics.setGroup("organization", "org_123", {
				name: "Acme Corp",
				plan: "enterprise",
				team_size: 50,
			});

			expect(mockPostHog.group).toHaveBeenCalledWith("organization", "org_123", {
				name: "Acme Corp",
				plan: "enterprise",
				team_size: 50,
			});
		});

		it("should set group without properties", () => {
			browserAnalytics.setGroup("team", "team_456");

			expect(mockPostHog.group).toHaveBeenCalledWith("team", "team_456", undefined);
		});
	});

	describe("Feature Flags", () => {
		it("should check if feature is enabled", () => {
			mockPostHog.isFeatureEnabled.mockReturnValue(true);

			const enabled = browserAnalytics.isFeatureEnabled("new-snapshot-ui");

			expect(enabled).toBe(true);
			expect(mockPostHog.isFeatureEnabled).toHaveBeenCalledWith("new-snapshot-ui");
		});

		it("should return false if feature flag check fails", () => {
			mockPostHog.isFeatureEnabled.mockImplementation(() => {
				throw new Error("API error");
			});

			const enabled = browserAnalytics.isFeatureEnabled("test-flag");

			expect(enabled).toBe(false);
		});
	});

	describe("Debug Mode", () => {
		it("should log events in debug mode", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const debugConfig: BrowserAnalyticsConfig = {
				apiKey: "test-key",
				debug: true,
			};

			const client = new BrowserAnalyticsClient(mockPostHog, debugConfig);

			client.track(AnalyticsEvents.AUTH_SIGNUP_COMPLETED, {
				signup_method: "email",
				referrer: null,
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("[Analytics]"),
				expect.any(String),
				expect.any(Object),
			);

			consoleSpy.mockRestore();
		});
	});
});
