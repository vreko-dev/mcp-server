import type { AnalyticsResponse, FileMetadata } from "@snapback-oss/contracts";
import ky from "ky";
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
export declare class SnapbackClient {
	private sanitizer;
	private cache;
	private config;
	private httpClient;
	private localFallback;
	constructor(config: SDKConfig);
	/**
	 * Get the HTTP client instance
	 * @returns The ky HTTP client instance
	 */
	getHttpClient(): typeof ky;
	/**
	 * Parse Retry-After header and return delay in milliseconds
	 * @param retryAfter Retry-After header value
	 * @returns Delay in milliseconds
	 */
	private parseRetryAfter;
	/**
	 * Enhanced HTTP request with custom retry logic including Retry-After handling
	 */
	private httpRequest;
	/**
	 * Send file metadata batch to API
	 * Automatically sanitizes metadata to ensure privacy
	 */
	sendMetadata(
		workspaceId: string,
		files: FileMetadata[],
	): Promise<{
		accepted: number;
		rejected: number;
	}>;
	/**
	 * Get analytics for workspace
	 * Uses cache when available
	 */
	getAnalytics(
		workspaceId: string,
		options?: {
			forceRefresh?: boolean;
		},
	): Promise<AnalyticsResponse>;
	/**
	 * Get smart recommendations
	 */
	getRecommendations(workspaceId: string): Promise<AnalyticsResponse["snapshotRecommendations"]>;
	/**
	 * Health check endpoint
	 */
	healthCheck(): Promise<{
		status: "ok" | "error";
		version: string;
	}>;
}
export { SnapbackClient as SnapbackAnalyticsClient };
//# sourceMappingURL=client.d.ts.map
