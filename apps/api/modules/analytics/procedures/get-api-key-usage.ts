import { ORPCError } from "@orpc/client";
import { apiKeyUsage } from "@snapback/platform";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
import { TelemetryQueryOptionsSchema } from "../types";

export const getApiKeyUsage = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/api-key-usage",
		tags: ["Analytics"],
		summary: "Get API key usage with filtering",
		description: "Retrieve API key usage telemetry data with optional filtering by API key and date range",
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

			if (input.apiKeyId) {
				conditions.push(eq(apiKeyUsage.apiKeyId, input.apiKeyId));
			}

			if (input.startDate && input.endDate) {
				conditions.push(gte(apiKeyUsage.timestamp, input.startDate));
				conditions.push(lte(apiKeyUsage.timestamp, input.endDate));
			}

			// Use the fully constructed query instead of dynamic chaining which loses types
			// This avoids 'as any' casting by constructing the chain step-by-step
			let query = getDb().select().from(apiKeyUsage).$dynamic();

			if (conditions.length > 0) {
				query = query.where(and(...conditions));
			}

			query = query.orderBy(desc(apiKeyUsage.timestamp));

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
				message: "Failed to fetch API key usage",
			});
		}
	});
