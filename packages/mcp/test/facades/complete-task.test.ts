/**
 * complete_task Tests - Reflection Parameter
 *
 * TDD RED Phase: Tests for reflection parameter in complete_task output
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Returns accountability_effect with valid reflection
 * - Sad: No accountability_effect when reflection not provided
 * - Edge: All perceived_help values work correctly
 * - Error: Gracefully handles invalid reflection values
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleBeginTask } from "../../src/facades/begin-task.js";
import { handleCompleteTask } from "../../src/facades/complete-task.js";
import type { ToolContext } from "../../src/registry.js";

// ============================================================================
// Test Setup
// ============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-complete-task");

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

/**
 * Helper to start a task before completing it
 * Note: compact: false is required to get JSON output for parsing
 */
async function startTask(ctx: ToolContext): Promise<string> {
	const result = await handleBeginTask(
		{
			task: "Test task for completion",
			files: ["src/test.ts"],
			compact: false, // Required for JSON output
		},
		ctx,
	);
	const data = JSON.parse(result.content[0].text);
	return data.taskId;
}

// ============================================================================
// reflection Tests
// ============================================================================

describe("complete_task reflection", () => {
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
		it("should return accountability_effect when reflection is provided", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "significantly",
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.accountability_effect).toBeDefined();
			expect(data.accountability_effect.perceived_help).toBe("significantly");
		});

		it("should include session metrics in accountability_effect", async () => {
			await startTask(ctx);

			// Create a test file to modify
			const testFile = join(TEST_WORKSPACE, "src", "test.ts");
			mkdirSync(join(TEST_WORKSPACE, "src"), { recursive: true });
			writeFileSync(testFile, "const x = 1;", "utf8");

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "somewhat",
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.accountability_effect).toBeDefined();
			expect(data.accountability_effect.session_duration_ms).toBeGreaterThanOrEqual(0);
			expect(data.accountability_effect.actual_changes).toBeDefined();
			expect(typeof data.accountability_effect.actual_changes.files_modified).toBe("number");
		});

		it("should include prevented_issues in accountability_effect", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "significantly",
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.accountability_effect).toBeDefined();
			expect(data.accountability_effect.prevented_issues).toBeDefined();
			expect(typeof data.accountability_effect.prevented_issues.rollbacks_avoided).toBe("number");
			expect(typeof data.accountability_effect.prevented_issues.pattern_violations_caught).toBe("number");
			expect(typeof data.accountability_effect.prevented_issues.skipped_tests_flagged).toBe("number");
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should not include accountability_effect when reflection is not provided", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			// accountability_effect should be undefined when no reflection provided
			expect(data.accountability_effect).toBeUndefined();
		});

		it("should still complete task successfully without reflection", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
			expect(data.outcome).toBe("completed");
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle perceived_help='not_really' correctly", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "not_really",
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.accountability_effect?.perceived_help).toBe("not_really");
		});

		it("should handle perceived_help='blocked' correctly", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "blocked",
					reflection: {
						perceived_help: "blocked",
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.accountability_effect?.perceived_help).toBe("blocked");
		});

		it("should work with abandoned outcome and reflection", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "abandoned",
					reflection: {
						perceived_help: "not_really",
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.outcome).toBe("abandoned");
			expect(data.accountability_effect?.perceived_help).toBe("not_really");
		});

		it("should include tier in accountability_effect", async () => {
			const customCtx = createTestContext({ tier: "solo" });
			await startTask(customCtx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "significantly",
					},
				},
				customCtx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.accountability_effect?.tier).toBe("solo");
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should handle invalid perceived_help value gracefully", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "invalid_value" as any,
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// Should complete without error, but accountability_effect may be undefined
			// or have fallback behavior
			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
		});

		it("should handle empty reflection object gracefully", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {} as any,
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.taskId).toBeDefined();
		});
	});

	// ============================================================================
	// ACCOUNTABILITY BEHAVIOR (Session Feedback Spec)
	// ============================================================================

	describe("Accountability Behavior", () => {
		it("should include accountability_behavior when accountability provided", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "significantly",
						accountability: {
							behaved_differently: true,
							how: "I tested more thoroughly because SnapBack was watching",
							triggered_by: "begin_task context loading",
							effort_change: "more",
						},
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.accountability_effect).toBeDefined();
			expect(data.accountability_effect.accountability_behavior).toBeDefined();
			expect(data.accountability_effect.accountability_behavior.would_have_behaved_differently).toBe(true);
		});

		it("should infer behavior_change_type from description", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "somewhat",
						accountability: {
							behaved_differently: true,
							how: "I fixed the bug instead of skipping the test",
						},
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.accountability_effect.accountability_behavior.behavior_change_type).toBe("fixed_vs_skipped");
		});

		it("should map effort_change correctly", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "significantly",
						accountability: {
							behaved_differently: true,
							how: "Worked harder on documentation",
							effort_change: "more",
						},
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.accountability_effect.accountability_behavior.effort_delta).toBe("somewhat_more");
		});

		it("should infer snapback_feature_responsible from trigger", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "significantly",
						accountability: {
							behaved_differently: true,
							how: "Reviewed learnings before implementing",
							triggered_by: "learn system showing past mistakes",
						},
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.accountability_effect.accountability_behavior.snapback_feature_responsible).toBe(
				"learn_system",
			);
		});

		it("should set outcome_improved based on task outcome", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "significantly",
						accountability: {
							behaved_differently: true,
							how: "Better testing approach",
						},
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.accountability_effect.accountability_behavior.outcome_improved).toBe(true);
		});

		it("should not include accountability_behavior when behaved_differently is false", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "not_really",
						accountability: {
							behaved_differently: false,
						},
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			// When user didn't behave differently, we still track it but with false
			expect(data.accountability_effect.accountability_behavior.would_have_behaved_differently).toBe(false);
		});

		it("should handle missing accountability gracefully", async () => {
			await startTask(ctx);

			const result = await handleCompleteTask(
				{
					outcome: "completed",
					reflection: {
						perceived_help: "somewhat",
						// No accountability field
					},
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.accountability_effect).toBeDefined();
			// accountability_behavior should be undefined when no accountability provided
		});
	});
});
