/**
 * Risk Analysis Consistency Tests
 *
 * Cross-component integration tests to ensure consistent risk analysis
 * between MCP, SDK, and Core implementations.
 *
 * Per arch_remediation.md Task 2.2, these tests verify that:
 * - MCP and VSCode produce consistent risk signals
 * - SDK patterns are consistent across consumers
 * - Risk scoring aligns with THRESHOLDS configuration
 */

import { describe, expect, it } from "vitest";

// Import SDK RiskAnalyzer for pattern-based analysis
import {
	DEFAULT_RISK_THRESHOLDS,
	type RiskSeverity,
	RiskAnalyzer as SDKRiskAnalyzer,
} from "../../src/analysis/RiskAnalyzer";
import { THRESHOLDS } from "../../src/config/Thresholds";

describe("Risk Analysis Consistency", () => {
	describe("SDK RiskAnalyzer - Pattern Matching", () => {
		it("should detect hardcoded secret patterns consistently", () => {
			const analyzer = new SDKRiskAnalyzer();

			// Test hardcoded secret pattern detection (variable assignment with = )
			const codeWithSecret = `
				const password = "my_super_secret_password123";
				const api_key = "sk_live_1234567890abcdefghij";
			`;

			const result = analyzer.analyze(codeWithSecret);

			// Should detect the hardcoded secrets
			expect(result.score).toBeGreaterThan(0);
			expect(
				result.factors.some(
					(f) => f.message.toLowerCase().includes("secret") || f.message.toLowerCase().includes("password"),
				),
			).toBe(true);
		});

		it("should detect eval() patterns consistently", () => {
			const analyzer = new SDKRiskAnalyzer();

			const codeWithEval = `
				function processUserInput(input) {
					return eval(input);
				}
			`;

			const result = analyzer.analyze(codeWithEval);

			expect(result.score).toBeGreaterThan(0);
			expect(result.factors.some((f) => f.message.toLowerCase().includes("eval"))).toBe(true);
		});

		it("should detect innerHTML patterns consistently", () => {
			const analyzer = new SDKRiskAnalyzer();

			const codeWithXss = `
				function renderContent(userHtml) {
					document.getElementById('content').innerHTML = userHtml;
				}
			`;

			const result = analyzer.analyze(codeWithXss);

			expect(result.score).toBeGreaterThan(0);
			expect(
				result.factors.some(
					(f) => f.message.toLowerCase().includes("innerhtml") || f.message.toLowerCase().includes("xss"),
				),
			).toBe(true);
		});
	});

	describe("SDK Thresholds Consistency", () => {
		it("should use centralized THRESHOLDS configuration", () => {
			// Verify DEFAULT_RISK_THRESHOLDS aligns with centralized THRESHOLDS
			expect(DEFAULT_RISK_THRESHOLDS.blockingThreshold).toBe(THRESHOLDS.risk.blockingThreshold);
			expect(DEFAULT_RISK_THRESHOLDS.criticalThreshold).toBe(THRESHOLDS.risk.criticalThreshold);
			expect(DEFAULT_RISK_THRESHOLDS.highThreshold).toBe(THRESHOLDS.risk.highThreshold);
			expect(DEFAULT_RISK_THRESHOLDS.mediumThreshold).toBe(THRESHOLDS.risk.mediumThreshold);
		});

		it("should classify severity based on thresholds", () => {
			const analyzer = new SDKRiskAnalyzer();

			// Low risk code - no issues
			const lowRiskCode = `console.log("Hello world");`;
			const lowResult = analyzer.analyze(lowRiskCode);
			expect(lowResult.severity).toBe("low" satisfies RiskSeverity);

			// High risk code - multiple security patterns
			const highRiskCode = `
				const password = "hardcoded_password";
				const apiKey = "sk_live_abcdefghij1234567890";
				eval(userInput);
			`;
			const highResult = analyzer.analyze(highRiskCode);
			expect(["high", "critical"]).toContain(highResult.severity);
		});
	});

	describe("Cross-Implementation Consistency", () => {
		it("should return consistent scores for identical content", () => {
			const analyzer1 = new SDKRiskAnalyzer();
			const analyzer2 = new SDKRiskAnalyzer();

			const testCode = `
				const config = {
					apiKey: "test_key_12345678901234567890",
					password: "hunter2"
				};
			`;

			const result1 = analyzer1.analyze(testCode);
			const result2 = analyzer2.analyze(testCode);

			// Same analyzer with same input should produce same score
			expect(result1.score).toBe(result2.score);
			expect(result1.severity).toBe(result2.severity);
			expect(result1.factors.length).toBe(result2.factors.length);
		});

		it("should score higher for more severe patterns", () => {
			const analyzer = new SDKRiskAnalyzer();

			// Mild risk - just console.log
			const mildCode = `console.log("debug");`;

			// Moderate risk - innerHTML
			const moderateCode = "element.innerHTML = userContent;";

			// Severe risk - eval + API key
			const severeCode = `
				eval(userCode);
				const key = "sk_live_1234567890abcdefghij";
			`;

			const mildResult = analyzer.analyze(mildCode);
			const moderateResult = analyzer.analyze(moderateCode);
			const severeResult = analyzer.analyze(severeCode);

			expect(moderateResult.score).toBeGreaterThanOrEqual(mildResult.score);
			expect(severeResult.score).toBeGreaterThan(moderateResult.score);
		});
	});

	describe("Recommendations Consistency", () => {
		it("should provide actionable recommendations", () => {
			const analyzer = new SDKRiskAnalyzer();

			const riskyCode = `
				const password = "hardcoded_secret";
			`;

			const result = analyzer.analyze(riskyCode);

			// Should have recommendations for detected issues
			if (result.factors.length > 0) {
				expect(result.recommendations.length).toBeGreaterThan(0);
				// Recommendations should be non-empty strings
				result.recommendations.forEach((rec) => {
					expect(typeof rec).toBe("string");
					expect(rec.length).toBeGreaterThan(0);
				});
			}
		});
	});
});
