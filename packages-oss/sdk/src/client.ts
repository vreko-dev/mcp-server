import type { AnalyticsResponse, FileMetadata } from "@snapback-oss/contracts";
import { logger } from "@snapback-oss/infrastructure";
import ky from "ky";
import ow from "ow";
import pRetry, { AbortError } from "p-retry";
import { LRUCache } from "./cache/lru-cache.js";
import { PrivacySanitizer } from "./privacy/sanitizer.js";

export type ClientSurface = "vscode" | "mcp" | "cli" | "web";
export interface Envelope {
	session_id: string;
	request_id: string;
	workspace_id?: string;
	client: ClientSurface;
}

export interface SnapbackClientOptions {
	baseUrl: string;
	apiKey?: string;
	surface: ClientSurface;
	fetchImpl?: typeof fetch;
	now?: () => number;
	batchMax?: number;
	batchIntervalMs?: number;
	retryBaseMs?: number;
	retryMaxMs?: number;
}

export interface SDKConfig {
	endpoint: string;
	apiKey: string;

	privacy: {
		hashFilePaths: boolean;
		anonymizeWorkspace: boolean;
	};

	cache: {
		enabled: boolean;
		ttl: Record<string, number>;
	};

	retry: {
		maxRetries: number;
		backoffMs: number;
	};
}

/**
 * Local fallback for when API is unavailable
 */
class LocalFallback {
	generateRecommendations(): AnalyticsResponse["snapshotRecommendations"] {
		// In a real implementation, this would use local heuristics
		return {
			shouldCreateSnapshot: false,
			reason: "Using local fallback - API unavailable",
			urgency: "low",
			suggestedTiming: "24h",
		};
	}
}

export class SnapbackClient {
	private sanitizer: PrivacySanitizer;
	private cache: LRUCache;
	private config: SDKConfig;
	private httpClient: typeof ky;
	private localFallback: LocalFallback;

	constructor(config: SDKConfig) {
		// Validate config
		ow(
			config,
			ow.object.exactShape({
				endpoint: ow.string.url,
				apiKey: ow.string.nonEmpty,
				privacy: ow.object.exactShape({
					hashFilePaths: ow.boolean,
					anonymizeWorkspace: ow.boolean,
				}),
				cache: ow.object.exactShape({
					enabled: ow.boolean,
					ttl: ow.object,
				}),
				retry: ow.object.exactShape({
					maxRetries: ow.number.greaterThanOrEqual(0),
					backoffMs: ow.number.greaterThanOrEqual(0),
				}),
			}),
		);

		this.config = config;
		this.sanitizer = new PrivacySanitizer(config.privacy);
		this.cache = new LRUCache(config.cache);
		this.localFallback = new LocalFallback();

		// Initialize HTTP client with enhanced configuration
		this.httpClient = ky.extend({
			prefixUrl: config.endpoint,
			headers: {
				"X-API-Key": config.apiKey,
				"X-SnapBack-SDK": "1.0.0",
			},
			retry: {
				limit: config.retry.maxRetries,
				methods: ["get", "post", "put", "delete", "patch"],
				statusCodes: [408, 413, 429, 500, 502, 503, 504],
				// Add exponential backoff configuration
				backoffLimit: config.retry.backoffMs * 10, // Maximum backoff time
			},
			timeout: 30000, // 30 second timeout
		});
	}

	/**
	 * Get the HTTP client instance
	 * @returns The ky HTTP client instance
	 */
	public getHttpClient(): typeof ky {
		return this.httpClient;
	}

	/**
	 * Parse Retry-After header and return delay in milliseconds
	 * @param retryAfter Retry-After header value
	 * @returns Delay in milliseconds
	 */
	private parseRetryAfter(retryAfter: string): number {
		// Check if it's a number (seconds)
		if (/^\d+$/.test(retryAfter)) {
			return Number.parseInt(retryAfter, 10) * 1000;
		}

		// Check if it's a date
		const date = new Date(retryAfter);
		if (!Number.isNaN(date.getTime())) {
			return Math.max(0, date.getTime() - Date.now());
		}

		// Default to 1 second if parsing fails
		return 1000;
	}

	/**
	 * Enhanced HTTP request with custom retry logic including Retry-After handling
	 */
	private async httpRequest<T>(
		requestFn: () => Promise<T>,
		options?: {
			retryLimit?: number;
			onRetry?: (error: Error, attempt: number) => void;
		},
	): Promise<T> {
		const retryLimit = options?.retryLimit ?? this.config.retry.maxRetries;

		return pRetry(
			async () => {
				try {
					return await requestFn();
				} catch (error: any) {
					// Handle 429 with Retry-After header
					if (error.response?.status === 429) {
						const retryAfter = error.response.headers.get("Retry-After");
						if (retryAfter) {
							const delay = this.parseRetryAfter(retryAfter);
							// Wait for the specified delay before retrying
							await new Promise((resolve) => setTimeout(resolve, delay));
						}
						// Re-throw to trigger retry
						throw error;
					}

					// For other errors, re-throw as AbortError to prevent retry
					if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
						throw new AbortError(error);
					}

					throw error;
				}
			},
			{
				retries: retryLimit,
				factor: 2,
				minTimeout: this.config.retry.backoffMs,
				maxTimeout: this.config.retry.backoffMs * 2 ** retryLimit,
				randomize: true,
				onFailedAttempt: (error) => {
					if (options?.onRetry) {
						options.onRetry(error, error.attemptNumber);
					}
				},
			},
		);
	}

	/**
	 * Send file metadata batch to API
	 * Automatically sanitizes metadata to ensure privacy
	 */
	async sendMetadata(workspaceId: string, files: FileMetadata[]): Promise<{ accepted: number; rejected: number }> {
		// Validate inputs
		ow(workspaceId, ow.string.nonEmpty);
		ow(files, ow.array.minLength(1));

		// Privacy validation - ensures no file contents
		const sanitized = files.map((f) => this.sanitizer.sanitize(f));

		// Validate all metadata is privacy-safe
		for (const file of sanitized) {
			if (!this.sanitizer.isPrivacySafe(file)) {
				throw new Error("Privacy validation failed: file contains sensitive data");
			}
		}

		try {
			const response = await this.httpRequest(
				() =>
					this.httpClient
						.post("v1/metadata/files/batch", {
							json: {
								workspaceId,
								files: sanitized,
							},
							timeout: 30000,
						})
						.json<{ accepted: number; rejected: number }>(),
				{
					onRetry: (error, attempt) => {
						logger.warn(`Attempt ${attempt} failed. Retrying...`, { error: error.message });
					},
				},
			);

			return response;
		} catch (error) {
			// Graceful degradation - don't fail if API unavailable
			logger.warn("API metadata upload failed, continuing with local operation", {
				error: (error as Error).message,
			});
			return { accepted: 0, rejected: files.length };
		}
	}

	/**
	 * Get analytics for workspace
	 * Uses cache when available
	 */
	async getAnalytics(workspaceId: string, options?: { forceRefresh?: boolean }): Promise<AnalyticsResponse> {
		// Validate inputs
		ow(workspaceId, ow.string.nonEmpty);

		const cacheKey = `analytics:${workspaceId}`;

		// Check cache first
		if (!options?.forceRefresh && this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey);
		}

		try {
			const response = await this.httpRequest(
				() =>
					this.httpClient
						.get(`v1/analytics/workspace/${workspaceId}`, {
							timeout: 30000,
						})
						.json<AnalyticsResponse>(),
				{
					onRetry: (error, attempt) => {
						logger.warn(`Analytics API attempt ${attempt} failed. Retrying...`, { error: error.message });
					},
				},
			);

			// Cache successful response with TTL from config
			const ttl = this.config.cache.ttl.analytics || 3600;
			this.cache.set(cacheKey, response, ttl);

			return response;
		} catch (error) {
			// Return cached data if available, even if stale
			if (this.cache.has(cacheKey)) {
				logger.warn("API unavailable, using stale cached analytics");
				return this.cache.get(cacheKey);
			}

			throw new Error(`Failed to fetch analytics: ${(error as Error).message}`);
		}
	}

	/**
	 * Get smart recommendations
	 */
	async getRecommendations(workspaceId: string): Promise<AnalyticsResponse["snapshotRecommendations"]> {
		// Validate inputs
		ow(workspaceId, ow.string.nonEmpty);

		try {
			const response = await this.httpRequest(
				() =>
					this.httpClient
						.get("v1/intelligence/recommendations", {
							searchParams: {
								workspaceId,
							},
							timeout: 30000,
						})
						.json<AnalyticsResponse>(),
				{
					onRetry: (error, attempt) => {
						logger.warn(`Recommendations API attempt ${attempt} failed. Retrying...`, {
							error: error.message,
						});
					},
				},
			);

			return response.snapshotRecommendations;
		} catch (error) {
			// Fallback to local heuristics
			logger.warn("API unavailable, using local fallback for recommendations", {
				error: (error as Error).message,
			});
			return this.localFallback.generateRecommendations();
		}
	}

	/**
	 * Health check endpoint
	 */
	async healthCheck(): Promise<{ status: "ok" | "error"; version: string }> {
		try {
			const response = await this.httpClient.get("health").json<{ status: "ok" | "error"; version: string }>();
			return response;
		} catch (_error) {
			return { status: "error", version: "unknown" };
		}
	}
}

// Export SnapbackAnalyticsClient as an alias for SnapbackClient
export { SnapbackClient as SnapbackAnalyticsClient };
