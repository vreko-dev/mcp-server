import { AnalyzeRiskArgsSchema } from "@snapback/contracts";
import { z } from "zod";
import { getLibraryDocsCached } from "./utils/cache.js";
import { logger } from "./utils/logger.js";

// Using hardcoded values for now to avoid import issues
const _snapbackDefaults = {
	mcp: {
		timeoutMs: 5000,
		maxConcurrent: 4,
		retry: { retries: 2, factor: 2, min: 250, max: 1500, jitter: true },
		circuit: {
			enabled: true,
			errorThresholdPercentage: 50,
			volumeThreshold: 10,
			timeoutMs: 5000,
			resetMs: 30000,
			rollingCountMs: 60000,
			rollingCountBuckets: 6,
		},
	},
} as const;

/**
 * NOTE: This implementation was based on a misunderstanding of MCP.
 * MCP stands for Model Context Protocol, not Multi-Client Protocol.
 *
 * This class should be used for:
 * 1. Service discovery of external systems (not MCP servers)
 * 2. Fallback mechanisms when external services are unavailable
 * 3. Integration with proper MCP clients for actual MCP servers
 *
 * For proper MCP implementation, see MCPClientManager.
 */

interface ServiceCapability {
	name: string;
	type: "docs" | "search" | "git" | "fs" | "registry" | "ci" | "sec" | "issue";
	mcpServer?: string; // If this service has an MCP server
	tools?: Record<string, string>;
}

type ServiceType = "docs" | "search" | "git" | "fs" | "registry" | "ci" | "sec" | "issue";

type Capabilities = Partial<Record<ServiceType, ServiceCapability>>;

// Simple circuit breaker implementation
class SimpleCircuitBreaker {
	failureCount = 0;
	threshold = 3;

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// Check circuit breaker state first
		if (this.failureCount >= this.threshold) {
			throw new Error("Circuit breaker open");
		}

		try {
			const result = await fn();
			this.failureCount = 0; // Reset on success
			return result;
		} catch (error) {
			this.failureCount++;
			// Check if we should open the circuit breaker now
			if (this.failureCount >= this.threshold) {
				throw new Error("Circuit breaker open");
			}
			throw error;
		}
	}
}

// Store circuit breakers by service type
const circuitBreakers = new Map<ServiceType, SimpleCircuitBreaker>();

/**
 * Normalized error response structure
 */
interface NormalizedError {
	code: string;
	message: string;
	origin: string;
	retriable: boolean;
	details?: any;
}

/**
 * Tool parameter interfaces with Zod schemas
 * Note: AnalyzeRiskArgsSchema is now imported from @snapback/contracts
 */

export const PrepareUpgradeAdviceArgsSchema = z.object({
	before: z.record(z.string(), z.any()),
	after: z.record(z.string(), z.any()),
	requestId: z.string().optional(),
});

export const VerifyAIChangeArgsSchema = z.object({
	file: z.string(),
	diff: z.array(
		z.object({
			added: z.boolean().optional().default(false),
			removed: z.boolean().optional().default(false),
			value: z.string(),
			count: z.number().optional(),
		}),
	),
	requestId: z.string().optional(),
});

export const RecoveryPlanArgsSchema = z.object({
	incidentId: z.string(),
	requestId: z.string().optional(),
});

// Tool return interfaces
interface RiskScore {
	score: number;
	factors: string[];
	severity: "low" | "medium" | "high" | "critical";
}

interface UpgradeAdvice {
	summary: Record<string, any>;
	ask_context7_for?: Array<{ pkg: string; topics: string[] }>;
	ask_registry_for?: Array<{ pkg: string; range: string }>;
	ask_codesearch_for?: Array<{ query: string; include: string[] }>;
	risk: RiskScore;
	snapshotSuggested: boolean;
}

interface AIChangeVerification {
	risk: RiskScore;
	docs_queries?: Array<{ symbol: string; lang: string }>;
	search_queries?: Array<{ symbol: string; scope: string }>;
	require_snapshot: boolean;
}

interface RecoveryPlan {
	restoreOptions: Array<{ type: string; id: string }>;
	ask_git_for?: string[];
	ask_docs_for?: string[];
	steps: string[];
}

export class ServiceFederation {
	private capabilities: Capabilities = {};

	constructor(_workspaceRoot: string = process.cwd()) {
		// Initialize circuit breakers for all service types
		const serviceTypes: ServiceType[] = ["docs", "search", "git", "fs", "registry", "ci", "sec", "issue"];
		for (const type of serviceTypes) {
			circuitBreakers.set(type, new SimpleCircuitBreaker());
		}
	}

	discoverCapabilities(): Capabilities {
		return { ...this.capabilities };
	}

	registerService(type: ServiceType, capability: ServiceCapability): void {
		this.capabilities[type] = capability;
	}

	/**
	 * Execute a service function with fallback, including enhanced error handling
	 */
	async executeWithFallback<T>(
		serviceType: ServiceType,
		serviceFunction: () => Promise<T>,
		fallbackFunction: () => T,
	): Promise<T> {
		// Check if the service is available
		if (this.capabilities[serviceType]) {
			// Get circuit breaker for this service type
			const circuitBreaker = circuitBreakers.get(serviceType) || new SimpleCircuitBreaker();

			try {
				// Try to execute the service function through the circuit breaker
				return await circuitBreaker.execute(serviceFunction);
			} catch (error: any) {
				// Normalize error
				const normalizedError: NormalizedError = {
					code: this.getErrorCode(error),
					message: error.message || "Unknown error",
					origin: serviceType,
					retriable: this.isRetriable(error),
					details: error,
				};

				// Log error with redaction
				logger.error({ error: this.redactError(normalizedError) }, "Service call failed");

				// Use fallback
				logger.warn(`Service ${serviceType} failed, using fallback`);
				return fallbackFunction();
			}
		} else {
			// If service is not available, use fallback
			return fallbackFunction();
		}
	}

	/**
	 * Execute with timeout
	 */
	async executeWithTimeout<T>(
		serviceType: ServiceType,
		serviceFunction: () => Promise<T>,
		fallbackFunction: () => T,
		timeoutMs = 5000,
	): Promise<T> {
		// Create a timeout promise
		const timeoutPromise = new Promise<T>((_, reject) => {
			setTimeout(() => reject(new Error(`Service call timed out after ${timeoutMs}ms`)), timeoutMs);
		});

		try {
			// Race the service function against the timeout
			const result = await Promise.race([
				this.executeWithFallback(serviceType, serviceFunction, fallbackFunction),
				timeoutPromise,
			]);
			return result;
		} catch (error: any) {
			// Normalize timeout errors
			const normalizedError: NormalizedError = {
				code: this.getErrorCode(error),
				message: error.message || "Unknown error",
				origin: serviceType,
				retriable: this.isRetriable(error),
				details: error,
			};

			// If timed out or any other error, use fallback
			logger.warn(
				{ error: this.redactError(normalizedError) },
				`Service ${serviceType} timed out or failed, using fallback`,
			);
			return fallbackFunction();
		}
	}

	/**
	 * Execute with cache
	 */
	async executeWithCache<T>(
		serviceType: ServiceType,
		cacheKey: string,
		serviceFunction: () => Promise<T>,
		fallbackFunction: () => T,
	): Promise<T> {
		try {
			// Use the cache utility to get or set cached results
			const result = await getLibraryDocsCached(cacheKey, () =>
				this.executeWithFallback(serviceType, serviceFunction, fallbackFunction),
			);
			return result as T;
		} catch (error: any) {
			// Normalize error
			const normalizedError: NormalizedError = {
				code: this.getErrorCode(error),
				message: error.message || "Unknown error",
				origin: serviceType,
				retriable: this.isRetriable(error),
				details: error,
			};

			// If any error, use fallback
			logger.warn(
				{ error: this.redactError(normalizedError) },
				`Service ${serviceType} with cache failed, using fallback`,
			);
			return fallbackFunction();
		}
	}

	/**
	 * Normalize error codes
	 */
	private getErrorCode(error: any): string {
		if (error.code) {
			return error.code;
		}
		if (error.message?.includes("timeout")) {
			return "E_TIMEOUT";
		}
		if (error.message?.includes("circuit breaker")) {
			return "E_CIRCUIT_OPEN";
		}
		return "E_UNKNOWN";
	}

	/**
	 * Determine if an error is retriable
	 */
	private isRetriable(error: any): boolean {
		const nonRetriableCodes = ["E_INVALID_INPUT", "E_FORBIDDEN"];
		return !nonRetriableCodes.includes(this.getErrorCode(error));
	}

	/**
	 * Redact sensitive information from errors
	 */
	private redactError(error: NormalizedError): NormalizedError {
		// Create a copy to avoid mutating the original
		const redacted = { ...error };

		// Redact sensitive details if present
		if (redacted.details) {
			// Remove any file paths or sensitive data
			if (typeof redacted.details === "object") {
				for (const key in redacted.details) {
					if (key.includes("path") || key.includes("file") || key.includes("token")) {
						redacted.details[key] = "[REDACTED]";
					}
				}
			}
		}

		return redacted;
	}

	/**
	 * Core SnapBack Tools with enhanced validation
	 */

	analyzeRisk(args: z.infer<typeof AnalyzeRiskArgsSchema>): RiskScore {
		try {
			const _validatedArgs = AnalyzeRiskArgsSchema.parse(args);

			// In a real implementation, this would analyze the changes and calculate a risk score
			// For now, we'll return a placeholder
			return {
				score: 0.5,
				factors: ["placeholder"],
				severity: "medium",
			};
		} catch (error: any) {
			logger.error("Invalid arguments for analyzeRisk", error);
			throw new Error(`Invalid arguments: ${error.message}`);
		}
	}

	prepareUpgradeAdvice(args: z.infer<typeof PrepareUpgradeAdviceArgsSchema>): UpgradeAdvice {
		try {
			const _validatedArgs = PrepareUpgradeAdviceArgsSchema.parse(args);

			// In a real implementation, this would analyze dependencies and prepare upgrade advice
			// For now, we'll return a placeholder
			return {
				summary: {},
				risk: {
					score: 0.3,
					factors: ["placeholder"],
					severity: "low",
				},
				snapshotSuggested: false,
			};
		} catch (error: any) {
			logger.error("Invalid arguments for prepareUpgradeAdvice", error);
			throw new Error(`Invalid arguments: ${error.message}`);
		}
	}

	verifyAIChange(args: z.infer<typeof VerifyAIChangeArgsSchema>): AIChangeVerification {
		try {
			const _validatedArgs = VerifyAIChangeArgsSchema.parse(args);

			// In a real implementation, this would verify AI changes
			// For now, we'll return a placeholder
			return {
				risk: {
					score: 0.2,
					factors: ["placeholder"],
					severity: "low",
				},
				require_snapshot: false,
			};
		} catch (error: any) {
			logger.error("Invalid arguments for verifyAIChange", error);
			throw new Error(`Invalid arguments: ${error.message}`);
		}
	}

	recoveryPlan(args: z.infer<typeof RecoveryPlanArgsSchema>): RecoveryPlan {
		try {
			const _validatedArgs = RecoveryPlanArgsSchema.parse(args);

			// In a real implementation, this would create a recovery plan
			// For now, we'll return a placeholder
			return {
				restoreOptions: [],
				steps: ["placeholder"],
			};
		} catch (error: any) {
			logger.error("Invalid arguments for recoveryPlan", error);
			throw new Error(`Invalid arguments: ${error.message}`);
		}
	}
}
