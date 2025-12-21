import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { protectedProcedure } from "@/orpc/procedures";
import { getPostAcceptOutcomesFiltered } from "../services/analytics-service";
import { TelemetryQueryOptionsSchema } from "../types";

export const getPostAcceptOutcomes = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/post-accept-outcomes",
		tags: ["Analytics"],
		summary: "Get post-accept outcomes with filtering",
		description:
			"Retrieve post-accept outcome telemetry data with optional filtering by user, API key, session, and date range",
	})
	.input(TelemetryQueryOptionsSchema)
	.handler(async ({ input, context: _context }) => {
		try {
			// Delegate to service layer per C-002
			return await getPostAcceptOutcomesFiltered(input);
		} catch (error) {
			logger.error("Failed to fetch post-accept outcomes", { error });
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch post-accept outcomes",
			});
		}
	});
