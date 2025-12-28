/**
 * Meta Tool Hierarchy Tests
 *
 * TDD RED Phase: Tests for structured tool hierarchy in meta output
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Returns hierarchical tool organization
 * - Sad: Maintains backward compatibility with flat list
 * - Edge: All tools categorized, no orphans
 * - Error: Handles gracefully
 */

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleMeta } from "../../src/facades/handlers.js";
import type { ToolContext } from "../../src/registry.js";

// ============================================================================
// Test Setup
// ============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-meta-hierarchy");

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
// Tests
// ============================================================================

describe("meta tool hierarchy", () => {
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
		it("should return tools organized by category", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.hierarchy).toBeDefined();
			expect(typeof data.hierarchy).toBe("object");

			// Should have core categories
			expect(data.hierarchy.entry_points).toBeDefined();
			expect(data.hierarchy.protection).toBeDefined();
			expect(data.hierarchy.validation).toBeDefined();
			expect(data.hierarchy.knowledge).toBeDefined();
		});

		it("should include entry_points with begin_task and get_context", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			const entryPoints = data.hierarchy.entry_points;
			expect(entryPoints).toBeDefined();
			expect(Array.isArray(entryPoints)).toBe(true);

			const toolNames = entryPoints.map((t: { name: string }) => t.name);
			expect(toolNames).toContain("begin_task");
			expect(toolNames).toContain("get_context");
		});

		it("should include protection tools with snapshot operations", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			const protection = data.hierarchy.protection;
			expect(protection).toBeDefined();
			expect(Array.isArray(protection)).toBe(true);

			const toolNames = protection.map((t: { name: string }) => t.name);
			expect(toolNames).toContain("snapshot_create");
			expect(toolNames).toContain("snapshot_list");
			expect(toolNames).toContain("snapshot_restore");
			expect(toolNames).toContain("suggest_snapshot");
			expect(toolNames).toContain("compare_snapshots");
		});

		it("should include validation tools", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			const validation = data.hierarchy.validation;
			expect(validation).toBeDefined();
			expect(Array.isArray(validation)).toBe(true);

			const toolNames = validation.map((t: { name: string }) => t.name);
			expect(toolNames).toContain("check_patterns");
			expect(toolNames).toContain("validate");
			expect(toolNames).toContain("quick_check");
		});

		it("should include knowledge tools with learnings", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			const knowledge = data.hierarchy.knowledge;
			expect(knowledge).toBeDefined();
			expect(Array.isArray(knowledge)).toBe(true);

			const toolNames = knowledge.map((t: { name: string }) => t.name);
			expect(toolNames).toContain("learn");
			expect(toolNames).toContain("get_learnings");
			expect(toolNames).toContain("report_violation");
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path - Backward Compatibility", () => {
		it("should still include flat tools list for backward compatibility", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			// Flat list should still exist
			expect(data.tools).toBeDefined();
			expect(Array.isArray(data.tools)).toBe(true);
			expect(data.tools.length).toBeGreaterThan(0);

			// Each tool should have name, status, description
			const firstTool = data.tools[0];
			expect(firstTool.name).toBeDefined();
			expect(firstTool.status).toBeDefined();
			expect(firstTool.description).toBeDefined();
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should include workflow recommendations", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			expect(data.workflows).toBeDefined();
			expect(Array.isArray(data.workflows)).toBe(true);
			expect(data.workflows.length).toBeGreaterThan(0);

			// Each workflow should have name and steps
			const workflow = data.workflows[0];
			expect(workflow.name).toBeDefined();
			expect(workflow.steps).toBeDefined();
			expect(Array.isArray(workflow.steps)).toBe(true);
		});

		it("should include discovery tools category", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			const discovery = data.hierarchy.discovery;
			expect(discovery).toBeDefined();
			expect(Array.isArray(discovery)).toBe(true);

			const toolNames = discovery.map((t: { name: string }) => t.name);
			expect(toolNames).toContain("lookup_exports");
		});

		it("should include all tools in hierarchy (no orphans)", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			// Collect all tools from hierarchy
			const hierarchyTools = new Set<string>();
			for (const category of Object.values(data.hierarchy)) {
				for (const tool of category as Array<{ name: string }>) {
					hierarchyTools.add(tool.name);
				}
			}

			// Compare with flat list
			const flatTools = new Set(data.tools.map((t: { name: string }) => t.name));

			// Every flat tool should be in hierarchy
			for (const flatTool of flatTools) {
				expect(hierarchyTools.has(flatTool)).toBe(true);
			}
		});

		it("should include tool count summary", async () => {
			const result = await handleMeta({}, ctx);
			const data = JSON.parse(result.content[0].text);

			expect(data.summary).toBeDefined();
			expect(data.summary.totalTools).toBeDefined();
			expect(typeof data.summary.totalTools).toBe("number");
			expect(data.summary.totalTools).toBeGreaterThan(0);

			// Summary should match actual tool count
			expect(data.summary.totalTools).toBe(data.tools.length);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should handle context without workspace gracefully", async () => {
			const noWorkspaceCtx = createTestContext({ workspaceRoot: "/nonexistent/path" });
			const result = await handleMeta({}, noWorkspaceCtx);
			const data = JSON.parse(result.content[0].text);

			// Should still return tool information
			expect(result.isError).toBeFalsy();
			expect(data.tools).toBeDefined();
			expect(data.hierarchy).toBeDefined();
		});
	});
});
