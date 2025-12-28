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

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ToolContext } from "../../src/registry.js";
import { CONSOLIDATED_TOOLS, getMigrationGuidance, isConsolidatedTool } from "../../src/tools/consolidated/registry.js";
// Unused for now but kept for future tests
// import { handleSnap } from "../../src/tools/consolidated/snap.js";
// import { handleCheck } from "../../src/tools/consolidated/check.js";
import { handleSnapHelp } from "../../src/tools/consolidated/snap-help.js";
import { handleSnapLearn } from "../../src/tools/consolidated/snap-learn.js";

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

		it("should explain wire format", async () => {
			const context = createTestContext();
			const result = await handleSnapHelp({}, context);
			const text = result.content[0]?.text || "";

			expect(text).toContain("Wire format");
			expect(text).toContain("TYPE|field1|field2");
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
});
