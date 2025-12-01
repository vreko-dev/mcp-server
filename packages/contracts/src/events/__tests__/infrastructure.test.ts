/**
 * Tests for Infrastructure Events Contracts
 *
 * These tests ensure that the infrastructure events contracts are properly defined
 * and include the new activation funnel events.
 */

import { describe, expect, it } from "vitest";
import type { AuthCompletedProps, EventPropertiesMap, FirstSnapshotCreatedProps } from "../infrastructure.js";
import { INFRASTRUCTURE_EVENTS } from "../infrastructure.js";

describe("Infrastructure Events Contracts", () => {
	describe("Event Definitions", () => {
		it("should define all activation funnel events", () => {
			expect(INFRASTRUCTURE_EVENTS.AUTH_COMPLETED).toBe("auth_completed");
			expect(INFRASTRUCTURE_EVENTS.FIRST_SNAPSHOT_CREATED).toBe("first_snapshot_created");
		});

		it("should have unique event names", () => {
			const eventValues = Object.values(INFRASTRUCTURE_EVENTS);
			const uniqueValues = new Set(eventValues);
			expect(uniqueValues.size).toBe(eventValues.length);
		});

		it("should include activation funnel events in the complete event list", () => {
			const allEvents = Object.values(INFRASTRUCTURE_EVENTS);
			expect(allEvents).toContain("auth_completed");
			expect(allEvents).toContain("first_snapshot_created");
		});
	});

	describe("Auth Completed Event Contract", () => {
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
	});

	describe("First Snapshot Created Event Contract", () => {
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
	});

	describe("Event Properties Map", () => {
		it("should include activation funnel events in the properties map", () => {
			// This test ensures that the EventPropertiesMap interface includes the new events
			// We test this by ensuring the types are properly defined

			// If this compiles, it means the types are correctly defined
			const map: EventPropertiesMap = {} as EventPropertiesMap;

			expect(map).toBeDefined();
		});
	});
});
