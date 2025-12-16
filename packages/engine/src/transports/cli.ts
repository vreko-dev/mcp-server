/**
 * CLI Transport Adapter
 *
 * Bridges the SnapBack engine with CLI tools (apps/cli).
 * Converts file inputs → engine format → CLI-friendly output.
 *
 * Target: ~150 LOC | Source: apps/cli/src/index.ts
 */

import { orchestrator } from "../runtime/orchestrator.js";
import type { FileChange, SessionHealth } from "../types.js";

// ── CLI Input Types ───────────────────────────────────────────────────────

/** File input for CLI analysis */
export interface CLIFileInput {
	path: string;
	content?: string;
}

/** CLI analysis request */
export interface CLIInput {
	files: CLIFileInput[];
	format: "text" | "json" | "sarif";
	quiet?: boolean;
}

// ── CLI Output Types ──────────────────────────────────────────────────────

/** CLI analysis result */
export interface CLIOutput {
	exitCode: number;
	output: string;
	riskScore: number;
	riskLevel: string;
	error?: string;
}

// ── Risk Level Thresholds ─────────────────────────────────────────────────

const RISK_THRESHOLDS = { safe: 1, low: 3, medium: 5, high: 7 } as const;
const HIGH_RISK_EXIT_THRESHOLD = 5;

function scoreToRiskLevel(score: number): string {
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

// ── CLI Engine Adapter ────────────────────────────────────────────────────

/**
 * Adapter bridging CLI tool calls to the SnapBack engine.
 *
 * @example
 * import { CLIEngineAdapter } from '@snapback/engine/transports/cli';
 * const adapter = new CLIEngineAdapter();
 * const result = await adapter.analyze({ files, format: 'text' });
 * process.exit(result.exitCode);
 */
export class CLIEngineAdapter {
	/** Analyze files and return CLI-formatted output */
	async analyze(input: CLIInput): Promise<CLIOutput> {
		// Input validation
		if (!input || typeof input !== "object") {
			return this.errorResult("Invalid input: expected object with files array");
		}
		if (!Array.isArray(input.files)) {
			return this.errorResult("Invalid input: files must be an array");
		}
		if (input.files.length === 0) {
			return this.emptyResult(input.format);
		}

		try {
			const fileChanges = this.toFileChanges(input.files);
			const result = await orchestrator.analyze(fileChanges);

			// Calculate effective score (max of aggregated and threat signal)
			const threatScore = result.signals.find((s) => s.signal === "threats")?.value || 0;
			const effectiveScore = Math.max(result.riskScore, threatScore);
			const riskLevel = scoreToRiskLevel(effectiveScore);
			const exitCode = effectiveScore > HIGH_RISK_EXIT_THRESHOLD ? 1 : 0;

			return {
				exitCode,
				output: this.formatOutput(effectiveScore, riskLevel, result, input),
				riskScore: effectiveScore,
				riskLevel,
			};
		} catch (error) {
			return this.errorResult(error instanceof Error ? error.message : "Unknown error");
		}
	}

	resetSession(): void {
		orchestrator.resetSession();
	}

	getSessionHealth(): SessionHealth {
		return orchestrator.getHealth();
	}

	// ── Private Helpers ───────────────────────────────────────────────────

	private toFileChanges(files: CLIFileInput[]): FileChange[] {
		return files
			.filter((f) => f.path)
			.map((f) => ({
				path: f.path,
				content: f.content || "",
				lineCount: f.content?.split("\n").length ?? 0,
				changeType: "modify" as const,
			}));
	}

	private formatOutput(
		score: number,
		level: string,
		result: { signals: Array<{ signal: string; value: number }>; health: SessionHealth },
		input: CLIInput,
	): string {
		if (input.quiet && score <= HIGH_RISK_EXIT_THRESHOLD) {
			return "";
		}

		switch (input.format) {
			case "json":
				return JSON.stringify({
					riskScore: score,
					riskLevel: level,
					signals: result.signals.filter((s) => s.value > 0),
					session: result.health,
				});
			case "sarif":
				return this.toSARIF(score, level, result.signals);
			default:
				return this.toText(score, level, result.signals);
		}
	}

	private toText(score: number, level: string, signals: Array<{ signal: string; value: number }>): string {
		const lines = [`Risk Level: ${level.toUpperCase()} (${score.toFixed(1)}/10)`];
		const activeSignals = signals.filter((s) => s.value > 0);
		if (activeSignals.length > 0) {
			lines.push("Signals:");
			for (const s of activeSignals) {
				lines.push(`  - ${s.signal}: ${s.value.toFixed(1)}`);
			}
		}
		return lines.join("\n");
	}

	private toSARIF(_score: number, _level: string, signals: Array<{ signal: string; value: number }>): string {
		return JSON.stringify({
			version: "2.1.0",
			$schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
			runs: [
				{
					tool: { driver: { name: "snapback-engine", version: "0.1.0" } },
					results: signals
						.filter((s) => s.value > 0)
						.map((s) => ({
							ruleId: s.signal,
							level: s.value > 5 ? "error" : "warning",
							message: { text: `${s.signal}: score ${s.value.toFixed(1)}` },
						})),
				},
			],
		});
	}

	private emptyResult(format: string): CLIOutput {
		const output = format === "json" ? '{"riskScore":0,"riskLevel":"safe"}' : "No files to analyze";
		return { exitCode: 0, output, riskScore: 0, riskLevel: "safe" };
	}

	private errorResult(error: string): CLIOutput {
		return { exitCode: 1, output: `Error: ${error}`, riskScore: 0, riskLevel: "safe", error };
	}
}
