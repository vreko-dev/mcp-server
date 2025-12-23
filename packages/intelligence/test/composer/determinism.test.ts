/**
 * Determinism Guardrails Tests
 *
 * Tests quantization, bucketing, and tie-breaking for deterministic selection.
 * Covers 4 paths: happy, error, edge, null/empty.
 */

import { describe, expect, it } from "vitest";
import {
	bucketRecency,
	deterministicArrayHash,
	getRecencyLabel,
	MAX_RECENCY_BUCKET,
	normalizeTimestamp,
	quantizeRelevance,
	quantizeToDecimals,
	RECENCY_BUCKETS,
	RELEVANCE_PRECISION,
	scoresEqual,
	tieBreaker,
} from "../../src/composer/determinism.js";
import type { ArtifactCandidate, ArtifactKind, Lane } from "../../src/composer/types.js";

/**
 * Helper to create test candidates
 */
function createCandidate(id: string, lane: Lane, kind: ArtifactKind = "semantic_match"): ArtifactCandidate {
	return {
		id,
		lane,
		kind,
		tokenEstimate: 100,
		recencyBucket: 3,
		relevanceScore: 0.5,
		specificityScore: 0.5,
		riskAlignment: 0.5,
		getContent: () => `Content for ${id}`,
		shrink: (targetTokens: number) => ({
			id,
			lane,
			kind,
			content: `Shrunk content for ${id}`,
			exactTokenCount: targetTokens,
			shrunk: true,
		}),
	};
}

describe("Determinism Guardrails", () => {
	describe("quantizeRelevance", () => {
		describe("happy path", () => {
			it("should quantize scores to 3 decimal places", () => {
				expect(quantizeRelevance(0.123456789)).toBe(0.123);
				expect(quantizeRelevance(0.987654321)).toBe(0.988);
			});

			it("should handle exact precision values", () => {
				expect(quantizeRelevance(0.5)).toBe(0.5);
				expect(quantizeRelevance(0.125)).toBe(0.125);
			});

			it("should produce identical output for identical inputs", () => {
				const score = 0.7777777;
				const result1 = quantizeRelevance(score);
				const result2 = quantizeRelevance(score);
				const result3 = quantizeRelevance(score);
				expect(result1).toBe(result2);
				expect(result2).toBe(result3);
			});
		});

		describe("edge cases", () => {
			it("should clamp to 0 for negative values", () => {
				expect(quantizeRelevance(-0.5)).toBe(0);
				expect(quantizeRelevance(-100)).toBe(0);
			});

			it("should clamp to 1 for values above 1", () => {
				expect(quantizeRelevance(1.5)).toBe(1);
				expect(quantizeRelevance(100)).toBe(1);
			});

			it("should handle exact boundary values", () => {
				expect(quantizeRelevance(0)).toBe(0);
				expect(quantizeRelevance(1)).toBe(1);
			});

			it("should handle very small values", () => {
				expect(quantizeRelevance(0.0001)).toBe(0);
				expect(quantizeRelevance(0.0005)).toBe(0.001);
			});
		});

		describe("error handling", () => {
			it("should handle NaN", () => {
				expect(quantizeRelevance(Number.NaN)).toBe(0);
			});

			it("should handle Infinity", () => {
				expect(quantizeRelevance(Number.POSITIVE_INFINITY)).toBe(0);
				expect(quantizeRelevance(Number.NEGATIVE_INFINITY)).toBe(0);
			});
		});
	});

	describe("bucketRecency", () => {
		describe("happy path", () => {
			it("should bucket current changes (< 1 min) to bucket 5", () => {
				expect(bucketRecency(30 * 1000)).toBe(5); // 30 seconds
				expect(bucketRecency(59 * 1000)).toBe(5); // 59 seconds
			});

			it("should bucket recent changes (1-5 min) to bucket 4", () => {
				expect(bucketRecency(60 * 1000)).toBe(4); // 1 minute
				expect(bucketRecency(4 * 60 * 1000)).toBe(4); // 4 minutes
			});

			it("should bucket warm changes (5-30 min) to bucket 3", () => {
				expect(bucketRecency(5 * 60 * 1000)).toBe(3); // 5 minutes
				expect(bucketRecency(29 * 60 * 1000)).toBe(3); // 29 minutes
			});

			it("should bucket cold changes (30min-2hr) to bucket 2", () => {
				expect(bucketRecency(30 * 60 * 1000)).toBe(2); // 30 minutes
				expect(bucketRecency(119 * 60 * 1000)).toBe(2); // 119 minutes
			});

			it("should bucket stale changes (2hr-24hr) to bucket 1", () => {
				expect(bucketRecency(2 * 60 * 60 * 1000)).toBe(1); // 2 hours
				expect(bucketRecency(23 * 60 * 60 * 1000)).toBe(1); // 23 hours
			});

			it("should bucket old changes (> 24hr) to bucket 0", () => {
				expect(bucketRecency(24 * 60 * 60 * 1000)).toBe(0); // 24 hours
				expect(bucketRecency(48 * 60 * 60 * 1000)).toBe(0); // 48 hours
			});
		});

		describe("edge cases", () => {
			it("should handle exact bucket boundaries", () => {
				expect(bucketRecency(0)).toBe(5); // Exact 0 = most recent
				expect(bucketRecency(60 * 1000)).toBe(4); // Exact 1 min
				expect(bucketRecency(5 * 60 * 1000)).toBe(3); // Exact 5 min
			});
		});

		describe("error handling", () => {
			it("should handle negative age gracefully", () => {
				// Negative age treated as most recent
				expect(bucketRecency(-1000)).toBe(5);
			});

			it("should handle NaN", () => {
				expect(bucketRecency(Number.NaN)).toBe(5);
			});

			it("should handle Infinity", () => {
				// Infinite age should be treated as most recent due to isFinite check
				expect(bucketRecency(Number.POSITIVE_INFINITY)).toBe(5);
			});
		});
	});

	describe("getRecencyLabel", () => {
		it("should return correct labels for all buckets", () => {
			expect(getRecencyLabel(5)).toBe("current");
			expect(getRecencyLabel(4)).toBe("recent");
			expect(getRecencyLabel(3)).toBe("warm");
			expect(getRecencyLabel(2)).toBe("cold");
			expect(getRecencyLabel(1)).toBe("stale");
			expect(getRecencyLabel(0)).toBe("old");
		});

		it("should return unknown for invalid buckets", () => {
			expect(getRecencyLabel(-1)).toBe("unknown");
			expect(getRecencyLabel(10)).toBe("unknown");
		});
	});

	describe("tieBreaker", () => {
		describe("happy path", () => {
			it("should prioritize by lane (policy > rules > local)", () => {
				const policyCandidate = createCandidate("a", "policy", "constraint");
				const rulesCandidate = createCandidate("b", "rules", "rule_doc");
				const localCandidate = createCandidate("c", "local", "local_diff");

				expect(tieBreaker(policyCandidate, rulesCandidate)).toBeLessThan(0);
				expect(tieBreaker(rulesCandidate, localCandidate)).toBeLessThan(0);
				expect(tieBreaker(policyCandidate, localCandidate)).toBeLessThan(0);
			});

			it("should prioritize by kind when lanes are equal", () => {
				const constraintCandidate = createCandidate("a", "policy", "constraint");
				const ruleDocCandidate = createCandidate("b", "policy", "rule_doc");

				expect(tieBreaker(constraintCandidate, ruleDocCandidate)).toBeLessThan(0);
			});

			it("should use lexicographic ID when lane and kind are equal", () => {
				const candidateA = createCandidate("aaa", "local", "local_diff");
				const candidateB = createCandidate("bbb", "local", "local_diff");
				const candidateZ = createCandidate("zzz", "local", "local_diff");

				expect(tieBreaker(candidateA, candidateB)).toBeLessThan(0);
				expect(tieBreaker(candidateA, candidateZ)).toBeLessThan(0);
				expect(tieBreaker(candidateB, candidateZ)).toBeLessThan(0);
			});
		});

		describe("edge cases", () => {
			it("should return 0 for identical candidates", () => {
				const candidate1 = createCandidate("same", "local", "local_diff");
				const candidate2 = createCandidate("same", "local", "local_diff");

				expect(tieBreaker(candidate1, candidate2)).toBe(0);
			});
		});
	});

	describe("scoresEqual", () => {
		it("should return true for scores that quantize to the same value", () => {
			// 0.1234 -> 0.123, 0.1235 -> 0.124 (rounds), so we need values that round the same
			expect(scoresEqual(0.1234, 0.1234)).toBe(true);
			expect(scoresEqual(0.5, 0.5)).toBe(true);
			expect(scoresEqual(0.1231, 0.1232)).toBe(true); // Both round to 0.123
		});

		it("should return false for scores that quantize differently", () => {
			expect(scoresEqual(0.123, 0.125)).toBe(false);
			expect(scoresEqual(0.1, 0.2)).toBe(false);
		});
	});

	describe("normalizeTimestamp", () => {
		it("should normalize to minute boundaries by default", () => {
			const timestamp = 1700000023456; // Some time in ms
			const normalized = normalizeTimestamp(timestamp);
			// Should be rounded down to minute boundary
			expect(normalized % 60000).toBe(0);
		});

		it("should normalize to custom bucket size", () => {
			const timestamp = 1700000023456;
			const normalized = normalizeTimestamp(timestamp, 3600000); // 1 hour
			expect(normalized % 3600000).toBe(0);
		});
	});

	describe("deterministicArrayHash", () => {
		it("should produce same hash regardless of input order", () => {
			const hash1 = deterministicArrayHash(["a", "b", "c"]);
			const hash2 = deterministicArrayHash(["c", "a", "b"]);
			const hash3 = deterministicArrayHash(["b", "c", "a"]);

			expect(hash1).toBe(hash2);
			expect(hash2).toBe(hash3);
		});

		it("should produce different hashes for different content", () => {
			const hash1 = deterministicArrayHash(["a", "b"]);
			const hash2 = deterministicArrayHash(["a", "c"]);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe("quantizeToDecimals", () => {
		it("should quantize to specified decimal places", () => {
			expect(quantizeToDecimals(0.12345, 2)).toBe(0.12);
			expect(quantizeToDecimals(0.12345, 3)).toBe(0.123);
			expect(quantizeToDecimals(0.12345, 4)).toBe(0.1235); // rounds up
		});
	});

	describe("constants", () => {
		it("should have correct RELEVANCE_PRECISION", () => {
			expect(RELEVANCE_PRECISION).toBe(0.001);
		});

		it("should have correct RECENCY_BUCKETS", () => {
			expect(RECENCY_BUCKETS).toEqual([0, 60, 300, 1800, 7200, 86400]);
		});

		it("should have correct MAX_RECENCY_BUCKET", () => {
			expect(MAX_RECENCY_BUCKET).toBe(6);
		});
	});
});
