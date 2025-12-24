/**
 * AdvisoryEngine Tests
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Advisory context generated with all sections
 * - Sad: No warnings when files are stable
 * - Edge: Max warnings/suggestions limits enforced
 * - Error: Missing/invalid trigger context handled gracefully
 *
 * TDD Approach: RED phase - these tests WILL FAIL until implementation
 */

import { beforeEach, describe, expect, it } from "vitest";
// Import will fail until we create the file (RED phase)
import { AdvisoryEngine } from "../../src/advisory/AdvisoryEngine.js";
import type { AdvisoryTriggerContext } from "../../src/types/advisory.js";

describe("AdvisoryEngine", () => {
	let engine: AdvisoryEngine;

	beforeEach(() => {
		engine = new AdvisoryEngine({
			enabled: true,
			maxWarnings: 5,
			maxSuggestions: 3,
			maxRelatedFiles: 5,
			includeSessionContext: true,
			includeFileHistory: true,
		});
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should generate advisory context with all sections", () => {
			const triggerContext: AdvisoryTriggerContext = {
				files: ["auth.ts"],
				session: {
					riskLevel: "medium",
					toolCallCount: 10,
					filesModified: 3,
					loopsDetected: 0,
					consecutiveFileModifications: new Map([["auth.ts", 3]]),
				},
				fragility: new Map([["auth.ts", 0.6]]), // fragile file
				recentViolations: [{ type: "layer-boundary-violation", file: "auth.ts" }],
			};

			const advisory = engine.enrich(triggerContext);

			// Verify structure
			expect(advisory).toBeDefined();
			expect(advisory.summary).toBe("auth.ts has been modified 3 times this session (fragility: MODERATE)");
			expect(advisory.warnings).toHaveLength(3); // consecutive mods + fragility + violation history
			expect(advisory.suggestions).toHaveLength(2); // create snapshot + run tests
			expect(advisory.relatedFiles).toEqual([]);
			expect(advisory.fileHistory).toHaveLength(1);
			expect(advisory.session).toEqual({
				riskLevel: "medium",
				toolCallCount: 10,
				filesModified: 3,
				loopsDetected: 0,
			});
		});

		it("should include session context when enabled", () => {
			const triggerContext: AdvisoryTriggerContext = {
				files: [],
				session: {
					riskLevel: "high",
					toolCallCount: 25,
					filesModified: 8,
					loopsDetected: 1,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
			};

			const advisory = engine.enrich(triggerContext);

			expect(advisory.session).toBeDefined();
			expect(advisory.session?.riskLevel).toBe("high");
			expect(advisory.session?.loopsDetected).toBe(1);
		});

		it("should generate file history for target files", () => {
			const triggerContext: AdvisoryTriggerContext = {
				files: ["user.ts", "auth.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 5,
					filesModified: 2,
					loopsDetected: 0,
					consecutiveFileModifications: new Map([
						["user.ts", 1],
						["auth.ts", 2],
					]),
				},
				fragility: new Map([
					["user.ts", 0.2],
					["auth.ts", 0.7],
				]),
				recentViolations: [],
			};

			const advisory = engine.enrich(triggerContext);

			expect(advisory.fileHistory).toHaveLength(2);
			expect(advisory.fileHistory[0].path).toBe("user.ts");
			expect(advisory.fileHistory[0].modificationsThisSession).toBe(1);
			expect(advisory.fileHistory[0].fragilityScore).toBe(0.2);
			expect(advisory.fileHistory[1].path).toBe("auth.ts");
			expect(advisory.fileHistory[1].modificationsThisSession).toBe(2);
			expect(advisory.fileHistory[1].fragilityScore).toBe(0.7);
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should return empty warnings when files are stable", () => {
			const triggerContext: AdvisoryTriggerContext = {
				files: ["stable.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 2,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map([["stable.ts", 1]]),
				},
				fragility: new Map([["stable.ts", 0.1]]), // stable file
				recentViolations: [],
			};

			const advisory = engine.enrich(triggerContext);

			expect(advisory.warnings).toHaveLength(0);
			expect(advisory.suggestions.length).toBeGreaterThan(0); // still has generic suggestions
		});

		it("should return minimal advisory when no files specified", () => {
			const triggerContext: AdvisoryTriggerContext = {
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

			const advisory = engine.enrich(triggerContext);

			expect(advisory.summary).toBe("No specific files targeted");
			expect(advisory.warnings).toHaveLength(0);
			expect(advisory.fileHistory).toHaveLength(0);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should enforce max warnings limit", () => {
			const triggerContext: AdvisoryTriggerContext = {
				files: ["file1.ts", "file2.ts", "file3.ts", "file4.ts", "file5.ts", "file6.ts"],
				session: {
					riskLevel: "high",
					toolCallCount: 30,
					filesModified: 6,
					loopsDetected: 0,
					consecutiveFileModifications: new Map([
						["file1.ts", 5],
						["file2.ts", 4],
						["file3.ts", 4],
						["file4.ts", 3],
						["file5.ts", 3],
						["file6.ts", 3],
					]),
				},
				fragility: new Map([
					["file1.ts", 0.8],
					["file2.ts", 0.7],
					["file3.ts", 0.7],
					["file4.ts", 0.6],
					["file5.ts", 0.6],
					["file6.ts", 0.6],
				]),
				recentViolations: [],
			};

			const advisory = engine.enrich(triggerContext);

			// Max warnings = 5 (from config)
			expect(advisory.warnings.length).toBeLessThanOrEqual(5);
		});

		it("should enforce max suggestions limit", () => {
			const triggerContext: AdvisoryTriggerContext = {
				files: ["test.ts"],
				session: {
					riskLevel: "medium",
					toolCallCount: 15,
					filesModified: 5,
					loopsDetected: 0,
					consecutiveFileModifications: new Map([["test.ts", 2]]),
				},
				fragility: new Map([["test.ts", 0.5]]),
				recentViolations: [
					{ type: "vague-assertion", file: "test.ts" },
					{ type: "incomplete-coverage", file: "test.ts" },
					{ type: "no-console", file: "test.ts" },
					{ type: "layer-boundary-violation", file: "test.ts" },
				],
			};

			const advisory = engine.enrich(triggerContext);

			// Max suggestions = 3 (from config)
			expect(advisory.suggestions.length).toBeLessThanOrEqual(3);
		});

		it("should handle disabled advisory engine", () => {
			const disabledEngine = new AdvisoryEngine({
				enabled: false,
				maxWarnings: 5,
				maxSuggestions: 3,
				maxRelatedFiles: 5,
				includeSessionContext: false,
				includeFileHistory: false,
			});

			const triggerContext: AdvisoryTriggerContext = {
				files: ["auth.ts"],
				session: {
					riskLevel: "high",
					toolCallCount: 20,
					filesModified: 5,
					loopsDetected: 1,
					consecutiveFileModifications: new Map([["auth.ts", 5]]),
				},
				fragility: new Map([["auth.ts", 0.9]]),
				recentViolations: [],
			};

			const advisory = disabledEngine.enrich(triggerContext);

			// Should return minimal advisory
			expect(advisory.summary).toBe("Advisory system disabled");
			expect(advisory.warnings).toHaveLength(0);
			expect(advisory.suggestions).toHaveLength(0);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should handle missing fragility data gracefully", () => {
			const triggerContext: AdvisoryTriggerContext = {
				files: ["new-file.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map([["new-file.ts", 1]]),
				},
				fragility: new Map(), // no fragility data
				recentViolations: [],
			};

			const advisory = engine.enrich(triggerContext);

			expect(advisory).toBeDefined();
			expect(advisory.fileHistory[0].fragilityScore).toBe(0); // defaults to 0
		});

		it("should handle undefined session context", () => {
			const triggerContext: AdvisoryTriggerContext = {
				files: ["test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 0,
					filesModified: 0,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(),
				},
				fragility: new Map(),
				recentViolations: [],
			};

			const advisory = engine.enrich(triggerContext);

			expect(advisory).toBeDefined();
			expect(advisory.summary).toBeDefined();
		});

		it("should handle empty consecutive modifications map", () => {
			const triggerContext: AdvisoryTriggerContext = {
				files: ["test.ts"],
				session: {
					riskLevel: "low",
					toolCallCount: 1,
					filesModified: 1,
					loopsDetected: 0,
					consecutiveFileModifications: new Map(), // empty
				},
				fragility: new Map([["test.ts", 0.3]]),
				recentViolations: [],
			};

			const advisory = engine.enrich(triggerContext);

			expect(advisory).toBeDefined();
			expect(advisory.fileHistory[0].modificationsThisSession).toBe(0); // defaults to 0
		});
	});

	// ============================================================================
	// RULE REGISTRATION
	// ============================================================================

	describe("Rule Registration", () => {
		it("should allow custom rule registration", () => {
			const customRule = {
				id: "custom-test-rule",
				priority: 1,
				trigger: (ctx: AdvisoryTriggerContext) => ctx.files.includes("custom.ts"),
				generate: (_ctx: AdvisoryTriggerContext) => ({
					warnings: [
						{
							level: "warning" as const,
							code: "CUSTOM_WARNING",
							message: "Custom rule triggered",
						},
					],
				}),
			};

			engine.registerRule(customRule);

			const triggerContext: AdvisoryTriggerContext = {
				files: ["custom.ts"],
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

			const advisory = engine.enrich(triggerContext);

			const customWarning = advisory.warnings.find((w) => w.code === "CUSTOM_WARNING");
			expect(customWarning).toBeDefined();
			expect(customWarning?.message).toBe("Custom rule triggered");
		});
	});
});
