import { ORPCError } from "@orpc/client";
import { feedback } from "@snapback/platform";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";
import { TelemetryQueryOptionsSchema } from "../types";

export const getFeedback = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/feedback",
		tags: ["Analytics"],
		summary: "Get feedback with filtering",
		description:
			"Retrieve feedback telemetry data with optional filtering by user, API key, session, and date range",
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
				conditions.push(eq(feedback.userId, input.userId));
			}

			if (input.apiKeyId) {
				conditions.push(eq(feedback.apiKeyId, input.apiKeyId));
			}

			if (input.sessionId) {
				conditions.push(eq(feedback.sessionId, input.sessionId));
			}

			if (input.startDate && input.endDate) {
				conditions.push(gte(feedback.timestamp, input.startDate));
				conditions.push(lte(feedback.timestamp, input.endDate));
			}

			let query = getDb().select().from(feedback);

			if (conditions.length > 0) {
				query = query.where(and(...conditions)) as any;
			}

			query = query.orderBy(desc(feedback.timestamp)) as any;

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
				message: "Failed to fetch feedback",
			});
		}
	});
