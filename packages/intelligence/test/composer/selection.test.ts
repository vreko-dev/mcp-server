/**
 * Selection Module Tests
 *
 * Tests scoring, constraint enforcement, and determinism.
 * Covers 4 paths: happy, error, edge, null/empty.
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_BUDGET_CONFIG } from "../../src/composer/budget.js";
import {
	type ComposerConstraints,
	constraints,
	EMPTY_CONSTRAINTS,
	isExcluded,
	isMustInclude,
	isPinned,
	matches,
	matchId,
	matchKind,
	matchLane,
	matchPattern,
	mergeConstraints,
} from "../../src/composer/constraints.js";
import { computeScore, getScoreStats, SCORING_WEIGHTS, scoreAndSort, topN } from "../../src/composer/scoring.js";
import {
	getSelectionStats,
	type SelectionContext,
	selectArtifacts,
	toRef,
	verifySelectionDeterminism,
} from "../../src/composer/selection.js";
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

/**
 * Test selection context
 */
const testContext: SelectionContext = {
	workspaceFingerprint: "test-workspace",
	triggerEvent: "file_saved",
	commitish: "abc123",
	rulesDigest: "rules-hash",
};

describe("Scoring Module", () => {
	describe("SCORING_WEIGHTS", () => {
		it("weights sum to 1.0", () => {
			const sum =
				SCORING_WEIGHTS.recency +
				SCORING_WEIGHTS.relevance +
				SCORING_WEIGHTS.specificity +
				SCORING_WEIGHTS.riskAlignment;
			expect(sum).toBeCloseTo(1.0, 10);
		});

		it("relevance has highest weight", () => {
			expect(SCORING_WEIGHTS.relevance).toBeGreaterThan(SCORING_WEIGHTS.recency);
			expect(SCORING_WEIGHTS.relevance).toBeGreaterThan(SCORING_WEIGHTS.specificity);
			expect(SCORING_WEIGHTS.relevance).toBeGreaterThan(SCORING_WEIGHTS.riskAlignment);
		});
	});

	describe("computeScore", () => {
		it("computes weighted score correctly", () => {
			// Happy path: all max scores
			const candidate = createCandidate("a", "local", 100, {
				recencyBucket: 5,
				relevanceScore: 1.0,
				specificityScore: 1.0,
				riskAlignment: 1.0,
			});

			const score = computeScore(candidate);
			expect(score).toBeCloseTo(1.0, 2);
		});

		it("weights relevance highest", () => {
			// Only relevance is high
			const highRelevance = createCandidate("a", "local", 100, {
				recencyBucket: 0,
				relevanceScore: 1.0,
				specificityScore: 0,
				riskAlignment: 0,
			});

			// Only recency is high
			const highRecency = createCandidate("b", "local", 100, {
				recencyBucket: 5,
				relevanceScore: 0,
				specificityScore: 0,
				riskAlignment: 0,
			});

			expect(computeScore(highRelevance)).toBeGreaterThan(computeScore(highRecency));
		});

		it("returns 0 for all-zero inputs", () => {
			// Edge path: all zeros
			const candidate = createCandidate("a", "local", 100, {
				recencyBucket: 0,
				relevanceScore: 0,
				specificityScore: 0,
				riskAlignment: 0,
			});

			expect(computeScore(candidate)).toBe(0);
		});
	});

	describe("scoreAndSort", () => {
		it("sorts by score descending", () => {
			// Happy path: different scores
			const candidates = [
				createCandidate("low", "local", 100, { relevanceScore: 0.1 }),
				createCandidate("high", "local", 100, { relevanceScore: 0.9 }),
				createCandidate("mid", "local", 100, { relevanceScore: 0.5 }),
			];

			const sorted = scoreAndSort(candidates);
			expect(sorted[0].candidate.id).toBe("high");
			expect(sorted[1].candidate.id).toBe("mid");
			expect(sorted[2].candidate.id).toBe("low");
		});

		it("uses stable tie-breaker for equal scores", () => {
			// Determinism path: equal scores
			const candidates = [
				createCandidate("b", "local", 100),
				createCandidate("a", "local", 100),
				createCandidate("c", "local", 100),
			];

			// Run multiple times - should be stable
			const sorted1 = scoreAndSort(candidates);
			const sorted2 = scoreAndSort(candidates);
			const sorted3 = scoreAndSort(candidates);

			expect(sorted1.map((s) => s.candidate.id)).toEqual(sorted2.map((s) => s.candidate.id));
			expect(sorted2.map((s) => s.candidate.id)).toEqual(sorted3.map((s) => s.candidate.id));
		});

		it("handles empty array", () => {
			// Empty path
			const sorted = scoreAndSort([]);
			expect(sorted).toHaveLength(0);
		});

		it("handles single candidate", () => {
			// Edge path: single item
			const candidates = [createCandidate("only", "local", 100)];
			const sorted = scoreAndSort(candidates);
			expect(sorted).toHaveLength(1);
			expect(sorted[0].candidate.id).toBe("only");
		});
	});

	describe("topN", () => {
		it("returns top N candidates", () => {
			const candidates = [
				createCandidate("a", "local", 100, { relevanceScore: 0.9 }),
				createCandidate("b", "local", 100, { relevanceScore: 0.8 }),
				createCandidate("c", "local", 100, { relevanceScore: 0.7 }),
			];

			const top = topN(candidates, 2);
			expect(top.length).toBe(2);
			expect(top[0].candidate.id).toBe("a");
			expect(top[1].candidate.id).toBe("b");
		});
	});

	describe("getScoreStats", () => {
		it("calculates score statistics", () => {
			const candidates = [
				createCandidate("a", "local", 100, { relevanceScore: 0.9 }),
				createCandidate("b", "local", 100, { relevanceScore: 0.1 }),
			];

			const stats = getScoreStats(candidates);
			expect(stats.min).toBeLessThan(stats.max);
			expect(stats.mean).toBeGreaterThan(stats.min);
		});

		it("handles empty candidates", () => {
			const stats = getScoreStats([]);
			expect(stats.min).toBe(0);
			expect(stats.max).toBe(0);
		});
	});
});

describe("Constraints Module", () => {
	describe("matches", () => {
		it("matches by id", () => {
			// Happy path: ID match
			const candidate = createCandidate("test-id", "local", 100);
			expect(matches(candidate, matchId("test-id"))).toBe(true);
			expect(matches(candidate, matchId("other-id"))).toBe(false);
		});

		it("matches by kind", () => {
			// Happy path: kind match
			const candidate = createCandidate("a", "local", 100, { kind: "local_diff" });
			expect(matches(candidate, matchKind("local_diff"))).toBe(true);
			expect(matches(candidate, matchKind("dependency_graph"))).toBe(false);
		});

		it("matches by lane", () => {
			// Happy path: lane match
			const candidate = createCandidate("a", "policy", 100);
			expect(matches(candidate, matchLane("policy"))).toBe(true);
			expect(matches(candidate, matchLane("local"))).toBe(false);
		});

		it("matches by pattern with getPath", () => {
			// Happy path: glob pattern
			const candidate = createCandidate("a", "local", 100);
			const getPath = () => "/src/components/Button.tsx";

			expect(matches(candidate, matchPattern("**/components/*.tsx"), getPath)).toBe(true);
			expect(matches(candidate, matchPattern("**/utils/*.ts"), getPath)).toBe(false);
		});

		it("returns false for pattern without getPath", () => {
			// Edge path: no path function
			const candidate = createCandidate("a", "local", 100);
			expect(matches(candidate, matchPattern("**/*.ts"))).toBe(false);
		});
	});

	describe("isExcluded", () => {
		it("returns constraint for excluded artifact", () => {
			// Happy path: exclusion works
			const candidate = createCandidate("blocked", "local", 100);
			const c: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustExclude: [{ match: matchId("blocked"), reason: "Policy blocked" }],
			};

			const result = isExcluded(candidate, c);
			expect(result).toBeDefined();
			expect(result?.reason).toBe("Policy blocked");
		});

		it("returns undefined for non-excluded artifact", () => {
			const candidate = createCandidate("allowed", "local", 100);
			const c: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustExclude: [{ match: matchId("blocked"), reason: "Blocked" }],
			};

			expect(isExcluded(candidate, c)).toBeUndefined();
		});

		it("handles empty exclusions", () => {
			// Empty path
			const candidate = createCandidate("any", "local", 100);
			expect(isExcluded(candidate, EMPTY_CONSTRAINTS)).toBeUndefined();
		});
	});

	describe("isMustInclude", () => {
		it("returns constraint for must-include artifact", () => {
			const candidate = createCandidate("required", "local", 100);
			const c: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustInclude: [{ match: matchId("required"), reason: "Required" }],
			};

			expect(isMustInclude(candidate, c)).toBeDefined();
		});

		it("returns undefined for optional artifact", () => {
			const candidate = createCandidate("optional", "local", 100);
			const c: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustInclude: [{ match: matchId("required"), reason: "Required" }],
			};

			expect(isMustInclude(candidate, c)).toBeUndefined();
		});
	});

	describe("isPinned", () => {
		it("returns constraint for pinned artifact", () => {
			const candidate = createCandidate("pinned", "local", 100);
			const c: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				pinned: [{ match: matchId("pinned"), reason: "Current diff" }],
			};

			expect(isPinned(candidate, c)).toBeDefined();
		});
	});

	describe("ConstraintsBuilder", () => {
		it("builds constraints correctly", () => {
			const c = constraints()
				.mustInclude(matchId("required"), "Required for context")
				.mustExclude(matchLane("history"), "No history needed")
				.pin(matchId("current"), "Current file")
				.requireLane("policy", 200, "Policy is critical")
				.build();

			expect(c.mustInclude).toHaveLength(1);
			expect(c.mustExclude).toHaveLength(1);
			expect(c.pinned).toHaveLength(1);
			expect(c.laneRequirements).toHaveLength(1);
		});
	});

	describe("mergeConstraints", () => {
		it("merges multiple constraint sets", () => {
			const c1: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustInclude: [{ match: matchId("a"), reason: "A" }],
			};
			const c2: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustInclude: [{ match: matchId("b"), reason: "B" }],
			};

			const merged = mergeConstraints(c1, c2);
			expect(merged.mustInclude).toHaveLength(2);
		});
	});
});

describe("Selection Pipeline", () => {
	describe("selectArtifacts", () => {
		it("selects artifacts within budget", () => {
			// Happy path: basic selection
			const candidates = [
				createCandidate("a", "local", 100, { relevanceScore: 0.9 }),
				createCandidate("b", "local", 100, { relevanceScore: 0.8 }),
				createCandidate("c", "local", 100, { relevanceScore: 0.7 }),
			];

			const result = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, EMPTY_CONSTRAINTS, testContext);

			expect(result.selected.length).toBeGreaterThan(0);
			expect(result.selected.length).toBeLessThanOrEqual(candidates.length);
		});

		it("excludes blocked artifacts", () => {
			// Constraint path: exclusions
			const candidates = [
				createCandidate("good", "local", 100, { relevanceScore: 0.5 }),
				createCandidate("blocked", "local", 100, { relevanceScore: 0.9 }),
			];

			const c: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustExclude: [{ match: matchId("blocked"), reason: "Blocked" }],
			};

			const result = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, c, testContext);

			// Blocked should not be selected
			expect(result.selected.find((s) => s.id === "blocked")).toBeUndefined();

			// Should be in rejections
			const blockedRejection = result.rejections.find((r) => r.artifact.id === "blocked");
			expect(blockedRejection).toBeDefined();
			expect(blockedRejection?.reason).toBe("excluded_by_policy");
		});

		it("always includes must-include artifacts", () => {
			// Constraint path: must-include
			const candidates = [
				createCandidate("required", "local", 100, { relevanceScore: 0.1 }),
				createCandidate("optional", "local", 100, { relevanceScore: 0.9 }),
			];

			const c: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustInclude: [{ match: matchId("required"), reason: "Required" }],
			};

			const result = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, c, testContext);

			// Must-include should be present
			expect(result.selected.find((s) => s.id === "required")).toBeDefined();
		});

		it("selects pinned artifacts first", () => {
			// Constraint path: pinned
			const candidates = [
				createCandidate("pinned", "local", 100, { relevanceScore: 0.1 }),
				createCandidate("high-score", "local", 100, { relevanceScore: 0.9 }),
			];

			const c: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				pinned: [{ match: matchId("pinned"), reason: "Pinned" }],
			};

			const result = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, c, testContext);

			// Pinned should be in selection
			expect(result.selected.find((s) => s.id === "pinned")).toBeDefined();
		});

		it("handles empty candidates", () => {
			// Empty path
			const result = selectArtifacts([], DEFAULT_BUDGET_CONFIG, EMPTY_CONSTRAINTS, testContext);

			expect(result.selected).toHaveLength(0);
			expect(result.rejections).toHaveLength(0);
		});

		it("produces deterministic results", () => {
			// Determinism path: run multiple times
			const candidates = [
				createCandidate("a", "local", 100),
				createCandidate("b", "local", 100),
				createCandidate("c", "local", 100),
				createCandidate("d", "local", 100),
			];

			const result1 = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, EMPTY_CONSTRAINTS, testContext);
			const result2 = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, EMPTY_CONSTRAINTS, testContext);
			const result3 = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, EMPTY_CONSTRAINTS, testContext);

			// All runs should produce identical results
			expect(result1.selected.map((s) => s.id)).toEqual(result2.selected.map((s) => s.id));
			expect(result2.selected.map((s) => s.id)).toEqual(result3.selected.map((s) => s.id));
		});
	});

	describe("toRef", () => {
		it("converts candidate to ref", () => {
			const candidate = createCandidate("test", "local", 100, { kind: "local_diff" });
			const ref = toRef(candidate);

			expect(ref.id).toBe("test");
			expect(ref.lane).toBe("local");
			expect(ref.kind).toBe("local_diff");
			expect(ref.tokenEstimate).toBe(100);
		});
	});

	describe("verifySelectionDeterminism", () => {
		it("returns true for deterministic selection", () => {
			const candidates = [createCandidate("a", "local", 100), createCandidate("b", "local", 100)];

			const result = verifySelectionDeterminism(
				candidates,
				DEFAULT_BUDGET_CONFIG,
				EMPTY_CONSTRAINTS,
				testContext,
			);
			expect(result).toBe(true);
		});
	});

	describe("getSelectionStats", () => {
		it("calculates selection statistics", () => {
			const candidates = [createCandidate("a", "local", 100), createCandidate("blocked", "policy", 100)];

			const c: ComposerConstraints = {
				...EMPTY_CONSTRAINTS,
				mustExclude: [{ match: matchId("blocked"), reason: "Blocked" }],
			};

			const result = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, c, testContext);
			const stats = getSelectionStats(result);

			expect(stats.totalSelected).toBeGreaterThanOrEqual(0);
			expect(stats.totalRejected).toBeGreaterThan(0);
		});
	});
});
