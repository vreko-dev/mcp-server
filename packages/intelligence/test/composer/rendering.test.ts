/**
 * Rendering Module Tests
 *
 * Tests shrink strategies, budget fitting, and token measurement.
 * Covers 4 paths: happy, error, edge, null/empty.
 */

import { describe, expect, it } from "vitest";
import {
	applyShrinkStrategy,
	collapseSummary,
	dropEntries,
	getShrinkStats,
	getTotalTokens,
	keepSignatures,
	needsShrinking,
	renderArtifact,
	renderArtifacts,
	SHRINK_STRATEGIES,
	shrinkToFit,
	truncateOldest,
} from "../../src/composer/rendering.js";
import type {
	ArtifactCandidate,
	ArtifactKind,
	ArtifactRef,
	Lane,
	RenderedArtifact,
	TokenCounter,
} from "../../src/composer/types.js";
import { defaultTokenCounter } from "../../src/composer/types.js";

/**
 * Helper to create test artifact ref
 */
function createRef(id: string, kind: ArtifactKind, lane: Lane = "local"): ArtifactRef {
	return {
		id,
		lane,
		kind,
		tokenEstimate: 100,
	};
}

/**
 * Helper to create test candidates
 */
function createCandidate(id: string, kind: ArtifactKind, content: string, lane: Lane = "local"): ArtifactCandidate {
	return {
		id,
		lane,
		kind,
		tokenEstimate: Math.ceil(content.length / 4),
		recencyBucket: 3,
		relevanceScore: 0.5,
		specificityScore: 0.5,
		riskAlignment: 0.5,
		getContent: () => content,
		shrink: (targetTokens: number) => ({
			id,
			lane,
			kind,
			content: content.slice(0, targetTokens * 4),
			exactTokenCount: targetTokens,
			shrunk: true,
			originalTokenCount: Math.ceil(content.length / 4),
			shrinkStrategy: SHRINK_STRATEGIES[kind],
		}),
	};
}

/**
 * Helper to create test rendered artifact
 */
function createRendered(id: string, kind: ArtifactKind, content: string, lane: Lane = "local"): RenderedArtifact {
	return {
		id,
		lane,
		kind,
		content,
		exactTokenCount: Math.ceil(content.length / 4),
		shrunk: false,
	};
}

/**
 * Mock token counter for testing
 */
const mockTokenCounter: TokenCounter = (text: string) => {
	if (!text) return 0;
	return Math.ceil(text.length / 4);
};

describe("Rendering Module", () => {
	describe("SHRINK_STRATEGIES", () => {
		it("has strategies for all artifact kinds", () => {
			const kinds: ArtifactKind[] = [
				"constraint",
				"rule_doc",
				"local_diff",
				"recent_edit",
				"symbol_context",
				"dependency_graph",
				"test_context",
				"semantic_match",
				"session_history",
				"violation",
				"learning",
			];

			for (const kind of kinds) {
				expect(SHRINK_STRATEGIES[kind]).toBeDefined();
			}
		});

		it("never shrinks constraints and rules", () => {
			expect(SHRINK_STRATEGIES.constraint).toBe("never");
			expect(SHRINK_STRATEGIES.rule_doc).toBe("never");
		});

		it("has appropriate strategies for each kind", () => {
			expect(SHRINK_STRATEGIES.local_diff).toBe("truncate_oldest");
			expect(SHRINK_STRATEGIES.recent_edit).toBe("truncate_oldest");
			expect(SHRINK_STRATEGIES.symbol_context).toBe("keep_signatures");
			expect(SHRINK_STRATEGIES.dependency_graph).toBe("collapse_summary");
			expect(SHRINK_STRATEGIES.test_context).toBe("keep_signatures");
			expect(SHRINK_STRATEGIES.semantic_match).toBe("truncate_oldest");
			expect(SHRINK_STRATEGIES.session_history).toBe("drop_entries");
			expect(SHRINK_STRATEGIES.violation).toBe("drop_entries");
			expect(SHRINK_STRATEGIES.learning).toBe("drop_entries");
		});
	});

	describe("defaultTokenCounter", () => {
		it("measures tokens correctly", () => {
			// Happy path: simple measurement
			const content = "Hello, world! This is a test.";
			const tokens = defaultTokenCounter(content);
			expect(tokens).toBeGreaterThan(0);
		});

		it("returns 0 for empty string", () => {
			// Empty path
			expect(defaultTokenCounter("")).toBe(0);
		});

		it("handles unicode content", () => {
			// Edge path: unicode
			const content = "こんにちは世界 🎉";
			const tokens = defaultTokenCounter(content);
			expect(tokens).toBeGreaterThan(0);
		});

		it("handles very long content", () => {
			// Edge path: large content
			const content = "a".repeat(100000);
			const tokens = defaultTokenCounter(content);
			expect(tokens).toBe(25000); // 100000 / 4
		});
	});

	describe("renderArtifact", () => {
		it("renders content from candidate", () => {
			// Happy path: basic render
			const content = "function test() { return 42; }";
			const candidate = createCandidate("test", "semantic_match", content);
			const ref = createRef("test", "semantic_match");

			const rendered = renderArtifact(ref, [candidate], mockTokenCounter);

			expect(rendered.id).toBe("test");
			expect(rendered.content).toBe(content);
			expect(rendered.exactTokenCount).toBeGreaterThan(0);
		});

		it("measures exact tokens after render", () => {
			const content = "const x = 1; const y = 2; const z = 3;";
			const candidate = createCandidate("test", "semantic_match", content);
			const ref = createRef("test", "semantic_match");

			const rendered = renderArtifact(ref, [candidate], mockTokenCounter);

			// Actual tokens should be measured
			expect(rendered.exactTokenCount).toBe(mockTokenCounter(content));
		});

		it("throws error when candidate not found", () => {
			// Error path: candidate not in list
			const ref = createRef("missing", "semantic_match");

			expect(() => renderArtifact(ref, [], mockTokenCounter)).toThrow("Candidate not found: missing");
		});
	});

	describe("renderArtifacts", () => {
		it("renders multiple candidates", () => {
			const candidates = [
				createCandidate("a", "semantic_match", "Content A"),
				createCandidate("b", "local_diff", "Content B"),
			];
			const refs = [createRef("a", "semantic_match"), createRef("b", "local_diff")];

			const rendered = renderArtifacts(refs, candidates, mockTokenCounter);

			expect(rendered).toHaveLength(2);
			expect(rendered[0].id).toBe("a");
			expect(rendered[1].id).toBe("b");
		});

		it("handles empty refs", () => {
			const rendered = renderArtifacts([], [], mockTokenCounter);
			expect(rendered).toHaveLength(0);
		});
	});

	describe("getTotalTokens", () => {
		it("calculates total tokens correctly", () => {
			const rendered = [
				createRendered("a", "semantic_match", "1234567890"), // 10 chars = 3 tokens
				createRendered("b", "local_diff", "1234567890"), // 10 chars = 3 tokens
			];

			const total = getTotalTokens(rendered);
			expect(total).toBe(6); // 3 + 3
		});

		it("returns 0 for empty array", () => {
			expect(getTotalTokens([])).toBe(0);
		});
	});

	describe("truncateOldest", () => {
		it("removes oldest content when over budget", () => {
			// Happy path: truncate to fit
			const content =
				"Line 1: First change\nLine 2: Second change\nLine 3: Third change\nLine 4: Fourth change\nLine 5: Fifth change";
			const artifact = createRendered("test", "local_diff", content);

			const result = truncateOldest(artifact, 10, mockTokenCounter);
			const tokens = result.exactTokenCount;

			expect(tokens).toBeLessThanOrEqual(15); // Some buffer for truncation marker
		});

		it("preserves most recent content", () => {
			const content = "OLD: First line\nOLD: Second line\nNEW: Third line\nNEW: Fourth line";
			const artifact = createRendered("test", "local_diff", content);

			const result = truncateOldest(artifact, 10, mockTokenCounter);

			// Should keep newer content
			expect(result.content).toContain("NEW");
		});

		it("returns full content if within budget", () => {
			// Edge path: already fits
			const artifact = createRendered("test", "local_diff", "Short");
			const result = truncateOldest(artifact, 100, mockTokenCounter);
			expect(result.content).toBe("Short");
		});

		it("handles empty content", () => {
			// Empty path
			const artifact = createRendered("test", "local_diff", "");
			const result = truncateOldest(artifact, 10, mockTokenCounter);
			expect(result.content).toBe("");
		});
	});

	describe("keepSignatures", () => {
		it("keeps function signatures, removes bodies", () => {
			// Happy path: extract signatures
			const content = `function add(a: number, b: number): number {
  return a + b;
}

function multiply(x: number, y: number): number {
  const result = x * y;
  return result;
}`;
			const artifact = createRendered("test", "symbol_context", content);

			// Use larger target to get both functions
			const result = keepSignatures(artifact, 50, mockTokenCounter);

			// Should have at least the first signature
			expect(result.content).toContain("function add");

			// Should be shorter or equal (body omitted)
			expect(result.exactTokenCount).toBeLessThanOrEqual(artifact.exactTokenCount);
		});

		it("handles class declarations", () => {
			const content = `class Calculator {
  private value: number;

  constructor(initial: number) {
    this.value = initial;
  }

  add(n: number): void {
    this.value += n;
  }
}`;
			const artifact = createRendered("test", "symbol_context", content);

			const result = keepSignatures(artifact, 15, mockTokenCounter);
			expect(result.content).toContain("class Calculator");
		});

		it("returns full content if fits in budget", () => {
			const artifact = createRendered("test", "symbol_context", "function f(): void {}");
			const result = keepSignatures(artifact, 100, mockTokenCounter);
			expect(result.exactTokenCount).toBeLessThanOrEqual(artifact.exactTokenCount);
		});
	});

	describe("collapseSummary", () => {
		it("generates summary when over budget", () => {
			// Happy path: collapse to summary
			const content = `# Dependency Graph
- Module A depends on B
- Module B depends on C
- Module C depends on D
- Module D depends on E
- Module E is standalone`;
			const artifact = createRendered("test", "dependency_graph", content);

			const result = collapseSummary(artifact, 10, mockTokenCounter);

			expect(result.exactTokenCount).toBeLessThanOrEqual(15); // Some buffer
		});

		it("preserves key headers", () => {
			const content = `# Main Module
## Dependencies
- dep1
- dep2
## Exports
- export1`;
			const artifact = createRendered("test", "dependency_graph", content);

			const result = collapseSummary(artifact, 10, mockTokenCounter);

			// Should keep headers
			expect(result.content).toContain("Main Module");
		});

		it("handles empty content", () => {
			const artifact = createRendered("test", "dependency_graph", "");
			const result = collapseSummary(artifact, 10, mockTokenCounter);
			expect(result.content).toBe("");
		});
	});

	describe("dropEntries", () => {
		it("drops oldest entries when over budget", () => {
			// Happy path: drop entries
			const content = `Entry 1: First session event

Entry 2: Second session event

Entry 3: Third session event

Entry 4: Most recent event`;
			const artifact = createRendered("test", "session_history", content);

			const result = dropEntries(artifact, 15, mockTokenCounter);

			// Should keep most recent
			expect(result.content).toContain("Most recent");
		});

		it("handles single entry", () => {
			const artifact = createRendered("test", "session_history", "Single entry");
			const result = dropEntries(artifact, 100, mockTokenCounter);
			expect(result.content).toContain("Single entry");
		});
	});

	describe("applyShrinkStrategy", () => {
		it("applies correct strategy based on kind", () => {
			// Happy path: semantic_match uses truncate_oldest
			const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8";
			const artifact = createRendered("test", "semantic_match", content);

			const shrunk = applyShrinkStrategy(artifact, 5, mockTokenCounter);
			expect(shrunk.exactTokenCount).toBeLessThan(artifact.exactTokenCount);
		});

		it("returns unchanged for 'never' strategy", () => {
			// Constraint path: never shrink
			const artifact = createRendered("constraint", "constraint", "NEVER SHRINK THIS", "policy");

			const shrunk = applyShrinkStrategy(artifact, 1, mockTokenCounter);

			// Content unchanged even though over budget
			expect(shrunk.content).toBe("NEVER SHRINK THIS");
		});

		it("uses truncate_oldest for diffs", () => {
			const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
			const artifact = createRendered("diff", "local_diff", content);

			const shrunk = applyShrinkStrategy(artifact, 3, mockTokenCounter);
			expect(shrunk.exactTokenCount).toBeLessThan(artifact.exactTokenCount);
		});
	});

	describe("shrinkToFit", () => {
		it("shrinks artifacts to fit budget", () => {
			// Happy path: shrink to total budget
			// Note: MIN_SHRUNK_SIZE is 50, so budget must be >= 50 per artifact
			const rendered = [
				createRendered("a", "semantic_match", "A".repeat(100)),
				createRendered("b", "semantic_match", "B".repeat(100)),
			];

			const shrunk = shrinkToFit(rendered, 100, mockTokenCounter);
			const totalTokens = getTotalTokens(shrunk);

			// Should be reduced (original is 50 tokens, MIN_SHRUNK_SIZE is 50)
			expect(totalTokens).toBeLessThanOrEqual(100);
		});

		it("preserves high-priority lanes", () => {
			// Priority path: policy lane preserved
			const rendered = [
				createRendered("policy", "constraint", "CRITICAL RULE", "policy"),
				createRendered("local", "semantic_match", "A".repeat(100), "local"),
			];

			const shrunk = shrinkToFit(rendered, 10, mockTokenCounter);

			// Policy should be unchanged (never shrink)
			const policyArtifact = shrunk.find((r) => r.id === "policy");
			expect(policyArtifact?.content).toBe("CRITICAL RULE");
		});

		it("returns all if within budget", () => {
			// Edge path: already fits
			const rendered = [createRendered("a", "semantic_match", "short")];

			const shrunk = shrinkToFit(rendered, 100, mockTokenCounter);
			expect(shrunk[0].content).toBe("short");
		});

		it("handles empty array", () => {
			// Empty path
			const shrunk = shrinkToFit([], 100, mockTokenCounter);
			expect(shrunk).toHaveLength(0);
		});
	});

	describe("needsShrinking", () => {
		it("returns true when over budget", () => {
			const rendered = [createRendered("a", "semantic_match", "A".repeat(100))];
			expect(needsShrinking(rendered, 10)).toBe(true);
		});

		it("returns false when under budget", () => {
			const rendered = [createRendered("a", "semantic_match", "short")];
			expect(needsShrinking(rendered, 100)).toBe(false);
		});
	});

	describe("getShrinkStats", () => {
		it("returns shrink statistics", () => {
			const rendered: RenderedArtifact[] = [
				{
					id: "a",
					kind: "semantic_match",
					lane: "local",
					content: "shrunk",
					exactTokenCount: 5,
					shrunk: true,
					originalTokenCount: 25,
					shrinkStrategy: "truncate_oldest",
				},
				{
					id: "b",
					kind: "constraint",
					lane: "policy",
					content: "not shrunk",
					exactTokenCount: 10,
					shrunk: false,
				},
			];

			const stats = getShrinkStats(rendered);

			expect(stats.shrunkCount).toBe(1);
			expect(stats.totalSaved).toBe(20);
			expect(stats.byStrategy.truncate_oldest).toBe(1);
		});
	});
});
