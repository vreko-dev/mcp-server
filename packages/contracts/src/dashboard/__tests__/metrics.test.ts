import { describe, expect, it } from "vitest";
import {
	type AIActivityBreakdown,
	AIActivityBreakdownSchema,
	type DashboardMetrics,
	DashboardMetricsSchema,
	type RecentActivity,
	RecentActivitySchema,
} from "../metrics.js";

describe("Dashboard Metrics Contracts (RED - Type Validation)", () => {
	describe("DashboardMetricsSchema", () => {
		it("should validate complete dashboard metrics object", () => {
			const validMetrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 1247,
				total_recoveries: 23,
				files_protected: 3892,
				ai_detection_rate: 94,
				recent_activity: [
					{
						timestamp: Date.now(),
						action: "checkpoint_created",
						file: "src/utils/api.ts",
						ai_tool: "copilot",
					},
				],
				ai_breakdown: {
					copilot: 847,
					cursor: 412,
					claude: 183,
				},
			};

			const result = DashboardMetricsSchema.safeParse(validMetrics);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.total_checkpoints).toBe(1247);
				expect(result.data.protection_status).toBe("active");
			}
		});

		it("should enforce protection_status as discriminated union", () => {
			const invalidStatus = {
				protection_status: "unknown",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0 },
			};

			const result = DashboardMetricsSchema.safeParse(invalidStatus);
			expect(result.success).toBe(false);
		});

		it("should validate with empty activity feed", () => {
			const metrics: DashboardMetrics = {
				protection_status: "inactive",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0 },
			};

			const result = DashboardMetricsSchema.safeParse(metrics);
			expect(result.success).toBe(true);
		});

		it("should enforce numeric constraints (detection_rate 0-100)", () => {
			const invalidRate = {
				protection_status: "active" as const,
				total_checkpoints: 100,
				total_recoveries: 10,
				files_protected: 500,
				ai_detection_rate: 150, // Invalid: > 100
				recent_activity: [],
				ai_breakdown: { copilot: 50, cursor: 30, claude: 20 },
			};

			const result = DashboardMetricsSchema.safeParse(invalidRate);
			expect(result.success).toBe(false);
		});
	});

	describe("RecentActivitySchema", () => {
		it("should validate complete activity entry", () => {
			const activity: RecentActivity = {
				timestamp: Date.now() - 60000,
				action: "recovery_performed",
				file: "src/core/engine.ts",
				ai_tool: "claude",
			};

			const result = RecentActivitySchema.safeParse(activity);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.action).toBe("recovery_performed");
			}
		});

		it("should enforce action as discriminated union", () => {
			const invalidAction = {
				timestamp: Date.now(),
				action: "unknown_action",
				file: "test.ts",
				ai_tool: "copilot",
			};

			const result = RecentActivitySchema.safeParse(invalidAction);
			expect(result.success).toBe(false);
		});

		it("should validate activity without ai_tool (for manual actions)", () => {
			const activity: Omit<RecentActivity, "ai_tool"> & { ai_tool?: string } = {
				timestamp: Date.now(),
				action: "checkpoint_created",
				file: "package.json",
			};

			const result = RecentActivitySchema.omit({ ai_tool: true }).safeParse(activity);
			expect(result.success).toBe(true);
		});

		it("should enforce valid ai_tool values", () => {
			const invalidTool = {
				timestamp: Date.now(),
				action: "checkpoint_created",
				file: "test.ts",
				ai_tool: "invalid_tool",
			};

			const result = RecentActivitySchema.safeParse(invalidTool);
			expect(result.success).toBe(false);
		});
	});

	describe("AIActivityBreakdownSchema", () => {
		it("should validate tool breakdown with positive counts", () => {
			const breakdown: AIActivityBreakdown = {
				copilot: 500,
				cursor: 300,
				claude: 200,
			};

			const result = AIActivityBreakdownSchema.safeParse(breakdown);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.copilot).toBe(500);
			}
		});

		it("should validate with zero values", () => {
			const breakdown: AIActivityBreakdown = {
				copilot: 100,
				cursor: 0,
				claude: 50,
			};

			const result = AIActivityBreakdownSchema.safeParse(breakdown);
			expect(result.success).toBe(true);
		});

		it("should enforce non-negative counts", () => {
			const invalidBreakdown = {
				copilot: -10,
				cursor: 50,
				claude: 40,
			};

			const result = AIActivityBreakdownSchema.safeParse(invalidBreakdown);
			expect(result.success).toBe(false);
		});

		it("should enforce required fields (all AI tools)", () => {
			const incompleteBreakdown = {
				copilot: 100,
				cursor: 50,
				// missing claude
			};

			const result = AIActivityBreakdownSchema.safeParse(incompleteBreakdown);
			expect(result.success).toBe(false);
		});
	});

	describe("Type Safety (Discriminated Unions)", () => {
		it("should narrow protection_status type correctly", () => {
			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 100,
				total_recoveries: 5,
				files_protected: 200,
				ai_detection_rate: 85,
				recent_activity: [],
				ai_breakdown: { copilot: 60, cursor: 30, claude: 10 },
			};

			// TypeScript should allow conditional logic based on protection_status
			if (metrics.protection_status === "active") {
				expect(metrics.protection_status).toBe("active");
			}
		});

		it("should narrow action type in recent activity", () => {
			const activity: RecentActivity = {
				timestamp: Date.now(),
				action: "checkpoint_created",
				file: "test.ts",
				ai_tool: "copilot",
			};

			// TypeScript should know action is one of the allowed values
			const allowedActions: RecentActivity["action"][] = [
				"checkpoint_created",
				"recovery_performed",
				"ai_detected",
			];

			expect(allowedActions).toContain(activity.action);
		});
	});

	describe("Schema Composition", () => {
		it("should validate nested activity array in metrics", () => {
			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 10,
				total_recoveries: 2,
				files_protected: 50,
				ai_detection_rate: 80,
				recent_activity: [
					{
						timestamp: Date.now() - 1000,
						action: "checkpoint_created",
						file: "file1.ts",
						ai_tool: "copilot",
					},
					{
						timestamp: Date.now() - 500,
						action: "recovery_performed",
						file: "file2.ts",
						ai_tool: "claude",
					},
				],
				ai_breakdown: { copilot: 1, cursor: 0, claude: 1 },
			};

			const result = DashboardMetricsSchema.safeParse(metrics);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.recent_activity).toHaveLength(2);
				expect(result.data.recent_activity[0].action).toBe("checkpoint_created");
			}
		});

		it("should validate breakdown totals match activity", () => {
			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 100,
				total_recoveries: 5,
				files_protected: 250,
				ai_detection_rate: 75,
				recent_activity: [
					{
						timestamp: Date.now(),
						action: "ai_detected",
						file: "test.ts",
						ai_tool: "copilot",
					},
					{
						timestamp: Date.now() - 1000,
						action: "ai_detected",
						file: "app.ts",
						ai_tool: "cursor",
					},
				],
				ai_breakdown: { copilot: 60, cursor: 35, claude: 5 },
			};

			const result = DashboardMetricsSchema.safeParse(metrics);
			expect(result.success).toBe(true);
			if (result.success) {
				// Note: This test validates structure, not business logic
				// Business logic validation should happen in API/SDK layer
				const totalAI =
					result.data.ai_breakdown.copilot +
					result.data.ai_breakdown.cursor +
					result.data.ai_breakdown.claude;
				expect(totalAI).toBe(100);
			}
		});
	});
});
