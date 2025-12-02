import { describe, expect, it } from "vitest";
import { GuardianLite } from "./guardian-lite";

describe("GuardianLite - RED Phase Tests", () => {
	/**
	 * PHASE 1: Core Class and Interface Tests
	 * These tests establish the basic contract for GuardianLite
	 */
	describe("Core Class", () => {
		it("should create a GuardianLite instance without parameters", () => {
			const guardian = new GuardianLite();
			expect(guardian).toBeDefined();
			expect(guardian).toBeInstanceOf(GuardianLite);
		});

		it("should have an analyze method", () => {
			const guardian = new GuardianLite();
			expect(guardian.analyze).toBeDefined();
			expect(typeof guardian.analyze).toBe("function");
		});
	});

	/**
	 * PHASE 2: Basic Analysis Result Structure
	 * Tests that analyze() returns the correct interface shape
	 */
	describe("AnalysisResult Interface", () => {
		it("should return an AnalysisResult object with required fields", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");

			expect(result).toHaveProperty("riskLevel");
			expect(result).toHaveProperty("confidence");
			expect(result).toHaveProperty("issues");
			expect(result).toHaveProperty("executionTime");
			expect(result).toHaveProperty("upgradePrompt");
			expect(result).toHaveProperty("recommendations");
		});

		it("should return riskLevel as one of: none, low, medium, high", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");
			expect(["none", "low", "medium", "high"]).toContain(result.riskLevel);
		});

		it("should return confidence as a number between 0 and 1", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");
			expect(typeof result.confidence).toBe("number");
			expect(result.confidence).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeLessThanOrEqual(1);
		});

		it("should return issues as an array", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");
			expect(Array.isArray(result.issues)).toBe(true);
		});

		it("should return executionTime as a non-negative number", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");
			expect(typeof result.executionTime).toBe("number");
			expect(result.executionTime).toBeGreaterThanOrEqual(0);
		});

		it("should return upgradePrompt as a boolean", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");
			expect(typeof result.upgradePrompt).toBe("boolean");
		});

		it("should return recommendations as an array of strings", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");
			expect(Array.isArray(result.recommendations)).toBe(true);
			result.recommendations.forEach((rec) => {
				expect(typeof rec).toBe("string");
			});
		});
	});

	/**
	 * PHASE 3: Clean Code Behavior
	 * Tests that clean code is properly recognized
	 */
	describe("Clean Code Analysis", () => {
		it('should return riskLevel "none" for clean code', () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;\nfunction foo() { return x; }");
			expect(result.riskLevel).toBe("none");
		});

		it("should return empty issues array for clean code", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;\nfunction foo() {}");
			expect(result.issues).toHaveLength(0);
		});

		it("should have high confidence for clean code", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");
			expect(result.confidence).toBeGreaterThan(0.9);
		});

		it("should not show upgrade prompt for clean code", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");
			expect(result.upgradePrompt).toBe(false);
		});

		it("should have no recommendations for clean code", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("const x = 1;");
			expect(result.recommendations).toHaveLength(0);
		});
	});

	/**
	 * PHASE 4: Issue Interface Tests
	 * Tests that detected issues have correct structure
	 */
	describe("Issue Interface", () => {
		it("should have issues with type field (secret, mock, or dependency)", () => {
			const guardian = new GuardianLite();
			const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
			const result = guardian.analyze(code);

			if (result.issues.length > 0) {
				result.issues.forEach((issue) => {
					expect(["secret", "mock", "dependency"]).toContain(issue.type);
				});
			}
		});

		it("should have issues with severity field (low, medium, or high)", () => {
			const guardian = new GuardianLite();
			const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
			const result = guardian.analyze(code);

			if (result.issues.length > 0) {
				result.issues.forEach((issue) => {
					expect(["low", "medium", "high"]).toContain(issue.severity);
				});
			}
		});

		it("should have issues with message string", () => {
			const guardian = new GuardianLite();
			const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
			const result = guardian.analyze(code);

			if (result.issues.length > 0) {
				result.issues.forEach((issue) => {
					expect(typeof issue.message).toBe("string");
					expect(issue.message.length).toBeGreaterThan(0);
				});
			}
		});

		it("should have issues with pattern field", () => {
			const guardian = new GuardianLite();
			const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
			const result = guardian.analyze(code);

			if (result.issues.length > 0) {
				result.issues.forEach((issue) => {
					expect(typeof issue.pattern).toBe("string");
					expect(issue.pattern.length).toBeGreaterThan(0);
				});
			}
		});

		it("should optionally have line number for issues", () => {
			const guardian = new GuardianLite();
			const code = 'const key = "AKIAIOSFODNN7EXAMPLE";\nfunction foo() {}';
			const result = guardian.analyze(code);

			result.issues.forEach((issue) => {
				if (issue.line !== undefined) {
					expect(typeof issue.line).toBe("number");
					expect(issue.line).toBeGreaterThan(0);
				}
			});
		});
	});

	/**
	 * PHASE 5: Secret Pattern Detection
	 * Tests that secret patterns are properly detected
	 */
	describe("Secret Pattern Detection", () => {
		it("should detect AWS_KEY pattern (AKIA...)", () => {
			const guardian = new GuardianLite();
			const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.riskLevel).toBe("high");
			const awsIssue = result.issues.find((i) => i.pattern === "AWS_KEY");
			expect(awsIssue).toBeDefined();
			expect(awsIssue?.type).toBe("secret");
			expect(awsIssue?.severity).toBe("high");
		});

		it("should detect GENERIC_API_KEY pattern", () => {
			const guardian = new GuardianLite();
			const code = 'const api_key = "abcdef0123456789abcdef0123456789";';
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			const apiKeyIssue = result.issues.find((i) => i.pattern === "GENERIC_API_KEY");
			expect(apiKeyIssue).toBeDefined();
			expect(apiKeyIssue?.severity).toBe("medium");
		});

		it("should detect JWT pattern", () => {
			const guardian = new GuardianLite();
			const code =
				'const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ";';
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			const jwtIssue = result.issues.find((i) => i.pattern === "JWT");
			expect(jwtIssue).toBeDefined();
			expect(jwtIssue?.severity).toBe("low");
		});

		it("should detect PRIVATE_KEY pattern", () => {
			const guardian = new GuardianLite();
			const code = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5...`;
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			const pkeyIssue = result.issues.find((i) => i.pattern === "PRIVATE_KEY");
			expect(pkeyIssue).toBeDefined();
			expect(pkeyIssue?.severity).toBe("high");
		});

		it("should detect DB_CONNECTION pattern", () => {
			const guardian = new GuardianLite();
			const code = 'const dbUrl = "postgres://user:password@localhost/mydb";';
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			const dbIssue = result.issues.find((i) => i.pattern === "DB_CONNECTION");
			expect(dbIssue).toBeDefined();
			expect(dbIssue?.severity).toBe("high");
		});

		it("should set upgradePrompt to true when high-severity secret detected", () => {
			const guardian = new GuardianLite();
			const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
			const result = guardian.analyze(code);

			expect(result.upgradePrompt).toBe(true);
		});

		it("should include recommendation to move secrets to .env", () => {
			const guardian = new GuardianLite();
			const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
			const result = guardian.analyze(code);

			expect(result.recommendations.length).toBeGreaterThan(0);
			expect(result.recommendations.some((r) => r.includes("environment"))).toBe(true);
		});
	});

	/**
	 * PHASE 6: Mock Pattern Detection
	 * Tests that mock/test framework patterns are properly detected
	 */
	describe("Mock Pattern Detection", () => {
		it("should detect JEST_MOCK pattern", () => {
			const guardian = new GuardianLite();
			const code = 'jest.mock("./module");';
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.riskLevel).toBe("medium");
			const mockIssue = result.issues.find((i) => i.pattern === "JEST_MOCK");
			expect(mockIssue).toBeDefined();
			expect(mockIssue?.type).toBe("mock");
			expect(mockIssue?.severity).toBe("medium");
		});

		it("should detect VITEST_MOCK pattern", () => {
			const guardian = new GuardianLite();
			const code = 'vi.mock("./module");';
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			const mockIssue = result.issues.find((i) => i.pattern === "VITEST_MOCK");
			expect(mockIssue).toBeDefined();
			expect(mockIssue?.type).toBe("mock");
		});

		it("should detect SINON_STUB pattern", () => {
			const guardian = new GuardianLite();
			const code = 'sinon.stub(obj, "method");';
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			const stubIssue = result.issues.find((i) => i.pattern === "SINON_STUB");
			expect(stubIssue).toBeDefined();
		});

		it("should include recommendation to remove test code from production", () => {
			const guardian = new GuardianLite();
			const code = 'jest.mock("./module");';
			const result = guardian.analyze(code);

			expect(result.recommendations.some((r) => r.includes("test") || r.includes("mock"))).toBe(true);
		});
	});

	/**
	 * PHASE 7: Dependency Pattern Detection
	 * Tests that missing/phantom dependency patterns are detected
	 */
	describe("Dependency Pattern Detection", () => {
		it("should detect PHANTOM_IMPORT pattern", () => {
			const guardian = new GuardianLite();
			const code = 'import axios from "axios";';
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.riskLevel).toBe("medium");
			const depIssue = result.issues.find((i) => i.pattern === "PHANTOM_IMPORT");
			expect(depIssue).toBeDefined();
			expect(depIssue?.type).toBe("dependency");
			expect(depIssue?.severity).toBe("medium");
		});

		it("should NOT flag @snapback scoped imports as phantom", () => {
			const guardian = new GuardianLite();
			const code = 'import { logger } from "@snapback/infrastructure";';
			const result = guardian.analyze(code);

			const phantomIssues = result.issues.filter((i) => i.pattern === "PHANTOM_IMPORT");
			expect(phantomIssues).toHaveLength(0);
		});

		it("should NOT flag relative imports as phantom", () => {
			const guardian = new GuardianLite();
			const code = 'import { helper } from "./helpers";';
			const result = guardian.analyze(code);

			const phantomIssues = result.issues.filter((i) => i.pattern === "PHANTOM_IMPORT");
			expect(phantomIssues).toHaveLength(0);
		});

		it("should detect REQUIRE_EXTERNAL pattern", () => {
			const guardian = new GuardianLite();
			const code = 'const lodash = require("lodash");';
			const result = guardian.analyze(code);

			expect(result.issues.length).toBeGreaterThan(0);
			const reqIssue = result.issues.find((i) => i.pattern === "REQUIRE_EXTERNAL");
			expect(reqIssue).toBeDefined();
		});

		it("should include recommendation to add missing dependencies", () => {
			const guardian = new GuardianLite();
			const code = 'import axios from "axios";';
			const result = guardian.analyze(code);

			expect(result.recommendations.some((r) => r.includes("dependencies") || r.includes("package.json"))).toBe(
				true,
			);
		});
	});

	/**
	 * PHASE 8: Risk Level Aggregation
	 * Tests that risk levels are correctly calculated
	 */
	describe("Risk Level Aggregation", () => {
		it('should return risk level "low" when only low-severity issues present', () => {
			const guardian = new GuardianLite();
			const code = "td.replace(obj);"; // TEST_DOUBLE mock (low severity)
			const result = guardian.analyze(code);

			if (result.issues.length > 0) {
				expect(result.riskLevel).toBe("low");
			}
		});

		it('should return risk level "medium" when medium-severity issues present', () => {
			const guardian = new GuardianLite();
			const code = 'jest.mock("./module");'; // Medium severity
			const result = guardian.analyze(code);

			expect(result.riskLevel).toBe("medium");
		});

		it('should return risk level "high" when high-severity issues present', () => {
			const guardian = new GuardianLite();
			const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
			const result = guardian.analyze(code);

			expect(result.riskLevel).toBe("high");
		});

		it("should set upgradePrompt when more than 2 issues detected", () => {
			const guardian = new GuardianLite();
			const code = `
        jest.mock('./module');
        import axios from 'axios';
        const api_key = '12345678901234567890123456789012';
      `;
			const result = guardian.analyze(code);

			if (result.issues.length > 2) {
				expect(result.upgradePrompt).toBe(true);
			}
		});

		it("should calculate confidence based on issue count", () => {
			const guardian = new GuardianLite();
			const cleanCode = "const x = 1;";
			const resultClean = guardian.analyze(cleanCode);
			expect(resultClean.confidence).toBeGreaterThan(0.9);

			const dirtyCode = `
        const key = 'AKIAIOSFODNN7EXAMPLE';
        jest.mock('./module');
        import axios from 'axios';
        jest.mock('./other');
        jest.mock('./third');
      `;
			const resultDirty = guardian.analyze(dirtyCode);
			expect(resultDirty.confidence).toBeLessThan(0.9);
		});
	});

	/**
	 * PHASE 9: Performance Budgets
	 * Tests that analysis completes within performance targets
	 */
	describe("Performance Budgets", () => {
		it("should analyze empty string in < 10ms", () => {
			const guardian = new GuardianLite();
			const result = guardian.analyze("");
			expect(result.executionTime).toBeLessThan(10);
		});

		it("should analyze 100 lines of code in < 20ms", () => {
			const guardian = new GuardianLite();
			const code = "const x = 1;\n".repeat(100);
			const result = guardian.analyze(code);
			expect(result.executionTime).toBeLessThan(20);
		});

		it("should analyze 1000 lines of code in < 50ms", () => {
			const guardian = new GuardianLite();
			const code = "const x = 1;\n".repeat(1000);
			const result = guardian.analyze(code);
			expect(result.executionTime).toBeLessThan(50);
		});
	});
});
