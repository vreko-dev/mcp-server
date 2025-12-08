import { ORPCError } from "@orpc/client";
import { snapshots } from "@snapback/platform";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
import { TelemetryQueryOptionsSchema } from "../types";

export const getSnapshots = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/snapshots",
		tags: ["Analytics"],
		summary: "Get snapshots with filtering",
		description:
			"Retrieve snapshot data with optional filtering by user, API key, and date range",
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
				conditions.push(eq(snapshots.userId, input.userId));
			}

			if (input.apiKeyId) {
				conditions.push(eq(snapshots.apiKeyId, input.apiKeyId));
			}

			if (input.startDate && input.endDate) {
				conditions.push(gte(snapshots.createdAt, input.startDate));
				conditions.push(lte(snapshots.createdAt, input.endDate));
			}

			// Use the fully constructed query instead of dynamic chaining which loses types
			// This avoids 'as any' casting by constructing the chain step-by-step
			let query = getDb().select().from(snapshots).$dynamic();

			if (conditions.length > 0) {
				query = query.where(and(...conditions));
			}

			query = query.orderBy(desc(snapshots.createdAt));

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
				message: "Failed to fetch snapshots",
			});
		}
	});
