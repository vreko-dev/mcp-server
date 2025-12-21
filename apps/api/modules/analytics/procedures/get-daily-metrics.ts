import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDailyMetricsData } from "../services/analytics-service";

const GetDailyMetricsInputSchema = z.object({
	limit: z.number().int().positive().optional().describe("Maximum number of records to return"),
	offset: z.number().int().nonnegative().optional().describe("Number of records to skip"),
});

export const getDailyMetrics = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/daily-metrics",
		tags: ["Analytics"],
		summary: "Get daily metrics",
		description: "Retrieve aggregated daily metrics from the daily_metrics materialized view",
	})
	.input(GetDailyMetricsInputSchema)
	.handler(async ({ input, context: _context }) => {
		try {
			// Delegate to service layer per C-002
			return await getDailyMetricsData(input);
		} catch (error) {
			logger.error("Failed to fetch daily metrics", { error });
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch daily metrics",
			});
		}
	});
