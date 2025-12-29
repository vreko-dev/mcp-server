/**
 * MCP Transport Adapter
 *
 * Bridges the SnapBack engine with MCP clients (Claude Desktop).
 * Converts MCP tool arguments → engine format → MCP response format.
 *
 * Target: ~200 LOC | Source: apps/mcp-server/src/index.ts
 */

import { orchestrator } from "../runtime/orchestrator.js";
import type { FileChange, OrchestratorResult, SessionHealth } from "../types.js";
import { scoreToRiskLevel, type RiskLevel } from "./shared.js";

// ── MCP Input Types ─────────────────────────────────────────────────────────

/** Change object from MCP analyze_risk tool (matches schema in apps/mcp-server) */
export interface MCPChange {
	added?: boolean;
	removed?: boolean;
	value?: string;
	count?: number;
}

// ── MCP Output Types ────────────────────────────────────────────────────────

export interface MCPRiskResult {
	riskLevel: RiskLevel;
	score: number;
	factors: string[];
	analysisTimeMs: number;
	issues: MCPIssue[];
	session: SessionHealth;
	error?: string;
}

export interface MCPIssue {
	type: string;
	severity: "info" | "warning" | "error" | "critical";
	message: string;
	line?: number;
}

export interface MCPDependencyResult {
	added: string[];
	removed: string[];
	changed: Array<{ name: string; from: string; to: string }>;
	vulnerabilities: string[];
	session: SessionHealth;
}

// ── MCP Engine Adapter ──────────────────────────────────────────────────────

/**
 * Adapter bridging MCP tool calls to the SnapBack engine.
 *
 * @example
 * import { MCPEngineAdapter } from '@snapback/engine/transports/mcp';
 * const adapter = new MCPEngineAdapter();
 * const result = await adapter.analyzeRisk(args.changes);
 */
export class MCPEngineAdapter {
	/** Analyze code changes for risk using the engine orchestrator */
	async analyzeRisk(changes: MCPChange[]): Promise<MCPRiskResult> {
		const startTime = Date.now();

		// Input validation
		if (!Array.isArray(changes)) {
			return this.emptyResult(startTime, "Invalid input: changes must be an array");
		}
		if (changes.length === 0) {
			return this.emptyResult(startTime);
		}

		try {
			const fileChanges = this.toFileChanges(changes);
			const result = await orchestrator.analyze(fileChanges);
			return this.toMCPResult(result, startTime);
		} catch (error) {
			return this.emptyResult(startTime, error instanceof Error ? error.message : "Unknown error");
		}
	}

	/** Check dependencies for risks (added, removed, version changes) */
	async checkDependencies(
		before: Record<string, string>,
		after: Record<string, string>,
	): Promise<MCPDependencyResult> {
		const beforeKeys = Object.keys(before || {});
		const afterKeys = Object.keys(after || {});

		return {
			added: afterKeys.filter((k) => !beforeKeys.includes(k)),
			removed: beforeKeys.filter((k) => !afterKeys.includes(k)),
			changed: beforeKeys
				.filter((k) => afterKeys.includes(k) && before[k] !== after[k])
				.map((k) => ({ name: k, from: before[k], to: after[k] })),
			vulnerabilities: [],
			session: orchestrator.getHealth(),
		};
	}

	resetSession(): void {
		orchestrator.resetSession();
	}

	getSessionHealth(): SessionHealth {
		return orchestrator.getHealth();
	}

	// ── Private Helpers ────────────────────────────────────────────────────────

	/**
	 * Convert MCP changes to engine FileChange[]
	 * Groups added/removed lines into synthetic files for analysis
	 */
	private toFileChanges(changes: MCPChange[]): FileChange[] {
		const addedContent = changes
			.filter((c) => c.added && c.value)
			.map((c) => c.value as string)
			.join("\n");

		const removedContent = changes
			.filter((c) => c.removed && c.value)
			.map((c) => c.value as string)
			.join("\n");

		const fileChanges: FileChange[] = [];

		if (addedContent.trim()) {
			fileChanges.push({
				path: "mcp-analysis-added.ts",
				content: addedContent,
				lineCount: addedContent.split("\n").length,
				changeType: "add",
			});
		}

		if (removedContent.trim()) {
			fileChanges.push({
				path: "mcp-analysis-removed.ts",
				content: removedContent,
				lineCount: removedContent.split("\n").length,
				changeType: "delete",
			});
		}

		// Edge case: changes exist but no extractable content
		if (fileChanges.length === 0 && changes.length > 0) {
			fileChanges.push({ path: "mcp-analysis.ts", content: "", lineCount: 0, changeType: "modify" });
		}

		return fileChanges;
	}

	/** Convert OrchestratorResult to MCP response format */
	private toMCPResult(result: OrchestratorResult, startTime: number): MCPRiskResult {
		// Threat signal may report higher risk than aggregated score
		const threatScore = result.signals.find((s) => s.signal === "threats")?.value || 0;
		const effectiveScore = Math.max(result.riskScore, threatScore);

		return {
			riskLevel: scoreToRiskLevel(effectiveScore),
			score: effectiveScore,
			factors: result.signals.filter((s) => s.value > 0).map((s) => `${s.signal}: ${s.value.toFixed(1)}`),
			issues: result.validators
				.filter((v) => v.status === "fail" && v.errors)
				.flatMap(
					(v) =>
						v.errors?.map((e) => ({
							type: v.validator,
							severity: (e.severity === "error" ? "error" : "warning") as MCPIssue["severity"],
							message: e.message,
							line: e.line,
						})) ?? [],
				),
			analysisTimeMs: Date.now() - startTime,
			session: result.health,
		};
	}

	/** Create empty/error result with safe defaults */
	private emptyResult(startTime: number, error?: string): MCPRiskResult {
		return {
			riskLevel: "safe",
			score: 0,
			factors: [],
			issues: [],
			analysisTimeMs: Date.now() - startTime,
			session: orchestrator.getHealth(),
			error,
		};
	}
}
