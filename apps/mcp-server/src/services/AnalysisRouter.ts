/**
 * Analysis Router: Intelligent routing between local Guardian Lite and API
 *
 * Purpose: Route analysis requests based on feature flags, API availability,
 * and user tier (Free uses local Guardian Lite, Pro uses API when available)
 *
 * Features:
 * - Always-available Guardian Lite for offline-first experience
 * - Circuit breaker for graceful API degradation
 * - Feature flag support for gradual rollouts
 * - Tier-based routing (Free → Local, Pro → API with fallback)
 */

import type { SnapBackAPIClient } from "../client/snapback-api.js";

// Types for Analysis Results (matches @snapback/guardian-lite)
export type RiskLevel = "none" | "low" | "medium" | "high";
export type Severity = "low" | "medium" | "high";
export type IssueType = "secret" | "mock" | "dependency";

export interface Issue {
	type: IssueType;
	severity: Severity;
	message: string;
	pattern: string;
	line?: number;
}

export interface AnalysisResult {
	riskLevel: RiskLevel;
	confidence: number;
	issues: Issue[];
	executionTime: number;
	upgradePrompt: boolean;
	recommendations: string[];
}

export interface UserContext {
	userId?: string;
	email?: string;
	tier: "free" | "pro";
	orgId?: string;
}

// Simple Guardian Lite stub for when package is not available
class StubGuardianLite {
	analyze(_code: string): AnalysisResult {
		return {
			riskLevel: "low",
			confidence: 0.5,
			issues: [],
			executionTime: 0,
			upgradePrompt: false,
			recommendations: [],
		};
	}
}

let GuardianLiteClass: any = StubGuardianLite;

// Try to load the actual Guardian Lite package
try {
	const guardianModule = require("@snapback/guardian-lite");
	GuardianLiteClass = guardianModule.GuardianLite;
} catch (_err) {
	console.warn(
		"[AnalysisRouter] Guardian Lite package not found - using stub. Install with: pnpm add @snapback/guardian-lite",
	);
}


export interface CircuitBreakerOptions {
	failureThreshold?: number;
	successThreshold?: number;
	timeout?: number;
}

/**
 * Simple circuit breaker for API resilience
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing) → CLOSED
 */
class CircuitBreaker {
	private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
	private failureCount = 0;
	private successCount = 0;
	private nextAttemptAt = Date.now();

	constructor(
		private failureThreshold = 3,
		private successThreshold = 2,
		private timeout = 30000, // 30 seconds
	) {}

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (this.state === "OPEN") {
			if (Date.now() < this.nextAttemptAt) {
				throw new Error("Circuit breaker is OPEN");
			}
			this.state = "HALF_OPEN";
		}

		try {
			const result = await fn();

			if (this.state === "HALF_OPEN") {
				this.successCount++;
				if (this.successCount >= this.successThreshold) {
					this.state = "CLOSED";
					this.failureCount = 0;
					this.successCount = 0;
				}
			}

			return result;
		} catch (error) {
			this.failureCount++;

			if (this.failureCount >= this.failureThreshold) {
				this.state = "OPEN";
				this.nextAttemptAt = Date.now() + this.timeout;
			}

			throw error;
		}
	}

	getState(): string {
		return this.state;
	}
}

export class AnalysisRouter {
	private guardian: any;
	private apiClient: SnapBackAPIClient | null;
	private circuitBreaker: CircuitBreaker | null;
	private featureFlags: Map<string, boolean> = new Map();

	constructor(apiClient?: SnapBackAPIClient) {
		this.guardian = new GuardianLiteClass();
		this.apiClient = apiClient || null;
		this.circuitBreaker = apiClient ? new CircuitBreaker() : null;
	}

	/**
	 * Route analysis request to local Guardian Lite or API based on tier and feature flags
	 *
	 * Flow:
	 * 1. Free tier users: Always use local Guardian Lite with upgrade prompts
	 * 2. Pro tier users: Try API if available, fall back to local Guardian Lite
	 * 3. API unavailable: Use local Guardian Lite
	 */
	async analyze(code: string, userContext?: UserContext): Promise<AnalysisResult> {
		const tier = userContext?.tier || "free";

		// Free tier: Always use local Guardian Lite
		if (tier === "free") {
			const result = await this.guardian.analyze(code);
			return this.addUpgradePrompt(result, "Free tier users can upgrade to Pro for advanced ML-based analysis");
		}

		// Pro tier: Try API, fall back to local
		if (this.apiClient && this.circuitBreaker) {
			try {
				// Check feature flag for ML detection
				if (this.featureFlags.get("ml-detection") !== false) {
					return await this.analyzeWithAPI(code, userContext);
				}
			} catch (error) {
				console.error("[AnalysisRouter] API analysis failed, falling back to local:", error);
			}
		}

		// Fallback to local Guardian Lite
		return this.guardian.analyze(code);
	}

	/**
	 * Analyze code using the backend API with circuit breaker protection
	 */
	private async analyzeWithAPI(code: string, _userContext?: UserContext): Promise<AnalysisResult> {
		if (!this.apiClient || !this.circuitBreaker) {
			return this.guardian.analyze(code);
		}

		try {
			return await this.circuitBreaker.execute(async () => {
				// Call backend API
				const apiResult = await this.apiClient?.analyzeFast({
					code,
					filePath: "analysis.ts",
					context: {
						projectType: "mcp-analysis",
						language: "typescript",
					},
				});

				// Map API result to Guardian Lite format
				return this.mapAPIResult(apiResult);
			});
		} catch (error) {
			// Circuit breaker open or API error - use local fallback
			console.error("[AnalysisRouter] API unavailable, using local Guardian Lite:", error);
			return this.guardian.analyze(code);
		}
	}

	/**
	 * Map API response format to Guardian Lite AnalysisResult format
	 */
	private mapAPIResult(apiResult: any): AnalysisResult {
		const riskLevel = this.mapRiskLevel(apiResult.riskLevel);
		const confidence = Math.min(1, Math.max(0, apiResult.confidence || 0.5));

		return {
			riskLevel,
			confidence,
			issues: apiResult.issues || [],
			executionTime: apiResult.analysisTimeMs || 0,
			upgradePrompt: false, // API results don't need upgrade prompts
			recommendations: apiResult.recommendations || [],
		};
	}

	/**
	 * Map API risk levels to Guardian Lite risk levels
	 */
	private mapRiskLevel(apiLevel: string): RiskLevel {
		switch (apiLevel?.toLowerCase()) {
			case "high":
			case "critical":
				return "high";
			case "medium":
				return "medium";
			case "low":
				return "low";
			default:
				return "none";
		}
	}

	/**
	 * Add upgrade prompt to result if needed
	 */
	private addUpgradePrompt(result: AnalysisResult, message: string): AnalysisResult {
		return {
			...result,
			upgradePrompt: true,
			recommendations: [
				...result.recommendations,
				`💡 ${message} for advanced analysis capabilities.`,
			],
		};
	}

	/**
	 * Set feature flags for gradual rollouts and A/B testing
	 */
	setFeatureFlag(name: string, enabled: boolean): void {
		this.featureFlags.set(name, enabled);
	}

	/**
	 * Get circuit breaker status for monitoring
	 */
	getCircuitBreakerStatus(): string {
		return this.circuitBreaker?.getState() || "N/A";
	}
}
