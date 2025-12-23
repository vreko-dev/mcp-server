/**
 * Budget Module Tests
 *
 * Tests budget validation, allocation, and the min-budget escape hatch.
 * Covers 4 paths: happy, error, edge, null/empty.
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
import {
	allocate,
	type BudgetConfig,
	canAllocate,
	createBudgetUsage,
	DEFAULT_BUDGET_CONFIG,
	getDiscretionaryBudget,
	getLanesByPriority,
	validateBudgetConfig,
	withLaneOverrides,
	withTotalBudget,
} from "../../src/composer/budget.js";
import type { ArtifactCandidate, ArtifactKind, Lane } from "../../src/composer/types.js";

/**
 * Helper to create test candidates
 */
function createCandidate(id: string, lane: Lane, tokenEstimate: number, relevanceScore = 0.5): ArtifactCandidate {
	return {
		id,
		lane,
		kind: "semantic_match" as ArtifactKind,
		tokenEstimate,
		recencyBucket: 3,
		relevanceScore,
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
	};
}

describe("Budget Module", () => {
	describe("DEFAULT_BUDGET_CONFIG", () => {
		it("has valid lane priorities", () => {
			// Happy path: verify defaults are valid
			expect(DEFAULT_BUDGET_CONFIG.totalTokens).toBe(8000);
			expect(DEFAULT_BUDGET_CONFIG.lanes.policy.priority).toBe(0);
			expect(DEFAULT_BUDGET_CONFIG.lanes.rules.priority).toBe(1);
			expect(DEFAULT_BUDGET_CONFIG.lanes.local.priority).toBe(2);
			expect(DEFAULT_BUDGET_CONFIG.lanes.structure.priority).toBe(3);
			expect(DEFAULT_BUDGET_CONFIG.lanes.retrieved.priority).toBe(4);
			expect(DEFAULT_BUDGET_CONFIG.lanes.history.priority).toBe(5);
		});

		it("has all lanes with min <= max", () => {
			for (const [lane, budget] of Object.entries(DEFAULT_BUDGET_CONFIG.lanes)) {
				expect(budget.min).toBeLessThanOrEqual(budget.max);
			}
		});

		it("sum of mins is less than total", () => {
			const sumOfMins = Object.values(DEFAULT_BUDGET_CONFIG.lanes).reduce((sum, lane) => sum + lane.min, 0);
			expect(sumOfMins).toBeLessThan(DEFAULT_BUDGET_CONFIG.totalTokens);
		});
	});

	describe("validateBudgetConfig", () => {
		it("accepts valid configuration", () => {
			// Happy path: valid config passes (throws nothing)
			expect(() => validateBudgetConfig(DEFAULT_BUDGET_CONFIG)).not.toThrow();
		});

		it("rejects negative totalTokens", () => {
			// Error path: negative total
			const config: BudgetConfig = {
				...DEFAULT_BUDGET_CONFIG,
				totalTokens: -1000,
			};
			expect(() => validateBudgetConfig(config)).toThrow("Invalid totalTokens");
		});

		it("rejects zero totalTokens", () => {
			// Edge path: zero total
			const config: BudgetConfig = {
				...DEFAULT_BUDGET_CONFIG,
				totalTokens: 0,
			};
			expect(() => validateBudgetConfig(config)).toThrow("Invalid totalTokens");
		});

		it("rejects lane min > max", () => {
			// Error path: invalid lane bounds
			const config: BudgetConfig = {
				...DEFAULT_BUDGET_CONFIG,
				lanes: {
					...DEFAULT_BUDGET_CONFIG.lanes,
					policy: {
						...DEFAULT_BUDGET_CONFIG.lanes.policy,
						min: 1000,
						max: 500,
					},
				},
			};
			expect(() => validateBudgetConfig(config)).toThrow("min");
		});

		it("rejects sum of mins exceeding total", () => {
			// Error path: over-allocation
			const config: BudgetConfig = {
				totalTokens: 1000,
				lanes: {
					policy: { min: 500, max: 1000, priority: 0 },
					rules: { min: 500, max: 1000, priority: 1 },
					local: { min: 500, max: 1000, priority: 2 },
					structure: { min: 500, max: 1000, priority: 3 },
					retrieved: { min: 500, max: 1000, priority: 4 },
					history: { min: 500, max: 1000, priority: 5 },
				},
			};
			expect(() => validateBudgetConfig(config)).toThrow("exceeds total");
		});

		it("rejects negative lane values", () => {
			// Error path: negative values
			const config: BudgetConfig = {
				...DEFAULT_BUDGET_CONFIG,
				lanes: {
					...DEFAULT_BUDGET_CONFIG.lanes,
					local: {
						min: -100,
						max: 5000,
						priority: 2,
					},
				},
			};
			expect(() => validateBudgetConfig(config)).toThrow("negative");
		});
	});

	describe("getLanesByPriority", () => {
		it("returns lanes in priority order", () => {
			const lanes = getLanesByPriority(DEFAULT_BUDGET_CONFIG);
			expect(lanes).toEqual(["policy", "rules", "local", "structure", "retrieved", "history"]);
		});

		it("handles custom priority ordering", () => {
			const config: BudgetConfig = {
				...DEFAULT_BUDGET_CONFIG,
				lanes: {
					...DEFAULT_BUDGET_CONFIG.lanes,
					history: { ...DEFAULT_BUDGET_CONFIG.lanes.history, priority: 0 },
					policy: { ...DEFAULT_BUDGET_CONFIG.lanes.policy, priority: 5 },
				},
			};
			const lanes = getLanesByPriority(config);
			expect(lanes[0]).toBe("history");
			expect(lanes[lanes.length - 1]).toBe("policy");
		});
	});

	describe("getDiscretionaryBudget", () => {
		it("calculates remaining budget after minimums", () => {
			const discretionary = getDiscretionaryBudget(DEFAULT_BUDGET_CONFIG);
			const sumMins = Object.values(DEFAULT_BUDGET_CONFIG.lanes).reduce((sum, lane) => sum + lane.min, 0);
			expect(discretionary).toBe(DEFAULT_BUDGET_CONFIG.totalTokens - sumMins);
		});
	});

	describe("withTotalBudget", () => {
		it("scales budget proportionally", () => {
			const newConfig = withTotalBudget(DEFAULT_BUDGET_CONFIG, 16000);
			expect(newConfig.totalTokens).toBe(16000);
			// Lanes should scale proportionally
			expect(newConfig.lanes.policy.min).toBe(400); // 200 * 2
			expect(newConfig.lanes.policy.max).toBe(1000); // 500 * 2
		});

		it("rejects invalid total", () => {
			expect(() => withTotalBudget(DEFAULT_BUDGET_CONFIG, -1000)).toThrow();
		});
	});

	describe("withLaneOverrides", () => {
		it("applies lane overrides", () => {
			const newConfig = withLaneOverrides(DEFAULT_BUDGET_CONFIG, {
				policy: { min: 300, max: 600 },
			});
			expect(newConfig.lanes.policy.min).toBe(300);
			expect(newConfig.lanes.policy.max).toBe(600);
			// Other lanes unchanged
			expect(newConfig.lanes.rules.min).toBe(DEFAULT_BUDGET_CONFIG.lanes.rules.min);
		});
	});

	describe("createBudgetUsage", () => {
		it("creates initial usage state", () => {
			const usage = createBudgetUsage(DEFAULT_BUDGET_CONFIG);
			expect(usage.total).toBe(0);
			expect(usage.remaining).toBe(DEFAULT_BUDGET_CONFIG.totalTokens);
			expect(usage.byLane.policy).toBe(0);
		});
	});

	describe("canAllocate and allocate", () => {
		it("allows allocation within limits", () => {
			const usage = createBudgetUsage(DEFAULT_BUDGET_CONFIG);
			expect(canAllocate(usage, DEFAULT_BUDGET_CONFIG, "policy", 100)).toBe(true);
		});

		it("rejects allocation over lane max", () => {
			const usage = createBudgetUsage(DEFAULT_BUDGET_CONFIG);
			// Policy max is 500
			expect(canAllocate(usage, DEFAULT_BUDGET_CONFIG, "policy", 600)).toBe(false);
		});

		it("allocates tokens correctly", () => {
			let usage = createBudgetUsage(DEFAULT_BUDGET_CONFIG);
			usage = allocate(usage, DEFAULT_BUDGET_CONFIG, "policy", 100);
			expect(usage.byLane.policy).toBe(100);
			expect(usage.total).toBe(100);
			expect(usage.remaining).toBe(DEFAULT_BUDGET_CONFIG.totalTokens - 100);
		});
	});

	describe("groupByLane", () => {
		it("groups candidates correctly", () => {
			// Happy path: multiple lanes
			const candidates = [
				createCandidate("a", "policy", 100),
				createCandidate("b", "policy", 200),
				createCandidate("c", "local", 300),
				createCandidate("d", "retrieved", 400),
			];

			const grouped = groupByLane(candidates);
			expect(grouped.get("policy")).toHaveLength(2);
			expect(grouped.get("local")).toHaveLength(1);
			expect(grouped.get("retrieved")).toHaveLength(1);
			expect(grouped.get("rules")).toBeUndefined();
		});

		it("handles empty candidates array", () => {
			// Empty path
			const grouped = groupByLane([]);
			expect(grouped.size).toBe(0);
		});

		it("handles single lane", () => {
			// Edge path: all in one lane
			const candidates = [createCandidate("a", "local", 100), createCandidate("b", "local", 200)];

			const grouped = groupByLane(candidates);
			expect(grouped.size).toBe(1);
			expect(grouped.get("local")).toHaveLength(2);
		});
	});

	describe("sumTokenEstimates", () => {
		it("sums token estimates correctly", () => {
			const candidates = [createCandidate("a", "local", 100), createCandidate("b", "local", 200)];
			expect(sumTokenEstimates(candidates)).toBe(300);
		});

		it("returns 0 for empty array", () => {
			expect(sumTokenEstimates([])).toBe(0);
		});
	});

	describe("allocateMinBudgets", () => {
		it("allocates minimum budgets when content available", () => {
			// Happy path: enough content for all mins
			const candidates = [
				createCandidate("p1", "policy", 200),
				createCandidate("r1", "rules", 500),
				createCandidate("l1", "local", 1000),
				createCandidate("s1", "structure", 400),
				createCandidate("ret1", "retrieved", 600),
				createCandidate("h1", "history", 200),
			];

			const result = allocateMinBudgets(candidates, DEFAULT_BUDGET_CONFIG);

			// Each lane should get at least min or available
			expect(result.allocation.policy).toBe(200);
			expect(result.pool).toBeGreaterThan(0);
			expect(result.shortfalls).toHaveLength(0);
		});

		it("reports shortfalls when lane lacks content", () => {
			// Shortfall path: lane can't fill minimum
			const candidates = [
				createCandidate("p1", "policy", 50), // policy min is 200
			];

			const result = allocateMinBudgets(candidates, DEFAULT_BUDGET_CONFIG);

			// Should report shortfall for policy
			const policyShortfall = result.shortfalls.find((s) => s.lane === "policy");
			expect(policyShortfall).toBeDefined();
			expect(policyShortfall?.available).toBe(50);
			expect(policyShortfall?.requested).toBe(DEFAULT_BUDGET_CONFIG.lanes.policy.min);
		});

		it("handles empty candidates", () => {
			// Empty path
			const result = allocateMinBudgets([], DEFAULT_BUDGET_CONFIG);

			// All lanes should have 0 allocation
			for (const lane of Object.keys(result.allocation) as Lane[]) {
				expect(result.allocation[lane]).toBe(0);
			}

			// Pool should have full budget
			expect(result.pool).toBe(DEFAULT_BUDGET_CONFIG.totalTokens);

			// All lanes with min > 0 should report shortfall
			expect(result.shortfalls.length).toBeGreaterThan(0);
		});
	});

	describe("getLaneHeadroom", () => {
		it("calculates available headroom", () => {
			const usage: Record<Lane, number> = {
				policy: 100,
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			};
			const headroom = getLaneHeadroom("policy", usage, DEFAULT_BUDGET_CONFIG, 1000);
			// policy max is 500, used 100, so remaining is 400
			// pool is 1000, so min(400, 1000) = 400
			expect(headroom).toBe(400);
		});
	});

	describe("canAllocateArtifact", () => {
		it("returns true when allocation possible", () => {
			const candidate = createCandidate("a", "policy", 100);
			const usage: Record<Lane, number> = {
				policy: 0,
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			};
			expect(canAllocateArtifact(candidate, usage, 0, DEFAULT_BUDGET_CONFIG)).toBe(true);
		});

		it("returns false when lane max exceeded", () => {
			const candidate = createCandidate("a", "policy", 100);
			const usage: Record<Lane, number> = {
				policy: 450, // policy max is 500
				rules: 0,
				local: 0,
				structure: 0,
				retrieved: 0,
				history: 0,
			};
			expect(canAllocateArtifact(candidate, usage, 450, DEFAULT_BUDGET_CONFIG)).toBe(false);
		});
	});

	describe("selectWithinBudget", () => {
		it("selects candidates within budget", () => {
			// Happy path: select within limits
			const candidates = [
				createCandidate("a", "local", 100, 0.9),
				createCandidate("b", "local", 100, 0.8),
				createCandidate("c", "local", 100, 0.7),
			];

			const result = selectWithinBudget(candidates, [], DEFAULT_BUDGET_CONFIG);

			// Should select all (within local max of 3000)
			expect(result.selected.length).toBe(3);
			expect(result.totalUsed).toBe(300);
		});

		it("respects lane max limits", () => {
			// Edge path: hit max before budget
			const candidates: ArtifactCandidate[] = [];
			// Policy max is 500, create 6 candidates of 100 tokens each
			for (let i = 0; i < 6; i++) {
				candidates.push(createCandidate(`p${i}`, "policy", 100, 0.9 - i * 0.1));
			}

			const result = selectWithinBudget(candidates, [], DEFAULT_BUDGET_CONFIG);

			// Should stop at max (500 tokens = 5 candidates)
			expect(result.selected.length).toBe(5);
			expect(result.rejected.length).toBe(1);
			expect(result.rejected[0].reason).toBe("lane_max_reached");
		});

		it("handles empty candidates", () => {
			// Empty path
			const result = selectWithinBudget([], [], DEFAULT_BUDGET_CONFIG);
			expect(result.selected).toHaveLength(0);
			expect(result.rejected).toHaveLength(0);
		});

		it("accounts for already selected artifacts", () => {
			const alreadySelected = [createCandidate("pinned", "policy", 400)];
			const candidates = [createCandidate("new", "policy", 200)];

			const result = selectWithinBudget(candidates, alreadySelected, DEFAULT_BUDGET_CONFIG);

			// Can't add 200 more to policy (already at 400, max is 500)
			expect(result.rejected.length).toBe(1);
			expect(result.rejected[0].reason).toBe("lane_max_reached");
		});
	});

	describe("calculateUtilization", () => {
		it("calculates utilization metrics", () => {
			const usage: Record<Lane, number> = {
				policy: 250,
				rules: 1000,
				local: 2000,
				structure: 0,
				retrieved: 0,
				history: 0,
			};

			const util = calculateUtilization(usage, DEFAULT_BUDGET_CONFIG);

			expect(util.total).toBe(3250);
			expect(util.totalPercent).toBe(41); // 3250/8000 * 100
			expect(util.byLane.policy.used).toBe(250);
			expect(util.byLane.policy.max).toBe(500);
			expect(util.byLane.policy.percent).toBe(50);
		});
	});
});
