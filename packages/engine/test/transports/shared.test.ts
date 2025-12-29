/**
 * Shared Transport Constants and Utilities Tests
 *
 * Tests for the single source of truth risk classification system
 * used across all transport adapters (CLI, MCP, HTTP).
 */

import { describe, expect, it } from "vitest";
import {
	getExitCode,
	HIGH_RISK_EXIT_THRESHOLD,
	isHighRisk,
	RISK_THRESHOLDS,
	type RiskLevel,
	scoreToRiskLevel,
} from "../../src/transports/shared";

describe("Shared Transport Constants", () => {
	describe("RISK_THRESHOLDS", () => {
		it("should export correct threshold values", () => {
			expect(RISK_THRESHOLDS.safe).toBe(1);
			expect(RISK_THRESHOLDS.low).toBe(3);
			expect(RISK_THRESHOLDS.medium).toBe(5);
			expect(RISK_THRESHOLDS.high).toBe(7);
		});

		it("should be readonly (const assertion)", () => {
			// TypeScript will prevent modification, but we verify structure
			expect(Object.keys(RISK_THRESHOLDS)).toEqual(["safe", "low", "medium", "high"]);
		});
	});

	describe("HIGH_RISK_EXIT_THRESHOLD", () => {
		it("should be set to 5", () => {
			expect(HIGH_RISK_EXIT_THRESHOLD).toBe(5);
		});

		it("should align with RISK_THRESHOLDS.medium", () => {
			expect(HIGH_RISK_EXIT_THRESHOLD).toBe(RISK_THRESHOLDS.medium);
		});
	});
});

describe("scoreToRiskLevel", () => {
	describe("boundary conditions", () => {
		it("should return 'safe' for score 0", () => {
			expect(scoreToRiskLevel(0)).toBe("safe");
		});

		it("should return 'safe' for score 1 (exact threshold)", () => {
			expect(scoreToRiskLevel(1)).toBe("safe");
		});

		it("should return 'low' for score 1.1 (just above safe)", () => {
			expect(scoreToRiskLevel(1.1)).toBe("low");
		});

		it("should return 'low' for score 3 (exact threshold)", () => {
			expect(scoreToRiskLevel(3)).toBe("low");
		});

		it("should return 'medium' for score 3.1 (just above low)", () => {
			expect(scoreToRiskLevel(3.1)).toBe("medium");
		});

		it("should return 'medium' for score 5 (exact threshold)", () => {
			expect(scoreToRiskLevel(5)).toBe("medium");
		});

		it("should return 'high' for score 5.1 (just above medium)", () => {
			expect(scoreToRiskLevel(5.1)).toBe("high");
		});

		it("should return 'high' for score 7 (exact threshold)", () => {
			expect(scoreToRiskLevel(7)).toBe("high");
		});

		it("should return 'critical' for score 7.1 (just above high)", () => {
			expect(scoreToRiskLevel(7.1)).toBe("critical");
		});

		it("should return 'critical' for score 10", () => {
			expect(scoreToRiskLevel(10)).toBe("critical");
		});
	});

	describe("typical values", () => {
		const testCases: Array<[number, RiskLevel]> = [
			[0, "safe"],
			[0.5, "safe"],
			[2, "low"],
			[4, "medium"],
			[6, "high"],
			[8, "critical"],
			[9, "critical"],
		];

		it.each(testCases)("scoreToRiskLevel(%d) should return '%s'", (score, expected) => {
			expect(scoreToRiskLevel(score)).toBe(expected);
		});
	});

	describe("edge cases", () => {
		it("should handle negative scores as safe", () => {
			expect(scoreToRiskLevel(-1)).toBe("safe");
		});

		it("should handle very large scores as critical", () => {
			expect(scoreToRiskLevel(100)).toBe("critical");
		});

		it("should handle decimal precision", () => {
			expect(scoreToRiskLevel(1.0000001)).toBe("low");
		});
	});
});

describe("isHighRisk", () => {
	it("should return false for score 0", () => {
		expect(isHighRisk(0)).toBe(false);
	});

	it("should return false for score at threshold (5)", () => {
		expect(isHighRisk(5)).toBe(false);
	});

	it("should return true for score just above threshold (5.1)", () => {
		expect(isHighRisk(5.1)).toBe(true);
	});

	it("should return true for high scores", () => {
		expect(isHighRisk(7)).toBe(true);
		expect(isHighRisk(10)).toBe(true);
	});

	it("should align with HIGH_RISK_EXIT_THRESHOLD", () => {
		expect(isHighRisk(HIGH_RISK_EXIT_THRESHOLD)).toBe(false);
		expect(isHighRisk(HIGH_RISK_EXIT_THRESHOLD + 0.1)).toBe(true);
	});
});

describe("getExitCode", () => {
	it("should return 0 for safe scores", () => {
		expect(getExitCode(0)).toBe(0);
		expect(getExitCode(1)).toBe(0);
	});

	it("should return 0 for medium scores at threshold", () => {
		expect(getExitCode(5)).toBe(0);
	});

	it("should return 1 for high-risk scores", () => {
		expect(getExitCode(5.1)).toBe(1);
		expect(getExitCode(7)).toBe(1);
		expect(getExitCode(10)).toBe(1);
	});

	it("should match isHighRisk behavior", () => {
		for (const score of [0, 2.5, 5, 5.5, 7, 10]) {
			expect(getExitCode(score)).toBe(isHighRisk(score) ? 1 : 0);
		}
	});

	it("should return typed exit codes (0 | 1)", () => {
		const exitCode: 0 | 1 = getExitCode(5);
		expect([0, 1]).toContain(exitCode);
	});
});

describe("Integration", () => {
	it("scoreToRiskLevel and isHighRisk should be consistent", () => {
		// Scores at or below medium threshold should not be high risk
		expect(isHighRisk(RISK_THRESHOLDS.medium)).toBe(false);
		expect(scoreToRiskLevel(RISK_THRESHOLDS.medium)).toBe("medium");

		// Scores above medium threshold should be high risk
		expect(isHighRisk(RISK_THRESHOLDS.medium + 0.1)).toBe(true);
		expect(scoreToRiskLevel(RISK_THRESHOLDS.medium + 0.1)).toBe("high");
	});

	it("CLI exit code should trigger on high/critical risk levels", () => {
		// High and critical levels should trigger exit code 1
		const highScore = RISK_THRESHOLDS.high;
		expect(scoreToRiskLevel(highScore)).toBe("high");
		expect(getExitCode(highScore)).toBe(1);

		const criticalScore = RISK_THRESHOLDS.high + 1;
		expect(scoreToRiskLevel(criticalScore)).toBe("critical");
		expect(getExitCode(criticalScore)).toBe(1);
	});
});
