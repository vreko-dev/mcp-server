import { describe, expect, it } from "vitest";
import { DependencyAnalyzer, isMajorBump } from "../src/dependency-analyzer.js";

describe("DependencyAnalyzer", () => {
	describe("quickAnalyze", () => {
		it("should return low score for no changes", () => {
			const analyzer = new DependencyAnalyzer();
			const before = { dependencies: { react: "1.0.0" } };
			const after = { dependencies: { react: "1.0.0" } };

			const result = analyzer.quickAnalyze(before, after);

			expect(result.score).toBe(0);
			expect(result.breaking).toEqual([]);
		});

		it("should detect major version bumps", () => {
			const analyzer = new DependencyAnalyzer();
			const before = { dependencies: { react: "1.0.0" } };
			const after = { dependencies: { react: "2.0.0" } };

			const result = analyzer.quickAnalyze(before, after);

			expect(result.score).toBeGreaterThanOrEqual(0.7);
			expect(result.breaking).toContain("react:1.0.0→2.0.0");
		});

		it("should handle multiple dependencies", () => {
			const analyzer = new DependencyAnalyzer();
			const before = {
				dependencies: {
					react: "1.0.0",
					vue: "2.5.0",
					angular: "8.0.0",
				},
			};
			const after = {
				dependencies: {
					react: "1.0.0", // No change
					vue: "3.0.0", // Major bump
					angular: "8.2.0", // Minor bump
				},
			};

			const result = analyzer.quickAnalyze(before, after);

			expect(result.score).toBeGreaterThanOrEqual(0.7);
			expect(result.breaking).toContain("vue:2.5.0→3.0.0");
			expect(result.breaking).toHaveLength(1); // Only vue should be detected
		});

		it("should handle new dependencies", () => {
			const analyzer = new DependencyAnalyzer();
			const before = { dependencies: { react: "1.0.0" } };
			const after = {
				dependencies: {
					react: "1.0.0",
					vue: "3.0.0", // New dependency
				},
			};

			const result = analyzer.quickAnalyze(before, after);

			expect(result.score).toBe(0); // New dependencies don't count as breaking
			expect(result.breaking).toEqual([]);
		});

		it("should handle missing before dependencies", () => {
			const analyzer = new DependencyAnalyzer();
			const before = {};
			const after = { dependencies: { react: "1.0.0" } };

			const result = analyzer.quickAnalyze(before, after);

			expect(result.score).toBe(0);
			expect(result.breaking).toEqual([]);
		});
	});

	describe("isMajorBump", () => {
		it("should detect major version bumps", () => {
			expect(isMajorBump("1.0.0", "2.0.0")).toBe(true);
			expect(isMajorBump("v1.0.0", "v2.0.0")).toBe(true);
			expect(isMajorBump("1.5.0", "2.0.0")).toBe(true);
		});

		it("should not detect minor/patch bumps as major", () => {
			expect(isMajorBump("1.0.0", "1.1.0")).toBe(false);
			expect(isMajorBump("1.0.0", "1.0.1")).toBe(false);
			expect(isMajorBump("1.2.3", "1.2.4")).toBe(false);
		});

		it("should handle edge cases", () => {
			expect(isMajorBump("1.0.0", "1.0.0")).toBe(false); // Same version
			expect(isMajorBump("", "1.0.0")).toBe(true); // Empty to version
			expect(isMajorBump("1.0.0", "")).toBe(false); // Version to empty
		});
	});
});
