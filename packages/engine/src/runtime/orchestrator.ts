/**
 * SnapBack Simplified Architecture - Orchestrator
 *
 * The orchestrator is the brain of the simplified architecture. It:
 * 1. Runs signal scripts in parallel to gather metrics
 * 2. Runs validator scripts to check code quality
 * 3. Aggregates results into a single decision (pass/warn/fail)
 * 4. Tracks session health for continuous coaching
 *
 * Target: ~150 LOC
 *
 * SOURCE REFERENCES:
 * - packages/core/src/risk-analyzer.ts (RiskAnalyzer class)
 * - apps/mcp-server/src/index.ts (tool handlers)
 * - scripts/validate-project.ts (script execution patterns)
 */

import { type ChildProcess, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FileChange, OrchestratorResult, SessionHealth, SignalOutput, ValidatorOutput } from "../types";
import { eventBus } from "./events";

// ESM compatibility: Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Default timeout for script execution (30 seconds) */
const DEFAULT_TIMEOUT = 30_000;

/** Path to scripts directory (relative to this file) */
const SCRIPTS_DIR = join(__dirname, "..");

/** Signal scripts to run (in parallel) */
const SIGNAL_SCRIPTS = [
	"signals/risk-score.ts",
	"signals/complexity.ts",
	"signals/cycles.ts",
	"signals/velocity.ts",
	"signals/consumers.ts",
	"signals/threats.ts",
	"signals/phantom-deps.ts",
];

/** Validator scripts to run (in parallel) */
const VALIDATOR_SCRIPTS = [
	"validators/types.ts",
	"validators/cycles.ts",
	// TODO: Add more validators as implemented
	// 'validators/security.ts',
	// 'validators/patterns.ts',
];

// =============================================================================
// SCRIPT RUNNER
// =============================================================================

/**
 * Run a single script and parse its JSON output
 *
 * @param scriptPath - Path to script relative to SCRIPTS_DIR
 * @param input - Input data to pass via stdin (as JSON)
 * @param timeout - Timeout in milliseconds
 * @returns Parsed JSON output from the script
 *
 * Implementation notes:
 * - Scripts are run with `npx tsx` for TypeScript support
 * - Input is passed via stdin as JSON
 * - Output is expected as JSON on stdout
 * - Non-zero exit code = failure
 */
async function runScript<T>(scriptPath: string, input: unknown, timeout: number = DEFAULT_TIMEOUT): Promise<T> {
	const fullPath = join(SCRIPTS_DIR, scriptPath);
	const startTime = Date.now();

	return new Promise((resolve, reject) => {
		// Spawn the script process
		// Using npx tsx for TypeScript execution
		const proc: ChildProcess = spawn("npx", ["tsx", fullPath], {
			stdio: ["pipe", "pipe", "pipe"],
			timeout,
			// Pass workspace path via environment
			env: {
				...process.env,
				SNAPBACK_WORKSPACE: process.cwd(),
			},
		});

		let stdout = "";
		let stderr = "";

		// Collect stdout
		proc.stdout?.on("data", (data: Buffer) => {
			stdout += data.toString();
		});

		// Collect stderr (for debugging)
		proc.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		// Handle process completion
		proc.on("close", (code: number | null) => {
			const duration = Date.now() - startTime;

			if (code !== 0) {
				// Script failed
				reject(
					new Error(
						`Script ${scriptPath} failed with code ${code}\n` + `stderr: ${stderr}\n` + `stdout: ${stdout}`,
					),
				);
				return;
			}

			// Parse JSON output
			try {
				const result = JSON.parse(stdout) as T;
				// Inject duration if the type supports it
				if (typeof result === "object" && result !== null) {
					(result as any).duration = duration;
				}
				resolve(result);
			} catch (parseError) {
				reject(
					new Error(
						`Script ${scriptPath} output is not valid JSON\n` +
							`stdout: ${stdout}\n` +
							`Parse error: ${parseError}`,
					),
				);
			}
		});

		// Handle process errors
		proc.on("error", (error: Error) => {
			reject(new Error(`Failed to start script ${scriptPath}: ${error.message}`));
		});

		// Write input to stdin and close it
		if (proc.stdin) {
			proc.stdin.write(JSON.stringify(input));
			proc.stdin.end();
		}
	});
}

// =============================================================================
// ORCHESTRATOR CLASS
// =============================================================================

/**
 * Main orchestrator class
 *
 * Usage:
 *   const orchestrator = new Orchestrator();
 *   const result = await orchestrator.analyze(fileChanges);
 *   if (result.outcome === 'fail') {
 *     // Block the change, return errors to agent
 *   }
 */
export class Orchestrator {
	private sessionHealth: SessionHealth;

	constructor() {
		// Initialize with healthy baseline
		this.sessionHealth = {
			score: 100,
			warnings: [],
			suggestions: [],
			filesModified: [],
			cyclesIntroduced: 0,
			complexityDelta: 0,
		};
	}

	/**
	 * Analyze file changes and determine outcome
	 *
	 * This is the main entry point. It:
	 * 1. Runs all signal scripts in parallel
	 * 2. Runs all validator scripts in parallel
	 * 3. Aggregates results
	 * 4. Updates session health
	 * 5. Returns combined outcome
	 *
	 * @param fileChanges - Array of file changes to analyze
	 * @returns Orchestrator result with outcome and details
	 */
	async analyze(fileChanges: FileChange[]): Promise<OrchestratorResult> {
		const startTime = Date.now();

		// Prepare input for scripts
		const input = {
			files: fileChanges,
			workspace: process.cwd(),
			timestamp: Date.now(),
		};

		// Run signals and validators in parallel
		const [signals, validators] = await Promise.all([this.runSignals(input), this.runValidators(input)]);

		// Calculate aggregated risk score
		const riskScore = this.calculateRiskScore(signals);

		// Determine outcome based on validators
		const outcome = this.determineOutcome(validators, riskScore);

		// Update session health
		this.updateSessionHealth(signals, validators, fileChanges);

		// Emit events
		eventBus.emit("risk.analyzed", {
			score: riskScore,
			factorCount: signals.length,
			threatCount: signals.filter((s) => s.signal === "threats").length,
		});

		const duration = Date.now() - startTime;

		return {
			outcome,
			signals,
			validators,
			riskScore,
			health: this.sessionHealth,
			duration,
		};
	}

	/**
	 * Run all signal scripts in parallel
	 */
	private async runSignals(input: unknown): Promise<SignalOutput[]> {
		const results = await Promise.allSettled(
			SIGNAL_SCRIPTS.map((script) => runScript<SignalOutput>(script, input)),
		);

		// Collect successful results, log failures
		const signals: SignalOutput[] = [];
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.status === "fulfilled") {
				signals.push(result.value);
			} else {
				console.warn(`Signal script ${SIGNAL_SCRIPTS[i]} failed:`, result.reason);
				// Emit error event
				eventBus.emit("error.occurred", {
					component: "orchestrator",
					message: `Signal ${SIGNAL_SCRIPTS[i]} failed: ${result.reason}`,
					recoverable: true,
				});
			}
		}

		return signals;
	}

	/**
	 * Run all validator scripts in parallel
	 */
	private async runValidators(input: unknown): Promise<ValidatorOutput[]> {
		const results = await Promise.allSettled(
			VALIDATOR_SCRIPTS.map((script) => runScript<ValidatorOutput>(script, input)),
		);

		// Collect results
		const validators: ValidatorOutput[] = [];
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.status === "fulfilled") {
				validators.push(result.value);

				// Emit validation events
				if (result.value.status === "pass") {
					eventBus.emit("validation.passed", {
						validator: result.value.validator,
						duration: result.value.duration || 0,
					});
				} else {
					eventBus.emit("validation.failed", {
						validator: result.value.validator,
						errorCount: result.value.errors?.length || 0,
						duration: result.value.duration || 0,
					});
				}
			} else {
				console.warn(`Validator script ${VALIDATOR_SCRIPTS[i]} failed:`, result.reason);
				// Treat script failure as validation failure
				validators.push({
					validator: VALIDATOR_SCRIPTS[i],
					status: "fail",
					errors: [{ message: `Script execution failed: ${result.reason}` }],
				});
			}
		}

		return validators;
	}

	/**
	 * Calculate aggregated risk score from signals
	 *
	 * TODO: Extract the scoring formula from packages/core/src/risk-analyzer.ts
	 *
	 * Reference: Line 151 of risk-analyzer.ts
	 *   Math.min(10, totalRiskScore / (filteredFileChanges.length + 1))
	 */
	private calculateRiskScore(signals: SignalOutput[]): number {
		// Find the risk-score signal
		const riskSignal = signals.find((s) => s.signal === "risk-score");
		if (riskSignal) {
			return riskSignal.value;
		}

		// Fallback: aggregate other signals
		// TODO: Implement weighted aggregation
		const sum = signals.reduce((acc, s) => acc + s.value, 0);
		return Math.min(10, sum / (signals.length + 1));
	}

	/**
	 * Determine final outcome based on validators and risk score
	 */
	private determineOutcome(validators: ValidatorOutput[], riskScore: number): "pass" | "warn" | "fail" {
		// Any validator failure = fail
		const hasFailure = validators.some((v) => v.status === "fail");
		if (hasFailure) {
			return "fail";
		}

		// High risk score = warn (but allow)
		if (riskScore > 7) {
			return "warn";
		}

		return "pass";
	}

	/**
	 * Update session health based on analysis results
	 *
	 * This is what enables "coaching" - the agent sees health trends over time.
	 */
	private updateSessionHealth(
		signals: SignalOutput[],
		validators: ValidatorOutput[],
		fileChanges: FileChange[],
	): void {
		// Track files modified
		for (const change of fileChanges) {
			if (!this.sessionHealth.filesModified.includes(change.path)) {
				this.sessionHealth.filesModified.push(change.path);
			}
		}

		// Check for cycles signal
		const cyclesSignal = signals.find((s) => s.signal === "cycles");
		if (cyclesSignal && cyclesSignal.value > 0) {
			this.sessionHealth.cyclesIntroduced = cyclesSignal.value;
			this.sessionHealth.warnings.push(`⚠️ ${cyclesSignal.value} circular dependencies detected`);
		}

		// Check for complexity signal
		const complexitySignal = signals.find((s) => s.signal === "complexity");
		if (complexitySignal) {
			this.sessionHealth.complexityDelta = complexitySignal.value;
			if (complexitySignal.value > 0.3) {
				this.sessionHealth.warnings.push(
					`⚠️ Complexity increased by ${Math.round(complexitySignal.value * 100)}%`,
				);
			}
		}

		// Add suggestions from failed validators
		for (const v of validators) {
			if (v.status === "fail" && v.suggestion) {
				this.sessionHealth.suggestions.push(v.suggestion);
			}
		}

		// Keep only recent warnings/suggestions
		this.sessionHealth.warnings = this.sessionHealth.warnings.slice(-3);
		this.sessionHealth.suggestions = this.sessionHealth.suggestions.slice(-2);

		// Calculate health score
		let score = 100;
		score -= this.sessionHealth.cyclesIntroduced * 15;
		score -= this.sessionHealth.warnings.length * 5;
		score -= Math.max(0, this.sessionHealth.complexityDelta) * 20;
		score -= validators.filter((v) => v.status === "fail").length * 10;
		this.sessionHealth.score = Math.max(0, score);

		// Generate coaching message based on score
		this.sessionHealth.coaching = this.generateCoaching();

		// Emit health change event if significant
		eventBus.emit("session.health_changed", {
			sessionId: "current", // TODO: Implement proper session IDs
			previousScore: 100, // TODO: Track previous score
			currentScore: this.sessionHealth.score,
			trigger: "analysis",
		});
	}

	/**
	 * Generate coaching message based on health score
	 */
	private generateCoaching(): string {
		const { score, warnings, suggestions } = this.sessionHealth;

		if (score >= 90) {
			return ""; // No coaching needed
		}

		if (score >= 70) {
			return `Note: ${warnings[0] || "Minor issues detected"}`;
		}

		if (score >= 50) {
			return `⚠️ Session health declining (${score}/100). ` + `Please address: ${warnings.join(", ")}`;
		}

		return (
			`🛑 STOP: Session health critical (${score}/100). ` +
			`You have introduced ${this.sessionHealth.cyclesIntroduced} cycles. ` +
			`Recommended: ${suggestions[0] || "Review recent changes"}`
		);
	}

	/**
	 * Get current session health (for injection into MCP responses)
	 */
	getHealth(): SessionHealth {
		return { ...this.sessionHealth };
	}

	/**
	 * Reset session health (for new session)
	 */
	resetSession(): void {
		this.sessionHealth = {
			score: 100,
			warnings: [],
			suggestions: [],
			filesModified: [],
			cyclesIntroduced: 0,
			complexityDelta: 0,
		};

		eventBus.emit("session.started", {
			sessionId: `session_${Date.now()}`,
			workspaceHash: "TODO", // TODO: Hash workspace path
		});
	}
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Global orchestrator instance
 *
 * Import this in transports (MCP, CLI, HTTP) to analyze changes.
 */
export const orchestrator = new Orchestrator();
