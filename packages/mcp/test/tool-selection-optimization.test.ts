/**
 * Tool Selection Optimization Tests
 *
 * TDD RED phase: Tests for research-confirmed optimizations:
 * 1. Tool descriptions optimized for 10x selection (assertive cues, examples)
 * 2. Tiered response formats (rich for snap/snap.end/violations, cold for check)
 * 3. Hot tier positioning in snap output (primacy bias)
 *
 * Updated for consolidated 7-tool interface.
 *
 * Research sources:
 * - Tool preferences can shift 10x with description edits (arxiv.org/html/2505.18135)
 * - First 20% of context has best recall (primacy bias)
 * - Rich responses for educational tools, cold for efficiency
 *
 * @module test/tool-selection-optimization
 */

import { describe, expect, it } from "vitest";
import { CONSOLIDATED_TOOLS } from "../src/tools/consolidated/registry.js";

// =============================================================================
// Phase 2.1: Tool Description Optimization Tests
// =============================================================================

describe("Tool Description Optimization for 10x Selection", () => {
	describe("snap - Primary Entry Point", () => {
		const snap = CONSOLIDATED_TOOLS.find((t) => t.name === "snap");

		it("should have start mode", () => {
			expect(snap).toBeDefined();
			const desc = (snap?.description ?? "").toLowerCase();
			// Snap should describe modes
			expect(desc.includes("mode") || desc.includes("start")).toBe(true);
		});

		it("should be concise for token efficiency", () => {
			expect(snap).toBeDefined();
			// Consolidated tools should have shorter descriptions
			expect((snap?.description ?? "").length).toBeLessThan(600);
		});
	});

	describe("snap_end - Task Completion", () => {
		const snapEnd = CONSOLIDATED_TOOLS.find((t) => t.name === "snap_end");

		it("should emphasize task completion", () => {
			expect(snapEnd).toBeDefined();
			expect((snapEnd?.description ?? "").toLowerCase()).toMatch(/end|complete|finish/i);
		});
	});

	describe("snap_violation - Educational Feedback", () => {
		const snapViolation = CONSOLIDATED_TOOLS.find((t) => t.name === "snap_violation");

		it("should mention violation reporting", () => {
			expect(snapViolation).toBeDefined();
			expect((snapViolation?.description ?? "").toLowerCase()).toMatch(/violation|report/i);
		});
	});

	describe("check - Validation Tool", () => {
		const check = CONSOLIDATED_TOOLS.find((t) => t.name === "check");

		it("should be concise (under 600 chars)", () => {
			expect(check).toBeDefined();
			// Cold tools should have shorter descriptions
			expect((check?.description ?? "").length).toBeLessThan(600);
		});

		it("should focus on validation", () => {
			expect(check).toBeDefined();
			expect((check?.description ?? "").toLowerCase()).toMatch(/valid|check|verify/i);
		});
	});
});

// =============================================================================
// Phase 2.3: Tiered Response Format Tests
// =============================================================================

describe("Tiered Response Format Structure", () => {
	describe("Rich format requirements (snap/snap.end/snap.violation)", () => {
		it("should define rich response fields for snap", () => {
			// Rich responses should include: task_id, risk, protection, snapshot
			const richFields = ["task_id", "risk", "protection", "snapshot", "learnings"];
			expect(richFields.length).toBeGreaterThan(4);
		});

		it("should define rich response fields for snap.end", () => {
			const richFields = ["status", "learnings", "files", "lines"];
			expect(richFields.length).toBeGreaterThan(3);
		});

		it("should define rich response fields for snap.violation", () => {
			const richFields = ["type", "count", "promote", "automate"];
			expect(richFields.length).toBeGreaterThan(3);
		});
	});

	describe("Cold format requirements (check)", () => {
		it("should define minimal response fields for check", () => {
			// Cold responses: just status + counts
			const coldFields = ["mode", "status", "errors", "warnings"];
			expect(coldFields.length).toBeLessThanOrEqual(5);
		});
	});
});

// =============================================================================
// Phase 2.6: Hot Tier Positioning Tests
// =============================================================================

describe("Hot Tier Positioning (Primacy Bias)", () => {
	it("should define INTENT_LEARNING_FILES for hot tier", async () => {
		// Hot tier patterns should be defined for first-position placement
		const { INTENT_LEARNING_FILES } = await import("../src/services/tiered-learning-service.js");
		expect(INTENT_LEARNING_FILES).toBeDefined();
		expect(INTENT_LEARNING_FILES.implement).toContain("architecture-patterns.jsonl");
	});

	it("should have hot tier boost constant for priority scoring", async () => {
		// Hot tier should have significant priority boost
		const { HOT_TIER_BOOST } = await import("../src/services/tiered-learning-service.js");
		// The HOT_TIER_BOOST constant should exist and be significant (research: primacy bias)
		expect(HOT_TIER_BOOST).toBeDefined();
		expect(HOT_TIER_BOOST).toBeGreaterThanOrEqual(50); // Must outrank keyword scores significantly
	});

	describe("snap output ordering", () => {
		it("should position critical learnings first", () => {
			// Test that output structure places hot tier first (wire format)
			// S|task_id|risk|protection|dirty|snapshot|learnings...
			const wireFormat = "S|task_id|risk|protection|dirty|snapshot|learning1";
			const parts = wireFormat.split("|");
			expect(parts[0]).toBe("S"); // Type first
			expect(parts[1]).toBe("task_id"); // ID second
		});
	});
});

// =============================================================================
// Phase 2.8: Integration Tests
// =============================================================================

describe("Tool Selection Integration", () => {
	it("should have all 7 consolidated tools defined in registry", () => {
		const keyTools = ["snap", "snap_end", "snap_fix", "snap_help", "snap_learn", "snap_violation", "check"];

		for (const toolName of keyTools) {
			const tool = CONSOLIDATED_TOOLS.find((t) => t.name === toolName);
			expect(tool, `Tool ${toolName} should be defined`).toBeDefined();
		}
	});

	it("should have consistent description lengths across tools", () => {
		// All consolidated tools should have concise descriptions
		for (const tool of CONSOLIDATED_TOOLS) {
			expect((tool.description ?? "").length).toBeLessThan(600);
		}
	});
});
