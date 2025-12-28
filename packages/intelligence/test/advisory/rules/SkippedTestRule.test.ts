/**
 * SkippedTestRule Tests
 *
 * TDD RED Phase: Tests for advisory rule that detects skipped tests
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Generates suggestions when skipped tests detected
 * - Sad: No suggestions when no skipped tests
 * - Edge: Multiple skipped tests across files
 * - Error: Handles parse failures gracefully
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkippedTestRule } from "../../../src/advisory/rules/SkippedTestRule";
import type { AdvisoryTriggerContext } from "../../../src/types/advisory";

// Mock the SkippedTestDetector
vi.mock("@snapback/core/analysis", () => ({
	detectSkippedTests: vi.fn(),
}));

import { detectSkippedTests } from "@snapback/core/analysis";

const mockDetectSkippedTests = vi.mocked(detectSkippedTests);

// Extended context type for tests
type TestContext = AdvisoryTriggerContext & { code?: string };

describe("SkippedTestRule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// RULE METADATA
	// ============================================================================

	describe("Rule Metadata", () => {
		it("should have correct id", () => {
			expect(SkippedTestRule.id).toBe("skipped-vitest-tests");
		});

		it("should have priority of 2", () => {
			expect(SkippedTestRule.priority).toBe(2);
		});
	});

	// ============================================================================
	// TRIGGER
	// ============================================================================

	describe("Trigger", () => {
		it("should trigger for .test.ts files", () => {
			const context: AdvisoryTriggerContext = {
				files: ["auth.test.ts", "utils.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
			};

			expect(SkippedTestRule.trigger(context)).toBe(true);
		});

		it("should trigger for .spec.ts files", () => {
			const context: AdvisoryTriggerContext = {
				files: ["auth.spec.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
			};

			expect(SkippedTestRule.trigger(context)).toBe(true);
		});

		it("should trigger for __tests__ directory files", () => {
			const context: AdvisoryTriggerContext = {
				files: ["src/__tests__/auth.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
			};

			expect(SkippedTestRule.trigger(context)).toBe(true);
		});

		it("should NOT trigger for non-test files", () => {
			const context: AdvisoryTriggerContext = {
				files: ["auth.ts", "utils.ts", "index.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
			};

			expect(SkippedTestRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for empty files array", () => {
			const context: AdvisoryTriggerContext = {
				files: [],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 0,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
			};

			expect(SkippedTestRule.trigger(context)).toBe(false);
		});
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should generate suggestion when skipped tests detected", () => {
			mockDetectSkippedTests.mockReturnValue({
				file: "auth.test.ts",
				skipped: [
					{ type: "it", name: "should authenticate", line: 10, column: 2, file: "auth.test.ts" },
					{ type: "describe", name: "OAuth flow", line: 25, column: 0, file: "auth.test.ts" },
				],
				parsed: true,
			});

			const context: TestContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				code: `describe.skip("OAuth flow", () => { it.skip("should authenticate", () => {}); });`,
			};

			const result = SkippedTestRule.generate(context);

			expect(result.suggestions).toBeDefined();
			expect(result.suggestions?.length).toBeGreaterThan(0);
			expect(result.suggestions?.[0].category).toBe("testing");
			expect(result.suggestions?.[0].text).toContain("2 skipped test");
		});

		it("should include file reference in suggestion", () => {
			mockDetectSkippedTests.mockReturnValue({
				file: "auth.test.ts",
				skipped: [{ type: "it", name: "should work", line: 5, column: 2, file: "auth.test.ts" }],
				parsed: true,
			});

			const context: TestContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				code: `it.skip("should work", () => {});`,
			};

			const result = SkippedTestRule.generate(context);

			expect(result.suggestions?.[0].files).toContain("auth.test.ts");
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should return empty suggestions when no skipped tests", () => {
			mockDetectSkippedTests.mockReturnValue({
				file: "auth.test.ts",
				skipped: [],
				parsed: true,
			});

			const context: TestContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				code: `it("should work", () => {});`,
			};

			const result = SkippedTestRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should return empty suggestions when no code provided", () => {
			const context: AdvisoryTriggerContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				// No code property
			};

			const result = SkippedTestRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle multiple test files with code", () => {
			mockDetectSkippedTests.mockReturnValue({
				file: "auth.test.ts",
				skipped: [
					{ type: "it", name: "test1", line: 5, column: 2, file: "auth.test.ts" },
					{ type: "it", name: "test2", line: 10, column: 2, file: "auth.test.ts" },
					{ type: "describe", name: "group", line: 20, column: 0, file: "auth.test.ts" },
				],
				parsed: true,
			});

			const context: TestContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 2,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				code: `describe.skip("group", () => { it.skip("test1", () => {}); it.skip("test2", () => {}); });`,
			};

			const result = SkippedTestRule.generate(context);

			expect(result.suggestions).toBeDefined();
			expect(result.suggestions?.[0].text).toContain("3 skipped test");
		});

		it("should set high priority for many skipped tests", () => {
			mockDetectSkippedTests.mockReturnValue({
				file: "auth.test.ts",
				skipped: Array(10)
					.fill(null)
					.map((_, i) => ({
						type: "it" as const,
						name: `test${i}`,
						line: i * 10,
						column: 2,
						file: "auth.test.ts",
					})),
				parsed: true,
			});

			const context: TestContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				code: `it.skip("test", () => {});`, // Content doesn't matter since we're mocking
			};

			const result = SkippedTestRule.generate(context);

			expect(result.suggestions?.[0].priority).toBe(1); // High priority
		});

		it("should set medium priority for 3-5 skipped tests", () => {
			mockDetectSkippedTests.mockReturnValue({
				file: "auth.test.ts",
				skipped: Array(4)
					.fill(null)
					.map((_, i) => ({
						type: "it" as const,
						name: `test${i}`,
						line: i * 10,
						column: 2,
						file: "auth.test.ts",
					})),
				parsed: true,
			});

			const context: TestContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				code: `it.skip("test", () => {});`,
			};

			const result = SkippedTestRule.generate(context);

			expect(result.suggestions?.[0].priority).toBe(2); // Medium priority
		});

		it("should set low priority for 1-2 skipped tests", () => {
			mockDetectSkippedTests.mockReturnValue({
				file: "auth.test.ts",
				skipped: [{ type: "it", name: "test1", line: 5, column: 2, file: "auth.test.ts" }],
				parsed: true,
			});

			const context: TestContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				code: `it.skip("test1", () => {});`,
			};

			const result = SkippedTestRule.generate(context);

			expect(result.suggestions?.[0].priority).toBe(3); // Low priority
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should handle parse failures gracefully", () => {
			mockDetectSkippedTests.mockReturnValue({
				file: "auth.test.ts",
				skipped: [],
				parsed: false,
				error: "Unexpected token",
			});

			const context: TestContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				code: "invalid syntax {{{{",
			};

			// Should not throw
			const result = SkippedTestRule.generate(context);
			expect(result.suggestions).toEqual([]);
		});

		it("should handle detectSkippedTests throwing", () => {
			mockDetectSkippedTests.mockImplementation(() => {
				throw new Error("Parse error");
			});

			const context: TestContext = {
				files: ["auth.test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
				code: `it.skip("test", () => {});`,
			};

			// Should not throw
			const result = SkippedTestRule.generate(context);
			expect(result.suggestions).toEqual([]);
		});
	});
});
