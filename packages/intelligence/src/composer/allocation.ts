/**
 * Budget Allocation Module
 *
 * Allocates token budgets to lanes based on:
 * - Lane minimum requirements
 * - Available candidates per lane
 * - Priority ordering
 *
 * Key feature: If a lane can't fill its minimum, the unused budget
 * is reallocated to the global pool for other lanes.
 */

import type { BudgetConfig } from "./budget.js";
import { getLanesByPriority } from "./budget.js";
import type { ArtifactCandidate, Lane } from "./types.js";

/**
 * Result of budget allocation
 */
export interface AllocationResult {
	/** Tokens allocated to each lane */
	allocation: Record<Lane, number>;
	/** Remaining tokens available for global selection */
	pool: number;
	/** Lanes that couldn't meet their minimum */
	shortfalls: Array<{
		lane: Lane;
		requested: number;
		available: number;
	}>;
}

/**
 * Group candidates by their lane
 *
 * @param candidates - Array of candidates
 * @returns Map of lane to candidates
 */
export function groupByLane(candidates: ArtifactCandidate[]): Map<Lane, ArtifactCandidate[]> {
	const byLane = new Map<Lane, ArtifactCandidate[]>();

	for (const candidate of candidates) {
		const list = byLane.get(candidate.lane) ?? [];
		list.push(candidate);
		byLane.set(candidate.lane, list);
	}

	return byLane;
}

/**
 * Calculate total token estimate for candidates
 *
 * @param candidates - Array of candidates
 * @returns Total estimated tokens
 */
export function sumTokenEstimates(candidates: ArtifactCandidate[]): number {
	return candidates.reduce((sum, c) => sum + c.tokenEstimate, 0);
}

/**
 * Allocate minimum budgets per lane.
 *
 * Algorithm:
 * 1. Group candidates by lane
 * 2. For each lane (by priority order):
 *    - Calculate available tokens from candidates
 *    - Allocate min(laneMin, available, remainingPool)
 *    - Track shortfalls if can't meet min
 * 3. Return allocation and remaining pool
 *
 * The pool contains tokens that can be used by any lane after
 * minimums are satisfied.
 *
 * @param candidates - All artifact candidates
 * @param config - Budget configuration
 * @returns Allocation result with per-lane budgets and remaining pool
 *
 * @example
 * const { allocation, pool, shortfalls } = allocateMinBudgets(candidates, config);
 * // allocation: { policy: 200, rules: 500, local: 1000, ... }
 * // pool: 6300 (remaining for discretionary use)
 * // shortfalls: [] (all mins met)
 */
export function allocateMinBudgets(candidates: ArtifactCandidate[], config: BudgetConfig): AllocationResult {
	const allocation = {} as Record<Lane, number>;
	const shortfalls: AllocationResult["shortfalls"] = [];
	let pool = config.totalTokens;

	// Group candidates by lane
	const byLane = groupByLane(candidates);

	// Get lanes in priority order
	const lanes = getLanesByPriority(config);

	// Allocate minimums by priority
	for (const lane of lanes) {
		const laneCandidates = byLane.get(lane) ?? [];
		const available = sumTokenEstimates(laneCandidates);
		const laneMin = config.lanes[lane].min;

		// Can only allocate: min of (lane minimum, available content, remaining pool)
		const allocated = Math.min(laneMin, available, pool);
		allocation[lane] = allocated;
		pool -= allocated;

		// Track shortfall for debugging/explainability
		if (allocated < laneMin) {
			shortfalls.push({
				lane,
				requested: laneMin,
				available,
			});
		}
	}

	return { allocation, pool, shortfalls };
}

/**
 * Calculate how much more budget a lane can use
 *
 * @param lane - Lane to check
 * @param currentUsage - Current usage per lane
 * @param config - Budget configuration
 * @param remainingPool - Remaining global pool
 * @returns Maximum additional tokens that can be allocated
 */
export function getLaneHeadroom(
	lane: Lane,
	currentUsage: Record<Lane, number>,
	config: BudgetConfig,
	remainingPool: number,
): number {
	const laneMax = config.lanes[lane].max;
	const laneUsed = currentUsage[lane];
	const laneRemaining = laneMax - laneUsed;

	// Can use up to: min(lane remaining, global pool remaining)
	return Math.min(laneRemaining, remainingPool);
}

/**
 * Check if an artifact can be allocated given current state
 *
 * @param candidate - Candidate to check
 * @param currentUsage - Current usage per lane
 * @param totalUsed - Total tokens used
 * @param config - Budget configuration
 * @returns true if allocation is possible
 */
export function canAllocateArtifact(
	candidate: ArtifactCandidate,
	currentUsage: Record<Lane, number>,
	totalUsed: number,
	config: BudgetConfig,
): boolean {
	const lane = candidate.lane;
	const tokens = candidate.tokenEstimate;
	const laneMax = config.lanes[lane].max;

	// Check lane max
	if (currentUsage[lane] + tokens > laneMax) {
		return false;
	}

	// Check total budget
	if (totalUsed + tokens > config.totalTokens) {
		return false;
	}

	return true;
}

/**
 * Result of trying to select artifacts within budget
 */
export interface SelectionBudgetResult {
	/** Artifacts that fit within budget */
	selected: ArtifactCandidate[];
	/** Artifacts that didn't fit */
	rejected: Array<{
		candidate: ArtifactCandidate;
		reason: "lane_max_reached" | "budget_exceeded";
	}>;
	/** Final usage per lane */
	usage: Record<Lane, number>;
	/** Total tokens used */
	totalUsed: number;
}

/**
 * Select artifacts from a scored list within budget constraints
 *
 * @param scored - Candidates sorted by score (highest first)
 * @param alreadySelected - Candidates already selected (pinned, must-include)
 * @param config - Budget configuration
 * @returns Selection result with selected, rejected, and usage
 */
export function selectWithinBudget(
	scored: ArtifactCandidate[],
	alreadySelected: ArtifactCandidate[],
	config: BudgetConfig,
): SelectionBudgetResult {
	const selected: ArtifactCandidate[] = [];
	const rejected: SelectionBudgetResult["rejected"] = [];

	// Initialize usage from already-selected artifacts
	const usage = {} as Record<Lane, number>;
	for (const lane of Object.keys(config.lanes) as Lane[]) {
		usage[lane] = 0;
	}

	let totalUsed = 0;

	// Account for already-selected artifacts
	for (const s of alreadySelected) {
		usage[s.lane] += s.tokenEstimate;
		totalUsed += s.tokenEstimate;
	}

	// Select from scored list
	for (const candidate of scored) {
		const lane = candidate.lane;
		const tokens = candidate.tokenEstimate;
		const laneMax = config.lanes[lane].max;

		// Check lane max
		if (usage[lane] + tokens > laneMax) {
			rejected.push({
				candidate,
				reason: "lane_max_reached",
			});
			continue;
		}

		// Check total budget
		if (totalUsed + tokens > config.totalTokens) {
			rejected.push({
				candidate,
				reason: "budget_exceeded",
			});
			continue;
		}

		// Select!
		selected.push(candidate);
		usage[lane] += tokens;
		totalUsed += tokens;
	}

	return {
		selected,
		rejected,
		usage,
		totalUsed,
	};
}

/**
 * Calculate budget utilization metrics
 *
 * @param usage - Current usage per lane
 * @param config - Budget configuration
 * @returns Utilization metrics
 */
export function calculateUtilization(
	usage: Record<Lane, number>,
	config: BudgetConfig,
): {
	total: number;
	totalPercent: number;
	byLane: Record<Lane, { used: number; max: number; percent: number }>;
} {
	const totalUsed = Object.values(usage).reduce((a, b) => a + b, 0);
	const totalPercent = Math.round((totalUsed / config.totalTokens) * 100);

	const byLane = {} as Record<Lane, { used: number; max: number; percent: number }>;
	for (const [lane, used] of Object.entries(usage) as [Lane, number][]) {
		const max = config.lanes[lane].max;
		byLane[lane] = {
			used,
			max,
			percent: Math.round((used / max) * 100),
		};
	}

	return {
		total: totalUsed,
		totalPercent,
		byLane,
	};
}
