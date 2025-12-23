/**
 * Replay Module
 *
 * Records decision logs for:
 * - Determinism verification (replay same inputs → same outputs)
 * - Debugging (why was artifact X selected/rejected?)
 * - Evaluation (A/B testing selection strategies)
 * - Auditing (what context was provided to AI?)
 *
 * Decision logs are safe for external storage (no file content).
 */

import { COMPOSER_VERSION, computeCandidateDigest } from "./cache.js";
import type { ComposerConstraints } from "./constraints.js";
import { hashObject } from "./fingerprint.js";
import type { ArtifactCandidate, ArtifactRef, Lane } from "./types.js";

/**
 * Decision log for replay and evaluation.
 * Saved after each composition for determinism verification.
 * Contains NO file content - safe for external storage.
 */
export interface ComposerDecisionLog {
	// Identification
	/** Unique log ID */
	id: string;
	/** Unix timestamp */
	timestamp: number;
	/** Composer version for compatibility */
	composerVersion: string;

	// Context
	/** Workspace fingerprint */
	workspaceFingerprint: string;
	/** Trigger event type */
	triggerEvent: string;
	/** Git commit or equivalent */
	commitish: string;

	// Inputs
	/** Number of candidates considered */
	candidateCount: number;
	/** Digest of candidate set for verification */
	candidateDigest: string;
	/** Digest of constraints */
	constraintsDigest: string;
	/** Digest of budget configuration */
	budgetConfigDigest: string;

	// Outputs
	/** Selected artifact references */
	selectedArtifacts: ArtifactRef[];
	/** Token allocation by lane */
	budgetAllocation: Record<Lane, number>;
	/** Total tokens used */
	totalTokensUsed: number;

	// Rankings (for debugging)
	rankings: Array<{
		artifact: ArtifactRef;
		score: number;
		selected: boolean;
		rejectionReason?: string;
	}>;

	// Cache
	/** Cache key for this composition */
	cacheKey: string;
	/** Whether this was a cache hit */
	cacheHit: boolean;

	// Expected (for golden tests)
	expectedSelection?: ArtifactRef[];

	// Performance
	/** Duration in milliseconds */
	durationMs: number;
}

/**
 * Generate a unique log ID.
 *
 * @returns Log ID with timestamp prefix for sorting
 */
export function generateLogId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 10);
	return `log_${timestamp}_${random}`;
}

/**
 * Emit a decision log after composition.
 *
 * @param params - Parameters for the decision log
 * @returns Complete decision log
 */
export function emitDecisionLog(params: {
	result: {
		selected: ArtifactRef[];
		allocation: Record<Lane, number>;
		cacheKey: string;
		cacheHit: boolean;
		actualTokens: number;
	};
	trigger: {
		event: string;
		workspaceFingerprint: string;
		commitish?: string;
	};
	constraints: ComposerConstraints;
	candidates: ArtifactCandidate[];
	budgetConfig: Record<string, unknown>;
	rankings: Array<{
		artifact: ArtifactRef;
		score: number;
		selected: boolean;
		rejectionReason?: string;
	}>;
	startTime: number;
}): ComposerDecisionLog {
	const { result, trigger, constraints, candidates, budgetConfig, rankings, startTime } = params;

	return {
		id: generateLogId(),
		timestamp: Date.now(),
		composerVersion: COMPOSER_VERSION,

		workspaceFingerprint: trigger.workspaceFingerprint,
		triggerEvent: trigger.event,
		commitish: trigger.commitish ?? "HEAD",

		candidateCount: candidates.length,
		candidateDigest: computeCandidateDigest(candidates),
		constraintsDigest: hashObject(constraints as unknown as Record<string, unknown>),
		budgetConfigDigest: hashObject(budgetConfig),

		selectedArtifacts: result.selected,
		budgetAllocation: result.allocation,
		totalTokensUsed: result.actualTokens,

		rankings,

		cacheKey: result.cacheKey,
		cacheHit: result.cacheHit,

		durationMs: Date.now() - startTime,
	};
}

/**
 * Result of determinism verification
 */
export interface VerificationResult {
	/** Whether verification passed */
	passed: boolean;
	/** List of differences found */
	differences: string[];
	/** Original log */
	original: ComposerDecisionLog;
	/** Replay result */
	replay?: Partial<ComposerDecisionLog>;
}

/**
 * Verify determinism by comparing a log with a replay.
 *
 * @param original - Original decision log
 * @param replay - Replay result
 * @returns Verification result with differences
 */
export function verifyDeterminism(
	original: ComposerDecisionLog,
	replay: {
		selected: ArtifactRef[];
		allocation: Record<Lane, number>;
		totalTokensUsed: number;
		cacheKey: string;
	},
): VerificationResult {
	const differences: string[] = [];

	// Compare selected artifacts
	const originalIds = new Set(original.selectedArtifacts.map((a) => a.id));
	const replayIds = new Set(replay.selected.map((a) => a.id));

	for (const id of originalIds) {
		if (!replayIds.has(id)) {
			differences.push(`Missing in replay: ${id}`);
		}
	}

	for (const id of replayIds) {
		if (!originalIds.has(id)) {
			differences.push(`Extra in replay: ${id}`);
		}
	}

	// Compare order (if IDs match)
	if (differences.length === 0) {
		const originalOrder = original.selectedArtifacts.map((a) => a.id);
		const replayOrder = replay.selected.map((a) => a.id);

		for (let i = 0; i < originalOrder.length; i++) {
			if (originalOrder[i] !== replayOrder[i]) {
				differences.push(`Order mismatch at position ${i}: ${originalOrder[i]} vs ${replayOrder[i]}`);
				break;
			}
		}
	}

	// Compare token usage
	if (original.totalTokensUsed !== replay.totalTokensUsed) {
		differences.push(`Token mismatch: original=${original.totalTokensUsed}, replay=${replay.totalTokensUsed}`);
	}

	// Compare allocation
	for (const lane of Object.keys(original.budgetAllocation) as Lane[]) {
		const origLane = original.budgetAllocation[lane];
		const replayLane = replay.allocation[lane];
		if (origLane !== replayLane) {
			differences.push(`Lane ${lane} mismatch: original=${origLane}, replay=${replayLane}`);
		}
	}

	// Compare cache keys
	if (original.cacheKey !== replay.cacheKey) {
		differences.push(`Cache key mismatch: original=${original.cacheKey}, replay=${replay.cacheKey}`);
	}

	return {
		passed: differences.length === 0,
		differences,
		original,
		replay: {
			selectedArtifacts: replay.selected,
			budgetAllocation: replay.allocation,
			totalTokensUsed: replay.totalTokensUsed,
			cacheKey: replay.cacheKey,
		},
	};
}

/**
 * Format a decision log for display
 *
 * @param log - Decision log
 * @returns Formatted string
 */
export function formatDecisionLog(log: ComposerDecisionLog): string {
	const lines: string[] = [
		`Decision Log: ${log.id}`,
		`  Timestamp: ${new Date(log.timestamp).toISOString()}`,
		`  Version: ${log.composerVersion}`,
		`  Trigger: ${log.triggerEvent}`,
		`  Commit: ${log.commitish}`,
		"",
		`  Candidates: ${log.candidateCount}`,
		`  Selected: ${log.selectedArtifacts.length}`,
		`  Tokens: ${log.totalTokensUsed}`,
		`  Duration: ${log.durationMs}ms`,
		`  Cache: ${log.cacheHit ? "HIT" : "MISS"}`,
		"",
		"  Allocation:",
	];

	for (const [lane, tokens] of Object.entries(log.budgetAllocation)) {
		lines.push(`    ${lane}: ${tokens}`);
	}

	if (log.rankings.length > 0) {
		lines.push("");
		lines.push("  Top Rankings:");
		for (const r of log.rankings.slice(0, 5)) {
			const status = r.selected ? "✓" : `✗ (${r.rejectionReason})`;
			lines.push(`    ${status} ${r.artifact.kind}: ${r.score.toFixed(3)}`);
		}
	}

	return lines.join("\n");
}

/**
 * Create a minimal log for storage (no rankings)
 *
 * @param log - Full decision log
 * @returns Minimal log
 */
export function toMinimalLog(log: ComposerDecisionLog): Omit<ComposerDecisionLog, "rankings"> {
	const { rankings, ...minimal } = log;
	return minimal;
}

/**
 * Validate a decision log structure
 *
 * @param log - Log to validate
 * @returns true if valid
 */
export function isValidDecisionLog(log: unknown): log is ComposerDecisionLog {
	if (!log || typeof log !== "object") return false;

	const l = log as Record<string, unknown>;

	return (
		typeof l.id === "string" &&
		typeof l.timestamp === "number" &&
		typeof l.composerVersion === "string" &&
		typeof l.workspaceFingerprint === "string" &&
		typeof l.triggerEvent === "string" &&
		typeof l.candidateCount === "number" &&
		Array.isArray(l.selectedArtifacts) &&
		typeof l.totalTokensUsed === "number"
	);
}

/**
 * Compare two logs for equality (ignoring timing/cache)
 *
 * @param a - First log
 * @param b - Second log
 * @returns true if selections are equivalent
 */
export function logsAreEquivalent(a: ComposerDecisionLog, b: ComposerDecisionLog): boolean {
	// Compare selected artifact IDs
	const aIds = a.selectedArtifacts
		.map((x) => x.id)
		.sort()
		.join(",");
	const bIds = b.selectedArtifacts
		.map((x) => x.id)
		.sort()
		.join(",");

	if (aIds !== bIds) return false;

	// Compare token totals
	if (a.totalTokensUsed !== b.totalTokensUsed) return false;

	// Compare allocations
	for (const lane of Object.keys(a.budgetAllocation) as Lane[]) {
		if (a.budgetAllocation[lane] !== b.budgetAllocation[lane]) return false;
	}

	return true;
}
