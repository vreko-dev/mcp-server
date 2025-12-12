import type { MCPSettings } from "@snapback/config";
import { logger } from "@snapback/infrastructure";

/**
 * AnalysisRouter manages API client creation and updates for risk analysis.
 * Supports dynamic endpoint switching and client recreation.
 */
export class AnalysisRouter {
	private apiClient: any = null;
	private inFlightRequests = new Set<Promise<any>>();

	constructor(initialClient?: any) {
		this.apiClient = initialClient || null;
	}

	/**
	 * Updates the API client with new settings.
	 * Only creates new client if both apiKey and baseUrl are provided.
	 * Preserves existing client if settings are incomplete.
	 */
	updateApiClient(settings: MCPSettings["api"]): void {
		if (!settings) {
			logger.warn("AnalysisRouter.updateApiClient called with null settings");
			return;
		}

		// If no apiKey provided, disable the client
		if (!settings.apiKey) {
			if (this.apiClient) {
				logger.info("API client disabled (apiKey removed)");
				this.apiClient = null;
			}
			return;
		}

		// If baseUrl not provided, preserve existing client
		if (!settings.baseUrl) {
			logger.warn("API client update skipped (baseUrl missing)");
			return;
		}

		// Create new client with complete settings
		const previousClient = this.apiClient;
		try {
			this.apiClient = {
				baseUrl: settings.baseUrl,
				apiKey: settings.apiKey,
				isActive: true,
			};

			logger.info("API client updated", {
				baseUrl: settings.baseUrl,
				inFlightRequests: this.inFlightRequests.size,
			});

			// Preserve in-flight requests through client switch
			if (previousClient && this.inFlightRequests.size > 0) {
				logger.debug("Preserving in-flight requests during client switch");
			}
		} catch (error) {
			logger.error("Failed to update API client", { error });
			this.apiClient = previousClient;
		}
	}

	/**
	 * Tracks in-flight requests to ensure they complete during client switches.
	 */
	trackRequest<T>(request: Promise<T>): Promise<T> {
		this.inFlightRequests.add(request);
		return request.finally(() => {
			this.inFlightRequests.delete(request);
		});
	}

	getClient(): any {
		return this.apiClient;
	}
}
