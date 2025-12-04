import {
	createAlert,
	KEY_METRIC_ALERTS,
	logger,
} from "@snapback/infrastructure";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

const setupAlertsSchema = z.object({
	dryRun: z.boolean().default(false),
});

export const setupAlerts = publicProcedure
	.input(setupAlertsSchema)
	.handler(async ({ input }) => {
		try {
			const { dryRun } = input;
			const results: { name: string; id?: string; error?: string }[] = [];

			logger.info("Setting up PostHog alerts", { dryRun });

			// Create alerts for each key metric
			for (const alertConfig of KEY_METRIC_ALERTS) {
				try {
					if (dryRun) {
						logger.info("Dry run: Would create alert", { alertConfig });
						results.push({
							name: alertConfig.name,
							id: "dry-run-id",
						});
					} else {
						const alertId = await createAlert(alertConfig);
						results.push({
							name: alertConfig.name,
							id: alertId,
						});
						logger.info("Created alert", { alertConfig, alertId });
					}
				} catch (error) {
					logger.error("Failed to create alert", { error, alertConfig });
					results.push({
						name: alertConfig.name,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return {
				success: true,
				message: dryRun
					? "Dry run completed. Would create alerts for key metrics."
					: "Alerts created successfully for key metrics.",
				results,
			};
		} catch (error) {
			logger.error("Failed to set up PostHog alerts", { error });
			throw new Error("Failed to set up PostHog alerts");
		}
	});
