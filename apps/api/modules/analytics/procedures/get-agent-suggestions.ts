import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { protectedProcedure } from "@/orpc/procedures";
import { getAgentSuggestionsFiltered } from "../services/analytics-service";
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
			// Delegate to service layer per C-002
			return await getAgentSuggestionsFiltered(input);
		} catch (error) {
			logger.error("Failed to fetch agent suggestions", { error });
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch agent suggestions",
			});
		}
	});
