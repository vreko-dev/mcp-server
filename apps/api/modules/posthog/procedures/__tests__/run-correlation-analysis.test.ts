/**
 * Tests for PostHog Run Correlation Analysis procedure
 */

import { describe, expect, it, vi } from "vitest";
import { runCorrelationAnalysis } from "../run-correlation-analysis";

// Mock the logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

// Mock the correlation module
vi.mock("@snapback/infrastructure/src/posthog/correlation", async () => {
	const actual = await vi.importActual("@snapback/infrastructure/src/posthog/correlation");
	return {
		...actual,
		performCorrelationAnalysis: vi.fn().mockResolvedValue({
			id: "correlation_123",
			name: "Test Analysis",
			results: [
				{ property: "property1", correlation: 0.8 },
				{ property: "property2", correlation: -0.6 },
			],
		}),
		CORRELATION_ANALYSES: [
			{
				name: "Onboarding Completion Factors",
				eventName: "onboarding_completed",
				propertyNames: ["signup_method", "time_to_complete"],
			},
			{
				name: "Feature Adoption Correlations",
				eventName: "feature_used",
				propertyNames: ["user_plan", "days_active"],
			},
		],
		listCorrelationAnalyses: vi
			.fn()
			.mockReturnValue(["Onboarding Completion Factors", "Feature Adoption Correlations"]),
	};
});

describe("Run Correlation Analysis Procedure", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should run correlation analysis in dry run mode", async () => {
		const result = await runCorrelationAnalysis.handler({
			input: { dryRun: true, list: false },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Dry run completed");
		expect(result.results).toHaveLength(2);
	});

	it("should run correlation analysis in actual mode", async () => {
		const result = await runCorrelationAnalysis.handler({
			input: { dryRun: false, list: false },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Correlation analyses completed successfully");
		expect(result.results).toHaveLength(2);
	});

	it("should list available analyses when requested", async () => {
		const result = await runCorrelationAnalysis.handler({
			input: { dryRun: false, list: true },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Available correlation analyses");
		expect(result.analyses).toHaveLength(2);
		expect(result.analyses).toContain("Onboarding Completion Factors");
		expect(result.analyses).toContain("Feature Adoption Correlations");
	});

	it("should handle errors during correlation analysis", async () => {
		// Mock performCorrelationAnalysis to throw an error for one of the analyses
		const { performCorrelationAnalysis } = await import("@snapback/infrastructure/src/posthog/correlation");
		vi.mocked(performCorrelationAnalysis)
			.mockResolvedValueOnce({
				id: "correlation_123",
				name: "Onboarding Completion Factors",
				results: [{ property: "signup_method", correlation: 0.8 }],
			})
			.mockRejectedValueOnce(new Error("Failed to perform correlation analysis"));

		const result = await runCorrelationAnalysis.handler({
			input: { dryRun: false, list: false },
		});

		expect(result.success).toBe(true);
		expect(result.results).toHaveLength(2);

		// Check that we have one error in the results
		const errorResult = result.results.find((r) => r.error);
		expect(errorResult).toBeDefined();
		expect(errorResult?.error).toBe("Failed to perform correlation analysis");
	});

	it("should handle dry run with list option", async () => {
		const result = await runCorrelationAnalysis.handler({
			input: { dryRun: true, list: true },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Available correlation analyses");
		expect(result.analyses).toHaveLength(2);
	});
});
