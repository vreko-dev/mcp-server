/**
 * HTTP Transport Adapter
 *
 * Bridges the SnapBack engine with REST API endpoints (apps/api).
 * Converts HTTP request data → engine format → API response format.
 *
 * Target: ~150 LOC | Source: apps/api/modules/risk/procedures/analyze-risk.ts
 */

import { orchestrator } from "../runtime/orchestrator.js";
import type { FileChange, SessionHealth } from "../types.js";

// ── HTTP Input Types (from apps/api) ──────────────────────────────────────

/** File input from HTTP request body */
export interface HTTPFileInput {
	path: string;
	content?: string;
	changeType?: "added" | "modified" | "deleted";
	linesAdded?: number;
	linesDeleted?: number;
	totalLines?: number;
}

// ── HTTP Output Types (API response contract) ─────────────────────────────

/** Risk factor returned in API response */
export interface HTTPRiskFactor {
	type: string;
	severity: "low" | "medium" | "high";
	message: string;
	details?: Record<string, unknown>;
}

/** Complete API response for /api/risk/analyze */
export interface HTTPRiskResponse {
	analysisId: string;
	riskScore: number;
	riskLevel: "safe" | "low" | "medium" | "high" | "critical";
	riskFactors: HTTPRiskFactor[];
	summary: string;
	recommendations: string[];
	timestamp: string;
	session: SessionHealth;
	error?: string;
}

// ── Risk Level Thresholds ────────────────────────────────────────────────

const RISK_THRESHOLDS = { safe: 1, low: 3, medium: 5, high: 7 } as const;

function scoreToRiskLevel(score: number): HTTPRiskResponse["riskLevel"] {
	if (score <= RISK_THRESHOLDS.safe) {
		return "safe";
	}
	if (score <= RISK_THRESHOLDS.low) {
		return "low";
	}
	if (score <= RISK_THRESHOLDS.medium) {
		return "medium";
	}
	if (score <= RISK_THRESHOLDS.high) {
		return "high";
	}
	return "critical";
}

// ── HTTP Engine Adapter ───────────────────────────────────────────────────

/**
 * Adapter bridging HTTP API calls to the SnapBack engine.
 *
 * @example
 * import { HTTPEngineAdapter } from '@snapback/engine/transports/http';
 * const adapter = new HTTPEngineAdapter();
 * const result = await adapter.analyzeFiles(req.body.files);
 */
export class HTTPEngineAdapter {
	/** Analyze files submitted via HTTP request */
	async analyzeFiles(files: HTTPFileInput[]): Promise<HTTPRiskResponse> {
		const startTime = Date.now();
		const analysisId = crypto.randomUUID();

		// Input validation
		if (!Array.isArray(files)) {
			return this.emptyResult(analysisId, startTime, "Invalid input: files must be an array");
		}
		if (files.length === 0) {
			return this.emptyResult(analysisId, startTime);
		}

		try {
			const fileChanges = this.toFileChanges(files);
			const result = await orchestrator.analyze(fileChanges);
			return this.toHTTPResponse(result, analysisId, startTime);
		} catch (error) {
			return this.emptyResult(analysisId, startTime, error instanceof Error ? error.message : "Unknown error");
		}
	}

	resetSession(): void {
		orchestrator.resetSession();
	}

	getSessionHealth(): SessionHealth {
		return orchestrator.getHealth();
	}

	// ── Private Helpers ───────────────────────────────────────────────────

	/** Convert HTTP file inputs to engine FileChange[] */
	private toFileChanges(files: HTTPFileInput[]): FileChange[] {
		return files
			.filter((f) => f.path) // Skip malformed entries
			.map((f) => ({
				path: f.path,
				content: f.content || "",
				lineCount: f.totalLines || (f.content?.split("\n").length ?? 0),
				changeType: this.mapChangeType(f.changeType),
			}));
	}

	private mapChangeType(type?: string): FileChange["changeType"] {
		if (type === "added") {
			return "add";
		}
		if (type === "deleted") {
			return "delete";
		}
		return "modify";
	}

	/** Convert OrchestratorResult to HTTP API response format */
	private toHTTPResponse(
		result: { riskScore: number; signals: Array<{ signal: string; value: number }>; health: SessionHealth },
		analysisId: string,
		_startTime: number,
	): HTTPRiskResponse {
		// Threat signal may report higher risk than aggregated score
		const threatScore = result.signals.find((s) => s.signal === "threats")?.value || 0;
		const effectiveScore = Math.max(result.riskScore, threatScore);
		const riskLevel = scoreToRiskLevel(effectiveScore);

		// Convert signals to risk factors
		const riskFactors: HTTPRiskFactor[] = result.signals
			.filter((s) => s.value > 0)
			.map((s) => ({
				type: s.signal,
				severity: this.signalToSeverity(s.value),
				message: `${s.signal}: score ${s.value.toFixed(1)}`,
			}));

		return {
			analysisId,
			riskScore: effectiveScore,
			riskLevel,
			riskFactors,
			summary: this.generateSummary(riskLevel, riskFactors.length),
			recommendations: this.generateRecommendations(riskFactors),
			timestamp: new Date().toISOString(),
			session: result.health,
		};
	}

	private signalToSeverity(value: number): HTTPRiskFactor["severity"] {
		if (value <= 3) {
			return "low";
		}
		if (value <= 6) {
			return "medium";
		}
		return "high";
	}

	private generateSummary(riskLevel: string, factorCount: number): string {
		const level = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1);
		return `${level} risk: ${factorCount} factor${factorCount === 1 ? "" : "s"} detected`;
	}

	private generateRecommendations(factors: HTTPRiskFactor[]): string[] {
		const recommendations: string[] = [];
		if (factors.some((f) => f.type === "threats")) {
			recommendations.push("Review code for security threats");
			recommendations.push("Scan for exposed secrets before committing");
		}
		if (factors.some((f) => f.type === "volume")) {
			recommendations.push("Consider breaking large changes into smaller commits");
		}
		if (factors.some((f) => f.type === "velocity")) {
			recommendations.push("Take a break - high edit velocity detected");
		}
		return recommendations;
	}

	/** Create empty/error result with safe defaults */
	private emptyResult(analysisId: string, _startTime: number, error?: string): HTTPRiskResponse {
		return {
			analysisId,
			riskScore: 0,
			riskLevel: "safe",
			riskFactors: [],
			summary: error ? `Error: ${error}` : "No files to analyze",
			recommendations: [],
			timestamp: new Date().toISOString(),
			session: orchestrator.getHealth(),
			error,
		};
	}
}
