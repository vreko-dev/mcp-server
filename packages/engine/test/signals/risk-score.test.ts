/**
 * Risk Score Signal Tests (Direct Import)
 *
 * Tests for risk-score.ts signal that computes overall risk (0-10).
 * These tests import functions directly for coverage.
 */

import { describe, expect, it } from "vitest";
import {
	calculateComplexity,
	calculateRiskScore,
	detectTriggers,
	isSensitiveFile,
	PATTERN_TRIGGERS,
	SENSITIVE_PATTERNS,
} from "../../src/signals/risk-score.js";
import type { FileChange } from "../../src/types.js";

// ============================================================================
// Happy Path Tests
// ============================================================================

describe("calculateRiskScore (direct import)", () => {
	describe("Happy Path", () => {
		it("should return 0 score for empty files array", () => {
			const result = calculateRiskScore([]);
			expect(result.score).toBe(0);
			expect(result.factors).toEqual([]);
		});

		it("should calculate risk for normal files", () => {
			const files: FileChange[] = [
				{ path: "src/index.ts", content: "const x = 1;", lineCount: 10, changeType: "modify" },
			];
			const result = calculateRiskScore(files);
			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(10);
		});

		it("should detect sensitive files and increase score", () => {
			const files: FileChange[] = [{ path: ".env", content: "SECRET=abc", lineCount: 5, changeType: "modify" }];
			const result = calculateRiskScore(files);
			expect(result.score).toBeGreaterThan(0);
			expect(result.factors.some((f) => f.includes("Sensitive file"))).toBe(true);
		});

		it("should detect pattern triggers", () => {
			const files: FileChange[] = [{ path: "package.json", content: "{}", lineCount: 50, changeType: "modify" }];
			const result = calculateRiskScore(files);
			expect(result.factors.some((f) => f.includes("Dependency"))).toBe(true);
		});
	});

	describe("Sad Path", () => {
		it("should handle files with no content gracefully", () => {
			const files: FileChange[] = [{ path: "src/empty.ts", content: "", lineCount: 0, changeType: "add" }];
			const result = calculateRiskScore(files);
			expect(result.score).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Edge Cases", () => {
		it("should detect high complexity files", () => {
			const complexContent = `
				function a() { if (x) { for (let i = 0; i < 10; i++) { while (true) { switch (y) { case 1: break; } } } } }
				function b() { if (x) { for (let i = 0; i < 10; i++) { while (true) { switch (y) { case 1: break; } } } } }
				function c() { if (x) { for (let i = 0; i < 10; i++) { while (true) { switch (y) { case 1: break; } } } } }
			`;
			const files: FileChange[] = [
				{ path: "src/complex.ts", content: complexContent, lineCount: 1500, changeType: "modify" },
			];
			const result = calculateRiskScore(files);
			expect(result.factors.some((f) => f.includes("complexity"))).toBe(true);
		});

		it("should normalize score to 0-10", () => {
			// Multiple sensitive files should be capped at 10
			const files: FileChange[] = [
				{ path: ".env", content: "SECRET=abc", lineCount: 5, changeType: "add" },
				{ path: "config.json", content: "{}", lineCount: 5, changeType: "add" },
				{ path: "secret.ts", content: "x", lineCount: 5, changeType: "add" },
				{ path: "password.ts", content: "x", lineCount: 5, changeType: "add" },
			];
			const result = calculateRiskScore(files);
			expect(result.score).toBeLessThanOrEqual(10);
		});
	});

	describe("Error Path", () => {
		it("should handle empty content string", () => {
			const files: FileChange[] = [{ path: "src/test.ts", content: "", lineCount: 10, changeType: "modify" }];
			const result = calculateRiskScore(files);
			expect(result).toBeDefined();
		});
	});
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("isSensitiveFile", () => {
	it("should detect .env files", () => {
		expect(isSensitiveFile(".env")).toBe(true);
		expect(isSensitiveFile("path/to/.env")).toBe(true);
	});

	it("should detect config.json", () => {
		expect(isSensitiveFile("config.json")).toBe(true);
	});

	it("should detect files with secret in name", () => {
		expect(isSensitiveFile("secrets.ts")).toBe(true);
	});

	it("should be case-insensitive", () => {
		expect(isSensitiveFile(".ENV")).toBe(true);
		expect(isSensitiveFile("CONFIG.JSON")).toBe(true);
	});

	it("should not flag normal files", () => {
		expect(isSensitiveFile("index.ts")).toBe(false);
		expect(isSensitiveFile("app.tsx")).toBe(false);
	});
});

describe("detectTriggers", () => {
	it("should detect dependency changes", () => {
		const triggers = detectTriggers("package.json");
		expect(triggers).toContain("Dependency changes");
	});

	it("should detect build config changes", () => {
		const triggers = detectTriggers("tsconfig.json");
		expect(triggers).toContain("Build config changes");
	});

	it("should detect database changes", () => {
		const triggers = detectTriggers("migration.sql");
		expect(triggers).toContain("Database schema changes");
	});

	it("should detect environment changes", () => {
		const triggers = detectTriggers("docker-compose.yml");
		expect(triggers).toContain("Environment config changes");
	});

	it("should detect test config changes", () => {
		const triggers = detectTriggers("vitest.config.ts");
		expect(triggers).toContain("Test config changes");
	});

	it("should return empty for normal files", () => {
		const triggers = detectTriggers("index.ts");
		expect(triggers).toEqual([]);
	});
});

describe("calculateComplexity", () => {
	it("should return 0 for empty content", () => {
		const complexity = calculateComplexity("", 0);
		expect(complexity).toBe(0);
	});

	it("should increase with line count", () => {
		const low = calculateComplexity("const x = 1;", 10);
		const high = calculateComplexity("const x = 1;", 500);
		expect(high).toBeGreaterThan(low);
	});

	it("should increase with function count", () => {
		const simple = calculateComplexity("const x = 1;", 10);
		const complex = calculateComplexity("function a() {} function b() {} function c() {}", 10);
		expect(complex).toBeGreaterThan(simple);
	});

	it("should cap at 1", () => {
		const result = calculateComplexity(
			"function a() { if (x) { for (;;) { while (true) {} } } }".repeat(100),
			5000,
		);
		expect(result).toBeLessThanOrEqual(1);
	});
});

describe("SENSITIVE_PATTERNS export", () => {
	it("should be exported and contain patterns", () => {
		expect(SENSITIVE_PATTERNS).toBeDefined();
		expect(Array.isArray(SENSITIVE_PATTERNS)).toBe(true);
		expect(SENSITIVE_PATTERNS.length).toBeGreaterThan(0);
	});
});

describe("PATTERN_TRIGGERS export", () => {
	it("should be exported and contain triggers", () => {
		expect(PATTERN_TRIGGERS).toBeDefined();
		expect(Array.isArray(PATTERN_TRIGGERS)).toBe(true);
		expect(PATTERN_TRIGGERS.length).toBeGreaterThan(0);
	});
});
