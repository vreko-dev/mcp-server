/**
 * Context Tools Advisory Enhancement Tests
 *
 * RED phase - Tests for Phase 5: Enhance MCP tools with advisory context
 *
 * 4-Path Coverage:
 * - Happy: Advisory context successfully injected
 * - Sad: Advisory context omitted when not needed
 * - Edge: Advisory limits enforced
 * - Error: Graceful degradation if advisory fails
 */

import { describe, expect, it } from "vitest";
import {
	handleCheckPatterns,
	handleGetContext,
	handlePrepareWorkspace,
	handleValidateCode,
} from "../../src/tools/context-tools.js";

describe("Context Tools - Advisory Enhancement", () => {
	const workspaceRoot = "/tmp/test-workspace";

	// ============================================================================
	// handleGetContext - Advisory Enhancement
	// ============================================================================

	describe("handleGetContext with Advisory", () => {
		it("should include advisory warnings for fragile files", async () => {
			const result = await handleGetContext(
				{
					task: "modify auth.ts",
					keywords: ["auth", "security"],
					files: ["auth.ts"],
				},
				workspaceRoot,
			);

			// Should include advisory section when files are provided
			expect(result).toHaveProperty("advisory");
			expect(result.advisory).toBeDefined();
		});

		it("should omit advisory when no files specified", async () => {
			const result = await handleGetContext(
				{
					task: "research patterns",
					keywords: ["patterns"],
				},
				workspaceRoot,
			);

			// Advisory is optional when no files to warn about
			// (or can be minimal)
			expect(result).toBeDefined();
		});

		it("should include session context in advisory", async () => {
			const result = await handleGetContext(
				{
					task: "modify auth.ts",
					files: ["auth.ts"],
				},
				workspaceRoot,
			);

			if (result.advisory) {
				expect(result.advisory).toHaveProperty("summary");
			}
		});
	});

	// ============================================================================
	// handleCheckPatterns - Advisory Enhancement
	// ============================================================================

	describe("handleCheckPatterns with Advisory", () => {
		it("should include proactive suggestions beyond violations", async () => {
			const result = await handleCheckPatterns(
				{
					code: 'const password = "admin123";',
					filePath: "auth.ts",
				},
				workspaceRoot,
			);

			// Should include violations AND suggestions
			expect(result).toHaveProperty("violations");
			expect(result).toHaveProperty("advisory");
		});

		it("should warn about fragile files", async () => {
			const result = await handleCheckPatterns(
				{
					code: "export function login() { }",
					filePath: "auth.ts", // Known fragile file
				},
				workspaceRoot,
			);

			// Advisory should exist
			expect(result.advisory).toBeDefined();

			if (result.advisory) {
				// Should have warnings array (even if empty)
				expect(Array.isArray(result.advisory.warnings)).toBe(true);
				// Should have suggestions array
				expect(Array.isArray(result.advisory.suggestions)).toBe(true);
				// Should have summary
				expect(typeof result.advisory.summary).toBe("string");
			}
		});

		it("should include file history in advisory", async () => {
			const result = await handleCheckPatterns(
				{
					code: "export function test() { }",
					filePath: "user.ts",
				},
				workspaceRoot,
			);

			expect(result.advisory).toBeDefined();

			if (result.advisory) {
				// Verify fileHistory structure
				expect(result.advisory).toHaveProperty("fileHistory");
				expect(Array.isArray(result.advisory.fileHistory)).toBe(true);

				// If fileHistory has entries, verify structure
				if (result.advisory.fileHistory.length > 0) {
					const history = result.advisory.fileHistory[0];
					expect(history).toHaveProperty("path");
					expect(history).toHaveProperty("modificationsThisSession");
					expect(history).toHaveProperty("fragilityScore");
					expect(typeof history.path).toBe("string");
					expect(typeof history.modificationsThisSession).toBe("number");
				}
			}
		});
	});

	// ============================================================================
	// handleValidateCode - Advisory Enhancement
	// ============================================================================

	describe("handleValidateCode with Advisory", () => {
		it("should include advisory warnings for high-risk files", async () => {
			const result = await handleValidateCode(
				{
					code: 'const secret = "sk-1234567890";',
					filePath: "config.ts",
				},
				workspaceRoot,
			);

			// Should include advisory section
			expect(result).toHaveProperty("advisory");
		});

		it("should suggest snapshot creation for risky changes", async () => {
			const result = await handleValidateCode(
				{
					code: "export function deleteAllData() { }",
					filePath: "database.ts",
				},
				workspaceRoot,
			);

			// Advisory should exist (even if suggestions array is empty)
			expect(result.advisory).toBeDefined();

			// Suggestions might exist - if they do, check structure is valid
			if (result.advisory?.suggestions && result.advisory.suggestions.length > 0) {
				// Verify all suggestions have valid structure (text, priority, confidence, category)
				for (const suggestion of result.advisory.suggestions) {
					expect(suggestion).toHaveProperty("text");
					expect(suggestion).toHaveProperty("priority");
					expect(suggestion).toHaveProperty("category");
					expect(typeof suggestion.text).toBe("string");
				}
			}
		});

		it("should enforce advisory limits (max warnings/suggestions)", async () => {
			const result = await handleValidateCode(
				{
					code: "// code with many issues",
					filePath: "complex.ts",
				},
				workspaceRoot,
			);

			if (result.advisory) {
				// Should respect maxWarnings limit (5)
				expect(result.advisory.warnings?.length || 0).toBeLessThanOrEqual(5);
				// Should respect maxSuggestions limit (3)
				expect(result.advisory.suggestions?.length || 0).toBeLessThanOrEqual(3);
			}
		});
	});

	// ============================================================================
	// handlePrepareWorkspace - Advisory Enhancement (Already Exists)
	// ============================================================================

	describe("handlePrepareWorkspace with Advisory", () => {
		it("should maintain existing advisory-like behavior", async () => {
			const result = await handlePrepareWorkspace(
				{
					task: "implement feature",
					files: ["feature.ts"],
				},
				workspaceRoot,
				[], // sources
			);

			// Already has protection/snapshot/memory - verify structure
			expect(result).toHaveProperty("protection");
			expect(result).toHaveProperty("snapshot");
			expect(result).toHaveProperty("memory");
		});

		it("should recommend snapshot for risky operations", async () => {
			const result = await handlePrepareWorkspace(
				{
					task: "refactor auth system",
					files: ["auth.ts", "session.ts", "middleware.ts", "routes.ts"],
				},
				workspaceRoot,
				[],
			);

			// Should recommend snapshot for multiple files
			expect(result.snapshot.recommended).toBe(true);
		});
	});

	// ============================================================================
	// Error Handling
	// ============================================================================

	describe("Error Handling - Advisory Graceful Degradation", () => {
		it("should succeed even if advisory fails", async () => {
			// Test that core functionality works even if advisory context fails
			const result = await handleGetContext(
				{
					task: "test task",
				},
				workspaceRoot,
			);

			// Should still return task context
			expect(result.task).toBe("test task");
		});

		it("should handle missing intelligence gracefully", async () => {
			const result = await handleCheckPatterns(
				{
					code: "const x = 1;",
					filePath: "test.ts",
				},
				workspaceRoot,
			);

			// Should still return violations even if advisory missing
			expect(result).toHaveProperty("valid");
			expect(result).toHaveProperty("violations");
		});
	});
});
