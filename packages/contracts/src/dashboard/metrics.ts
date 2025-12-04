import { z } from "zod";

/**
 * Dashboard Metrics Contracts
 *
 * Type definitions for dashboard home page metrics display.
 * Uses discriminated unions for type safety and exhaustive pattern matching.
 *
 * Follows SnapBack TypeScript patterns:
 * - Discriminated unions (protection_status, action)
 * - Const assertions for readonly values
 * - Zod schemas for runtime validation
 */

/**
 * Protection status discriminated union
 * Enables type-safe rendering of status-specific UI
 */
export const PROTECTION_STATUSES = ["active", "inactive"] as const;
export type ProtectionStatus = (typeof PROTECTION_STATUSES)[number];

/**
 * Recent activity action discriminated union
 * Enables type-safe handling of different activity types
 */
export const RECENT_ACTIVITY_ACTIONS = [
	"checkpoint_created",
	"recovery_performed",
	"ai_detected",
] as const;
export type RecentActivityAction = (typeof RECENT_ACTIVITY_ACTIONS)[number];

/**
 * AI tool names for activity tracking
 */
export const AI_TOOLS = ["copilot", "cursor", "claude", "windsurf"] as const;
export type AITool = (typeof AI_TOOLS)[number];

/**
 * Recent activity entry schema
 * Represents a single action in the activity feed
 *
 * Example:
 * {
 *   timestamp: 1701676000000,
 *   action: "recovery_performed",
 *   file: "src/utils/api.ts",
 *   ai_tool: "copilot"
 * }
 */
export const RecentActivitySchema = z.object({
	timestamp: z.number().int().positive(),
	action: z.enum(RECENT_ACTIVITY_ACTIONS),
	file: z.string().min(1),
	ai_tool: z.enum(AI_TOOLS).optional(),
});
export type RecentActivity = z.infer<typeof RecentActivitySchema>;

/**
 * AI activity breakdown by tool
 * Shows how many interactions detected per AI tool
 *
 * Example:
 * {
 *   copilot: 847,
 *   cursor: 412,
 *   claude: 183,
 *   windsurf: 0
 * }
 */
export const AIActivityBreakdownSchema = z.object({
	copilot: z.number().int().nonnegative(),
	cursor: z.number().int().nonnegative(),
	claude: z.number().int().nonnegative(),
	windsurf: z.number().int().nonnegative().optional(),
});
export type AIActivityBreakdown = z.infer<typeof AIActivityBreakdownSchema>;

/**
 * Dashboard metrics response
 * Complete metrics for dashboard home page display
 *
 * Properties:
 * - protection_status: Current protection state (active/inactive)
 * - total_checkpoints: Lifetime checkpoints created
 * - total_recoveries: Times user recovered from AI errors
 * - files_protected: Unique files with checkpoints
 * - ai_detection_rate: Percentage (0-100) of changes recognized as AI
 * - recent_activity: Last 10 actions (for activity feed)
 * - ai_breakdown: Detection count per AI tool
 *
 * Example response:
 * {
 *   protection_status: "active",
 *   total_checkpoints: 1247,
 *   total_recoveries: 23,
 *   files_protected: 3892,
 *   ai_detection_rate: 94,
 *   recent_activity: [
 *     {
 *       timestamp: 1701676000000,
 *       action: "checkpoint_created",
 *       file: "src/utils/api.ts",
 *       ai_tool: "copilot"
 *     }
 *   ],
 *   ai_breakdown: {
 *     copilot: 847,
 *     cursor: 412,
 *     claude: 183
 *   }
 * }
 */
export const DashboardMetricsSchema = z.object({
	protection_status: z.enum(PROTECTION_STATUSES),
	total_checkpoints: z.number().int().nonnegative(),
	total_recoveries: z.number().int().nonnegative(),
	files_protected: z.number().int().nonnegative(),
	ai_detection_rate: z.number().min(0).max(100),
	recent_activity: z.array(RecentActivitySchema).max(10),
	ai_breakdown: AIActivityBreakdownSchema,
});
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

/**
 * Error response for dashboard metrics endpoint
 * Discriminated union for safe error handling
 */
export const DashboardMetricsErrorSchema = z.object({
	error: z.literal(true),
	code: z.enum(["UNAUTHORIZED", "NOT_FOUND", "INTERNAL_ERROR"]),
	message: z.string(),
});
export type DashboardMetricsError = z.infer<typeof DashboardMetricsErrorSchema>;

/**
 * Dashboard API response (success | error)
 * Type guard helpers for pattern matching
 */
export const DashboardMetricsResponseSchema = z.union([
	DashboardMetricsSchema,
	DashboardMetricsErrorSchema,
]);
export type DashboardMetricsResponse = z.infer<typeof DashboardMetricsResponseSchema>;

/**
 * Type guards for discriminated unions
 * Enables safe pattern matching in UI components
 */
export function isDashboardMetrics(
	response: DashboardMetricsResponse
): response is DashboardMetrics {
	return !("error" in response) || response.error !== true;
}

export function isDashboardMetricsError(
	response: DashboardMetricsResponse
): response is DashboardMetricsError {
	return "error" in response && response.error === true;
}

export function isProtectionActive(metrics: DashboardMetrics): boolean {
	return metrics.protection_status === "active";
}

export function isProtectionInactive(metrics: DashboardMetrics): boolean {
	return metrics.protection_status === "inactive";
}
