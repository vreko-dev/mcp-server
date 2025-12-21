/**
 * Get API Key Usage Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 */

import { ORPCError } from "@orpc/client";
import { protectedProcedure } from "@/orpc/procedures";
import { getApiKeyUsageData } from "../services/analytics-service";
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
			// Delegate to service layer per C-002
			return await getApiKeyUsageData({
				apiKeyId: input.apiKeyId,
				startDate: input.startDate,
				endDate: input.endDate,
				limit: input.limit,
				offset: input.offset,
			});
		} catch (error) {
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch API key usage",
			});
		}
	});
