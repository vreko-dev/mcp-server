import { FeatureManager } from "@snapback/contracts";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

// Input schema
const getUserFlagsInputSchema = z.object({
	userId: z.string(),
	context: z.record(z.string(), z.unknown()).optional(),
});

// Output schema
const getUserFlagsOutputSchema = z.record(
	z.string(),
	z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

/**
 * Simple hash function for deterministic A/B testing
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

/**
 * Get A/B test group for a user
 */
function getExperimentGroup(userId: string, experimentName: string): "A" | "B" {
	// Create a unique hash for the user + experiment combination
	const combined = `${userId}-${experimentName}`;
	const userHash = hashString(combined);
	return userHash % 2 === 0 ? "A" : "B";
}

/**
 * Get DeepScan A/B test flags
 */
function getDeepScanExperimentFlags(userId: string): Record<string, boolean> {
	const experimentGroup = getExperimentGroup(userId, "deepscan-v2");

	return {
		"deepscan.v2_algorithm": experimentGroup === "B",
		"deepscan.enhanced_analysis": experimentGroup === "B",
		"deepscan.real_time_processing": experimentGroup === "B",
	};
}

/**
 * Get feature flags for a specific user
 * This endpoint allows clients to fetch all relevant feature flags for a user
 */
export const getUserFlags = publicProcedure
	.input(getUserFlagsInputSchema)
	.output(getUserFlagsOutputSchema)
	.handler(async ({ input }) => {
		const { userId } = input;

		// Define the feature flags we want to expose
		// In a real implementation, this would come from a configuration or database
		const flagNames = [
			"protection.enabled",
			"protection.auto_snapshot",
			"protection.pre_save_hook",
			"risk.guardian_v2",
			"risk.dependency_analysis",
			"risk.deep_analysis",
			"risk.ai_detection",
			"storage.compression",
			"storage.deduplication",
			"storage.encryption",
			"ui.chat_participant",
			"ui.status_bar",
			"ui.timeline_view",
			"telemetry.detailed_events",
			"telemetry.performance_metrics",
			"experimental.mcp_tools",
			"experimental.recovery_mode",
			"events.eventemitter2",
		];

		// Fetch all flags for the user
		const flags: Record<string, string | number | boolean | null> = {};

		const featureManager = FeatureManager.getInstance();
		for (const flagName of flagNames) {
			try {
				// Check if the feature is enabled
				const isEnabled = featureManager.isEnabled(
					flagName as keyof typeof FEATURE_FLAGS,
				);
				flags[flagName] = isEnabled;
			} catch (_error) {
				// If there's an error, default to false/null
				flags[flagName] = null;
			}
		}

		// Add A/B test flags for DeepScan
		const deepScanFlags = getDeepScanExperimentFlags(userId);
		Object.assign(flags, deepScanFlags);

		return flags;
	});
