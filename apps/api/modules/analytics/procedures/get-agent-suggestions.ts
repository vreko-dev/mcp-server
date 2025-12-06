import { ORPCError } from "@orpc/client";
import { agentSuggestions } from "@snapback/platform";
import { type SQL, and, desc, eq, gte, lte } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";
import { TelemetryQueryOptionsSchema } from "../types";

export const getAgentSuggestions = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/agent-suggestions",
		tags: ["Analytics"],
		summary: "Get agent suggestions with filtering",
		description:
			"Retrieve agent suggestion telemetry data with optional filtering by user, API key, session, and date range",
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
				conditions.push(eq(agentSuggestions.userId, input.userId));
			}

			if (input.apiKeyId) {
				conditions.push(eq(agentSuggestions.apiKeyId, input.apiKeyId));
			}

			if (input.sessionId) {
				conditions.push(eq(agentSuggestions.sessionId, input.sessionId));
			}

			if (input.startDate && input.endDate) {
				conditions.push(gte(agentSuggestions.timestamp, input.startDate));
				conditions.push(lte(agentSuggestions.timestamp, input.endDate));
			}

			// Use the fully constructed query instead of dynamic chaining which loses types
			// This avoids 'as any' casting by constructing the chain step-by-step
			let query = getDb().select().from(agentSuggestions).$dynamic();

			if (conditions.length > 0) {
				query = query.where(and(...conditions));
			}

			query = query.orderBy(desc(agentSuggestions.timestamp));

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
				message: "Failed to fetch agent suggestions",
			});
		}
	});
