/**
 * Tests for RiskAnalyzer - Platform-agnostic risk analysis
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_RISK_THRESHOLDS, RiskAnalyzer } from "../src/analysis/RiskAnalyzer.js";

describe("RiskAnalyzer", () => {
	describe("Basic Pattern Detection", () => {
		it("should detect eval() usage", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				const code = "alert('xss')";
				eval(code);
			`;

			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(1);
			expect(result.factors[0].type).toBe("eval_usage");
			expect(result.factors[0].message).toContain("eval()");
			expect(result.score).toBeGreaterThan(0);
		});

		it("should detect Function constructor usage", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				const fn = new Function('a', 'b', 'return a + b');
			`;

			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(1);
			expect(result.factors[0].type).toBe("function_constructor");
			expect(result.factors[0].message).toContain("Function constructor");
			expect(result.score).toBeGreaterThan(0);
		});

		it("should detect innerHTML usage", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				element.innerHTML = userInput;
			`;

			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(1);
			expect(result.factors[0].type).toBe("dangerous_html");
			expect(result.factors[0].message).toContain("innerHTML");
			expect(result.score).toBeGreaterThan(0);
		});

		it("should detect exec() usage", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				import { exec } from 'child_process';
				exec(userCommand);
			`;

			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(1);
			expect(result.factors[0].type).toBe("exec_command");
			expect(result.factors[0].message).toContain("exec()");
			expect(result.score).toBeGreaterThan(0);
		});

		it("should detect SQL injection patterns", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				const query = "SELECT * FROM users WHERE id = '" + userId + "'";
			`;

			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(1);
			expect(result.factors[0].type).toBe("sql_concat");
			expect(result.factors[0].message).toContain("SQL injection");
			expect(result.score).toBeGreaterThan(0);
		});

		it("should detect hardcoded secrets", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				const apiKey = "sk_live_abc123xyz";
				const password = "MySecretPass123";
			`;

			const result = analyzer.analyze(content);

			expect(result.factors.length).toBeGreaterThan(0);
			expect(result.factors.some((f) => f.type === "hardcoded_secrets")).toBe(true);
			expect(result.score).toBeGreaterThan(0);
		});

		it("should detect weak cryptography", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				import crypto from 'crypto';
				const hash = crypto.createHash('MD5');
			`;

			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(1);
			expect(result.factors[0].type).toBe("weak_crypto");
			expect(result.factors[0].message).toContain("Weak cryptographic");
			expect(result.score).toBeGreaterThan(0);
		});

		it("should return clean result for safe code", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				function add(a: number, b: number): number {
					return a + b;
				}
			`;

			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(0);
			expect(result.score).toBe(0);
			expect(result.severity).toBe("low");
		});
	});

	describe("Risk Scoring", () => {
		it("should accumulate scores for multiple issues", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				eval(code);
				const fn = new Function('x', 'return x');
				element.innerHTML = html;
			`;

			const result = analyzer.analyze(content);

			expect(result.factors.length).toBeGreaterThanOrEqual(3);
			expect(result.score).toBe(10); // Should accumulate and cap at 10
		});

		it("should cap score at 10", () => {
			const analyzer = new RiskAnalyzer();
			// Create content with many issues
			const content = `
				eval(code1);
				eval(code2);
				eval(code3);
				eval(code4);
				eval(code5);
			`;

			const result = analyzer.analyze(content);

			expect(result.score).toBeLessThanOrEqual(10);
		});

		it("should return 0 score for safe code", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				const x = 1 + 2;
				console.log(x);
			`;

			const result = analyzer.analyze(content);

			expect(result.score).toBe(0);
		});
	});

	describe("Severity Classification", () => {
		it("should classify as low for score < 3", () => {
			const analyzer = new RiskAnalyzer();
			const content = "const x = 1;"; // Safe code

			const result = analyzer.analyze(content);

			expect(result.severity).toBe("low");
		});

		it("should classify as medium for score >= 3", () => {
			const analyzer = new RiskAnalyzer();
			// innerHTML has score of 3.0
			const content = "element.innerHTML = data;";

			const result = analyzer.analyze(content);

			expect(result.severity).toBe("medium");
		});

		it("should classify as high for score >= 5", () => {
			const analyzer = new RiskAnalyzer();
			// exec has score of 5.0
			const content = "exec(command);";

			const result = analyzer.analyze(content);

			expect(result.severity).toBe("high");
		});

		it("should classify as critical for score >= 7", () => {
			const analyzer = new RiskAnalyzer();
			// SQL concat has score of 6.0, eval has 4.0 = 10 total (capped)
			const content = `
				const query = "SELECT * FROM users WHERE id = '" + id + "'";
				eval(code);
			`;

			const result = analyzer.analyze(content);

			expect(result.severity).toBe("critical");
			expect(result.score).toBeGreaterThanOrEqual(7);
		});
	});

	describe("Blocking Threshold", () => {
		it("should block when score > 8 by default", () => {
			const analyzer = new RiskAnalyzer();

			expect(analyzer.shouldBlock(9.0)).toBe(true);
			expect(analyzer.shouldBlock(8.5)).toBe(true);
			expect(analyzer.shouldBlock(8.0)).toBe(false); // Exactly 8 should not block
			expect(analyzer.shouldBlock(7.9)).toBe(false);
		});

		it("should respect custom blocking threshold", () => {
			const analyzer = new RiskAnalyzer({ blockingThreshold: 5.0 });

			expect(analyzer.shouldBlock(6.0)).toBe(true);
			expect(analyzer.shouldBlock(5.0)).toBe(false);
			expect(analyzer.shouldBlock(4.0)).toBe(false);
		});
	});

	describe("Custom Thresholds", () => {
		it("should accept custom thresholds in constructor", () => {
			const analyzer = new RiskAnalyzer({
				blockingThreshold: 6.0,
				criticalThreshold: 5.0,
				highThreshold: 3.0,
				mediumThreshold: 1.0,
			});

			const thresholds = analyzer.getThresholds();
			expect(thresholds.blockingThreshold).toBe(6.0);
			expect(thresholds.criticalThreshold).toBe(5.0);
			expect(thresholds.highThreshold).toBe(3.0);
			expect(thresholds.mediumThreshold).toBe(1.0);
		});

		it("should allow updating thresholds", () => {
			const analyzer = new RiskAnalyzer();

			analyzer.setThresholds({ blockingThreshold: 9.5 });

			const thresholds = analyzer.getThresholds();
			expect(thresholds.blockingThreshold).toBe(9.5);
			// Other thresholds should remain at defaults
			expect(thresholds.criticalThreshold).toBe(DEFAULT_RISK_THRESHOLDS.criticalThreshold);
		});

		it("should use updated thresholds for severity classification", () => {
			const analyzer = new RiskAnalyzer();
			const content = "element.innerHTML = data;"; // Score 3.0

			// With default thresholds, should be medium
			let result = analyzer.analyze(content);
			expect(result.severity).toBe("medium");

			// Lower threshold to make it high severity
			analyzer.setThresholds({ highThreshold: 2.0 });
			result = analyzer.analyze(content);
			expect(result.severity).toBe("high");
		});
	});

	describe("Custom Patterns", () => {
		it("should support adding custom security patterns", () => {
			const analyzer = new RiskAnalyzer();

			analyzer.addPattern({
				name: "custom_pattern",
				pattern: /TODO:\s*SECURITY/gi,
				score: 2.0,
				message: "Security TODO comment found",
				recommendation: "Address security TODO items before deployment",
			});

			const content = "// TODO: SECURITY - fix auth bypass";
			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(1);
			expect(result.factors[0].type).toBe("custom_pattern");
			expect(result.score).toBe(2.0);
		});

		it("should combine custom and built-in patterns", () => {
			const analyzer = new RiskAnalyzer();

			analyzer.addPattern({
				name: "custom_pattern",
				pattern: /FIXME/gi,
				score: 1.0,
				message: "FIXME comment found",
				recommendation: "Resolve FIXME comments",
			});

			const content = `
				eval(code); // Built-in pattern
				// FIXME: Custom pattern
			`;

			const result = analyzer.analyze(content);

			expect(result.factors.length).toBeGreaterThanOrEqual(2);
			expect(result.score).toBeGreaterThan(4.0); // eval (4.0) + custom (1.0)
		});
	});

	describe("Recommendations", () => {
		it("should provide recommendations for detected issues", () => {
			const analyzer = new RiskAnalyzer();
			const content = "eval(code);";

			const result = analyzer.analyze(content);

			expect(result.recommendations.length).toBeGreaterThan(0);
			expect(result.recommendations[0]).toContain("eval()");
		});

		it("should deduplicate recommendations", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				eval(code1);
				eval(code2);
				eval(code3);
			`;

			const result = analyzer.analyze(content);

			// Should have 3 factors but only 1 unique recommendation
			expect(result.factors).toHaveLength(3);
			expect(result.recommendations).toHaveLength(1);
		});
	});

	describe("Line Numbers", () => {
		it("should report line numbers for detected issues", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				const x = 1;
				eval(code);
				const y = 2;
			`;

			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(1);
			expect(result.factors[0].line).toBeDefined();
			expect(result.factors[0].line).toBeGreaterThan(1);
		});

		it("should report correct line numbers for multiple issues", () => {
			const analyzer = new RiskAnalyzer();
			const content = `
				eval(code1);
				const x = 1;
				eval(code2);
			`;

			const result = analyzer.analyze(content);

			expect(result.factors).toHaveLength(2);
			const line1 = result.factors[0].line || 0;
			const line2 = result.factors[1].line || 0;
			expect(line1).toBeLessThan(line2);
		});
	});

	describe("Default Thresholds", () => {
		it("should export default thresholds constant", () => {
			expect(DEFAULT_RISK_THRESHOLDS.blockingThreshold).toBe(8.0);
			expect(DEFAULT_RISK_THRESHOLDS.criticalThreshold).toBe(7.0);
			expect(DEFAULT_RISK_THRESHOLDS.highThreshold).toBe(5.0);
			expect(DEFAULT_RISK_THRESHOLDS.mediumThreshold).toBe(3.0);
		});
	});
});
