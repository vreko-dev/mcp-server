/**
 * SnapBack API Client
 *
 * HTTP client for SnapBack backend API with:
 * - Explicit route registry (no path guessing)
 * - Circuit breaker for resilience
 * - Retry with exponential backoff
 * - Proper Content-Type handling
 *
 * @module client/api-client
 */

import ky, { HTTPError, type KyInstance } from "ky";
import CircuitBreaker from "opossum";
import { MCP_ROUTES, type McpRouteKey } from "./routes.js";

export interface ApiClientConfig {
	baseUrl: string;
	apiKey: string;
	timeout?: number;
	fetch?: typeof globalThis.fetch; // For testing
}

export class SnapBackAPIClient {
	private client: KyInstance;
	private circuitBreaker: CircuitBreaker<[string, RequestInit?], unknown>;
	private timeoutMs: number;

	constructor(config: ApiClientConfig) {
		this.timeoutMs = config.timeout ?? 30_000;

		this.client = ky.create({
			prefixUrl: config.baseUrl,
			timeout: this.timeoutMs,
			retry: { limit: 0 }, // We handle retries ourselves
			hooks: {
				beforeRequest: [
					(request) => {
						request.headers.set("Authorization", `Bearer ${config.apiKey}`);
						// Always set Accept header
						request.headers.set("Accept", "application/json");
					},
				],
			},
			...(config.fetch && { fetch: config.fetch }),
		});

		// Configure circuit breaker
		this.circuitBreaker = new CircuitBreaker(
			(endpoint: string, options?: RequestInit) => this.doFetch(endpoint, options),
			{
				timeout: this.timeoutMs,
				errorThresholdPercentage: 50,
				resetTimeout: 30_000,
				volumeThreshold: 5,
			},
		);

		// Log state changes
		this.circuitBreaker.on("open", () => console.warn("[SnapBack API] Circuit breaker opened"));
		this.circuitBreaker.on("halfOpen", () => console.warn("[SnapBack API] Circuit breaker half-open"));
		this.circuitBreaker.on("close", () => console.info("[SnapBack API] Circuit breaker closed"));
	}

	/**
	 * Type-safe request using route registry
	 */
	async call<T = unknown>(route: McpRouteKey, params?: Record<string, unknown>): Promise<T> {
		const { method, path } = MCP_ROUTES[route];

		const options: RequestInit = { method };

		if (params && method !== "GET") {
			options.body = JSON.stringify(params);
			options.headers = {
				"Content-Type": "application/json",
			};
		}

		return this.fetchWithRetry<T>(path, options);
	}

	/**
	 * Legacy request method - maps old names to routes
	 * @deprecated Use call() with route keys instead
	 */
	async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
		// Check if it's a known route
		if (method in MCP_ROUTES) {
			return this.call<T>(method as McpRouteKey, params);
		}

		// Fallback to generic execute endpoint
		return this.call<T>("mcp.execute", { tool: method, args: params });
	}

	private async fetchWithRetry<T>(endpoint: string, options: RequestInit, maxAttempts = 3): Promise<T> {
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				return (await this.circuitBreaker.fire(endpoint, options)) as T;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				if (attempt < maxAttempts) {
					await this.delay(100 * 2 ** (attempt - 1));
				}
			}
		}

		throw lastError ?? new Error("Request failed");
	}

	private async doFetch(endpoint: string, options?: RequestInit): Promise<unknown> {
		const url = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
		try {
			const response = await this.client(url, options);
			return response.json();
		} catch (error) {
			if (error instanceof HTTPError) {
				const status = error.response?.status || 500;
				const statusText = error.response?.statusText || "Unknown Error";
				throw new Error(`API error: ${status} ${statusText}`);
			}
			throw error;
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Get circuit breaker state for monitoring
	 */
	getCircuitState(): "closed" | "open" | "half-open" {
		if (this.circuitBreaker.opened) {
			return "open";
		}
		if (this.circuitBreaker.halfOpen) {
			return "half-open";
		}
		return "closed";
	}
}
