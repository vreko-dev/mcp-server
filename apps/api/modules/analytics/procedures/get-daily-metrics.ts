import { ORPCError } from "@orpc/client";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

const GetDailyMetricsInputSchema = z.object({
	limit: z
		.number()
		.int()
		.positive()
		.optional()
		.describe("Maximum number of records to return"),
	offset: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe("Number of records to skip"),
});

export const getDailyMetrics = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/daily-metrics",
		tags: ["Analytics"],
		summary: "Get daily metrics",
		description:
			"Retrieve aggregated daily metrics from the daily_metrics materialized view",
	})
	.input(GetDailyMetricsInputSchema)
	.handler(async ({ input, context: _context }) => {
		try {
			const db = getDb();
			if (!db) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Database not available",
				});
			}

			// Build query with sql template
			const limit = input.limit ?? 100;
			const offset = input.offset ?? 0;

			// Execute the query
			const results = await db.execute(
				sql`SELECT * FROM daily_metrics ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`,
			);
			return results;
		} catch (error) {
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch daily metrics",
			});
		}
	});
