import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { protectedProcedure } from "@/orpc/procedures";
import { getPolicyEvaluationsFiltered } from "../services/analytics-service";
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
			// Delegate to service layer per C-002
			return await getPolicyEvaluationsFiltered(input);
		} catch (error) {
			logger.error("Failed to fetch policy evaluations", { error });
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch policy evaluations",
			});
		}
	});
