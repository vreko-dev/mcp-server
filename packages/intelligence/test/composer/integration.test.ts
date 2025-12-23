/**
 * Integration Tests for Composer
 *
 * Tests the full pipeline: gather → select → render → shrink → explain.
 * Verifies end-to-end behavior and production guarantees.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_BUDGET_CONFIG } from "../../src/composer/budget.js";
import { Composer, createComposer, createMockCandidate } from "../../src/composer/Composer.js";
import { type ComposerConstraints, EMPTY_CONSTRAINTS, matchId, matchLane } from "../../src/composer/constraints.js";
import type { ArtifactCandidate, ArtifactSource, TokenCounter } from "../../src/composer/types.js";

/**
 * Mock token counter for testing
 */
const mockTokenCounter: TokenCounter = (text: string) => {
	if (!text) return 0;
	return Math.ceil(text.length / 4);
};

/**
 * Create a mock artifact source
 */
function createMockSource(candidates: ArtifactCandidate[]): ArtifactSource {
	return {
		generateCandidates: async () => candidates,
	};
}

/**
 * Create test candidates for integration tests
 */
function createTestCandidates(): ArtifactCandidate[] {
	return [
		// Policy lane - highest priority
		createMockCandidate({
			id: "policy-1",
			lane: "policy",
			kind: "constraint",
			content: "NEVER modify protected files without approval",
			recencyBucket: 5,
			relevanceScore: 1.0,
			specificityScore: 1.0,
			riskAlignment: 1.0,
		}),
		// Rules lane
		createMockCandidate({
			id: "rules-1",
			lane: "rules",
			kind: "rule_doc",
			content: "Test files must have .test.ts extension",
			recencyBucket: 4,
			relevanceScore: 0.9,
			specificityScore: 0.9,
			riskAlignment: 0.8,
		}),
		// Local lane - current diff
		createMockCandidate({
			id: "local-1",
			lane: "local",
			kind: "local_diff",
			content: "+++ src/component.ts\n- const old = 1;\n+ const new = 2;",
			recencyBucket: 5,
			relevanceScore: 0.95,
			specificityScore: 0.8,
			riskAlignment: 0.7,
		}),
		// Another local
		createMockCandidate({
			id: "local-2",
			lane: "local",
			kind: "recent_edit",
			content: "export function helper() { return true; }",
			recencyBucket: 4,
			relevanceScore: 0.8,
			specificityScore: 0.7,
			riskAlignment: 0.6,
		}),
		// Structure lane
		createMockCandidate({
			id: "structure-1",
			lane: "structure",
			kind: "dependency_graph",
			content: "component.ts -> helpers.ts\nhelpers.ts -> utils.ts",
			recencyBucket: 2,
			relevanceScore: 0.7,
			specificityScore: 0.6,
			riskAlignment: 0.5,
		}),
		// Retrieved lane
		createMockCandidate({
			id: "retrieved-1",
			lane: "retrieved",
			kind: "semantic_match",
			content: "export function process(data: string): string { return data.trim(); }",
			recencyBucket: 1,
			relevanceScore: 0.85,
			specificityScore: 0.9,
			riskAlignment: 0.4,
		}),
		// History lane
		createMockCandidate({
			id: "history-1",
			lane: "history",
			kind: "session_history",
			content: "User asked about refactoring component.ts",
			recencyBucket: 1,
			relevanceScore: 0.5,
			specificityScore: 0.4,
			riskAlignment: 0.3,
		}),
	];
}

describe("Composer Integration", () => {
	describe("createComposer", () => {
		it("creates composer with default config", () => {
			const source = createMockSource([]);
			const composer = createComposer({
				sources: [source],
			});

			expect(composer).toBeInstanceOf(Composer);
		});

		it("creates composer with custom config", () => {
			const source = createMockSource([]);
			const customConfig = {
				...DEFAULT_BUDGET_CONFIG,
				totalTokens: 4000,
			};

			const composer = createComposer({
				sources: [source],
				budgetConfig: customConfig,
			});

			expect(composer).toBeInstanceOf(Composer);
			expect(composer.getConfig().totalTokens).toBe(4000);
		});
	});

	describe("Full Pipeline", () => {
		let composer: Composer;
		let candidates: ArtifactCandidate[];

		beforeEach(() => {
			candidates = createTestCandidates();
			const source = createMockSource(candidates);
			composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
				emitDecisionLogs: true,
			});
		});

		it("completes full composition pipeline", async () => {
			// Happy path: end-to-end composition
			const result = await composer.compose({
				event: "file_saved",
				workspaceFingerprint: "test-workspace",
			});

			expect(result.selected).toBeDefined();
			expect(result.selected.length).toBeGreaterThan(0);
			expect(result.explanation).toBeDefined();
			expect(result.decisionLog).toBeDefined();
		});

		it("respects total budget", async () => {
			const smallBudget = {
				...DEFAULT_BUDGET_CONFIG,
				totalTokens: 500,
				lanes: {
					policy: { min: 50, max: 100, priority: 0 },
					rules: { min: 50, max: 100, priority: 1 },
					local: { min: 100, max: 200, priority: 2 },
					structure: { min: 0, max: 100, priority: 3 },
					retrieved: { min: 0, max: 100, priority: 4 },
					history: { min: 0, max: 100, priority: 5 },
				},
			};

			const source = createMockSource(candidates);
			const smallComposer = createComposer({
				sources: [source],
				budgetConfig: smallBudget,
				tokenCounter: mockTokenCounter,
			});

			const result = await smallComposer.compose({
				event: "file_saved",
				workspaceFingerprint: "test-workspace",
			});

			expect(result.actualTokens).toBeLessThanOrEqual(500);
		});

		it("includes policy artifacts first", async () => {
			const result = await composer.compose({
				event: "file_saved",
				workspaceFingerprint: "test-workspace",
			});

			// Policy should be selected
			const policyArtifact = result.selected.find((a) => a.lane === "policy");
			expect(policyArtifact).toBeDefined();
		});

		it("generates explanation with lane breakdown", async () => {
			const result = await composer.compose({
				event: "file_saved",
				workspaceFingerprint: "test-workspace",
			});

			expect(result.explanation.summary).toBeDefined();
			expect(result.explanation.laneBreakdown).toBeDefined();
		});

		it("generates decision log for replay", async () => {
			const result = await composer.compose({
				event: "file_saved",
				workspaceFingerprint: "test-workspace",
			});

			expect(result.decisionLog).toBeDefined();
			expect(result.decisionLog?.id).toBeDefined();
			expect(result.decisionLog?.timestamp).toBeDefined();
			expect(result.decisionLog?.selectedArtifacts).toBeDefined();
		});
	});

	describe("Constraint Enforcement", () => {
		let composer: Composer;

		beforeEach(() => {
			const candidates = createTestCandidates();
			const source = createMockSource(candidates);
			composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
			});
		});

		it("excludes blocked artifacts", async () => {
			const constraints: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustExclude: [{ match: matchId("local-1"), reason: "Blocked" }],
			};

			const result = await composer.compose(
				{
					event: "file_saved",
					workspaceFingerprint: "test-workspace",
				},
				constraints,
			);

			const excluded = result.selected.find((a) => a.id === "local-1");
			expect(excluded).toBeUndefined();
		});

		it("includes must-include artifacts", async () => {
			const constraints: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustInclude: [{ match: matchId("history-1"), reason: "Required" }],
			};

			const result = await composer.compose(
				{
					event: "file_saved",
					workspaceFingerprint: "test-workspace",
				},
				constraints,
			);

			const included = result.selected.find((a) => a.id === "history-1");
			expect(included).toBeDefined();
		});

		it("pins artifacts to be selected first", async () => {
			const constraints: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				pinned: [{ match: matchId("history-1"), reason: "Pinned" }],
			};

			const result = await composer.compose(
				{
					event: "file_saved",
					workspaceFingerprint: "test-workspace",
				},
				constraints,
			);

			// History should be in results despite low priority
			const pinned = result.selected.find((a) => a.id === "history-1");
			expect(pinned).toBeDefined();
		});
	});

	describe("Determinism Guarantees", () => {
		it("produces identical results for identical inputs", async () => {
			const candidates = createTestCandidates();
			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
			});

			const trigger = {
				event: "file_saved",
				workspaceFingerprint: "test-workspace-123",
			};

			// Clear cache to ensure fresh computations
			composer.clearCache();

			// Run multiple times
			const result1 = await composer.compose(trigger);
			composer.clearCache();
			const result2 = await composer.compose(trigger);
			composer.clearCache();
			const result3 = await composer.compose(trigger);

			// All should have same selection
			expect(result1.selected.map((a) => a.id)).toEqual(result2.selected.map((a) => a.id));
			expect(result2.selected.map((a) => a.id)).toEqual(result3.selected.map((a) => a.id));
		});

		it("produces different results for different inputs", async () => {
			const candidates = createTestCandidates();
			const source = createMockSource(candidates);
			const composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
			});

			// Different constraints
			const result1 = await composer.compose(
				{
					event: "file_saved",
					workspaceFingerprint: "workspace-1",
				},
				EMPTY_CONSTRAINTS,
			);

			composer.clearCache();

			const result2 = await composer.compose(
				{
					event: "file_saved",
					workspaceFingerprint: "workspace-1",
				},
				{
					...EMPTY_CONSTRAINTS,
					mustExclude: [{ match: matchLane("local"), reason: "No local" }],
				},
			);

			// Results should differ
			const result1LocalCount = result1.selected.filter((a) => a.lane === "local").length;
			const result2LocalCount = result2.selected.filter((a) => a.lane === "local").length;

			expect(result2LocalCount).toBeLessThan(result1LocalCount);
		});
	});

	describe("Cache Behavior", () => {
		it("uses cached results for identical inputs", async () => {
			const candidates = createTestCandidates();
			const source = createMockSource(candidates);

			const composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
			});

			const trigger = {
				event: "file_saved",
				workspaceFingerprint: "cached-workspace",
			};

			// First call - cache miss
			const result1 = await composer.compose(trigger);
			expect(result1.cacheHit).toBe(false);

			// Second call - cache hit
			const result2 = await composer.compose(trigger);
			expect(result2.cacheHit).toBe(true);
		});

		it("cache can be cleared", async () => {
			const candidates = createTestCandidates();
			const source = createMockSource(candidates);

			const composer = createComposer({
				sources: [source],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
			});

			const trigger = {
				event: "file_saved",
				workspaceFingerprint: "clearable-workspace",
			};

			// First call
			await composer.compose(trigger);

			// Clear cache
			composer.clearCache();

			// Should be a miss again
			const result = await composer.compose(trigger);
			expect(result.cacheHit).toBe(false);
		});
	});

	describe("Error Handling", () => {
		it("handles source errors gracefully", async () => {
			const failingSource: ArtifactSource = {
				generateCandidates: async () => {
					throw new Error("Source failed");
				},
			};

			const composer = createComposer({
				sources: [failingSource],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
			});

			// Should throw
			await expect(
				composer.compose({
					event: "file_saved",
					workspaceFingerprint: "test",
				}),
			).rejects.toThrow("Source failed");
		});

		it("handles empty sources", async () => {
			const emptySource = createMockSource([]);
			const composer = createComposer({
				sources: [emptySource],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
			});

			const result = await composer.compose({
				event: "file_saved",
				workspaceFingerprint: "test",
			});

			expect(result.selected).toHaveLength(0);
			expect(result.explanation).toBeDefined();
		});
	});

	describe("Multiple Sources", () => {
		it("aggregates candidates from multiple sources", async () => {
			const source1 = createMockSource([
				createMockCandidate({
					id: "s1-a",
					lane: "local",
					kind: "local_diff",
					content: "Source 1 content A",
					relevanceScore: 0.8,
				}),
			]);

			const source2 = createMockSource([
				createMockCandidate({
					id: "s2-a",
					lane: "retrieved",
					kind: "semantic_match",
					content: "Source 2 content A",
					relevanceScore: 0.7,
				}),
			]);

			const composer = createComposer({
				sources: [source1, source2],
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
			});

			const result = await composer.compose({
				event: "file_saved",
				workspaceFingerprint: "test",
			});

			// Should have artifacts from both sources
			const fromS1 = result.selected.find((a) => a.id.startsWith("s1-"));
			const fromS2 = result.selected.find((a) => a.id.startsWith("s2-"));

			expect(fromS1).toBeDefined();
			expect(fromS2).toBeDefined();
		});
	});

	describe("composeWithCandidates", () => {
		it("allows testing with explicit candidates", async () => {
			const composer = createComposer({
				budgetConfig: DEFAULT_BUDGET_CONFIG,
				tokenCounter: mockTokenCounter,
			});

			const candidates = [
				createMockCandidate({
					id: "test-1",
					lane: "local",
					kind: "local_diff",
					content: "Test content",
					relevanceScore: 0.9,
				}),
			];

			const result = await composer.composeWithCandidates(candidates, {
				event: "test",
				workspaceFingerprint: "test-ws",
			});

			expect(result.selected).toHaveLength(1);
			expect(result.selected[0].id).toBe("test-1");
		});
	});
});
