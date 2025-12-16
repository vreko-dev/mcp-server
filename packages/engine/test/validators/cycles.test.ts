/**
 * Cycles Validator Script - Direct Import Tests
 *
 * Tests core cycles validation logic via direct function imports
 * for V8 coverage tracking.
 */

import { describe, expect, it } from "vitest";
import { formatCycle, validateCycles } from "../../src/validators/cycles.js";

describe("Cycles Validator - Direct Import Tests", () => {
	// ==========================================================================
	// FORMAT CYCLE
	// ==========================================================================
	describe("formatCycle", () => {
		it("should format a simple cycle with arrows", () => {
			const cycle = ["a.ts", "b.ts", "a.ts"];
			const result = formatCycle(cycle);
			expect(result).toBe("a.ts → b.ts → a.ts");
		});

		it("should handle single-file cycle", () => {
			const cycle = ["a.ts"];
			const result = formatCycle(cycle);
			expect(result).toBe("a.ts");
		});

		it("should handle empty cycle", () => {
			const result = formatCycle([]);
			expect(result).toBe("");
		});

		it("should handle long cycles", () => {
			const cycle = ["a.ts", "b.ts", "c.ts", "d.ts", "a.ts"];
			const result = formatCycle(cycle);
			expect(result).toBe("a.ts → b.ts → c.ts → d.ts → a.ts");
		});
	});

	// ==========================================================================
	// VALIDATE CYCLES
	// ==========================================================================
	describe("validateCycles", () => {
		it("should pass when no cycles exist", () => {
			const result = validateCycles([]);
			expect(result.passed).toBe(true);
			expect(result.cycles).toEqual([]);
			expect(result.errors).toEqual([]);
		});

		it("should fail when cycles exist", () => {
			const cycles = [["a.ts", "b.ts", "a.ts"]];
			const result = validateCycles(cycles);
			expect(result.passed).toBe(false);
			expect(result.cycles).toEqual(cycles);
			expect(result.errors.length).toBe(1);
			expect(result.errors[0].message).toContain("Circular dependency");
			expect(result.errors[0].severity).toBe("error");
		});

		it("should include all cycles in errors", () => {
			const cycles = [
				["a.ts", "b.ts", "a.ts"],
				["c.ts", "d.ts", "c.ts"],
			];
			const result = validateCycles(cycles);
			expect(result.errors.length).toBe(2);
			expect(result.errors[0].message).toContain("a.ts");
			expect(result.errors[1].message).toContain("c.ts");
		});

		it("should include suggestion for breaking cycles", () => {
			const cycles = [["a.ts", "b.ts", "a.ts"]];
			const result = validateCycles(cycles);
			expect(result.suggestion).toBeDefined();
			expect(result.suggestion).toContain("Extract shared logic");
		});
	});

	// ==========================================================================
	// EDGE CASES
	// ==========================================================================
	describe("Edge Cases", () => {
		it("should handle self-reference cycles", () => {
			const cycles = [["a.ts", "a.ts"]];
			const result = validateCycles(cycles);
			expect(result.passed).toBe(false);
			expect(result.errors[0].message).toContain("a.ts → a.ts");
		});

		it("should handle very long cycle chains", () => {
			const longCycle = Array.from({ length: 10 }, (_, i) => `file${i}.ts`);
			longCycle.push(longCycle[0]);
			const result = validateCycles([longCycle]);
			expect(result.passed).toBe(false);
			expect(result.errors[0].message).toContain("file0.ts");
		});
	});
});
