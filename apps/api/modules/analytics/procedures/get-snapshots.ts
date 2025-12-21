import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { protectedProcedure } from "@/orpc/procedures";
import { getSnapshotsFiltered } from "../services/analytics-service";
import { TelemetryQueryOptionsSchema } from "../types";

export const getSnapshots = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/snapshots",
		tags: ["Analytics"],
		summary: "Get snapshots with filtering",
		description: "Retrieve snapshot data with optional filtering by user, API key, and date range",
	})
	.input(TelemetryQueryOptionsSchema)
	.handler(async ({ input, context: _context }) => {
		try {
			// Delegate to service layer per C-002
			return await getSnapshotsFiltered(input);
		} catch (error) {
			logger.error("Failed to fetch snapshots", { error });
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to fetch snapshots",
			});
		}
	});
