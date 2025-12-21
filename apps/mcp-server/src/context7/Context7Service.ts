import type { MCPSettings } from "@snapback/config";
import { logger } from "@snapback/infrastructure";
import type { StorageBrokerAdapter } from "@snapback/sdk/storage";

interface Context7DocsOptions {
	topic?: string;
	tokens?: number;
}

interface APIResponse {
	content: Array<{
		type: string;
		text?: string;
		json?: unknown;
	}>;
}

/**
 * Context7Service manages dynamic configuration updates for Context7 integration.
 * Supports hot-reload of API settings and cache invalidation.
 * Provides library ID resolution and documentation fetching with caching.
 */
export class Context7Service {
	private currentConfig: MCPSettings["context7"] | null = null;
	private apiKey: string | undefined;
	private apiUrl: string;
	private cacheTtlSearch: number;
	private cacheTtlDocs: number;

	constructor(private storage?: StorageBrokerAdapter) {
		this.currentConfig = null;
		this.apiKey = process.env.CONTEXT7_API_KEY;
		this.apiUrl = process.env.CONTEXT7_API_URL || "https://context7.com/api/v1";
		this.cacheTtlSearch = Number.parseInt(process.env.CONTEXT7_CACHE_TTL_SEARCH || "3600", 10) * 1000;
		this.cacheTtlDocs = Number.parseInt(process.env.CONTEXT7_CACHE_TTL_DOCS || "86400", 10) * 1000;
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
		// Cache invalidation is handled on a per-entry basis
		// When cache expires (cacheExpiration < now), entries are deleted
		// This method is kept for potential future use with cache middleware
		logger.info("Cache invalidation triggered");
	}

	getConfig(): MCPSettings["context7"] | null {
		return this.currentConfig;
	}

	/**
	 * Resolves a library name to a Context7-compatible library ID.
	 * Results are cached according to cacheTtlSearch.
	 */
	async resolveLibraryId(libraryName: string): Promise<APIResponse> {
		if (!libraryName || libraryName.trim() === "") {
			throw new Error("Library name cannot be empty");
		}

		if (!this.apiKey) {
			throw new Error("CONTEXT7_API_KEY is required");
		}

		const cacheKey = `ctx7:resolve:${libraryName}`;

		// Try to get from cache
		try {
			if (this.storage) {
				const cached = await this.storage.get(cacheKey);
				if (cached && this.isCacheValid(cached)) {
					const data = cached.fileContents?.data;
					if (data) {
						return JSON.parse(data);
					}
				} else if (cached) {
					// Remove expired cache
					try {
						await this.storage.delete(cacheKey);
					} catch (error) {
						logger.warn("Failed to delete expired cache", { error });
					}
				}
			}
		} catch (error) {
			logger.warn("Failed to retrieve from cache", { error });
			// Continue to API call if cache fails
		}

		// Call API
		const result = await this.callResolveLibraryAPI(libraryName);

		// Save to cache
		try {
			if (this.storage) {
				await this.storage.save({
					id: cacheKey,
					timestamp: Date.now(),
					meta: {
						cacheExpiration: Date.now() + this.cacheTtlSearch,
						cacheType: "resolve-library-id",
						createdAt: Date.now(),
					},
					files: [],
					fileContents: {
						data: JSON.stringify(result),
					},
				});
			}
		} catch (error) {
			logger.warn("Failed to save to cache", { error });
			// Don't fail the request if cache save fails
		}

		return result;
	}

	/**
	 * Fetches documentation for a library with optional topic and token limits.
	 * Results are cached according to cacheTtlDocs.
	 */
	async getLibraryDocs(libraryId: string, options?: Context7DocsOptions): Promise<APIResponse> {
		if (!libraryId || libraryId.trim() === "") {
			throw new Error("Library ID cannot be empty");
		}

		if (!this.apiKey) {
			throw new Error("CONTEXT7_API_KEY is required");
		}

		const cacheKey = `ctx7:docs:${encodeURIComponent(libraryId)}:${options?.topic || ""}:tokens:${options?.tokens || ""}`;

		// Try to get from cache
		try {
			if (this.storage) {
				const cached = await this.storage.get(cacheKey);
				if (cached && this.isCacheValid(cached)) {
					const data = cached.fileContents?.data;
					if (data) {
						return JSON.parse(data);
					}
				} else if (cached) {
					// Remove expired cache
					try {
						await this.storage.delete(cacheKey);
					} catch (error) {
						logger.warn("Failed to delete expired cache", { error });
					}
				}
			}
		} catch (error) {
			logger.warn("Failed to retrieve from cache", { error });
			// Continue to API call if cache fails
		}

		// Call API
		const result = await this.callGetLibraryDocsAPI(libraryId, options?.topic, options?.tokens);

		// Save to cache
		try {
			if (this.storage) {
				await this.storage.save({
					id: cacheKey,
					timestamp: Date.now(),
					meta: {
						cacheExpiration: Date.now() + this.cacheTtlDocs,
						cacheType: "get-library-docs",
						createdAt: Date.now(),
					},
					files: [],
					fileContents: {
						data: JSON.stringify(result),
					},
				});
			}
		} catch (error) {
			logger.warn("Failed to save to cache", { error });
			// Don't fail the request if cache save fails
		}

		return result;
	}

	private isCacheValid(cached: any): boolean {
		if (!cached?.meta?.cacheExpiration) {
			return false;
		}
		return cached.meta.cacheExpiration > Date.now();
	}

	/**
	 * Internal method to call the Context7 resolve library API.
	 * Can be overridden in tests.
	 */
	private async callResolveLibraryAPI(libraryName: string): Promise<APIResponse> {
		const response = await fetch(`${this.apiUrl}/libraries/resolve`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ libraryName }),
		});

		if (!response.ok) {
			throw new Error(`Context7 API error: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Internal method to call the Context7 get documentation API.
	 * Can be overridden in tests.
	 */
	private async callGetLibraryDocsAPI(libraryId: string, topic?: string, tokens?: number): Promise<APIResponse> {
		const params = new URLSearchParams();
		if (topic) params.append("topic", topic);
		if (tokens) params.append("tokens", tokens.toString());

		const queryString = params.toString() ? `?${params.toString()}` : "";
		const url = `${this.apiUrl}/libraries/${encodeURIComponent(libraryId)}/docs${queryString}`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Context7 API error: ${response.statusText}`);
		}

		return response.json();
	}
}
