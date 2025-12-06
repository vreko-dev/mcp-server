import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/index";

describe("evaluatePolicy", () => {
	it("should return block action when critical issues are found", () => {
		const mockSarif = {
			runs: [
				{
					results: [{ severity: "critical" }, { severity: "high" }],
				},
			],
		};

		const result = evaluatePolicy(mockSarif);
		expect(result.action).toBe("block");
		expect(result.reason).toContain("Critical issues (1) found");
		expect(result.details).toEqual({
			critical: 1,
			high: 1,
			medium: 0,
			low: 0,
		});
	});

	it("should return review action when high issues are found", () => {
		const mockSarif = {
			runs: [
				{
					results: [{ severity: "high" }, { severity: "medium" }],
				},
			],
		};

		const result = evaluatePolicy(mockSarif);
		expect(result.action).toBe("review");
		expect(result.reason).toContain("High severity issues (1) found");
		expect(result.details).toEqual({
			critical: 0,
			high: 1,
			medium: 1,
			low: 0,
		});
	});

	it("should return apply action when no critical or high issues are found", () => {
		const mockSarif = {
			runs: [
				{
					results: [{ severity: "medium" }, { severity: "low" }],
				},
			],
		};

		const result = evaluatePolicy(mockSarif);
		expect(result.action).toBe("apply");
		expect(result.reason).toContain("Total issues: 2");
		expect(result.details).toEqual({
			critical: 0,
			high: 0,
			medium: 1,
			low: 1,
		});
	});
});
