/**
 * TDD Tests for Mock Analytics Client
 *
 * Validate the mock client works correctly for testing.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { AnalyticsEvents } from "../core/events";
import { createMockAnalytics, type MockAnalyticsClient } from "../test-utils/index";

describe("MockAnalyticsClient - Event Tracking", () => {
	let analytics: MockAnalyticsClient;

	beforeEach(() => {
		analytics = createMockAnalytics();
	});

	it("should track events in memory", () => {
		analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
			file_extension: ".ts",
			file_size_bytes: 1024,
			has_message: true,
			trigger: "manual",
			environment: "extension",
		});

		expect(analytics.events).toHaveLength(1);
		expect(analytics.events[0].event).toBe("snapshot_created");
	});

	it("should record event properties correctly", () => {
		analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
			file_extension: ".ts",
			file_size_bytes: 1024,
			has_message: true,
			trigger: "manual",
			environment: "extension",
		});

		const event = analytics.events[0];
		expect(event.properties.file_extension).toBe(".ts");
		expect(event.properties.file_size_bytes).toBe(1024);
		expect(event.properties.trigger).toBe("manual");
	});

	it("should record multiple events in order", () => {
		analytics.track(AnalyticsEvents.AUTH_LOGIN_COMPLETED, {
			login_method: "email",
			is_new_session: true,
		});

		analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
			file_extension: ".js",
			file_size_bytes: 512,
			has_message: false,
			trigger: "auto",
			environment: "cli",
		});

		expect(analytics.events).toHaveLength(2);
		expect(analytics.events[0].event).toBe("auth_login_completed");
		expect(analytics.events[1].event).toBe("snapshot_created");
	});

	it("should include timestamps for events", () => {
		const before = new Date();
		analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
			file_extension: ".ts",
			file_size_bytes: 1024,
			has_message: true,
			trigger: "manual",
			environment: "extension",
		});
		const after = new Date();

		const event = analytics.events[0];
		expect(event.timestamp).toBeInstanceOf(Date);
		expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
	});
});

describe("MockAnalyticsClient - Identity Management", () => {
	let analytics: MockAnalyticsClient;

	beforeEach(() => {
		analytics = createMockAnalytics();
	});

	it("should record identify calls", () => {
		analytics.identify("user-123", {
			email: "user@example.com",
			plan: "pro",
		});

		expect(analytics.identifies).toHaveLength(1);
		expect(analytics.identifies[0].userId).toBe("user-123");
		expect(analytics.identifies[0].traits?.email).toBe("user@example.com");
	});

	it("should record alias calls", () => {
		analytics.alias("user-123", "device-abc");

		expect(analytics.aliases).toHaveLength(1);
		expect(analytics.aliases[0].userId).toBe("user-123");
		expect(analytics.aliases[0].previousId).toBe("device-abc");
	});

	it("should record group calls", () => {
		analytics.setGroup("team", "team-456", {
			name: "Engineering Team",
			plan: "team",
		});

		expect(analytics.groups).toHaveLength(1);
		expect(analytics.groups[0].groupType).toBe("team");
		expect(analytics.groups[0].groupId).toBe("team-456");
	});
});

describe("MockAnalyticsClient - Feature Flags", () => {
	let analytics: MockAnalyticsClient;

	beforeEach(() => {
		analytics = createMockAnalytics();
	});

	it("should return false for unset feature flags", () => {
		expect(analytics.isFeatureEnabled("ai-suggestions")).toBe(false);
	});

	it("should return set feature flag values", () => {
		analytics.setFeatureFlag("ai-suggestions", true);
		expect(analytics.isFeatureEnabled("ai-suggestions")).toBe(true);
	});

	it("should support multiple feature flags", () => {
		analytics.setFeatureFlag("feature-a", true);
		analytics.setFeatureFlag("feature-b", false);

		expect(analytics.isFeatureEnabled("feature-a")).toBe(true);
		expect(analytics.isFeatureEnabled("feature-b")).toBe(false);
	});
});

describe("MockAnalyticsClient - Shutdown", () => {
	let analytics: MockAnalyticsClient;

	beforeEach(() => {
		analytics = createMockAnalytics();
	});

	it("should record shutdown calls", async () => {
		await analytics.shutdown();
		expect(analytics.shutdownCalled).toBe(true);
	});

	it("should support assertShutdownCalled helper", async () => {
		await analytics.shutdown();
		expect(() => analytics.assertShutdownCalled()).not.toThrow();
	});

	it("should throw when shutdown not called", () => {
		expect(() => analytics.assertShutdownCalled()).toThrow("Expected shutdown() to be called");
	});
});

describe("MockAnalyticsClient - Test Helpers", () => {
	let analytics: MockAnalyticsClient;

	beforeEach(() => {
		analytics = createMockAnalytics();
	});

	it("should clear all tracked data", () => {
		analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
			file_extension: ".ts",
			file_size_bytes: 1024,
			has_message: true,
			trigger: "manual",
			environment: "extension",
		});
		analytics.identify("user-123");
		analytics.alias("user-123", "device-abc");

		analytics.clear();

		expect(analytics.events).toHaveLength(0);
		expect(analytics.identifies).toHaveLength(0);
		expect(analytics.aliases).toHaveLength(0);
	});

	it("should get events by name", () => {
		analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
			file_extension: ".ts",
			file_size_bytes: 1024,
			has_message: true,
			trigger: "manual",
			environment: "extension",
		});
		analytics.track(AnalyticsEvents.AUTH_LOGIN_COMPLETED, {
			login_method: "email",
			is_new_session: true,
		});
		analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
			file_extension: ".js",
			file_size_bytes: 512,
			has_message: false,
			trigger: "auto",
			environment: "cli",
		});

		const snapshotEvents = analytics.getEvents("snapshot_created");
		expect(snapshotEvents).toHaveLength(2);
	});

	it("should get last event", () => {
		analytics.track(AnalyticsEvents.AUTH_LOGIN_COMPLETED, {
			login_method: "email",
			is_new_session: true,
		});
		analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
			file_extension: ".ts",
			file_size_bytes: 1024,
			has_message: true,
			trigger: "manual",
			environment: "extension",
		});

		const lastEvent = analytics.getLastEvent();
		expect(lastEvent?.event).toBe("snapshot_created");
	});

	it("should get last identify", () => {
		analytics.identify("user-123");
		analytics.identify("user-456");

		const lastIdentify = analytics.getLastIdentify();
		expect(lastIdentify?.userId).toBe("user-456");
	});

	it("should assert event tracked", () => {
		analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
			file_extension: ".ts",
			file_size_bytes: 1024,
			has_message: true,
			trigger: "manual",
			environment: "extension",
		});

		expect(() => analytics.assertEventTracked("snapshot_created")).not.toThrow();

		expect(() => analytics.assertEventTracked("nonexistent_event")).toThrow(
			'Expected event "nonexistent_event" to be tracked',
		);
	});
});
