/**
 * Budget Configuration and Management
 *
 * Defines token budgets for each lane and enforces constraints:
 * - Minimum allocations per lane (guaranteed if content available)
 * - Maximum caps per lane (never exceeded)
 * - Total budget constraint (absolute limit)
 *
 * Invariant: sum(lane.min) <= totalTokens
 */

import type { Lane } from "./types.js";
import { LANES_BY_PRIORITY } from "./types.js";

/**
 * Lane-specific budget configuration
 */
export interface LaneBudget {
	/** Minimum tokens to allocate (if available) */
	min: number;
	/** Maximum tokens allowed */
	max: number;
	/** Lower = higher priority (0 = highest) */
	priority: number;
}

/**
 * Complete budget configuration
 */
export interface BudgetConfig {
	/** Total token budget (absolute limit) */
	totalTokens: number;
	/** Per-lane budget configuration */
	lanes: Record<Lane, LaneBudget>;
}

/**
 * Default budget configuration.
 * Optimized for 8000 token context window.
 *
 * Invariant: sum(lane.min) = 1700 <= 8000 = totalTokens ✓
 *
 * Lane breakdown:
 * - policy:    200-500   (Priority 0) - Constraints, invariants
 * - rules:     500-2000  (Priority 1) - Protection rules
 * - local:     1000-3000 (Priority 2) - Current diff, recent edits
 * - structure: 0-1500    (Priority 3) - Dependency graphs
 * - retrieved: 0-2000    (Priority 4) - Semantic retrieval
 * - history:   0-1000    (Priority 5) - Session context
 */
export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
	totalTokens: 8000,
	lanes: {
		policy: { min: 200, max: 500, priority: 0 },
		rules: { min: 500, max: 2000, priority: 1 },
		local: { min: 1000, max: 3000, priority: 2 },
		structure: { min: 0, max: 1500, priority: 3 },
		retrieved: { min: 0, max: 2000, priority: 4 },
		history: { min: 0, max: 1000, priority: 5 },
	},
} as const;

/**
 * Validate budget configuration.
 * Throws Error if invalid.
 *
 * Checks:
 * 1. Sum of lane mins doesn't exceed total
 * 2. Each lane's min <= max
 * 3. No negative values
 * 4. All lanes are defined
 *
 * @param config - Budget configuration to validate
 * @throws Error if configuration is invalid
 *
 * @example
 * // Valid config
 * validateBudgetConfig(DEFAULT_BUDGET_CONFIG); // OK
 *
 * // Invalid: mins exceed total
 * validateBudgetConfig({
 *   totalTokens: 1000,
 *   lanes: { policy: { min: 500, max: 600, priority: 0 }, ... }
 * }); // Throws
 */
export function validateBudgetConfig(config: BudgetConfig): void {
	if (!config) {
		throw new Error("Budget config is required");
	}

	if (!Number.isFinite(config.totalTokens) || config.totalTokens <= 0) {
		throw new Error(`Invalid totalTokens: ${config.totalTokens}. Must be positive.`);
	}

	// Check all required lanes are defined
	for (const lane of LANES_BY_PRIORITY) {
		if (!config.lanes[lane]) {
			throw new Error(`Missing lane configuration: ${lane}`);
		}
	}

	// Calculate sum of minimums
	const sumMins = Object.values(config.lanes).reduce((sum, lane) => sum + lane.min, 0);

	if (sumMins > config.totalTokens) {
		throw new Error(
			`Invalid budget: sum of lane mins (${sumMins}) exceeds total (${config.totalTokens}). ` +
				"Reduce mins or increase totalTokens.",
		);
	}

	// Validate each lane
	for (const [name, lane] of Object.entries(config.lanes)) {
		if (lane.min > lane.max) {
			throw new Error(`Lane ${name}: min (${lane.min}) > max (${lane.max})`);
		}
		if (lane.min < 0) {
			throw new Error(`Lane ${name}: negative min (${lane.min})`);
		}
		if (lane.max < 0) {
			throw new Error(`Lane ${name}: negative max (${lane.max})`);
		}
		if (!Number.isFinite(lane.priority)) {
			throw new Error(`Lane ${name}: invalid priority (${lane.priority})`);
		}
	}
}

/**
 * Get lanes sorted by priority (lowest first = highest priority)
 *
 * @param config - Budget configuration
 * @returns Lanes sorted by priority
 */
export function getLanesByPriority(config: BudgetConfig): Lane[] {
	return (Object.entries(config.lanes) as [Lane, LaneBudget][])
		.sort((a, b) => a[1].priority - b[1].priority)
		.map(([lane]) => lane);
}

/**
 * Calculate available budget after minimums are satisfied
 *
 * @param config - Budget configuration
 * @returns Remaining budget for discretionary allocation
 */
export function getDiscretionaryBudget(config: BudgetConfig): number {
	const sumMins = Object.values(config.lanes).reduce((sum, lane) => sum + lane.min, 0);
	return config.totalTokens - sumMins;
}

/**
 * Create a modified budget config with adjusted total
 *
 * @param config - Base budget configuration
 * @param newTotal - New total token budget
 * @returns Modified configuration with scaled lanes
 */
export function withTotalBudget(config: BudgetConfig, newTotal: number): BudgetConfig {
	if (newTotal <= 0) {
		throw new Error(`Invalid total budget: ${newTotal}`);
	}

	const ratio = newTotal / config.totalTokens;

	const newLanes = {} as Record<Lane, LaneBudget>;
	for (const [lane, budget] of Object.entries(config.lanes) as [Lane, LaneBudget][]) {
		newLanes[lane] = {
			min: Math.floor(budget.min * ratio),
			max: Math.floor(budget.max * ratio),
			priority: budget.priority,
		};
	}

	const result = {
		totalTokens: newTotal,
		lanes: newLanes,
	};

	// Validate the result
	validateBudgetConfig(result);

	return result;
}

/**
 * Create a budget config with lane overrides
 *
 * @param config - Base budget configuration
 * @param overrides - Lane-specific overrides
 * @returns Modified configuration
 */
export function withLaneOverrides(
	config: BudgetConfig,
	overrides: Partial<Record<Lane, Partial<LaneBudget>>>,
): BudgetConfig {
	const newLanes = {} as Record<Lane, LaneBudget>;

	for (const [lane, budget] of Object.entries(config.lanes) as [Lane, LaneBudget][]) {
		const override = overrides[lane];
		newLanes[lane] = {
			min: override?.min ?? budget.min,
			max: override?.max ?? budget.max,
			priority: override?.priority ?? budget.priority,
		};
	}

	const result = {
		totalTokens: config.totalTokens,
		lanes: newLanes,
	};

	// Validate the result
	validateBudgetConfig(result);

	return result;
}

/**
 * Budget usage tracking
 */
export interface BudgetUsage {
	/** Tokens used per lane */
	byLane: Record<Lane, number>;
	/** Total tokens used */
	total: number;
	/** Remaining budget */
	remaining: number;
	/** Per-lane remaining */
	remainingByLane: Record<Lane, number>;
}

/**
 * Create a new budget usage tracker
 *
 * @param config - Budget configuration
 * @returns Initial usage state
 */
export function createBudgetUsage(config: BudgetConfig): BudgetUsage {
	const byLane = {} as Record<Lane, number>;
	const remainingByLane = {} as Record<Lane, number>;

	for (const [lane, budget] of Object.entries(config.lanes) as [Lane, LaneBudget][]) {
		byLane[lane] = 0;
		remainingByLane[lane] = budget.max;
	}

	return {
		byLane,
		total: 0,
		remaining: config.totalTokens,
		remainingByLane,
	};
}

/**
 * Check if tokens can be allocated to a lane
 *
 * @param usage - Current usage state
 * @param config - Budget configuration
 * @param lane - Target lane
 * @param tokens - Tokens to allocate
 * @returns true if allocation is possible
 */
export function canAllocate(usage: BudgetUsage, config: BudgetConfig, lane: Lane, tokens: number): boolean {
	const laneConfig = config.lanes[lane];

	// Check lane max
	if (usage.byLane[lane] + tokens > laneConfig.max) {
		return false;
	}

	// Check total budget
	if (usage.total + tokens > config.totalTokens) {
		return false;
	}

	return true;
}

/**
 * Allocate tokens to a lane
 *
 * @param usage - Current usage state (mutated)
 * @param config - Budget configuration
 * @param lane - Target lane
 * @param tokens - Tokens to allocate
 * @returns Updated usage state
 */
export function allocate(usage: BudgetUsage, config: BudgetConfig, lane: Lane, tokens: number): BudgetUsage {
	if (!canAllocate(usage, config, lane, tokens)) {
		throw new Error(
			`Cannot allocate ${tokens} tokens to ${lane}: ` +
				`lane=${usage.byLane[lane]}/${config.lanes[lane].max}, ` +
				`total=${usage.total}/${config.totalTokens}`,
		);
	}

	usage.byLane[lane] += tokens;
	usage.total += tokens;
	usage.remaining -= tokens;
	usage.remainingByLane[lane] -= tokens;

	return usage;
}
