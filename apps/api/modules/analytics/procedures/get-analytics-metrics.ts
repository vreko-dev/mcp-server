/**
 * Get Analytics Metrics Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 */

import { ORPCError } from "@orpc/client";
import { protectedProcedure } from "@/orpc/procedures";
import { calculateAnalyticsMetrics } from "../services/analytics-service";
import { AnalyticsMetricsInputSchema } from "../types";

export const getAnalyticsMetrics = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/metrics",
		tags: ["Analytics"],
		summary: "Get aggregated analytics metrics",
		description: "Calculate and return aggregated analytics metrics for a given time period",
	})
	.input(AnalyticsMetricsInputSchema)
	.handler(async ({ input, context: _context }) => {
		try {
			const { startDate, endDate, userId } = input;

			// Delegate to service layer per C-002
			return await calculateAnalyticsMetrics({
				startDate,
				endDate,
				userId,
			});
		} catch (error) {
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to calculate analytics metrics",
			});
		}
	});
