import {
	ConsecutiveBreaker,
	circuitBreaker,
	ExponentialBackoff,
	handleAll,
	type IPolicy,
	retry,
	TimeoutStrategy,
	timeout,
	wrap,
} from "cockatiel";
import ky, { HTTPError, type KyInstance, type Options } from "ky";
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

const IterationStatsSchema = z.object({
	consecutiveAIEdits: z.number(),
	riskLevel: z.string(),
	velocity: z.number(),
	recommendation: z.string(),
});

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

export class SnapBackAPIClient {
	private client: KyInstance;
	private resilience: IPolicy;

	constructor(config: SnapBackConfig) {
		this.config = config;

		// Configure ky WITHOUT retry or timeout - cockatiel handles these
		const kyOptions: Options = {
			prefixUrl: config.baseUrl,
			timeout: false, // Cockatiel handles timeout
			retry: {
				limit: 0, // Disable ky retry - cockatiel handles it
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

		// Configure cockatiel policies
		const retryPolicy = retry(handleAll, {
			maxAttempts: 3,
			backoff: new ExponentialBackoff({
				initialDelay: 100, // Start with 100ms
				maxDelay: 5000, // Max 5s between retries
				exponent: 2, // Double each time
			}),
		});

		const circuitBreakerPolicy = circuitBreaker(handleAll, {
			halfOpenAfter: 30000, // 30s
			breaker: new ConsecutiveBreaker(5), // Open after 5 consecutive failures
		});

		const timeoutPolicy = timeout(config.timeout ?? 30000, TimeoutStrategy.Cooperative);

		// Compose policies: timeout → retry → circuitBreaker
		this.resilience = wrap(timeoutPolicy, wrap(retryPolicy, circuitBreakerPolicy));
	}

	private async fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		// Remove leading slash if present when using prefixUrl
		const url = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

		// Execute with cockatiel resilience
		return this.resilience.execute(async () => {
			try {
				const response = await this.client(url, {
					...options,
				});

				return (await response.json()) as T;
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
				// Handle mock fetch errors that don't have the expected structure
				if (error.message?.includes("status")) {
					// Try to extract status from message if possible
					throw error;
				}
				throw error;
			}
		});
	}

	async analyzeFast(request: AnalysisRequest): Promise<AnalysisResponse> {
		const response = await this.fetchAPI<AnalysisResponse>("api/analyze/fast", {
			method: "POST",
			body: JSON.stringify(request),
		});

		// Validate response
		return AnalysisResponseSchema.parse(response);
	}

	async getIterationStats(filePath: string): Promise<IterationStats> {
		const response = await this.fetchAPI<IterationStats>(
			`api/session/iteration-stats?filePath=${encodeURIComponent(filePath)}`,
		);

		// Validate response
		return IterationStatsSchema.parse(response);
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
		// Execute with cockatiel resilience through our fetchAPI method
		return this.fetchAPI<string>("api/guidelines/safety", {
			method: "GET",
		});
	}

	/**
	 * Get circuit breaker state for monitoring
	 */
	getCircuitBreakerState(): "closed" | "open" | "half-open" | "isolated" {
		// Access the circuit breaker policy state
		// Note: This assumes the circuit breaker is the last policy in the chain
		return "closed"; // TODO: Implement state access
	}
}
