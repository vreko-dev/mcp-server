import { describe, expect, it } from "vitest";
import { ABTest } from "@snapback-core/detection/validation/ABTest";

describe("ABTest", () => {
	it("should run A/B test with perfect match", () => {
		// Define baseline and candidate implementations
		const baselineImpl = (data: any) => data;
		const candidateImpl = (data: any) => data;

		const abTest = new ABTest(baselineImpl, candidateImpl);

		// Create test data
		const testData = new Map<string, any>();
		const testResult = { score: 0.8, factors: ["test factor"] };
		testData.set("test1", testResult);

		const comparison = abTest.run(testData);

		expect(comparison.totalTests).toBe(1);
		expect(comparison.matches).toBe(1);
		expect(comparison.mismatchRate).toBe(0);
		expect(comparison.parity).toBe(1);
		expect(comparison.details).toHaveLength(1);
		expect(comparison.details[0]).toEqual({
			testId: "test1",
			baseline: testResult,
			candidate: testResult,
			match: true,
		});
	});

	it("should run A/B test with mismatch", () => {
		// Define baseline and candidate implementations that return different results
		const baselineImpl = (_data: any) => ({ score: 0.8, factors: ["baseline factor"] });
		const candidateImpl = (_data: any) => ({ score: 0.9, factors: ["candidate factor"] });

		const abTest = new ABTest(baselineImpl, candidateImpl);

		// Create test data
		const testData = new Map<string, any>();
		testData.set("test1", { input: "data" });

		const comparison = abTest.run(testData);

		expect(comparison.totalTests).toBe(1);
		expect(comparison.matches).toBe(0);
		expect(comparison.mismatchRate).toBe(1);
		expect(comparison.parity).toBe(0);
		expect(comparison.details[0].match).toBe(false);
	});

	it("should run A/B test with multiple tests", () => {
		// Define baseline and candidate implementations
		const baselineImpl = (data: any) => data.baseline;
		const candidateImpl = (data: any) => data.candidate;

		const abTest = new ABTest(baselineImpl, candidateImpl);

		// Create test data
		const testData = new Map<string, any>();
		testData.set("test1", {
			baseline: { score: 0.8, factors: ["factor1"] },
			candidate: { score: 0.8, factors: ["factor1"] },
		});
		testData.set("test2", {
			baseline: { score: 0.6, factors: ["factor2"] },
			candidate: { score: 0.7, factors: ["factor2_modified"] },
		});

		const comparison = abTest.run(testData);

		expect(comparison.totalTests).toBe(2);
		expect(comparison.matches).toBe(1); // test1 matches, test2 doesn't
		expect(comparison.mismatchRate).toBe(0.5);
		expect(comparison.parity).toBe(0.5);
		expect(comparison.details).toHaveLength(2);
	});

	it("should handle empty test data", () => {
		const baselineImpl = (data: any) => data;
		const candidateImpl = (data: any) => data;

		const abTest = new ABTest(baselineImpl, candidateImpl);

		// Create empty test data
		const testData = new Map<string, any>();

		const comparison = abTest.run(testData);

		expect(comparison.totalTests).toBe(0);
		expect(comparison.matches).toBe(0);
		expect(comparison.mismatchRate).toBe(0);
		expect(comparison.parity).toBe(1); // No tests means perfect parity
		expect(comparison.details).toHaveLength(0);
	});

	it("should check if parity meets threshold", () => {
		// Perfect match case
		const baselineImpl = (data: any) => data;
		const candidateImpl = (data: any) => data;

		const abTest = new ABTest(baselineImpl, candidateImpl);

		// Create test data with perfect match
		const testData = new Map<string, any>();
		const perfectResult = { score: 0.8, factors: ["perfect"] };
		testData.set("test1", perfectResult);

		expect(abTest.meetsParity(testData, 0.999)).toBe(true);
		expect(abTest.meetsParity(testData, 1.0)).toBe(true);

		// Test with mismatch
		const baselineImpl2 = (_data: any) => ({ score: 0.8, factors: ["baseline"] });
		const candidateImpl2 = (_data: any) => ({ score: 0.9, factors: ["candidate"] });

		const abTest2 = new ABTest(baselineImpl2, candidateImpl2);

		const testData2 = new Map<string, any>();
		testData2.set("test1", { input: "data" });

		expect(abTest2.meetsParity(testData2, 0.999)).toBe(false);
		expect(abTest2.meetsParity(testData2, 0.5)).toBe(false); // Still doesn't meet because parity is 0

		// Test with 50% match rate
		const baselineImpl3 = (data: any) => data.baseline;
		const candidateImpl3 = (data: any) => data.candidate;

		const abTest3 = new ABTest(baselineImpl3, candidateImpl3);

		const testData3 = new Map<string, any>();
		testData3.set("test1", {
			baseline: { score: 0.8, factors: ["match"] },
			candidate: { score: 0.8, factors: ["match"] },
		});
		testData3.set("test2", {
			baseline: { score: 0.6, factors: ["no match"] },
			candidate: { score: 0.7, factors: ["different"] },
		});

		expect(abTest3.meetsParity(testData3, 0.4)).toBe(true); // 50% parity meets 40% threshold
		expect(abTest3.meetsParity(testData3, 0.6)).toBe(false); // 50% parity doesn't meet 60% threshold
	});

	it("should handle factor sorting in comparison", () => {
		const baselineImpl = (data: any) => data;
		const candidateImpl = (data: any) => data;

		const abTest = new ABTest(baselineImpl, candidateImpl);

		// Create test data
		const testData = new Map<string, any>();
		const baselineResult = { score: 0.8, factors: ["factor2", "factor1"] };
		const _candidateResult = { score: 0.8, factors: ["factor1", "factor2"] };
		testData.set("test1", baselineResult);

		const comparison = abTest.run(testData);

		// Should match because factors are sorted before comparison
		expect(comparison.matches).toBe(1);
		expect(comparison.mismatchRate).toBe(0);
		expect(comparison.parity).toBe(1);
	});
});
