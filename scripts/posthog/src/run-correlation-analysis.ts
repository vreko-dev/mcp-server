#!/usr/bin/env node

/**
 * Script to run correlation analysis in PostHog
 *
 * This script runs correlation analysis to identify factors that correlate with
 * key user outcomes like retention, conversion, and engagement.
 */

import { runCorrelationAnalysis } from "@snapback/api/modules/posthog/procedures/run-correlation-analysis";
import { logger } from "@snapback/infrastructure";
import { CORRELATION_ANALYSES } from "@snapback/infrastructure/src/posthog/correlation";

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run") || args.includes("-d");
	const analysisName = args.find((arg) => !arg.startsWith("-")) || "Onboarding Completion Factors";

	try {
		logger.info("Running correlation analysis in PostHog...");

		// Show available analyses if requested
		if (args.includes("--list") || args.includes("-l")) {
			logger.info("Available correlation analyses:");
			for (const analysis of CORRELATION_ANALYSES) {
				logger.info(`  - ${analysis.name}`);
			}
			process.exit(0);
		}

		const result = await runCorrelationAnalysis.handler({
			input: { analysisName, dryRun },
		});

		logger.info("Correlation analysis result:", result);

		if (result.analysis && result.analysis.results.length > 0) {
			logger.info("\nTop correlations found:");
			// Show top 5 correlations
			const topCorrelations = result.analysis.results.slice(0, 5);
			for (const correlation of topCorrelations) {
				logger.info(
					`  ${correlation.property}: ${correlation.correlation.toFixed(3)} ` +
						`(count: ${correlation.count}, frequency: ${correlation.relativeFrequency.toFixed(3)})`,
				);
			}
		}

		if (dryRun) {
			logger.info("Dry run completed. To actually run analysis, run without --dry-run flag.");
		} else {
			logger.info("Correlation analysis completed successfully!");
		}

		process.exit(0);
	} catch (error) {
		logger.error("Failed to run correlation analysis:", error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}
