import { isFeatureEnabled as isFeatureEnabledCore } from "@snapback/config";
import { logger } from "@snapback/infrastructure";

export interface FeatureFlagContext {
	userId?: string;
	email?: string;
	properties?: Record<string, any>;
}

export async function isFeatureEnabled(flagName: string, context: FeatureFlagContext): Promise<boolean> {
	try {
		logger.debug("Evaluating feature flag", {
			flagName,
			userId: context.userId,
		});

		if (!context.userId) {
			logger.warn("No userId provided for feature flag evaluation, defaulting to false");
			return false;
		}

		const result = await isFeatureEnabledCore(flagName, context.userId, {
			email: context.email,
			...context.properties,
		});

		logger.debug("Feature flag evaluation result", { flagName, result });

		return result;
	} catch (error) {
		logger.error("Failed to evaluate feature flag", { error, flagName });
		// Default to false for safety
		return false;
	}
}
