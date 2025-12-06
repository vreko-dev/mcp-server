import { Guardian } from "@snapback/core";
import { describe, expect, it, vi } from "vitest";
import { analyzeBeforeApply, formatAnalysisResult } from "./analyze_before_apply";

// Mock the Guardian class
vi.mock("@snapback/core", () => {
	return {
		Guardian: vi.fn(),
		SecretDetectionPlugin: vi.fn(),
		MockReplacementPlugin: vi.fn(),
		PhantomDependencyPlugin: vi.fn(),
	};
});

describe("analyzeBeforeApply", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should analyze changes and return Apply decision for low risk", async () => {
		// Mock Guardian to return low risk
		(Guardian as any).mockImplementation(() => {
			return {
				addPlugin: vi.fn(),
				analyze: vi.fn().mockResolvedValue({
					score: 3,
					factors: ["Minor formatting changes"],
					recommendations: ["No action required"],
				}),
			};
		});

		const changes = [
			{ value: 'console.log("Hello World");', added: true },
			{ value: "  const x = 1;", added: true },
		];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Apply");
		expect(result.riskScore).toBe(3);
		expect(result.reasons).toEqual(["Minor formatting changes"]);
		expect(result.recommendations).toEqual(["No action required"]);
	});

	it("should analyze changes and return Review decision for moderate risk", async () => {
		// Mock Guardian to return moderate risk
		(Guardian as any).mockImplementation(() => {
			return {
				addPlugin: vi.fn(),
				analyze: vi.fn().mockResolvedValue({
					score: 6,
					factors: ["Potential security issue detected"],
					recommendations: ["Review code before applying"],
				}),
			};
		});

		const changes = [{ value: 'process.env.SECRET_KEY = "secret123";', added: true }];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Review");
		expect(result.riskScore).toBe(6);
		expect(result.reasons).toEqual(["Potential security issue detected"]);
		expect(result.recommendations).toEqual(["Review code before applying"]);
	});

	it("should analyze changes and return Review decision for high risk", async () => {
		// Mock Guardian to return high risk
		(Guardian as any).mockImplementation(() => {
			return {
				addPlugin: vi.fn(),
				analyze: vi.fn().mockResolvedValue({
					score: 9,
					factors: ["Hardcoded credentials", "Security vulnerability"],
					recommendations: ["Do not apply these changes", "Remove sensitive information"],
				}),
			};
		});

		const changes = [
			{ value: 'const password = "admin123";', added: true },
			{ value: 'apiKey = "sk-1234567890abcdef"', added: true },
		];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Review");
		expect(result.riskScore).toBe(9);
		expect(result.reasons).toEqual(["Hardcoded credentials", "Security vulnerability"]);
		expect(result.recommendations).toEqual(["Do not apply these changes", "Remove sensitive information"]);
	});

	it("should handle analysis errors and return Review decision", async () => {
		// Mock Guardian to throw an error
		(Guardian as any).mockImplementation(() => {
			return {
				addPlugin: vi.fn(),
				analyze: vi.fn().mockRejectedValue(new Error("Analysis failed")),
			};
		});

		const changes = [{ value: "some code;", added: true }];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Review");
		expect(result.riskScore).toBe(10);
		expect(result.reasons).toEqual(["Analysis error: Analysis failed"]);
		expect(result.recommendations).toEqual(["Review changes manually due to analysis failure"]);
	});

	it("should handle empty changes array", async () => {
		// Mock Guardian
		(Guardian as any).mockImplementation(() => {
			return {
				addPlugin: vi.fn(),
				analyze: vi.fn().mockResolvedValue({
					score: 0,
					factors: [],
					recommendations: [],
				}),
			};
		});

		const changes: any[] = [];

		const result = await analyzeBeforeApply(changes);

		expect(result.decision).toBe("Apply");
		expect(result.riskScore).toBe(0);
		expect(result.reasons).toEqual([]);
		expect(result.recommendations).toEqual([]);
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
