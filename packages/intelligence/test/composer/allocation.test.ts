/**
 * Lane Budget Allocation Tests
 *
 * Tests edge cases in budget allocation:
 * - Budget exhaustion mid-allocation
 * - Empty lanes
 * - Shortfall tracking
 * - Reallocation of unused budget
 */

import { describe, expect, it } from "vitest";
import {
	allocateMinBudgets,
	calculateUtilization,
	canAllocateArtifact,
	getLaneHeadroom,
	groupByLane,
	selectWithinBudget,
	sumTokenEstimates,
} from "../../src/composer/allocation.js";
import { type BudgetConfig, DEFAULT_BUDGET_CONFIG } from "../../src/composer/budget.js";
import type { ArtifactCandidate, ArtifactKind, Lane } from "../../src/composer/types.js";

/**
 * Helper to create test candidates
 */
function createCandidate(
	id: string,
	lane: Lane,
	tokenEstimate: number,
	overrides: Partial<Omit<ArtifactCandidate, "id" | "lane">> = {},
): ArtifactCandidate {
	return {
		id,
		lane,
		kind: "semantic_match" as ArtifactKind,
		tokenEstimate,
		recencyBucket: 3,
		relevanceScore: 0.5,
		specificityScore: 0.5,
		riskAlignment: 0.5,
		getContent: () => `Content for ${id}`,
		shrink: (targetTokens: number) => ({
			id,
			lane,
			kind: "semantic_match" as ArtifactKind,
			content: `Shrunk content for ${id}`,
			exactTokenCount: targetTokens,
			shrunk: true,
		}),
		...overrides,
	};
}

describe("Lane Budget Allocation", () => {
	describe("allocateMinBudgets", () => {
		it("allocates minimum budgets by priority", () => {
			const candidates = [
				createCandidate("policy-1", "policy", 200),
				createCandidate("rules-1", "rules", 500),
				createCandidate("local-1", "local", 1000),
			];

			const result = allocateMinBudgets(candidates, DEFAULT_BUDGET_CONFIG);

			// Policy has highest priority (0), should get its min first
			expect(result.allocation.policy).toBeGreaterThan(0);
			expect(result.shortfalls).toHaveLength(0);
		});

		it("handles budget exhaustion mid-allocation", () => {
			// Create candidates that together need more than total budget
			const candidates = [
				createCandidate("policy-1", "policy", 5000),
				createCandidate("rules-1", "rules", 5000),
				createCandidate("local-1", "local", 5000),
			];

			// Budget where mins exceed total
			const tightConfig: BudgetConfig = {
				...DEFAULT_BUDGET_CONFIG,
				totalTokens: 8000,
				lanes: {
					policy: { min: 3000, max: 5000, priority: 0 },
					rules: { min: 3000, max: 5000, priority: 1 },
					local: { min: 3000, max: 5000, priority: 2 },
					structure: { min: 0, max: 1000, priority: 3 },
					retrieved: { min: 0, max: 1000, priority: 4 },
					history: { min: 0, max: 1000, priority: 5 },
				},
			};

			const result = allocateMinBudgets(candidates, tightConfig);

			// Should track shortfalls for lanes that couldn't get their min
			expect(result.shortfalls.length).toBeGreaterThan(0);

			// Total allocation should not exceed budget
			const totalAllocated = Object.values(result.allocation).reduce((a, b) => a + b, 0);
			expect(totalAllocated).toBeLessThanOrEqual(8000);
		});

		it("handles empty lanes gracefully", () => {
			// Only policy lane has candidates
			const candidates = [createCandidate("policy-1", "policy", 1000)];

			const result = allocateMinBudgets(candidates, DEFAULT_BUDGET_CONFIG);

			// Empty lanes should have 0 allocation
			expect(result.allocation.rules).toBe(0);
			expect(result.allocation.local).toBe(0);
			expect(result.allocation.structure).toBe(0);
			expect(result.allocation.retrieved).toBe(0);
			expect(result.allocation.history).toBe(0);

			// Should have shortfalls for lanes with min > 0 but no candidates
			const rulesShortfall = result.shortfalls.find((s) => s.lane === "rules");
			expect(rulesShortfall).toBeDefined();
			expect(rulesShortfall?.available).toBe(0);
		});

		it("reallocates unused budget to remaining pool", () => {
			// Lane with candidates less than its minimum
			const candidates = [
				createCandidate("policy-1", "policy", 50), // Less than typical min
			];

			const result = allocateMinBudgets(candidates, DEFAULT_BUDGET_CONFIG);

			// Remaining pool should have budget that couldn't be used
			expect(result.pool).toBeGreaterThan(0);
		});

		it("respects priority order when budget is limited", () => {
			const candidates = [
				createCandidate("policy-1", "policy", 3000),
				createCandidate("rules-1", "rules", 3000),
				createCandidate("local-1", "local", 3000),
				createCandidate("history-1", "history", 3000),
			];

			const limitedConfig: BudgetConfig = {
				...DEFAULT_BUDGET_CONFIG,
				totalTokens: 5000,
				lanes: {
					policy: { min: 2000, max: 3000, priority: 0 },
					rules: { min: 2000, max: 3000, priority: 1 },
					local: { min: 2000, max: 3000, priority: 2 },
					structure: { min: 0, max: 1000, priority: 3 },
					retrieved: { min: 0, max: 1000, priority: 4 },
					history: { min: 2000, max: 3000, priority: 5 }, // Lowest priority
				},
			};

			const result = allocateMinBudgets(candidates, limitedConfig);

			// Policy (priority 0) should get its allocation first
			expect(result.allocation.policy).toBe(2000);

			// History (priority 5) should be the one with shortfall
			const historyShortfall = result.shortfalls.find((s) => s.lane === "history");
			expect(historyShortfall).toBeDefined();
		});

		it("handles all empty lanes", () => {
			const result = allocateMinBudgets([], DEFAULT_BUDGET_CONFIG);

			// All allocations should be 0
			for (const lane of Object.keys(result.allocation) as Lane[]) {
				expect(result.allocation[lane]).toBe(0);
			}

			// Pool should have all budget remaining
			expect(result.pool).toBe(DEFAULT_BUDGET_CONFIG.totalTokens);
		});
	});

	describe("groupByLane", () => {
		it("groups candidates correctly", () => {
			const candidates = [
				createCandidate("a", "policy", 100),
				createCandidate("b", "policy", 100),
				createCandidate("c", "local", 100),
			];

			const grouped = groupByLane(candidates);

			expect(grouped.get("policy")).toHaveLength(2);
			expect(grouped.get("local")).toHaveLength(1);
			expect(grouped.get("rules")).toBeUndefined();
		});

		it("handles empty array", () => {
			const grouped = groupByLane([]);
			expect(grouped.size).toBe(0);
		});
	});

	describe("sumTokenEstimates", () => {
		it("sums token estimates correctly", () => {
			const candidates = [
				createCandidate("a", "local", 100),
				createCandidate("b", "local", 200),
				createCandidate("c", "local", 300),
			];

			expect(sumTokenEstimates(candidates)).toBe(600);
		});

		it("returns 0 for empty array", () => {
			expect(sumTokenEstimates([])).toBe(0);
		});
	});

	describe("getLaneHeadroom", () => {
		it("calculates remaining lane capacity", () => {
			const usage = {
				policy: 100,
				rules: 200,
				local: 500,
				structure: 0,
				retrieved: 0,
				history: 0,
			} as Record<Lane, number>;

			const remainingPool = 5000;

			// Local lane max is typically large, should have headroom
			const headroom = getLaneHeadroom("local", usage, DEFAULT_BUDGET_CONFIG, remainingPool);

			expect(headroom).toBeGreaterThan(0);
			expect(headroom).toBeLessThanOrEqual(remainingPool);
			expect(headroom).toBeLessThanOrEqual(DEFAULT_BUDGET_CONFIG.lanes.local.max - 500);
		});

		it("respects global pool limit", () => {
			const usage = {
				policy: 0,
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			} as Record<Lane, number>;

			const smallPool = 100;

			const headroom = getLaneHeadroom("local", usage, DEFAULT_BUDGET_CONFIG, smallPool);

			// Should be limited by pool, not lane max
			expect(headroom).toBe(100);
		});

		it("returns 0 when lane is at max", () => {
			const usage = {
				policy: DEFAULT_BUDGET_CONFIG.lanes.policy.max,
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			} as Record<Lane, number>;

			const headroom = getLaneHeadroom("policy", usage, DEFAULT_BUDGET_CONFIG, 5000);

			expect(headroom).toBe(0);
		});
	});

	describe("canAllocateArtifact", () => {
		it("allows allocation within limits", () => {
			const candidate = createCandidate("test", "local", 100);
			const usage = {
				policy: 0,
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			} as Record<Lane, number>;

			expect(canAllocateArtifact(candidate, usage, 0, DEFAULT_BUDGET_CONFIG)).toBe(true);
		});

		it("rejects when lane max exceeded", () => {
			const candidate = createCandidate("test", "policy", 1000);
			const usage = {
				policy: DEFAULT_BUDGET_CONFIG.lanes.policy.max - 100, // Almost at max
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			} as Record<Lane, number>;

			expect(canAllocateArtifact(candidate, usage, 0, DEFAULT_BUDGET_CONFIG)).toBe(false);
		});

		it("rejects when total budget exceeded", () => {
			const candidate = createCandidate("test", "local", 1000);
			const usage = {
				policy: 0,
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			} as Record<Lane, number>;

			const almostFullBudget = DEFAULT_BUDGET_CONFIG.totalTokens - 100;

			expect(canAllocateArtifact(candidate, usage, almostFullBudget, DEFAULT_BUDGET_CONFIG)).toBe(false);
		});
	});

	describe("selectWithinBudget", () => {
		it("selects artifacts within budget constraints", () => {
			const candidates = [
				createCandidate("a", "local", 100, { relevanceScore: 0.9 }),
				createCandidate("b", "local", 100, { relevanceScore: 0.8 }),
				createCandidate("c", "local", 100, { relevanceScore: 0.7 }),
			];

			const result = selectWithinBudget(candidates, [], DEFAULT_BUDGET_CONFIG);

			expect(result.selected.length).toBeGreaterThan(0);
			expect(result.totalUsed).toBeLessThanOrEqual(DEFAULT_BUDGET_CONFIG.totalTokens);
		});

		it("tracks rejected artifacts with reasons", () => {
			// Create candidate that exceeds lane max
			const hugeCandidate = createCandidate("huge", "policy", DEFAULT_BUDGET_CONFIG.lanes.policy.max + 1000);
			const normalCandidate = createCandidate("normal", "policy", 100);

			const result = selectWithinBudget([normalCandidate, hugeCandidate], [], DEFAULT_BUDGET_CONFIG);

			// Huge should be rejected
			const rejection = result.rejected.find((r) => r.candidate.id === "huge");
			expect(rejection).toBeDefined();
			expect(rejection?.reason).toBe("lane_max_reached");
		});

		it("accounts for already-selected artifacts", () => {
			const alreadySelected = [createCandidate("pinned", "local", 1000)];

			const candidates = [createCandidate("a", "local", 100), createCandidate("b", "local", 100)];

			const result = selectWithinBudget(candidates, alreadySelected, DEFAULT_BUDGET_CONFIG);

			// Usage should include the pinned artifact
			expect(result.usage.local).toBeGreaterThanOrEqual(1000);
		});

		it("handles candidates exceeding total budget", () => {
			// First candidate uses most of the local lane max
			// Second candidate will exceed the remaining total budget
			const candidates = [
				createCandidate("first", "local", 2500), // Within local max (3000)
				createCandidate("second", "local", 1000), // This would exceed local max when combined
			];

			const result = selectWithinBudget(candidates, [], DEFAULT_BUDGET_CONFIG);

			// First should be selected (within budget)
			expect(result.selected.find((s) => s.id === "first")).toBeDefined();

			// Second should be rejected due to lane max (2500 + 1000 > 3000)
			const rejection = result.rejected.find((r) => r.candidate.id === "second");
			expect(rejection).toBeDefined();
			expect(rejection?.reason).toBe("lane_max_reached");
		});
	});

	describe("calculateUtilization", () => {
		it("calculates utilization metrics correctly", () => {
			const usage = {
				policy: 100,
				rules: 200,
				local: 500,
				structure: 100,
				retrieved: 100,
				history: 0,
			} as Record<Lane, number>;

			const result = calculateUtilization(usage, DEFAULT_BUDGET_CONFIG);

			expect(result.total).toBe(1000);
			expect(result.totalPercent).toBeGreaterThan(0);
			expect(result.byLane.policy.used).toBe(100);
			expect(result.byLane.history.used).toBe(0);
		});

		it("handles zero usage", () => {
			const usage = {
				policy: 0,
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			} as Record<Lane, number>;

			const result = calculateUtilization(usage, DEFAULT_BUDGET_CONFIG);

			expect(result.total).toBe(0);
			expect(result.totalPercent).toBe(0);
		});

		it("calculates per-lane percentages", () => {
			const usage = {
				policy: DEFAULT_BUDGET_CONFIG.lanes.policy.max / 2, // 50%
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			} as Record<Lane, number>;

			const result = calculateUtilization(usage, DEFAULT_BUDGET_CONFIG);

			expect(result.byLane.policy.percent).toBe(50);
		});
	});
});
