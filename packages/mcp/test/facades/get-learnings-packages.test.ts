/**
 * Package-Aware Learning Retrieval Tests
 *
 * TDD RED Phase: Tests for package-aware learning filtering and boosting
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Package filter returns matching learnings with boost
 * - Sad: No learnings match package context
 * - Edge: Multiple packages, partial matches, scoring
 * - Error: Invalid package input handling
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleGetLearnings } from "../../src/facades/handlers.js";
import type { ToolContext } from "../../src/registry.js";

// ============================================================================
// Test Setup
// ============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-learnings-packages");

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
	// Create learnings directory
	const learningsDir = join(snapbackDir, "learnings");
	if (!existsSync(learningsDir)) {
		mkdirSync(learningsDir, { recursive: true });
	}
}

function cleanupTestWorkspace() {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

/**
 * Create mock learnings with package context
 */
function createMockLearnings(
	learnings: Array<{
		id: string;
		type: string;
		trigger: string;
		action: string;
		packages?: string[];
		source?: string;
	}>,
) {
	const learningsDir = join(TEST_WORKSPACE, ".snapback", "learnings");
	const learningsPath = join(learningsDir, "learnings.jsonl");

	const lines = learnings.map((l) =>
		JSON.stringify({
			id: l.id,
			type: l.type,
			trigger: l.trigger,
			action: l.action,
			solution: l.action,
			packages: l.packages || [],
			source: l.source || "test-session",
			timestamp: new Date().toISOString(),
		}),
	);

	writeFileSync(learningsPath, lines.join("\n") + "\n");
}

// ============================================================================
// Tests
// ============================================================================

describe("get_learnings package-aware retrieval", () => {
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
		it("should boost learnings matching the specified packages", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "vitest config",
					action: "use nodeConfig preset",
					packages: ["@snapback/mcp"],
				},
				{
					id: "L-002",
					type: "pattern",
					trigger: "vitest config",
					action: "use webConfig preset",
					packages: ["@snapback/web"],
				},
				{
					id: "L-003",
					type: "pattern",
					trigger: "vitest setup",
					action: "generic setup instructions",
					packages: [], // No package context
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["vitest"],
					packages: ["@snapback/mcp"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBeGreaterThan(0);

			// Package-matching learning should be first (boosted)
			expect(data.learnings[0].id).toBe("L-001");

			// Should include package relevance score
			expect(data.learnings[0].packageScore).toBeDefined();
			expect(data.learnings[0].packageScore).toBeGreaterThan(0);
		});

		it("should filter learnings to only matching packages when filter mode specified", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "auth setup",
					action: "use JWT tokens",
					packages: ["@snapback/web"],
				},
				{
					id: "L-002",
					type: "pattern",
					trigger: "auth config",
					action: "configure vscode auth",
					packages: ["@snapback/vscode"],
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["auth"],
					packages: ["@snapback/web"],
					packageMode: "filter", // Only show matching packages
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBe(1);
			expect(data.learnings[0].id).toBe("L-001");
		});

		it("should return all learnings with package scores in boost mode (default)", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "testing",
					action: "action 1",
					packages: ["@snapback/mcp"],
				},
				{
					id: "L-002",
					type: "pattern",
					trigger: "testing",
					action: "action 2",
					packages: ["@snapback/web"],
				},
				{
					id: "L-003",
					type: "pattern",
					trigger: "testing",
					action: "action 3",
					packages: [],
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["testing"],
					packages: ["@snapback/mcp"],
					packageMode: "boost", // Boost matching, but include all
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBe(3);

			// First should be the matching package
			expect(data.learnings[0].id).toBe("L-001");
			expect(data.learnings[0].packageScore).toBeGreaterThan(data.learnings[1].packageScore || 0);
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should return empty when no learnings match package filter", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "auth setup",
					action: "use JWT",
					packages: ["@snapback/web"],
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["auth"],
					packages: ["@snapback/cli"],
					packageMode: "filter",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBe(0);
			expect(data.message).toContain("No learnings found");
		});

		it("should work without packages parameter (backward compatible)", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "testing",
					action: "use vitest",
					packages: ["@snapback/mcp"],
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["testing"],
					// No packages parameter
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBe(1);
			// Should not have packageScore when no packages specified
			expect(data.learnings[0].packageScore).toBeUndefined();
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle multiple package contexts in a single learning", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "shared utils",
					action: "use @snapback/core utilities",
					packages: ["@snapback/mcp", "@snapback/vscode", "@snapback/web"],
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["shared"],
					packages: ["@snapback/mcp"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBe(1);
			expect(data.learnings[0].packageScore).toBeGreaterThan(0);
		});

		it("should handle partial package name matching", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "extension config",
					action: "use activation events",
					packages: ["@snapback/vscode"],
				},
			]);

			// Using partial package name (without scope)
			const result = await handleGetLearnings(
				{
					keywords: ["extension"],
					packages: ["vscode"], // Partial match
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBe(1);
			// Should still match with partial name
			expect(data.learnings[0].packageScore).toBeGreaterThan(0);
		});

		it("should boost learnings with more package matches higher", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "shared code",
					action: "action 1",
					packages: ["@snapback/mcp"],
				},
				{
					id: "L-002",
					type: "pattern",
					trigger: "shared code",
					action: "action 2",
					packages: ["@snapback/mcp", "@snapback/vscode"],
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["shared"],
					packages: ["@snapback/mcp", "@snapback/vscode"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBe(2);

			// Learning with both package matches should score higher
			expect(data.learnings[0].id).toBe("L-002");
			expect(data.learnings[0].packageScore).toBeGreaterThan(data.learnings[1].packageScore);
		});

		it("should include packageContext in response when packages are specified", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "testing",
					action: "action 1",
					packages: ["@snapback/mcp"],
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["testing"],
					packages: ["@snapback/mcp", "@snapback/web"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.packageContext).toBeDefined();
			expect(data.packageContext).toEqual(["@snapback/mcp", "@snapback/web"]);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should handle empty packages array gracefully", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "testing",
					action: "action 1",
					packages: [],
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["testing"],
					packages: [], // Empty array
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBe(1);
			// No package scoring when empty array
			expect(data.learnings[0].packageScore).toBeUndefined();
		});

		it("should handle invalid packageMode gracefully (default to boost)", async () => {
			createMockLearnings([
				{
					id: "L-001",
					type: "pattern",
					trigger: "testing",
					action: "action 1",
					packages: ["@snapback/mcp"],
				},
				{
					id: "L-002",
					type: "pattern",
					trigger: "testing",
					action: "action 2",
					packages: ["@snapback/web"],
				},
			]);

			const result = await handleGetLearnings(
				{
					keywords: ["testing"],
					packages: ["@snapback/mcp"],
					packageMode: "invalid_mode" as "boost" | "filter",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			// Should default to boost mode, returning all learnings
			expect(data.learnings.length).toBe(2);
		});

		it("should handle learnings without packages field", async () => {
			// Create learnings without packages field (legacy format)
			const learningsDir = join(TEST_WORKSPACE, ".snapback", "learnings");
			const learningsPath = join(learningsDir, "learnings.jsonl");
			writeFileSync(
				learningsPath,
				JSON.stringify({
					id: "L-001",
					type: "pattern",
					trigger: "testing",
					action: "legacy action",
					solution: "legacy action",
					source: "test",
					timestamp: new Date().toISOString(),
					// No packages field
				}) + "\n",
			);

			const result = await handleGetLearnings(
				{
					keywords: ["testing"],
					packages: ["@snapback/mcp"],
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.learnings.length).toBe(1);
			// Legacy learning should have 0 package score
			expect(data.learnings[0].packageScore).toBe(0);
		});
	});
});
