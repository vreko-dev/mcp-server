import { ORPCError } from "@orpc/client";
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

			let query = "SELECT * FROM daily_metrics";
			const params: (string | number)[] = [];

			query += " ORDER BY date DESC";

			if (input.limit) {
				query += " LIMIT ?";
				params.push(input.limit);
			}

			if (input.offset) {
				query += " OFFSET ?";
				params.push(input.offset);
			}

			// Execute the query
			const results = await getDb().execute(query, params);
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
