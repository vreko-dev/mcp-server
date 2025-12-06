#!/usr/bin/env node

/**
 * Script to set up PostHog cohorts for retention analysis and correlation analysis
 *
 * This script sets up cohorts based on the requirements:
 * - D7 Retention cohort
 * - D30 Retention cohort
 * - Onboarding Completion cohort
 * - Correlation analysis cohorts (optional)
 */

import { setupCohorts } from "@snapback/api/modules/posthog/procedures/setup-cohorts";
import { logger } from "@snapback/infrastructure";

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run") || args.includes("-d");
	const includeCorrelation = args.includes("--correlation") || args.includes("-c");

	try {
		logger.info("Setting up PostHog cohorts for retention analysis...");

		const result = await setupCohorts.handler({
			input: { dryRun, includeCorrelationCohorts: includeCorrelation },
		});

		logger.info("PostHog cohorts setup result:", result);

		if (dryRun) {
			logger.info("Dry run completed. To actually create cohorts, run without --dry-run flag.");
		} else {
			logger.info("PostHog cohorts have been set up successfully!");
		}

		if (includeCorrelation) {
			logger.info("Correlation analysis cohorts included.");
		}

		process.exit(0);
	} catch (error) {
		logger.error("Failed to set up PostHog cohorts:", error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}
