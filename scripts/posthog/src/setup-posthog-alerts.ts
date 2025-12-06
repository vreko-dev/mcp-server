#!/usr/bin/env node

/**
 * Script to set up PostHog alerts for key metrics
 *
 * This script sets up alerts based on the KPI dashboard configuration:
 * - TTFV p75 > 7 minutes
 * - Onboarding completion < 60%
 * - Crash-free sessions < 95%
 * - Replay budget > 80% of monthly budget
 * - D7 retention drops by > 5% from baseline
 */

import { setupAlerts } from "@snapback/api/modules/posthog/procedures/setup-alerts";
import { logger } from "@snapback/infrastructure";

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run") || args.includes("-d");

	try {
		logger.info("Setting up PostHog alerts for key metrics...");

		const result = await setupAlerts.handler({
			input: { dryRun },
		});

		logger.info("PostHog alerts setup result:", result);

		if (dryRun) {
			logger.info("Dry run completed. To actually create alerts, run without --dry-run flag.");
		} else {
			logger.info("PostHog alerts have been set up successfully!");
		}

		process.exit(0);
	} catch (error) {
		logger.error("Failed to set up PostHog alerts:", error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}
