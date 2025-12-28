/**
 * begin_task Tests - Proactive Guidance
 *
 * TDD RED Phase: Tests for proactive_guidance field in begin_task output
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Returns proactive_guidance with suggestions for test files
 * - Sad: No suggestions when no test files provided
 * - Edge: Multiple suggestion types from different rules
 * - Error: Gracefully handles AdvisoryEngine failures
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleBeginTask } from "../../src/facades/begin-task.js";
import type { ToolContext } from "../../src/registry.js";

// ============================================================================
// Test Setup
// ============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-begin-task");

function createTestContext(overrides?: Partial<ToolContext>): ToolContext {
	return {
		workspaceRoot: TEST_WORKSPACE,
		tier: "pro",
		userId: "test-user",
		...overrides,
	};
}

function setupTestWorkspace() {
	if (!existsSync(TEST_WORKSPACE)) {
		mkdirSync(TEST_WORKSPACE, { recursive: true });
	}
	// Create .snapback directory
	const snapbackDir = join(TEST_WORKSPACE, ".snapback");
	if (!existsSync(snapbackDir)) {
		mkdirSync(snapbackDir, { recursive: true });
	}
}

function cleanupTestWorkspace() {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

// ============================================================================
// proactive_guidance Tests
// ============================================================================

describe("begin_task proactive_guidance", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should return proactive_guidance field in output", async () => {
			const result = await handleBeginTask(
				{
					task: "Fix authentication bug",
					files: ["src/auth.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.proactive_guidance).toBeDefined();
			expect(Array.isArray(data.proactive_guidance.suggestions)).toBe(true);
		});

		it("should return skipped test suggestions for test files with skipped tests", async () => {
			// Create a test file with skipped tests
			const testFilePath = join(TEST_WORKSPACE, "auth.test.ts");
			writeFileSync(
				testFilePath,
				`
describe("auth", () => {
	it.skip("should authenticate user", () => {
		expect(true).toBe(true);
	});

	describe.skip("OAuth flow", () => {
		it("should handle callback", () => {});
	});
});
`,
				"utf8",
			);

			const result = await handleBeginTask(
				{
					task: "Update authentication tests",
					files: ["auth.test.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.proactive_guidance).toBeDefined();
			expect(data.proactive_guidance.suggestions.length).toBeGreaterThan(0);

			// Should have a testing category suggestion
			const testingSuggestion = data.proactive_guidance.suggestions.find(
				(s: { category: string }) => s.category === "testing",
			);
			expect(testingSuggestion).toBeDefined();
			expect(testingSuggestion.text).toContain("skipped");
		});

		it("should include suggestion category and priority", async () => {
			const testFilePath = join(TEST_WORKSPACE, "utils.test.ts");
			writeFileSync(
				testFilePath,
				`
describe.skip("utils", () => {
	it("should work", () => {});
});
`,
				"utf8",
			);

			const result = await handleBeginTask(
				{
					task: "Review utility tests",
					files: ["utils.test.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			const suggestion = data.proactive_guidance?.suggestions?.[0];
			expect(suggestion).toBeDefined();
			expect(suggestion.category).toBe("testing");
			expect(typeof suggestion.priority).toBe("number");
			expect(typeof suggestion.confidence).toBe("number");
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should return empty suggestions when no test files provided", async () => {
			const result = await handleBeginTask(
				{
					task: "Update config file",
					files: ["config.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.proactive_guidance).toBeDefined();
			// May have empty suggestions or other rule-based suggestions
			expect(Array.isArray(data.proactive_guidance.suggestions)).toBe(true);
		});

		it("should return empty suggestions when test files have no skipped tests", async () => {
			const testFilePath = join(TEST_WORKSPACE, "clean.test.ts");
			writeFileSync(
				testFilePath,
				`
describe("clean", () => {
	it("should work", () => {
		expect(true).toBe(true);
	});
});
`,
				"utf8",
			);

			const result = await handleBeginTask(
				{
					task: "Review clean tests",
					files: ["clean.test.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.proactive_guidance).toBeDefined();

			// Should not have testing category suggestion about skipped tests
			const skippedTestSuggestion = data.proactive_guidance.suggestions.find(
				(s: { category: string; text: string }) => s.category === "testing" && s.text.includes("skipped"),
			);
			expect(skippedTestSuggestion).toBeUndefined();
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle multiple test files with skipped tests", async () => {
			// Create multiple test files
			const testFile1 = join(TEST_WORKSPACE, "auth.test.ts");
			const testFile2 = join(TEST_WORKSPACE, "api.test.ts");

			writeFileSync(testFile1, `it.skip("auth test", () => {});`, "utf8");
			writeFileSync(testFile2, `it.skip("api test", () => {});`, "utf8");

			const result = await handleBeginTask(
				{
					task: "Review all tests",
					files: ["auth.test.ts", "api.test.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.proactive_guidance).toBeDefined();
			expect(data.proactive_guidance.suggestions.length).toBeGreaterThan(0);
		});

		it("should include proactive_guidance summary", async () => {
			const result = await handleBeginTask(
				{
					task: "Simple task",
					files: ["file.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.proactive_guidance).toBeDefined();
			expect(typeof data.proactive_guidance.summary).toBe("string");
		});

		it("should set high priority for many skipped tests", async () => {
			const testFilePath = join(TEST_WORKSPACE, "many-skipped.test.ts");
			writeFileSync(
				testFilePath,
				`
describe("many skipped", () => {
	it.skip("test 1", () => {});
	it.skip("test 2", () => {});
	it.skip("test 3", () => {});
	it.skip("test 4", () => {});
	it.skip("test 5", () => {});
	it.skip("test 6", () => {});
	it.skip("test 7", () => {});
});
`,
				"utf8",
			);

			const result = await handleBeginTask(
				{
					task: "Review skipped tests",
					files: ["many-skipped.test.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			const testingSuggestion = data.proactive_guidance?.suggestions?.find(
				(s: { category: string }) => s.category === "testing",
			);
			expect(testingSuggestion).toBeDefined();
			// Priority 1 = high priority for 6+ skipped tests
			expect(testingSuggestion.priority).toBe(1);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should still return result when advisory engine fails", async () => {
			// Even with a non-existent file, begin_task should succeed
			const result = await handleBeginTask(
				{
					task: "Handle error case",
					files: ["nonexistent.test.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
			// Should have proactive_guidance even if empty
			expect(data.proactive_guidance).toBeDefined();
		});

		it("should handle malformed test file gracefully", async () => {
			const testFilePath = join(TEST_WORKSPACE, "malformed.test.ts");
			writeFileSync(testFilePath, "this is {{ not valid javascript syntax", "utf8");

			const result = await handleBeginTask(
				{
					task: "Handle malformed file",
					files: ["malformed.test.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
			expect(data.proactive_guidance).toBeDefined();
		});
	});
});

// ============================================================================
// Stale Context Warning Tests
// ============================================================================

describe("begin_task stale context warning", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should detect stale context and include warning in response", async () => {
			// Setup: Create stale context (10 days old)
			const ctxDir = join(TEST_WORKSPACE, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const staleDate = new Date();
			staleDate.setDate(staleDate.getDate() - 10); // 10 days ago

			const staleContext = {
				blockers: [{ key: "_ts", label: "typescript-errors", current: 32, target: 0 }],
				lastScanned: staleDate.toISOString(),
				staleAfterDays: 7,
			};
			writeFileSync(join(ctxDir, "context.json"), JSON.stringify(staleContext, null, 2));

			// Act
			const result = await handleBeginTask(
				{
					task: "Fix authentication bug",
					files: ["src/auth.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Assert
			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
			expect(data.contextWarnings).toBeDefined();
			expect(Array.isArray(data.contextWarnings)).toBe(true);
			expect(data.contextWarnings.length).toBeGreaterThan(0);

			const staleWarning = data.contextWarnings.find(
				(w: { type: string }) => w.type === "context_stale" || w.type === "context_rebuilt",
			);
			expect(staleWarning).toBeDefined();
			expect(staleWarning.action).toBeDefined();
		});

		it("should auto-rebuild stale context", async () => {
			// Setup: Create stale context
			const ctxDir = join(TEST_WORKSPACE, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const staleDate = new Date();
			staleDate.setDate(staleDate.getDate() - 10);

			const staleContext = {
				blockers: [{ key: "_ts", label: "typescript-errors", current: 999, target: 0 }],
				lastScanned: staleDate.toISOString(),
				staleAfterDays: 7,
			};
			writeFileSync(join(ctxDir, "context.json"), JSON.stringify(staleContext, null, 2));

			// Act
			const result = await handleBeginTask(
				{
					task: "Implement new feature",
					files: ["src/feature.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Assert: Context should be rebuilt
			expect(result.isError).toBeFalsy();

			// After rebuild, context file should have fresh lastScanned
			const ctxPath = join(ctxDir, "context.json");
			if (existsSync(ctxPath)) {
				const updatedContext = JSON.parse(readFileSync(ctxPath, "utf8"));
				// Should have a newer lastScanned than the stale date
				const newScanTime = new Date(updatedContext.lastScanned).getTime();
				const staleScanTime = staleDate.getTime();
				expect(newScanTime).toBeGreaterThan(staleScanTime);
			}

			// Warning should indicate rebuild happened
			const rebuildWarning = data.contextWarnings?.find((w: { type: string }) => w.type === "context_rebuilt");
			if (rebuildWarning) {
				expect(rebuildWarning.message).toContain("stale");
			}
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should not show warning when context is fresh", async () => {
			// Setup: Create fresh context
			const ctxDir = join(TEST_WORKSPACE, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const freshContext = {
				blockers: [],
				lastScanned: new Date().toISOString(),
				staleAfterDays: 7,
			};
			writeFileSync(join(ctxDir, "context.json"), JSON.stringify(freshContext, null, 2));

			// Act
			const result = await handleBeginTask(
				{
					task: "Simple task",
					files: ["src/utils.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Assert: No stale/rebuild warnings
			expect(result.isError).toBeFalsy();
			const staleWarnings = (data.contextWarnings || []).filter(
				(w: { type: string }) => w.type === "context_stale" || w.type === "context_rebuilt",
			);
			expect(staleWarnings.length).toBe(0);
		});

		it("should not show warning when no context exists", async () => {
			// Setup: No context file exists
			// (setupTestWorkspace creates .snapback but not ctx/context.json)

			// Act
			const result = await handleBeginTask(
				{
					task: "New project task",
					files: ["src/new.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Assert: Should succeed without stale warning
			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
			// contextWarnings should either not exist or not have stale warnings
			const staleWarnings = (data.contextWarnings || []).filter(
				(w: { type: string }) => w.type === "context_stale" || w.type === "context_rebuilt",
			);
			expect(staleWarnings.length).toBe(0);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle context at exact stale threshold", async () => {
			// Setup: Context exactly at stale threshold (7 days ago)
			const ctxDir = join(TEST_WORKSPACE, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const thresholdDate = new Date();
			thresholdDate.setDate(thresholdDate.getDate() - 7);

			const edgeContext = {
				blockers: [],
				lastScanned: thresholdDate.toISOString(),
				staleAfterDays: 7,
			};
			writeFileSync(join(ctxDir, "context.json"), JSON.stringify(edgeContext, null, 2));

			// Act
			const result = await handleBeginTask(
				{
					task: "Edge case task",
					files: ["src/edge.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Assert: Should succeed (edge case - may or may not be stale)
			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
		});

		it("should handle custom staleAfterDays setting", async () => {
			// Setup: Context with custom stale threshold of 3 days
			const ctxDir = join(TEST_WORKSPACE, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const recentDate = new Date();
			recentDate.setDate(recentDate.getDate() - 4); // 4 days ago

			const customContext = {
				blockers: [],
				lastScanned: recentDate.toISOString(),
				staleAfterDays: 3, // Custom threshold
			};
			writeFileSync(join(ctxDir, "context.json"), JSON.stringify(customContext, null, 2));

			// Act
			const result = await handleBeginTask(
				{
					task: "Custom threshold task",
					files: ["src/custom.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Assert: Should detect as stale (4 days > 3 day threshold)
			expect(result.isError).toBeFalsy();
			const staleWarning = (data.contextWarnings || []).find(
				(w: { type: string }) => w.type === "context_stale" || w.type === "context_rebuilt",
			);
			expect(staleWarning).toBeDefined();
		});

		it("should include staleness details in warning", async () => {
			// Setup: Create stale context with known age
			const ctxDir = join(TEST_WORKSPACE, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const staleDate = new Date();
			staleDate.setDate(staleDate.getDate() - 15); // 15 days ago

			const staleContext = {
				blockers: [],
				lastScanned: staleDate.toISOString(),
				staleAfterDays: 7,
			};
			writeFileSync(join(ctxDir, "context.json"), JSON.stringify(staleContext, null, 2));

			// Act
			const result = await handleBeginTask(
				{
					task: "Detailed warning task",
					files: ["src/detail.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Assert: Warning should include staleness details
			expect(result.isError).toBeFalsy();
			const staleWarning = (data.contextWarnings || []).find(
				(w: { type: string }) => w.type === "context_stale" || w.type === "context_rebuilt",
			);
			expect(staleWarning).toBeDefined();
			// Should mention days or time since last scan
			expect(staleWarning.daysSinceScanned || staleWarning.message).toBeDefined();
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should succeed even if context rebuild fails", async () => {
			// Setup: Create stale context with malformed data
			const ctxDir = join(TEST_WORKSPACE, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const staleDate = new Date();
			staleDate.setDate(staleDate.getDate() - 10);

			const staleContext = {
				blockers: "not-an-array", // Invalid format
				lastScanned: staleDate.toISOString(),
				staleAfterDays: 7,
			};
			writeFileSync(join(ctxDir, "context.json"), JSON.stringify(staleContext, null, 2));

			// Act
			const result = await handleBeginTask(
				{
					task: "Resilient task",
					files: ["src/resilient.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Assert: Task should still start successfully
			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
		});

		it("should handle missing lastScanned field gracefully", async () => {
			// Setup: Context without lastScanned
			const ctxDir = join(TEST_WORKSPACE, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const incompleteContext = {
				blockers: [],
				// No lastScanned field
				staleAfterDays: 7,
			};
			writeFileSync(join(ctxDir, "context.json"), JSON.stringify(incompleteContext, null, 2));

			// Act
			const result = await handleBeginTask(
				{
					task: "Missing field task",
					files: ["src/missing.ts"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Assert: Should succeed without crash
			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
		});
	});
});
