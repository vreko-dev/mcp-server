/**
 * Server Analytics Client Tests
 *
 * TDD tests for PostHog server-side analytics client.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsEvents } from "../core/events";
import type { ServerAnalyticsConfig } from "../core/types";
import { ServerAnalyticsClient } from "../server/index";

describe("Server Analytics Client", () => {
	let mockPostHog: any;
	let serverAnalytics: ServerAnalyticsClient;
	let config: ServerAnalyticsConfig;

	beforeEach(() => {
		// Create mock PostHog client
		mockPostHog = {
			capture: vi.fn(),
			identify: vi.fn(),
			alias: vi.fn(),
			groupIdentify: vi.fn(),
			isFeatureEnabled: vi.fn(),
			shutdown: vi.fn().mockResolvedValue(undefined),
		};

		config = {
			apiKey: "test-api-key",
			enabled: true,
		};

		serverAnalytics = new ServerAnalyticsClient(mockPostHog, config);
	});

	describe("Event Tracking", () => {
		it("should track events with type-safe properties", () => {
			serverAnalytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
				file_extension: ".ts",
				file_size_bytes: 1024,
				has_message: true,
				trigger: "manual",
				environment: "extension",
			});

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: expect.any(String),
				event: "snapshot_created",
				properties: {
					file_extension: ".ts",
					file_size_bytes: 1024,
					has_message: true,
					trigger: "manual",
					environment: "extension",
				},
			});
		});

		it("should enrich events with super properties", () => {
			const configWithSuper: ServerAnalyticsConfig = {
				apiKey: "test-key",
				plan: "pro",
				environment: "api",
				version: "1.0.0",
			};

			const client = new ServerAnalyticsClient(mockPostHog, configWithSuper);

			client.track(AnalyticsEvents.AUTH_LOGIN_COMPLETED, {
				login_method: "email",
				is_new_session: true,
			});

			expect(mockPostHog.capture).toHaveBeenCalledWith({
				distinctId: expect.any(String),
				event: "auth_login_completed",
				properties: {
					login_method: "email",
					is_new_session: true,
					plan_tier: "pro",
					environment: "api",
					app_version: "1.0.0",
				},
			});
		});

		it("should respect sampling configuration", () => {
			const client = new ServerAnalyticsClient(mockPostHog, config);

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
			const client = new ServerAnalyticsClient(mockPostHog, config);

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
			serverAnalytics.identify("user_123", {
				email: "user@example.com",
				name: "Test User",
				plan: "pro",
			});

			expect(mockPostHog.identify).toHaveBeenCalledWith({
				distinctId: "user_123",
				properties: {
					email: "user@example.com",
					name: "Test User",
					plan: "pro",
				},
			});
		});

		it("should identify users without traits", () => {
			serverAnalytics.identify("user_456");

			expect(mockPostHog.identify).toHaveBeenCalledWith({
				distinctId: "user_456",
			});
		});
	});

	describe("User Aliasing", () => {
		it("should alias user identities", () => {
			serverAnalytics.alias("user_new", "user_old");

			expect(mockPostHog.alias).toHaveBeenCalledWith({
				distinctId: "user_new",
				alias: "user_old",
			});
		});
	});

	describe("Group Management", () => {
		it("should set group with properties", () => {
			serverAnalytics.setGroup("organization", "org_123", {
				name: "Acme Corp",
				plan: "enterprise",
				team_size: 50,
			});

			expect(mockPostHog.groupIdentify).toHaveBeenCalledWith({
				groupType: "organization",
				groupKey: "org_123",
				properties: {
					name: "Acme Corp",
					plan: "enterprise",
					team_size: 50,
				},
			});
		});

		it("should set group without properties", () => {
			serverAnalytics.setGroup("team", "team_456");

			expect(mockPostHog.groupIdentify).toHaveBeenCalledWith({
				groupType: "team",
				groupKey: "team_456",
			});
		});
	});

	describe("Feature Flags", () => {
		it("should check if feature is enabled", async () => {
			mockPostHog.isFeatureEnabled.mockResolvedValue(true);

			const enabled = await serverAnalytics.isFeatureEnabled("new-snapshot-ui");

			expect(enabled).toBe(true);
			expect(mockPostHog.isFeatureEnabled).toHaveBeenCalledWith("new-snapshot-ui", expect.any(String));
		});

		it("should return false if feature flag check fails", async () => {
			mockPostHog.isFeatureEnabled.mockRejectedValue(new Error("API error"));

			const enabled = await serverAnalytics.isFeatureEnabled("test-flag");

			expect(enabled).toBe(false);
		});
	});

	describe("Shutdown Handling", () => {
		it("should call shutdown on PostHog client", async () => {
			await serverAnalytics.shutdown();

			expect(mockPostHog.shutdown).toHaveBeenCalled();
		});

		it("should handle shutdown errors gracefully", async () => {
			mockPostHog.shutdown.mockRejectedValue(new Error("Shutdown failed"));

			await expect(serverAnalytics.shutdown()).resolves.not.toThrow();
		});
	});

	describe("Debug Mode", () => {
		it("should log events in debug mode", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const debugConfig: ServerAnalyticsConfig = {
				apiKey: "test-key",
				debug: true,
			};

			const client = new ServerAnalyticsClient(mockPostHog, debugConfig);

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
