import { ORPCError } from "@orpc/client";
import { postAcceptOutcomes } from "@snapback/platform";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";
import { TelemetryQueryOptionsSchema } from "../types";

export const getPostAcceptOutcomes = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/post-accept-outcomes",
		tags: ["Analytics"],
		summary: "Get post-accept outcomes with filtering",
		description:
			"Retrieve post-accept outcome telemetry data with optional filtering by user, API key, and date range",
	})
	.input(TelemetryQueryOptionsSchema)
	.handler(async ({ input, context: _context }) => {
		try {
			const db = getDb();
			if (!db) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Database not available",
				});
			}

			const conditions: any[] = [];

			if (input.userId) {
				conditions.push(eq(postAcceptOutcomes.userId, input.userId));
			}

			if (input.apiKeyId) {
				conditions.push(eq(postAcceptOutcomes.apiKeyId, input.apiKeyId));
			}

			if (input.startDate && input.endDate) {
				conditions.push(gte(postAcceptOutcomes.timestamp, input.startDate));
				conditions.push(lte(postAcceptOutcomes.timestamp, input.endDate));
			}

			let query = getDb().select().from(postAcceptOutcomes);

			if (conditions.length > 0) {
				query = query.where(and(...conditions)) as any;
			}

			query = query.orderBy(desc(postAcceptOutcomes.timestamp)) as any;

			if (input.limit) {
				query = query.limit(input.limit) as any;
			}

			if (input.offset) {
				query = query.offset(input.offset) as any;
			}

			const results = await query.execute();
			return results;
		} catch (error) {
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch post-accept outcomes",
			});
		}
	});
