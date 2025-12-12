import type { MCPSettings } from "@snapback/config";
import { logger } from "@snapback/infrastructure";

/**
 * Context7Service manages dynamic configuration updates for Context7 integration.
 * Supports hot-reload of API settings and cache invalidation.
 */
export class Context7Service {
	private currentConfig: MCPSettings["context7"] | null = null;

	constructor(private storage?: any) {
		this.currentConfig = null;
	}

	/**
	 * Updates the Context7 configuration with new settings.
	 * Validates URL format and invalidates cache on change.
	 */
	updateConfig(settings: MCPSettings["context7"]): void {
		if (!settings) {
			logger.warn("Context7Service.updateConfig called with null settings");
			return;
		}

		// Validate URL format
		if (settings.apiUrl) {
			try {
				new URL(settings.apiUrl);
			} catch (_error) {
				logger.error("Invalid URL in Context7 config", { url: settings.apiUrl });
				return;
			}
		}

		const changed = JSON.stringify(this.currentConfig) !== JSON.stringify(settings);
		this.currentConfig = settings;

		if (changed) {
			logger.info("Context7 configuration updated", {
				apiUrl: settings.apiUrl,
				cacheTtl: settings.cacheTtlSearch,
			});
			this.invalidateCache();
		}
	}

	private invalidateCache(): void {
		if (this.storage && typeof this.storage.clear === "function") {
			this.storage.clear();
		}
	}

	getConfig(): MCPSettings["context7"] | null {
		return this.currentConfig;
	}
}
