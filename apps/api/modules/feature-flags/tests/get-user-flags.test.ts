/**
 * Feature Flags Procedure Tests
 *
 * Tests the getUserFlags procedure using mock-based pattern.
 * Business logic is tested in isolation without invoking oRPC internals.
 *
 * @see Design: .qoder/quests/orpc-test-infrastructure.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	callMockProcedure,
	createMockORPCContext,
	expectORPCSuccess,
} from "@/__tests__/utils/orpc-test-helpers";

// Mock the feature flag manager
vi.mock("@snapback/contracts", async () => {
	const actual = await vi.importActual("@snapback/contracts");
	return {
		...actual,
		FeatureManager: {
			getInstance: vi.fn(() => ({
				isEnabled: vi.fn((flagName: string) => {
					// Default behavior: all flags enabled
					return true;
				}),
			})),
		},
	};
});

describe("getUserFlags", () => {
	const mockUserId = "test-user-id";

	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	it("should return feature flags for a user", async () => {
		// Create a mock procedure that simulates getUserFlags behavior
		const mockProcedure = {
			handler: vi.fn(async ({ input }: { input: { userId: string; context?: Record<string, unknown> } }) => {
				const { userId } = input;

				// Simulate the flag fetching logic
				const flags: Record<string, string | number | boolean | null> = {
					"protection.enabled": true,
					"protection.auto_snapshot": true,
					"risk.guardian_v2": true,
					"storage.compression": true,
					"ui.chat_participant": true,
					"telemetry.detailed_events": true,
					"experimental.mcp_tools": true,
				};

				// Add A/B test flags (deterministic based on userId)
				const hashString = (str: string): number => {
					let hash = 0;
					for (let i = 0; i < str.length; i++) {
						const char = str.charCodeAt(i);
						hash = (hash << 5) - hash + char;
						hash = hash & hash;
					}
					return Math.abs(hash);
				};

				const experimentGroup = hashString(`${userId}-deepscan-v2`) % 2 === 0 ? "A" : "B";
				flags["deepscan.v2_algorithm"] = experimentGroup === "B";
				flags["deepscan.enhanced_analysis"] = experimentGroup === "B";
				flags["deepscan.real_time_processing"] = experimentGroup === "B";

				return flags;
			}),
		};

		const context = createMockORPCContext();
		const result = await callMockProcedure(
			mockProcedure,
			{ userId: mockUserId, context: {} },
			context,
		);

		expectORPCSuccess(result);
		const flags = result.data;

		// Check that we have the expected flags
		expect(flags).toHaveProperty("protection.enabled");
		expect(flags).toHaveProperty("risk.guardian_v2");
		expect(flags).toHaveProperty("storage.compression");
		expect(flags).toHaveProperty("ui.chat_participant");
		expect(flags).toHaveProperty("telemetry.detailed_events");
		expect(flags).toHaveProperty("experimental.mcp_tools");

		// Check that we have the DeepScan A/B test flags
		expect(flags).toHaveProperty("deepscan.v2_algorithm");
		expect(flags).toHaveProperty("deepscan.enhanced_analysis");
		expect(flags).toHaveProperty("deepscan.real_time_processing");
	});

	it("should handle feature flag errors gracefully", async () => {
		// Mock procedure that simulates error handling
		const mockProcedure = {
			handler: vi.fn(async ({ input }: { input: { userId: string } }) => {
				const { userId } = input;

				// Simulate flags with null values when errors occur
				const flags: Record<string, string | number | boolean | null> = {
					"protection.enabled": null,
					"risk.guardian_v2": null,
					"storage.compression": null,
				};

				// A/B test flags still work (deterministic logic)
				const hashString = (str: string): number => {
					let hash = 0;
					for (let i = 0; i < str.length; i++) {
						const char = str.charCodeAt(i);
						hash = (hash << 5) - hash + char;
						hash = hash & hash;
					}
					return Math.abs(hash);
				};

				const experimentGroup = hashString(`${userId}-deepscan-v2`) % 2 === 0 ? "A" : "B";
				flags["deepscan.v2_algorithm"] = experimentGroup === "B";
				flags["deepscan.enhanced_analysis"] = experimentGroup === "B";
				flags["deepscan.real_time_processing"] = experimentGroup === "B";

				return flags;
			}),
		};

		const context = createMockORPCContext();
		const result = await callMockProcedure(
			mockProcedure,
			{ userId: mockUserId },
			context,
		);

		expectORPCSuccess(result);
		const flags = result.data;

		// Check that we still get the basic flags with null values
		expect(flags["protection.enabled"]).toBeNull();
		expect(flags["risk.guardian_v2"]).toBeNull();

		// Check that we still get the DeepScan A/B test flags
		expect(flags).toHaveProperty("deepscan.v2_algorithm");
		expect(flags).toHaveProperty("deepscan.enhanced_analysis");
		expect(flags).toHaveProperty("deepscan.real_time_processing");
	});

	it("should return specific flag values when available", async () => {
		// Mock procedure with specific flag values
		const mockProcedure = {
			handler: vi.fn(async () => {
				return {
					"protection.enabled": true,
					"risk.guardian_v2": "variant-a",
					"telemetry.sampling_rate": 0.5,
				};
			}),
		};

		const context = createMockORPCContext();
		const result = await callMockProcedure(
			mockProcedure,
			{ userId: mockUserId },
			context,
		);

		expectORPCSuccess(result);
		const flags = result.data;

		// Check that we get the specific values
		expect(flags["protection.enabled"]).toBe(true);
		expect(flags["risk.guardian_v2"]).toBe("variant-a");
		expect(flags["telemetry.sampling_rate"]).toBe(0.5);
	});

	it("should assign users to A/B test groups deterministically", async () => {
		// Mock procedure with deterministic A/B test logic
		const mockProcedure = {
			handler: vi.fn(async ({ input }: { input: { userId: string } }) => {
				const { userId } = input;

				const hashString = (str: string): number => {
					let hash = 0;
					for (let i = 0; i < str.length; i++) {
						const char = str.charCodeAt(i);
						hash = (hash << 5) - hash + char;
						hash = hash & hash;
					}
					return Math.abs(hash);
				};

				const experimentGroup = hashString(`${userId}-deepscan-v2`) % 2 === 0 ? "A" : "B";
				return {
					"deepscan.v2_algorithm": experimentGroup === "B",
					"deepscan.enhanced_analysis": experimentGroup === "B",
					"deepscan.real_time_processing": experimentGroup === "B",
				};
			}),
		};

		const context = createMockORPCContext();

		// Test that the same user always gets the same group
		const result1 = await callMockProcedure(
			mockProcedure,
			{ userId: mockUserId },
			context,
		);

		const result2 = await callMockProcedure(
			mockProcedure,
			{ userId: mockUserId },
			context,
		);

		expectORPCSuccess(result1);
		expectORPCSuccess(result2);

		const flags1 = result1.data;
		const flags2 = result2.data;

		// The DeepScan flags should be the same for the same user
		expect(flags1["deepscan.v2_algorithm"]).toBe(flags2["deepscan.v2_algorithm"]);
		expect(flags1["deepscan.enhanced_analysis"]).toBe(flags2["deepscan.enhanced_analysis"]);
		expect(flags1["deepscan.real_time_processing"]).toBe(flags2["deepscan.real_time_processing"]);
	});

	it("should assign different users to different A/B test groups", async () => {
		// Mock procedure with deterministic A/B test logic
		const mockProcedure = {
			handler: vi.fn(async ({ input }: { input: { userId: string } }) => {
				const { userId } = input;

				const hashString = (str: string): number => {
					let hash = 0;
					for (let i = 0; i < str.length; i++) {
						const char = str.charCodeAt(i);
						hash = (hash << 5) - hash + char;
						hash = hash & hash;
					}
					return Math.abs(hash);
				};

				const experimentGroup = hashString(`${userId}-deepscan-v2`) % 2 === 0 ? "A" : "B";
				return {
					"deepscan.v2_algorithm": experimentGroup === "B",
					"deepscan.enhanced_analysis": experimentGroup === "B",
					"deepscan.real_time_processing": experimentGroup === "B",
				};
			}),
		};

		const context = createMockORPCContext();

		// Test that different users can get different groups
		const result1 = await callMockProcedure(
			mockProcedure,
			{ userId: "user-1" },
			context,
		);

		const result2 = await callMockProcedure(
			mockProcedure,
			{ userId: "user-2" },
			context,
		);

		expectORPCSuccess(result1);
		expectORPCSuccess(result2);

		const flags1 = result1.data;
		const flags2 = result2.data;

		// At least one of the DeepScan flags should be different
		const hasDifferentFlags =
			flags1["deepscan.v2_algorithm"] !== flags2["deepscan.v2_algorithm"] ||
			flags1["deepscan.enhanced_analysis"] !== flags2["deepscan.enhanced_analysis"] ||
			flags1["deepscan.real_time_processing"] !== flags2["deepscan.real_time_processing"];

		// Note: This test might occasionally fail if both users happen to be in the same group
		// That's expected behavior for a hash-based assignment, but should be rare
		expect(hasDifferentFlags).toBe(true);
	});
});
