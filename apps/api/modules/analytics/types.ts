import { z } from "zod";

/**
 * Shared telemetry query options schema
 */
export const TelemetryQueryOptionsSchema = z.object({
	limit: z.number().int().positive().optional().describe("Maximum number of records to return"),
	offset: z.number().int().nonnegative().optional().describe("Number of records to skip"),
	startDate: z.coerce.date().optional().describe("Filter by start date"),
	endDate: z.coerce.date().optional().describe("Filter by end date"),
	userId: z.string().optional().describe("Filter by user ID"),
	apiKeyId: z.string().optional().describe("Filter by API key ID"),
	sessionId: z.string().optional().describe("Filter by session ID"),
});

export type TelemetryQueryOptions = z.infer<typeof TelemetryQueryOptionsSchema>;

/**
 * Analytics metrics response schema
 */
export const AnalyticsMetricsSchema = z.object({
	totalSuggestions: z.number().int().nonnegative(),
	acceptedSuggestions: z.number().int().nonnegative(),
	dismissedSuggestions: z.number().int().nonnegative(),
	policyViolations: z.number().int().nonnegative(),
	totalLoops: z.number().int().nonnegative(),
	successfulLoops: z.number().int().nonnegative(),
	feedbackCount: z.number().int().nonnegative(),
	avgTimeToEditMs: z.number().optional(),
	avgTimeToSubmitMs: z.number().optional(),
});

export type AnalyticsMetrics = z.infer<typeof AnalyticsMetricsSchema>;

/**
 * Analytics metrics input schema
 */
export const AnalyticsMetricsInputSchema = z.object({
	startDate: z.coerce.date().describe("Start date for metrics calculation"),
	endDate: z.coerce.date().describe("End date for metrics calculation"),
	userId: z.string().optional().describe("Optional user ID filter"),
});

export type AnalyticsMetricsInput = z.infer<typeof AnalyticsMetricsInputSchema>;
