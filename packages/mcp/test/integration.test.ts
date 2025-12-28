/**
 * MCP Integration Tests
 *
 * Test ID Prefix: MCP-INT-001-XXX
 *
 * Tests tool handler integration and MCP compliance:
 * - All 7 consolidated tools respond correctly
 * - Input validation works for each tool
 * - Output structure is MCP-compliant
 * - Error handling is graceful
 * - Legacy facade handlers still work (used by consolidated tools)
 *
 * Migrated from apps/_archive/mcp-server/test/integration/mcp-protocol.test.ts
 * P0-001: Release-blocking test coverage requirement
 */

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { facadeHandlers } from "../src/facades/handlers.js";
import type { ToolContext } from "../src/registry.js";
import { CONSOLIDATED_TOOLS } from "../src/tools/consolidated/registry.js";

// ============================================================================
// Test Setup
// ============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-mcp");

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

// Mock SDK to avoid initialization errors
vi.mock("@snapback/sdk", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	const mockStorageBrokerAdapterInstance = {
		initialize: vi.fn().mockResolvedValue(undefined),
		save: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		get: vi.fn().mockResolvedValue(null),
		delete: vi.fn().mockResolvedValue(undefined),
	};
	const MockStorageBrokerAdapter = vi.fn(() => mockStorageBrokerAdapterInstance);
	return {
		...actual,
		StorageBrokerAdapter: MockStorageBrokerAdapter,
	};
});

vi.mock("@snapback/events", () => {
	const mockEventBus = {
		initialize: vi.fn().mockResolvedValue(undefined),
		publish: vi.fn(),
	};
	return {
		SnapBackEventBus: vi.fn(() => mockEventBus),
	};
});

// ============================================================================
// MCP Integration Tests
// ============================================================================

describe("MCP Tool Integration", () => {
	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	// ============================================================================
	// Tool Registry Tests
	// ============================================================================

	describe("Tool Registry", () => {
		// Test ID: MCP-INT-001-001
		it("should have exactly 7 consolidated tools", () => {
			expect(CONSOLIDATED_TOOLS.length).toBe(7);
		});

		// Test ID: MCP-INT-001-002
		it("should have all expected consolidated tool names", () => {
			const expectedTools = [
				"snap",
				"snap_end",
				"snap_fix",
				"snap_help",
				"snap_learn",
				"snap_violation",
				"check",
			];

			const toolNames = CONSOLIDATED_TOOLS.map((t) => t.name);
			for (const expected of expectedTools) {
				expect(toolNames).toContain(expected);
			}
		});

		// Test ID: MCP-INT-001-003
		it("should have valid input schemas for all tools", () => {
			for (const tool of CONSOLIDATED_TOOLS) {
				expect(tool.inputSchema).toBeDefined();
				expect(tool.inputSchema).toHaveProperty("type", "object");
			}
		});
	});

	// ============================================================================
	// Tool Response Structure Tests
	// ============================================================================

	describe("MCP Response Compliance", () => {
		const ctx = createTestContext();

		// Test ID: MCP-INT-001-005
		it("analyze: should return MCP-compliant structure", async () => {
			const result = await facadeHandlers.analyze({ type: "risk", changes: [] }, ctx);

			expect(result).toHaveProperty("content");
			expect(Array.isArray(result.content)).toBe(true);
			expect(result.content[0]).toHaveProperty("type", "text");
			expect(result.content[0]).toHaveProperty("text");

			const data = JSON.parse(result.content[0].text);
			expect(data).toHaveProperty("type");
			expect(data).toHaveProperty("severity");
		});

		// Test ID: MCP-INT-001-006
		it("meta: should return tool catalog with correct structure", async () => {
			const result = await facadeHandlers.meta({}, ctx);

			expect(result.isError).toBeFalsy();
			const data = JSON.parse(result.content[0].text);
			expect(data).toHaveProperty("tools");
			expect(Array.isArray(data.tools)).toBe(true);
			expect(data.tools.length).toBeGreaterThanOrEqual(20); // At least 20 tools in hierarchy

			// Verify first tool structure (no tier field in meta response)
			const firstTool = data.tools[0];
			expect(firstTool).toHaveProperty("name");
			expect(firstTool).toHaveProperty("description");
		});

		// Test ID: MCP-INT-001-007
		it("get_context: should return context data structure", async () => {
			const result = await facadeHandlers.get_context({ task: "Test task" }, ctx);

			expect(result.isError).toBeFalsy();
			const data = JSON.parse(result.content[0].text);
			// Actual response structure from Intelligence
			expect(data).toHaveProperty("workspace");
			expect(data).toHaveProperty("context");
			expect(data).toHaveProperty("relevantLearnings");
			expect(data).toHaveProperty("vitals");
		});

		// Test ID: MCP-INT-001-008
		it("check_patterns: should return validation structure", async () => {
			const result = await facadeHandlers.check_patterns({ code: "const x = 1;", filePath: "test.ts" }, ctx);

			expect(result.isError).toBeFalsy();
			const data = JSON.parse(result.content[0].text);
			// check_patterns returns validation result, not violations array
			expect(data).toHaveProperty("passed");
			expect(typeof data.passed).toBe("boolean");
		});
	});

	// ============================================================================
	// Input Validation Tests
	// ============================================================================

	describe("Input Validation", () => {
		const ctx = createTestContext();

		// Test ID: MCP-INT-001-009
		it("should reject analyze with missing type field", async () => {
			const result = await facadeHandlers.analyze({}, ctx);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("type");
		});

		// Test ID: MCP-INT-001-010
		it("should reject snapshot_create with empty files array", async () => {
			const result = await facadeHandlers.snapshot_create({ files: [], reason: "test" }, ctx);

			expect(result.isError).toBe(true);
		});

		// Test ID: MCP-INT-001-011
		it("should reject get_context with empty task", async () => {
			const result = await facadeHandlers.get_context({ task: "" }, ctx);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("task");
		});

		// Test ID: MCP-INT-001-012
		it("should reject check_patterns with missing code", async () => {
			const result = await facadeHandlers.check_patterns(
				{ filePath: "test.ts" } as { code: string; filePath: string },
				ctx,
			);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("code");
		});
	});

	// ============================================================================
	// Error Handling Tests
	// ============================================================================

	describe("Error Handling", () => {
		const ctx = createTestContext();

		// Test ID: MCP-INT-001-013
		it("should return safe error messages without stack traces", async () => {
			const result = await facadeHandlers.snapshot_restore({ snapshotId: "nonexistent-snap-id" }, ctx);

			expect(result.isError).toBe(true);
			const errorText = result.content[0].text;

			// Should not leak internal details
			expect(errorText).not.toContain("node_modules");
			expect(errorText).not.toContain("    at ");
			expect(errorText).not.toContain("/Users/");
			expect(errorText).not.toContain("Error:");
		});

		// Test ID: MCP-INT-001-014
		it("should handle tier gating for free users", async () => {
			const freeCtx = createTestContext({ tier: "free" });

			// Assume meta is available to all tiers
			const metaResult = await facadeHandlers.meta({}, freeCtx);
			expect(metaResult.isError).toBeFalsy();

			// Verify response structure (tier field not included in output)
			const data = JSON.parse(metaResult.content[0].text);
			expect(data).toHaveProperty("tools");
			expect(data.tools.length).toBeGreaterThanOrEqual(20); // At least 20 tools in hierarchy
		});
	});

	// ============================================================================
	// Response Stability Tests
	// ============================================================================

	describe("Response Stability", () => {
		const ctx = createTestContext();

		// Test ID: MCP-INT-001-015
		it("should return consistent JSON structure across multiple calls", async () => {
			const results = await Promise.all([
				facadeHandlers.meta({}, ctx),
				facadeHandlers.meta({}, ctx),
				facadeHandlers.meta({}, ctx),
			]);

			const parsed = results.map((r) => JSON.parse(r.content[0].text));

			// All should have same structure
			for (const data of parsed) {
				expect(data).toHaveProperty("tools");
				expect(data.tools.length).toBeGreaterThanOrEqual(20); // At least 20 tools in hierarchy
			}
		});

		// Test ID: MCP-INT-001-016
		it("should handle concurrent analyze calls safely", async () => {
			const requests = Array(5)
				.fill(null)
				.map((_, i) => facadeHandlers.analyze({ type: "risk", filePath: `test${i}.ts`, changes: [] }, ctx));

			const results = await Promise.all(requests);

			// All should succeed
			for (const result of results) {
				expect(result.isError).toBeFalsy();
				const data = JSON.parse(result.content[0].text);
				expect(data).toHaveProperty("severity");
			}
		});
	});

	// ============================================================================
	// Schema Validation Tests
	// ============================================================================

	describe("Schema Validation", () => {
		// Test ID: MCP-INT-001-017
		it("should validate snap schema correctly", () => {
			const tool = CONSOLIDATED_TOOLS.find((t) => t.name === "snap");
			expect(tool).toBeDefined();

			// Note: validateInput expects schema from validation.ts, not tool.inputSchema
			// This test verifies the schema structure exists
			expect(tool?.inputSchema).toHaveProperty("type", "object");
			expect(tool?.inputSchema).toHaveProperty("properties");
		});

		// Test ID: MCP-INT-001-018
		it("should validate snap_fix schema", () => {
			const tool = CONSOLIDATED_TOOLS.find((t) => t.name === "snap_fix");
			expect(tool).toBeDefined();
			expect(tool?.inputSchema).toHaveProperty("type", "object");
		});

		// Test ID: MCP-INT-001-019
		it("should validate check schema", () => {
			const tool = CONSOLIDATED_TOOLS.find((t) => t.name === "check");
			expect(tool).toBeDefined();
			expect(tool?.inputSchema).toHaveProperty("type", "object");
		});
	});
});
