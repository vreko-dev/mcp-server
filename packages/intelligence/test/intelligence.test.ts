/**
 * Intelligence Facade Integration Tests
 *
 * 4-path coverage for the main Intelligence class:
 * - Happy path: normal operations succeed
 * - Sad path: expected failures handled
 * - Edge case: boundary conditions
 * - Error case: unexpected failures
 */

import * as fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Intelligence } from "../src/Intelligence.js";

describe("Intelligence", () => {
	let tempDir: string;
	let intel: Intelligence;

	beforeEach(async () => {
		// Create temp directory with test files
		tempDir = await mkdtemp(path.join(tmpdir(), "intel-test-"));

		// Create required directories
		fs.mkdirSync(path.join(tempDir, "patterns"), { recursive: true });
		fs.mkdirSync(path.join(tempDir, "feedback"), { recursive: true });

		// Create test context files
		fs.writeFileSync(
			path.join(tempDir, "CONSTRAINTS.md"),
			`
## Hard Rules

### C-001: No console.log
console.log MUST not appear in production code

### C-002: Layer Boundaries
Presentation layer CANNOT import Infrastructure layer
`,
		);

		fs.writeFileSync(
			path.join(tempDir, "patterns", "codebase-patterns.md"),
			`
## Test Patterns

### Use specific assertions
Always use .toEqual() instead of .toBeTruthy()
`,
		);

		fs.writeFileSync(path.join(tempDir, "ARCHITECTURE.md"), "# Architecture\n\nTest architecture doc.");

		intel = new Intelligence({
			rootDir: tempDir,
			enableSemanticSearch: false,
			enableLearningLoop: true,
		});
	});

	afterEach(async () => {
		await intel.dispose();
		await rm(tempDir, { recursive: true });
	});

	// ===========================================================================
	// HAPPY PATH: Normal operations succeed
	// ===========================================================================

	describe("Happy Path", () => {
		it("should initialize without errors", async () => {
			await expect(intel.initialize()).resolves.not.toThrow();
		});

		it("should get context for a task", async () => {
			const result = await intel.getContext({
				task: "Add authentication to the API",
				keywords: ["auth", "api"],
			});

			expect(result).toBeDefined();
			expect(result.task).toBe("Add authentication to the API");
			expect(result.hardRules).toContain("Hard Rules");
		});

		it("should validate clean code successfully", async () => {
			const cleanCode = `
import { logger } from "@snapback/core";

export function greet(name: string): string {
  logger.info("Greeting", { name });
  return "Hello " + name;
}
`;
			const result = await intel.checkPatterns(cleanCode, "apps/api/src/greet.ts");

			expect(result.overall.passed).toBe(true);
			expect(result.recommendation).toBe("auto_merge");
		});

		it("should report violations and track count", async () => {
			const status1 = await intel.reportViolation({
				type: "TEST_VIOLATION",
				file: "test.ts",
				message: "Test violation",
				reason: "Testing",
				prevention: "Don't do it",
			});

			expect(status1.id).toBeDefined();
			expect(status1.count).toBe(1);
			expect(status1.shouldPromote).toBe(false);

			// Report same type again
			const status2 = await intel.reportViolation({
				type: "TEST_VIOLATION",
				file: "test2.ts",
				message: "Test violation again",
				reason: "Testing",
				prevention: "Don't do it",
			});

			expect(status2.count).toBe(2);
		});

		it("should record and query learnings", async () => {
			await intel.recordLearning({
				type: "pattern",
				trigger: "vitest config",
				action: "use @snapback/vitest-config preset",
				source: "test-session",
			});

			const learnings = intel.queryLearnings(["vitest"]);
			expect(learnings.length).toBeGreaterThan(0);
			expect(learnings[0].action).toContain("vitest-config");
		});
	});

	// ===========================================================================
	// SAD PATH: Expected failures handled
	// ===========================================================================

	describe("Sad Path", () => {
		it("should fail validation for code with violations", async () => {
			const badCode = `
import { db } from "@snapback/infrastructure";

export function query() {
  console.log("querying");
  return eval("bad");
}
`;
			const result = await intel.checkPatterns(badCode, "apps/vscode/src/bad.ts");

			expect(result.overall.passed).toBe(false);
			expect(result.recommendation).toBe("full_review");
			expect(result.focusPoints.length).toBeGreaterThan(0);
		});

		it("should throw when semantic search not enabled", async () => {
			await expect(intel.semanticSearch("test query")).rejects.toThrow("Semantic search not enabled");
		});

		it("should return empty learnings for unknown keywords", () => {
			const learnings = intel.queryLearnings(["xyznonexistent123"]);
			expect(learnings).toEqual([]);
		});

		it("should handle feedback for non-existent interaction", async () => {
			const result = await intel.recordFeedback("nonexistent-id", {
				correct: true,
				confidence: 0.9,
			});

			expect(result.updated).toBe(false);
			expect(result.addedToGolden).toBe(false);
		});
	});

	// ===========================================================================
	// EDGE CASES: Boundary conditions
	// ===========================================================================

	describe("Edge Cases", () => {
		it("should handle empty task description", async () => {
			const result = await intel.getContext({
				task: "",
			});

			expect(result).toBeDefined();
			expect(result.task).toBe("");
		});

		it("should handle context with no matching keywords", async () => {
			const result = await intel.getContext({
				task: "Do something completely unrelated",
				keywords: ["xyznonexistent"],
			});

			expect(result).toBeDefined();
			// Should still return some context (fallback)
			expect(result.hint).toContain("No specific patterns found");
		});

		it("should promote violation at 3x threshold", async () => {
			// Report same violation 3 times
			for (let i = 0; i < 3; i++) {
				await intel.reportViolation({
					type: "PROMOTION_TEST",
					file: `file${i}.ts`,
					message: "Repeat violation",
					reason: "Testing promotion",
					prevention: "Fix it",
				});
			}

			const summary = intel.getViolationsSummary();
			const testViolation = summary.byType.find((v) => v.type === "PROMOTION_TEST");

			expect(testViolation?.count).toBe(3);
			expect(testViolation?.status).toBe("promoted");
		});

		it("should get static context for caching", () => {
			const staticContext = intel.getStaticContext();

			expect(staticContext).toBeDefined();
			expect(staticContext.architecture).toBeDefined();
			expect(staticContext.constraints).toContain("Hard Rules");
			expect(staticContext.timestamp).toBeDefined();
		});
	});

	// ===========================================================================
	// ERROR CASES: Unexpected failures
	// ===========================================================================

	describe("Error Cases", () => {
		it("should handle missing ARCHITECTURE.md gracefully", async () => {
			// Remove the file
			fs.unlinkSync(path.join(tempDir, "ARCHITECTURE.md"));

			const result = await intel.getContext({
				task: "Test task",
			});

			// Should not throw, just return empty architecture
			expect(result).toBeDefined();
		});

		it("should handle corrupted violations file", async () => {
			// Write invalid JSON
			fs.writeFileSync(path.join(tempDir, "patterns", "violations.jsonl"), "not valid json\n");

			// Should not throw when reading
			const summary = intel.getViolationsSummary();
			expect(summary.total).toBe(0);
		});

		it("should handle double initialization", async () => {
			await intel.initialize();
			await expect(intel.initialize()).resolves.not.toThrow();
		});

		it("should handle double dispose", async () => {
			await intel.dispose();
			await expect(intel.dispose()).resolves.not.toThrow();
		});
	});

	// ===========================================================================
	// STATISTICS AND REPORTING
	// ===========================================================================

	describe("Statistics", () => {
		it("should return learning stats", () => {
			const stats = intel.getStats();

			expect(stats).toBeDefined();
			expect(stats.totalInteractions).toBeGreaterThanOrEqual(0);
			expect(stats.goldenExamples).toBeGreaterThanOrEqual(0);
		});

		it("should log and track interactions", async () => {
			const interaction = await intel.logInteraction({
				query: "How do I add tests?",
				contextUsed: ["CONSTRAINTS.md"],
				toolsCalled: ["get_context"],
				output: "Use vitest with specific assertions",
				confidence: 0.85,
			});

			expect(interaction.id).toBeDefined();
			expect(interaction.timestamp).toBeDefined();
		});
	});
});
