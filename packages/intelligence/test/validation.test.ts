/**
 * ValidationPipeline Tests
 *
 * 4-path coverage:
 * - Happy path: clean code passes validation
 * - Sad path: code with violations fails validation
 * - Edge case: empty code, test files, edge patterns
 * - Error case: malformed input handling
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ValidationPipeline } from "../src/validation/ValidationPipeline.js";

describe("ValidationPipeline", () => {
	let pipeline: ValidationPipeline;

	beforeEach(() => {
		pipeline = new ValidationPipeline();
	});

	// ===========================================================================
	// HAPPY PATH: Clean code passes validation
	// ===========================================================================

	describe("Happy Path", () => {
		it("should pass validation for clean production code", async () => {
			const cleanCode = `
import { logger } from "@snapback/core";
import type { User } from "@snapback/contracts";

export async function getUser(id: string): Promise<User | null> {
  logger.info("Fetching user", { id });
  return db.users.findById(id);
}
`;
			const result = await pipeline.validate(cleanCode, "apps/api/src/services/user.ts");

			expect(result.overall.passed).toBe(true);
			expect(result.overall.confidence).toBeGreaterThanOrEqual(0.7);
			expect(result.recommendation).toBe("auto_merge");
		});

		it("should have 7 layers registered", () => {
			const layers = pipeline.getLayerNames();
			expect(layers).toHaveLength(7);
			expect(layers).toEqual([
				"syntax",
				"types",
				"tests",
				"architecture",
				"security",
				"dependencies",
				"performance",
			]);
		});

		it("should calculate high confidence for zero issues", async () => {
			const result = await pipeline.validate("const x = 1;", "src/utils.ts");
			expect(result.overall.confidence).toBe(0.95);
		});
	});

	// ===========================================================================
	// SAD PATH: Code with violations fails validation
	// ===========================================================================

	describe("Sad Path", () => {
		it("should detect layer boundary violation in vscode extension", async () => {
			const violatingCode = `
import { db } from "@snapback/infrastructure";

export function createSnapshot() {
  return db.query("SELECT * FROM snapshots");
}
`;
			const result = await pipeline.validate(violatingCode, "apps/vscode/src/snapshot.ts");

			expect(result.overall.passed).toBe(false);
			expect(result.focusPoints).toContain("Presentation layer cannot import @snapback/infrastructure");
		});

		it("should detect eval() as security risk", async () => {
			const insecureCode = `
function execute(code: string) {
  return eval(code);
}
`;
			const result = await pipeline.validate(insecureCode, "src/executor.ts");

			expect(result.overall.passed).toBe(false);
			const securityIssues = result.layers.find((l) => l.layer === "security");
			expect(securityIssues?.issues.some((i) => i.type === "UNSAFE_EVAL")).toBe(true);
		});

		it("should detect vague assertions in test files", async () => {
			const vagueTests = `
import { describe, it, expect } from "vitest";

describe("User", () => {
  it("should exist", () => {
    const user = getUser("123");
    expect(user).toBeTruthy();
    expect(user).toBeDefined();
  });
});
`;
			const result = await pipeline.validate(vagueTests, "test/user.test.ts");

			const testLayer = result.layers.find((l) => l.layer === "tests");
			expect(testLayer?.issues.some((i) => i.type === "VAGUE_ASSERTION")).toBe(true);
		});

		it("should flag console.log in production code", async () => {
			const debugCode = `
export function doSomething() {
  console.log("debug");
  return true;
}
`;
			const result = await pipeline.validate(debugCode, "apps/api/src/service.ts");

			const perfLayer = result.layers.find((l) => l.layer === "performance");
			expect(perfLayer?.issues.some((i) => i.type === "NO_CONSOLE")).toBe(true);
		});
	});

	// ===========================================================================
	// EDGE CASES: Boundary conditions
	// ===========================================================================

	describe("Edge Cases", () => {
		it("should handle empty code", async () => {
			const result = await pipeline.validate("", "src/empty.ts");

			expect(result.overall.totalIssues).toBe(0);
			expect(result.overall.passed).toBe(true);
		});

		it("should allow console.log in test files", async () => {
			const testCode = `
console.log("test debug");
`;
			const result = await pipeline.validate(testCode, "test/debug.test.ts");

			const perfLayer = result.layers.find((l) => l.layer === "performance");
			expect(perfLayer?.issues.some((i) => i.type === "NO_CONSOLE")).toBe(false);
		});

		it("should allow console.log in scripts", async () => {
			const scriptCode = `
console.log("script output");
`;
			const result = await pipeline.validate(scriptCode, "scripts/build.ts");

			const perfLayer = result.layers.find((l) => l.layer === "performance");
			expect(perfLayer?.issues.some((i) => i.type === "NO_CONSOLE")).toBe(false);
		});

		it("should detect mismatched braces", async () => {
			const badSyntax = `
function test() {
  if (true) {
    return 1;
  // missing closing brace
}
`;
			const result = await pipeline.validate(badSyntax, "src/broken.ts");

			const syntaxLayer = result.layers.find((l) => l.layer === "syntax");
			expect(syntaxLayer?.issues.some((i) => i.type === "SYNTAX_ERROR")).toBe(true);
		});

		it("should detect excessive any types", async () => {
			const anyCode = `
const a: any = 1;
const b: any = 2;
function f(x: any): any { return x; }
`;
			const result = await pipeline.validate(anyCode, "src/loose.ts");

			const typeLayer = result.layers.find((l) => l.layer === "types");
			expect(typeLayer?.issues.some((i) => i.type === "TYPE_SAFETY_BYPASS")).toBe(true);
		});
	});

	// ===========================================================================
	// ERROR CASES: Unexpected failures
	// ===========================================================================

	describe("Error Cases", () => {
		it("should handle null code gracefully", async () => {
			// TypeScript would catch this, but testing runtime behavior
			const result = await pipeline.validate(null as unknown as string, "src/file.ts");

			// Should not throw, may have issues but should complete
			expect(result).toBeDefined();
			expect(result.layers).toHaveLength(7);
		});

		it("should handle undefined filePath gracefully", async () => {
			const result = await pipeline.validate("const x = 1;", undefined as unknown as string);

			expect(result).toBeDefined();
		});

		it("should run all layers even if one fails", async () => {
			// Code that might cause issues in some layers
			const trickyCode = `
export function test(): any {
  console.log("debug");
  eval("danger");
  return null!;
}
`;
			const result = await pipeline.validate(trickyCode, "src/tricky.ts");

			// All 7 layers should still report
			expect(result.layers).toHaveLength(7);
			expect(result.layers.every((l) => l.duration >= 0)).toBe(true);
		});

		it("should return full_review for critical issues", async () => {
			const criticalCode = `
import { db } from "@snapback/infrastructure";
eval("dangerous");
`;
			const result = await pipeline.validate(criticalCode, "apps/vscode/src/bad.ts");

			expect(result.recommendation).toBe("full_review");
			expect(result.overall.confidence).toBeLessThan(0.2);
		});
	});

	// ===========================================================================
	// STATIC HELPERS
	// ===========================================================================

	describe("Static Helpers", () => {
		it("should flatten issues from result", async () => {
			const code = `
const x: any = 1;
console.log(x);
`;
			const result = await pipeline.validate(code, "src/test.ts");

			const flattened = ValidationPipeline.flattenIssues(result);
			expect(Array.isArray(flattened)).toBe(true);
			expect(flattened.length).toBe(result.overall.totalIssues);
		});

		it("should filter issues by severity", async () => {
			const code = `
import { db } from "@snapback/infrastructure";
eval("danger");
`;
			const result = await pipeline.validate(code, "apps/vscode/src/bad.ts");

			const critical = ValidationPipeline.getIssuesBySeverity(result, "critical");
			expect(critical.every((i) => i.severity === "critical")).toBe(true);
		});
	});
});
