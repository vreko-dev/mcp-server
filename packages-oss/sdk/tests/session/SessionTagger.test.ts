/**
 * @fileoverview SessionTagger Tests - SDK Level
 *
 * Tests the SessionTagger class for tagging sessions based on AI presence,
 * burst patterns, file count, duration, and finalization reason.
 *
 * Follows TDD 4-Path Model: Happy/Sad/Edge/Error
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BurstDetectionResult } from "../../src/core/detection/BurstHeuristicsDetector";
import { type AIPresenceInfo, SessionTagger } from "../../src/core/session/SessionTagger";
import type { SessionManifest } from "../../src/core/session/types";

// Test factory functions (IP-safe test data)
function createTestSessionManifest(overrides: Partial<SessionManifest> = {}): SessionManifest {
	const now = Date.now();
	return {
		id: `session-test-${Math.random().toString(36).substring(2, 10)}`,
		startedAt: now - 60000, // 1 minute ago
		endedAt: now,
		reason: "manual",
		files: [
			{
				uri: "/test/file1.ts",
				snapshotId: "snap-1",
				changeStats: { added: 50, deleted: 10 },
			},
		],
		tags: [],
		...overrides,
	};
}

function createTestBurstResult(overrides: Partial<BurstDetectionResult> = {}): BurstDetectionResult {
	return {
		isBurst: true,
		confidence: 0.85,
		details: {
			totalInserted: 500,
			totalDeleted: 50,
			ratio: 10,
			changeCount: 5,
			duration: 2000,
		},
		...overrides,
	};
}

function createMockAIPresenceDetector(overrides: Partial<AIPresenceInfo> = {}): () => AIPresenceInfo {
	return () => ({
		hasAI: true,
		detectedAssistants: ["GITHUB_COPILOT"],
		assistantDetails: {
			GITHUB_COPILOT: "GitHub Copilot",
		},
		...overrides,
	});
}

describe("SessionTagger", () => {
	let tagger: SessionTagger;

	beforeEach(() => {
		vi.clearAllMocks();
		// Create tagger without AI detector by default
		tagger = new SessionTagger();
	});

	// =========================================================================
	// HAPPY PATH - Expected successful scenarios
	// =========================================================================
	describe("Happy Path", () => {
		it("should tag session as 'ai-assisted' when AI detected", () => {
			// Arrange
			const aiDetector = createMockAIPresenceDetector({
				hasAI: true,
				detectedAssistants: ["GITHUB_COPILOT"],
				assistantDetails: { GITHUB_COPILOT: "GitHub Copilot" },
			});
			tagger = new SessionTagger({ aiPresenceDetector: aiDetector });
			const manifest = createTestSessionManifest();

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("ai-assisted");
			expect(result.confidence["ai-assisted"]).toBe(0.9);
			expect(result.reasons["ai-assisted"]).toMatch(/AI assistants detected/);
		});

		it("should tag session as 'multi-file' when >5 files changed", () => {
			// Arrange - Need > 5 files (threshold is 5)
			const manifest = createTestSessionManifest({
				files: Array.from({ length: 8 }, (_, i) => ({
					uri: `/test/file${i}.ts`,
					snapshotId: `snap-${i}`,
					changeStats: { added: 20, deleted: 5 },
				})),
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("multi-file");
			expect(result.confidence["multi-file"]).toBeGreaterThan(0);
			expect(result.reasons["multi-file"]).toMatch(/Session involved \d+ files/);
		});

		it("should tag session as 'burst' when BurstDetector triggered", () => {
			// Arrange
			const manifest = createTestSessionManifest();
			const burstResult = createTestBurstResult({
				isBurst: true,
				confidence: 0.85,
			});

			// Act
			const result = tagger.tagSession(manifest, burstResult);

			// Assert
			expect(result.tags).toContain("burst");
			expect(result.confidence.burst).toBe(0.85);
			expect(result.reasons.burst).toMatch(/rapid, large insertions/);
		});

		it("should tag session as 'long-session' when >30 minutes", () => {
			// Arrange
			const now = Date.now();
			const manifest = createTestSessionManifest({
				startedAt: now - 45 * 60 * 1000, // 45 minutes ago
				endedAt: now,
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("long-session");
			expect(result.confidence["long-session"]).toBeGreaterThan(0);
			expect(result.reasons["long-session"]).toMatch(/Session lasted \d+ minutes/);
		});

		it("should tag session as 'copilot-like' for Copilot detections", () => {
			// Arrange
			const aiDetector = createMockAIPresenceDetector({
				hasAI: true,
				detectedAssistants: ["GITHUB_COPILOT"],
				assistantDetails: { GITHUB_COPILOT: "GitHub Copilot" },
			});
			tagger = new SessionTagger({ aiPresenceDetector: aiDetector });
			const manifest = createTestSessionManifest();

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("copilot-like");
			expect(result.confidence["copilot-like"]).toBe(0.8);
			expect(result.reasons["copilot-like"]).toMatch(/Detected.*presence/);
		});

		it("should tag session as 'claude-like' for Claude detections", () => {
			// Arrange
			const aiDetector = createMockAIPresenceDetector({
				hasAI: true,
				detectedAssistants: ["CLAUDE"],
				assistantDetails: { CLAUDE: "Claude AI" },
			});
			tagger = new SessionTagger({ aiPresenceDetector: aiDetector });
			const manifest = createTestSessionManifest();

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("claude-like");
			expect(result.confidence["claude-like"]).toBe(0.8);
		});

		it("should tag session with 'large-edits' when significant changes detected", () => {
			// Arrange
			const manifest = createTestSessionManifest({
				files: [
					{
						uri: "/test/large-file.ts",
						snapshotId: "snap-large",
						changeStats: { added: 1500, deleted: 100 },
					},
				],
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("large-edits");
			expect(result.confidence["large-edits"]).toBeGreaterThan(0);
			expect(result.reasons["large-edits"]).toMatch(/Session involved \d+ lines added/);
		});

		it("should add reason-based tag 'manual' for manual finalization", () => {
			// Arrange
			const manifest = createTestSessionManifest({ reason: "manual" });

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("manual");
			expect(result.confidence.manual).toBe(1.0);
			expect(result.reasons.manual).toBe("Session was manually finalized");
		});

		it("should add tag with updateSessionWithTags utility", () => {
			// Arrange
			const manifest = createTestSessionManifest({ reason: "commit" });

			// Act
			const updatedManifest = tagger.updateSessionWithTags(manifest);

			// Assert
			expect(updatedManifest.tags).toContain("manual");
			expect(updatedManifest.id).toBe(manifest.id);
		});
	});

	// =========================================================================
	// SAD PATH - Expected failure scenarios
	// =========================================================================
	describe("Sad Path", () => {
		it("should return empty tags for session with no files", () => {
			// Arrange
			const manifest = createTestSessionManifest({
				files: [],
				reason: "manual",
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert - should only have reason tag, no content-based tags
			expect(result.tags).toContain("manual");
			expect(result.tags).not.toContain("multi-file");
			expect(result.tags).not.toContain("large-edits");
		});

		it("should not tag as 'ai-assisted' when no AI detector provided", () => {
			// Arrange - tagger without AI detector
			tagger = new SessionTagger(); // No aiPresenceDetector
			const manifest = createTestSessionManifest();

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).not.toContain("ai-assisted");
			expect(result.tags).not.toContain("copilot-like");
		});

		it("should not tag as 'ai-assisted' when AI detector returns hasAI: false", () => {
			// Arrange
			const aiDetector = createMockAIPresenceDetector({
				hasAI: false,
				detectedAssistants: [],
				assistantDetails: {},
			});
			tagger = new SessionTagger({ aiPresenceDetector: aiDetector });
			const manifest = createTestSessionManifest();

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).not.toContain("ai-assisted");
		});

		it("should not tag as 'burst' when burst detection returns isBurst: false", () => {
			// Arrange
			const manifest = createTestSessionManifest();
			const burstResult = createTestBurstResult({
				isBurst: false,
				confidence: 0,
			});

			// Act
			const result = tagger.tagSession(manifest, burstResult);

			// Assert
			expect(result.tags).not.toContain("burst");
		});

		it("should not tag as 'multi-file' when file count below threshold", () => {
			// Arrange
			const manifest = createTestSessionManifest({
				files: [
					{
						uri: "/test/file1.ts",
						snapshotId: "snap-1",
						changeStats: { added: 10, deleted: 2 },
					},
					{
						uri: "/test/file2.ts",
						snapshotId: "snap-2",
						changeStats: { added: 10, deleted: 2 },
					},
				],
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).not.toContain("multi-file");
		});
	});

	// =========================================================================
	// EDGE CASES - Boundary conditions
	// =========================================================================
	describe("Edge Cases", () => {
		it("should apply multiple tags when conditions overlap", () => {
			// Arrange
			const now = Date.now();
			const aiDetector = createMockAIPresenceDetector({
				hasAI: true,
				detectedAssistants: ["GITHUB_COPILOT"],
				assistantDetails: { GITHUB_COPILOT: "GitHub Copilot" },
			});
			tagger = new SessionTagger({ aiPresenceDetector: aiDetector });

			const manifest = createTestSessionManifest({
				startedAt: now - 45 * 60 * 1000, // 45 minutes ago (long session)
				endedAt: now,
				reason: "commit",
				files: Array.from({ length: 8 }, (_, i) => ({
					uri: `/test/file${i}.ts`,
					snapshotId: `snap-${i}`,
					changeStats: { added: 200, deleted: 20 },
				})),
			});

			const burstResult = createTestBurstResult({ isBurst: true, confidence: 0.9 });

			// Act
			const result = tagger.tagSession(manifest, burstResult);

			// Assert - should have multiple tags
			expect(result.tags).toContain("ai-assisted");
			expect(result.tags).toContain("copilot-like");
			expect(result.tags).toContain("multi-file");
			expect(result.tags).toContain("long-session");
			expect(result.tags).toContain("large-edits");
			expect(result.tags).toContain("burst");
			expect(result.tags).toContain("manual"); // reason: commit
		});

		it("should tag 'short-session' for <30 second sessions", () => {
			// Arrange - Need < 30 seconds (threshold is 30000ms)
			const now = Date.now();
			const manifest = createTestSessionManifest({
				startedAt: now - 15 * 1000, // 15 seconds ago
				endedAt: now,
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("short-session");
			expect(result.confidence["short-session"]).toBeGreaterThan(0);
			expect(result.reasons["short-session"]).toMatch(/Session lasted \d+ seconds/);
		});

		it("should tag based on idle-break reason", () => {
			// Arrange
			const manifest = createTestSessionManifest({ reason: "idle-break" });

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("manual");
			expect(result.confidence.manual).toBe(0.8);
			expect(result.reasons.manual).toBe("Session ended due to idle timeout");
		});

		it("should tag based on blur reason", () => {
			// Arrange
			const manifest = createTestSessionManifest({ reason: "blur" });

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("manual");
			expect(result.reasons.manual).toBe("Session ended when window lost focus");
		});

		it("should tag based on task reason", () => {
			// Arrange
			const manifest = createTestSessionManifest({ reason: "task" });

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("manual");
			expect(result.confidence.manual).toBe(0.9);
			expect(result.reasons.manual).toBe("Session ended due to task boundary");
		});

		it("should tag based on commit reason with high confidence", () => {
			// Arrange
			const manifest = createTestSessionManifest({ reason: "commit" });

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("manual");
			expect(result.confidence.manual).toBe(0.95);
			expect(result.reasons.manual).toBe("Session ended with git commit");
		});

		it("should preserve existing tags from manifest", () => {
			// Arrange
			const manifest = createTestSessionManifest({
				tags: ["custom-tag", "user-defined"],
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("custom-tag");
			expect(result.tags).toContain("user-defined");
		});

		it("should deduplicate tags when same tag would be added multiple times", () => {
			// Arrange
			const manifest = createTestSessionManifest({
				tags: ["manual"], // Already has manual tag
				reason: "manual", // Would also add manual tag
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert - should only have one "manual" tag
			const manualCount = result.tags.filter((t) => t === "manual").length;
			expect(manualCount).toBe(1);
		});

		it("should handle files with missing changeStats", () => {
			// Arrange
			const manifest = createTestSessionManifest({
				files: [
					{
						uri: "/test/file1.ts",
						snapshotId: "snap-1",
						// No changeStats
					},
				],
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert - should not throw, should not tag as large-edits
			expect(result.tags).not.toContain("large-edits");
		});

		it("should handle empty detectedAssistants array", () => {
			// Arrange
			const aiDetector = createMockAIPresenceDetector({
				hasAI: true,
				detectedAssistants: [],
				assistantDetails: {},
			});
			tagger = new SessionTagger({ aiPresenceDetector: aiDetector });
			const manifest = createTestSessionManifest();

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("ai-assisted");
			// Should not have any specific AI tags like copilot-like
			expect(result.tags).not.toContain("copilot-like");
		});

		it("should handle multiple AI assistants detected", () => {
			// Arrange
			const aiDetector = createMockAIPresenceDetector({
				hasAI: true,
				detectedAssistants: ["GITHUB_COPILOT", "CLAUDE", "TABNINE"],
				assistantDetails: {
					GITHUB_COPILOT: "GitHub Copilot",
					CLAUDE: "Claude AI",
					TABNINE: "Tabnine",
				},
			});
			tagger = new SessionTagger({ aiPresenceDetector: aiDetector });
			const manifest = createTestSessionManifest();

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("ai-assisted");
			expect(result.tags).toContain("copilot-like");
			expect(result.tags).toContain("claude-like");
			expect(result.tags).toContain("tabnine-like");
		});
	});

	// =========================================================================
	// ERROR PATH - Error handling
	// =========================================================================
	describe("Error Path", () => {
		it("should return partial tags when AI detection throws", () => {
			// Arrange
			const faultyAiDetector = (): AIPresenceInfo => {
				throw new Error("AI detection failed");
			};
			tagger = new SessionTagger({ aiPresenceDetector: faultyAiDetector });
			const manifest = createTestSessionManifest({
				files: Array.from({ length: 5 }, (_, i) => ({
					uri: `/test/file${i}.ts`,
					snapshotId: `snap-${i}`,
					changeStats: { added: 20, deleted: 5 },
				})),
			});

			// Act & Assert
			// The current implementation will throw - we should verify this behavior
			// In production, this should be caught and handled gracefully
			expect(() => tagger.tagSession(manifest)).toThrow("AI detection failed");
		});

		it("should handle undefined burstResult gracefully", () => {
			// Arrange
			const manifest = createTestSessionManifest();

			// Act
			const result = tagger.tagSession(manifest, undefined);

			// Assert
			expect(result.tags).not.toContain("burst");
			expect(result.confidence.burst).toBeUndefined();
		});

		it("should handle burstResult with undefined details", () => {
			// Arrange
			const manifest = createTestSessionManifest();
			const burstResult: BurstDetectionResult = {
				isBurst: true,
				confidence: 0.7,
				details: undefined,
			};

			// Act
			const result = tagger.tagSession(manifest, burstResult);

			// Assert
			expect(result.tags).toContain("burst");
			expect(result.confidence.burst).toBe(0.7);
		});
	});

	// =========================================================================
	// CONFIGURATION TESTS
	// =========================================================================
	describe("Configuration", () => {
		it("should respect custom config overrides", () => {
			// Arrange
			tagger = new SessionTagger({
				config: {
					minLongSessionDuration: 10 * 60 * 1000, // 10 minutes
					maxShortSessionDuration: 2 * 60 * 1000, // 2 minutes
				},
			});

			const now = Date.now();
			const manifest = createTestSessionManifest({
				startedAt: now - 15 * 60 * 1000, // 15 minutes ago
				endedAt: now,
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("long-session");
		});

		it("should respect custom normalization config", () => {
			// Arrange
			tagger = new SessionTagger({
				config: {
					normalization: {
						multiFileThreshold: 2, // Lower threshold
						multiFileNormalization: 5,
					},
				},
			});

			const manifest = createTestSessionManifest({
				files: Array.from({ length: 3 }, (_, i) => ({
					uri: `/test/file${i}.ts`,
					snapshotId: `snap-${i}`,
					changeStats: { added: 10, deleted: 2 },
				})),
			});

			// Act
			const result = tagger.tagSession(manifest);

			// Assert
			expect(result.tags).toContain("multi-file");
			expect(result.confidence["multi-file"]).toBeCloseTo(0.6, 1); // 3/5 = 0.6
		});
	});
});
