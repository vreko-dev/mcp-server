import type { MCPSettings } from "@snapback/config";
import { logger } from "@snapback/infrastructure";
import type { Context7Service } from "../context7/Context7Service";
import type { AnalysisRouter } from "../services/AnalysisRouter";

/**
 * ConfigUpdateManager orchestrates configuration updates across services.
 * Applies MCP configuration changes to Context7Service and AnalysisRouter.
 */
export class ConfigUpdateManager {
	constructor(
		private context7Service: Context7Service,
		private analysisRouter: AnalysisRouter,
	) {}

	/**
	 * Applies configuration updates to all dependent services.
	 * Idempotent - calling with same config twice produces same state.
	 */
	applyConfigUpdates(config: MCPSettings): void {
		if (!config) {
			logger.warn("ConfigUpdateManager.applyConfigUpdates called with null config");
			return;
		}

		logger.info("Applying configuration updates", {
			services: ["context7", "analysisRouter"],
		});

		// Update Context7 configuration
		if (config.context7) {
			try {
				this.context7Service.updateConfig(config.context7);
				logger.debug("Context7 configuration updated");
			} catch (error) {
				logger.error("Failed to update Context7 configuration", { error });
				// Continue with other updates even if this fails
			}
		}

		// Update AnalysisRouter configuration
		if (config.api) {
			try {
				this.analysisRouter.updateApiClient(config.api);
				logger.debug("AnalysisRouter API client updated");
			} catch (error) {
				logger.error("Failed to update AnalysisRouter API client", { error });
				// Continue even if this fails
			}
		}

		logger.info("Configuration updates applied");
	}
}
