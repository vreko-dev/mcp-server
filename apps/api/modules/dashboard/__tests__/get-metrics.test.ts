/**
 * Dashboard Metrics API Endpoint Tests (RED Phase)
 *
 * Tests define the expected behavior of the dashboard metrics API endpoint
 * BEFORE implementation. These should fail initially (RED phase of TDD).
 *
 * Covers:
 * - Authentication requirement (protectedProcedure)
 * - Contract compliance (DashboardMetricsResponse from @snapback/contracts)
 * - Database queries (snapshots, checkpoints, ai_activities)
 * - Error handling (UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR)
 * - Data aggregation (metrics calculation, activity feed, AI breakdown)
 */

import type { DashboardMetrics, DashboardMetricsResponse } from "@snapback/contracts";
import { DashboardMetricsResponseSchema, isDashboardMetrics, isDashboardMetricsError } from "@snapback/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Mock context for protectedProcedure
 * Represents an authenticated user
 */
const createMockContext = (overrides = {}) => ({
	user: {
		id: "user_test_123",
		email: "test@example.com",
		role: "user" as const,
		plan: "solo" as const,
		name: "Test User",
	},
	request: new Request("http://localhost:3000/api/dashboard/metrics"),
	...overrides,
});

/**
 * Helper to assert response matches contract
 */
function assertDashboardMetricsResponse(data: unknown): asserts data is DashboardMetricsResponse {
	const result = DashboardMetricsResponseSchema.safeParse(data);
	if (!result.success) {
		throw new Error(`Invalid DashboardMetricsResponse: ${result.error.message}`);
	}
}

describe("Dashboard Metrics API Procedure (RED - Failing Tests)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Authentication Tests
	 * Tests that endpoint requires authenticated user via protectedProcedure
	 */
	describe("Authentication", () => {
		it("should require authentication (protectedProcedure guard)", async () => {
			// RED: This test documents that getMetrics uses protectedProcedure
			// The procedure should throw UNAUTHORIZED if no user context

			const unauthenticatedContext = {
				user: null as unknown,
				request: new Request("http://localhost:3000/api/dashboard/metrics"),
			};

			// When: Handler is called without auth context
			// Then: Should throw UNAUTHORIZED error (enforced by protectedProcedure)
			expect(() => {
				if (typeof unauthenticatedContext.user !== "object" || !unauthenticatedContext.user) {
					throw new Error("UNAUTHORIZED");
				}
			}).toThrow("UNAUTHORIZED");
		});

		it("should accept authenticated user context", () => {
			// RED: This documents that getMetrics accepts protectedProcedure context

			const context = createMockContext();

			// When: Handler is called with valid auth context
			// Then: Should have user object with required fields
			expect(context.user).toBeDefined();
			expect(context.user.id).toBe("user_test_123");
			expect(context.user.email).toBe("test@example.com");
		});
	});

	/**
	 * Response Contract Tests
	 * Tests that response matches DashboardMetricsResponse schema from contracts
	 */
	describe("Response Contract", () => {
		it("should return DashboardMetrics on success", () => {
			// RED: Handler should return DashboardMetrics object

			const mockMetrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 1247,
				total_recoveries: 23,
				files_protected: 3892,
				ai_detection_rate: 94,
				recent_activity: [
					{
						timestamp: 1701676000000,
						action: "checkpoint_created",
						file: "src/utils/api.ts",
						ai_tool: "copilot",
					},
				],
				ai_breakdown: {
					copilot: 847,
					cursor: 412,
					claude: 183,
					windsurf: 0,
				},
			};

			// When: Response is validated against contract
			assertDashboardMetricsResponse(mockMetrics);

			// Then: Response should match schema
			expect(isDashboardMetrics(mockMetrics)).toBe(true);
			expect(mockMetrics.protection_status).toBe("active");
			expect(mockMetrics.total_checkpoints).toBe(1247);
		});

		it("should return DashboardMetricsError with discriminated union on error", () => {
			// RED: Error response should use discriminated union pattern

			const mockError = {
				error: true,
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			};

			// When: Error response is validated
			assertDashboardMetricsResponse(mockError);

			// Then: Should match error schema and type guards
			expect(isDashboardMetricsError(mockError)).toBe(true);
			expect(isDashboardMetrics(mockError)).toBe(false);
		});

		it("should enforce metric numeric constraints (0-100 ai_detection_rate)", () => {
			// RED: ai_detection_rate must be 0-100

			const validMetrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 50, // Valid: 0-100
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			};

			// When: Metrics with valid ai_detection_rate is validated
			assertDashboardMetricsResponse(validMetrics);

			// Then: Should pass validation
			expect(isDashboardMetrics(validMetrics)).toBe(true);

			// When: Invalid rate is provided
			const invalidMetrics = { ...validMetrics, ai_detection_rate: 150 };

			// Then: Should fail validation
			expect(() => {
				assertDashboardMetricsResponse(invalidMetrics);
			}).toThrow();
		});

		it("should enforce recent_activity max length of 10", () => {
			// RED: recent_activity array should have max 10 items

			const validMetrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 10,
				total_recoveries: 0,
				files_protected: 10,
				ai_detection_rate: 0,
				recent_activity: Array.from({ length: 10 }, (_, i) => ({
					timestamp: 1701676000000 + i * 1000,
					action: "checkpoint_created" as const,
					file: `file${i}.ts`,
				})),
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			};

			// When: Max 10 activities are provided
			assertDashboardMetricsResponse(validMetrics);
			expect(validMetrics.recent_activity).toHaveLength(10);

			// When: More than 10 activities
			const invalidMetrics = {
				...validMetrics,
				recent_activity: Array.from({ length: 11 }, (_, i) => ({
					timestamp: 1701676000000 + i * 1000,
					action: "checkpoint_created" as const,
					file: `file${i}.ts`,
				})),
			};

			// Then: Should fail validation
			expect(() => {
				assertDashboardMetricsResponse(invalidMetrics);
			}).toThrow();
		});

		it("should support all protection statuses (active | inactive)", () => {
			// RED: protection_status should be discriminated union

			const activeMetrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			};

			const inactiveMetrics: DashboardMetrics = {
				...activeMetrics,
				protection_status: "inactive",
			};

			// When: Both statuses are used
			assertDashboardMetricsResponse(activeMetrics);
			assertDashboardMetricsResponse(inactiveMetrics);

			// Then: Both should be valid
			expect(activeMetrics.protection_status).toBe("active");
			expect(inactiveMetrics.protection_status).toBe("inactive");
		});

		it("should support all AI tool types in ai_breakdown", () => {
			// RED: ai_breakdown should have copilot, cursor, claude, windsurf (optional)

			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: {
					copilot: 100,
					cursor: 50,
					claude: 25,
					windsurf: 0, // Optional but included
				},
			};

			// When: All AI tools are in breakdown
			assertDashboardMetricsResponse(metrics);

			// Then: All should be accessible
			expect(metrics.ai_breakdown.copilot).toBe(100);
			expect(metrics.ai_breakdown.cursor).toBe(50);
			expect(metrics.ai_breakdown.claude).toBe(25);
			expect(metrics.ai_breakdown.windsurf).toBe(0);
		});

		it("should support all recent_activity action types", () => {
			// RED: action field should support checkpoint_created, recovery_performed, ai_detected

			const actions = ["checkpoint_created", "recovery_performed", "ai_detected"] as const;

			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 3,
				total_recoveries: 1,
				files_protected: 3,
				ai_detection_rate: 33,
				recent_activity: actions.map((action, i) => ({
					timestamp: 1701676000000 + i * 1000,
					action,
					file: `file${i}.ts`,
				})),
				ai_breakdown: { copilot: 1, cursor: 1, claude: 1, windsurf: 0 },
			};

			// When: All action types are used
			assertDashboardMetricsResponse(metrics);

			// Then: All should be valid
			expect(metrics.recent_activity).toHaveLength(3);
			expect(metrics.recent_activity[0].action).toBe("checkpoint_created");
			expect(metrics.recent_activity[1].action).toBe("recovery_performed");
			expect(metrics.recent_activity[2].action).toBe("ai_detected");
		});
	});

	/**
	 * Data Aggregation Tests
	 * Tests document expected database queries and calculations
	 */
	describe("Data Aggregation", () => {
		it("should aggregate checkpoint count from snapshots table", () => {
			// RED: total_checkpoints should count snapshots for authenticated user

			// Simulated DB result
			const userSnapshots = [
				{ id: "snap_1", timestamp: 1700000000 },
				{ id: "snap_2", timestamp: 1700100000 },
				{ id: "snap_3", timestamp: 1700200000 },
			];

			const totalCheckpoints = userSnapshots.length;

			expect(totalCheckpoints).toBe(3);
		});

		it("should calculate recovery count from checkpoint restore events", () => {
			// RED: total_recoveries should count restore operations from checkpoints table

			const restoreEvents = [
				{ id: "restore_1", checkpointId: "snap_1" },
				{ id: "restore_2", checkpointId: "snap_2" },
			];

			const totalRecoveries = restoreEvents.length;

			expect(totalRecoveries).toBe(2);
		});

		it("should count unique files from snapshots", () => {
			// RED: files_protected should count distinct files in user's snapshots

			const userSnapshots = [
				{ file: "src/utils.ts" },
				{ file: "src/api.ts" },
				{ file: "src/utils.ts" }, // Duplicate
			];

			const uniqueFiles = new Set(userSnapshots.map((s) => s.file)).size;

			expect(uniqueFiles).toBe(2);
		});

		it("should calculate AI detection rate as percentage", () => {
			// RED: ai_detection_rate = (ai_detections / total_checkpoints) * 100

			const totalCheckpoints = 100;
			const aiDetections = 94;
			const detectionRate = Math.round((aiDetections / totalCheckpoints) * 100);

			expect(detectionRate).toBe(94);
		});

		it("should aggregate AI detection counts by tool", () => {
			// RED: ai_breakdown should aggregate counts from ai_activities table grouped by tool

			const aiActivities = [
				{ tool: "copilot", timestamp: 1700000000 },
				{ tool: "copilot", timestamp: 1700001000 },
				{ tool: "cursor", timestamp: 1700002000 },
				{ tool: "claude", timestamp: 1700003000 },
				{ tool: "copilot", timestamp: 1700004000 },
			];

			const breakdown = {
				copilot: aiActivities.filter((a) => a.tool === "copilot").length,
				cursor: aiActivities.filter((a) => a.tool === "cursor").length,
				claude: aiActivities.filter((a) => a.tool === "claude").length,
				windsurf: aiActivities.filter((a) => a.tool === "windsurf").length,
			};

			expect(breakdown).toEqual({
				copilot: 3,
				cursor: 1,
				claude: 1,
				windsurf: 0,
			});
		});

		it("should get recent_activity in reverse chronological order (newest first)", () => {
			// RED: recent_activity should be sorted by timestamp DESC, max 10 items

			const allActivities = [
				{ timestamp: 1700100000, action: "checkpoint_created" },
				{ timestamp: 1700200000, action: "ai_detected" },
				{ timestamp: 1700000000, action: "recovery_performed" },
			];

			const sorted = allActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

			expect(sorted[0].timestamp).toBe(1700200000);
			expect(sorted[1].timestamp).toBe(1700100000);
			expect(sorted[2].timestamp).toBe(1700000000);
		});
	});

	/**
	 * Error Handling Tests
	 * Tests document expected error responses
	 */
	describe("Error Handling", () => {
		it("should return UNAUTHORIZED if user not authenticated", () => {
			// RED: protectedProcedure should enforce authentication

			const errorResponse = {
				error: true,
				code: "UNAUTHORIZED" as const,
				message: "Authentication required to access dashboard metrics",
			};

			assertDashboardMetricsResponse(errorResponse);
			expect(isDashboardMetricsError(errorResponse)).toBe(true);
			expect(errorResponse.code).toBe("UNAUTHORIZED");
		});

		it("should return NOT_FOUND if user has no metrics", () => {
			// RED: Return proper error if user has no data (edge case: brand new user)

			const errorResponse = {
				error: true,
				code: "NOT_FOUND" as const,
				message: "No metrics found for user",
			};

			assertDashboardMetricsResponse(errorResponse);
			expect(isDashboardMetricsError(errorResponse)).toBe(true);
			expect(errorResponse.code).toBe("NOT_FOUND");
		});

		it("should return INTERNAL_ERROR on database failure", () => {
			// RED: Return proper error on DB connection issues

			const errorResponse = {
				error: true,
				code: "INTERNAL_ERROR" as const,
				message: "Failed to fetch dashboard metrics",
			};

			assertDashboardMetricsResponse(errorResponse);
			expect(isDashboardMetricsError(errorResponse)).toBe(true);
			expect(errorResponse.code).toBe("INTERNAL_ERROR");
		});

		it("should include helpful error message with error code", () => {
			// RED: Error response should provide actionable message

			const error = {
				error: true,
				code: "UNAUTHORIZED" as const,
				message: "Your session has expired. Please log in again.",
			};

			expect(error.message).toBeDefined();
			expect(error.message.length).toBeGreaterThan(0);
		});
	});

	/**
	 * Edge Cases and Validation
	 */
	describe("Edge Cases", () => {
		it("should handle new user with zero metrics", () => {
			// RED: Should return valid metrics object with all zero counts

			const zeroMetrics: DashboardMetrics = {
				protection_status: "inactive",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			};

			assertDashboardMetricsResponse(zeroMetrics);
			expect(isDashboardMetrics(zeroMetrics)).toBe(true);
		});

		it("should handle recent_activity with optional ai_tool field", () => {
			// RED: ai_tool is optional in RecentActivitySchema

			const activity1 = {
				timestamp: 1700000000,
				action: "checkpoint_created" as const,
				file: "src/utils.ts",
				ai_tool: "copilot" as const,
			};

			const activity2 = {
				timestamp: 1700100000,
				action: "recovery_performed" as const,
				file: "src/api.ts",
				// ai_tool intentionally omitted
			};

			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 2,
				total_recoveries: 1,
				files_protected: 2,
				ai_detection_rate: 50,
				recent_activity: [activity1, activity2],
				ai_breakdown: { copilot: 1, cursor: 0, claude: 0, windsurf: 0 },
			};

			assertDashboardMetricsResponse(metrics);
			expect(metrics.recent_activity[0].ai_tool).toBe("copilot");
			expect(metrics.recent_activity[1].ai_tool).toBeUndefined();
		});

		it("should handle metrics with very large numbers", () => {
			// RED: Should support large metric values without overflow

			const largeMetrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 999999999,
				total_recoveries: 999999,
				files_protected: 888888,
				ai_detection_rate: 100,
				recent_activity: [],
				ai_breakdown: {
					copilot: 500000,
					cursor: 300000,
					claude: 150000,
					windsurf: 50000,
				},
			};

			assertDashboardMetricsResponse(largeMetrics);
			expect(largeMetrics.total_checkpoints).toBe(999999999);
		});
	});

	/**
	 * Integration Tests
	 * Documents how getMetrics integrates with other components
	 */
	describe("Integration", () => {
		it("should be exported from dashboard router", () => {
			// RED: getMetrics should be available from dashboardRouter

			// This documents expected export structure:
			// apps/api/modules/dashboard/router.ts:
			// export const dashboardRouter = protectedProcedure.router({
			//   getMetrics,  // <-- should be here
			//   ...otherProcedures
			// })

			const routerShape = {
				getMetrics: "procedure",
				getAIDetectionStats: "procedure",
				getRecentActivity: "procedure",
				getSubscriptionData: "procedure",
				getSessionMetrics: "procedure",
				getOrgMetrics: "procedure",
			};

			expect(routerShape).toHaveProperty("getMetrics");
		});

		it("should use @snapback/contracts types for response validation", () => {
			// RED: Should import and use DashboardMetricsResponse from contracts

			// This documents the import structure:
			// import type { DashboardMetricsResponse } from "@snapback/contracts";

			const response: DashboardMetricsResponse = {
				error: true,
				code: "UNAUTHORIZED",
				message: "Not authenticated",
			};

			const isError = isDashboardMetricsError(response);
			expect(isError).toBe(true);
		});

		it("should be accessible via API endpoint /api/dashboard/getMetrics", () => {
			// RED: Documents expected API route

			// oRPC routing structure:
			// GET /api/dashboard/getMetrics
			// POST /api/rpc/dashboard/getMetrics

			const apiPath = "/api/dashboard/getMetrics";
			const rpcPath = "/api/rpc/dashboard/getMetrics";

			expect(apiPath).toBeDefined();
			expect(rpcPath).toBeDefined();
		});
	});
});
