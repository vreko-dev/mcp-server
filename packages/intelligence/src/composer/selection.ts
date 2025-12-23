/**
 * Selection Pipeline
 *
 * The core selection algorithm that:
 * 1. Applies exclusions (policy-blocked artifacts)
 * 2. Extracts pinned artifacts (always selected first)
 * 3. Extracts must-include artifacts (after pinned)
 * 4. Scores and ranks remaining candidates
 * 5. Selects within budget constraints
 * 6. Generates explainable results
 *
 * Key guarantee: Deterministic - same inputs → same outputs
 */

import type { AllocationResult } from "./allocation.js";
import { allocateMinBudgets, selectWithinBudget } from "./allocation.js";
import type { BudgetConfig } from "./budget.js";
import type { ComposerConstraints } from "./constraints.js";
import { isExcluded, isMustInclude, isPinned } from "./constraints.js";
import { scoreAndSort } from "./scoring.js";
import type { ArtifactCandidate, ArtifactRef, Lane, RenderedArtifact } from "./types.js";

/**
 * Reason why an artifact was rejected
 */
export type RejectionReason = "excluded_by_policy" | "lane_max_reached" | "budget_exceeded" | "lower_priority";

/**
 * Record of a rejected artifact with reason
 */
export interface RejectionRecord {
	artifact: ArtifactRef;
	reason: RejectionReason;
	detail?: string;
}

/**
 * Context for selection (used for cache key computation)
 */
export interface SelectionContext {
	/** Workspace fingerprint for cache keying */
	workspaceFingerprint: string;
	/** What triggered this selection */
	triggerEvent: string;
	/** Git commit or equivalent */
	commitish: string;
	/** Hash of active rules */
	rulesDigest: string;
}

/**
 * Selection result (safe for logging/telemetry)
 */
export interface SelectionResult {
	/** Selected artifact references (IDs only, no content) */
	selected: ArtifactRef[];
	/** Tokens used per lane */
	allocation: Record<Lane, number>;
	/** Rejection records for explainability */
	rejections: RejectionRecord[];
	/** Cache key for this selection */
	cacheKey: string;
	/** Whether this was a cache hit */
	cacheHit: boolean;
	/** Allocation details (for debugging) */
	allocationDetails: AllocationResult;

	/**
	 * Rendered artifacts (internal only, filled in render pass)
	 * Content is never logged externally
	 */
	rendered: RenderedArtifact[];
}

/**
 * Convert an ArtifactCandidate to an ArtifactRef (safe for logging)
 *
 * @param candidate - Full candidate with content
 * @returns Reference without content
 */
export function toRef(candidate: ArtifactCandidate): ArtifactRef {
	return {
		id: candidate.id,
		kind: candidate.kind,
		lane: candidate.lane,
		tokenEstimate: candidate.tokenEstimate,
	};
}

/**
 * Main selection function.
 * Implements the constraint-aware selection pipeline.
 *
 * Algorithm:
 * 1. Apply exclusions (remove policy-blocked)
 * 2. Extract pinned (selected unconditionally)
 * 3. Extract must-include (selected after pinned)
 * 4. Allocate minimum budgets per lane
 * 5. Score and sort remaining candidates
 * 6. Select within budget constraints
 * 7. Generate cache key and result
 *
 * @param candidates - All artifact candidates
 * @param config - Budget configuration
 * @param constraints - Policy constraints
 * @param context - Selection context for cache key
 * @param getPath - Optional function to get artifact paths (for pattern matching)
 * @returns Selection result with selected, rejections, and allocation
 */
export function selectArtifacts(
	candidates: ArtifactCandidate[],
	config: BudgetConfig,
	constraints: ComposerConstraints,
	context: SelectionContext,
	getPath?: (artifact: ArtifactCandidate) => string | undefined,
): SelectionResult {
	// Track selected by ID (not object identity) - Set<string> for determinism
	const selectedIds = new Set<string>();
	const selected: ArtifactCandidate[] = [];
	const rejections: RejectionRecord[] = [];

	// =========================================================================
	// STEP 1: Apply exclusions
	// =========================================================================
	const afterExclude = candidates.filter((c) => {
		const exclusion = isExcluded(c, constraints, getPath);
		if (exclusion) {
			rejections.push({
				artifact: toRef(c),
				reason: "excluded_by_policy",
				detail: exclusion.reason,
			});
			return false;
		}
		return true;
	});

	// =========================================================================
	// STEP 2: Extract pinned (selected first, unconditionally)
	// =========================================================================
	for (const candidate of afterExclude) {
		const pinConstraint = isPinned(candidate, constraints, getPath);
		if (pinConstraint && !selectedIds.has(candidate.id)) {
			selectedIds.add(candidate.id);
			selected.push(candidate);
		}
	}

	// =========================================================================
	// STEP 3: Extract must-include (after pinned)
	// =========================================================================
	for (const candidate of afterExclude) {
		if (selectedIds.has(candidate.id)) continue;

		const mustIncludeConstraint = isMustInclude(candidate, constraints, getPath);
		if (mustIncludeConstraint) {
			selectedIds.add(candidate.id);
			selected.push(candidate);
		}
	}

	// =========================================================================
	// STEP 4: Remaining candidates for scoring
	// =========================================================================
	const eligible = afterExclude.filter((c) => !selectedIds.has(c.id));

	// =========================================================================
	// STEP 5: Allocate budgets and score candidates
	// =========================================================================
	const allocationDetails = allocateMinBudgets(eligible, config);

	// Score and sort eligible candidates
	const scored = scoreAndSort(eligible);

	// =========================================================================
	// STEP 6: Select within budget constraints
	// =========================================================================
	const budgetResult = selectWithinBudget(
		scored.map((s) => s.candidate),
		selected,
		config,
	);

	// Add budget-selected artifacts
	for (const s of budgetResult.selected) {
		if (!selectedIds.has(s.id)) {
			selectedIds.add(s.id);
			selected.push(s);
		}
	}

	// Record rejections
	for (const r of budgetResult.rejected) {
		rejections.push({
			artifact: toRef(r.candidate),
			reason: r.reason,
			detail: r.reason === "lane_max_reached" ? `${r.candidate.lane} lane at max` : "Total budget exhausted",
		});
	}

	// =========================================================================
	// STEP 7: Compute cache key
	// =========================================================================
	const cacheKey = computeSelectionCacheKey(candidates, config, constraints, context);

	// =========================================================================
	// STEP 8: Build result
	// =========================================================================
	return {
		selected: selected.map(toRef),
		allocation: budgetResult.usage,
		rejections,
		cacheKey,
		cacheHit: false,
		allocationDetails,
		rendered: [], // Filled in render pass
	};
}

/**
 * Compute a cache key for the selection inputs.
 * Key is computed BEFORE selection work, not from output.
 *
 * @param candidates - All candidates
 * @param config - Budget configuration
 * @param constraints - Policy constraints
 * @param context - Selection context
 * @returns Cache key string
 */
function computeSelectionCacheKey(
	candidates: ArtifactCandidate[],
	config: BudgetConfig,
	constraints: ComposerConstraints,
	context: SelectionContext,
): string {
	// Build cache key components
	const components = [
		context.workspaceFingerprint,
		context.triggerEvent,
		context.commitish,
		context.rulesDigest,
		config.totalTokens.toString(),
		candidates.length.toString(),
		// Include candidate IDs (sorted for determinism)
		...candidates.map((c) => c.id).sort(),
		// Include constraint counts
		constraints.mustInclude.length.toString(),
		constraints.mustExclude.length.toString(),
		constraints.pinned.length.toString(),
	];

	// Simple hash for cache key
	let hash = 0;
	const str = components.join("|");
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}

	return `sel_${Math.abs(hash).toString(36)}`;
}

/**
 * Verify that selection is deterministic by running twice
 *
 * @param candidates - All candidates
 * @param config - Budget configuration
 * @param constraints - Policy constraints
 * @param context - Selection context
 * @returns true if both runs produce identical results
 */
export function verifySelectionDeterminism(
	candidates: ArtifactCandidate[],
	config: BudgetConfig,
	constraints: ComposerConstraints,
	context: SelectionContext,
): boolean {
	const result1 = selectArtifacts(candidates, config, constraints, context);
	const result2 = selectArtifacts(candidates, config, constraints, context);

	// Compare selected IDs
	const ids1 = result1.selected.map((s) => s.id).join(",");
	const ids2 = result2.selected.map((s) => s.id).join(",");

	if (ids1 !== ids2) {
		return false;
	}

	// Compare cache keys
	if (result1.cacheKey !== result2.cacheKey) {
		return false;
	}

	return true;
}

/**
 * Get selection statistics
 *
 * @param result - Selection result
 * @returns Statistics for monitoring
 */
export function getSelectionStats(result: SelectionResult): {
	totalSelected: number;
	totalRejected: number;
	byLane: Record<Lane, number>;
	rejectionsByReason: Record<RejectionReason, number>;
} {
	const byLane = {} as Record<Lane, number>;
	for (const s of result.selected) {
		byLane[s.lane] = (byLane[s.lane] ?? 0) + 1;
	}

	const rejectionsByReason = {} as Record<RejectionReason, number>;
	for (const r of result.rejections) {
		rejectionsByReason[r.reason] = (rejectionsByReason[r.reason] ?? 0) + 1;
	}

	return {
		totalSelected: result.selected.length,
		totalRejected: result.rejections.length,
		byLane,
		rejectionsByReason,
	};
}
