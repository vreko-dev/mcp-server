import { ORPCError } from "@orpc/client";
import { policyEvaluations } from "@snapback/platform";
import { type SQL, and, desc, eq, gte, lte } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";
import { TelemetryQueryOptionsSchema } from "../types";

export const getPolicyEvaluations = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/policy-evaluations",
		tags: ["Analytics"],
		summary: "Get policy evaluations with filtering",
		description:
			"Retrieve policy evaluation telemetry data with optional filtering by user, API key, session, and date range",
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

			const conditions: SQL[] = [];

			if (input.userId) {
				conditions.push(eq(policyEvaluations.userId, input.userId));
			}

			if (input.apiKeyId) {
				conditions.push(eq(policyEvaluations.apiKeyId, input.apiKeyId));
			}

			if (input.sessionId) {
				conditions.push(eq(policyEvaluations.sessionId, input.sessionId));
			}

			if (input.startDate && input.endDate) {
				conditions.push(gte(policyEvaluations.timestamp, input.startDate));
				conditions.push(lte(policyEvaluations.timestamp, input.endDate));
			}

			// Use the fully constructed query instead of dynamic chaining which loses types
			// This avoids 'as any' casting by constructing the chain step-by-step
			let query = getDb().select().from(policyEvaluations).$dynamic();

			if (conditions.length > 0) {
				query = query.where(and(...conditions));
			}

			query = query.orderBy(desc(policyEvaluations.timestamp));

			if (input.limit) {
				query = query.limit(input.limit);
			}

			if (input.offset) {
				query = query.offset(input.offset);
			}

			const results = await query.execute();
			return results;
		} catch (error) {
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch policy evaluations",
			});
		}
	});
