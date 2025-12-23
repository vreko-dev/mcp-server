/**
 * Explainability Module
 *
 * Provides human-readable explanations for selection decisions.
 * Every rejection is logged with a reason for transparency.
 *
 * Output formats:
 * - Structured data for programmatic access
 * - CLI-formatted output for humans
 * - JSON for logging and telemetry
 */

import type { BudgetConfig } from "./budget.js";
import { computeScore } from "./scoring.js";
import type { RejectionReason, RejectionRecord } from "./selection.js";
import type { ArtifactCandidate, ArtifactKind, ArtifactRef, Lane } from "./types.js";

/**
 * Selection explanation for debugging and transparency.
 * Contains all information needed to understand a selection decision.
 */
export interface SelectionExplanation {
	/** Human-readable summary */
	summary: string;

	/** Breakdown by lane */
	laneBreakdown: Array<{
		lane: Lane;
		selectedCount: number;
		budgetUsed: number;
		budgetMax: number;
		topArtifacts: Array<{
			id: string;
			kind: ArtifactKind;
			score: number;
		}>;
	}>;

	/** Top rejections for visibility */
	topRejections: Array<{
		artifact: ArtifactRef;
		reason: RejectionReason;
		detail?: string;
	}>;

	/** Constraint summary */
	constraints: {
		pinnedCount: number;
		mustIncludeCount: number;
		excludedCount: number;
	};

	/** Performance metrics */
	performance: {
		candidateCount: number;
		selectedCount: number;
		compressionRatio: number;
		cacheHit: boolean;
	};
}

/**
 * Build a human-readable explanation from selection data.
 *
 * @param selected - Selected candidates
 * @param rejections - Rejection records
 * @param laneUsage - Tokens used per lane
 * @param config - Budget configuration
 * @param shortfalls - Lanes that couldn't meet minimum
 * @param constraintCounts - Counts from constraint enforcement
 * @returns Complete explanation
 */
export function buildExplanation(
	selected: ArtifactCandidate[],
	rejections: RejectionRecord[],
	laneUsage: Record<Lane, number>,
	config: BudgetConfig,
	shortfalls: Array<{ lane: Lane; requested: number; available: number }>,
	constraintCounts?: {
		pinned: number;
		mustInclude: number;
		excluded: number;
	},
): SelectionExplanation {
	const lanes = Object.keys(config.lanes) as Lane[];

	// Build lane breakdown
	const laneBreakdown = lanes.map((lane) => {
		const laneSelected = selected.filter((s) => s.lane === lane);
		const laneConfig = config.lanes[lane];

		return {
			lane,
			selectedCount: laneSelected.length,
			budgetUsed: laneUsage[lane] ?? 0,
			budgetMax: laneConfig.max,
			topArtifacts: laneSelected.slice(0, 3).map((s) => ({
				id: s.id,
				kind: s.kind,
				score: computeScore(s),
			})),
		};
	});

	// Calculate totals
	const totalUsed = Object.values(laneUsage).reduce((a, b) => a + b, 0);
	const totalCandidates = selected.length + rejections.length;

	// Build summary
	const summaryParts = [`Selected ${selected.length} artifacts`, `using ${totalUsed}/${config.totalTokens} tokens`];

	if (shortfalls.length > 0) {
		summaryParts.push(`(${shortfalls.length} lanes under-filled)`);
	}

	const summary = summaryParts.join(" ");

	// Top rejections (limit to 5)
	const topRejections = rejections.slice(0, 5).map((r) => ({
		artifact: r.artifact,
		reason: r.reason,
		detail: r.detail,
	}));

	return {
		summary,
		laneBreakdown,
		topRejections,
		constraints: {
			pinnedCount: constraintCounts?.pinned ?? 0,
			mustIncludeCount: constraintCounts?.mustInclude ?? 0,
			excludedCount:
				constraintCounts?.excluded ?? rejections.filter((r) => r.reason === "excluded_by_policy").length,
		},
		performance: {
			candidateCount: totalCandidates,
			selectedCount: selected.length,
			compressionRatio: totalCandidates > 0 ? Math.round((selected.length / totalCandidates) * 100) / 100 : 0,
			cacheHit: false, // Filled by caller
		},
	};
}

/**
 * Format explanation for CLI output.
 * Produces human-readable text with visual bars.
 *
 * @param exp - Selection explanation
 * @returns Formatted string for terminal output
 */
export function formatExplanationForCLI(exp: SelectionExplanation): string {
	const lines: string[] = ["", "📊 Composition Summary", `   ${exp.summary}`, "", "📁 Lane Breakdown:"];

	for (const lane of exp.laneBreakdown) {
		const pct = lane.budgetMax > 0 ? Math.round((lane.budgetUsed / lane.budgetMax) * 100) : 0;
		const filledBars = Math.round(pct / 10);
		const emptyBars = 10 - filledBars;
		const bar = "█".repeat(filledBars) + "░".repeat(emptyBars);

		lines.push(
			`   ${lane.lane.padEnd(10)} ${bar} ${lane.selectedCount} artifacts (${lane.budgetUsed}/${lane.budgetMax} tokens)`,
		);
	}

	if (exp.topRejections.length > 0) {
		lines.push("");
		lines.push("⏭️  Top Rejections:");
		for (const rej of exp.topRejections.slice(0, 3)) {
			const detail = rej.detail ? ` (${rej.detail})` : "";
			lines.push(`   • ${rej.artifact.kind}: ${formatRejectionReason(rej.reason)}${detail}`);
		}
	}

	if (exp.constraints.pinnedCount > 0 || exp.constraints.mustIncludeCount > 0) {
		lines.push("");
		lines.push("📌 Constraints:");
		if (exp.constraints.pinnedCount > 0) {
			lines.push(`   • ${exp.constraints.pinnedCount} pinned artifacts`);
		}
		if (exp.constraints.mustIncludeCount > 0) {
			lines.push(`   • ${exp.constraints.mustIncludeCount} must-include artifacts`);
		}
		if (exp.constraints.excludedCount > 0) {
			lines.push(`   • ${exp.constraints.excludedCount} excluded by policy`);
		}
	}

	lines.push("");
	lines.push(
		`📈 Performance: ${exp.performance.selectedCount}/${exp.performance.candidateCount} candidates selected (${Math.round(exp.performance.compressionRatio * 100)}%)`,
	);

	if (exp.performance.cacheHit) {
		lines.push("   (cache hit)");
	}

	return lines.join("\n");
}

/**
 * Format rejection reason for display
 *
 * @param reason - Rejection reason code
 * @returns Human-readable reason
 */
export function formatRejectionReason(reason: RejectionReason): string {
	const reasonMap: Record<RejectionReason, string> = {
		excluded_by_policy: "excluded by policy",
		lane_max_reached: "lane budget exceeded",
		budget_exceeded: "total budget exceeded",
		lower_priority: "lower priority",
	};

	return reasonMap[reason] ?? reason;
}

/**
 * Format explanation as JSON for logging
 *
 * @param exp - Selection explanation
 * @returns JSON string
 */
export function formatExplanationAsJSON(exp: SelectionExplanation): string {
	return JSON.stringify(exp, null, 2);
}

/**
 * Create a minimal explanation for logging (no artifact details)
 *
 * @param exp - Full explanation
 * @returns Minimal explanation
 */
export function toMinimalExplanation(exp: SelectionExplanation): {
	summary: string;
	selectedCount: number;
	rejectedCount: number;
	cacheHit: boolean;
} {
	return {
		summary: exp.summary,
		selectedCount: exp.performance.selectedCount,
		rejectedCount: exp.topRejections.length,
		cacheHit: exp.performance.cacheHit,
	};
}

/**
 * Build explanation for an empty selection (no candidates)
 *
 * @returns Explanation for empty selection
 */
export function buildEmptyExplanation(): SelectionExplanation {
	return {
		summary: "No candidates available for selection",
		laneBreakdown: [],
		topRejections: [],
		constraints: {
			pinnedCount: 0,
			mustIncludeCount: 0,
			excludedCount: 0,
		},
		performance: {
			candidateCount: 0,
			selectedCount: 0,
			compressionRatio: 0,
			cacheHit: false,
		},
	};
}

/**
 * Add cache hit status to explanation
 *
 * @param exp - Explanation
 * @param cacheHit - Whether this was a cache hit
 * @returns Updated explanation
 */
export function withCacheHit(exp: SelectionExplanation, cacheHit: boolean): SelectionExplanation {
	return {
		...exp,
		performance: {
			...exp.performance,
			cacheHit,
		},
	};
}

/**
 * Calculate rejection statistics
 *
 * @param rejections - All rejections
 * @returns Statistics by reason
 */
export function getRejectionStats(rejections: RejectionRecord[]): Record<RejectionReason, number> {
	const stats = {} as Record<RejectionReason, number>;

	for (const r of rejections) {
		stats[r.reason] = (stats[r.reason] ?? 0) + 1;
	}

	return stats;
}
