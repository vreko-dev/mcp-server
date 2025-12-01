/**
 * Procedure to run correlation analysis in PostHog
 */

import {
	CORRELATION_ANALYSES,
	type CorrelationAnalysisConfig,
	logger,
	performCorrelationAnalysis,
} from "@snapback/infrastructure";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

const runCorrelationAnalysisSchema = z.object({
	analysisName: z.string().optional(),
	eventName: z.string().optional(),
	propertyNames: z.array(z.string()).optional(),
	dryRun: z.boolean().default(false),
});

export const runCorrelationAnalysis = publicProcedure.input(runCorrelationAnalysisSchema).handler(async ({ input }) => {
	try {
		const { analysisName, eventName, propertyNames, dryRun } = input;

		logger.info("Running correlation analysis", {
			analysisName,
			eventName,
			propertyNames,
			dryRun,
		});

		// Find predefined analysis if name is provided
		let config: CorrelationAnalysisConfig | undefined;

		if (analysisName) {
			config = CORRELATION_ANALYSES.find((analysis: CorrelationAnalysisConfig) => analysis.name === analysisName);
			if (!config) {
				throw new Error(`Correlation analysis '${analysisName}' not found`);
			}
		} else if (eventName && propertyNames) {
			config = {
				name: `Custom Analysis: ${eventName}`,
				eventName,
				propertyNames,
			};
		} else {
			throw new Error("Either analysisName or both eventName and propertyNames must be provided");
		}

		if (dryRun) {
			logger.info("Dry run: Would perform correlation analysis", { config });
			return {
				success: true,
				message: "Dry run completed. Would perform correlation analysis.",
				analysis: {
					id: "dry-run-id",
					name: config.name,
					createdAt: new Date().toISOString(),
					results: [],
				},
			};
		}

		// Perform the actual correlation analysis
		const analysis = await performCorrelationAnalysis(config);

		logger.info("Correlation analysis completed", {
			analysisId: analysis.id,
		});

		return {
			success: true,
			message: "Correlation analysis completed successfully.",
			analysis,
		};
	} catch (error) {
		logger.error("Failed to run correlation analysis", { error });
		throw new Error(
			`Failed to run correlation analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
});
