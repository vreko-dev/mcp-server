import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { protectedProcedure } from "@/orpc/procedures";
import { getLoopsFiltered } from "../services/analytics-service";
import { TelemetryQueryOptionsSchema } from "../types";

export const getLoops = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/loops",
		tags: ["Analytics"],
		summary: "Get loops with filtering",
		description: "Retrieve loop telemetry data with optional filtering by user, API key, session, and date range",
	})
	.input(TelemetryQueryOptionsSchema)
	.handler(async ({ input, context: _context }) => {
		try {
			// Delegate to service layer per C-002
			return await getLoopsFiltered(input);
		} catch (error) {
			logger.error("Failed to fetch loops", { error });
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch loops",
			});
		}
	});
