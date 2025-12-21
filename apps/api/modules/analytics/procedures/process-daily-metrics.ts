import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { adminProcedure } from "@/orpc/procedures";
import { processDailyOrgMetrics } from "../services/analytics-service";

/**
 * Process daily metrics for all organizations
 * This job runs nightly to aggregate data from various sources into the org_daily_metrics table
 */
export const processDailyMetrics = adminProcedure
	.route({
		method: "POST",
		path: "/analytics/process-daily-metrics",
		tags: ["Analytics"],
		summary: "Process daily metrics",
	})
	.input(
		z.object({
			date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
			organizationId: z.string().optional(), // If provided, only process for this org
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			processedOrgs: z.number(),
			message: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		try {
			// Delegate to service layer per C-002
			return await processDailyOrgMetrics(input);
		} catch (error) {
			logger.error(`Failed to process daily metrics: ${error instanceof Error ? error.message : String(error)}`, {
				error,
				input,
			});
			return {
				success: false,
				processedOrgs: 0,
				message: `Failed to process daily metrics: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	});
