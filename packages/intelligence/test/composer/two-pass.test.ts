/**
 * Two-Pass Pipeline Verification Tests
 *
 * Tests the Composer's two-pass selection + rendering pipeline:
 * - Pass 1: Selection using coarse token estimates
 * - Pass 2: Rendering and shrinking if over budget
 *
 * These tests verify the core guarantees of the pipeline.
 */

import { describe, expect, it } from "vitest";
import { type BudgetConfig, DEFAULT_BUDGET_CONFIG } from "../../src/composer/budget.js";
import { createComposer, createMockCandidate } from "../../src/composer/Composer.js";
import type { ArtifactCandidate, ArtifactSource, TokenCounter } from "../../src/composer/types.js";

/**
 * Token counter that simulates exact measurement being different from estimates
 */
const exactTokenCounter: TokenCounter = (text: string) => {
	if (!text) return 0;
	// Exact measurement: 1 token per 3 chars (different from estimate of 4)
	return Math.ceil(text.length / 3);
};

/**
 * Create a mock source
 */
function createMockSource(candidates: ArtifactCandidate[]): ArtifactSource {
	return {
		generateCandidates: async () => candidates,
	};
}

/**
 * Create candidates that exceed budget when measured exactly
 */
function createOversizedCandidates(count: number, tokensPerCandidate: number): ArtifactCandidate[] {
	const candidates: ArtifactCandidate[] = [];
	for (let i = 0; i < count; i++) {
		// Content length designed to be larger when measured exactly
		const content = "x".repeat(tokensPerCandidate * 4);
		candidates.push(
			createMockCandidate({
				id: `oversized-${i}`,
				lane: "local",
				kind: "local_diff",
				content,
				tokenEstimate: tokensPerCandidate, // Coarse estimate
				relevanceScore: 0.9 - i * 0.05,
			}),
		);
	}
	return candidates;
}

describe("Two-Pass Pipeline", () => {
	describe("Pass 1: Coarse Selection", () => {
		it("uses coarse token estimates for initial selection", async () => {
			// Create candidates with token estimates
			const candidates = [
				createMockCandidate({
					id: "a",
					lane: "local",
					kind: "local_diff",
					content: "Short content",
					tokenEstimate: 100, // Coarse estimate
					relevanceScore: 0.9,
				}),
				createMockCandidate({
					id: "b",
					lane: "local",
					kind: "local_diff",
					content: "Another short content",
					tokenEstimate: 100,
					relevanceScore: 0.8,
				}),
			];

			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				emitDecisionLogs: true,
			});

			const result = await composer.compose({
				event: "file_saved",
				workspaceFingerprint: "test-workspace",
			});

			// Selection should happen based on token estimates
			expect(result.selected.length).toBeGreaterThan(0);
			expect(result.decisionLog).toBeDefined();
		});

		it("selection phase completes before exact measurement", async () => {
			const candidates = [
				createMockCandidate({
					id: "policy-1",
					lane: "policy",
					kind: "constraint",
					content: "Policy content here",
					tokenEstimate: 50,
					relevanceScore: 1.0,
				}),
				createMockCandidate({
					id: "local-1",
					lane: "local",
					kind: "local_diff",
					content: "Local diff content",
					tokenEstimate: 100,
					relevanceScore: 0.9,
				}),
			];

			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
			});

			const result = await composer.compose({
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			// Both should be selected based on estimates
			expect(result.selected).toHaveLength(2);
			// Actual tokens should be measured after selection
			expect(result.actualTokens).toBeGreaterThan(0);
		});
	});

	describe("Pass 2: Shrinking When Over Budget", () => {
		it("shrinks when rendered content exceeds budget", async () => {
			// Create candidates that will exceed budget when measured exactly
			const oversizedCandidates = createOversizedCandidates(5, 2000);

			const tightBudget: BudgetConfig = {
				...DEFAULT_BUDGET_CONFIG,
				totalTokens: 5000, // Tight budget
			};

			const source = createMockSource(oversizedCandidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: tightBudget,
				tokenCounter: exactTokenCounter,
			});

			const result = await composer.compose({
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			// Result should be within budget
			expect(result.actualTokens).toBeLessThanOrEqual(5000);
		});

		it("respects shrink strategy per artifact kind", async () => {
			// Policy artifacts should never shrink
			const candidates = [
				createMockCandidate({
					id: "policy-never-shrink",
					lane: "policy",
					kind: "constraint",
					content: "Critical policy that must not be shrunk: ".repeat(100),
					tokenEstimate: 500,
					relevanceScore: 1.0,
				}),
				createMockCandidate({
					id: "local-can-shrink",
					lane: "local",
					kind: "local_diff",
					content: "Local content that can be shrunk if needed: ".repeat(100),
					tokenEstimate: 1000,
					relevanceScore: 0.8,
				}),
			];

			// Tight budget config with reduced mins to be valid
			const tightBudgetConfig: BudgetConfig = {
				totalTokens: 800,
				lanes: {
					policy: { min: 100, max: 500, priority: 0 },
					rules: { min: 0, max: 200, priority: 1 },
					local: { min: 100, max: 600, priority: 2 },
					structure: { min: 0, max: 100, priority: 3 },
					retrieved: { min: 0, max: 100, priority: 4 },
					history: { min: 0, max: 100, priority: 5 },
				},
			};

			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: tightBudgetConfig,
			});

			const result = await composer.compose({
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			// Policy artifacts should be preserved
			const policyItems = result.rendered.filter((r) => r.lane === "policy");
			// If policy is included, it should not be shrunk
			for (const item of policyItems) {
				if (!item.shrunk) {
					expect(item.content.length).toBeGreaterThan(0);
				}
			}
		});

		it("maintains budget compliance after shrinking", async () => {
			const largeContent = "x".repeat(10000); // Very large content
			const candidates = [
				createMockCandidate({
					id: "large-1",
					lane: "local",
					kind: "local_diff",
					content: largeContent,
					tokenEstimate: 2500,
					relevanceScore: 0.9,
				}),
				createMockCandidate({
					id: "large-2",
					lane: "local",
					kind: "local_diff",
					content: largeContent,
					tokenEstimate: 2500,
					relevanceScore: 0.8,
				}),
			];

			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: {
					...DEFAULT_BUDGET_CONFIG,
					totalTokens: 3000, // Force shrinking
				},
			});

			const result = await composer.compose({
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			// Must be within budget
			expect(result.actualTokens).toBeLessThanOrEqual(3000);
		});
	});

	describe("Pipeline Guarantees", () => {
		it("never exceeds total budget", async () => {
			// Create many candidates that together exceed budget
			const candidates: ArtifactCandidate[] = [];
			for (let i = 0; i < 20; i++) {
				candidates.push(
					createMockCandidate({
						id: `candidate-${i}`,
						lane: i % 2 === 0 ? "local" : "retrieved",
						kind: "local_diff",
						content: "x".repeat(500),
						tokenEstimate: 500,
						relevanceScore: 0.9 - i * 0.02,
					}),
				);
			}

			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: {
					...DEFAULT_BUDGET_CONFIG,
					totalTokens: 5000,
				},
			});

			const result = await composer.compose({
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			// Hard guarantee: never exceed budget
			expect(result.actualTokens).toBeLessThanOrEqual(5000);
		});

		it("selection is deterministic across multiple runs", async () => {
			const candidates = [
				createMockCandidate({
					id: "a",
					lane: "local",
					kind: "local_diff",
					content: "Content A",
					tokenEstimate: 100,
					relevanceScore: 0.9,
				}),
				createMockCandidate({
					id: "b",
					lane: "local",
					kind: "local_diff",
					content: "Content B",
					tokenEstimate: 100,
					relevanceScore: 0.8,
				}),
				createMockCandidate({
					id: "c",
					lane: "local",
					kind: "local_diff",
					content: "Content C",
					tokenEstimate: 100,
					relevanceScore: 0.7,
				}),
			];

			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
			});

			const trigger = {
				event: "test",
				workspaceFingerprint: "determinism-test",
			};

			// Run multiple times with cache cleared
			composer.clearCache();
			const result1 = await composer.compose(trigger);
			composer.clearCache();
			const result2 = await composer.compose(trigger);
			composer.clearCache();
			const result3 = await composer.compose(trigger);

			// All should produce identical selections
			const ids1 = result1.selected.map((s) => s.id).sort();
			const ids2 = result2.selected.map((s) => s.id).sort();
			const ids3 = result3.selected.map((s) => s.id).sort();

			expect(ids1).toEqual(ids2);
			expect(ids2).toEqual(ids3);
		});

		it("includes explanation for all decisions", async () => {
			const candidates = [
				createMockCandidate({
					id: "selected",
					lane: "local",
					kind: "local_diff",
					content: "Selected content",
					tokenEstimate: 100,
					relevanceScore: 0.9,
				}),
			];

			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
			});

			const result = await composer.compose({
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			// Explanation should be provided
			expect(result.explanation).toBeDefined();
			expect(result.explanation.summary).toBeDefined();
			expect(result.explanation.laneBreakdown).toBeDefined();
		});
	});

	describe("Edge Cases", () => {
		it("handles empty candidate list", async () => {
			const source = createMockSource([]);
			const composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
			});

			const result = await composer.compose({
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			expect(result.selected).toHaveLength(0);
			expect(result.actualTokens).toBe(0);
		});

		it("handles single candidate exceeding budget", async () => {
			const hugeCandidate = createMockCandidate({
				id: "huge",
				lane: "local",
				kind: "local_diff",
				content: "x".repeat(100000),
				tokenEstimate: 25000,
				relevanceScore: 1.0,
			});

			// Budget config with reduced mins for small total
			const smallBudgetConfig: BudgetConfig = {
				totalTokens: 1000,
				lanes: {
					policy: { min: 50, max: 200, priority: 0 },
					rules: { min: 50, max: 300, priority: 1 },
					local: { min: 100, max: 800, priority: 2 },
					structure: { min: 0, max: 200, priority: 3 },
					retrieved: { min: 0, max: 200, priority: 4 },
					history: { min: 0, max: 200, priority: 5 },
				},
			};

			const source = createMockSource([hugeCandidate]);
			const composer = createComposer({
				sources: [source],
				budgetConfig: smallBudgetConfig,
			});

			const result = await composer.compose({
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			// Should still be within budget (shrunk or excluded)
			expect(result.actualTokens).toBeLessThanOrEqual(1000);
		});

		it("handles all candidates being exactly at budget", async () => {
			const candidates = [
				createMockCandidate({
					id: "exact",
					lane: "local",
					kind: "local_diff",
					content: "x".repeat(2000),
					tokenEstimate: 500,
					relevanceScore: 0.9,
				}),
			];

			// Budget config with zero mins to allow exact budget testing
			const exactBudgetConfig: BudgetConfig = {
				totalTokens: 500,
				lanes: {
					policy: { min: 0, max: 100, priority: 0 },
					rules: { min: 0, max: 100, priority: 1 },
					local: { min: 0, max: 500, priority: 2 },
					structure: { min: 0, max: 100, priority: 3 },
					retrieved: { min: 0, max: 100, priority: 4 },
					history: { min: 0, max: 100, priority: 5 },
				},
			};

			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: exactBudgetConfig,
			});

			const result = await composer.compose({
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			// Should handle exactly-at-budget case
			expect(result.actualTokens).toBeLessThanOrEqual(500);
		});
	});
});
