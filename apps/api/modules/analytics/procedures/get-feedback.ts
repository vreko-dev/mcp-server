import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { protectedProcedure } from "@/orpc/procedures";
import { getFeedbackFiltered } from "../services/analytics-service";
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
			// Delegate to service layer per C-002
			return await getFeedbackFiltered(input);
		} catch (error) {
			logger.error("Failed to fetch feedback", { error });
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch feedback",
			});
		}
	});
