import ky, { HTTPError, type KyInstance, type Options } from "ky";
import CircuitBreaker from "opossum";
import { z } from "zod";

// Define the configuration interface
export interface SnapBackConfig {
	baseUrl: string;
	apiKey: string;
	timeout?: number;
	fetch?: typeof globalThis.fetch; // For testing
}

// Define request/response interfaces
export interface AnalysisRequest {
	code: string;
	filePath: string;
	context?: {
		surroundingCode?: string;
		projectType?: string;
		language?: string;
	};
}

export interface SnapshotRequest {
	filePath: string;
	reason?: string;
	source: string;
}

export interface AnalysisResponse {
	riskLevel: string;
	score: number;
	factors: string[];
	analysisTimeMs: number;
	issues: Array<{
		severity: string;
		message: string;
		line?: number;
		column?: number;
	}>;
}

export interface IterationStats {
	consecutiveAIEdits: number;
	riskLevel: string;
	velocity: number;
	recommendation: string;
}

export interface SnapshotResponse {
	id: string;
	timestamp: number;
	meta: Record<string, any>;
}

export interface SessionResponse {
	consecutiveAIEdits: number;
	lastEditTimestamp: number;
	filePath: string;
	riskLevel: string;
}

// Zod schemas for validation
const AnalysisResponseSchema = z.object({
	riskLevel: z.string(),
	score: z.number(),
	factors: z.array(z.string()),
	analysisTimeMs: z.number(),
	issues: z.array(
		z.object({
			severity: z.string(),
			message: z.string(),
			line: z.number().optional(),
			column: z.number().optional(),
		}),
	),
});

// IterationStatsSchema removed - getIterationStats returns local defaults
// Backend endpoint not implemented, compute locally using Intelligence package

const SnapshotResponseSchema = z.object({
	id: z.string(),
	timestamp: z.number(),
	meta: z.record(z.string(), z.any()),
});

const SessionResponseSchema = z.object({
	consecutiveAIEdits: z.number(),
	lastEditTimestamp: z.number(),
	filePath: z.string(),
	riskLevel: z.string(),
});

// Circuit breaker state enum (matches cockatiel's CircuitState for API compatibility)
export enum CircuitState {
	Closed = 0,
	Open = 1,
	HalfOpen = 2,
}

/**
 * Retry with exponential backoff
 */
async function withRetry<T>(
	operation: () => Promise<T>,
	options: { maxAttempts: number; initialDelayMs: number; maxDelayMs: number },
): Promise<T> {
	const { maxAttempts, initialDelayMs, maxDelayMs } = options;
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt >= maxAttempts) {
				throw lastError;
			}

			// Exponential backoff: initialDelay * 2^(attempt-1), capped at maxDelay
			const delay = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError ?? new Error("Retry failed");
}

export class SnapBackAPIClient {
	private client: KyInstance;
	private circuitBreaker: CircuitBreaker<[string, RequestInit?], unknown>;
	private timeoutMs: number;

	constructor(config: SnapBackConfig) {
		this.timeoutMs = config.timeout ?? 30000;

		// Configure ky WITHOUT retry or timeout - we handle these ourselves
		const kyOptions: Options = {
			prefixUrl: config.baseUrl,
			timeout: this.timeoutMs, // ky handles timeout
			retry: {
				limit: 0, // Disable ky retry - we handle it
			},
			hooks: {
				beforeRequest: [
					(request: Request) => {
						request.headers.set("Authorization", `Bearer ${config.apiKey}`);
						request.headers.set("Content-Type", "application/json");
					},
				],
			},
		};

		// CRITICAL: Pass fetch option if provided (for testing)
		if (config.fetch) {
			kyOptions.fetch = config.fetch;
		}

		this.client = ky.create(kyOptions);

		// Configure opossum circuit breaker
		// The function to wrap - takes endpoint and options, returns promise
		const fetchFn = async (endpoint: string, options?: RequestInit): Promise<unknown> => {
			const url = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

			try {
				const response = await this.client(url, { ...options });
				return await response.json();
			} catch (error: any) {
				// Re-throw ky errors with consistent format
				if (error instanceof HTTPError) {
					const status = error.response?.status || 500;
					const statusText = error.response?.statusText || "Unknown Error";
					throw new Error(`API error: ${status} ${statusText}`);
				}
				// Handle our mock error format
				if (error.name === "HTTPError" && error.response) {
					const status = error.response?.status || 500;
					const statusText = error.response?.statusText || "Unknown Error";
					throw new Error(`API error: ${status} ${statusText}`);
				}
				throw error;
			}
		};

		// Opossum circuit breaker with similar config to cockatiel
		this.circuitBreaker = new CircuitBreaker(fetchFn, {
			timeout: this.timeoutMs, // 30s default
			errorThresholdPercentage: 50, // Open after 50% failures
			resetTimeout: 30000, // 30s before trying half-open
			volumeThreshold: 5, // Minimum 5 requests before opening (similar to ConsecutiveBreaker(5))
		});

		// Log circuit breaker state changes
		this.circuitBreaker.on("open", () => console.warn("SnapBack API circuit breaker opened"));
		this.circuitBreaker.on("halfOpen", () => console.warn("SnapBack API circuit breaker half-open"));
		this.circuitBreaker.on("close", () => console.info("SnapBack API circuit breaker closed"));
	}

	private async fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		// Execute with retry + circuit breaker
		return withRetry(
			async () => {
				const result = await this.circuitBreaker.fire(endpoint, options);
				return result as T;
			},
			{
				maxAttempts: 3,
				initialDelayMs: 100,
				maxDelayMs: 5000,
			},
		);
	}

	async analyzeFast(request: AnalysisRequest): Promise<AnalysisResponse> {
		// Route to actual API endpoint: /api/risk/analyze (ORPC: riskRouter.analyze)
		const response = await this.fetchAPI<AnalysisResponse>("api/risk/analyze", {
			method: "POST",
			body: JSON.stringify(request),
		});

		// Validate response
		return AnalysisResponseSchema.parse(response);
	}

	/**
	 * Get iteration stats for a file.
	 *
	 * NOTE: This endpoint is not implemented on the backend.
	 * For MVP, compute locally using @snapback/intelligence package.
	 * Returns mock data to maintain interface compatibility.
	 *
	 * @deprecated Backend endpoint not available - use local computation
	 */
	async getIterationStats(_filePath: string): Promise<IterationStats> {
		// Return sensible defaults - compute locally using Intelligence package instead
		return {
			consecutiveAIEdits: 0,
			riskLevel: "low",
			velocity: 0,
			recommendation: "safe_to_continue",
		};
	}

	async createSnapshot(request: SnapshotRequest): Promise<SnapshotResponse> {
		const response = await this.fetchAPI<SnapshotResponse>("api/snapshots/create", {
			method: "POST",
			body: JSON.stringify(request),
		});

		// Validate response
		return SnapshotResponseSchema.parse(response);
	}

	async getCurrentSession(): Promise<SessionResponse> {
		const response = await this.fetchAPI<SessionResponse>("api/session/current");

		// Validate response
		return SessionResponseSchema.parse(response);
	}

	async getSafetyGuidelines(): Promise<string> {
		return this.fetchAPI<string>("api/guidelines/safety", {
			method: "GET",
		});
	}

	/**
	 * Get circuit breaker state for monitoring
	 * Returns CircuitState enum compatible with cockatiel's API
	 */
	getCircuitBreakerState(): CircuitState {
		if (this.circuitBreaker.opened) {
			return CircuitState.Open;
		}
		if (this.circuitBreaker.halfOpen) {
			return CircuitState.HalfOpen;
		}
		return CircuitState.Closed;
	}

	/**
	 * Generic request method for MCP operations
	 * Used by learning tools and activity reporter
	 *
	 * Uses the /v1/mcp/execute endpoint which accepts tool names directly.
	 * Converts old-style method names (mcp.startSession) to tool names (snapback.start_session).
	 *
	 * @param method - The API method name (e.g., 'mcp.startSession')
	 * @param params - Optional parameters for the request
	 * @returns The API response
	 */
	async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
		// Map old-style method names to tool names for /v1/mcp/execute endpoint
		// e.g., 'mcp.startSession' -> 'snapback.start_session'
		const methodMap: Record<string, string> = {
			"mcp.startSession": "snapback.start_session",
			"mcp.getRecommendations": "snapback.get_recommendations",
			"mcp.recordActivity": "snapback.record_activity",
			"mcp.recordLearning": "snapback.record_learning",
			"mcp.getSessionStats": "snapback.session_stats",
			"mcp.endSession": "snapback.end_session",
		};

		const tool = methodMap[method] || method;

		return this.fetchAPI<T>("v1/mcp/execute", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json",
			},
			body: JSON.stringify({
				tool,
				args: params || {},
			}),
		});
	}
}
