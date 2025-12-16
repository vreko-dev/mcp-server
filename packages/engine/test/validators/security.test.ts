/**
 * Security Validator Tests (Direct Import)
 *
 * Tests for security.ts validator that blocks dangerous code patterns.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	findASTSecurityIssues,
	findPatternThreats,
	THREAT_PATTERNS,
	validateSecurity,
} from "../../src/validators/security.js";

// Test fixtures directory
const TEST_DIR = "./test-fixtures-security";

beforeAll(() => {
	if (!existsSync(TEST_DIR)) {
		mkdirSync(TEST_DIR, { recursive: true });
	}
});

afterAll(() => {
	if (existsSync(TEST_DIR)) {
		rmSync(TEST_DIR, { recursive: true, force: true });
	}
});

// ============================================================================
// Happy Path Tests
// ============================================================================

describe("findASTSecurityIssues (direct import)", () => {
	describe("Happy Path", () => {
		it("should return empty array for safe JavaScript code", () => {
			const content = "const x = 1; function add(a, b) { return a + b; }";
			const issues = findASTSecurityIssues(content, "test.js");
			expect(issues).toEqual([]);
		});

		it("should detect eval() usage", () => {
			const content = "const x = eval('1+1');";
			const issues = findASTSecurityIssues(content, "test.js");
			expect(issues.length).toBeGreaterThan(0);
			expect(issues[0]).toContain("eval");
		});

		it("should detect Function constructor", () => {
			const content = "const fn = new Function('return 1');";
			const issues = findASTSecurityIssues(content, "test.js");
			expect(issues.length).toBeGreaterThan(0);
			expect(issues[0]).toContain("Function constructor");
		});
	});

	describe("Sad Path", () => {
		it("should handle invalid JavaScript gracefully", () => {
			const content = "this is not valid { javascript }}}";
			expect(() => findASTSecurityIssues(content, "test.js")).not.toThrow();
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty content", () => {
			const issues = findASTSecurityIssues("", "test.js");
			expect(issues).toEqual([]);
		});

		it("should handle TypeScript-like syntax gracefully", () => {
			const content = "interface User { name: string; } const x: User = { name: 'test' };";
			// May fail to parse but should not throw
			expect(() => findASTSecurityIssues(content, "test.ts")).not.toThrow();
		});
	});

	describe("Error Path", () => {
		it("should include file path in issue message", () => {
			const content = "eval('bad code')";
			const issues = findASTSecurityIssues(content, "malicious.js");
			expect(issues[0]).toContain("malicious.js");
		});
	});
});

describe("findPatternThreats (direct import)", () => {
	describe("Happy Path", () => {
		it("should return empty for clean content", () => {
			const threats = findPatternThreats("const x = 1;", "clean.ts");
			expect(threats).toEqual([]);
		});

		it("should detect rm -rf command", () => {
			const threats = findPatternThreats("rm -rf /production", "script.sh");
			expect(threats.length).toBeGreaterThan(0);
			expect(threats[0].description).toBe("rm -rf command");
			expect(threats[0].type).toBe("critical");
		});

		it("should detect DROP TABLE", () => {
			const threats = findPatternThreats("DROP TABLE users;", "migration.sql");
			expect(threats.length).toBeGreaterThan(0);
			expect(threats[0].description).toBe("DROP TABLE SQL");
		});

		it("should detect hardcoded password", () => {
			const threats = findPatternThreats('const password = "secret123"', "config.ts");
			expect(threats.length).toBeGreaterThan(0);
			expect(threats.some((t) => t.description === "hardcoded password")).toBe(true);
		});
	});

	describe("Sad Path", () => {
		it("should detect exposed API key", () => {
			const threats = findPatternThreats('apiKey = "sk-12345"', "config.ts");
			expect(threats.length).toBeGreaterThan(0);
		});
	});

	describe("Edge Cases", () => {
		it("should detect multiple threats", () => {
			const content = 'rm -rf / ; password = "secret" ; DROP TABLE users';
			const threats = findPatternThreats(content, "dangerous.ts");
			expect(threats.length).toBeGreaterThanOrEqual(3);
		});

		it("should be case-insensitive", () => {
			const threats = findPatternThreats("RM -RF / and drop table Users", "test.sh");
			expect(threats.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("Error Path", () => {
		it("should include file path in threat object", () => {
			const threats = findPatternThreats("rm -rf /", "evil.sh");
			expect(threats[0].file).toBe("evil.sh");
		});
	});
});

describe("validateSecurity (direct import)", () => {
	describe("Happy Path", () => {
		it("should pass for clean files", () => {
			const safePath = `${TEST_DIR}/safe.js`;
			writeFileSync(safePath, "const x = 1;", "utf-8");
			const result = validateSecurity([safePath]);
			expect(result.status).toBe("pass");
		});
	});

	describe("Sad Path", () => {
		it("should fail for file with eval", () => {
			const evilPath = `${TEST_DIR}/evil.js`;
			writeFileSync(evilPath, "eval('malicious code')", "utf-8");
			const result = validateSecurity([evilPath]);
			expect(result.status).toBe("fail");
		});

		it("should fail for file with hardcoded password", () => {
			const pwPath = `${TEST_DIR}/password.js`;
			writeFileSync(pwPath, 'const password = "secret123"', "utf-8");
			const result = validateSecurity([pwPath]);
			expect(result.status).toBe("fail");
		});
	});

	describe("Edge Cases", () => {
		it("should handle non-existent files", () => {
			const result = validateSecurity(["non-existent-file.ts"]);
			expect(result.status).toBe("fail");
			expect(result.errors).toBeDefined();
		});

		it("should return critical reason for critical threats", () => {
			const rmPath = `${TEST_DIR}/rm.sh`;
			writeFileSync(rmPath, "rm -rf /production", "utf-8");
			const result = validateSecurity([rmPath]);
			expect(result.status).toBe("fail");
			expect(result.reason).toContain("Critical");
		});

		it("should handle empty file list", () => {
			const result = validateSecurity([]);
			expect(result.status).toBe("pass");
		});
	});

	describe("Error Path", () => {
		it("should include suggestion for failures", () => {
			const badPath = `${TEST_DIR}/bad.js`;
			writeFileSync(badPath, "rm -rf /", "utf-8");
			const result = validateSecurity([badPath]);
			expect(result.suggestion).toBeDefined();
		});
	});
});

describe("THREAT_PATTERNS export", () => {
	it("should export critical patterns", () => {
		expect(THREAT_PATTERNS.critical).toBeDefined();
		expect(THREAT_PATTERNS.critical.length).toBeGreaterThan(0);
	});

	it("should export high patterns", () => {
		expect(THREAT_PATTERNS.high).toBeDefined();
		expect(THREAT_PATTERNS.high.length).toBeGreaterThan(0);
	});

	it("should have severity values", () => {
		expect(THREAT_PATTERNS.critical[0].severity).toBe(1.0);
	});
});
