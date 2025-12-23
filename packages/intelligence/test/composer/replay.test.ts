/**
 * Replay Module Tests
 *
 * Tests decision logging and determinism verification.
 * Covers 4 paths: happy, error, edge, null/empty.
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_BUDGET_CONFIG } from "../../src/composer/budget.js";
import { createMockCandidate } from "../../src/composer/Composer.js";
import { COMPOSER_VERSION } from "../../src/composer/cache.js";
import { EMPTY_CONSTRAINTS } from "../../src/composer/constraints.js";
import {
	type ComposerDecisionLog,
	emitDecisionLog,
	formatDecisionLog,
	generateLogId,
	isValidDecisionLog,
	logsAreEquivalent,
	toMinimalLog,
	verifyDeterminism,
} from "../../src/composer/replay.js";
import type { ArtifactRef, Lane } from "../../src/composer/types.js";

/**
 * Helper to create test artifacts
 */
function createTestRef(id: string, lane: Lane): ArtifactRef {
	return {
		id,
		lane,
		kind: "semantic_match",
		tokenEstimate: 100,
	};
}

describe("Replay Module", () => {
	describe("generateLogId", () => {
		it("generates unique IDs", () => {
			// Happy path: IDs are unique
			const id1 = generateLogId();
			const id2 = generateLogId();
			const id3 = generateLogId();

			expect(id1).not.toBe(id2);
			expect(id2).not.toBe(id3);
			expect(id1).not.toBe(id3);
		});

		it("generates IDs with expected format", () => {
			const id = generateLogId();

			// Should be a string starting with log_
			expect(typeof id).toBe("string");
			expect(id.startsWith("log_")).toBe(true);
			expect(id.length).toBeGreaterThan(10);
		});
	});

	describe("emitDecisionLog", () => {
		it("creates complete decision log", () => {
			// Happy path: full log creation
			const candidates = [
				createMockCandidate({
					id: "a",
					lane: "local",
					kind: "local_diff",
					content: "Content A",
				}),
				createMockCandidate({
					id: "b",
					lane: "policy",
					kind: "constraint",
					content: "Content B",
				}),
			];

			const selected = [createTestRef("a", "local")];

			const log = emitDecisionLog({
				result: {
					selected,
					allocation: {
						policy: 0,
						rules: 0,
						local: 100,
						structure: 0,
						retrieved: 0,
						history: 0,
					},
					cacheKey: "cache-123",
					cacheHit: false,
					actualTokens: 100,
				},
				trigger: {
					event: "file_saved",
					workspaceFingerprint: "test-ws",
					commitish: "abc123",
				},
				constraints: EMPTY_CONSTRAINTS,
				candidates,
				budgetConfig: DEFAULT_BUDGET_CONFIG as unknown as Record<string, unknown>,
				rankings: [
					{ artifact: createTestRef("a", "local"), score: 0.8, selected: true },
					{
						artifact: createTestRef("b", "policy"),
						score: 0.6,
						selected: false,
						rejectionReason: "budget_exceeded",
					},
				],
				startTime: Date.now() - 100,
			});

			expect(log.id).toBeDefined();
			expect(log.timestamp).toBeDefined();
			expect(log.composerVersion).toBe(COMPOSER_VERSION);
			expect(log.selectedArtifacts.length).toBe(1);
			expect(log.candidateCount).toBe(2);
		});

		it("includes rejection information in rankings", () => {
			const candidates = [
				createMockCandidate({
					id: "a",
					lane: "local",
					kind: "local_diff",
					content: "Content",
				}),
			];

			const log = emitDecisionLog({
				result: {
					selected: [],
					allocation: {
						policy: 0,
						rules: 0,
						local: 0,
						structure: 0,
						retrieved: 0,
						history: 0,
					},
					cacheKey: "cache-123",
					cacheHit: false,
					actualTokens: 0,
				},
				trigger: {
					event: "file_saved",
					workspaceFingerprint: "test-ws",
				},
				constraints: EMPTY_CONSTRAINTS,
				candidates,
				budgetConfig: DEFAULT_BUDGET_CONFIG as unknown as Record<string, unknown>,
				rankings: [
					{
						artifact: createTestRef("a", "local"),
						score: 0.5,
						selected: false,
						rejectionReason: "excluded_by_policy",
					},
				],
				startTime: Date.now() - 50,
			});

			expect(log.rankings.length).toBe(1);
			expect(log.rankings[0].rejectionReason).toBe("excluded_by_policy");
		});

		it("computes candidate digest for replay", () => {
			const candidates = [
				createMockCandidate({
					id: "a",
					lane: "local",
					kind: "local_diff",
					content: "Content",
				}),
			];

			const log = emitDecisionLog({
				result: {
					selected: [],
					allocation: {
						policy: 0,
						rules: 0,
						local: 0,
						structure: 0,
						retrieved: 0,
						history: 0,
					},
					cacheKey: "cache-123",
					cacheHit: false,
					actualTokens: 0,
				},
				trigger: {
					event: "file_saved",
					workspaceFingerprint: "test-ws",
				},
				constraints: EMPTY_CONSTRAINTS,
				candidates,
				budgetConfig: DEFAULT_BUDGET_CONFIG as unknown as Record<string, unknown>,
				rankings: [],
				startTime: Date.now(),
			});

			expect(log.candidateDigest).toBeDefined();
			expect(typeof log.candidateDigest).toBe("string");
			expect(log.candidateDigest.length).toBeGreaterThan(0);
		});

		it("includes timing information", () => {
			const startTime = Date.now() - 100;

			const log = emitDecisionLog({
				result: {
					selected: [],
					allocation: {
						policy: 0,
						rules: 0,
						local: 0,
						structure: 0,
						retrieved: 0,
						history: 0,
					},
					cacheKey: "cache-123",
					cacheHit: false,
					actualTokens: 0,
				},
				trigger: {
					event: "file_saved",
					workspaceFingerprint: "test-ws",
				},
				constraints: EMPTY_CONSTRAINTS,
				candidates: [],
				budgetConfig: DEFAULT_BUDGET_CONFIG as unknown as Record<string, unknown>,
				rankings: [],
				startTime,
			});

			expect(log.durationMs).toBeGreaterThanOrEqual(100);
		});
	});

	describe("verifyDeterminism", () => {
		it("returns passed for identical results", () => {
			// Happy path: determinism verified
			const log: ComposerDecisionLog = {
				id: "log-1",
				timestamp: Date.now(),
				composerVersion: COMPOSER_VERSION,
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 2,
				candidateDigest: "digest-123",
				constraintsDigest: "constraints-456",
				budgetConfigDigest: "budget-789",
				selectedArtifacts: [createTestRef("a", "local")],
				budgetAllocation: {
					policy: 0,
					rules: 0,
					local: 100,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 100,
				rankings: [],
				cacheKey: "cache-123",
				cacheHit: false,
				durationMs: 50,
			};

			const replay = {
				selected: [createTestRef("a", "local")],
				allocation: {
					policy: 0,
					rules: 0,
					local: 100,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 100,
				cacheKey: "cache-123",
			};

			const result = verifyDeterminism(log, replay);

			expect(result.passed).toBe(true);
			expect(result.differences).toHaveLength(0);
		});

		it("returns failed for different selections", () => {
			// Error path: non-determinism detected
			const log: ComposerDecisionLog = {
				id: "log-1",
				timestamp: Date.now(),
				composerVersion: COMPOSER_VERSION,
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 2,
				candidateDigest: "digest-123",
				constraintsDigest: "constraints-456",
				budgetConfigDigest: "budget-789",
				selectedArtifacts: [createTestRef("a", "local"), createTestRef("b", "policy")],
				budgetAllocation: {
					policy: 50,
					rules: 0,
					local: 50,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 100,
				rankings: [],
				cacheKey: "cache-123",
				cacheHit: false,
				durationMs: 50,
			};

			const replay = {
				selected: [createTestRef("a", "local"), createTestRef("c", "retrieved")], // Different!
				allocation: {
					policy: 0,
					rules: 0,
					local: 50,
					structure: 0,
					retrieved: 50,
					history: 0,
				},
				totalTokensUsed: 100,
				cacheKey: "cache-123",
			};

			const result = verifyDeterminism(log, replay);

			expect(result.passed).toBe(false);
			expect(result.differences.length).toBeGreaterThan(0);
		});

		it("detects token mismatch", () => {
			const log: ComposerDecisionLog = {
				id: "log-1",
				timestamp: Date.now(),
				composerVersion: COMPOSER_VERSION,
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 1,
				candidateDigest: "digest",
				constraintsDigest: "constraints",
				budgetConfigDigest: "budget",
				selectedArtifacts: [createTestRef("a", "local")],
				budgetAllocation: {
					policy: 0,
					rules: 0,
					local: 100,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 100,
				rankings: [],
				cacheKey: "cache-123",
				cacheHit: false,
				durationMs: 50,
			};

			const replay = {
				selected: [createTestRef("a", "local")],
				allocation: {
					policy: 0,
					rules: 0,
					local: 100,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 150, // Different!
				cacheKey: "cache-123",
			};

			const result = verifyDeterminism(log, replay);

			expect(result.passed).toBe(false);
			expect(result.differences.some((d) => d.includes("Token"))).toBe(true);
		});

		it("handles empty selections", () => {
			// Edge path: no artifacts selected
			const log: ComposerDecisionLog = {
				id: "log-1",
				timestamp: Date.now(),
				composerVersion: COMPOSER_VERSION,
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 0,
				candidateDigest: "empty",
				constraintsDigest: "constraints",
				budgetConfigDigest: "budget",
				selectedArtifacts: [],
				budgetAllocation: {
					policy: 0,
					rules: 0,
					local: 0,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 0,
				rankings: [],
				cacheKey: "cache-123",
				cacheHit: false,
				durationMs: 10,
			};

			const replay = {
				selected: [],
				allocation: {
					policy: 0,
					rules: 0,
					local: 0,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 0,
				cacheKey: "cache-123",
			};

			const result = verifyDeterminism(log, replay);

			expect(result.passed).toBe(true);
		});

		it("detects order differences", () => {
			// Order matters for determinism
			const log: ComposerDecisionLog = {
				id: "log-1",
				timestamp: Date.now(),
				composerVersion: COMPOSER_VERSION,
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 3,
				candidateDigest: "digest",
				constraintsDigest: "constraints",
				budgetConfigDigest: "budget",
				selectedArtifacts: [
					createTestRef("a", "local"),
					createTestRef("b", "local"),
					createTestRef("c", "local"),
				],
				budgetAllocation: {
					policy: 0,
					rules: 0,
					local: 300,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 300,
				rankings: [],
				cacheKey: "cache-123",
				cacheHit: false,
				durationMs: 50,
			};

			const replay = {
				selected: [createTestRef("c", "local"), createTestRef("b", "local"), createTestRef("a", "local")], // Same items, different order
				allocation: {
					policy: 0,
					rules: 0,
					local: 300,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 300,
				cacheKey: "cache-123",
			};

			const result = verifyDeterminism(log, replay);

			expect(result.passed).toBe(false);
			expect(result.differences.some((d) => d.includes("Order"))).toBe(true);
		});
	});

	describe("formatDecisionLog", () => {
		it("formats log for display", () => {
			const log: ComposerDecisionLog = {
				id: "log-123",
				timestamp: Date.now(),
				composerVersion: "1.0.0",
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 5,
				candidateDigest: "digest",
				constraintsDigest: "constraints",
				budgetConfigDigest: "budget",
				selectedArtifacts: [createTestRef("a", "local")],
				budgetAllocation: {
					policy: 0,
					rules: 0,
					local: 100,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 100,
				rankings: [{ artifact: createTestRef("a", "local"), score: 0.8, selected: true }],
				cacheKey: "cache-123",
				cacheHit: false,
				durationMs: 50,
			};

			const formatted = formatDecisionLog(log);

			expect(formatted).toContain("log-123");
			expect(formatted).toContain("file_saved");
			expect(formatted).toContain("100");
		});
	});

	describe("toMinimalLog", () => {
		it("removes rankings from log", () => {
			const log: ComposerDecisionLog = {
				id: "log-123",
				timestamp: Date.now(),
				composerVersion: "1.0.0",
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 5,
				candidateDigest: "digest",
				constraintsDigest: "constraints",
				budgetConfigDigest: "budget",
				selectedArtifacts: [],
				budgetAllocation: {
					policy: 0,
					rules: 0,
					local: 0,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 0,
				rankings: [{ artifact: createTestRef("a", "local"), score: 0.8, selected: true }],
				cacheKey: "cache-123",
				cacheHit: false,
				durationMs: 50,
			};

			const minimal = toMinimalLog(log);

			expect((minimal as ComposerDecisionLog).rankings).toBeUndefined();
			expect(minimal.id).toBe("log-123");
		});
	});

	describe("isValidDecisionLog", () => {
		it("returns true for valid log", () => {
			const log: ComposerDecisionLog = {
				id: "log-123",
				timestamp: Date.now(),
				composerVersion: "1.0.0",
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 5,
				candidateDigest: "digest",
				constraintsDigest: "constraints",
				budgetConfigDigest: "budget",
				selectedArtifacts: [],
				budgetAllocation: {
					policy: 0,
					rules: 0,
					local: 0,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 0,
				rankings: [],
				cacheKey: "cache-123",
				cacheHit: false,
				durationMs: 50,
			};

			expect(isValidDecisionLog(log)).toBe(true);
		});

		it("returns false for invalid log", () => {
			expect(isValidDecisionLog(null)).toBe(false);
			expect(isValidDecisionLog({})).toBe(false);
			expect(isValidDecisionLog({ id: "test" })).toBe(false);
		});
	});

	describe("logsAreEquivalent", () => {
		it("returns true for equivalent logs", () => {
			const log1: ComposerDecisionLog = {
				id: "log-1",
				timestamp: Date.now(),
				composerVersion: "1.0.0",
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 1,
				candidateDigest: "digest",
				constraintsDigest: "constraints",
				budgetConfigDigest: "budget",
				selectedArtifacts: [createTestRef("a", "local")],
				budgetAllocation: {
					policy: 0,
					rules: 0,
					local: 100,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 100,
				rankings: [],
				cacheKey: "cache-1",
				cacheHit: false,
				durationMs: 50,
			};

			const log2: ComposerDecisionLog = {
				...log1,
				id: "log-2", // Different ID
				timestamp: Date.now() + 1000, // Different time
				cacheKey: "cache-2", // Different cache key
				durationMs: 100, // Different duration
			};

			expect(logsAreEquivalent(log1, log2)).toBe(true);
		});

		it("returns false for non-equivalent logs", () => {
			const log1: ComposerDecisionLog = {
				id: "log-1",
				timestamp: Date.now(),
				composerVersion: "1.0.0",
				workspaceFingerprint: "test-ws",
				triggerEvent: "file_saved",
				commitish: "abc123",
				candidateCount: 1,
				candidateDigest: "digest",
				constraintsDigest: "constraints",
				budgetConfigDigest: "budget",
				selectedArtifacts: [createTestRef("a", "local")],
				budgetAllocation: {
					policy: 0,
					rules: 0,
					local: 100,
					structure: 0,
					retrieved: 0,
					history: 0,
				},
				totalTokensUsed: 100,
				rankings: [],
				cacheKey: "cache-1",
				cacheHit: false,
				durationMs: 50,
			};

			const log2: ComposerDecisionLog = {
				...log1,
				selectedArtifacts: [createTestRef("b", "policy")], // Different selection
			};

			expect(logsAreEquivalent(log1, log2)).toBe(false);
		});
	});
});
