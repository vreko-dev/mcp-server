/**
 * @fileoverview Tests for SessionTagger
 *
 * TDD Phase: RED → Tests written first, expecting implementation to follow
 *
 * Test Coverage:
 * 1. Reason-based tagging (6 tests)
 * 2. Multi-file detection (2 tests)
 * 3. Duration-based tagging (3 tests)
 * 4. Change statistics tagging (2 tests)
 * 5. AI presence tagging (4 tests)
 * 6. Burst detection tagging (3 tests)
 * 7. Tag deduplication (2 tests)
 *
 * Total: 22 comprehensive tests
 */

import type { BurstDetectionResult } from "@snapback-sdk/core/detection/BurstHeuristicsDetector";
import { type AIPresenceInfo, SessionTagger } from "@snapback-sdk/core/session/SessionTagger";
import type { SessionManifest } from "@snapback-sdk/core/session/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectNormalizedScore } from "../../helpers/assertions";

describe("SessionTagger", () => {
	let tagger: SessionTagger;
	let mockAIDetector: () => AIPresenceInfo;
	let baseManifest: SessionManifest;

	beforeEach(() => {
		// Mock AI detector that returns no AI by default
		mockAIDetector = vi.fn(() => ({
			hasAI: false,
			detectedAssistants: [],
			assistantDetails: {},
		}));

		tagger = new SessionTagger({ aiPresenceDetector: mockAIDetector });

		// Base manifest for tests
		baseManifest = {
			id: "test-session-123",
			startedAt: Date.now() - 60000, // 1 minute ago
			endedAt: Date.now(),
			reason: "manual",
			files: [
				{
					uri: "/test/file1.ts",
					snapshotId: "snapshot-1",
					changeStats: { added: 50, deleted: 10 },
				},
			],
			tags: [],
		};
	});

	// ============================================================================
	// 1. Reason-based Tagging (6 tests)
	// ============================================================================

	describe("Reason-based Tagging", () => {
		it("should tag manual finalization with confidence 1.0", () => {
			const manifest: SessionManifest = { ...baseManifest, reason: "manual" };
			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("manual");
			expect(result.confidence.manual).toBe(1.0);
			expect(result.reasons.manual).toBe("Session was manually finalized");
		});

		it("should tag idle-break with confidence 0.8", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				reason: "idle-break",
			};
			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("manual");
			expect(result.confidence.manual).toBe(0.8);
			expect(result.reasons.manual).toContain("idle timeout");
		});

		it("should tag blur with confidence 0.8", () => {
			const manifest: SessionManifest = { ...baseManifest, reason: "blur" };
			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("manual");
			expect(result.confidence.manual).toBe(0.8);
			expect(result.reasons.manual).toContain("window lost focus");
		});

		it("should tag task completion with confidence 0.9", () => {
			const manifest: SessionManifest = { ...baseManifest, reason: "task" };
			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("manual");
			expect(result.confidence.manual).toBe(0.9);
			expect(result.reasons.manual).toContain("task boundary");
		});

		it("should tag commit with confidence 0.95", () => {
			const manifest: SessionManifest = { ...baseManifest, reason: "commit" };
			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("manual");
			expect(result.confidence.manual).toBe(0.95);
			expect(result.reasons.manual).toContain("git commit");
		});

		it("should handle max-duration reason", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				reason: "max-duration",
			};
			const result = tagger.tagSession(manifest);

			// Should not crash and should return valid result
			expect(result.tags).toBeDefined();
			expect(Array.isArray(result.tags)).toBe(true);
		});
	});

	// ============================================================================
	// 2. Multi-file Detection (2 tests)
	// ============================================================================

	describe("Multi-file Detection", () => {
		it("should tag sessions with more than 5 files", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				files: Array.from({ length: 10 }, (_, i) => ({
					uri: `/test/file${i}.ts`,
					snapshotId: `snapshot-${i}`,
					changeStats: { added: 10, deleted: 5 },
				})),
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("multi-file");
			expect(result.confidence["multi-file"]).toBe(1.0); // 10 files / 10 = 1.0
			expect(result.reasons["multi-file"]).toContain("10 files");
		});

		it("should not tag sessions with 5 or fewer files", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				files: Array.from({ length: 3 }, (_, i) => ({
					uri: `/test/file${i}.ts`,
					snapshotId: `snapshot-${i}`,
				})),
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).not.toContain("multi-file");
		});
	});

	// ============================================================================
	// 3. Duration-based Tagging (3 tests)
	// ============================================================================

	describe("Duration-based Tagging", () => {
		it("should tag long sessions (> 30 minutes)", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				startedAt: Date.now() - 45 * 60 * 1000, // 45 minutes ago
				endedAt: Date.now(),
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("long-session");
			expectNormalizedScore(result.confidence["long-session"]);
			expect(result.reasons["long-session"]).toContain("45 minutes");
		});

		it("should tag short sessions (< 30 seconds)", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				startedAt: Date.now() - 10 * 1000, // 10 seconds ago
				endedAt: Date.now(),
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("short-session");
			expectNormalizedScore(result.confidence["short-session"]);
			expect(result.reasons["short-session"]).toContain("10 seconds");
		});

		it("should not tag medium-duration sessions", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				startedAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
				endedAt: Date.now(),
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).not.toContain("long-session");
			expect(result.tags).not.toContain("short-session");
		});
	});

	// ============================================================================
	// 4. Change Statistics Tagging (2 tests)
	// ============================================================================

	describe("Change Statistics Tagging", () => {
		it("should tag large edits (> 1000 lines)", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				files: [
					{
						uri: "/test/file1.ts",
						snapshotId: "snapshot-1",
						changeStats: { added: 1500, deleted: 100 },
					},
				],
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("large-edits");
			expectNormalizedScore(result.confidence["large-edits"]);
			expect(result.reasons["large-edits"]).toContain("1500 lines");
		});

		it("should not tag small edits", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				files: [
					{
						uri: "/test/file1.ts",
						snapshotId: "snapshot-1",
						changeStats: { added: 50, deleted: 10 },
					},
				],
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).not.toContain("large-edits");
		});
	});

	// ============================================================================
	// 5. AI Presence Tagging (4 tests)
	// ============================================================================

	describe("AI Presence Tagging", () => {
		it("should tag ai-assisted when AI is detected", () => {
			mockAIDetector = vi.fn(() => ({
				hasAI: true,
				detectedAssistants: ["GITHUB_COPILOT"],
				assistantDetails: {
					GITHUB_COPILOT: "GitHub Copilot",
				},
			}));
			tagger = new SessionTagger({ aiPresenceDetector: mockAIDetector });

			const result = tagger.tagSession(baseManifest);

			expect(result.tags).toContain("ai-assisted");
			expect(result.confidence["ai-assisted"]).toBe(0.9);
			expect(result.reasons["ai-assisted"]).toContain("AI assistants detected");
		});

		it("should add specific AI assistant tags", () => {
			mockAIDetector = vi.fn(() => ({
				hasAI: true,
				detectedAssistants: ["GITHUB_COPILOT", "CLAUDE"],
				assistantDetails: {
					GITHUB_COPILOT: "GitHub Copilot",
					CLAUDE: "Claude",
				},
			}));
			tagger = new SessionTagger({ aiPresenceDetector: mockAIDetector });

			const result = tagger.tagSession(baseManifest);

			expect(result.tags).toContain("copilot-like");
			expect(result.tags).toContain("claude-like");
			expect(result.confidence["copilot-like"]).toBe(0.8);
			expect(result.confidence["claude-like"]).toBe(0.8);
		});

		it("should not tag ai-assisted when no AI detected", () => {
			const result = tagger.tagSession(baseManifest);

			expect(result.tags).not.toContain("ai-assisted");
			expect(result.tags).not.toContain("copilot-like");
		});

		it("should work without AI detector (optional dependency)", () => {
			const tagger = new SessionTagger(); // No AI detector

			const result = tagger.tagSession(baseManifest);

			// Should not crash and should not have AI tags
			expect(result.tags).not.toContain("ai-assisted");
			expect(result.confidence).toBeDefined();
		});
	});

	// ============================================================================
	// 6. Burst Detection Tagging (3 tests)
	// ============================================================================

	describe("Burst Detection Tagging", () => {
		it("should tag burst when burst detected", () => {
			const burstResult: BurstDetectionResult = {
				isBurst: true,
				confidence: 0.85,
				details: {
					totalInserted: 500,
					totalDeleted: 50,
					ratio: 10,
					changeCount: 5,
					duration: 2000,
				},
			};

			const result = tagger.tagSession(baseManifest, burstResult);

			expect(result.tags).toContain("burst");
			expect(result.confidence.burst).toBe(0.85);
			expect(result.reasons.burst).toContain("rapid, large insertions");
		});

		it("should not tag burst when burst not detected", () => {
			const burstResult: BurstDetectionResult = {
				isBurst: false,
				confidence: 0,
			};

			const result = tagger.tagSession(baseManifest, burstResult);

			expect(result.tags).not.toContain("burst");
		});

		it("should work without burst result (optional parameter)", () => {
			const result = tagger.tagSession(baseManifest);

			// Should not crash
			expect(result.tags).toBeDefined();
			expect(result.tags).not.toContain("burst");
		});
	});

	// ============================================================================
	// 7. Tag Deduplication (2 tests)
	// ============================================================================

	describe("Tag Deduplication", () => {
		it("should remove duplicate tags", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				tags: ["manual", "custom-tag"],
			};

			const result = tagger.tagSession(manifest);

			// "manual" should appear only once despite being in existing tags and added by reason
			const manualCount = result.tags.filter((t) => t === "manual").length;
			expect(manualCount).toBe(1);
		});

		it("should preserve existing tags from manifest", () => {
			const manifest: SessionManifest = {
				...baseManifest,
				tags: ["existing-tag", "another-tag"],
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("existing-tag");
			expect(result.tags).toContain("another-tag");
		});
	});

	// ============================================================================
	// 8. Custom Configuration (3 tests)
	// ============================================================================

	describe("Custom Configuration", () => {
		it("should accept custom minBurstConfidence", () => {
			const tagger = new SessionTagger({
				config: { minBurstConfidence: 0.5 },
			});

			const burstResult: BurstDetectionResult = {
				isBurst: true,
				confidence: 0.6, // Above custom threshold
			};

			const result = tagger.tagSession(baseManifest, burstResult);

			expect(result.tags).toContain("burst");
		});

		it("should accept custom minLongSessionDuration", () => {
			const tagger = new SessionTagger({
				config: { minLongSessionDuration: 10 * 60 * 1000 }, // 10 minutes
			});

			const manifest: SessionManifest = {
				...baseManifest,
				startedAt: Date.now() - 15 * 60 * 1000, // 15 minutes ago
				endedAt: Date.now(),
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("long-session");
		});

		it("should accept custom minLargeEditLines", () => {
			const tagger = new SessionTagger({
				config: { minLargeEditLines: 500 },
			});

			const manifest: SessionManifest = {
				...baseManifest,
				files: [
					{
						uri: "/test/file1.ts",
						snapshotId: "snapshot-1",
						changeStats: { added: 600, deleted: 50 },
					},
				],
			};

			const result = tagger.tagSession(manifest);

			expect(result.tags).toContain("large-edits");
		});
	});

	// ============================================================================
	// 9. updateSessionWithTags helper (2 tests)
	// ============================================================================

	describe("updateSessionWithTags", () => {
		it("should update manifest with new tags", () => {
			const updatedManifest = tagger.updateSessionWithTags(baseManifest);

			expect(updatedManifest.tags).toBeDefined();
			expect(updatedManifest.tags).toContain("manual");
			expect(updatedManifest.id).toBe(baseManifest.id);
			expect(updatedManifest.startedAt).toBe(baseManifest.startedAt);
		});

		it("should work with burst result", () => {
			const burstResult: BurstDetectionResult = {
				isBurst: true,
				confidence: 0.9,
			};

			const updatedManifest = tagger.updateSessionWithTags(baseManifest, burstResult);

			expect(updatedManifest.tags).toContain("burst");
			expect(updatedManifest.tags).toContain("manual");
		});
	});
});
