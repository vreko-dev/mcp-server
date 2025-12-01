/**
 * Procedure to set up PostHog cohorts for retention analysis
 */

import { CORRELATION_COHORTS, createCohort, logger, RETENTION_COHORTS } from "@snapback/infrastructure";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

const setupCohortsSchema = z.object({
	dryRun: z.boolean().default(false),
	includeCorrelationCohorts: z.boolean().default(false),
});

export const setupCohorts = publicProcedure.input(setupCohortsSchema).handler(async ({ input }) => {
	try {
		const { dryRun, includeCorrelationCohorts } = input;
		const results: { name: string; id?: number; error?: string }[] = [];

		logger.info("Setting up PostHog cohorts", {
			dryRun,
			includeCorrelationCohorts,
		});

		// Create retention cohorts
		for (const cohortConfig of RETENTION_COHORTS) {
			try {
				if (dryRun) {
					logger.info("Dry run: Would create cohort", { cohortConfig });
					results.push({
						name: cohortConfig.name,
						id: 0, // Mock ID for dry run
					});
				} else {
					const cohort = await createCohort(cohortConfig);
					results.push({
						name: cohortConfig.name,
						id: cohort.id,
					});
					logger.info("Created cohort", {
						cohortConfig,
						cohortId: cohort.id,
					});
				}
			} catch (error) {
				logger.error("Failed to create cohort", { error, cohortConfig });
				results.push({
					name: cohortConfig.name,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		// Create correlation cohorts if requested
		if (includeCorrelationCohorts) {
			for (const cohortConfig of CORRELATION_COHORTS) {
				try {
					if (dryRun) {
						logger.info("Dry run: Would create correlation cohort", {
							cohortConfig,
						});
						results.push({
							name: cohortConfig.name,
							id: 0, // Mock ID for dry run
						});
					} else {
						const cohort = await createCohort(cohortConfig);
						results.push({
							name: cohortConfig.name,
							id: cohort.id,
						});
						logger.info("Created correlation cohort", {
							cohortConfig,
							cohortId: cohort.id,
						});
					}
				} catch (error) {
					logger.error("Failed to create correlation cohort", {
						error,
						cohortConfig,
					});
					results.push({
						name: cohortConfig.name,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}
		}

		return {
			success: true,
			message: dryRun
				? "Dry run completed. Would create cohorts for retention analysis."
				: "Cohorts created successfully for retention analysis.",
			results,
		};
	} catch (error) {
		logger.error("Failed to set up PostHog cohorts", { error });
		throw new Error("Failed to set up PostHog cohorts");
	}
});
