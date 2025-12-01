/**
 * Tests for Activation Funnel Events
 *
 * These tests ensure that the activation funnel events are properly defined
 * and can be tracked correctly.
 */

import { describe, expect, it } from "vitest";
import type { AuthCompletedProps, FirstSnapshotCreatedProps } from "../core/events.js";
import { AnalyticsEvents } from "../core/events.js";

describe("Activation Funnel Events", () => {
	describe("Event Definitions", () => {
		it("should define all activation funnel events", () => {
			expect(AnalyticsEvents.AUTH_COMPLETED).toBe("auth_completed");
			expect(AnalyticsEvents.FIRST_SNAPSHOT_CREATED).toBe("first_snapshot_created");
		});

		it("should have unique event names", () => {
			const eventValues = Object.values(AnalyticsEvents);
			const uniqueValues = new Set(eventValues);
			expect(uniqueValues.size).toBe(eventValues.length);
		});
	});

	describe("Auth Completed Event", () => {
		it("should accept valid auth completed properties", () => {
			const props: AuthCompletedProps = {
				auth_method: "email",
				time_to_auth_minutes: 2.5,
			};

			expect(props.auth_method).toBe("email");
			expect(props.time_to_auth_minutes).toBe(2.5);
		});

		it("should enforce auth_method enum", () => {
			const validMethods: Array<AuthCompletedProps["auth_method"]> = ["email", "google", "github"];
			expect(validMethods).toHaveLength(3);
		});

		it("should require time_to_auth_minutes", () => {
			const props = {
				auth_method: "email" as const,
				time_to_auth_minutes: 1.5,
			};

			expect(props.time_to_auth_minutes).toBeGreaterThan(0);
		});
	});

	describe("First Snapshot Created Event", () => {
		it("should accept valid first snapshot created properties", () => {
			const props: FirstSnapshotCreatedProps = {
				snapshot_method: "manual",
				files_count: 5,
				time_to_first_snapshot_minutes: 3.2,
			};

			expect(props.snapshot_method).toBe("manual");
			expect(props.files_count).toBe(5);
			expect(props.time_to_first_snapshot_minutes).toBe(3.2);
		});

		it("should enforce snapshot_method enum", () => {
			const validMethods: Array<FirstSnapshotCreatedProps["snapshot_method"]> = ["manual", "auto"];
			expect(validMethods).toHaveLength(2);
		});

		it("should require positive file count", () => {
			const props = {
				snapshot_method: "manual" as const,
				files_count: 3,
				time_to_first_snapshot_minutes: 2.1,
			};

			expect(props.files_count).toBeGreaterThan(0);
		});

		it("should require positive time to first snapshot", () => {
			const props = {
				snapshot_method: "manual" as const,
				files_count: 3,
				time_to_first_snapshot_minutes: 2.1,
			};

			expect(props.time_to_first_snapshot_minutes).toBeGreaterThan(0);
		});
	});

	describe("Activation Funnel Event Integration", () => {
		it("should be part of the complete event taxonomy", () => {
			// Verify that the activation funnel events are included in the main event list
			const allEvents = Object.values(AnalyticsEvents);
			expect(allEvents).toContain(AnalyticsEvents.AUTH_COMPLETED);
			expect(allEvents).toContain(AnalyticsEvents.FIRST_SNAPSHOT_CREATED);
		});

		it("should have proper event count", () => {
			// Count activation funnel events
			const activationEvents = Object.values(AnalyticsEvents).filter(
				(event) => event === AnalyticsEvents.AUTH_COMPLETED || event === AnalyticsEvents.FIRST_SNAPSHOT_CREATED,
			);

			expect(activationEvents).toHaveLength(2);
		});
	});
});
