import { ORPCError } from "@orpc/client";
import { loops } from "@snapback/platform";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";
import { TelemetryQueryOptionsSchema } from "../types";

export const getLoops = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/loops",
		tags: ["Analytics"],
		summary: "Get loops with filtering",
		description:
			"Retrieve loop telemetry data with optional filtering by user, API key, session, and date range",
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
				conditions.push(eq(loops.userId, input.userId));
			}

			if (input.apiKeyId) {
				conditions.push(eq(loops.apiKeyId, input.apiKeyId));
			}

			if (input.sessionId) {
				conditions.push(eq(loops.sessionId, input.sessionId));
			}

			if (input.startDate && input.endDate) {
				conditions.push(gte(loops.timestamp, input.startDate));
				conditions.push(lte(loops.timestamp, input.endDate));
			}

			let query = getDb().select().from(loops);

			if (conditions.length > 0) {
				query = query.where(and(...conditions)) as any;
			}

			query = query.orderBy(desc(loops.timestamp)) as any;

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
				message: "Failed to fetch loops",
			});
		}
	});
