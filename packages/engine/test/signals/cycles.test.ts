/**
 * Cycles Signal Script - Direct Import Tests
 *
 * Tests core cycles analysis logic via direct function imports
 * for V8 coverage tracking.
 */

import { describe, expect, it } from "vitest";
import { analyzeCycles, getAffectedFiles } from "../../src/signals/cycles.js";

describe("Cycles Signal - Direct Import Tests", () => {
	// ==========================================================================
	// HAPPY PATH
	// ==========================================================================
	describe("getAffectedFiles", () => {
		it("should return all files affected by cycles", () => {
			const cycles = [
				["a.ts", "b.ts", "a.ts"],
				["c.ts", "d.ts", "e.ts", "c.ts"],
			];
			const result = getAffectedFiles(cycles);
			expect(result).toContain("a.ts");
			expect(result).toContain("b.ts");
			expect(result).toContain("c.ts");
			expect(result).toContain("d.ts");
			expect(result).toContain("e.ts");
		});

		it("should return empty array for no cycles", () => {
			const result = getAffectedFiles([]);
			expect(result).toEqual([]);
		});

		it("should deduplicate files appearing in multiple cycles", () => {
			const cycles = [
				["a.ts", "b.ts", "a.ts"],
				["a.ts", "c.ts", "a.ts"],
			];
			const result = getAffectedFiles(cycles);
			// a.ts should appear once, not multiple times
			const aCount = result.filter((f) => f === "a.ts").length;
			expect(aCount).toBe(1);
		});
	});

	// ==========================================================================
	// AGGREGATE ANALYSIS
	// ==========================================================================
	describe("analyzeCycles", () => {
		it("should return complete analysis for cycles", () => {
			const cycles = [["a.ts", "b.ts", "a.ts"]];
			const result = analyzeCycles(cycles);
			expect(result.cycles).toEqual(cycles);
			expect(result.affectedFiles).toContain("a.ts");
			expect(result.affectedFiles).toContain("b.ts");
			expect(result.cycleCount).toBe(1);
		});

		it("should return zeros for no cycles", () => {
			const result = analyzeCycles([]);
			expect(result.cycles).toEqual([]);
			expect(result.affectedFiles).toEqual([]);
			expect(result.cycleCount).toBe(0);
		});

		it("should count multiple cycles correctly", () => {
			const cycles = [
				["a.ts", "b.ts", "a.ts"],
				["c.ts", "d.ts", "c.ts"],
				["e.ts", "f.ts", "g.ts", "e.ts"],
			];
			const result = analyzeCycles(cycles);
			expect(result.cycleCount).toBe(3);
		});
	});

	// ==========================================================================
	// EDGE CASES
	// ==========================================================================
	describe("Edge Cases", () => {
		it("should handle single-file cycles (self-reference)", () => {
			const cycles = [["a.ts", "a.ts"]];
			const result = getAffectedFiles(cycles);
			expect(result).toContain("a.ts");
			expect(result.length).toBe(1);
		});

		it("should handle very long cycles", () => {
			const longCycle = Array.from({ length: 20 }, (_, i) => `file${i}.ts`);
			longCycle.push(longCycle[0]); // close the cycle
			const result = getAffectedFiles([longCycle]);
			expect(result.length).toBe(20);
		});

		it("should handle empty cycle array", () => {
			const cycles = [[]];
			const result = getAffectedFiles(cycles);
			expect(result).toEqual([]);
		});
	});
});
