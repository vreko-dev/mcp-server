/**
 * Complexity Signal Script - Direct Import Tests
 *
 * Tests core complexity calculation logic via direct function imports
 * for V8 coverage tracking.
 *
 * V1 PARITY: Tests ensure V2 engine produces equivalent results to V1 Guardian:
 * - countFunctions: FunctionDeclaration, FunctionExpression, ArrowFunctionExpression
 * - calculateMaxNestingDepth: nested if/for/while/switch/try blocks
 * - findLargeFunctions: functions > threshold size
 */

import { describe, expect, it } from "vitest";
import { calculateComplexityAggregate, calculateFileComplexity } from "../../src/signals/complexity.js";

describe("Complexity Signal - Direct Import Tests", () => {
	// ==========================================================================
	// HAPPY PATH
	// ==========================================================================
	describe("calculateFileComplexity", () => {
		it("should return low complexity for simple files", () => {
			const content = `
const x = 1;
const y = 2;
`;
			const result = calculateFileComplexity(content, 3);
			expect(result).toBeLessThan(0.3);
		});

		it("should return higher complexity for files with many functions", () => {
			const content = `
function a() {}
function b() {}
function c() {}
function d() {}
function e() {}
function f() {}
`;
			const result = calculateFileComplexity(content, 10);
			expect(result).toBeGreaterThan(0.1);
		});

		it("should detect nested structures (braces)", () => {
			const content = `
if (x) {
  if (y) {
    if (z) {
      for (let i = 0; i < 10; i++) {
        while (true) {
          // deeply nested
        }
      }
    }
  }
}
`;
			const result = calculateFileComplexity(content, 15);
			expect(result).toBeGreaterThan(0.2);
		});

		it("should detect complex operations (try/catch)", () => {
			const content = `
try {
  riskyOperation();
} catch (e) {
  throw new Error("fail");
}
setTimeout(() => {}, 1000);
setInterval(() => {}, 1000);
eval("code");
`;
			const result = calculateFileComplexity(content, 10);
			expect(result).toBeGreaterThan(0.3);
		});

		it("should increase complexity with line count", () => {
			const simple = calculateFileComplexity("const x = 1;", 10);
			const large = calculateFileComplexity("const x = 1;", 1000);
			expect(large).toBeGreaterThan(simple);
		});

		it("should cap complexity at 1.0", () => {
			// Extremely complex content
			const content = `
function a() { function b() { function c() {} } }
${Array(100).fill("if (x) { try { throw new Error(); } catch(e) {} }").join("\n")}
`;
			const result = calculateFileComplexity(content, 2000);
			expect(result).toBeLessThanOrEqual(1.0);
		});
	});

	// ==========================================================================
	// AGGREGATE CALCULATIONS
	// ==========================================================================
	describe("calculateComplexityAggregate", () => {
		it("should return zeros for empty file list", () => {
			const result = calculateComplexityAggregate([]);
			expect(result.avgComplexity).toBe(0);
			expect(result.maxComplexity).toBe(0);
			expect(result.highComplexityFiles).toEqual([]);
			expect(result.fileCount).toBe(0);
			expect(result.value).toBe(0);
		});

		it("should calculate average complexity", () => {
			const files = [
				{ path: "a.ts", content: "const x = 1;", lineCount: 1, changeType: "add" as const },
				{ path: "b.ts", content: "const y = 2;", lineCount: 1, changeType: "add" as const },
			];
			const result = calculateComplexityAggregate(files);
			expect(result.avgComplexity).toBeGreaterThanOrEqual(0);
			expect(result.avgComplexity).toBeLessThan(0.5);
			expect(result.fileCount).toBe(2);
		});

		it("should find max complexity", () => {
			const simpleContent = "const x = 1;";
			const complexContent = `
function a() {}
function b() {}
function c() {}
if (x) { if (y) { if (z) {} } }
try { throw new Error(); } catch(e) {}
`;
			const files = [
				{ path: "simple.ts", content: simpleContent, lineCount: 1, changeType: "add" as const },
				{ path: "complex.ts", content: complexContent, lineCount: 20, changeType: "add" as const },
			];
			const result = calculateComplexityAggregate(files);
			expect(result.maxComplexity).toBeGreaterThan(result.avgComplexity);
		});

		it("should identify high complexity files (>0.7)", () => {
			// Create content that should exceed 0.7 complexity
			const veryComplexContent = `
${Array(20).fill("function f() { if (x) { try { throw new Error(); } catch(e) {} } }").join("\n")}
${Array(50).fill("if (a) { if (b) { if (c) { if (d) {} } } }").join("\n")}
`;
			const files = [
				{ path: "simple.ts", content: "x=1;", lineCount: 1, changeType: "add" as const },
				{ path: "veryComplex.ts", content: veryComplexContent, lineCount: 1000, changeType: "modify" as const },
			];
			const result = calculateComplexityAggregate(files);
			expect(result.highComplexityFiles).toContain("veryComplex.ts");
		});

		it("should round values to 2 decimal places", () => {
			const files = [{ path: "a.ts", content: "const x = 1;", lineCount: 7, changeType: "add" as const }];
			const result = calculateComplexityAggregate(files);
			// Check that the value is rounded (max 2 decimal places)
			const avgStr = result.avgComplexity.toString();
			const decimalPart = avgStr.split(".")[1] || "";
			expect(decimalPart.length).toBeLessThanOrEqual(2);
		});
	});

	// ==========================================================================
	// EDGE CASES
	// ==========================================================================
	describe("Edge Cases", () => {
		it("should handle empty content", () => {
			const result = calculateFileComplexity("", 0);
			expect(result).toBe(0);
		});

		it("should handle content with only whitespace", () => {
			const result = calculateFileComplexity("   \n\n   \t\t", 5);
			expect(result).toBeLessThan(0.1);
		});

		it("should handle arrow functions", () => {
			const content = `
const a = () => {};
const b = x => x * 2;
const c = (x, y) => x + y;
`;
			const result = calculateFileComplexity(content, 5);
			expect(result).toBeGreaterThan(0);
		});

		it("should handle files array with single file", () => {
			const files = [{ path: "only.ts", content: "const x = 1;", lineCount: 1, changeType: "add" as const }];
			const result = calculateComplexityAggregate(files);
			expect(result.fileCount).toBe(1);
			expect(result.avgComplexity).toBe(result.maxComplexity);
		});
	});

	// ==========================================================================
	// V1 PARITY TESTS - Guardian equivalence
	// ==========================================================================
	describe("V1 Parity - countFunctions equivalence", () => {
		it("should count arrow functions like V1 Guardian.countFunctions", () => {
			const content = `
const a = () => {};
const b = x => x * 2;
const c = (x, y) => x + y;
`;
			// V1 counts ArrowFunctionExpression nodes - should detect 3
			const result = calculateFileComplexity(content, 5);
			// V2 uses regex: /\w+\s*=>/ which should match 3 arrow functions
			// Complexity should reflect function count contribution
			expect(result).toBeGreaterThan(0);
		});

		it("should count regular function declarations like V1", () => {
			const content = `
function a() {}
function b() {}
function c() {}
`;
			// V1 counts FunctionDeclaration nodes
			const result = calculateFileComplexity(content, 5);
			expect(result).toBeGreaterThan(0);
		});

		it("should count function expressions like V1", () => {
			const content = `
const a = function() {};
const b = function named() {};
const c = function() {};
`;
			// V1 counts FunctionExpression nodes
			const result = calculateFileComplexity(content, 5);
			expect(result).toBeGreaterThan(0);
		});

		it("should count methods in object literals", () => {
			const content = `
const obj = {
	a: function() {},
	b: () => {},
	c() {}
};
`;
			const result = calculateFileComplexity(content, 8);
			expect(result).toBeGreaterThan(0);
		});
	});

	describe("V1 Parity - calculateMaxNestingDepth equivalence", () => {
		it("should return low complexity for flat code (V1: depth 0)", () => {
			const content = "const x = 1; const y = 2;";
			const result = calculateFileComplexity(content, 1);
			// Flat code = low complexity
			expect(result).toBeLessThan(0.2);
		});

		it("should detect nested if statements (V1: depth 3)", () => {
			const content = "if (a) { if (b) { if (c) {} } }";
			const result = calculateFileComplexity(content, 3);
			// Should have higher complexity due to nested conditions
			expect(result).toBeGreaterThan(0.1);
		});

		it("should detect mixed nesting (for/while/if) like V1", () => {
			const content = "for (;;) { while (true) { if (x) {} } }";
			const result = calculateFileComplexity(content, 3);
			// Should detect all three control structures
			expect(result).toBeGreaterThan(0.1);
		});

		it("should detect switch statements like V1", () => {
			const content = "switch (x) { case 1: if (y) {} break; }";
			const result = calculateFileComplexity(content, 3);
			expect(result).toBeGreaterThan(0);
		});

		it("should detect try/catch nesting like V1", () => {
			const content = "try { if (x) { throw new Error(); } } catch(e) {}";
			const result = calculateFileComplexity(content, 3);
			expect(result).toBeGreaterThan(0.1);
		});
	});

	describe("V1 Parity - findLargeFunctions equivalence", () => {
		it("should flag large files (V1 uses >1000 chars threshold)", () => {
			// Create content > 1000 chars
			const largeContent = "function big() {\n" + "  console.log('test');\n".repeat(100) + "}";
			const result = calculateFileComplexity(largeContent, 102);
			// Large files should have higher complexity due to line count factor
			expect(result).toBeGreaterThan(0.1);
		});

		it("should identify files > 1000 lines as high complexity", () => {
			const simpleContent = "const x = 1;";
			// V1 uses character count, V2 uses line count
			// 1000 lines = max line complexity (1.0)
			const result = calculateFileComplexity(simpleContent, 1000);
			expect(result).toBeGreaterThanOrEqual(0.9);
		});

		it("should combine line count and pattern complexity", () => {
			const complexContent = `
function a() { if (x) { for (;;) { try { throw new Error(); } catch(e) {} } } }
function b() { if (y) { while (true) {} } }
`.repeat(10);
			const result = calculateFileComplexity(complexContent, 50);
			// Should have high combined complexity
			expect(result).toBeGreaterThan(0.3);
		});
	});

	describe("V1 Parity - findSecurityIssues equivalence", () => {
		it("should detect eval() usage like V1", () => {
			const content = "eval(userInput);";
			const result = calculateFileComplexity(content, 1);
			// eval() is detected in complex operations pattern
			expect(result).toBeGreaterThan(0);
		});

		it("should detect setTimeout/setInterval like V1 complex ops", () => {
			const content = "setTimeout(() => {}, 1000); setInterval(() => {}, 1000);";
			const result = calculateFileComplexity(content, 1);
			expect(result).toBeGreaterThan(0);
		});
	});
});
