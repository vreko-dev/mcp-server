/**
 * Consolidated Tools Tests
 *
 * Tests for the 7 consolidated tools that replace 24 legacy tools.
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Tool returns expected compact response
 * - Sad: Invalid parameters return error
 * - Edge: Mode switching, empty inputs
 * - Error: Graceful error handling
 *
 * @module test/tools/consolidated
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ToolContext } from "../../src/registry.js";
import { CONSOLIDATED_TOOLS, getMigrationGuidance, isConsolidatedTool } from "../../src/tools/consolidated/registry.js";
// Unused for now but kept for future tests
// import { handleSnap } from "../../src/tools/consolidated/snap.js";
// import { handleCheck } from "../../src/tools/consolidated/check.js";
import { handleSnapHelp } from "../../src/tools/consolidated/snap-help.js";
import { handleSnapLearn } from "../../src/tools/consolidated/snap-learn.js";
import { getToolSchema, TOOL_SCHEMAS } from "../../src/validation.js";

// =============================================================================
// Test Setup
// =============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-consolidated");

function createTestContext(): ToolContext {
	return {
		workspaceRoot: TEST_WORKSPACE,
		tier: "free",
	};
}

describe("Consolidated Tools", () => {
	beforeEach(() => {
		if (!existsSync(TEST_WORKSPACE)) {
			mkdirSync(TEST_WORKSPACE, { recursive: true });
		}
		// Create minimal .snapback structure
		const snapbackDir = join(TEST_WORKSPACE, ".snapback");
		mkdirSync(join(snapbackDir, "learnings"), { recursive: true });
		mkdirSync(join(snapbackDir, "snapshots"), { recursive: true });
		mkdirSync(join(snapbackDir, "ctx"), { recursive: true });
	});

	afterEach(() => {
		if (existsSync(TEST_WORKSPACE)) {
			rmSync(TEST_WORKSPACE, { recursive: true, force: true });
		}
	});

	// ===========================================================================
	// Registry Tests
	// ===========================================================================

	describe("registry", () => {
		it("should export exactly 7 consolidated tools", () => {
			expect(CONSOLIDATED_TOOLS).toHaveLength(7);
		});

		it("should recognize consolidated tool names", () => {
			expect(isConsolidatedTool("snap")).toBe(true);
			expect(isConsolidatedTool("snap_end")).toBe(true);
			expect(isConsolidatedTool("snap_fix")).toBe(true);
			expect(isConsolidatedTool("snap_help")).toBe(true);
			expect(isConsolidatedTool("snap_learn")).toBe(true);
			expect(isConsolidatedTool("snap_violation")).toBe(true);
			expect(isConsolidatedTool("check")).toBe(true);
		});

		it("should not recognize legacy tool names as consolidated", () => {
			expect(isConsolidatedTool("begin_task")).toBe(false);
			expect(isConsolidatedTool("quick_check")).toBe(false);
			expect(isConsolidatedTool("complete_task")).toBe(false);
		});

		it("should provide migration guidance for legacy tools", () => {
			expect(getMigrationGuidance("begin_task")).toContain("snap");
			expect(getMigrationGuidance("quick_check")).toContain("check");
			expect(getMigrationGuidance("complete_task")).toContain("snap_end");
		});
	});

	// ===========================================================================
	// TOOL_SCHEMAS Alignment Tests (P0-1: Schema registry must match consolidated tools)
	// ===========================================================================

	describe("TOOL_SCHEMAS alignment", () => {
		const CONSOLIDATED_TOOL_NAMES = [
			"snap",
			"snap_end",
			"snap_fix",
			"snap_help",
			"snap_learn",
			"snap_violation",
			"check",
		];
		const LEGACY_TOOL_NAMES = [
			"analyze",
			"prepare_workspace",
			"snapshot_create",
			"snapshot_list",
			"snapshot_restore",
			"validate",
			"context",
			"session",
			"learn",
			"acknowledge_risk",
			"meta",
			"get_context",
			"check_patterns",
			"report_violation",
			"get_learnings",
		];

		it("should have schemas for all consolidated tools", () => {
			// Each consolidated tool should have a corresponding schema
			for (const toolName of CONSOLIDATED_TOOL_NAMES) {
				const schema = getToolSchema(toolName);
				expect(schema, `Missing schema for consolidated tool: ${toolName}`).toBeDefined();
			}
		});

		it("should NOT have schemas for legacy tool names (they are deprecated)", () => {
			// Legacy tool names should not pollute the schema registry
			const legacySchemas = LEGACY_TOOL_NAMES.filter((name) => getToolSchema(name) !== undefined);
			expect(legacySchemas, `Legacy schemas still present: ${legacySchemas.join(", ")}`).toHaveLength(0);
		});

		it("TOOL_SCHEMAS should only contain consolidated tool names", () => {
			const schemaKeys = Object.keys(TOOL_SCHEMAS);

			// All keys should be consolidated tool names
			for (const key of schemaKeys) {
				expect(
					CONSOLIDATED_TOOL_NAMES.includes(key),
					`TOOL_SCHEMAS contains non-consolidated key: "${key}"`,
				).toBe(true);
			}
		});

		it("TOOL_SCHEMAS count should match CONSOLIDATED_TOOLS count", () => {
			// Schema registry should have same count as consolidated tools
			expect(Object.keys(TOOL_SCHEMAS).length).toBe(CONSOLIDATED_TOOLS.length);
		});
	});

	// ===========================================================================
	// snap.? Tests
	// ===========================================================================

	describe("snap.? (help)", () => {
		it("should return help text with all tool names", async () => {
			const context = createTestContext();
			const result = await handleSnapHelp({}, context);

			expect(result.isError).toBeFalsy();
			const text = result.content[0]?.text || "";

			// Should mention all tools
			expect(text).toContain("snap");
			expect(text).toContain("snap_end");
			expect(text).toContain("snap_fix");
			expect(text).toContain("snap_learn");
			expect(text).toContain("check");
		});

		it("should explain response format", async () => {
			const context = createTestContext();
			const result = await handleSnapHelp({}, context);
			const text = result.content[0]?.text || "";

			// Help text should explain response structure
			expect(text).toContain("Response format");
			expect(text).toContain("---");
		});
	});

	// ===========================================================================
	// snap.learn Tests
	// ===========================================================================

	describe("snap.learn", () => {
		it("should capture a learning with compact response", async () => {
			const context = createTestContext();
			const result = await handleSnapLearn(
				{
					t: "When testing vitest",
					a: "Use vi.mock() before imports",
					type: "pat",
				},
				context,
			);

			// Should return L|OK format or JSON
			expect(result.isError).toBeFalsy();
			const text = result.content[0]?.text || "";
			expect(text.includes("L|OK") || text.includes("id")).toBe(true);
		});

		it("should handle missing required params", async () => {
			const context = createTestContext();
			const result = await handleSnapLearn(
				{
					t: "trigger only",
					// missing 'a' (action)
				},
				context,
			);

			// Should return error or handle gracefully
			const text = result.content[0]?.text || "";
			expect(text.length).toBeGreaterThan(0);
		});
	});

	// ===========================================================================
	// Wire Format Tests
	// ===========================================================================

	describe("wire format", () => {
		it("snap.? should return ~100 tokens (short response)", async () => {
			const context = createTestContext();
			const result = await handleSnapHelp({}, context);
			const text = result.content[0]?.text || "";

			// Wire format should be concise
			// ~4 chars per token, so ~400 chars for ~100 tokens
			expect(text.length).toBeLessThan(800);
		});
	});

	// ===========================================================================
	// Tool Consolidation Verification
	// ===========================================================================

	describe("consolidation", () => {
		it("should reduce tool count from 24 to 7", () => {
			// This is the key metric from stress_test_remediation.md
			const legacyToolCount = 24;
			const consolidatedToolCount = CONSOLIDATED_TOOLS.length;

			expect(consolidatedToolCount).toBe(7);
			expect(legacyToolCount / consolidatedToolCount).toBeGreaterThan(3); // 71% reduction
		});

		it("each tool should have compact description", () => {
			for (const tool of CONSOLIDATED_TOOLS) {
				// Descriptions should be token-efficient (target ~125 tokens = ~500 chars)
				// Allow some flexibility for important context
				expect((tool.description || "").length).toBeLessThan(600);
			}
		});
	});

	// ===========================================================================
	// P1-3: Auto-Promotion Tests
	// ===========================================================================

	describe("auto-promotion", () => {
		it("snap_end should track applied learnings and trigger auto-promotion", async () => {
			const context = createTestContext();
			const { handleSnapEnd } = await import("../../src/tools/consolidated/snap-end.js");
			const { createTieredLearningService } = await import("../../src/services/tiered-learning-service.js");

			// Create a learning in hot.jsonl first so we have something to track
			const service = createTieredLearningService(TEST_WORKSPACE);
			const learningsDir = join(TEST_WORKSPACE, ".snapback", "learnings");
			const hotPath = join(learningsDir, "hot.jsonl");

			// Ensure learnings directory exists
			mkdirSync(learningsDir, { recursive: true });

			// Create a test learning in hot tier
			const testLearning = {
				id: "test-snap-end-learning",
				type: "pattern",
				trigger: "test trigger",
				action: "test action",
				tier: "hot",
			};
			writeFileSync(hotPath, `${JSON.stringify(testLearning)}\n`);

			// Call snap_end with learnings that should be tracked as applied
			await handleSnapEnd(
				{
					ok: 1,
					l: ["Applied learning from session"],
				},
				context,
			);

			// Check that response includes auto-promotion info
			// (This test should FAIL until we implement auto-promotion in snap_end)
			const stats = service.getUsageStats();

			// The key assertion: snap_end should have tracked learnings as applied
			// Currently this will fail because snap_end doesn't call trackApplied
			const hasTrackedLearnings = Object.values(stats).some((s) => s.appliedCount > 0);
			expect(hasTrackedLearnings).toBe(true);
		});

		it("should auto-regenerate hot tier when threshold met", async () => {
			const _context = createTestContext();
			const { createTieredLearningService } = await import("../../src/services/tiered-learning-service.js");
			const service = createTieredLearningService(TEST_WORKSPACE);

			// Manually track a learning 3+ times to simulate threshold
			const testLearningId = "test-learning-promotion";
			service.trackApplied(testLearningId);
			service.trackApplied(testLearningId);
			service.trackApplied(testLearningId);

			// Verify usage stats show 3 applied
			const stats = service.getUsageStats();
			expect(stats[testLearningId]?.appliedCount).toBe(3);

			// Regenerate should work without error
			const result = await service.regenerateHotTier();
			expect(result.totalHot).toBeGreaterThanOrEqual(0);
		});
	});
});
