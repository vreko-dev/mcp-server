import { describe, expect, it } from "vitest";
import { analyzeBeforeApply, formatAnalysisResult } from "../src/analyze_before_apply.js";

// Tests for the V2 analyze_before_apply implementation
// Uses built-in threat pattern detection instead of Guardian

describe("analyzeBeforeApply", () => {
	it("should analyze changes and return Apply decision for low risk", async () => {
		const changes = [
			{ value: 'console.log("Hello World");', added: true },
			{ value: "  const x = 1;", added: true },
		];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Apply");
		expect(result.riskScore).toBeLessThan(5);
	});

	it("should analyze changes and return Review decision for hardcoded passwords", async () => {
		const changes = [{ value: 'const password = "admin123";', added: true }];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Review");
		expect(result.riskScore).toBeGreaterThanOrEqual(5);
		expect(result.reasons.length).toBeGreaterThan(0);
	});

	it("should analyze changes and return Review decision for high risk secrets", async () => {
		const changes = [{ value: 'const token = "ghp_1234567890abcdef1234567890abcdef1234";', added: true }];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Review");
		expect(result.riskScore).toBeGreaterThanOrEqual(8);
		expect(result.reasons).toContain("GitHub token");
	});

	it("should detect AWS access keys", async () => {
		const changes = [{ value: 'const key = "AKIA1234567890ABCDEF";', added: true }];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Review");
		expect(result.reasons).toContain("AWS access key");
	});

	it("should detect critical commands like rm -rf", async () => {
		const changes = [{ value: "rm -rf /", added: true }];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Review");
		expect(result.riskScore).toBe(10);
		expect(result.reasons).toContain("destructive rm -rf command");
	});

	it("should detect jest.mock in production code", async () => {
		const changes = [{ value: 'jest.mock("../api");', added: true }];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Review");
		expect(result.reasons).toContain("jest.mock in production");
	});

	it("should handle empty changes array", async () => {
		const changes: any[] = [];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Apply");
		expect(result.riskScore).toBe(0);
	});
});

describe("formatAnalysisResult", () => {
	it("should format Apply decision correctly", () => {
		const result = {
			decision: "Apply" as const,
			riskScore: 3,
			reasons: ["Minor changes"],
			recommendations: ["No action required"],
		};

		const formatted = formatAnalysisResult(result);
		expect(formatted).toContain("✅ Safe to Apply");
		expect(formatted).toContain("Risk Score: 3/10");
		expect(formatted).toContain("Minor changes");
		expect(formatted).toContain("No action required");
	});

	it("should format Review decision correctly", () => {
		const result = {
			decision: "Review" as const,
			riskScore: 8,
			reasons: ["Security issue detected"],
			recommendations: ["Review code before applying"],
		};

		const formatted = formatAnalysisResult(result);
		expect(formatted).toContain("⚠️  Review Required");
		expect(formatted).toContain("Risk Score: 8/10");
		expect(formatted).toContain("Security issue detected");
		expect(formatted).toContain("Review code before applying");
	});

	it("should format result with no reasons or recommendations", () => {
		const result = {
			decision: "Apply" as const,
			riskScore: 0,
			reasons: [],
			recommendations: [],
		};

		const formatted = formatAnalysisResult(result);
		expect(formatted).toContain("✅ Safe to Apply");
		expect(formatted).toContain("Risk Score: 0/10");
	});
});
