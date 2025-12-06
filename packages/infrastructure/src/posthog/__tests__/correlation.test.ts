/**
 * Tests for PostHog Correlation Analysis functionality
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CORRELATION_ANALYSES, performCorrelationAnalysis } from "../correlation";

// Mock the PostHog client
vi.mock("posthog-node", () => {
	return {
		PostHog: vi.fn().mockImplementation(() => ({
			apiKey: "test-key",
			host: "https://app.posthog.com",
		})),
	};
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Math.random for consistent test results
const mockRandom = vi.spyOn(global.Math, "random");

describe("PostHog Correlation Analysis", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset random mock
		mockRandom.mockRestore();
	});

	describe("Correlation Analysis Configuration", () => {
		it("should define correlation analyses", () => {
			expect(CORRELATION_ANALYSES).toHaveLength(4);

			const analysisNames = CORRELATION_ANALYSES.map((analysis) => analysis.name);
			expect(analysisNames).toContain("Onboarding Completion Factors");
			expect(analysisNames).toContain("Feature Adoption Correlations");
			expect(analysisNames).toContain("Churn Risk Indicators");
			expect(analysisNames).toContain("High Value User Characteristics");
		});

		it("should have correct correlation analysis configurations", () => {
			const onboardingAnalysis = CORRELATION_ANALYSES.find(
				(analysis) => analysis.name === "Onboarding Completion Factors",
			);
			expect(onboardingAnalysis).toBeDefined();
			expect(onboardingAnalysis?.eventName).toBe("onboarding_completed");
			expect(onboardingAnalysis?.propertyNames.length).toBeGreaterThan(0);

			const churnAnalysis = CORRELATION_ANALYSES.find((analysis) => analysis.name === "Churn Risk Indicators");
			expect(churnAnalysis).toBeDefined();
			expect(churnAnalysis?.eventName).toBe("account_deactivated");
		});
	});

	describe("Correlation Analysis Operations", () => {
		it("should perform correlation analysis", async () => {
			// Mock Math.random to return consistent values
			mockRandom.mockImplementation(() => 0.5);

			const config = {
				name: "Test Analysis",
				eventName: "test_event",
				propertyNames: ["property1", "property2"],
			};

			const result = await performCorrelationAnalysis(config);

			expect(result).toBeDefined();
			expect(result.id).toContain("correlation_");
			expect(result.name).toBe("Test Analysis");
			expect(result.results).toHaveLength(2);
			expect(result.results[0].property).toBe("property1");
			expect(result.results[1].property).toBe("property2");
		});

		it("should sort correlations by strength", async () => {
			// Mock Math.random to return different values for sorting
			let callCount = 0;
			mockRandom.mockImplementation(() => {
				callCount++;
				if (callCount <= 2) {
					return 0.9; // Strong correlation for first property
				}
				return 0.1; // Weak correlation for second property
			});

			const config = {
				name: "Test Analysis",
				eventName: "test_event",
				propertyNames: ["weak_property", "strong_property"],
			};

			const result = await performCorrelationAnalysis(config);

			// Strong correlation should come first
			expect(result.results[0].property).toBe("strong_property");
			expect(result.results[1].property).toBe("weak_property");
		});

		it("should handle correlation analysis errors", async () => {
			// Mock Math.random to throw an error
			mockRandom.mockImplementation(() => {
				throw new Error("Test error");
			});

			const config = {
				name: "Test Analysis",
				eventName: "test_event",
				propertyNames: ["property1"],
			};

			await expect(performCorrelationAnalysis(config)).rejects.toThrow("Failed to perform correlation analysis");
		});
	});
});
